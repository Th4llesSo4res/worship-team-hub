-- ============ SCHEMAS & ENUMS ============
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE TYPE public.membership_role AS ENUM ('leader','minister','musician');
CREATE TYPE public.membership_status AS ENUM ('pending','active','inactive');
CREATE TYPE public.function_category AS ENUM ('vocal','instrument','technical','other');
CREATE TYPE public.event_type AS ENUM ('service','rehearsal','special');
CREATE TYPE public.event_status AS ENUM ('draft','published','cancelled','completed');
CREATE TYPE public.assignment_status AS ENUM ('pending','confirmed','declined');

-- ============ UPDATED_AT ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ TABLES ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Novo integrante',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.membership_role NOT NULL DEFAULT 'musician',
  status public.membership_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE UNIQUE INDEX memberships_one_active_per_user ON public.memberships (user_id)
  WHERE status IN ('pending','active');
CREATE INDEX memberships_org_idx ON public.memberships (organization_id, status);
CREATE INDEX memberships_user_idx ON public.memberships (user_id);

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.membership_role NOT NULL DEFAULT 'musician',
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_org_idx ON public.invitations (organization_id);
CREATE INDEX invitations_email_idx ON public.invitations (lower(email));

CREATE TABLE public.ministry_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.function_category NOT NULL DEFAULT 'other',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX ministry_functions_org_idx ON public.ministry_functions (organization_id);

CREATE TABLE public.member_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  function_id uuid NOT NULL REFERENCES public.ministry_functions(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, function_id)
);
CREATE INDEX member_functions_org_idx ON public.member_functions (organization_id);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type public.event_type NOT NULL DEFAULT 'service',
  status public.event_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_org_starts_idx ON public.events (organization_id, starts_at);
CREATE INDEX events_org_status_idx ON public.events (organization_id, status);

CREATE TABLE public.event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  function_id uuid NOT NULL REFERENCES public.ministry_functions(id) ON DELETE RESTRICT,
  response_status public.assignment_status NOT NULL DEFAULT 'pending',
  response_note text,
  responded_at timestamptz,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, membership_id, function_id)
);
CREATE INDEX event_assignments_event_idx ON public.event_assignments (event_id);
CREATE INDEX event_assignments_membership_idx ON public.event_assignments (membership_id);

CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  default_key text,
  reference_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX songs_org_idx ON public.songs (organization_id, is_active);

CREATE TABLE public.event_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  selected_key text,
  reference_url_override text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, position) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (event_id, song_id)
);
CREATE INDEX event_songs_event_idx ON public.event_songs (event_id, position);

-- updated_at triggers
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invitations_updated BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_functions_updated BEFORE UPDATE ON public.ministry_functions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.event_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_songs_updated BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_event_songs_updated BEFORE UPDATE ON public.event_songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILE ON SIGNUP (never blocks signup) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_name text;
BEGIN
  v_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')), '');
  IF v_name IS NULL THEN v_name := NULLIF(split_part(COALESCE(NEW.email,''), '@', 1), ''); END IF;
  IF v_name IS NULL THEN v_name := 'Novo integrante'; END IF;
  BEGIN
    INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, v_name)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PRIVATE RLS HELPERS ============
CREATE OR REPLACE FUNCTION app_private.is_active_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'active');
$$;

