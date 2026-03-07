import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import { useAuth } from "../../auth/useAuth";

function SearchSparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <circle cx="10" cy="10" r="6" />
      <path strokeLinecap="round" d="m15 15 5.2 5.2M8 10h4M10 8v4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path strokeLinecap="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const roleBadges = ["superuser", "admin", "executive"];

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
        <div className="absolute -left-32 -top-24 h-72 w-72 rounded-full bg-fern-700/35 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-dry-sage-700/30 blur-3xl" />
      </div>

      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-pine-teal-600/15 bg-dust-grey-900/70 shadow-[0_40px_70px_-45px_rgba(20,31,26,0.6)] backdrop-blur md:grid-cols-2 animate-rise">
        <aside className="relative hidden overflow-hidden bg-linear-to-br from-pine-teal-500 via-pine-teal-500 to-hunter-green-600 p-10 text-dust-grey-900 md:block">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Semantic Product Search
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight">
              Match products smarter, not harder.
            </h1>
            <p className="mt-4 max-w-sm text-sm text-dust-grey-800">
              Access the workspace to monitor requirements, providers, and
              matching activity in one operational cockpit.
            </p>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-dust-grey-700">
                Fixed system roles
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roleBadges.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  >
                    {role}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-dust-grey-800">
                Only <span className="font-semibold">admin</span> users can
                create new user accounts.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 h-36 w-36 rounded-full border border-white/12" />
          <div className="pointer-events-none absolute bottom-8 left-8 h-20 w-20 rounded-full bg-white/10" />
        </aside>

        <div className="bg-white px-6 py-8 sm:px-10 md:px-12 md:py-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-fern-700/15 text-fern-500">
              <SearchSparkIcon />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-pine-teal-300">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-pine-teal-600">
              Sign in to continue to your workspace.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-pine-teal-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pine-teal-600">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl border border-pine-teal-600/20 bg-dust-grey-900 px-10 text-sm text-pine-teal-300 outline-none transition focus:border-fern-500 focus:ring-2 focus:ring-fern-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-pine-teal-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-fern-500 hover:text-fern-400"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pine-teal-600">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl border border-pine-teal-600/20 bg-dust-grey-900 px-10 pr-11 text-sm text-pine-teal-300 outline-none transition focus:border-fern-500 focus:ring-2 focus:ring-fern-500/20"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pine-teal-600 hover:text-pine-teal-400"
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="rounded-xl border border-hunter-green-400/30 bg-hunter-green-900/8 px-3 py-2 text-xs font-medium text-hunter-green-200">
                  {errorMessage}
                </p>
              )}

              <label className="flex items-center gap-2 text-xs text-pine-teal-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-pine-teal-600/30 text-fern-500 focus:ring-fern-500"
                />
                Keep me signed in
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fern-500 text-sm font-semibold text-white transition hover:bg-fern-400"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
                <ArrowRightIcon />
              </button>

              <p className="pt-2 text-center text-xs text-pine-teal-600">
                No account yet?{" "}
                <span className="font-semibold text-pine-teal-300">
                  Contact an admin
                </span>
                .
              </p>
            </form>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-6 flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.12em] text-pine-teal-600">
        <span>Privacy</span>
        <span aria-hidden="true">/</span>
        <span>Terms</span>
        <span aria-hidden="true">/</span>
        <span>2026 SPS</span>
      </footer>
    </main>
  );
}
