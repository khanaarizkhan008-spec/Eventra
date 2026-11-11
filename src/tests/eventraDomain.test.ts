import { describe, expect, it } from "vitest";
import {
  calculateFeeBreakdown,
  formatCurrency,
  getErrorMessage,
  getRegistrationAvailability,
} from "@/utils/format";
import { buildGoogleCalendarUrl } from "@/utils/calendar";
import type { EventRecord } from "@/types/eventra";

const baseEvent: EventRecord = {
  id: "ev-1",
  organizer_id: "org-1",
  title: "AI Buildathon 2026",
  slug: "ai-buildathon-2026",
  description: "24-hour AI engineering hackathon",
  banner_url: null,
  category: "Hackathons",
  college_name: "IIT Delhi",
  venue: "Main Auditorium",
  maps_url: null,
  start_at: new Date(Date.now() + 86400_000 * 5).toISOString(),
  end_at: new Date(Date.now() + 86400_000 * 6).toISOString(),
  registration_deadline: new Date(Date.now() + 86400_000 * 3).toISOString(),
  registration_fee: 500,
  currency: "INR",
  capacity: 200,
  allow_multiple_registrations: false,
  confirmed_count: 126,
  status: "published",
  is_featured: true,
  eligibility: null,
  rules: null,
  contact_email: "events@iitd.ac.in",
  contact_phone: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Eventra Fee Disclosure & Availability Rules", () => {
  it("formats free and paid amounts accurately", () => {
    expect(formatCurrency(0)).toBe("Free");
    expect(formatCurrency(499)).toBe("₹499");
  });

  it("discloses zero gateway fee when fee passthrough is disabled", () => {
    const breakdown = calculateFeeBreakdown(500, {
      pass_gateway_fee_to_customer: false,
      gateway_fee_percentage: 2,
      gst_on_fee_percentage: 18,
    });
    expect(breakdown).toEqual({
      baseFee: 500,
      gatewayFee: 0,
      taxAmount: 0,
      payableAmount: 500,
    });
  });

  it("calculates gateway fee + GST transparently when enabled by admin", () => {
    const breakdown = calculateFeeBreakdown(500, {
      pass_gateway_fee_to_customer: true,
      gateway_fee_percentage: 2,
      gst_on_fee_percentage: 18,
    });
    // 2% of 500 = 10; 18% GST of 10 = 1.80 -> total 511.80
    expect(breakdown).toEqual({
      baseFee: 500,
      gatewayFee: 10,
      taxAmount: 1.8,
      payableAmount: 511.8,
    });
  });

  it("computes remaining seats accurately (Section 7 example: 200 cap - 126 confirmed = 74)", () => {
    const res = getRegistrationAvailability(baseEvent);
    expect(res.canRegister).toBe(true);
    expect(res.availableSeats).toBe(74);
  });

  it("blocks registration when deadline has passed", () => {
    const expired = {
      ...baseEvent,
      registration_deadline: new Date(Date.now() - 3600_000).toISOString(),
    };
    const res = getRegistrationAvailability(expired);
    expect(res.canRegister).toBe(false);
    expect(res.reason).toContain("deadline");
  });

  it("blocks registration when capacity is reached", () => {
    const full = { ...baseEvent, confirmed_count: 200 };
    const res = getRegistrationAvailability(full);
    expect(res.canRegister).toBe(false);
    expect(res.availableSeats).toBe(0);
  });

  it("blocks registration when event is cancelled or unpublished", () => {
    expect(getRegistrationAvailability({ ...baseEvent, status: "cancelled" }).canRegister).toBe(
      false,
    );
    expect(getRegistrationAvailability({ ...baseEvent, status: "unpublished" }).canRegister).toBe(
      false,
    );
  });

  it("builds valid Google Calendar template URL", () => {
    const url = buildGoogleCalendarUrl({
      title: baseEvent.title,
      description: baseEvent.description,
      location: baseEvent.venue,
      startAt: baseEvent.start_at,
      endAt: baseEvent.end_at,
    });
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("AI+Buildathon+2026");
  });

  it("extracts readable diagnostics from Postgrest plain error objects", () => {
    expect(
      getErrorMessage(
        {
          code: "PGRST205",
          message: "Could not find the table 'public.events' in the schema cache",
        },
        "Fallback",
      ),
    ).toContain("PGRST205");
    expect(
      getErrorMessage({ message: "Row level security blocked", hint: "Check policy" }, "Fallback"),
    ).toBe("Row level security blocked (Check policy)");
    expect(getErrorMessage(new Error("Standard error"), "Fallback")).toBe("Standard error");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});

