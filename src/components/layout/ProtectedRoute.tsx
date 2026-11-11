import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestOrganizerAccess } from "@/services/organizerService";
import { getErrorMessage } from "@/utils/format";
import { useToast } from "@/hooks/useToast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, ShieldAlert } from "lucide-react";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "organizer" | "admin";
}) {
  const { user, profile, loading, isAdmin, isApprovedOrganizer, refreshProfile } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState(profile?.organization_name || "");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (profile?.is_suspended) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              Account Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#A1A1AA]">
              Your account is currently suspended. Contact platform administration at{" "}
              <span className="text-white">support@eventra.app</span> for review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireRole === "admin" && !isAdmin) {
    const emailLiteral = (user.email || "your-email@example.com").replace(/'/g, "''");
    const promoteSql = `INSERT INTO public.profiles (id, full_name, email, role, organizer_status)\nSELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), email, 'admin', 'approved'\nFROM auth.users\nWHERE email = '${emailLiteral}'\nON CONFLICT (id) DO UPDATE SET role = 'admin', organizer_status = 'approved';`;

    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              Administrator Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#A1A1AA]">
              Signed in as <span className="font-mono text-white">{user.email}</span> (current role:{" "}
              <span className="font-mono text-[#A78BFA]">{profile?.role || "no profile row yet"}</span>
              ). Only <span className="font-mono text-white">admin</span> accounts can open this console.
            </p>
            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
              <p className="mb-2 text-xs text-[#A1A1AA]">
                To promote your account, run this in Supabase SQL Editor and click Re-check Permissions:
              </p>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
                {promoteSql}
              </pre>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setSubmitting(true);
                try {
                  await refreshProfile();
                  toast({
                    title: "Permissions Checked",
                    description: "Refreshed your account profile from Supabase.",
                    variant: "info",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
            >
              {submitting ? "Checking..." : "Re-check Admin Permissions"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireRole === "organizer" && !isApprovedOrganizer) {
    const handleApply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!orgName.trim()) return;
      setSubmitting(true);
      try {
        await requestOrganizerAccess(orgName.trim());
        await refreshProfile();
        toast({
          title: "Organizer Request Submitted",
          description: "An administrator will review and approve your organizer account.",
          variant: "success",
        });
      } catch (err) {
        toast({
          title: "Request Failed",
          description: getErrorMessage(err, "Could not submit request."),
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#A78BFA]" />
              {profile?.organizer_status === "pending"
                ? "Organizer Approval Pending"
                : "Host Events on Eventra"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.organizer_status === "pending" ? (
              <p className="text-sm leading-relaxed text-[#A1A1AA]">
                Your organizer application for{" "}
                <span className="font-medium text-white">
                  {profile.organization_name || profile.college || "your organization"}
                </span>{" "}
                is awaiting administrator approval. Once approved, you can create, publish,
                and scan tickets for events.
              </p>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <p className="text-sm leading-relaxed text-[#A1A1AA]">
                  Organizer accounts must be approved by a platform administrator. Submit your
                  club, department, or college organization name to request organizer access.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="orgName">Club / Organization / College Body</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., ACM Student Chapter — IIT Delhi"
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting Request..." : "Request Organizer Approval"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

