function toIcsTimestamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function downloadIcsEvent(params: {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  ticketId?: string;
}): void {
  const uid = `${params.ticketId || Date.now()}@eventra.app`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventra//Campus Event Platform//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${toIcsTimestamp(params.startAt)}`,
    `DTEND:${toIcsTimestamp(params.endAt)}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(
      params.ticketId
        ? `Ticket ID: ${params.ticketId}\n\n${params.description}`
        : params.description,
    )}`,
    `LOCATION:${escapeIcsText(params.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${params.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
}): string {
  const dates = `${toIcsTimestamp(params.startAt)}/${toIcsTimestamp(params.endAt)}`;
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates,
    details: params.description,
    location: params.location,
  });
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

