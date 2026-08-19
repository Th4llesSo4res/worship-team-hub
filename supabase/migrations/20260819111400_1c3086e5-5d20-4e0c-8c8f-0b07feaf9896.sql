-- create organization + leader (atomic)
CREATE OR REPLACE FUNCTION public.create_organization_with_leader(_name text, _slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
        v_user record;
        v_org uuid;
        v_slug text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id, email, email_confirmed_at INTO v_user FROM auth.users WHERE id = v_uid;
  IF v_user.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail antes de criar a equipe'; END IF;
  IF EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = v_uid AND m.status IN ('pending','active')) THEN
    RAISE EXCEPTION 'Você já pertence a uma equipe';
  END IF;
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
  VALUES (v_org, v_uid, 'leader', 'active', v_uid, now());

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
REVOKE EXECUTE ON FUNCTION public.create_organization_with_leader(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_leader(text, text) TO authenticated;

-- create invitation (leader only) -> returns plaintext token once
CREATE OR REPLACE FUNCTION public.create_invitation(_organization_id uuid, _email text, _role public.membership_role)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
        v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT app_private.has_org_role(_organization_id, ARRAY['leader']::public.membership_role[]) THEN
    RAISE EXCEPTION 'Apenas o líder pode convidar';
  END IF;
  IF NULLIF(btrim(COALESCE(_email,'')),'') IS NULL THEN RAISE EXCEPTION 'E-mail inválido'; END IF;

  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');

  INSERT INTO public.invitations (organization_id, email, role, token_hash, expires_at, created_by)
  VALUES (_organization_id, lower(btrim(_email)), _role,
          encode(sha256(v_token::bytea), 'hex'), now() + interval '7 days', v_uid);

  RETURN v_token;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_invitation(uuid, text, public.membership_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid, text, public.membership_role) TO authenticated;

-- accept invitation (authenticated + confirmed email + matching email)
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  IF EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = v_uid AND m.status IN ('pending','active')) THEN
    RAISE EXCEPTION 'Você já pertence a uma equipe';
  END IF;

  INSERT INTO public.memberships (organization_id, user_id, role, status)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, 'pending');

  UPDATE public.invitations SET used_at = now() WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;