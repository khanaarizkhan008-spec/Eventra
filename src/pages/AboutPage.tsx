import { Link } from "react-router-dom";
import { Lock, QrCode, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
          About Eventra
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Campus Event Infrastructure Built for Trust and Scale.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA]">
          Eventra connects students, college clubs, and institutional organizers on a single
          platform backed by PostgreSQL transactional seat locking, Cashfree server-verified
          payments, and opaque cryptographic QR admission passes.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <ShieldCheck className="h-6 w-6 text-[#A78BFA]" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Zero Payment Trust Shortcuts
            </h3>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              Registration seats are never confirmed from client redirects. Every transaction is
              independently verified against Cashfree’s server API and HMAC-SHA256 webhooks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <QrCode className="h-6 w-6 text-[#A78BFA]" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Atomic Gate Check-Ins
            </h3>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              QR passes encode only a server-signed opaque token whose SHA-256 hash is matched
              under row-level locks, guaranteeing zero duplicate entries across multiple gates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Lock className="h-6 w-6 text-[#A78BFA]" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Strict Role-Based Security
            </h3>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              PostgreSQL Row Level Security isolates participant, organizer, and admin records.
              Organizer accounts require explicit admin approval.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Zap className="h-6 w-6 text-[#A78BFA]" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Live Realtime Dashboards
            </h3>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              Organizers watch confirmed seats, pending reservations, and gate arrivals sync live
              via Supabase Realtime.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/events">Explore Events</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/organizer">Host an Event</Link>
        </Button>
      </div>
    </div>
  );
}