CREATE OR REPLACE FUNCTION app_private.has_org_role(_org uuid, _roles public.membership_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
      AND m.status = 'active' AND m.role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION app_private.current_membership_id(_org uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.id FROM public.memberships m
  WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.owns_membership(_membership uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.id = _membership AND m.user_id = auth.uid() AND m.status = 'active');
$$;

REVOKE EXECUTE ON FUNCTION app_private.is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app_private.has_org_role(uuid, public.membership_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app_private.current_membership_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app_private.owns_membership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_org_role(uuid, public.membership_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_membership_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.owns_membership(uuid) TO authenticated;

-- ============ GRANTS (least privilege, no anon) ============
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_functions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_functions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_songs TO authenticated;
GRANT ALL ON public.organizations, public.profiles, public.memberships, public.invitations,
  public.ministry_functions, public.member_functions, public.events, public.event_assignments,
  public.songs, public.event_songs TO service_role;

-- ============ RLS ============
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_songs ENABLE ROW LEVEL SECURITY;

-- organizations: members (any status) can read their org; leader updates
CREATE POLICY orgs_select ON public.organizations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = organizations.id AND m.user_id = auth.uid()));
CREATE POLICY orgs_update ON public.organizations FOR UPDATE TO authenticated
USING (app_private.has_org_role(id, ARRAY['leader']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(id, ARRAY['leader']::public.membership_role[]));

-- profiles: own profile always; active org members can read each other
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_select_org ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.memberships me JOIN public.memberships other
    ON other.organization_id = me.organization_id
  WHERE me.user_id = auth.uid() AND me.status = 'active'
    AND other.user_id = public.profiles.id AND other.status = 'active'));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- memberships
CREATE POLICY memberships_select_self ON public.memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY memberships_select_org ON public.memberships FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id));
CREATE POLICY memberships_leader_update ON public.memberships FOR UPDATE TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]));

-- invitations: leader only, never anon
CREATE POLICY invitations_leader_all ON public.invitations FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]));

-- ministry_functions: active members read; leader manages
CREATE POLICY functions_select ON public.ministry_functions FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id));
CREATE POLICY functions_leader_write ON public.ministry_functions FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]));

-- member_functions: active members read; leader manages
CREATE POLICY member_functions_select ON public.member_functions FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id));
CREATE POLICY member_functions_leader_write ON public.member_functions FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader']::public.membership_role[]));

-- events: musicians see non-draft; leader/minister manage
CREATE POLICY events_select ON public.events FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id) AND (
  status <> 'draft' OR app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[])));
CREATE POLICY events_manage ON public.events FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]));

-- event_assignments
CREATE POLICY assignments_select ON public.event_assignments FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id) AND (
  app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[])
  OR app_private.owns_membership(membership_id)
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status <> 'draft')));
CREATE POLICY assignments_manage ON public.event_assignments FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]));
CREATE POLICY assignments_own_response ON public.event_assignments FOR UPDATE TO authenticated
USING (app_private.owns_membership(membership_id))
WITH CHECK (app_private.owns_membership(membership_id));

-- immutable columns for non managers
CREATE OR REPLACE FUNCTION public.guard_assignment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF app_private.has_org_role(OLD.organization_id, ARRAY['leader','minister']::public.membership_role[]) THEN
    RETURN NEW;
  END IF;
  IF NEW.event_id <> OLD.event_id OR NEW.membership_id <> OLD.membership_id
     OR NEW.function_id <> OLD.function_id OR NEW.assigned_by <> OLD.assigned_by
     OR NEW.organization_id <> OLD.organization_id OR NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Somente a própria resposta pode ser alterada';
  END IF;
  IF NEW.response_status = 'declined' AND NULLIF(btrim(COALESCE(NEW.response_note,'')),'') IS NULL THEN
    RAISE EXCEPTION 'É necessário justificar a recusa';
  END IF;
  NEW.responded_at := now();
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_assignment_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guard_assignment BEFORE UPDATE ON public.event_assignments
FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_update();

-- songs
CREATE POLICY songs_select ON public.songs FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id));
CREATE POLICY songs_manage ON public.songs FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]));

-- event_songs
CREATE POLICY event_songs_select ON public.event_songs FOR SELECT TO authenticated
USING (app_private.is_active_member(organization_id) AND EXISTS (
  SELECT 1 FROM public.events e WHERE e.id = event_id AND (
    e.status <> 'draft' OR app_private.has_org_role(e.organization_id, ARRAY['leader','minister']::public.membership_role[]))));
CREATE POLICY event_songs_manage ON public.event_songs FOR ALL TO authenticated
USING (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]))
WITH CHECK (app_private.has_org_role(organization_id, ARRAY['leader','minister']::public.membership_role[]));