import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Worrek home"
      className={`inline-flex items-center leading-none font-extrabold ${
        compact
          ? "gap-[5px] text-[20px] tracking-[-0.8px] text-[#353c48] max-[651px]:text-[18px]"
          : "gap-[9px] text-[29px] tracking-[-1.4px] max-[651px]:gap-[6px] max-[651px]:text-[25px]"
      }`}
    >
      <Image
        src="/mark.svg"
        alt=""
        width={compact ? 25 : 34}
        height={compact ? 25 : 34}
        className={
          compact ? "max-[651px]:size-[23px]" : "max-[651px]:size-[30px]"
        }
      />
      Worrek
    </Link>
  );
}
