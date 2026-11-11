export type UserRole = "participant" | "organizer" | "admin";

export type OrganizerStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type EventCategory =
  | "Hackathons"
  | "Technical Events"
  | "Workshops"
  | "Cultural Events"
  | "Sports"
  | "Entrepreneurship"
  | "Conferences"
  | "Other";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Hackathons",
  "Technical Events",
  "Workshops",
  "Cultural Events",
  "Sports",
  "Entrepreneurship",
  "Conferences",
  "Other",
];

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "unpublished"
  | "cancelled"
  | "rejected";

export type RegistrationStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentStatus =
  | "FREE"
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type TicketStatus = "valid" | "used" | "cancelled" | "refunded";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  college: string | null;
  department: string | null;
  year_of_study: string | null;
  avatar_url: string | null;
  role: UserRole;
  organizer_status: OrganizerStatus;
  organization_name: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: number;
  pass_gateway_fee_to_customer: boolean;
  gateway_fee_percentage: number;
  gst_on_fee_percentage: number;
  reservation_expiry_minutes: number;
  require_event_approval: boolean;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string;
  banner_url: string | null;
  category: EventCategory;
  college_name: string;
  venue: string;
  maps_url: string | null;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  registration_fee: number;
  currency: string;
  capacity: number;
  allow_multiple_registrations: boolean;
  confirmed_count: number;
  status: EventStatus;
  is_featured: boolean;
  eligibility: string | null;
  rules: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
  organizer?: Pick<Profile, "id" | "full_name" | "organization_name" | "email">;
  live_stats?: EventLiveStats;
}

export interface EventLiveStats {
  event_id: string;
  capacity: number;
  confirmed_registrations: number;
  pending_payments: number;
  cancelled_registrations: number;
  available_seats: number;
  reservable_seats: number;
}

export interface RegistrationRecord {
  id: string;
  event_id: string;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  college_name: string | null;
  department: string | null;
  year_of_study: string | null;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  ticket_id: string | null;
  base_fee: number;
  gateway_fee: number;
  tax_amount: number;
  payable_amount: number;
  expires_at: string | null;
  registered_at: string;
  confirmed_at: string | null;
  created_at: string;
  event?: EventRecord;
  payment?: PaymentRecord;
  ticket?: TicketRecord;
}

export interface PaymentRecord {
  id: string;
  registration_id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  payment_session_id: string | null;
  amount: number;
  base_amount: number;
  gateway_fee: number;
  tax_amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  status_history: Array<{
    from: string | null;
    to: string;
    at: string;
    reason?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface TicketRecord {
  id: string;
  registration_id: string;
  event_id: string;
  participant_id: string;
  token_hash: string;
  status: TicketStatus;
  issued_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  event?: EventRecord;
  registration?: RegistrationRecord;
}

export interface RefundRecord {
  id: string;
  payment_id: string;
  provider_refund_id: string;
  cf_refund_id: string | null;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  reason: string;
  initiated_by: string | null;
  created_at: string;
}

export interface EventReportRecord {
  id: string;
  event_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  event?: Pick<EventRecord, "id" | "title" | "slug">;
}

export interface FeeBreakdown {
  baseFee: number;
  gatewayFee: number;
  taxAmount: number;
  payableAmount: number;
}

