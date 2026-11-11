import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  CalendarPlus,
  Download,
  ExternalLink,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useToast } from "@/hooks/useToast";
import { fetchSignedQrToken, fetchTicketById } from "@/services/ticketsService";
import type { TicketRecord } from "@/types/eventra";
import { buildGoogleCalendarUrl, downloadIcsEvent } from "@/utils/calendar";
import { formatDateTime, getErrorMessage } from "@/utils/format";
import { downloadTicketPdf } from "@/utils/pdf";

export function TicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { toast } = useToast();
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const record = await fetchTicketById(ticketId);
      if (!record) {
        setError("Ticket not found or you do not have permission to view it.");
        return;
      }
      setTicket(record);

      // Only request cryptographic QR token when registration & payment are valid
      if (
        record.status !== "refunded" &&
        record.status !== "cancelled" &&
        record.registration?.status === "confirmed"
      ) {
        const token = await fetchSignedQrToken(record.id);
        setQrToken(token);
      } else {
        setQrToken(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load ticket."));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleDownloadPdf = async () => {
    if (!ticket || !ticket.event || !ticket.registration) return;
    setDownloadingPdf(true);
    try {
      const svgEl = qrContainerRef.current?.querySelector("svg") ?? null;
      await downloadTicketPdf({
        ticketId: ticket.id,
        eventTitle: ticket.event.title,
        participantName: ticket.registration.participant_name,
        participantEmail: ticket.registration.participant_email,
        venue: ticket.event.venue,
        collegeName: ticket.event.college_name,
        startAt: ticket.event.start_at,
        status: ticket.status,
        qrSvgElement: svgEl,
      });
      toast({ title: "PDF Pass Downloaded", variant: "success" });
    } catch (err) {
      toast({
        title: "PDF Export Failed",
        description: getErrorMessage(err, "Unable to generate PDF."),
        variant: "error",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !ticket || !ticket.event || !ticket.registration) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ErrorState message={error || "Ticket unavailable."} onRetry={loadTicket} />
      </div>
    );
  }

  const isRevoked =
    ticket.status === "refunded" ||
    ticket.status === "cancelled" ||
    ticket.registration.status !== "confirmed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/my-registrations"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#A1A1AA] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to My Tickets
      </Link>

      <Card className="mt-5 overflow-hidden border-zinc-800">
        {/* Banner Header */}
        <div className="relative h-44 w-full bg-zinc-900">
          <img
            src={
              ticket.event.banner_url ||
              "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80"
            }
            alt={ticket.event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141419] via-[#141419]/50 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={ticket.status} />
            <span className="rounded-lg border border-white/15 bg-black/60 px-3 py-1 font-mono text-xs text-white backdrop-blur-md">
              {ticket.id}
            </span>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Ticket Metadata */}
            <div className="space-y-5 md:col-span-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-[#A78BFA]">
                  Eventra Digital Pass
                </p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                  {ticket.event.title}
                </h1>
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-800 bg-[#09090B] p-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                    Participant
                  </p>
                  <p className="mt-0.5 font-semibold text-white">
                    {ticket.registration.participant_name}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    {ticket.registration.participant_email}
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                    Date & Time
                  </p>
                  <p className="mt-0.5 text-white">
                    {formatDateTime(ticket.event.start_at)}
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                    Venue
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-white">
                    <MapPin className="h-3.5 w-3.5 text-[#A78BFA]" />
                    {ticket.event.venue}, {ticket.event.college_name}
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">Registration Status</span>
                  <StatusBadge status={ticket.registration.status} />
                </div>
              </div>
            </div>

            {/* QR Box */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#09090B] p-6 text-center md:col-span-5">
              {isRevoked || !qrToken ? (
                <div className="space-y-3 py-6">
                  <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
                  <p className="text-sm font-semibold text-rose-300">
                    Ticket Not Valid for Entry
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Valid admission QR passes are hidden for refunded, cancelled, or unpaid
                    registrations.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    ref={qrContainerRef}
                    className="rounded-2xl bg-white p-4 shadow-lg"
                  >
                    <QRCodeSVG
                      value={qrToken}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Signed Cryptographic Pass</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[#A1A1AA]">
                    Present this QR at venue check-in
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-zinc-800/80 pt-6">
            {!isRevoked && qrToken && (
              <Button onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <Download className="h-4 w-4" />
                {downloadingPdf ? "Generating PDF..." : "Download Ticket PDF"}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() =>
                downloadIcsEvent({
                  title: ticket.event!.title,
                  description: ticket.event!.description,
                  location: `${ticket.event!.venue}, ${ticket.event!.college_name}`,
                  startAt: ticket.event!.start_at,
                  endAt: ticket.event!.end_at,
                  ticketId: ticket.id,
                })
              }
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar (.ics)
            </Button>

            <Button variant="outline" asChild>
              <a
                href={buildGoogleCalendarUrl({
                  title: ticket.event.title,
                  description: `Eventra Ticket: ${ticket.id}`,
                  location: `${ticket.event.venue}, ${ticket.event.college_name}`,
                  startAt: ticket.event.start_at,
                  endAt: ticket.event.end_at,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Google Calendar
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>

            <Button variant="ghost" asChild>
              <Link to={`/events/${ticket.event.slug}`}>View Event Details</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

