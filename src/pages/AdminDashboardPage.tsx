import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Ban,
  Calendar,
  Check,
  Clock,
  IndianRupee,
  RotateCcw,
  Save,
  ShieldCheck,
  Ticket,
  Users,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeEvents";
import {
  adminApproveOrganizer,
  adminModerateEvent,
  adminRejectOrganizer,
  adminResolveReport,
  adminRunReservationExpiry,
  adminSetUserRole,
  adminToggleSuspendUser,
  adminUpdatePlatformSettings,
  fetchAdminOverviewData,
  type AdminOverviewData,
} from "@/services/adminService";
import { initiateRefund } from "@/services/organizerService";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/utils/format";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings local form state
  const [passFee, setPassFee] = useState(false);
  const [gwPct, setGwPct] = useState("2");
  const [gstPct, setGstPct] = useState("18");
  const [expiryMins, setExpiryMins] = useState("15");
  const [requireApproval, setRequireApproval] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Refund dialog state
  const [refundPayment, setRefundPayment] = useState<
    AdminOverviewData["payments"][number] | null
  >(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchAdminOverviewData();
      setData(res);
      if (res.settings) {
        setPassFee(res.settings.pass_gateway_fee_to_customer);
        setGwPct(String(res.settings.gateway_fee_percentage));
        setGstPct(String(res.settings.gst_on_fee_percentage));
        setExpiryMins(String(res.settings.reservation_expiry_minutes));
        setRequireApproval(res.settings.require_event_approval);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load admin console."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSubscription(
    "admin-live-console",
    ["events", "registrations", "payments", "tickets", "check_ins"],
    loadData,
  );

  const analytics = useMemo(() => {
    if (!data) return null;

    const totalUsers = data.profiles.length;
    const totalOrganizers = data.profiles.filter(
      (p) => p.role === "organizer" && p.organizer_status === "approved",
    ).length;
    const pendingOrganizers = data.profiles.filter(
      (p) => p.organizer_status === "pending",
    );
    const totalEvents = data.events.length;
    const totalRegistrations = data.registrations.length;
    const confirmedTickets = data.registrations.filter(
      (r) => r.status === "confirmed",
    ).length;

    const grossTransactionValue = data.payments
      .filter((p) => ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalRefunded = data.refunds
      .filter((r) => r.status === "SUCCESS" || r.status === "PENDING")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const freeCount = data.registrations.filter(
      (r) => r.status === "confirmed" && r.payment_status === "FREE",
    ).length;
    const paidCount = data.registrations.filter(
      (r) => r.status === "confirmed" && r.payment_status === "SUCCESS",
    ).length;

    const attemptedPayments = data.payments.length;
    const succeededPayments = data.payments.filter((p) =>
      ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status),
    ).length;
    const paymentSuccessRate =
      attemptedPayments > 0
        ? Math.round((succeededPayments / attemptedPayments) * 100)
        : 0;

    const attendanceRate =
      confirmedTickets > 0
        ? Math.round((data.checkInsCount / confirmedTickets) * 100)
        : 0;

    const eventWiseData = data.events.slice(0, 8).map((ev) => ({
      name: ev.title.length > 16 ? `${ev.title.slice(0, 16)}…` : ev.title,
      confirmed: ev.live_stats?.confirmed_registrations ?? ev.confirmed_count,
      revenue:
        (ev.live_stats?.confirmed_registrations ?? ev.confirmed_count) *
        Number(ev.registration_fee || 0),
    }));

    const dailyMap = new Map<string, number>();
    for (const reg of data.registrations) {
      const dateKey = new Date(reg.registered_at || reg.created_at)
        .toISOString()
        .slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);
    }
    const registrationsOverTime = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        registrations: count,
      }));

    const revenueByEvent = [...eventWiseData]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const recentActivity = [
      ...data.registrations.slice(0, 5).map((r) => ({
        id: `reg-${r.id}`,
        title: `${r.participant_name} registered`,
        subtitle: r.event?.title || "Event registration",
        timestamp: r.registered_at || r.created_at,
        status: r.status,
      })),
      ...data.payments.slice(0, 5).map((p) => ({
        id: `pay-${p.id}`,
        title: `Payment ${formatCurrency(p.amount, p.currency)} (${p.status})`,
        subtitle: p.registration?.participant_name || p.provider_order_id,
        timestamp: p.created_at,
        status: p.status,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    return {
      totalUsers,
      totalOrganizers,
      pendingOrganizers,
      totalEvents,
      totalRegistrations,
      confirmedTickets,
      grossTransactionValue,
      totalRefunded,
      freeCount,
      paidCount,
      paymentSuccessRate,
      attendanceRate,
      eventWiseData,
      registrationsOverTime,
      revenueByEvent,
      recentActivity,
      splitData: [
        { name: "Free", value: freeCount, color: "#A78BFA" },
        { name: "Paid", value: paidCount, color: "#10B981" },
      ],
    };
  }, [data]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await adminUpdatePlatformSettings({
        passGatewayFeeToCustomer: passFee,
        gatewayFeePercentage: Number(gwPct),
        gstOnFeePercentage: Number(gstPct),
        reservationExpiryMinutes: Number(expiryMins),
        requireEventApproval: requireApproval,
      });
      toast({ title: "Platform Settings Updated", variant: "success" });
      loadData();
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getErrorMessage(err, "Could not save settings."),
        variant: "error",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunExpirySweep = async () => {
    try {
      const res = await adminRunReservationExpiry();
      toast({
        title: "Reservation Sweep Complete",
        description: `Released ${res.expiredCount} expired unpaid holds.`,
        variant: "success",
      });
      loadData();
    } catch (err) {
      toast({
        title: "Sweep Failed",
        description: getErrorMessage(err, "Failed to run sweep."),
        variant: "error",
      });
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment || !refundReason.trim()) return;
    setRefunding(true);
    try {
      await initiateRefund({
        paymentId: refundPayment.id,
        amount: refundAmount ? Number(refundAmount) : undefined,
        reason: refundReason.trim(),
      });
      toast({ title: "Refund Initiated", variant: "success" });
      setRefundPayment(null);
      setRefundAmount("");
      setRefundReason("");
      loadData();
    } catch (err) {
      toast({
        title: "Refund Failed",
        description: getErrorMessage(err, "Unable to issue refund."),
        variant: "error",
      });
    } finally {
      setRefunding(false);
    }
  };

  const handleModerateEvent = async (
    params: { eventId: string; status?: "published" | "rejected" | "cancelled"; isFeatured?: boolean },
    successTitle: string,
  ) => {
    try {
      await adminModerateEvent(params);
      toast({ title: successTitle, variant: "success" });
      loadData();
    } catch (err) {
      toast({
        title: "Moderation Failed",
        description: getErrorMessage(err, "Unable to update event status."),
        variant: "error",
      });
    }
  };

  const handleOrganizerDecision = async (targetUserId: string, approve: boolean) => {
    try {
      if (approve) {
        await adminApproveOrganizer(targetUserId);
      } else {
        await adminRejectOrganizer(targetUserId);
      }
      toast({
        title: approve ? "Organizer Approved" : "Organizer Rejected",
        variant: "success",
      });
      loadData();
    } catch (err) {
      toast({
        title: "Organizer Update Failed",
        description: getErrorMessage(err, "Unable to update organizer status."),
        variant: "error",
      });
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: "resolved" | "dismissed",
  ) => {
    try {
      await adminResolveReport(reportId, status);
      toast({
        title: status === "resolved" ? "Report Resolved" : "Report Dismissed",
        variant: "success",
      });
      loadData();
    } catch (err) {
      toast({
        title: "Report Update Failed",
        description: getErrorMessage(err, "Unable to update report."),
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Console" subtitle="Platform governance & analytics.">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !data || !analytics) {
    return (
      <DashboardLayout title="Admin Console" subtitle="Platform governance & analytics.">
        <ErrorState message={error || "Failed to load data."} onRetry={loadData} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Platform Admin Console"
      subtitle="Monitor platform transactions, approve organizers, moderate events, and audit Cashfree payments."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={handleRunExpirySweep}>
            <Clock className="h-4 w-4 text-[#A78BFA]" />
            Expire Unpaid Holds
          </Button>
          <Button size="sm" asChild>
            <Link to="/organizer/events/new">Create Event</Link>
          </Button>
        </>
      }
    >
      {/* Top Platform KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Users & Organizers</span>
              <Users className="h-4 w-4 text-[#A78BFA]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {analytics.totalUsers}
            </p>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              {analytics.totalOrganizers} approved organizers ({analytics.pendingOrganizers.length} pending)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Events & Tickets</span>
              <Ticket className="h-4 w-4 text-[#A78BFA]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {analytics.totalEvents} / {analytics.confirmedTickets}
            </p>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              {analytics.totalRegistrations} total registrations • {analytics.attendanceRate}% checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Transaction Value (Gross)</span>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {formatCurrency(analytics.grossTransactionValue)}
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              {analytics.paymentSuccessRate}% payment success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Total Refunded</span>
              <RotateCcw className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {formatCurrency(analytics.totalRefunded)}
            </p>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Net gross: {formatCurrency(analytics.grossTransactionValue - analytics.totalRefunded)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">Events ({data.events.length})</TabsTrigger>
          <TabsTrigger value="users">
            Users & Approvals ({analytics.pendingOrganizers.length})
          </TabsTrigger>
          <TabsTrigger value="payments">Payments ({data.payments.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({data.reports.length})</TabsTrigger>
          <TabsTrigger value="settings">Fee & Expiry Policy</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">
                  Event-Wise Confirmed Registrations
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.eventWiseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#A1A1AA" fontSize={11} />
                    <YAxis stroke="#A1A1AA" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141419",
                        borderColor: "#27272a",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="confirmed" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Free vs Paid Tickets</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.splitData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={4}
                    >
                      {analytics.splitData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141419",
                        borderColor: "#27272a",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Registrations Over Time
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {analytics.registrationsOverTime.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-xs text-[#A1A1AA]">
                    No registration activity recorded yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.registrationsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11} />
                      <YAxis stroke="#A1A1AA" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141419",
                          borderColor: "#27272a",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="registrations"
                        stroke="#A78BFA"
                        fill="#8B5CF6"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Revenue by Event (INR)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {analytics.revenueByEvent.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-xs text-[#A1A1AA]">
                    No event revenue recorded yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.revenueByEvent}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#A1A1AA" fontSize={11} />
                      <YAxis stroke="#A1A1AA" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141419",
                          borderColor: "#27272a",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-[#A78BFA]" />
                Recent Platform Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentActivity.length === 0 ? (
                <p className="py-4 text-xs text-[#A1A1AA]">
                  No recent registrations or payments yet.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {analytics.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-[#A1A1AA]">{item.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        <span className="font-mono text-[11px] text-[#A1A1AA]">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Moderation Tab */}
        <TabsContent value="events" className="mt-6">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[#A1A1AA]">
                    <th className="py-3 pr-4">Event</th>
                    <th className="py-3 pr-4">Organizer</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Confirmed / Cap</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {data.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-3 pr-4">
                        <Link
                          to={`/events/${ev.slug}`}
                          className="font-semibold text-white hover:text-[#A78BFA]"
                        >
                          {ev.title}
                        </Link>
                        <p className="text-[#A1A1AA]">{ev.category}</p>
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {ev.organizer?.organization_name || ev.organizer?.full_name || "—"}
                      </td>
                      <td className="py-3 pr-4 text-[#A1A1AA]">
                        {formatDateTime(ev.start_at)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-white">
                        {ev.live_stats?.confirmed_registrations ?? ev.confirmed_count} /{" "}
                        {ev.capacity}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {ev.status === "pending_approval" && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  handleModerateEvent(
                                    { eventId: ev.id, status: "published" },
                                    "Event Approved & Published",
                                  )
                                }
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleModerateEvent(
                                    { eventId: ev.id, status: "rejected" },
                                    "Event Rejected",
                                  )
                                }
                              >
                                <X className="h-3.5 w-3.5 text-rose-400" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleModerateEvent(
                                { eventId: ev.id, isFeatured: !ev.is_featured },
                                ev.is_featured ? "Removed from Featured" : "Marked as Featured",
                              )
                            }
                          >
                            {ev.is_featured ? "Unfeature" : "Feature"}
                          </Button>
                          {ev.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-400"
                              onClick={() =>
                                handleModerateEvent(
                                  { eventId: ev.id, status: "cancelled" },
                                  "Event Cancelled",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Organizers Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[#A1A1AA]">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">College / Org</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Organizer Status</th>
                    <th className="py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {data.profiles.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-white">{u.full_name}</p>
                        <p className="text-[#A1A1AA]">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {u.organization_name || u.college || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          value={u.role}
                          disabled={u.id === user?.id}
                          onChange={(e) =>
                            adminSetUserRole(
                              u.id,
                              e.target.value as "participant" | "organizer" | "admin",
                            )
                              .then(() => {
                                toast({ title: "Role Updated", variant: "success" });
                                loadData();
                              })
                              .catch((err) =>
                                toast({
                                  title: "Role Update Failed",
                                  description: getErrorMessage(err, "Unable to change role."),
                                  variant: "error",
                                }),
                              )
                          }
                          className="h-8 w-32 text-xs"
                        >
                          <option value="participant">participant</option>
                          <option value="organizer">organizer</option>
                          <option value="admin">admin</option>
                        </Select>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={u.organizer_status} />
                          {u.is_suspended && <StatusBadge status="SUSPENDED" />}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {u.organizer_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOrganizerDecision(u.id, true)}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOrganizerDecision(u.id, false)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={u.id === user?.id}
                            className={u.is_suspended ? "text-emerald-400" : "text-rose-400"}
                            onClick={() =>
                              adminToggleSuspendUser(u.id, !u.is_suspended)
                                .then(() => {
                                  toast({
                                    title: u.is_suspended ? "User Unsuspended" : "User Suspended",
                                    variant: "success",
                                  });
                                  loadData();
                                })
                                .catch((err) =>
                                  toast({
                                    title: "Action Failed",
                                    description: getErrorMessage(err, "Unable to update suspension status."),
                                    variant: "error",
                                  }),
                                )
                            }
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {u.is_suspended ? "Unsuspend" : "Suspend"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Ledger Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[#A1A1AA]">
                    <th className="py-3 pr-4">Order / Payment ID</th>
                    <th className="py-3 pr-4">Event</th>
                    <th className="py-3 pr-4">Participant</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 text-right">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 font-mono">
                        <p className="text-white">{p.provider_order_id}</p>
                        {p.provider_payment_id && (
                          <p className="text-[11px] text-[#A1A1AA]">
                            CF: {p.provider_payment_id}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {p.registration?.event?.title || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-white">
                          {p.registration?.participant_name || "—"}
                        </p>
                        <p className="text-[#A1A1AA]">
                          {p.registration?.participant_email}
                        </p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-white">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 pr-4 text-[#A1A1AA]">
                        {formatDateTime(p.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        {["SUCCESS", "PARTIALLY_REFUNDED"].includes(p.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRefundPayment(p);
                              setRefundAmount(String(p.amount));
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Reports Tab */}
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {data.reports.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#A1A1AA]">
                  No event reports filed.
                </p>
              ) : (
                data.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-[#09090B] p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rep.status} />
                        <span className="text-sm font-semibold text-white">
                          {rep.event?.title || rep.event_id}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white">{rep.reason}</p>
                      {rep.details && (
                        <p className="mt-0.5 text-xs text-[#A1A1AA]">{rep.details}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolveReport(rep.id, "resolved")}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolveReport(rep.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee & Expiry Policy Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-[#A78BFA]" />
                Platform Fee Disclosure & Reservation Expiry Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="max-w-xl space-y-5">
                <div className="flex items-center gap-3">
                  <input
                    id="passFee"
                    type="checkbox"
                    checked={passFee}
                    onChange={(e) => setPassFee(e.target.checked)}
                    className="h-4 w-4 accent-[#8B5CF6]"
                  />
                  <Label htmlFor="passFee" className="text-white cursor-pointer">
                    Explicitly disclose and pass Cashfree gateway fee to participants at checkout
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gwPct">Gateway Fee (%)</Label>
                    <Input
                      id="gwPct"
                      type="number"
                      step="0.01"
                      value={gwPct}
                      onChange={(e) => setGwPct(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gstPct">GST on Fee (%)</Label>
                    <Input
                      id="gstPct"
                      type="number"
                      step="0.01"
                      value={gstPct}
                      onChange={(e) => setGstPct(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryMins">Reservation Expiry (min)</Label>
                    <Input
                      id="expiryMins"
                      type="number"
                      min="5"
                      max="120"
                      value={expiryMins}
                      onChange={(e) => setExpiryMins(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="reqApproval"
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="h-4 w-4 accent-[#8B5CF6]"
                  />
                  <Label htmlFor="reqApproval" className="text-white cursor-pointer">
                    Require administrator approval before organizer events publish live
                  </Label>
                </div>

                <Button type="submit" disabled={savingSettings}>
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Saving..." : "Save Policy"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={Boolean(refundPayment)} onOpenChange={() => setRefundPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Refund Execution</DialogTitle>
            <DialogDescription>
              Initiates a real Cashfree refund via backend Edge Function for order{" "}
              <span className="font-mono text-white">
                {refundPayment?.provider_order_id}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adminRefAmt">Refund Amount (INR)</Label>
              <Input
                id="adminRefAmt"
                type="number"
                step="0.01"
                min="1"
                max={refundPayment?.amount || 0}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminRefReason">Reason</Label>
              <Input
                id="adminRefReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRefundPayment(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={refunding}>
                {refunding ? "Processing..." : "Execute Refund"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

