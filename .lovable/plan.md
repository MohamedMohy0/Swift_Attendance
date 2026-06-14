## What we're building

An instactor signs in with Google, manages their courses, and generates a 1-minute QR code tied to a date + geofenced location. Students scan the QR, enter Name + Student ID, and the app records their attendance only if their IP and GPS location are within range and they haven't already signed in for that date.

## Stack

- Lovable Cloud (Supabase) for DB + Google Auth
- TanStack Start server functions for all writes (so we can capture real IP server-side)
- `qrcode` npm package for QR rendering
- Default geofence: 30.0507, 31.2489 / 100m radius (editable per session by the doctor)

## Database schema

```text
courses
  id, doctor_id (auth.users), name, created_at
  RLS: doctor owns their courses

attendance_sessions
  id, course_id, session_date (date), token (uuid, public),
  target_lat, target_lng, radius_m, expires_at (now()+60s), created_at
  RLS: doctor reads own; public read by token via server fn (admin client)

attendance_records
  id, session_id, course_id, session_date,
  student_name, student_id, ip_address, lat, lng, created_at
  UNIQUE(course_id, session_date, ip_address)
  UNIQUE(course_id, session_date, student_id)
  RLS: doctor reads records for their courses; inserts only via server fn
```

## Routes

```text
/auth                          Google sign-in page
/_authenticated/               Doctor dashboard: list courses, add course
/_authenticated/courses/$id    Course detail: pick date, set lat/lng/radius, generate QR
                               Shows QR + 60s countdown + live attendee list
/attend/$token                 Public: student enters Name + ID, browser captures GPS,
                               submits to server fn that captures IP + validates
```

## Server functions (all the security-critical work)

- `createCourse`, `listCourses` (auth required)
- `createSession({ courseId, date, lat, lng, radius })` → returns `{ token, expiresAt }`
- `getSessionByToken({ token })` → public, returns target lat/lng/radius + expiry (no PII)
- `submitAttendance({ token, name, studentId, lat, lng })` — public; reads real IP via `getRequestIP`, checks:
  1. session not expired
  2. haversine distance ≤ radius
  3. no existing record with same (course, date, ip) or (course, date, studentId)
  then inserts via admin client
- `listRecords({ sessionId })` (auth required) for the doctor's live list

## QR behavior

QR encodes `${origin}/attend/${token}`. After `createSession`, frontend shows QR with a 60s countdown. When it hits 0 the QR is replaced with an expired state and a "Generate again" button (no auto-refresh, per your choice).

## Vercel deployment

TanStack Start works on Vercel out of the box. Server functions use `getRequestIP({ xForwardedFor: true })` which respects Vercel's `x-forwarded-for` header so we get the student's real public IP.

## Out of scope (for this iteration)

- Editing/deleting courses
- Exporting attendance to CSV
- Multi-doctor admin panel