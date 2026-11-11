import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/utils/format";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  college: z.string().min(2, "College name is required"),
  department: z.string().optional(),
  yearOfStudy: z.string().optional(),
  requestedRole: z.enum(["participant", "organizer"]),
  organizationName: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const nextPath = searchParams.get("next") || "/";
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"login" | "register">(initialMode);
  const [verificationSent, setVerificationSent] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      requestedRole: "participant",
    },
  });

  const requestedRole = registerForm.watch("requestedRole");

  const handleLogin = async (values: LoginValues) => {
    try {
      await signIn(values.email, values.password);
      toast({
        title: "Welcome back",
        description: "Signed in to Eventra successfully.",
        variant: "success",
      });
      navigate(nextPath);
    } catch (err) {
      toast({
        title: "Sign In Failed",
        description: getErrorMessage(err, "Invalid email or password."),
        variant: "error",
      });
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    try {
      const res = await signUp(values);
      if (res.requiresEmailConfirmation) {
        setVerificationSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Check your inbox to verify your email before logging in.",
          variant: "success",
        });
      } else {
        toast({
          title: "Account Created",
          description:
            values.requestedRole === "organizer"
              ? "Your organizer request is pending administrator approval."
              : "Your Eventra account is ready.",
          variant: "success",
        });
        navigate(nextPath);
      }
    } catch (err) {
      toast({
        title: "Registration Failed",
        description: getErrorMessage(err, "Could not create account."),
        variant: "error",
      });
    }
  };

  if (verificationSent) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <MailCheck className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3">Verify Your Email</CardTitle>
            <CardDescription>
              We sent a verification link to your inbox. Click the link to activate your
              Eventra account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setVerificationSent(false);
                setTab("login");
              }}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#A78BFA]/30 bg-[#8B5CF6]/15 text-[#A78BFA]">
          <Ticket className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Welcome to Eventra
        </h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Discover campus events, manage tickets, or host experiences.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="loginEmail">Email Address</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="you@college.edu"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loginPassword">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#A78BFA] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="loginPassword"
                    type="password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-rose-400">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Account Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => registerForm.setValue("requestedRole", "participant")}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        requestedRole === "participant"
                          ? "border-[#A78BFA] bg-[#A78BFA]/10 text-white"
                          : "border-zinc-800 bg-[#09090B] text-[#A1A1AA]"
                      }`}
                    >
                      <div className="font-semibold">Student / Visitor</div>
                      <div className="mt-0.5 text-[11px] opacity-80">
                        Discover & register
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => registerForm.setValue("requestedRole", "organizer")}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        requestedRole === "organizer"
                          ? "border-[#A78BFA] bg-[#A78BFA]/10 text-white"
                          : "border-zinc-800 bg-[#09090B] text-[#A1A1AA]"
                      }`}
                    >
                      <div className="font-semibold">Event Organizer</div>
                      <div className="mt-0.5 text-[11px] opacity-80">
                        Requires admin approval
                      </div>
                    </button>
                  </div>
                </div>

                {requestedRole === "organizer" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="organizationName">Club / Organization Name</Label>
                    <Input
                      id="organizationName"
                      placeholder="e.g., IEEE Student Branch"
                      {...registerForm.register("organizationName")}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...registerForm.register("fullName")} />
                    {registerForm.formState.errors.fullName && (
                      <p className="text-xs text-rose-400">
                        {registerForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="regEmail">Email</Label>
                    <Input
                      id="regEmail"
                      type="email"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-rose-400">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="9876543210"
                      {...registerForm.register("phone")}
                    />
                    {registerForm.formState.errors.phone && (
                      <p className="text-xs text-rose-400">
                        {registerForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="college">College Name</Label>
                    <Input id="college" {...registerForm.register("college")} />
                    {registerForm.formState.errors.college && (
                      <p className="text-xs text-rose-400">
                        {registerForm.formState.errors.college.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="CSE / ECE"
                      {...registerForm.register("department")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="yearOfStudy">Year of Study</Label>
                    <Input
                      id="yearOfStudy"
                      placeholder="2nd Year"
                      {...registerForm.register("yearOfStudy")}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="regPassword">Password</Label>
                    <Input
                      id="regPassword"
                      type="password"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-rose-400">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <span>
                    All new accounts start with standard participant permissions.
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerForm.formState.isSubmitting}
                >
                  {registerForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Eventra Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

