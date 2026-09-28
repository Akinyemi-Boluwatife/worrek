import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/_components/landing/brand";
import { WaitlistForm } from "@/_components/waitlist/waitlistForm";
import Footer from "../../_components/shared/footer";

export const metadata: Metadata = {
  title: "Join the waitlist — Worrek",
  description:
    "Request early access to Worrek, the document editor with built-in writing and editing assistance.",
};

export default function WaitlistPage() {
  return (
    <>
      <a
        href="#waitlist-form"
        className="absolute top-[10px] left-[10px] z-10 -translate-y-[160%] bg-white p-3 focus:translate-y-0"
      >
        Skip to waitlist form
      </a>
      <header className="page-wrap flex h-28 items-center justify-between max-[651px]:h-[86px]">
        <Brand />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#d4d8de] px-[19px] text-[11px] font-[650] transition-colors hover:border-[#b8cbed] hover:bg-brand-light motion-reduce:transition-none max-[651px]:min-h-[41px] max-[651px]:px-[14px] max-[651px]:text-[10px]"
        >
          Back to home
        </Link>
      </header>

      <main className="page-wrap grid min-h-[calc(100svh-217px)] grid-cols-[minmax(0,0.9fr)_minmax(440px,0.76fr)] items-center gap-[clamp(64px,8vw,128px)] py-14 max-[950px]:grid-cols-1 max-[950px]:gap-12 max-[950px]:pt-10 max-[651px]:py-8">
        <section className="max-w-[590px] max-[950px]:mx-auto max-[950px]:text-center">
          <h1 className="mt-6 text-[clamp(58px,5.6vw,80px)] leading-[1.05] font-[650] tracking-[-4.6px] max-[651px]:mt-5 max-[651px]:text-[44px] max-[651px]:tracking-[-2.5px] max-[375px]:text-[38px]">
            Be first in line.
            <span className="mt-1 block text-brand">Work smarter, sooner.</span>
          </h1>
          <p className="mt-7 max-w-[510px] text-[16px] leading-[1.85] text-muted max-[950px]:mx-auto max-[651px]:mt-5 max-[651px]:text-[14px]">
            Join the waitlist for product updates and an invitation when Worrek
            is ready for early users.
          </p>
        </section>

        <div id="waitlist-form" tabIndex={-1} className="outline-none">
          <WaitlistForm />
        </div>
      </main>

      <Footer />
    </>
  );
}
