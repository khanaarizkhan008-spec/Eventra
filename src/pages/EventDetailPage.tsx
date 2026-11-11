import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Flag,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegistrationModal } from "@/components/events/RegistrationModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeEvents";
import {
  fetchEventBySlugOrId,
  fetchPlatformSettings,
  reportEvent,
} from "@/services/eventsService";
import type { EventRecord, PlatformSettings } from "@/types/eventra";
import {
  calculateFeeBreakdown,
  formatCurrency,
  formatDateTime,
  getErrorMessage,
  getRegistrationAvailability,
} from "@/utils/format";

export function EventDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regOpen, setRegOpen] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const loadData = useCallback(async () => {
    if (!slugOrId) return;
    setError(null);
    try {
      const [ev, cfg] = await Promise.all([
        fetchEventBySlugOrId(slugOrId),
        fetchPlatformSettings(),
      ]);
      if (!ev) {
        setError("Event not found or unpublished.");
      } else {
        setEvent(ev);
      }
      setSettings(cfg);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load event details."));
    } finally {
      setLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSubscription(
    `event-detail-${event?.id || "none"}`,
    ["events", "registrations"],
    loadData,
    event ? { column: "id", value: event.id } : undefined,
  );

  const handleRegisterClick = () => {
    if (!user) {
      navigate(`/auth?mode=login&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setRegOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !event || !reportReason.trim()) return;
    setReporting(true);
    try {
      await reportEvent({
        eventId: event.id,
        reporterId: user.id,
        reason: reportReason.trim(),
        details: reportDetails.trim(),
      });
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
      toast({
        title: "Report Submitted",
        description: "Platform administrators will review this event report.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Unable to Report",
        description: getErrorMessage(err, "Submission failed."),
        variant: "error",
      });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState message={error || "Event not found"} onRetry={loadData} />
      </div>
    );
  }

  const availability = getRegistrationAvailability(event);
  const confirmedCount =
    event.live_stats?.confirmed_registrations ?? event.confirmed_count ?? 0;
  const feeBreakdown = calculateFeeBreakdown(event.registration_fee, settings);
  const organizerName =
    event.organizer?.organization_name || event.organizer?.full_name || event.college_name;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#A1A1AA] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Events
      </Link>

      {/* Banner */}
      <div className="relative mt-5 aspect-[21/9] w-full overflow-hidden rounded-3xl border border-zinc-800 bg-[#141419]">
        <img
          src={
            event.banner_url ||
            "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80"
          }
          alt={event.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{event.category}</Badge>
            <StatusBadge status={event.status} />
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-[#A1A1AA] backdrop-blur-md hover:text-white"
            >
              <Flag className="h-3 w-3" />
              Report Event
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Details */}
        <div className="space-y-8 lg:col-span-8">
          <div>
            <p className="text-sm font-medium text-[#A78BFA]">{organizerName}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {event.title}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800/80 bg-[#141419] p-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-[#A78BFA]" />
              <div>
                <p className="text-xs text-[#A1A1AA]">Start & End</p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {formatDateTime(event.start_at)}
                </p>
                <p className="text-xs text-[#A1A1AA]">to {formatDateTime(event.end_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-[#A78BFA]" />
              <div>
                <p className="text-xs text-[#A1A1AA]">Registration Deadline</p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {formatDateTime(event.registration_deadline)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-[#A78BFA]" />
              <div>
                <p className="text-xs text-[#A1A1AA]">Venue</p>
                <p className="mt-0.5 text-sm font-medium text-white">{event.venue}</p>
                {event.maps_url && (
                  <a
                    href={event.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[#A78BFA] hover:underline"
                  >
                    Open in Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-[#A78BFA]" />
              <div>
                <p className="text-xs text-[#A1A1AA]">Institution</p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {event.college_name}
                </p>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">About This Event</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#A1A1AA]">
              {event.description}
            </p>
          </section>

          {event.eligibility && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Eligibility</h2>
              <div className="rounded-2xl border border-zinc-800/80 bg-[#141419] p-5 text-sm leading-relaxed text-[#A1A1AA] whitespace-pre-line">
                {event.eligibility}
              </div>
            </section>
          )}

          {event.rules && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Rules & Guidelines</h2>
              <div className="rounded-2xl border border-zinc-800/80 bg-[#141419] p-5 text-sm leading-relaxed text-[#A1A1AA] whitespace-pre-line">
                {event.rules}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Organizer Contact</h2>
            <div className="flex flex-wrap gap-4 rounded-2xl border border-zinc-800/80 bg-[#141419] p-5 text-sm">
              <a
                href={`mailto:${event.contact_email}`}
                className="inline-flex items-center gap-2 text-[#A78BFA] hover:underline"
              >
                <Mail className="h-4 w-4" />
                {event.contact_email}
              </a>
              {event.contact_phone && (
                <a
                  href={`tel:${event.contact_phone}`}
                  className="inline-flex items-center gap-2 text-white hover:underline"
                >
                  <Phone className="h-4 w-4 text-[#A78BFA]" />
                  {event.contact_phone}
                </a>
              )}
            </div>
          </section>
        </div>

        {/* Registration Sidebar */}
        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-[#A1A1AA]">
                  Registration Fee
                </span>
                <span className="font-mono text-2xl font-bold text-white">
                  {formatCurrency(event.registration_fee, event.currency)}
                </span>
              </div>
              {feeBreakdown.gatewayFee > 0 && (
                <p className="text-xs text-[#A1A1AA]">
                  + {formatCurrency(feeBreakdown.gatewayFee + feeBreakdown.taxAmount, event.currency)} disclosed gateway fee & GST at checkout
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2.5 rounded-xl border border-zinc-800 bg-[#09090B] p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                    <Users className="h-3.5 w-3.5 text-[#A78BFA]" />
                    Confirmed Registrations
                  </span>
                  <span className="font-mono font-semibold text-white">
                    {confirmedCount} / {event.capacity}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#8B5CF6] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((confirmedCount / event.capacity) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#A1A1AA]">Remaining Seats</span>
                  <span className="font-mono font-semibold text-[#A78BFA]">
                    {availability.availableSeats}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={!availability.canRegister}
                onClick={handleRegisterClick}
              >
                <Ticket className="h-4 w-4" />
                {availability.canRegister
                  ? "Register Now"
                  : availability.reason || "Registration Closed"}
              </Button>

              {!availability.canRegister && availability.reason && (
                <p className="text-center text-xs text-amber-400">
                  {availability.reason}
                </p>
              )}

              <div className="flex items-start gap-2 text-xs text-[#A1A1AA]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  {event.registration_fee > 0
                    ? "Secured via Cashfree Payments. Instant cryptographic QR pass issued upon server verification."
                    : "Instant seat confirmation and cryptographic QR ticket."}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {event && (
        <RegistrationModal
          open={regOpen}
          onOpenChange={setRegOpen}
          event={event}
          settings={settings}
          onRegistered={loadData}
        />
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Event</DialogTitle>
            <DialogDescription>
              Flag inaccurate details, fraudulent fees, or policy violations for admin review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reportReason">Reason</Label>
              <Input
                id="reportReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="e.g., Misleading venue or unauthorized event"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reportDetails">Additional Details</Label>
              <Textarea
                id="reportDetails"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe the issue..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={reporting}>
                {reporting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
