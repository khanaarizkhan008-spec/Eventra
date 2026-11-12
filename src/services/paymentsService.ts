import { load, type Cashfree } from "@cashfreepayments/cashfree-js";
import { invokeEdgeFunction } from "./supabase";

let cachedCashfree: Cashfree | null = null;

export function getCashfreeMode(): "sandbox" | "production" {
  const envMode = (import.meta.env.VITE_CASHFREE_ENV as string | undefined)?.toLowerCase();
  return envMode === "production" ? "production" : "sandbox";
}

export async function launchCashfreeCheckout(paymentSessionId: string): Promise<void> {
  if (!cachedCashfree) {
    cachedCashfree = await load({
      mode: getCashfreeMode(),
    });
  }

  if (!cachedCashfree) {
    throw new Error("Cashfree Payments SDK failed to initialize.");
  }

  const result = await cachedCashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  });

  if (result?.error) {
    throw new Error(result.error.message || "Cashfree checkout failed to start.");
  }
}

export interface VerifyPaymentResponse {
  ok: boolean;
  status: "SUCCESS" | "PENDING" | "FAILED";
  registrationStatus: string;
  orderId: string;
  registrationId: string;
  ticketId?: string;
  amount?: number;
  cashfreeOrderStatus?: string;
  cashfreePaymentStatus?: string | null;
  message?: string;
}

export async function verifyPaymentOrder(orderId: string): Promise<VerifyPaymentResponse> {
  return invokeEdgeFunction<VerifyPaymentResponse>("verify-payment", { orderId });
}

