import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { QRScannerPanel } from "@/components/events/QRScannerPanel";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { fetchOrganizerEvents } from "@/services/organizerService";
import type { EventRecord } from "@/types/eventra";

export function OrganizerScannerPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    fetchOrganizerEvents(user.id)
      .then((list) => setEvents(list))
      .catch(() => {});
  }, [user]);

  return (
    <DashboardLayout
      title="QR Check-In Scanner"
      subtitle="Verify attendee digital passes in real time with atomic duplicate-scan protection."
      tabs={[
        { label: "Overview & Events", to: "/organizer", end: true },
        { label: "Create New Event", to: "/organizer/events/new" },
        { label: "QR Check-In Scanner", to: "/organizer/scanner" },
      ]}
    >
      <div className="mb-6 max-w-md space-y-1.5">
        <Label htmlFor="scanEventFilter">Restrict Validation to Specific Event (Optional)</Label>
        <Select
          id="scanEventFilter"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">All My Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </Select>
      </div>

      <QRScannerPanel selectedEventId={selectedEventId || undefined} />
    </DashboardLayout>
  );
}

