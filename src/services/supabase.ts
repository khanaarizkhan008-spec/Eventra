import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim().replace(/\/+$/, "");

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-ref") &&
    !supabaseAnonKey.includes("your-supabase-anon-key"),
);

const resolvedUrl = supabaseUrl || "https://placeholder.supabase.co";
const resolvedKey = supabaseAnonKey || "placeholder-anon-key";

export function getBackendEndpoint(
  functionName: string,
  overrideBackendUrl = backendUrl,
  overrideSupabaseUrl = resolvedUrl,
): string {
  const cleanBackend = overrideBackendUrl?.trim().replace(/\/+$/, "");
  return cleanBackend
    ? `${cleanBackend}/api/${functionName}`
    : `${overrideSupabaseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
}

export const supabase: SupabaseClient = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export class EdgeFunctionError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "EdgeFunctionError";
    this.code = code;
    this.status = status;
  }
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new EdgeFunctionError(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local.",
      "SUPABASE_UNCONFIGURED",
      503,
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const res = await fetch(getBackendEndpoint(functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: resolvedKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new EdgeFunctionError(
      payload?.error || payload?.message || `Backend endpoint ${functionName} failed (${res.status}).`,
      payload?.code,
      res.status,
    );
  }

  return payload as T;
}

