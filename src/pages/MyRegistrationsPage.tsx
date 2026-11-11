import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Ticket } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeEvents";
import { fetchMyRegistrations } from "@/services/registrationsService";
import type { RegistrationRecord } from "@/types/eventra";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/utils/format";

export function MyRegistrationsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const list = await fetchMyRegistrations(user.id);
      setRegistrations(list);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load registrations."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useRealtimeSubscription(
    `my-regs-${user?.id || "anon"}`,
    ["registrations", "payments", "tickets"],
    loadRegistrations,
  );

  return (
    <DashboardLayout
      title="My Tickets & Registrations"
      subtitle="Track payment verifications and access your digital QR event passes."
      tabs={[
        { label: "My Tickets & Registrations", to: "/my-registrations", end: true },
        { label: "Profile", to: "/profile" },
      ]}
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRegistrations} />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          description="Explore upcoming campus hackathons, workshops, and fests to claim your first pass."
          action={
            <Button asChild>
              <Link to="/events">Explore Events</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const canViewTicket =
              reg.status === "confirmed" &&
              reg.ticket_id &&
              ["FREE", "SUCCESS"].includes(reg.payment_status);

            return (
              <Card key={reg.id} className="overflow-hidden">
                <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={reg.status} />
                      <StatusBadge status={`PAY_${reg.payment_status}`} />
                      {reg.ticket_id && (
                        <span className="rounded-lg bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-[#A78BFA]">
                          {reg.ticket_id}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/events/${reg.event?.slug || reg.event_id}`}
                      className="block text-lg font-semibold text-white hover:text-[#A78BFA]"
                    >
                      {reg.event?.title || "Event Registration"}
                    </Link>
                    <p className="text-xs text-[#A1A1AA]">
                      {reg.event?.start_at ? formatDateTime(reg.event.start_at) : ""} •{" "}
                      {reg.event?.venue} • Paid{" "}
                      <span className="font-mono text-white">
                        {formatCurrency(reg.payable_amount)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {canViewTicket && (
                      <Button asChild>
                        <Link to={`/tickets/${reg.ticket_id}`}>
                          <Ticket className="h-4 w-4" />
                          View QR Ticket
                        </Link>
                      </Button>
                    )}

                    {reg.status === "pending_payment" && reg.payment?.provider_order_id && (
                      <Button variant="secondary" asChild>
                        <Link
                          to={`/payment-status?order_id=${encodeURIComponent(
                            reg.payment.provider_order_id,
                          )}&registration_id=${reg.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Verify Payment
                        </Link>
                      </Button>
                    )}

                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/events/${reg.event?.slug || reg.event_id}`}>
                        Event Page
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

