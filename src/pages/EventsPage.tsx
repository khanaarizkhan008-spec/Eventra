import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/EventCard";
import { EventGridSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchPublishedEvents } from "@/services/eventsService";
import { EVENT_CATEGORIES, type EventCategory, type EventRecord } from "@/types/eventra";
import { getErrorMessage } from "@/utils/format";
import { useAuth } from "@/hooks/useAuth";

export function EventsPage() {
  const { isConfigured } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState<EventCategory | "All">(
    (searchParams.get("category") as EventCategory) || "All",
  );
  const [price, setPrice] = useState<"all" | "free" | "paid">(
    (searchParams.get("price") as "all" | "free" | "paid") || "all",
  );
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month" | "upcoming">(
    (searchParams.get("date") as "all" | "today" | "week" | "month" | "upcoming") || "all",
  );
  const [sort, setSort] = useState<"newest" | "popular" | "fee_asc" | "fee_desc">(
    (searchParams.get("sort") as "newest" | "popular" | "fee_asc" | "fee_desc") || "newest",
  );

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPublishedEvents({
        search,
        category,
        price,
        dateRange,
        sort,
      });
      setEvents(list);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load events."));
    } finally {
      setLoading(false);
    }
  }, [isConfigured, search, category, price, dateRange, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadEvents();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setPrice("all");
    setDateRange("all");
    setSort("newest");
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
            Discover Campus Events
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Explore Events
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Search by event name, college, organizer, category, date, or fee.
          </p>
        </div>
        <span className="font-mono text-xs text-[#A1A1AA]">
          {events.length} {events.length === 1 ? "event" : "events"} found
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-[#141419] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, colleges, organizers..."
              className="pl-10"
            />
          </div>

          <div className="md:col-span-2">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory | "All")}
              aria-label="Filter by category"
            >
              <option value="All">All Categories</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              aria-label="Filter by date"
            >
              <option value="all">Any Date</option>
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              value={price}
              onChange={(e) => setPrice(e.target.value as typeof price)}
              aria-label="Filter by price"
            >
              <option value="all">Free & Paid</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort events"
            >
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Popularity</option>
              <option value="fee_asc">Fee: Low to High</option>
              <option value="fee_desc">Fee: High to Low</option>
            </Select>
          </div>
        </div>

        {(search || category !== "All" || price !== "all" || dateRange !== "all") && (
          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-3">
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              <Filter className="h-3.5 w-3.5 text-[#A78BFA]" />
              <span>Active filters applied</span>
            </div>
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <EventGridSkeleton count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadEvents} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No matching events"
            description="Try adjusting your search keywords, category, or date filters."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Reset Filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

