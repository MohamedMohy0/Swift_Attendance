import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, QrCode, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendance — Geofenced QR check-in" },
      {
        name: "description",
        content:
          "Generate a 1-minute QR code so students can sign attendance in person. Validated by location and IP.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span>Attendance</span>
        </div>
        <Button asChild>
          <Link to="/auth">sign in</Link>
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-16 pb-24 text-center space-y-10">
        <div className="space-y-5">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            One-minute QR attendance,
            <br />
            verified by location.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Instractor sign in with Google, generate a QR valid for 60 seconds, and
            students check in by scanning it. Location and IP rules stop
            anyone from signing for a friend.
          </p>
          <div className="flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-left">
          <Feature icon={<QrCode className="h-5 w-5" />} title="60-second QR">
            Each QR expires after a minute so screenshots can't be reused.
          </Feature>
          <Feature icon={<MapPin className="h-5 w-5" />} title="Geofenced">
            Students must be physically inside your set radius to check in.
          </Feature>
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="IP + ID locked">
            One IP and one student ID per date no signing for friends.
          </Feature>
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-2">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
