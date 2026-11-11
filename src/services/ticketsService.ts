import { invokeEdgeFunction, isSupabaseConfigured, supabase } from "./supabase";
import type { TicketRecord } from "@/types/eventra";

export async function fetchTicketById(ticketId: string): Promise<TicketRecord | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      event:events(*),
      registration:registrations(*)
    `,
    )
    .eq("id", ticketId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as TicketRecord;
}

export async function fetchSignedQrToken(ticketId: string): Promise<string> {
  const res = await invokeEdgeFunction<{ ok: boolean; qrToken: string }>("check-ticket", {
    action: "get_qr",
    ticketId,
  });
  return res.qrToken;
}

export interface CheckInResult {
  ok: boolean;
  result:
    | "CHECKED_IN"
    | "ALREADY_USED"
    | "INVALID_TICKET"
    | "WRONG_EVENT"
    | "DENIED_UNPAID_OR_REFUNDED"
    | "UNAUTHORIZED";
  message: string;
  ticket_id?: string;
  checked_in_at?: string;
  organizer_name?: string;
  participant_name?: string;
  participant_email?: string;
  college_name?: string;
  event_title?: string;
}

export async function validateAndCheckInTicket(params: {
  qrToken?: string;
  ticketId?: string;
  eventId?: string;
  scannerReference?: string;
}): Promise<CheckInResult> {
  return invokeEdgeFunction<CheckInResult>("check-ticket", {
    action: "check_in",
    ...params,
  });
}

