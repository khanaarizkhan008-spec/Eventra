import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Send, Upload } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  fetchEventBySlugOrId,
  fetchPlatformSettings,
  uploadEventBanner,
} from "@/services/eventsService";
import {
  createEventRecord,
  updateEventRecord,
} from "@/services/organizerService";
import { EVENT_CATEGORIES, type EventCategory } from "@/types/eventra";
import { getErrorMessage } from "@/utils/format";

const eventFormSchema = z.object({
  title: z.string().min(3, "Event name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  banner_url: z.string().optional(),
  category: z.enum([
    "Hackathons",
    "Technical Events",
    "Workshops",
    "Cultural Events",
    "Sports",
    "Entrepreneurship",
    "Conferences",
    "Other",
  ]),
  college_name: z.string().min(2, "College or organization is required"),
  venue: z.string().min(2, "Venue is required"),
  maps_url: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_date: z.string().min(1, "End date is required"),
  end_time: z.string().min(1, "End time is required"),
  deadline_date: z.string().min(1, "Deadline date is required"),
  deadline_time: z.string().min(1, "Deadline time is required"),
  pricing_mode: z.enum(["free", "paid"]),
  registration_fee: z.coerce.number().min(0, "Fee cannot be negative"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  allow_multiple_registrations: z.boolean().default(false),
  eligibility: z.string().optional(),
  rules: z.string().optional(),
  contact_email: z.string().email("Valid contact email required"),
  contact_phone: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

function toDateInput(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function toTimeInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function OrganizerEventFormPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const isEditing = Boolean(eventId);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [uploading, setUploading] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "publish">("publish");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      category: "Hackathons",
      pricing_mode: "free",
      registration_fee: 0,
      capacity: 100,
      allow_multiple_registrations: false,
      college_name: profile?.college || "",
      contact_email: profile?.email || "",
      contact_phone: profile?.phone || "",
    },
  });

  const pricingMode = watch("pricing_mode");
  const bannerPreview = watch("banner_url");

  useEffect(() => {
    fetchPlatformSettings()
      .then((cfg) => setRequireApproval(cfg.require_event_approval))
      .catch(() => {});

    if (eventId) {
      fetchEventBySlugOrId(eventId).then((ev) => {
        if (!ev) return;
        reset({
          title: ev.title,
          description: ev.description,
          banner_url: ev.banner_url || "",
          category: ev.category as EventCategory,
          college_name: ev.college_name,
          venue: ev.venue,
          maps_url: ev.maps_url || "",
          start_date: toDateInput(ev.start_at),
          start_time: toTimeInput(ev.start_at),
          end_date: toDateInput(ev.end_at),
          end_time: toTimeInput(ev.end_at),
          deadline_date: toDateInput(ev.registration_deadline),
          deadline_time: toTimeInput(ev.registration_deadline),
          pricing_mode: ev.registration_fee > 0 ? "paid" : "free",
          registration_fee: ev.registration_fee,
          capacity: ev.capacity,
          allow_multiple_registrations: ev.allow_multiple_registrations,
          eligibility: ev.eligibility || "",
          rules: ev.rules || "",
          contact_email: ev.contact_email,
          contact_phone: ev.contact_phone || "",
        });
      });
    }
  }, [eventId, reset]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadEventBanner(user.id, file);
      setValue("banner_url", publicUrl);
      toast({ title: "Banner Uploaded", variant: "success" });
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: getErrorMessage(err, "Could not upload banner image."),
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: EventFormValues) => {
    if (!user) return;

    const startAt = new Date(`${values.start_date}T${values.start_time}`).toISOString();
    const endAt = new Date(`${values.end_date}T${values.end_time}`).toISOString();
    const deadlineAt = new Date(
      `${values.deadline_date}T${values.deadline_time}`,
    ).toISOString();

    if (new Date(endAt) <= new Date(startAt)) {
      toast({
        title: "Invalid Event Dates",
        description: "End date and time must be after the start date and time.",
        variant: "error",
      });
      return;
    }

    if (new Date(deadlineAt) > new Date(endAt)) {
      toast({
        title: "Invalid Deadline",
        description: "Registration deadline cannot be after the event ends.",
        variant: "error",
      });
      return;
    }

    const finalFee = values.pricing_mode === "free" ? 0 : values.registration_fee;
    if (values.pricing_mode === "paid" && finalFee <= 0) {
      toast({
        title: "Invalid Fee",
        description: "Paid events must have a registration fee greater than ₹0.",
        variant: "error",
      });
      return;
    }

    const targetStatus =
      submitMode === "draft"
        ? "draft"
        : requireApproval && profile?.role !== "admin"
          ? "pending_approval"
          : "published";

    try {
      const payload = {
        title: values.title,
        description: values.description,
        banner_url: values.banner_url || null,
        category: values.category,
        college_name: values.college_name,
        venue: values.venue,
        maps_url: values.maps_url || null,
        start_at: startAt,
        end_at: endAt,
        registration_deadline: deadlineAt,
        registration_fee: finalFee,
        capacity: values.capacity,
        allow_multiple_registrations: values.allow_multiple_registrations,
        eligibility: values.eligibility || null,
        rules: values.rules || null,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone || null,
        status: targetStatus as "draft" | "pending_approval" | "published",
      };

      if (isEditing && eventId) {
        await updateEventRecord(eventId, payload);
        toast({ title: "Event Updated", variant: "success" });
      } else {
        await createEventRecord(user.id, payload);
        toast({
          title:
            targetStatus === "draft"
              ? "Draft Saved"
              : targetStatus === "pending_approval"
                ? "Submitted for Admin Approval"
                : "Event Published Live",
          variant: "success",
        });
      }
      navigate("/organizer");
    } catch (err) {
      toast({
        title: "Save Failed",
        description: getErrorMessage(err, "Unable to save event."),
        variant: "error",
      });
    }
  };

  return (
    <DashboardLayout
      title={isEditing ? "Edit Event" : "Create Event"}
      subtitle="Configure event details, ticket pricing, capacity, and registration rules."
      tabs={[
        { label: "Overview & Events", to: "/organizer", end: true },
        { label: "Create New Event", to: "/organizer/events/new" },
        { label: "QR Check-In Scanner", to: "/organizer/scanner" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Event Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="title">Event Name</Label>
                <Input
                  id="title"
                  placeholder="e.g., AI Buildathon 2026"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-rose-400">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Describe tracks, speakers, schedule, and prizes..."
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-rose-400">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select id="category" {...register("category")}>
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="college_name">College / Organization</Label>
                <Input id="college_name" {...register("college_name")} />
                {errors.college_name && (
                  <p className="text-xs text-rose-400">{errors.college_name.message}</p>
                )}
              </div>

              {/* Banner Upload */}
              <div className="space-y-2 md:col-span-2">
                <Label>Event Banner Image</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2 text-xs font-semibold text-white hover:border-[#A78BFA]/50">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-[#A78BFA]" />
                    )}
                    {uploading ? "Uploading..." : "Upload Banner File"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleBannerUpload}
                    />
                  </label>
                  <Input
                    placeholder="Or paste an image URL..."
                    {...register("banner_url")}
                    className="flex-1"
                  />
                </div>
                {bannerPreview && (
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="mt-2 h-36 w-full rounded-xl border border-zinc-800 object-cover"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  placeholder="Main Auditorium, Block C"
                  {...register("venue")}
                />
                {errors.venue && (
                  <p className="text-xs text-rose-400">{errors.venue.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maps_url">Google Maps URL (optional)</Label>
                <Input
                  id="maps_url"
                  placeholder="https://maps.google.com/?q=..."
                  {...register("maps_url")}
                />
              </div>

              {/* Dates */}
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" {...register("start_time")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" {...register("end_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_time">End Time</Label>
                <Input id="end_time" type="time" {...register("end_time")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline_date">Registration Deadline Date</Label>
                <Input id="deadline_date" type="date" {...register("deadline_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline_time">Registration Deadline Time</Label>
                <Input id="deadline_time" type="time" {...register("deadline_time")} />
              </div>

              {/* Pricing Mode */}
              <div className="space-y-1.5">
                <Label>Ticket Pricing Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValue("pricing_mode", "free");
                      setValue("registration_fee", 0);
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      pricingMode === "free"
                        ? "border-[#A78BFA] bg-[#A78BFA]/15 text-white"
                        : "border-zinc-800 bg-[#09090B] text-[#A1A1AA]"
                    }`}
                  >
                    Free Event (₹0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("pricing_mode", "paid")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      pricingMode === "paid"
                        ? "border-[#A78BFA] bg-[#A78BFA]/15 text-white"
                        : "border-zinc-800 bg-[#09090B] text-[#A1A1AA]"
                    }`}
                  >
                    Paid Event (Cashfree)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="registration_fee">Registration Fee (INR)</Label>
                <Input
                  id="registration_fee"
                  type="number"
                  step="1"
                  min="0"
                  disabled={pricingMode === "free"}
                  {...register("registration_fee")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity">Maximum Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  {...register("capacity")}
                />
                {errors.capacity && (
                  <p className="text-xs text-rose-400">{errors.capacity.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="allow_multiple"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-[#09090B] accent-[#8B5CF6]"
                  {...register("allow_multiple_registrations")}
                />
                <Label htmlFor="allow_multiple" className="cursor-pointer text-white">
                  Allow multiple registrations per participant account
                </Label>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="eligibility">Eligibility</Label>
                <Textarea
                  id="eligibility"
                  rows={2}
                  placeholder="Open to all B.Tech, BCA, and M.Sc students with valid college ID..."
                  {...register("eligibility")}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="rules">Event Rules</Label>
                <Textarea
                  id="rules"
                  rows={3}
                  placeholder="Teams of 2-4 members. Bring laptops and college IDs..."
                  {...register("rules")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" type="email" {...register("contact_email")} />
                {errors.contact_email && (
                  <p className="text-xs text-rose-400">{errors.contact_email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input id="contact_phone" {...register("contact_phone")} />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-5">
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setSubmitMode("draft")}
              >
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => setSubmitMode("publish")}
              >
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : requireApproval
                    ? "Submit for Approval"
                    : "Publish Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

