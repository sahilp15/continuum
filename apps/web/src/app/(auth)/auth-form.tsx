"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

/** Shared email + Google auth form. Real validation, loading, and error states. */
export function AuthForm({
  mode,
  returnTo,
  googleEnabled,
}: {
  mode: Mode;
  returnTo: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/home";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (isSignUp && !name.trim()) return setError("Enter your name.");

    setPending(true);
    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });
    setPending(false);

    if (result.error) {
      setError(
        result.error.message ||
          (isSignUp
            ? "Couldn't create your account. That email may already be registered."
            : "Invalid email or password."),
      );
      return;
    }
    router.push(destination);
    router.refresh();
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: destination,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error.message ?? "Google sign-in failed. Please try again.");
    }
    // On success the browser is redirected to Google; no local navigation needed.
  }

  return (
    <div>
      <h1 className="font-display text-3xl">
        {isSignUp ? "Create your Continuum" : "Welcome back"}
      </h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        {isSignUp
          ? "One shared, permission-based context layer for every AI you use."
          : "Sign in to your context, everywhere."}
      </p>

      {googleEnabled ? (
        <>
          <button
            type="button"
            onClick={onGoogle}
            disabled={pending}
            className="btn-secondary mt-6 w-full justify-center text-sm disabled:opacity-60"
          >
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-(--cn-text-tertiary)">
            <span className="h-px flex-1 bg-(--cn-border)" />
            or
            <span className="h-px flex-1 bg-(--cn-border)" />
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4" noValidate>
        {isSignUp ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2"
              required
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2"
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p role="alert" aria-live="assertive" className="text-sm text-(--cn-error)">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary mt-1 w-full justify-center text-sm disabled:opacity-60"
        >
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {isSignUp ? (
        <p className="mt-6 text-sm text-(--cn-text-secondary)">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}

      <p className="mt-6 text-sm text-(--cn-text-secondary)">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-(--cn-accent) underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Continuum?{" "}
            <Link href="/sign-up" className="font-medium text-(--cn-accent) underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
