import { Link } from "react-router-dom";
import { Github, Globe, Mail, Ticket } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#09090B]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#A78BFA]/30 bg-[#8B5CF6]/15 text-[#A78BFA]">
                <Ticket className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Eventra</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A1A1AA]">
              Discover. Register. Experience. A unified college event discovery, Cashfree
              verified payments, and cryptographic QR pass platform built for campuses.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="mailto:support@eventra.app"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-[#141419] text-[#A1A1AA] transition-colors hover:border-[#A78BFA]/40 hover:text-white"
                aria-label="Email Eventra"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-[#141419] text-[#A1A1AA] transition-colors hover:border-[#A78BFA]/40 hover:text-white"
                aria-label="Eventra GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <Link
                to="/events"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-[#141419] text-[#A1A1AA] transition-colors hover:border-[#A78BFA]/40 hover:text-white"
                aria-label="Explore Events"
              >
                <Globe className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Platform
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-[#A1A1AA]">
              <li>
                <Link to="/events" className="hover:text-white">
                  Explore Events
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white">
                  How Eventra Works
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="hover:text-white">
                  Host an Event
                </Link>
              </li>
              <li>
                <Link to="/demo/curtain-split-hero" className="hover:text-white">
                  Curtain Hero Component
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Legal & Support
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-[#A1A1AA]">
              <li>
                <Link to="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-white">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 text-xs text-[#A1A1AA] sm:flex-row">
          <p>© {new Date().getFullYear()} Eventra Campus Systems. All rights reserved.</p>
          <p>Secured with Supabase RLS & Cashfree Payments</p>
        </div>
      </div>
    </footer>
  );
}

