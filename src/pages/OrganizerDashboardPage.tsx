import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  EyeOff,
  IndianRupee,
  Plus,
  QrCode,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeEvents";
import {
  cancelEventAsOrganizer,
  deleteDraftEvent,
  fetchOrganizerEvents,
  fetchOrganizerRegistrations,
  initiateRefund,
  sendEventReminders,
  updateEventRecord,
} from "@/services/organizerService";
import type { EventRecord, RegistrationRecord } from "@/types/eventra";
import { downloadCsv } from "@/utils/csv";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/utils/format";

export function OrganizerDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const [refundTarget, setRefundTarget] = useState<RegistrationRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const evList = await fetchOrganizerEvents(user.id);
      setEvents(evList);
      const regList = await fetchOrganizerRegistrations(evList.map((e) => e.id));
      setRegistrations(regList);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load organizer dashboard."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Live Supabase Realtime monitoring
  useRealtimeSubscription(
    `org-dash-${user?.id || "anon"}`,
    ["events", "registrations", "payments", "tickets"],
    loadDashboard,
  );

  const metrics = useMemo(() => {
    const confirmedRegs = registrations.filter((r) => r.status === "confirmed");
    const grossRevenue = confirmedRegs.reduce((sum, r) => sum + Number(r.payable_amount || 0), 0);
    const baseRevenue = confirmedRegs.reduce((sum, r) => sum + Number(r.base_fee || 0), 0);
    const upcomingCount = events.filter(
      (e) => e.status === "published" && new Date(e.start_at) > new Date(),
    ).length;

    return {
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      confirmedAttendees: confirmedRegs.length,
      grossRevenue,
      baseRevenue,
      upcomingCount,
    };
  }, [events, registrations]);

  const filteredRegistrations = useMemo(() => {
    if (selectedEventFilter === "all") return registrations;
    return registrations.filter((r) => r.event_id === selectedEventFilter);
  }, [registrations, selectedEventFilter]);

  const handleTogglePublish = async (ev: EventRecord) => {
    const nextStatus = ev.status === "published" ? "unpublished" : "published";
    try {
      await updateEventRecord(ev.id, { status: nextStatus });
      toast({
        title: nextStatus === "published" ? "Event Published" : "Event Unpublished",
        variant: "success",
      });
      loadDashboard();
    } catch (err) {
      toast({
        title: "Status Update Failed",
        description: getErrorMessage(err, "Unable to update event."),
        variant: "error",
      });
    }
  };

  const handleCancelEvent = async (ev: EventRecord) => {
    if (!window.confirm(`Cancel "${ev.title}"? Registrations will be stopped.`)) return;
    try {
      const res = await cancelEventAsOrganizer(ev.id);
      toast({
        title: "Event Cancelled",
        description: `${res.notifiedCount} confirmed attendees were queued for cancellation notice.`,
        variant: "success",
      });
      loadDashboard();
    } catch (err) {
      toast({
        title: "Cancellation Failed",
        description: getErrorMessage(err, "Unable to cancel event."),
        variant: "error",
      });
    }
  };

  const handleSendReminders = async (ev: EventRecord) => {
    setSendingReminderId(ev.id);
    try {
      const res = await sendEventReminders(ev.id);
      toast({
        title: "Event Reminders Sent",
        description: `Dispatched reminder emails to ${res.sentCount} confirmed attendee(s).`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Reminder Dispatch Failed",
        description: getErrorMessage(err, "Unable to send reminders."),
        variant: "error",
      });
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleDeleteDraft = async (ev: EventRecord) => {
    if (!window.confirm(`Delete draft "${ev.title}" permanently?`)) return;
    try {
      await deleteDraftEvent(ev.id);
      toast({ title: "Draft Deleted", variant: "success" });
      loadDashboard();
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: getErrorMessage(err, "Unable to delete draft."),
        variant: "error",
      });
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      `eventra-attendees-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Ticket ID",
        "Event",
        "Participant Name",
        "Email",
        "Phone",
        "College",
        "Department",
        "Year",
        "Status",
        "Payment Status",
        "Amount (INR)",
        "Registered At",
      ],
      filteredRegistrations.map((r) => [
        r.ticket_id || "",
        r.event?.title || "",
        r.participant_name,
        r.participant_email,
        r.participant_phone,
        r.college_name || "",
        r.department || "",
        r.year_of_study || "",
        r.status,
        r.payment_status,
        r.payable_amount,
        r.registered_at,
      ]),
    );
    toast({ title: "CSV Exported", variant: "success" });
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget?.payment?.id || !refundReason.trim()) return;
    setRefunding(true);
    try {
      const amt = refundAmount ? Number(refundAmount) : undefined;
      await initiateRefund({
        paymentId: refundTarget.payment.id,
        amount: amt,
        reason: refundReason.trim(),
      });
      toast({
        title: "Refund Processed",
        description: "Cashfree refund recorded and ticket status updated.",
        variant: "success",
      });
      setRefundTarget(null);
      setRefundAmount("");
      setRefundReason("");
      loadDashboard();
    } catch (err) {
      toast({
        title: "Refund Failed",
        description: getErrorMessage(err, "Unable to initiate refund."),
        variant: "error",
      });
    } finally {
      setRefunding(false);
    }
  };

  const settlementSummary = useMemo(() => {
    const paidRegs = registrations.filter((r) => r.payment_status === "SUCCESS");
    const refundedCount = registrations.filter(
      (r) =>
        r.payment_status === "REFUNDED" || r.payment_status === "PARTIALLY_REFUNDED",
    ).length;
    const grossCollected = paidRegs.reduce(
      (sum, r) => sum + Number(r.payable_amount || 0),
      0,
    );
    const gatewayFees = paidRegs.reduce(
      (sum, r) => sum + Number(r.gateway_fee || 0),
      0,
    );
    const taxAmount = paidRegs.reduce((sum, r) => sum + Number(r.tax_amount || 0), 0);
    const netSettlement = paidRegs.reduce(
      (sum, r) => sum + Number(r.base_fee || 0),
      0,
    );
    return {
      paidOrders: paidRegs.length,
      refundedCount,
      grossCollected,
      gatewayFees,
      taxAmount,
      netSettlement,
    };
  }, [registrations]);

  const upcomingEventsSummary = useMemo(() => {
    const now = Date.now();
    return events
      .filter(
        (ev) => ev.status === "published" && new Date(ev.end_at).getTime() >= now,
      )
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 4);
  }, [events]);

  return (
    <DashboardLayout
      title="Organizer Studio"
      subtitle="Create events, monitor live seat counts via Supabase Realtime, and verify QR tickets."
      tabs={[
        { label: "Overview & Events", to: "/organizer", end: true },
        { label: "Create New Event", to: "/organizer/events/new" },
        { label: "QR Check-In Scanner", to: "/organizer/scanner" },
      ]}
      actions={
        <>
          <Button variant="secondary" asChild>
            <Link to="/organizer/scanner">
              <QrCode className="h-4 w-4 text-[#A78BFA]" />
              Open Scanner
            </Link>
          </Button>
          <Button asChild>
            <Link to="/organizer/events/new">
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </>
      }
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <div className="space-y-10">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Total Events</span>
                  <CalendarDays className="h-4 w-4 text-[#A78BFA]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {metrics.totalEvents}
                </p>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  {metrics.upcomingCount} upcoming published
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Total Registrations</span>
                  <Users className="h-4 w-4 text-[#A78BFA]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {metrics.totalRegistrations}
                </p>
                <p className="mt-1 text-xs text-[#A1A1AA]">Across all statuses</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Confirmed Attendees</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {metrics.confirmedAttendees}
                </p>
                <p className="mt-1 text-xs text-emerald-400">
                  Excludes pending & failed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Gross Collected</span>
                  <IndianRupee className="h-4 w-4 text-[#A78BFA]" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {formatCurrency(metrics.grossRevenue)}
                </p>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Base ticket value: {formatCurrency(metrics.baseRevenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live Registration Monitoring */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Your Events & Live Capacity Monitor
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Realtime Sync Active
              </span>
            </div>

            {events.length === 0 ? (
              <EmptyState
                title="No events created yet"
                description="Create your first event draft or publish an event immediately."
                action={
                  <Button asChild>
                    <Link to="/organizer/events/new">Create First Event</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {events.map((ev) => {
                  const stats = ev.live_stats;
                  const confirmed = stats?.confirmed_registrations ?? ev.confirmed_count;
                  const pending = stats?.pending_payments ?? 0;
                  const cancelled = stats?.cancelled_registrations ?? 0;
                  const available = stats?.available_seats ?? Math.max(0, ev.capacity - confirmed);

                  return (
                    <Card key={ev.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={ev.status} />
                              <span className="font-mono text-xs text-[#A78BFA]">
                                {formatCurrency(ev.registration_fee, ev.currency)}
                              </span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-white">
                              {ev.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#A1A1AA]">
                              {formatDateTime(ev.start_at)} • {ev.venue}
                            </p>
                          </div>
                        </div>

                        {/* Live Seat Breakdown */}
                        <div className="mt-4 grid grid-cols-5 gap-2 rounded-xl border border-zinc-800 bg-[#09090B] p-3 text-center">
                          <div>
                            <p className="text-[10px] text-[#A1A1AA]">Capacity</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-white">
                              {ev.capacity}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#A1A1AA]">Confirmed</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-emerald-400">
                              {confirmed}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#A1A1AA]">Pending</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-amber-400">
                              {pending}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#A1A1AA]">Cancelled</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-rose-400">
                              {cancelled}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#A1A1AA]">Available</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-[#A78BFA]">
                              {available}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="secondary" asChild>
                            <Link to={`/organizer/events/${ev.id}/edit`}>
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>

                          {(ev.status === "published" || ev.status === "unpublished" || ev.status === "draft") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePublish(ev)}
                            >
                              {ev.status === "published" ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" />
                                  Publish
                                </>
                              )}
                            </Button>
                          )}

                          {ev.status === "published" && new Date(ev.end_at) >= new Date() && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sendingReminderId === ev.id}
                              onClick={() => handleSendReminders(ev)}
                            >
                              <Bell className="h-3.5 w-3.5 text-[#A78BFA]" />
                              {sendingReminderId === ev.id
                                ? "Sending..."
                                : "Send Reminders"}
                            </Button>
                          )}

                          {ev.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-400 hover:text-rose-300"
                              onClick={() => handleCancelEvent(ev)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cancel Event
                            </Button>
                          )}

                          {ev.status === "draft" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-400 hover:text-rose-300"
                              onClick={() => handleDeleteDraft(ev)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Draft
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Revenue Settlement Breakdown & Activity Summary */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <IndianRupee className="h-4 w-4 text-[#A78BFA]" />
                  Revenue Settlement Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span>Gross Paid Collection ({settlementSummary.paidOrders} orders)</span>
                  <span className="font-mono font-semibold text-white">
                    {formatCurrency(settlementSummary.grossCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span>Gateway Processing Fees</span>
                  <span className="font-mono text-white">
                    {formatCurrency(settlementSummary.gatewayFees)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span>GST on Gateway Fees</span>
                  <span className="font-mono text-white">
                    {formatCurrency(settlementSummary.taxAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                  <span className="font-medium text-white">
                    Net Ticket Revenue ({settlementSummary.refundedCount} refunded)
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {formatCurrency(settlementSummary.netSettlement)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base">
                  Upcoming Events & Recent Registrations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
                    Next Published Events
                  </p>
                  {upcomingEventsSummary.length === 0 ? (
                    <p className="text-xs text-[#A1A1AA]">No upcoming published events.</p>
                  ) : (
                    upcomingEventsSummary.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-zinc-800/90 bg-[#09090B] p-2.5 text-xs"
                      >
                        <p className="font-semibold text-white truncate">{ev.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#A1A1AA]">
                          {formatDateTime(ev.start_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
                    Latest Registrations
                  </p>
                  {registrations.length === 0 ? (
                    <p className="text-xs text-[#A1A1AA]">No registrations recorded yet.</p>
                  ) : (
                    registrations.slice(0, 4).map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/90 bg-[#09090B] p-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {reg.participant_name}
                          </p>
                          <p className="truncate text-[11px] text-[#A1A1AA]">
                            {reg.event?.title || "Event"}
                          </p>
                        </div>
                        <StatusBadge status={reg.status} />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Registrations & Payments Table */}
          <section className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <CardTitle className="text-lg">
                  Attendee Registrations & Payments
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Select
                    value={selectedEventFilter}
                    onChange={(e) => setSelectedEventFilter(e.target.value)}
                    className="w-56"
                    aria-label="Filter registrations by event"
                  >
                    <option value="all">All Events</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleExportCsv}
                    disabled={filteredRegistrations.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {filteredRegistrations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#A1A1AA]">
                    No registrations match this selection yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[#A1A1AA]">
                          <th className="py-3 pr-4 font-medium">Attendee</th>
                          <th className="py-3 pr-4 font-medium">Event</th>
                          <th className="py-3 pr-4 font-medium">Ticket ID</th>
                          <th className="py-3 pr-4 font-medium">Status</th>
                          <th className="py-3 pr-4 font-medium">Payment</th>
                          <th className="py-3 pr-4 font-medium">Amount</th>
                          <th className="py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredRegistrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 pr-4">
                              <p className="font-semibold text-white">
                                {reg.participant_name}
                              </p>
                              <p className="text-[#A1A1AA]">{reg.participant_email}</p>
                            </td>
                            <td className="py-3 pr-4 text-zinc-300">
                              {reg.event?.title || "—"}
                            </td>
                            <td className="py-3 pr-4 font-mono text-[#A78BFA]">
                              {reg.ticket_id || "—"}
                            </td>
                            <td className="py-3 pr-4">
                              <StatusBadge status={reg.status} />
                            </td>
                            <td className="py-3 pr-4">
                              <StatusBadge status={reg.payment_status} />
                            </td>
                            <td className="py-3 pr-4 font-mono text-white">
                              {formatCurrency(reg.payable_amount)}
                            </td>
                            <td className="py-3 text-right">
                              {reg.payment?.id &&
                              ["SUCCESS", "PARTIALLY_REFUNDED"].includes(
                                reg.payment.status,
                              ) ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setRefundTarget(reg);
                                    setRefundAmount(String(reg.payment!.amount));
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Refund
                                </Button>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* Refund Dialog */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={() => setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Cashfree Refund</DialogTitle>
            <DialogDescription>
              Initiate a full or partial refund for {refundTarget?.participant_name}. Full
              refunds automatically revoke ticket admission.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="refAmt">Refund Amount (INR)</Label>
              <Input
                id="refAmt"
                type="number"
                step="0.01"
                min="1"
                max={refundTarget?.payment?.amount || 0}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refReason">Refund Reason</Label>
              <Input
                id="refReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Event cancelled / duplicate charge"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRefundTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={refunding}>
                {refunding ? "Processing Refund..." : "Confirm Refund"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

