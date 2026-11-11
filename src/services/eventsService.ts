import { isSupabaseConfigured, supabase } from "./supabase";
import type {
  EventCategory,
  EventLiveStats,
  EventRecord,
  PlatformSettings,
} from "@/types/eventra";

export interface EventQueryFilters {
  search?: string;
  category?: EventCategory | "All";
  price?: "all" | "free" | "paid";
  dateRange?: "all" | "today" | "week" | "month" | "upcoming";
  sort?: "newest" | "popular" | "fee_asc" | "fee_desc";
  featuredOnly?: boolean;
  limit?: number;
}

function attachStats(
  events: EventRecord[],
  statsList: EventLiveStats[],
): EventRecord[] {
  const statsMap = new Map(statsList.map((s) => [s.event_id, s]));
  return events.map((ev) => ({
    ...ev,
    live_stats: statsMap.get(ev.id) ?? {
      event_id: ev.id,
      capacity: ev.capacity,
      confirmed_registrations: ev.confirmed_count,
      pending_payments: 0,
      cancelled_registrations: 0,
      available_seats: Math.max(0, ev.capacity - ev.confirmed_count),
      reservable_seats: Math.max(0, ev.capacity - ev.confirmed_count),
    },
  }));
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  if (!isSupabaseConfigured) {
    return {
      id: 1,
      pass_gateway_fee_to_customer: false,
      gateway_fee_percentage: 2,
      gst_on_fee_percentage: 18,
      reservation_expiry_minutes: 15,
      require_event_approval: false,
      updated_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data as PlatformSettings;
}

export async function fetchPublishedEvents(
  filters: EventQueryFilters = {},
): Promise<EventRecord[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from("events")
    .select(
      "*, organizer:profiles!events_organizer_id_fkey(id, full_name, organization_name, email)",
    )
    .eq("status", "published");

  if (filters.category && filters.category !== "All") {
    query = query.eq("category", filters.category);
  }

  if (filters.price === "free") {
    query = query.eq("registration_fee", 0);
  } else if (filters.price === "paid") {
    query = query.gt("registration_fee", 0);
  }

  if (filters.featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const now = new Date();
  if (filters.dateRange === "upcoming") {
    query = query.gte("start_at", now.toISOString());
  } else if (filters.dateRange === "today") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .gte("start_at", startOfDay.toISOString())
      .lte("start_at", endOfDay.toISOString());
  } else if (filters.dateRange === "week") {
    const nextWeek = new Date(now.getTime() + 7 * 86400_000);
    query = query.gte("start_at", now.toISOString()).lte("start_at", nextWeek.toISOString());
  } else if (filters.dateRange === "month") {
    const nextMonth = new Date(now.getTime() + 30 * 86400_000);
    query = query.gte("start_at", now.toISOString()).lte("start_at", nextMonth.toISOString());
  }

  switch (filters.sort) {
    case "popular":
      query = query.order("confirmed_count", { ascending: false });
      break;
    case "fee_asc":
      query = query.order("registration_fee", { ascending: true });
      break;
    case "fee_desc":
      query = query.order("registration_fee", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data: events, error } = await query;
  if (error) throw error;

  let list = (events ?? []) as EventRecord[];

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.college_name.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        (ev.organizer?.full_name || "").toLowerCase().includes(q) ||
        (ev.organizer?.organization_name || "").toLowerCase().includes(q),
    );
  }

  if (list.length === 0) return [];

  const { data: stats } = await supabase
    .from("event_live_stats")
    .select("*")
    .in(
      "event_id",
      list.map((e) => e.id),
    );

  return attachStats(list, (stats ?? []) as EventLiveStats[]);
}

export async function fetchEventBySlugOrId(
  slugOrId: string,
): Promise<EventRecord | null> {
  if (!isSupabaseConfigured) return null;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId,
    );

  const { data, error } = await supabase
    .from("events")
    .select(
      "*, organizer:profiles!events_organizer_id_fkey(id, full_name, organization_name, email)",
    )
    .eq(isUuid ? "id" : "slug", slugOrId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const { data: stats } = await supabase
    .from("event_live_stats")
    .select("*")
    .eq("event_id", data.id)
    .single();

  return attachStats([data as EventRecord], stats ? [stats as EventLiveStats] : [])[0];
}

export async function uploadEventBanner(
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("event-banners")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("event-banners").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function reportEvent(params: {
  eventId: string;
  reporterId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const { error } = await supabase.from("event_reports").insert({
    event_id: params.eventId,
    reporter_id: params.reporterId,
    reason: params.reason,
    details: params.details || null,
  });
  if (error) throw error;
}

