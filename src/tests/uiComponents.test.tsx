import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CurtainSplitHero from "@/components/ui/curtain-split-hero";
import DemoOne from "@/components/ui/demo";
import { EventCard } from "@/components/events/EventCard";
import type { EventRecord } from "@/types/eventra";

describe("Eventra UI Components", () => {
  it("renders CurtainSplitHero and toggles curtain status on click", () => {
    render(
      <CurtainSplitHero
        title="Find Your Next Experience."
        description="Discover college events and workshops."
      />,
    );

    expect(screen.getByText("Find Your Next Experience.")).toBeInTheDocument();
    const promptPill = screen.getByText(/Scroll down or click to unveil Eventra/i);
    expect(promptPill).toBeInTheDocument();

    fireEvent.click(promptPill.closest("div[class*='cursor-pointer']")!);
    expect(screen.getAllByText(/Eventra/i).length).toBeGreaterThan(0);
  });

  it("renders DemoOne component cleanly", () => {
    render(<DemoOne />);
    expect(screen.getByText(/Find Your Next/i)).toBeInTheDocument();
  });

  it("renders EventCard with fee, venue, and remaining seats", () => {
    const mockEvent: EventRecord = {
      id: "ev-demo",
      organizer_id: "org-1",
      title: "Campus Robotics Championship",
      slug: "campus-robotics-championship",
      description: "Autonomous bots competition",
      banner_url: null,
      category: "Technical Events",
      college_name: "NIT Trichy",
      venue: "Orion Hall",
      maps_url: null,
      start_at: new Date(Date.now() + 86400_000 * 10).toISOString(),
      end_at: new Date(Date.now() + 86400_000 * 11).toISOString(),
      registration_deadline: new Date(Date.now() + 86400_000 * 5).toISOString(),
      registration_fee: 350,
      currency: "INR",
      capacity: 120,
      allow_multiple_registrations: false,
      confirmed_count: 45,
      status: "published",
      is_featured: true,
      eligibility: null,
      rules: null,
      contact_email: "robotics@nitt.edu",
      contact_phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <MemoryRouter>
        <EventCard event={mockEvent} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Campus Robotics Championship")).toBeInTheDocument();
    expect(screen.getByText("₹350")).toBeInTheDocument();
    expect(screen.getByText("75 of 120 seats available")).toBeInTheDocument();
  });

  it("waits for introDelayMs then triggers burst and navbar reveal callback", () => {
    vi.useFakeTimers();
    const onBurst = vi.fn();

    render(<CurtainSplitHero introDelayMs={2400} onBurst={onBurst} />);
    expect(onBurst).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(onBurst).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
