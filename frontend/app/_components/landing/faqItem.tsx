import type { FAQEntry } from "@/app/constants/faq";

type FAQItemProps = {
  item: FAQEntry;
  index: number;
};

export function FAQItem({ item, index }: FAQItemProps) {
  const { question, paragraphs } = item;

  return (
    <details
      open={index === 0}
      className="group border-b border-[#d9dde4]"
    >
      <summary className="flex min-h-[81px] cursor-pointer list-none items-center justify-between gap-7 px-[3px] text-[16px] leading-[1.45] font-semibold tracking-[-0.2px] text-[#333b49] focus-visible:rounded-[2px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand max-[951px]:min-h-[74px] max-[951px]:text-[14px] max-[651px]:min-h-[70px] max-[651px]:gap-[18px] max-[651px]:px-px max-[651px]:text-[13px] max-[375px]:text-[12px] [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="relative size-6 shrink-0 rounded-full border border-[#d3dbe9] transition-[background,border-color,transform] duration-180 before:absolute before:top-[11px] before:left-[7px] before:h-px before:w-2 before:bg-[#7087ad] after:absolute after:top-[11px] after:left-[7px] after:h-px after:w-2 after:rotate-90 after:bg-[#7087ad] after:transition-transform after:duration-180 group-open:rotate-180 group-open:border-brand group-open:bg-brand group-open:before:bg-white group-open:after:rotate-0 group-open:after:bg-white group-hover:group-not-open:border-[#bdcdec] group-hover:group-not-open:bg-brand-light motion-reduce:transition-none motion-reduce:after:transition-none max-[651px]:size-[23px] max-[651px]:before:top-[10px] max-[651px]:after:top-[10px]"
        />
      </summary>
      <div className="max-w-[695px] pr-[58px] pb-[31px] pl-[3px] text-[13px] leading-[1.8] text-[#6d7480] max-[951px]:pr-10 max-[951px]:text-[12px] max-[651px]:pr-[38px] max-[651px]:pb-[25px] max-[651px]:pl-px max-[651px]:leading-[1.75] max-[375px]:pr-7 max-[375px]:text-[11px]">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="not-first:mt-3">
            {paragraph}
          </p>
        ))}
      </div>
    </details>
  );
}
