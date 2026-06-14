import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import {
  createAttendanceSession,
  getCourse,
  listRecords,
} from "@/lib/attendance.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MapPicker } from "@/components/MapPicker";
import { toast } from "sonner";
import { ArrowLeft, QrCode, Clock, MapPin, Users, Download, LocateFixed } from "lucide-react";

const DEFAULT_LAT = 30.0507;
const DEFAULT_LNG = 31.2489;
const DEFAULT_RADIUS = 100;

export const Route = createFileRoute("/_authenticated/courses/$id")({
  ssr: false,
  component: CoursePage,
});

function todayISO() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function CoursePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourse(id),
  });

  const [date, setDate] = useState(todayISO());
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);

  const [session, setSession] = useState<{
    id: string;
    token: string;
    expires_at: string;
    session_date: string;
  } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const link = useMemo(() => {
    if (!session) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/attend/${session.token}`;
  }, [session]);

  // Generate QR + run countdown
  useEffect(() => {
    if (!session) {
      setQrUrl(null);
      return;
    }
    QRCode.toDataURL(link, { width: 320, margin: 1 }).then(setQrUrl);
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000),
      );
      setRemaining(left);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [session, link]);

  const expired = session !== null && remaining === 0;

  const createMut = useMutation({
    mutationFn: () =>
      createAttendanceSession({
        courseId: id,
        sessionDate: date,
        lat,
        lng,
        radiusM: radius,
      }),
    onSuccess: (row) => {
      setSession(row);
      toast.success("QR generated — valid for 60 seconds");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Poll records every 3s while session active
  const { data: records = [] } = useQuery({
    queryKey: ["records", session?.id],
    queryFn: () => listRecords(session!.id),
    enabled: !!session,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (session) qc.invalidateQueries({ queryKey: ["records", session.id] });
  }, [session, qc]);

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> All courses
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{course?.name ?? "Course"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a date and target location, then generate a 1-minute QR.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Session settings</h2>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Target location</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!navigator.geolocation) {
                    toast.error("Geolocation not supported");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLat(pos.coords.latitude);
                      setLng(pos.coords.longitude);
                      toast.success("Centered on your current location");
                    },
                    () => toast.error("Could not get your location"),
                  );
                }}
              >
                <LocateFixed className="h-3.5 w-3.5 mr-1" /> Use my location
              </Button>
            </div>
            <MapPicker
              lat={lat}
              lng={lng}
              radius={radius}
              onChange={(la, ln) => {
                setLat(la);
                setLng(ln);
              }}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Click the map or drag the pin to
              set the classroom. Selected: {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Allowed radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              min={10}
              max={5000}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value || "0", 10))}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            <QrCode className="h-4 w-4 mr-1" />
            {session ? "Generate again" : "Generate QR code"}
          </Button>
        </Card>

        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[360px]">
          {!session ? (
            <div className="text-muted-foreground space-y-2">
              <QrCode className="h-12 w-12 mx-auto opacity-30" />
              <p>QR will appear here</p>
            </div>
          ) : expired ? (
            <div className="space-y-3">
              <div className="h-[320px] w-[320px] mx-auto rounded-lg border-2 border-dashed grid place-items-center text-muted-foreground">
                Expired
              </div>
              <p className="text-sm text-destructive font-medium">
                QR expired. Click "Generate again" to issue a new one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {qrUrl && (
                <div className="relative inline-block">
                  <img
                    src={qrUrl}
                    alt="Attendance QR"
                    className="rounded-lg border bg-white"
                  />
                  <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full h-12 w-12 grid place-items-center font-semibold shadow-lg">
                    {remaining}s
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Valid for {remaining} more second{remaining === 1 ? "" : "s"}
              </div>
              <p className="text-xs text-muted-foreground break-all max-w-xs">
                {link}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" /> Attendance for {date} ({records.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={records.length === 0}
            onClick={() => {
              const rows = records.map((r) => ({
                Time: new Date(r.created_at).toLocaleString(),
                Name: r.student_name,
                "Student ID": r.student_id,
                IP: r.ip_address,
                Latitude: r.lat,
                Longitude: r.lng,
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              ws["!cols"] = [
                { wch: 22 },
                { wch: 24 },
                { wch: 16 },
                { wch: 16 },
                { wch: 12 },
                { wch: 12 },
              ];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Attendance");
              const safeName = (course?.name ?? "course").replace(/[^a-z0-9]+/gi, "_");
              XLSX.writeFile(wb, `attendance_${safeName}_${date}.xlsx`);
            }}
          >
            <Download className="h-4 w-4 mr-1" /> Download Excel
          </Button>
        </div>
        {!session ? (
          <p className="text-sm text-muted-foreground">
            Generate a QR to start receiving check-ins.
          </p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Student ID</th>
                  <th className="py-2 pr-4">IP</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2 pr-4 font-medium">{r.student_name}</td>
                    <td className="py-2 pr-4">{r.student_id}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {r.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
