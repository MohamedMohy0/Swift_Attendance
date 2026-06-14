
-- Harden attendance_records: only service_role (server-side after location/IP validation) may write.
REVOKE INSERT, UPDATE, DELETE ON public.attendance_records FROM anon, authenticated;

-- Harden attendance_sessions: tokens & coordinates must never reach the browser via PostgREST.
-- Doctors only need write access; reads happen server-side via the service role.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions FROM anon;
-- Keep authenticated INSERT/UPDATE/DELETE for the existing owner-scoped policy, but drop SELECT
-- so even authenticated users can't enumerate other doctors' tokens or target coordinates.
REVOKE SELECT ON public.attendance_sessions FROM authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
GRANT ALL ON public.attendance_records TO service_role;
