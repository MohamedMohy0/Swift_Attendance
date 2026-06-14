// Client-side data layer. All calls go straight from the browser to Supabase
// using the publishable (anon) key. RLS protects the doctor tables; the two
// public RPCs (get_public_session / submit_attendance) cover the student flow.

import { supabase } from "@/integrations/supabase/client";

export type Course = { id: string; name: string; created_at: string };
export type AttendanceSession = {
  id: string;
  token: string;
  expires_at: string;
  session_date: string;
};
export type AttendanceRecord = {
  id: string;
  student_name: string;
  student_id: string;
  ip_address: string;
  lat: number;
  lng: number;
  created_at: string;
};

const SESSION_DURATION_SEC = 60;

function getUserId() {
  return supabase.auth.getUser().then(({ data, error }) => {
    if (error || !data.user) throw new Error("Not signed in");
    return data.user.id;
  });
}

// ---------- COURSES ----------

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCourse(id: string): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Course not found");
  return data;
}

export async function createCourse(name: string): Promise<Course> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  if (trimmed.length > 120) throw new Error("Name is too long");

  const userId = await getUserId();

  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("doctor_id", userId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) throw new Error("A course with this name already exists.");

  const { data, error } = await supabase
    .from("courses")
    .insert({ name: trimmed, doctor_id: userId })
    .select("id, name, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function renameCourse(id: string, name: string): Promise<Course> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  if (trimmed.length > 120) throw new Error("Name is too long");

  const userId = await getUserId();

  const { data: clash } = await supabase
    .from("courses")
    .select("id")
    .eq("doctor_id", userId)
    .ilike("name", trimmed)
    .neq("id", id)
    .maybeSingle();
  if (clash) throw new Error("Another course already has this name.");

  const { data, error } = await supabase
    .from("courses")
    .update({ name: trimmed })
    .eq("id", id)
    .select("id, name, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  // Block delete if the course has any sessions or attendance records.
  const [{ count: sessionCount, error: sErr }, { count: recordCount, error: rErr }] =
    await Promise.all([
      supabase
        .from("attendance_sessions")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id),
    ]);
  if (sErr) throw new Error(sErr.message);
  if (rErr) throw new Error(rErr.message);
  if ((sessionCount ?? 0) > 0 || (recordCount ?? 0) > 0) {
    throw new Error(
      "This course has sessions or attendance records. Clear them before deleting.",
    );
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- SESSIONS / RECORDS (doctor) ----------

export async function createAttendanceSession(input: {
  courseId: string;
  sessionDate: string;
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<AttendanceSession> {
  const userId = await getUserId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SEC * 1000).toISOString();
  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      course_id: input.courseId,
      doctor_id: userId,
      session_date: input.sessionDate,
      target_lat: input.lat,
      target_lng: input.lng,
      radius_m: input.radiusM,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at, session_date")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listRecords(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, student_name, student_id, ip_address, lat, lng, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------- STUDENT (public, via RPC) ----------

export type PublicSession =
  | { found: false }
  | {
      found: true;
      expired: boolean;
      sessionId: string;
      courseId: string;
      sessionDate: string;
      targetLat: number;
      targetLng: number;
      radiusM: number;
      expiresAt: string;
      courseName: string;
    };

export async function getPublicSession(token: string): Promise<PublicSession> {
  const { data, error } = await supabase.rpc("get_public_session", { p_token: token });
  if (error) throw new Error(error.message);
  return data as PublicSession;
}

export async function submitAttendance(input: {
  token: string;
  studentName: string;
  studentId: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_attendance", {
    p_token: input.token,
    p_student_name: input.studentName,
    p_student_id: input.studentId,
    p_lat: input.lat,
    p_lng: input.lng,
  });
  if (error) throw new Error(error.message);
}
