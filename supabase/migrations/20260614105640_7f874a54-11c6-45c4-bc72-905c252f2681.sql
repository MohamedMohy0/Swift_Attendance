-- Public RPCs for the student attendance flow, so the SPA can use the
-- publishable (anon) key instead of the service role.

CREATE OR REPLACE FUNCTION public.get_public_session(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT s.id, s.course_id, s.session_date, s.target_lat, s.target_lng,
         s.radius_m, s.expires_at, c.name AS course_name
    INTO r
    FROM public.attendance_sessions s
    LEFT JOIN public.courses c ON c.id = s.course_id
   WHERE s.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'expired', r.expires_at < now(),
    'sessionId', r.id,
    'courseId', r.course_id,
    'sessionDate', r.session_date,
    'targetLat', r.target_lat,
    'targetLng', r.target_lng,
    'radiusM', r.radius_m,
    'expiresAt', r.expires_at,
    'courseName', COALESCE(r.course_name, 'Course')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_attendance(
  p_token uuid,
  p_student_name text,
  p_student_id text,
  p_lat double precision,
  p_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  dist double precision;
  R constant double precision := 6371000;
  dlat double precision;
  dlng double precision;
  a double precision;
  client_ip text;
BEGIN
  IF p_student_name IS NULL OR length(btrim(p_student_name)) = 0
     OR length(p_student_name) > 120 THEN
    RAISE EXCEPTION 'Invalid student name';
  END IF;
  IF p_student_id IS NULL OR length(btrim(p_student_id)) = 0
     OR length(p_student_id) > 60 THEN
    RAISE EXCEPTION 'Invalid student id';
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  SELECT id, course_id, doctor_id, session_date, target_lat, target_lng,
         radius_m, expires_at
    INTO s
    FROM public.attendance_sessions
   WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid attendance link.';
  END IF;
  IF s.expires_at < now() THEN
    RAISE EXCEPTION 'This QR code has expired. Please ask the doctor to generate a new one.';
  END IF;

  dlat := radians(s.target_lat - p_lat);
  dlng := radians(s.target_lng - p_lng);
  a := sin(dlat/2)^2
     + cos(radians(p_lat)) * cos(radians(s.target_lat)) * sin(dlng/2)^2;
  dist := 2 * R * asin(sqrt(a));

  IF dist > s.radius_m THEN
    RAISE EXCEPTION 'You are too far from the classroom (%m away, must be within %m).',
      round(dist)::int, s.radius_m;
  END IF;

  -- Best-effort IP from PostgREST
  BEGIN
    client_ip := COALESCE(
      split_part(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ',', 1),
      'unknown'
    );
  EXCEPTION WHEN OTHERS THEN
    client_ip := 'unknown';
  END;

  INSERT INTO public.attendance_records(
    session_id, course_id, doctor_id, session_date,
    student_name, student_id, ip_address, lat, lng
  ) VALUES (
    s.id, s.course_id, s.doctor_id, s.session_date,
    btrim(p_student_name), btrim(p_student_id),
    COALESCE(client_ip, 'unknown'), p_lat, p_lng
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_session(uuid) FROM public;
REVOKE ALL ON FUNCTION public.submit_attendance(uuid, text, text, double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attendance(uuid, text, text, double precision, double precision) TO anon, authenticated;
