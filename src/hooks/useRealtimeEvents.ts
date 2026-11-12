import { useEffect, useRef } from "react";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

/**
 * Subscribes to Supabase Realtime changes on registrations, payments, and events,
 * invoking `onChange` whenever live counts or statuses update.
 */
export function useRealtimeSubscription(
  channelKey: string,
  tables: Array<"events" | "registrations" | "payments" | "tickets" | "check_ins">,
  onChange: () => void,
  filter?: { column: string; value: string },
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase.channel(`eventra-rt-${channelKey}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        () => {
          onChangeRef.current();
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelKey, filter?.column, filter?.value, tables.join(",")]);
}

