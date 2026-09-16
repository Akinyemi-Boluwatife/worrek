"use client";

import { useForm, type SubmitHandler } from "react-hook-form";

type WaitlistFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  referralPlatform: string;
  marketingConsent: boolean;
};

const labelClassName = "block text-[12px] font-semibold text-[#424955]";
const errorClassName = "mt-2 text-[11px] leading-relaxed text-[#b24d4d]";

function fieldClassName(hasError = false) {
  return `mt-2 h-12 w-full rounded-lg border bg-white px-4 text-[14px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-[#a0a6b0] focus:ring-3 motion-reduce:transition-none ${
    hasError
      ? "border-[#d98b8b] focus:border-[#c85c5c] focus:ring-[#f8e2e2]"
      : "border-[#d9dde4] focus:border-brand focus:ring-[#dce7ff]"
  }`;
}

export function WaitlistForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistFormValues>({
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      referralPlatform: "",
      marketingConsent: false,
    },
  });

  const onSubmit: SubmitHandler<WaitlistFormValues> = () => undefined;

  return (
    <section className="rounded-xl border border-[#dce1e8] bg-white p-8 shadow-[0_16px_40px_-32px_#35466852] max-[651px]:p-5">
      <div>
        <h2 className="text-[24px] leading-tight font-[650] tracking-[-0.8px]">
          Request early access
        </h2>
        <p className="mt-2 text-[12px] leading-[1.7] text-muted">
          Tell us a little about you. We’ll be in touch when Worrek is ready.
        </p>
      </div>

      <form className="mt-8" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <label className={labelClassName}>
            First name <span className="text-brand">*</span>
            <input
              {...register("firstName", {
                required: "Enter your first name.",
                maxLength: {
                  value: 100,
                  message: "Use 100 characters or fewer.",
                },
              })}
              className={fieldClassName(Boolean(errors.firstName))}
              type="text"
              autoComplete="given-name"
              placeholder="Ada"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? "first-name-error" : undefined
              }
            />
            {errors.firstName ? (
              <span id="first-name-error" className={errorClassName}>
                {errors.firstName.message}
              </span>
            ) : null}
          </label>
          <label className={labelClassName}>
            Last name
            <input
              {...register("lastName", {
                required: "Enter your last name.",
                maxLength: {
                  value: 100,
                  message: "Use 100 characters or fewer.",
                },
              })}
              className={fieldClassName(Boolean(errors.lastName))}
              type="text"
              autoComplete="family-name"
              placeholder="Lovelace"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "last-name-error" : undefined}
            />
            {errors.lastName ? (
              <span id="last-name-error" className={errorClassName}>
                {errors.lastName.message}
              </span>
            ) : null}
          </label>
        </div>

        <label className={`${labelClassName} mt-5`}>
          Email address <span className="text-brand">*</span>
          <input
            {...register("email", {
              required: "Enter your email address.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address.",
              },
              maxLength: {
                value: 255,
                message: "Use 255 characters or fewer.",
              },
            })}
            className={fieldClassName(Boolean(errors.email))}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <span id="email-error" className={errorClassName}>
              {errors.email.message}
            </span>
          ) : null}
        </label>

        <label className={`${labelClassName} mt-5`}>
          How did you hear about Worrek?
          <select
            {...register("referralPlatform")}
            className={`${fieldClassName()} appearance-none bg-[linear-gradient(45deg,transparent_50%,#89919e_50%),linear-gradient(135deg,#89919e_50%,transparent_50%)] bg-[position:calc(100%_-_18px)_20px,calc(100%_-_13px)_20px] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-10`}
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
            {...register("marketingConsent")}
            className="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
            type="checkbox"
          />
          <span>
            Send me occasional product updates and early-access news. I can
            unsubscribe at any time.
          </span>
        </label>

        <button
          className="mt-7 flex min-h-[52px] w-full items-center justify-center rounded-lg bg-brand px-6 text-[13px] font-[650] text-white transition-colors hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand motion-reduce:transition-none"
          type="submit"
        >
          Join the waitlist
        </button>

        <p className="mt-4 text-center text-[10px] leading-[1.6] text-[#969da8]">
          No spam. Just launch news and useful product updates.
        </p>
      </form>
    </section>
  );
}
