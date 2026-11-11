import { invokeEdgeFunction, isSupabaseConfigured, supabase } from "./supabase";
import type { RegistrationRecord } from "@/types/eventra";

export interface RegistrationFormInput {
  eventId: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  collegeName?: string;
  department?: string;
  yearOfStudy?: string;
}

export async function registerFreeEvent(input: RegistrationFormInput): Promise<{
  ok: boolean;
  registrationId: string;
  ticketId: string;
  eventTitle: string;
}> {
  return invokeEdgeFunction("register-free-event", { ...input });
}

export async function createPaidRegistrationOrder(
  input: RegistrationFormInput,
): Promise<{
  ok: boolean;
  registrationId: string;
  orderId: string;
  paymentSessionId: string;
  payableAmount: number;
  baseFee: number;
  gatewayFee: number;
  taxAmount: number;
  currency: string;
  expiresAt: string;
}> {
  return invokeEdgeFunction("create-payment-order", {
    ...input,
    returnBaseUrl: window.location.origin,
  });
}

export async function fetchMyRegistrations(
  userId: string,
): Promise<RegistrationRecord[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("registrations")
    .select(
      `
      *,
      event:events(id, title, slug, banner_url, category, college_name, venue, start_at, end_at, status, registration_fee),
      payment:payments(id, provider_order_id, provider_payment_id, amount, currency, status, payment_method, created_at)
    `,
    )
    .eq("participant_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<RegistrationRecord & { payment: unknown }>).map((row) => ({
    ...row,
    payment: Array.isArray(row.payment) ? row.payment[0] : row.payment,
  })) as RegistrationRecord[];
}

