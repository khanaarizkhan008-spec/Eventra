import {
  EdgeFunctionError,
  invokeEdgeFunction,
  isSupabaseConfigured,
  supabase,
} from "./supabase";
import type {
  EventLiveStats,
  EventRecord,
  EventReportRecord,
  PaymentRecord,
  PlatformSettings,
  Profile,
  RefundRecord,
  RegistrationRecord,
} from "@/types/eventra";

export interface AdminOverviewData {
  profiles: Profile[];
  events: EventRecord[];
  registrations: RegistrationRecord[];
  payments: Array<
    PaymentRecord & {
      registration?: {
        id: string;
        participant_name: string;
        participant_email: string;
        event?: { id: string; title: string };
      };
    }
  >;
  refunds: RefundRecord[];
  reports: EventReportRecord[];
  settings: PlatformSettings;
  checkInsCount: number;
}

export async function fetchAdminOverviewData(): Promise<AdminOverviewData> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured.");
  }

  const [
    profilesRes,
    eventsRes,
    statsRes,
    regsRes,
    paymentsRes,
    refundsRes,
    reportsRes,
    settingsRes,
    checkInsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("*, organizer:profiles!events_organizer_id_fkey(id, full_name, organization_name, email)")
      .order("created_at", { ascending: false }),
    supabase.from("event_live_stats").select("*"),
    supabase
      .from("registrations")
      .select("*, event:events(id, title, slug)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("payments")
      .select(
        "*, registration:registrations(id, participant_name, participant_email, event:events(id, title))",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("refunds").select("*").order("created_at", { ascending: false }),
    supabase
      .from("event_reports")
      .select("*, event:events(id, title, slug)")
      .order("created_at", { ascending: false }),
    supabase.from("platform_settings").select("*").eq("id", 1).single(),
    supabase.from("check_ins").select("id", { count: "exact", head: true }),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const statsMap = new Map(
    ((statsRes.data ?? []) as EventLiveStats[]).map((s) => [s.event_id, s]),
  );

  const events = ((eventsRes.data ?? []) as EventRecord[]).map((ev) => ({
    ...ev,
    live_stats: statsMap.get(ev.id),
  }));

  return {
    profiles: (profilesRes.data ?? []) as Profile[],
    events,
    registrations: (regsRes.data ?? []) as RegistrationRecord[],
    payments: (paymentsRes.data ?? []) as AdminOverviewData["payments"],
    refunds: (refundsRes.data ?? []) as RefundRecord[],
    reports: (reportsRes.data ?? []) as EventReportRecord[],
    settings: settingsRes.data as PlatformSettings,
    checkInsCount: checkInsRes.count ?? 0,
  };
}

async function runAdminActionWithFallback(
  edgeBody: Record<string, unknown>,
  rlsFallback: () => Promise<void>,
): Promise<void> {
  try {
    await invokeEdgeFunction("admin-actions", edgeBody);
  } catch (err) {
    const isUndeployedFunction =
      (err instanceof EdgeFunctionError && err.status === 404) ||
      err instanceof TypeError;
    if (!isUndeployedFunction) {
      throw err;
    }
    await rlsFallback();
  }
}

export async function adminApproveOrganizer(targetUserId: string): Promise<void> {
  await runAdminActionWithFallback(
    { action: "approve_organizer", targetUserId },
    async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "organizer", organizer_status: "approved", is_suspended: false })
        .eq("id", targetUserId);
      if (error) throw error;
    },
  );
}

export async function adminRejectOrganizer(targetUserId: string): Promise<void> {
  await runAdminActionWithFallback(
    { action: "reject_organizer", targetUserId },
    async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ organizer_status: "rejected" })
        .eq("id", targetUserId);
      if (error) throw error;
    },
  );
}

export async function adminSetUserRole(
  targetUserId: string,
  role: "participant" | "organizer" | "admin",
): Promise<void> {
  await runAdminActionWithFallback(
    { action: "set_user_role", targetUserId, role },
    async () => {
      const updates: Record<string, unknown> = { role };
      if (role === "organizer") updates.organizer_status = "approved";
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", targetUserId);
      if (error) throw error;
    },
  );
}

export async function adminToggleSuspendUser(
  targetUserId: string,
  suspend: boolean,
): Promise<void> {
  await runAdminActionWithFallback(
    { action: "toggle_suspend_user", targetUserId, suspend },
    async () => {
      const { error } = await supabase
        .from("profiles")
        .update(
          suspend
            ? { is_suspended: true, organizer_status: "suspended" }
            : { is_suspended: false },
        )
        .eq("id", targetUserId);
      if (error) throw error;
    },
  );
}

export async function adminModerateEvent(params: {
  eventId: string;
  status?: EventRecord["status"];
  isFeatured?: boolean;
}): Promise<void> {
  await runAdminActionWithFallback(
    { action: "moderate_event", ...params },
    async () => {
      const updates: Record<string, unknown> = {};
      if (params.status) updates.status = params.status;
      if (typeof params.isFeatured === "boolean") updates.is_featured = params.isFeatured;
      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", params.eventId);
      if (error) throw error;
    },
  );
}

export async function adminUpdatePlatformSettings(params: {
  passGatewayFeeToCustomer: boolean;
  gatewayFeePercentage: number;
  gstOnFeePercentage: number;
  reservationExpiryMinutes: number;
  requireEventApproval: boolean;
}): Promise<void> {
  await runAdminActionWithFallback(
    { action: "update_platform_settings", ...params },
    async () => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          pass_gateway_fee_to_customer: Boolean(params.passGatewayFeeToCustomer),
          gateway_fee_percentage: Number(params.gatewayFeePercentage),
          gst_on_fee_percentage: Number(params.gstOnFeePercentage),
          reservation_expiry_minutes: Number(params.reservationExpiryMinutes),
          require_event_approval: Boolean(params.requireEventApproval),
        })
        .eq("id", 1);
      if (error) throw error;
    },
  );
}

export async function adminResolveReport(
  reportId: string,
  status: "reviewed" | "resolved" | "dismissed",
): Promise<void> {
  await runAdminActionWithFallback(
    { action: "resolve_report", reportId, status },
    async () => {
      const { error } = await supabase
        .from("event_reports")
        .update({ status })
        .eq("id", reportId);
      if (error) throw error;
    },
  );
}

export async function adminRunReservationExpiry(): Promise<{ expiredCount: number }> {
  try {
    return await invokeEdgeFunction("expire-reservations", {});
  } catch (err) {
    if ((err instanceof EdgeFunctionError && err.status === 404) || err instanceof TypeError) {
      throw new Error(
        "Deploy the 'expire-reservations' Supabase Edge Function to run manual reservation expiry sweeps.",
      );
    }
    throw err;
  }
}

