"use client";

import { useState } from "react";

import { authClient } from "@/_lib/auth-client";
import {
  authButtonClassName,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
} from "./form-styles";
import { PasswordField } from "./password-field";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    setError("");
    setIsPending(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(
          signInError.message || "We couldn't sign you in. Please try again.",
        );
        return;
      }

      window.location.replace("/documents");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={isPending}>
      <label className={authLabelClassName}>
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
        autoComplete="current-password"
      />

      {error ? (
        <p className={authErrorClassName} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`${authButtonClassName} mt-7`}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
