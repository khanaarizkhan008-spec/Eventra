import type { EventRecord, FeeBreakdown, PlatformSettings } from "@/types/eventra";

export function formatCurrency(amount: number, currency = "INR"): string {
  if (amount <= 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "event"}-${suffix}`;
}

export function calculateFeeBreakdown(
  baseFee: number,
  settings?: Pick<
    PlatformSettings,
    "pass_gateway_fee_to_customer" | "gateway_fee_percentage" | "gst_on_fee_percentage"
  > | null,
): FeeBreakdown {
  if (baseFee <= 0) {
    return { baseFee: 0, gatewayFee: 0, taxAmount: 0, payableAmount: 0 };
  }

  const roundedBase = Number(baseFee.toFixed(2));
  if (!settings?.pass_gateway_fee_to_customer) {
    return {
      baseFee: roundedBase,
      gatewayFee: 0,
      taxAmount: 0,
      payableAmount: roundedBase,
    };
  }

  const gatewayFee = Number(
    (roundedBase * (settings.gateway_fee_percentage / 100)).toFixed(2),
  );
  const taxAmount = Number(
    (gatewayFee * (settings.gst_on_fee_percentage / 100)).toFixed(2),
  );
  const payableAmount = Number((roundedBase + gatewayFee + taxAmount).toFixed(2));

  return {
    baseFee: roundedBase,
    gatewayFee,
    taxAmount,
    payableAmount,
  };
}

export interface RegistrationAvailability {
  canRegister: boolean;
  reason: string | null;
  availableSeats: number;
}

export function getRegistrationAvailability(
  event: Pick<
    EventRecord,
    "status" | "registration_deadline" | "end_at" | "capacity" | "confirmed_count" | "live_stats"
  >,
  now = new Date(),
): RegistrationAvailability {
  const confirmed = event.live_stats?.confirmed_registrations ?? event.confirmed_count ?? 0;
  const availableSeats = Math.max(0, event.capacity - confirmed);

  if (event.status === "cancelled") {
    return { canRegister: false, reason: "This event has been cancelled.", availableSeats };
  }
  if (event.status !== "published") {
    return { canRegister: false, reason: "Registrations are currently closed.", availableSeats };
  }
  if (new Date(event.end_at) <= now) {
    return { canRegister: false, reason: "This event has already ended.", availableSeats };
  }
  if (new Date(event.registration_deadline) < now) {
    return { canRegister: false, reason: "Registration deadline has passed.", availableSeats };
  }
  if (availableSeats <= 0) {
    return { canRegister: false, reason: "All seats are sold out.", availableSeats: 0 };
  }

  return { canRegister: true, reason: null, availableSeats };
}

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong.",
): string {
  if (typeof err === "object" && err !== null) {
    const record = err as { code?: unknown; message?: unknown; hint?: unknown };
    const code = typeof record.code === "string" ? record.code : "";
    const message = typeof record.message === "string" ? record.message : "";
    const hint = typeof record.hint === "string" ? record.hint : "";

    if (code === "PGRST205" || message.includes("Could not find the table")) {
      return "Supabase database tables are not created yet (PGRST205). Run the 4 SQL migrations in supabase/migrations/ on your Supabase project.";
    }
    if (message) {
      return hint ? `${message} (${hint})` : message;
    }
  }
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

