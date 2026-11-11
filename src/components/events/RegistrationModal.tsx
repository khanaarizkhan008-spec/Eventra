import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Loader2, ShieldCheck, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { launchCashfreeCheckout } from "@/services/paymentsService";
import {
  createPaidRegistrationOrder,
  registerFreeEvent,
} from "@/services/registrationsService";
import type { EventRecord, PlatformSettings } from "@/types/eventra";
import {
  calculateFeeBreakdown,
  formatCurrency,
  getErrorMessage,
} from "@/utils/format";

const registrationSchema = z.object({
  participantName: z.string().min(2, "Full name must be at least 2 characters"),
  participantEmail: z.string().email("Enter a valid email address"),
  participantPhone: z
    .string()
    .regex(/^[0-9+\-\s()]{10,15}$/, "Enter a valid 10-digit phone number"),
  collegeName: z.string().min(2, "College or institution name is required"),
  department: z.string().optional(),
  yearOfStudy: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function RegistrationModal({
  open,
  onOpenChange,
  event,
  settings,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRecord;
  settings: PlatformSettings | null;
  onRegistered?: () => void;
}) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const fee = calculateFeeBreakdown(event.registration_fee, settings);
  const isFree = fee.payableAmount <= 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      participantName: profile?.full_name || "",
      participantEmail: profile?.email || user?.email || "",
      participantPhone: profile?.phone || "",
      collegeName: profile?.college || "",
      department: profile?.department || "",
      yearOfStudy: profile?.year_of_study || "",
    },
  });

  const onSubmit = async (values: RegistrationFormValues) => {
    setSubmitting(true);
    try {
      if (isFree) {
        const res = await registerFreeEvent({
          eventId: event.id,
          ...values,
        });
        toast({
          title: "Registration Confirmed",
          description: `Your ticket ${res.ticketId} is ready.`,
          variant: "success",
        });
        onOpenChange(false);
        onRegistered?.();
        navigate(`/tickets/${res.ticketId}`);
        return;
      }

      // Paid event: create order on backend, then launch Cashfree checkout
      const order = await createPaidRegistrationOrder({
        eventId: event.id,
        ...values,
      });

      toast({
        title: "Seat Reserved",
        description: `Order ${order.orderId} created. Opening Cashfree secure checkout...`,
        variant: "info",
      });

      await launchCashfreeCheckout(order.paymentSessionId);
    } catch (err) {
      toast({
        title: "Registration Failed",
        description: getErrorMessage(err, "Could not complete registration."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register for {event.title}</DialogTitle>
          <DialogDescription>
            Confirm your participant details.{" "}
            {isFree
              ? "Your QR pass will be issued immediately."
              : "You will be redirected to Cashfree Payments to complete checkout."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="participantName">Full Name</Label>
              <Input id="participantName" {...register("participantName")} />
              {errors.participantName && (
                <p className="text-xs text-rose-400">{errors.participantName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="participantEmail">Email Address</Label>
              <Input id="participantEmail" type="email" {...register("participantEmail")} />
              {errors.participantEmail && (
                <p className="text-xs text-rose-400">{errors.participantEmail.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="participantPhone">Phone Number</Label>
              <Input id="participantPhone" placeholder="9876543210" {...register("participantPhone")} />
              {errors.participantPhone && (
                <p className="text-xs text-rose-400">{errors.participantPhone.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="collegeName">College / Institution</Label>
              <Input id="collegeName" {...register("collegeName")} />
              {errors.collegeName && (
                <p className="text-xs text-rose-400">{errors.collegeName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department (optional)</Label>
              <Input id="department" placeholder="Computer Science" {...register("department")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yearOfStudy">Year of Study (optional)</Label>
              <Input id="yearOfStudy" placeholder="3rd Year" {...register("yearOfStudy")} />
            </div>
          </div>

          {/* Transparent Fee Disclosure */}
          <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 text-sm">
            <div className="flex items-center justify-between text-[#A1A1AA]">
              <span>Registration Fee</span>
              <span className="font-mono text-white">
                {formatCurrency(fee.baseFee, event.currency)}
              </span>
            </div>
            {fee.gatewayFee > 0 && (
              <>
                <div className="mt-2 flex items-center justify-between text-[#A1A1AA]">
                  <span>Payment Gateway Fee ({settings?.gateway_fee_percentage}%)</span>
                  <span className="font-mono text-white">
                    {formatCurrency(fee.gatewayFee, event.currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[#A1A1AA]">
                  <span>GST on Fee ({settings?.gst_on_fee_percentage}%)</span>
                  <span className="font-mono text-white">
                    {formatCurrency(fee.taxAmount, event.currency)}
                  </span>
                </div>
              </>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 font-semibold">
              <span className="text-white">Total Payable</span>
              <span className="font-mono text-base text-[#A78BFA]">
                {formatCurrency(fee.payableAmount, event.currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              {isFree
                ? "Seat confirmed atomically with instant cryptographic QR pass."
                : "Your ticket is issued strictly after Cashfree server-side payment verification."}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isFree ? (
                <>
                  <Ticket className="h-4 w-4" />
                  Confirm Registration
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {formatCurrency(fee.payableAmount, event.currency)}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

