import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/services/supabase";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/utils/format";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast({
        title: "Reset Failed",
        description: getErrorMessage(err, "Unable to send reset link."),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link
        to="/auth?mode=login"
        className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Login
      </Link>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your account email and we will send a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center py-4 text-center">
              <MailCheck className="h-10 w-10 text-emerald-400" />
              <p className="mt-3 text-sm text-white">
                Check <span className="font-semibold">{email}</span> for your reset link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="resetEmail">Email Address</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

