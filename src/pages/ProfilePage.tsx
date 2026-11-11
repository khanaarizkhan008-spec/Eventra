import { useEffect, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { uploadUserAvatar } from "@/services/eventsService";
import { getErrorMessage } from "@/utils/format";

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCollege(profile.college || "");
      setDepartment(profile.department || "");
      setYearOfStudy(profile.year_of_study || "");
      setOrganizationName(profile.organization_name || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone: phone || null,
        college: college || null,
        department: department || null,
        year_of_study: yearOfStudy || null,
        organization_name: organizationName || null,
      });
      toast({
        title: "Profile Saved",
        description: "Your details have been updated.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getErrorMessage(err, "Could not save profile."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadUserAvatar(user.id, file);
      await updateProfile({ avatar_url: url });
      toast({ title: "Avatar Updated", variant: "success" });
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: getErrorMessage(err, "Could not upload avatar."),
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout
      title="Profile Settings"
      subtitle="Manage your student, participant, or organizer identity."
      tabs={[
        { label: "Profile", to: "/profile", end: true },
        { label: "My Tickets & Registrations", to: "/my-registrations" },
      ]}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Account Identity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-[#09090B] text-2xl font-bold text-[#A78BFA]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile?.full_name || "E").charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-[#8B5CF6] text-white hover:bg-[#7C3AED]">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              {profile?.full_name || "Eventra User"}
            </h3>
            <p className="text-xs text-[#A1A1AA]">{profile?.email}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <StatusBadge status={profile?.role || "participant"} />
              {profile?.organizer_status && profile.organizer_status !== "none" && (
                <StatusBadge status={`ORG_${profile.organizer_status}`} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base">Personal & Campus Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pFullName">Full Name</Label>
                <Input
                  id="pFullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pEmail">Email</Label>
                <Input id="pEmail" value={profile?.email || ""} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pPhone">Phone Number</Label>
                <Input
                  id="pPhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pCollege">College / University</Label>
                <Input
                  id="pCollege"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pDepartment">Department</Label>
                <Input
                  id="pDepartment"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pYear">Year of Study</Label>
                <Input
                  id="pYear"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pOrg">Organization / Club (if organizer)</Label>
                <Input
                  id="pOrg"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

