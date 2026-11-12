import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Cpu,
  Globe2,
  Lightbulb,
  Mic2,
  Music,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import CurtainSplitHero from "@/components/ui/curtain-split-hero";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/events/EventCard";
import { EventGridSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchPublishedEvents } from "@/services/eventsService";
import { EVENT_CATEGORIES, type EventCategory, type EventRecord } from "@/types/eventra";
import { getErrorMessage } from "@/utils/format";
import { useAuth } from "@/hooks/useAuth";
import { usePublicIntro } from "@/layouts/PublicLayout";
import { cn } from "@/utils/cn";

const CATEGORY_ICONS: Record<EventCategory, typeof Code2> = {
  Hackathons: Code2,
  "Technical Events": Cpu,
  Workshops: Wrench,
  "Cultural Events": Music,
  Sports: Trophy,
  Entrepreneurship: Lightbulb,
  Conferences: Mic2,
  Other: Globe2,
};

export function HomePage() {
  const { isConfigured } = useAuth();
  const { navbarVisible, revealNavbar } = usePublicIntro();
  const [featured, setFeatured] = useState<EventRecord[]>([]);
  const [upcoming, setUpcoming] = useState<EventRecord[]>([]);
  const [popular, setPopular] = useState<EventRecord[]>([]);
  const [recent, setRecent] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHomepageEvents = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [featList, upList, popList, recList] = await Promise.all([
        fetchPublishedEvents({ featuredOnly: true, limit: 6 }),
        fetchPublishedEvents({ dateRange: "upcoming", sort: "newest", limit: 6 }),
        fetchPublishedEvents({ sort: "popular", limit: 6 }),
        fetchPublishedEvents({ sort: "newest", limit: 6 }),
      ]);
      setFeatured(featList.length > 0 ? featList : upList.slice(0, 3));
      setUpcoming(upList);
      setPopular(popList);
      setRecent(recList);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load events."));
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadHomepageEvents();
  }, [loadHomepageEvents]);

  return (
    <div className="pb-20">
      {/* Interactive Picture-Burst Intro Hero */}
      <section className="mx-auto max-w-7xl px-2 pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pt-10">
        <CurtainSplitHero
          introDelayMs={2400}
          onBurst={revealNavbar}
          eyebrow="Eventra • Campus Events"
          title={
            <>
              Find Your Next
              <br />
              Experience.
            </>
          }
          description="Discover college events, workshops, hackathons, competitions, and experiences happening around you."
          actions={
            <>
              <Button
                size="pill"
                className="h-8 gap-1 px-3 text-[11px] sm:h-11 sm:gap-2 sm:px-6 sm:text-sm"
                asChild
              >
                <Link to="/events">
                  Explore Events
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </Button>
              <Button
                size="pill"
                variant="secondary"
                className="h-8 px-3 text-[11px] sm:h-11 sm:px-6 sm:text-sm"
                asChild
              >
                <Link to="/organizer">Host an Event</Link>
              </Button>
            </>
          }
        />
      </section>

      <motion.div
        initial={false}
        animate={navbarVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: navbarVisible ? 0.12 : 0 }}
        className={cn(!navbarVisible && "pointer-events-none")}
      >
      {/* Featured Events */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
              Curated Highlights
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Featured Events
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              View all events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8">
          {loading ? (
            <EventGridSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={loadHomepageEvents} />
          ) : featured.length === 0 ? (
            <EmptyState
              title="No published events yet"
              description={
                isConfigured
                  ? "Publish your first campus hackathon, workshop, or fest from the Organizer Dashboard to see it featured here."
                  : "Connect your Supabase project in frontend/.env.local and run the SQL migrations to load live events."
              }
              action={
                <Button asChild>
                  <Link to="/organizer">Host an Event</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
            Browse by Discipline
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Explore Categories
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {EVENT_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <Link
                key={category}
                to={`/events?category=${encodeURIComponent(category)}`}
                className="group flex items-center gap-3.5 rounded-2xl border border-zinc-800/80 bg-[#141419] p-4 transition-all hover:border-[#A78BFA]/45 hover:bg-[#191922]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#09090B] text-[#A78BFA] transition-colors group-hover:border-[#A78BFA]/40">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{category}</p>
                  <p className="text-[11px] text-[#A1A1AA]">Explore</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Upcoming / Popular / Recently Added */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="upcoming">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
                Live Campus Feed
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Discover What’s Happening
              </h2>
            </div>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="recent">Recently Added</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming" className="mt-8">
            {loading ? (
              <EventGridSkeleton count={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming events scheduled"
                description="Check back soon or browse all categories."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular" className="mt-8">
            {loading ? (
              <EventGridSkeleton count={3} />
            ) : popular.length === 0 ? (
              <EmptyState
                title="No popular events yet"
                description="Events gain popularity as verified attendees register."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {popular.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-8">
            {loading ? (
              <EventGridSkeleton count={3} />
            ) : recent.length === 0 ? (
              <EmptyState
                title="No recent events added"
                description="Newly published campus events will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recent.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* How Eventra Works */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-zinc-800/80 bg-[#141419] p-8 sm:p-12">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
              End-to-End Architecture
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How Eventra Works
            </h2>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              Built with atomic seat reservations, server-verified Cashfree payments, and
              cryptographic QR check-ins.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800/80 bg-[#09090B] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                1. Discover & Reserve
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                Browse campus hackathons, fests, and workshops with live seat counts and
                transparent fee breakdowns before checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-[#09090B] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                2. Server-Verified Payment
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                Paid registrations hold seats cleanly and confirm strictly after HMAC-SHA256
                Cashfree webhook and order status verification.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-[#09090B] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                3. Cryptographic QR Check-In
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                Students receive opaque signed QR passes downloadable as PDFs, while
                organizers validate entry atomically with zero duplicate scans.
              </p>
            </div>
          </div>
        </div>
      </section>
      </motion.div>
    </div>
  );
}

