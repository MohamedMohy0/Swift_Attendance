
-- COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX courses_doctor_idx ON public.courses(doctor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage their own courses" ON public.courses
  FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

-- ATTENDANCE SESSIONS
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  target_lat DOUBLE PRECISION NOT NULL,
  target_lng DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 100,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX att_sessions_doctor_idx ON public.attendance_sessions(doctor_id);
CREATE INDEX att_sessions_token_idx ON public.attendance_sessions(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage their own sessions" ON public.attendance_sessions
  FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

-- ATTENDANCE RECORDS
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  student_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_per_ip UNIQUE (course_id, session_date, ip_address),
  CONSTRAINT uniq_per_student UNIQUE (course_id, session_date, student_id)
);
CREATE INDEX att_records_session_idx ON public.attendance_records(session_id);
CREATE INDEX att_records_doctor_idx ON public.attendance_records(doctor_id);
GRANT SELECT ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors read their own records" ON public.attendance_records
  FOR SELECT USING (auth.uid() = doctor_id);
