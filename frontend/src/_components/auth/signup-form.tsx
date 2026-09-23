"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/_lib/auth-client";
import {
  authButtonClassName,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
} from "./form-styles";
import { PasswordField } from "./password-field";

const strengthBars = [0, 1, 2, 3];

function scorePassword(value: string) {
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  return score;
}

function describeStrength(score: number) {
  if (score <= 1) return { label: "Weak", tone: "bg-[#e0574f]" };
  if (score === 2) return { label: "Fair", tone: "bg-[#e0a13f]" };
  if (score === 3) return { label: "Good", tone: "bg-brand" };
  return { label: "Strong", tone: "bg-[#3f9d6b]" };
}

export function SignupForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const score = password ? scorePassword(password) : 0;
  const strength = describeStrength(score);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    setError("");
    setIsPending(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (signUpError) {
        setError(
          signUpError.message ||
            "We couldn't create your account. Please try again.",
        );
        return;
      }

      router.push("/documents");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={isPending}>
      <label className={authLabelClassName}>
        Full name
        <input
          className={`${authFieldClassName} mt-2`}
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Daniel Patrick"
          required
          maxLength={255}
        />
      </label>

      <label className={`${authLabelClassName} mt-5`}>
        Email address
        <input
          className={`${authFieldClassName} mt-2`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          maxLength={255}
        />
      </label>

      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
      />

      <div className="mt-3" aria-live="polite">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {strengthBars.map((bar) => (
            <span
              key={bar}
              className={`h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none ${
                bar < score ? strength.tone : "bg-[#e6eaf0]"
              }`}
            />
          ))}
        </div>
        {password ? (
          <p className="mt-1.5 text-[11px] font-[650] text-muted">
            {strength.label} password
          </p>
        ) : null}
      </div>

      <p className="mt-5 text-[11px] leading-[1.7] text-muted">
        By creating an account, you agree to our{" "}
        <a
          href="#"
          className="font-[650] text-foreground underline underline-offset-2"
        >
          Terms
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="font-[650] text-foreground underline underline-offset-2"
        >
          Privacy Notice
        </a>
        .
      </p>

      {error ? (
        <p className={authErrorClassName} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`${authButtonClassName} mt-6`}
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
