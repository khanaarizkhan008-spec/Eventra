import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Ticket,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeSubscription } from "@/hooks/useRealtimeEvents";
import {
  verifyPaymentOrder,
  type VerifyPaymentResponse,
} from "@/services/paymentsService";
import { formatCurrency, getErrorMessage } from "@/utils/format";

export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const registrationId = searchParams.get("registration_id") || "";

  const [result, setResult] = useState<VerifyPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setError("Missing Cashfree order reference in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyPaymentOrder(orderId);
      setResult(res);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to verify payment status from Cashfree."),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for webhook completion in real time
  useRealtimeSubscription(
    `pay-status-${registrationId || orderId}`,
    ["registrations", "payments"],
    () => {
      if (result?.status !== "SUCCESS") {
        checkStatus();
      }
    },
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#A78BFA]">
            Server-Side Payment Verification
          </p>
          <CardTitle className="mt-2 text-2xl">Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {loading ? (
            <div className="space-y-3 py-8">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#A78BFA]" />
              <p className="text-sm text-[#A1A1AA]">
                Verifying order <span className="font-mono text-white">{orderId}</span>{" "}
                directly with Cashfree...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4 py-4">
              <XCircle className="mx-auto h-12 w-12 text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
              <Button variant="secondary" onClick={checkStatus}>
                <RefreshCw className="h-4 w-4" />
                Retry Verification
              </Button>
            </div>
          ) : result?.status === "SUCCESS" ? (
            <div className="space-y-4 py-2">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Payment Verified & Confirmed</h2>
              <p className="text-sm text-[#A1A1AA]">
                Order <span className="font-mono text-white">{result.orderId}</span>
                {result.amount ? ` (${formatCurrency(result.amount)})` : ""} has been
                verified. Your cryptographic QR ticket is ready.
              </p>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
                {result.ticketId && (
                  <Button asChild>
                    <Link to={`/tickets/${result.ticketId}`}>
                      <Ticket className="h-4 w-4" />
                      Open QR Ticket
                    </Link>
                  </Button>
                )}
                <Button variant="secondary" asChild>
                  <Link to="/my-registrations">My Registrations</Link>
                </Button>
              </div>
            </div>
          ) : result?.status === "PENDING" ? (
            <div className="space-y-4 py-2">
              <Clock className="mx-auto h-12 w-12 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Payment Processing</h2>
              <p className="text-sm text-[#A1A1AA]">
                {result.message ||
                  "Cashfree is awaiting bank/UPI confirmation. This page updates automatically when the webhook arrives."}
              </p>
              <Button variant="secondary" onClick={checkStatus}>
                <RefreshCw className="h-4 w-4" />
                Re-check Status
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <XCircle className="mx-auto h-12 w-12 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Payment Incomplete</h2>
              <p className="text-sm text-[#A1A1AA]">
                {result?.message || "Payment was cancelled, expired, or failed."}
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={checkStatus}>
                  <RefreshCw className="h-4 w-4" />
                  Verify Again
                </Button>
                <Button asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

