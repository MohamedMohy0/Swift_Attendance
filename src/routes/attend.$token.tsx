import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSession, submitAttendance } from "@/lib/attendance.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, MapPin, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/attend/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign attendance" },
      { name: "description", content: "Confirm your attendance for class." },
    ],
  }),
  component: AttendPage,
});

function AttendPage() {
  const { token } = Route.useParams();

  const { data: session, isLoading } = useQuery({
    queryKey: ["public-session", token],
    queryFn: () => getPublicSession(token),
    refetchInterval: 2000,
  });

  const [name, setName] = useState("");
  const [sid, setSid] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoErr("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        setGeoErr(
          err.code === err.PERMISSION_DENIED
            ? "You must allow location access to sign attendance."
            : "Could not read your location. Please try again.",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) return toast.error("Waiting for location…");
    setSubmitting(true);
    try {
      await submitAttendance({
        token,
        studentName: name.trim(),
        studentId: sid.trim(),
        lat: coords.lat,
        lng: coords.lng,
      });
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <CenterShell><Loader2 className="h-6 w-6 animate-spin" /></CenterShell>;
  }

  if (!session || !session.found) {
    return (
      <CenterShell>
        <Status icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
          title="Invalid link"
          text="This attendance link is not valid." />
      </CenterShell>
    );
  }

  if (session.expired && !done) {
    return (
      <CenterShell>
        <Status icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
          title="QR expired"
          text="This QR is no longer active. Ask your doctor to generate a new one." />
      </CenterShell>
    );
  }

  if (done) {
    return (
      <CenterShell>
        <Status icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
          title="Attendance recorded"
          text={`You're checked in for ${session.courseName} on ${session.sessionDate}.`} />
      </CenterShell>
    );
  }

  return (
    <CenterShell>
      <Card className="p-6 w-full max-w-md space-y-5">
        <div>
          <h1 className="text-xl font-semibold">{session.courseName}</h1>
          <p className="text-sm text-muted-foreground">
            Sign attendance for {session.sessionDate}
          </p>
        </div>

        {geoErr && (
          <div className="text-sm rounded-md bg-destructive/10 text-destructive p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {geoErr}
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {coords
            ? `Location captured (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
            : "Requesting your location…"}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sid">Student ID</Label>
            <Input
              id="sid"
              required
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="e.g. 20231234"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !coords || !name.trim() || !sid.trim()}
            className="w-full"
            size="lg"
          >
            {submitting ? "Submitting…" : "Sign attendance"}
          </Button>
        </form>
      </Card>
    </CenterShell>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function Status({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="p-8 w-full max-w-md text-center space-y-3">
      <div className="flex justify-center">{icon}</div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
