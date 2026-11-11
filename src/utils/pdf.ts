import { jsPDF } from "jspdf";
import { formatDateTime } from "./format";

export async function downloadTicketPdf(params: {
  ticketId: string;
  eventTitle: string;
  participantName: string;
  participantEmail: string;
  venue: string;
  collegeName: string;
  startAt: string;
  status: string;
  qrSvgElement: SVGSVGElement | null;
}): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a5",
  });

  const width = doc.internal.pageSize.getWidth();

  // Dark pass surface
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, width, doc.internal.pageSize.getHeight(), "F");

  // Card enclosure
  doc.setFillColor(20, 20, 25);
  doc.setDrawColor(63, 63, 70);
  doc.roundedRect(24, 24, width - 48, 540, 14, 14, "FD");

  // Header brand
  doc.setTextColor(167, 139, 250);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EVENTRA DIGITAL PASS", 44, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(params.eventTitle, width - 88);
  doc.text(titleLines, 44, 86);

  const afterTitleY = 86 + titleLines.length * 22;

  doc.setTextColor(161, 161, 170);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("ATTENDEE", 44, afterTitleY + 12);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(params.participantName, 44, afterTitleY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(161, 161, 170);
  doc.text(params.participantEmail, 44, afterTitleY + 44);

  doc.text("DATE & TIME", 44, afterTitleY + 72);
  doc.setTextColor(255, 255, 255);
  doc.text(formatDateTime(params.startAt), 44, afterTitleY + 88);

  doc.setTextColor(161, 161, 170);
  doc.text("VENUE", 44, afterTitleY + 114);
  doc.setTextColor(255, 255, 255);
  const venueLines = doc.splitTextToSize(`${params.venue}, ${params.collegeName}`, width - 88);
  doc.text(venueLines, 44, afterTitleY + 130);

  // Convert QR SVG to PNG via canvas if available
  if (params.qrSvgElement) {
    const svgData = new XMLSerializer().serializeToString(params.qrSvgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const imgDataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 24, 24, 352, 352);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });

    const qrBoxSize = 150;
    const qrX = (width - qrBoxSize) / 2;
    const qrY = Math.max(afterTitleY + 165, 320);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 8, qrY - 8, qrBoxSize + 16, qrBoxSize + 16, 10, 10, "F");
    doc.addImage(imgDataUrl, "PNG", qrX, qrY, qrBoxSize, qrBoxSize);

    doc.setTextColor(161, 161, 170);
    doc.setFontSize(9);
    doc.text(`TICKET ID: ${params.ticketId}  •  STATUS: ${params.status.toUpperCase()}`, width / 2, qrY + qrBoxSize + 28, {
      align: "center",
    });
  }

  doc.save(`${params.ticketId}-eventra-pass.pdf`);
}

