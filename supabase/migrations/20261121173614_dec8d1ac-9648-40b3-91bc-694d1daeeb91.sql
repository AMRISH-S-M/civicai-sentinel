CREATE TYPE public.app_role AS ENUM ('admin', 'crew');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own profile editable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, NULLIF(left(NEW.raw_user_meta_data->>'display_name', 80), ''), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reports: replace open demo policies with staff/resident rules.
DROP POLICY "Demo: anyone can read reports" ON public.reports;
DROP POLICY "Demo: anyone can submit consented reports" ON public.reports;
DROP POLICY "Demo: anyone can update reports" ON public.reports;
DROP POLICY "Demo: anyone can remove reports on reset" ON public.reports;
REVOKE UPDATE, DELETE, SELECT ON public.reports FROM anon;

CREATE POLICY "Staff read reports" ON public.reports FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Residents submit consented reports" ON public.reports FOR INSERT TO anon, authenticated
  WITH CHECK (consent = true AND status = 'SUBMITTED' AND verification IS NULL AND work_order IS NULL AND incident_id IS NULL);
CREATE POLICY "Staff update reports" ON public.reports FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()) AND consent = true);
CREATE POLICY "Staff remove reports" ON public.reports FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Ticket lookup by number for residents (one row, no listing).
CREATE OR REPLACE FUNCTION public.get_ticket(_id text)
RETURNS SETOF public.reports LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.reports WHERE id = upper(trim(_id)) LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_ticket(text) TO anon, authenticated;

-- Resident confirm / dispute / reopen on a ticket.
CREATE OR REPLACE FUNCTION public.citizen_sign_off(_id text, _decision text, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reports; n text := left(coalesce(_note, ''), 300); t text := now()::text;
BEGIN
  SELECT * INTO r FROM public.reports WHERE id = upper(trim(_id)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF _decision IN ('confirmed', 'disputed') THEN
    IF r.status <> 'VERIFICATION_PENDING' OR r.verification IS NULL OR r.verification ? 'human' THEN RAISE EXCEPTION 'Ticket is not awaiting confirmation'; END IF;
    UPDATE public.reports SET
      status = CASE WHEN _decision = 'confirmed' THEN 'CLOSED' ELSE 'REOPENED' END,
      verification = r.verification || jsonb_build_object('human', jsonb_strip_nulls(jsonb_build_object('decision', _decision, 'at', to_jsonb(now()), 'note', NULLIF(n, '')))),
      history = r.history || jsonb_build_array(jsonb_build_object('at', to_jsonb(now()), 'actor', 'citizen', 'text',
        CASE WHEN _decision = 'confirmed' THEN 'Repair confirmed by citizen' ELSE 'Repair disputed by citizen — reopened' END || CASE WHEN n <> '' THEN ': ' || n ELSE '' END))
    WHERE id = r.id;
  ELSIF _decision = 'reopen' THEN
    IF r.status <> 'CLOSED' THEN RAISE EXCEPTION 'Only closed tickets can be reopened'; END IF;
    UPDATE public.reports SET status = 'REOPENED',
      history = r.history || jsonb_build_array(jsonb_build_object('at', to_jsonb(now()), 'actor', 'citizen', 'text', 'Reopened by citizen'))
    WHERE id = r.id;
  ELSE RAISE EXCEPTION 'Unknown decision';
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.citizen_sign_off(text, text, text) TO anon, authenticated;