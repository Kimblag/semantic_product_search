import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import { useAuth } from "../../auth/useAuth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signIn, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? "/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate, redirectTo]);

  function getLoginErrorMessage(error: unknown): string {
    const status = getAxiosStatus(error);
    if (status === 401) {
      return "Invalid credentials. Check your email and password.";
    }
    if (status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }

    const message = getAxiosErrorMessage(error);
    if (message) return message;

    return "Unable to sign in right now. Please try again.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: normalizedEmail, password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
  
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-input bg-card shadow-lg md:grid-cols-2 animate-rise">
        {/* Sidebar */}
        <aside className="relative hidden overflow-hidden bg-linear-to-br from-primary to-primary/80 p-8 text-primary-foreground md:flex md:flex-col md:justify-between">
          <div className="relative z-10 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide font-semibold">
                SPS Platform
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight">
                Orchestrate your product strategy.
              </h1>
              <p className="mt-4 max-w-sm text-sm text-primary-foreground/90">
                Manage requirements, optimize supplier relationships, and
                automate product matching. Everything you need to scale your
                operations.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary-foreground/80">
                  Key Features
                </h3>
                <ul className="space-y-2 text-xs text-primary-foreground/80">
                  <li className="flex items-start gap-3">
                    <span className="text-primary-foreground mt-1">✓</span>
                    <span>Centralized requirement tracking and management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary-foreground mt-1">✓</span>
                    <span>
                      Intelligent product matching and recommendations
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary-foreground mt-1">✓</span>
                    <span>Real-time supplier and inventory insights</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

   
          <div className="pointer-events-none absolute right-4 top-4 h-32 w-32 rounded-full border border-white/12" />
          <div className="pointer-events-none absolute bottom-8 left-8 h-20 w-20 rounded-full bg-white/10" />
        </aside>

        {/* Form Section */}
        <div className="flex flex-col items-center justify-center bg-background px-6 py-12 sm:px-10 md:px-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access your product management dashboard.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    disabled={isSubmitting}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:text-primary/90 transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Remember Me */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <span className="text-sm font-medium">Keep me signed in</span>
              </label>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>

              {/* Sign Up CTA */}
              <p className="text-center text-xs text-muted-foreground">
                Need an account?{" "}
                <span className="font-semibold text-foreground">
                  Reach out to your administrator
                </span>
                .
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-wide text-muted-foreground">
        <button
          type="button"
          className="hover:text-foreground transition-colors"
        >
          Privacy
        </button>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <button
          type="button"
          className="hover:text-foreground transition-colors"
        >
          Terms
        </button>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <span>© 2026 SPS</span>
      </footer>
    </main>
  );
}
