import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventRecord } from "@/types/eventra";
import {
  formatCurrency,
  formatDateShort,
  getRegistrationAvailability,
} from "@/utils/format";

const FALLBACK_BANNERS: Record<string, string> = {
  Hackathons:
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80",
  "Technical Events":
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1000&q=80",
  Workshops:
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80",
  "Cultural Events":
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
  Sports:
    "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1000&q=80",
  Entrepreneurship:
    "https://images.unsplash.com/photo-1560439514-0fc9d2cd5e1b?auto=format&fit=crop&w=1000&q=80",
  Conferences:
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1000&q=80",
  Other:
    "https://images.unsplash.com/photo-1582192730841-2a682d7375f9?auto=format&fit=crop&w=1000&q=80",
};

export function EventCard({ event }: { event: EventRecord }) {
  const { availableSeats, canRegister } = getRegistrationAvailability(event);
  const banner = event.banner_url || FALLBACK_BANNERS[event.category] || FALLBACK_BANNERS.Other;
  const organizerLabel =
    event.organizer?.organization_name || event.organizer?.full_name || event.college_name;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#141419] transition-colors hover:border-[#A78BFA]/40"
    >
      <Link to={`/events/${event.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-zinc-900">
        <img
          src={banner}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141419] via-transparent to-black/20" />
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          <Badge>{event.category}</Badge>
        </div>
        <div className="absolute right-3.5 top-3.5">
          <span className="rounded-full border border-zinc-700/80 bg-[#09090B]/85 px-3 py-1 font-mono text-xs font-semibold text-white backdrop-blur-md">
            {formatCurrency(event.registration_fee, event.currency)}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-[#A78BFA]">{organizerLabel}</p>
        <Link to={`/events/${event.slug}`} className="mt-1.5 block">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-[#A78BFA]">
            {event.title}
          </h3>
        </Link>

        <div className="mt-4 space-y-2 text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
            <span>{formatDateShort(event.start_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
            <span className="truncate">
              {event.venue}, {event.college_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
            <span>
              {availableSeats > 0
                ? `${availableSeats} of ${event.capacity} seats available`
                : "Sold out"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-4">
          <span className="font-mono text-xs text-[#A1A1AA]">
            {event.registration_fee > 0 ? "Cashfree Verified" : "Instant QR Pass"}
          </span>
          <Button size="sm" variant={canRegister ? "default" : "secondary"} asChild>
            <Link to={`/events/${event.slug}`}>
              {canRegister ? "Register" : "View Details"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

