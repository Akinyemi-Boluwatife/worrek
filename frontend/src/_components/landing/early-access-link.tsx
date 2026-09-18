import Link from "next/link";

export function EarlyAccessLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/waitlist"
      className={`inline-flex items-center justify-center rounded-lg border font-[650] transition-colors duration-180 motion-reduce:transition-none ${
        compact
          ? "min-h-11 border-[#d4d8de] px-[19px] text-[11px] hover:border-[#b8cbed] hover:bg-brand-light max-[651px]:min-h-[41px] max-[651px]:px-[14px] max-[651px]:text-[10px]"
          : "min-h-[55px] border-transparent bg-brand px-[25px] text-[13px] text-white hover:bg-brand-hover max-[651px]:min-h-[51px] max-[651px]:px-[22px] max-[651px]:text-[12px]"
      }`}
    >
      {compact ? "Join waitlist" : "Request early access"}
    </Link>
  );
}
