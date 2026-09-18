"use client";

import { joinWaitlist } from "@/_lib/api";
import { useActionState } from "react";

const labelClassName = "block text-[12px] font-semibold text-[#424955]";
const fieldClassName =
  "mt-2 h-12 w-full rounded-lg border border-[#d9dde4] bg-white px-4 text-[14px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-[#a0a6b0] focus:border-brand focus:ring-3 focus:ring-[#dce7ff] motion-reduce:transition-none";

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, {
    success: false,
    message: "",
  });

  return (
    <section className="rounded-xl border border-[#dce1e8] bg-white p-8 shadow-[0_16px_40px_-32px_#35466852] max-[651px]:p-5">
      <div>
        <h2 className="text-[24px] leading-tight font-[650] tracking-[-0.8px]">
          Request early access
        </h2>
        <p className="mt-2 text-[12px] leading-[1.7] text-muted">
          Tell us a little about you. We&apos;ll be in touch when Worrek is
          ready.
        </p>
      </div>

      <form action={formAction} className="mt-8" aria-busy={isPending}>
        <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <label className={labelClassName}>
            First name <span className="text-brand">*</span>
            <input
              className={fieldClassName}
              type="text"
              name="firstName"
              autoComplete="given-name"
              placeholder="Daniel"
              required
              maxLength={100}
            />
          </label>

          <label className={labelClassName}>
            Last name
            <input
              className={fieldClassName}
              type="text"
              name="lastName"
              autoComplete="family-name"
              placeholder="Patrick"
              maxLength={100}
            />
          </label>
        </div>

        <label className={`${labelClassName} mt-5`}>
          Email address <span className="text-brand">*</span>
          <input
            className={fieldClassName}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            maxLength={255}
          />
        </label>

        <label className={`${labelClassName} mt-5`}>
          How did you hear about Worrek?
          <select
            className={`${fieldClassName} appearance-none bg-[linear-gradient(45deg,transparent_50%,#89919e_50%),linear-gradient(135deg,#89919e_50%,transparent_50%)] bg-[position:calc(100%_-_18px)_20px,calc(100%_-_13px)_20px] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-10`}
            name="referralPlatform"
          >
            <option value="">Select an option</option>
            <option value="Search">Search</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="X">X</option>
            <option value="YouTube">YouTube</option>
            <option value="Reddit">Reddit</option>
            <option value="Friend or colleague">Friend or colleague</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[12px] leading-[1.7] text-[#69717e]">
          <input
            className="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
            type="checkbox"
            name="marketingConsent"
          />
          <span>
            Send me occasional product updates and early-access news. I can
            unsubscribe at any time.
          </span>
        </label>

        {state.message ? (
          <p
            className={`mt-6 rounded-lg px-4 py-3 text-[12px] leading-[1.6] ${
              state.success
                ? "bg-[#edf8f0] text-[#317044]"
                : "bg-[#fff1f1] text-[#9b4141]"
            }`}
            role={state.success ? "status" : "alert"}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="mt-7 flex min-h-[52px] w-full items-center justify-center rounded-lg bg-brand px-6 text-[13px] font-[650] text-white transition-colors hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-65 motion-reduce:transition-none"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Joining..." : "Join the waitlist"}
        </button>
      </form>
    </section>
  );
}
