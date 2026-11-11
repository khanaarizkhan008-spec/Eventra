import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import type { Profile } from "@/types/eventra";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  isApprovedOrganizer: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    college?: string;
    department?: string;
    yearOfStudy?: string;
    requestedRole?: "participant" | "organizer";
    organizationName?: string;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, "full_name" | "phone" | "college" | "department" | "year_of_study" | "avatar_url" | "organization_name">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase environment variables are not configured.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await loadProfile(data.user.id);
    }
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    college?: string;
    department?: string;
    yearOfStudy?: string;
    requestedRole?: "participant" | "organizer";
    organizationName?: string;
  }) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase environment variables are not configured.");
    }
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: params.fullName,
          phone: params.phone || null,
          college: params.college || null,
          department: params.department || null,
          year_of_study: params.yearOfStudy || null,
          requested_role: params.requestedRole || "participant",
          organization_name: params.organizationName || null,
        },
      },
    });
    if (error) throw error;
    if (data.session?.user) {
      await loadProfile(data.session.user.id);
    }
    return { requiresEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const updateProfile = async (
    updates: Partial<
      Pick<
        Profile,
        | "full_name"
        | "phone"
        | "college"
        | "department"
        | "year_of_study"
        | "avatar_url"
        | "organization_name"
      >
    >,
  ) => {
    if (!user) throw new Error("Not authenticated.");
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  const isAdmin = Boolean(profile && profile.role === "admin" && !profile.is_suspended);
  const isApprovedOrganizer = Boolean(
    profile &&
      !profile.is_suspended &&
      (profile.role === "admin" ||
        (profile.role === "organizer" && profile.organizer_status === "approved")),
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isAdmin,
        isApprovedOrganizer,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

