import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalPage({
  type,
}: {
  type: "privacy" | "terms" | "refund" | "contact";
}) {
  const content = {
    privacy: {
      title: "Privacy Policy",
      updated: "November 2026",
      sections: [
        {
          heading: "Data Collection",
          body: "Eventra collects your name, email address, phone number, college, department, and year of study solely to register you for campus events and issue verifiable admission passes.",
        },
        {
          heading: "Payment Credentials",
          body: "Eventra never stores credit/debit card numbers, CVVs, or UPI PINs. All payments are processed directly by Cashfree Payments in PCI-DSS compliant checkout sessions.",
        },
        {
          heading: "QR Ticket Privacy",
          body: "QR codes contain only an opaque cryptographically signed reference token and never expose personal email or phone details to third-party scanners.",
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      updated: "November 2026",
      sections: [
        {
          heading: "Event Registration & Admission",
          body: "Admission is strictly governed by confirmed registration status, payment verification, and organizer event rules. Tickets are valid for a single check-in unless otherwise stated.",
        },
        {
          heading: "Organizer Responsibilities",
          body: "Approved organizers are responsible for accurate event scheduling, venue compliance, transparent eligibility rules, and timely communication of cancellations.",
        },
      ],
    },
    refund: {
      title: "Refund & Cancellation Policy",
      updated: "November 2026",
      sections: [
        {
          heading: "Event Cancellation",
          body: "If an organizer or administrator cancels a paid event, eligible participants may receive refunds processed through Cashfree Payments back to their original payment method.",
        },
        {
          heading: "Refund Processing Timeline",
          body: "Approved refunds are submitted immediately to Cashfree and typically settle to your bank or UPI account within 5–7 business days. Full refunds automatically revoke the associated QR pass.",
        },
      ],
    },
    contact: {
      title: "Contact & Support",
      updated: "Eventra Campus Operations",
      sections: [
        {
          heading: "Platform Support",
          body: "For payment reconciliation, organizer onboarding, or ticket recovery assistance, contact support@eventra.app.",
        },
        {
          heading: "Grievance & Compliance",
          body: "Use the Report Event button on any event detail page to flag policy violations or fraudulent listings for rapid administrator review.",
        },
      ],
    },
  }[type];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Card>
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-[#A78BFA]">
            {content.updated}
          </p>
          <CardTitle className="mt-1 text-2xl">{content.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.sections.map((sec) => (
            <div key={sec.heading}>
              <h2 className="text-base font-semibold text-white">{sec.heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#A1A1AA]">
                {sec.body}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

