import Link from "next/link";

import { Brand } from "@/_components/landing/brand";

export default function NotFound() {
  return (
    <>
      <header className="page-wrap flex h-28 items-center max-[651px]:h-[86px]">
        <Brand />
      </header>

      <main className="page-wrap flex flex-1 flex-col items-center justify-center py-14 text-center max-[651px]:py-10">
        <p className="text-[12px] font-[650] tracking-[0.18em] text-brand uppercase">
          404
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.2vw,54px)] leading-[1.1] font-[650] tracking-[-2.4px] max-[651px]:text-[34px] max-[651px]:tracking-[-1.6px]">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-5 max-w-[430px] text-[14px] leading-[1.85] text-muted max-[651px]:text-[13px]">
          The page you&apos;re looking for may have been moved or removed.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-[51px] items-center rounded-lg bg-brand px-[25px] text-[13px] font-[650] text-white transition-colors hover:bg-brand-hover max-[651px]:min-h-[47px] max-[651px]:px-[22px] max-[651px]:text-[12px]"
        >
          Back to home
        </Link>
      </main>
    </>
  );
}
