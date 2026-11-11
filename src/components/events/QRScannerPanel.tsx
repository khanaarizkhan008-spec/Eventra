import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateAndCheckInTicket,
  type CheckInResult,
} from "@/services/ticketsService";
import { formatDateTime, getErrorMessage } from "@/utils/format";

export function QRScannerPanel({
  selectedEventId,
  onCheckedIn,
}: {
  selectedEventId?: string;
  onCheckedIn?: () => void;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTicketId, setManualTicketId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [history, setHistory] = useState<CheckInResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanLockRef = useRef<string | null>(null);

  const processTicketCheck = async (params: { qrToken?: string; ticketId?: string }) => {
    setVerifying(true);
    try {
      const result = await validateAndCheckInTicket({
        ...params,
        eventId: selectedEventId || undefined,
        scannerReference: cameraActive ? "camera-qr-scanner" : "manual-entry",
      });
      setLastResult(result);
      setHistory((prev) => [result, ...prev.slice(0, 14)]);
      if (result.ok) {
        onCheckedIn?.();
      }
    } catch (err) {
      setLastResult({
        ok: false,
        result: "INVALID_TICKET",
        message: getErrorMessage(err, "Failed to verify ticket."),
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;
    const regionId = "eventra-qr-reader";
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (cancelled || lastScanLockRef.current === decodedText) return;
          lastScanLockRef.current = decodedText;
          processTicketCheck({ qrToken: decodedText }).finally(() => {
            window.setTimeout(() => {
              lastScanLockRef.current = null;
            }, 2500);
          });
        },
        () => {
          // Ignore per-frame decode misses while scanning
        },
      )
      .catch((err) => {
        if (!cancelled) {
          setCameraError(
            getErrorMessage(err, "Camera access denied or unavailable on this device."),
          );
          setCameraActive(false);
        }
      });

    return () => {
      cancelled = true;
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [cameraActive, selectedEventId]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketId.trim()) return;
    await processTicketCheck({ ticketId: manualTicketId.trim() });
    setManualTicketId("");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Camera + Manual Input */}
      <div className="space-y-6 lg:col-span-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Camera QR Scanner</CardTitle>
            <Button
              size="sm"
              variant={cameraActive ? "destructive" : "default"}
              onClick={() => {
                setCameraError(null);
                setCameraActive((v) => !v);
              }}
            >
              {cameraActive ? (
                <>
                  <CameraOff className="h-4 w-4" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#09090B]">
              <div id="eventra-qr-reader" className="min-h-[260px] w-full" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="h-10 w-10 text-[#A78BFA]/70" />
                  <p className="mt-3 text-sm font-medium text-white">
                    Ready to scan attendee QR passes
                  </p>
                  <p className="mt-1 text-xs text-[#A1A1AA]">
                    Click Start Camera and point at the attendee's Eventra digital ticket.
                  </p>
                </div>
              )}
            </div>
            {cameraError && (
              <p className="mt-3 text-xs text-rose-400">{cameraError}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4 text-[#A78BFA]" />
              Manual Ticket ID Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label htmlFor="manualTicketId" className="sr-only">
                  Ticket ID
                </Label>
                <Input
                  id="manualTicketId"
                  placeholder="Enter Ticket ID (e.g. EVT-7F3A9C2B10)"
                  value={manualTicketId}
                  onChange={(e) => setManualTicketId(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>
              <Button type="submit" disabled={verifying || !manualTicketId.trim()}>
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating
                  </>
                ) : (
                  "Verify & Check In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Real-Time Validation Result & Scan Feed */}
      <div className="space-y-6 lg:col-span-6">
        {lastResult ? (
          <Card
            className={
              lastResult.result === "CHECKED_IN"
                ? "border-emerald-500/40 bg-emerald-950/20"
                : lastResult.result === "ALREADY_USED"
                  ? "border-amber-500/40 bg-amber-950/20"
                  : "border-rose-500/40 bg-rose-950/20"
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {lastResult.result === "CHECKED_IN" ? (
                  <CheckCircle2 className="h-9 w-9 shrink-0 text-emerald-400" />
                ) : lastResult.result === "ALREADY_USED" ? (
                  <AlertTriangle className="h-9 w-9 shrink-0 text-amber-400" />
                ) : (
                  <XCircle className="h-9 w-9 shrink-0 text-rose-400" />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {lastResult.result === "CHECKED_IN"
                        ? "Valid Ticket — Checked In"
                        : lastResult.result === "ALREADY_USED"
                          ? "Ticket Already Used"
                          : lastResult.result === "DENIED_UNPAID_OR_REFUNDED"
                            ? "Admission Denied"
                            : "Invalid Ticket"}
                    </h3>
                    {lastResult.ticket_id && (
                      <span className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-xs text-white">
                        {lastResult.ticket_id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-200">{lastResult.message}</p>

                  {lastResult.participant_name && (
                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-[#A1A1AA]">Attendee: </span>
                        <span className="font-semibold text-white">
                          {lastResult.participant_name}
                        </span>
                      </div>
                      {lastResult.event_title && (
                        <div>
                          <span className="text-[#A1A1AA]">Event: </span>
                          <span className="font-medium text-white">
                            {lastResult.event_title}
                          </span>
                        </div>
                      )}
                      {lastResult.college_name && (
                        <div>
                          <span className="text-[#A1A1AA]">College: </span>
                          <span className="text-white">{lastResult.college_name}</span>
                        </div>
                      )}
                      {lastResult.checked_in_at && (
                        <div>
                          <span className="text-[#A1A1AA]">Check-In Time: </span>
                          <span className="font-mono text-white">
                            {formatDateTime(lastResult.checked_in_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm font-medium text-white">No Scans Recorded Yet</p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Scan a QR pass or enter a Ticket ID to see real-time validation status here.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Validation Log</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-[#A1A1AA]">Waiting for first check-in...</p>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {history.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-medium text-white">
                        {item.participant_name || item.ticket_id || "Unknown Ticket"}
                      </p>
                      <p className="text-[#A1A1AA]">{item.message}</p>
                    </div>
                    <span
                      className={
                        item.result === "CHECKED_IN"
                          ? "font-mono font-semibold text-emerald-400"
                          : item.result === "ALREADY_USED"
                            ? "font-mono font-semibold text-amber-400"
                            : "font-mono font-semibold text-rose-400"
                      }
                    >
                      {item.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

