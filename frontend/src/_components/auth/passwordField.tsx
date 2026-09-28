"use client";

import { useState } from "react";

import { authFieldClassName, authLabelClassName } from "./formStyles";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {off ? (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 8.6 4 9.7 7a11.6 11.6 0 0 1-3.4 4.5M6.2 6.4A11.6 11.6 0 0 0 2.3 12C3.4 15 7 19 12 19a9.7 9.7 0 0 0 3.4-.6" />
        </>
      ) : (
        <>
          <path d="M2.3 12C3.4 9 7 5 12 5s8.6 4 9.7 7c-1.1 3-4.7 7-9.7 7s-8.6-4-9.7-7Z" />
          <circle cx="12" cy="12" r="2.6" />
        </>
      )}
    </svg>
  );
}

export function PasswordField({
  value,
  onChange,
  autoComplete,
  placeholder = "Your password",
  minLength,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className={`${authLabelClassName} mt-5`}>
      Password
      <span className="relative mt-2 block">
        <input
          className={`${authFieldClassName} pr-12`}
          type={isVisible ? "text" : "password"}
          name="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted transition-colors hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand motion-reduce:transition-none"
        >
          <EyeIcon off={isVisible} />
        </button>
      </span>
    </label>
  );
}
