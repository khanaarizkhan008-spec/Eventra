import { useCallback, useEffect, useRef, useState } from "react";
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
  getCashfreeMode,
  verifyPaymentOrder,
  type VerifyPaymentResponse,
} from "@/services/paymentsService";
import { formatCurrency, getErrorMessage } from "@/utils/format";

const MAX_AUTO_POLLS = 30;
const AUTO_POLL_INTERVAL_MS = 4000;
const REGISTRATION_TABLE: Array<"registrations"> = ["registrations"];
const ALL_PAYMENT_TABLES: Array<"registrations" | "payments"> = [
  "registrations",
  "payments",
];

export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const registrationId = searchParams.get("registration_id") || "";

  const [result, setResult] = useState<VerifyPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const inFlightRef = useRef(false);

  const checkStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orderId) {
        setError("Missing Cashfree order reference in URL.");
        setLoading(false);
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await verifyPaymentOrder(orderId);
        setResult(res);
      } catch (err) {
        if (!options?.silent) {
          setError(
            getErrorMessage(err, "Unable to verify payment status from Cashfree."),
          );
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    setPollCount(0);
    void checkStatus();
  }, [checkStatus]);

  // Poll cleanly in the background while Cashfree status is PENDING
  useEffect(() => {
    if (result?.status !== "PENDING" || pollCount >= MAX_AUTO_POLLS) {
      return;
    }

    const timer = window.setInterval(() => {
      setPollCount((count) => count + 1);
      void checkStatus({ silent: true });
    }, AUTO_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [checkStatus, pollCount, result?.status]);

  // Listen for webhook completion on this registration without forcing re-subscriptions
  useRealtimeSubscription(
    `pay-status-${registrationId || orderId}`,
    registrationId ? REGISTRATION_TABLE : ALL_PAYMENT_TABLES,
    () => {
      if (result?.status !== "SUCCESS") {
        void checkStatus({ silent: true });
      }
    },
    registrationId ? { column: "id", value: registrationId } : undefined,
  );

  const isSandbox = getCashfreeMode() === "sandbox";

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
              <Button variant="secondary" onClick={() => void checkStatus()}>
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
                  "Cashfree is awaiting bank/UPI confirmation. This page updates automatically when confirmed."}
              </p>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2.5 text-left text-xs text-[#A1A1AA]">
                <div>
                  Order:{" "}
                  <span className="font-mono text-white">{result.orderId || orderId}</span>
                </div>
                {result.cashfreePaymentStatus && (
                  <div className="mt-1">
                    Cashfree status:{" "}
                    <span className="font-mono text-amber-300">
                      {result.cashfreePaymentStatus}
                    </span>
                  </div>
                )}
                {isSandbox && (
                  <p className="mt-2 text-[11px] leading-relaxed text-[#A1A1AA]">
                    Sandbox tip: If you opened UPI QR or selected{" "}
                    <span className="text-white">Pending</span> in Cashfree Sandbox, that
                    test payment stays <span className="font-mono text-amber-300">PENDING</span>{" "}
                    indefinitely. Use{" "}
                    <span className="text-white">Simulate → Success</span>, Test Card, or{" "}
                    <span className="font-mono text-white">testsuccess@gocash</span> in a new
                    checkout for instant confirmation.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="secondary"
                  disabled={refreshing}
                  onClick={() => void checkStatus({ silent: true })}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Checking Cashfree..." : "Re-check Status"}
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <XCircle className="mx-auto h-12 w-12 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Payment Incomplete</h2>
              <p className="text-sm text-[#A1A1AA]">
                {result?.message || "Payment was cancelled, expired, or failed."}
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => void checkStatus()}>
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

