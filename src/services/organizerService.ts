import { invokeEdgeFunction, isSupabaseConfigured, supabase } from "./supabase";
import type {
  EventLiveStats,
  EventRecord,
  PaymentRecord,
  RegistrationRecord,
} from "@/types/eventra";
import { slugifyTitle } from "@/utils/format";

export async function fetchOrganizerEvents(
  organizerId: string,
): Promise<EventRecord[]> {
  if (!isSupabaseConfigured) return [];

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const list = (events ?? []) as EventRecord[];
  if (list.length === 0) return [];

  const { data: stats } = await supabase
    .from("event_live_stats")
    .select("*")
    .in(
      "event_id",
      list.map((e) => e.id),
    );

  const statsMap = new Map(((stats ?? []) as EventLiveStats[]).map((s) => [s.event_id, s]));
  return list.map((ev) => ({
    ...ev,
    live_stats: statsMap.get(ev.id),
  }));
}

export async function fetchOrganizerRegistrations(
  eventIds: string[],
): Promise<RegistrationRecord[]> {
  if (!isSupabaseConfigured || eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("registrations")
    .select(
      `
      *,
      event:events(id, title, slug, start_at),
      payment:payments(*)
    `,
    )
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<RegistrationRecord & { payment: unknown }>).map((row) => ({
    ...row,
    payment: Array.isArray(row.payment)
      ? (row.payment[0] as PaymentRecord | undefined)
      : (row.payment as PaymentRecord | undefined),
  })) as RegistrationRecord[];
}

export interface EventMutationPayload {
  title: string;
  description: string;
  banner_url: string | null;
  category: EventRecord["category"];
  college_name: string;
  venue: string;
  maps_url: string | null;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  registration_fee: number;
  capacity: number;
  allow_multiple_registrations: boolean;
  eligibility: string | null;
  rules: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: "draft" | "pending_approval" | "published" | "unpublished";
}

export async function createEventRecord(
  organizerId: string,
  payload: EventMutationPayload,
): Promise<EventRecord> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...payload,
      organizer_id: organizerId,
      slug: slugifyTitle(payload.title),
      currency: "INR",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as EventRecord;
}

export async function updateEventRecord(
  eventId: string,
  payload: Partial<EventMutationPayload>,
): Promise<EventRecord> {
  const { data, error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  return data as EventRecord;
}

export async function deleteDraftEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("status", "draft");

  if (error) throw error;
}

export async function cancelEventAsOrganizer(eventId: string): Promise<{
  ok: boolean;
  notifiedCount: number;
}> {
  return invokeEdgeFunction("organizer-actions", {
    action: "cancel_event",
    eventId,
  });
}

export async function requestOrganizerAccess(organizationName: string): Promise<void> {
  await invokeEdgeFunction("organizer-actions", {
    action: "request_organizer_access",
    organizationName,
  });
}

export async function initiateRefund(params: {
  paymentId: string;
  amount?: number;
  reason: string;
}): Promise<{
  ok: boolean;
  refundId: string;
  refundStatus: string;
  paymentStatus: string;
}> {
  return invokeEdgeFunction("initiate-refund", params);
}

export async function sendEventReminders(eventId: string): Promise<{
  ok: boolean;
  sentCount: number;
}> {
  return invokeEdgeFunction("organizer-actions", {
    action: "send_event_reminders",
    eventId,
  });
}

