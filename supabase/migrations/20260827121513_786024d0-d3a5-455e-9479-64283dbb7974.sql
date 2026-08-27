-- 1) cargo sempre explícito
ALTER TABLE public.memberships ALTER COLUMN role DROP DEFAULT;

-- 2) permitir participar de organizações diferentes
DROP INDEX IF EXISTS public.memberships_one_active_per_user;

-- 3) proteção do último líder ativo
CREATE OR REPLACE FUNCTION public.protect_last_active_leader()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_others int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id <> OLD.organization_id OR NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Não é permitido mover o integrante de organização ou usuário';
    END IF;
    IF NOT (OLD.role = 'leader' AND OLD.status = 'active') THEN RETURN NEW; END IF;
    IF NEW.role = 'leader' AND NEW.status = 'active' THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT (OLD.role = 'leader' AND OLD.status = 'active') THEN RETURN OLD; END IF;
  END IF;

  SELECT count(*) INTO v_others
  FROM public.memberships m
  WHERE m.organization_id = OLD.organization_id
    AND m.role = 'leader'
    AND m.status = 'active'
    AND m.id <> OLD.id;

  IF v_others = 0 THEN
    RAISE EXCEPTION 'Defina outro líder ativo antes de alterar ou remover este líder';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_last_leader_upd ON public.memberships;
CREATE TRIGGER trg_protect_last_leader_upd
BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.protect_last_active_leader();

DROP TRIGGER IF EXISTS trg_protect_last_leader_del ON public.memberships;
CREATE TRIGGER trg_protect_last_leader_del
BEFORE DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.protect_last_active_leader();

-- 4) remoção de integrantes: apenas líder ativo da mesma organização
GRANT DELETE ON public.memberships TO authenticated;
DROP POLICY IF EXISTS memberships_leader_delete ON public.memberships;
CREATE POLICY memberships_leader_delete ON public.memberships
FOR DELETE TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]));

-- 5) criar equipe: cargo leader explícito, permitido em outra organização
CREATE OR REPLACE FUNCTION public.create_organization_with_leader(_name text, _slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid();
        v_user record;
        v_org uuid;
        v_slug text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id, email, email_confirmed_at INTO v_user FROM auth.users WHERE id = v_uid;
  IF v_user.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail antes de criar a equipe'; END IF;

  v_slug := NULLIF(btrim(lower(COALESCE(_slug,''))), '');
  IF v_slug IS NULL THEN
    v_slug := regexp_replace(lower(btrim(_name)), '[^a-z0-9]+', '-', 'g');
  END IF;
  v_slug := btrim(v_slug, '-');
  IF v_slug = '' THEN RAISE EXCEPTION 'Nome da equipe inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations o WHERE o.slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 6);
  END IF;

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (btrim(_name), v_slug, v_uid) RETURNING id INTO v_org;

  INSERT INTO public.memberships (organization_id, user_id, role, status, approved_by, approved_at)
  VALUES (v_org, v_uid, 'leader'::public.membership_role, 'active'::public.membership_status, v_uid, now());

  INSERT INTO public.ministry_functions (organization_id, name, category) VALUES
    (v_org, 'Ministro/Voz principal', 'vocal'),
    (v_org, 'Backing vocal', 'vocal'),
    (v_org, 'Violão', 'instrument'),
    (v_org, 'Guitarra', 'instrument'),
    (v_org, 'Teclado', 'instrument'),
    (v_org, 'Baixo', 'instrument'),
    (v_org, 'Bateria', 'instrument'),
    (v_org, 'Percussão', 'instrument'),
    (v_org, 'Trompete', 'instrument'),
    (v_org, 'Saxofone', 'instrument'),
    (v_org, 'Técnico de som', 'technical'),
    (v_org, 'Projeção/Multimídia', 'technical');

  RETURN v_org;
END; $$;

-- 6) aceite de convite: cargo exatamente o do convite, status pending, por organização
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid();
        v_user record;
        v_inv record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id, email, email_confirmed_at INTO v_user FROM auth.users WHERE id = v_uid;
  IF v_user.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail para aceitar o convite'; END IF;

  SELECT * INTO v_inv FROM public.invitations
   WHERE token_hash = encode(sha256(COALESCE(_token,'')::bytea), 'hex') FOR UPDATE;

  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Convite inválido'; END IF;
  IF v_inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'Convite já utilizado'; END IF;
  IF v_inv.expires_at <= now() THEN RAISE EXCEPTION 'Convite expirado'; END IF;
  IF lower(btrim(v_inv.email)) <> lower(btrim(COALESCE(v_user.email,''))) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;
  IF EXISTS (SELECT 1 FROM public.memberships m
              WHERE m.user_id = v_uid AND m.organization_id = v_inv.organization_id) THEN
    RAISE EXCEPTION 'Você já pertence a esta equipe';
  END IF;

  INSERT INTO public.memberships (organization_id, user_id, role, status)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, 'pending'::public.membership_status);

  UPDATE public.invitations SET used_at = now() WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.protect_last_active_leader() FROM PUBLIC;