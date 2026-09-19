import { FAQ_ITEMS } from "@/constants/faq";

import { FAQList } from "./faqList";

export function Faq() {
  return (
    <section
      className="page-wrap grid grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] gap-x-[clamp(72px,10vw,150px)] pt-[142px] max-[951px]:grid-cols-[minmax(215px,0.65fr)_minmax(0,1.35fr)] max-[951px]:gap-x-[58px] max-[951px]:pt-[115px] max-[651px]:block max-[651px]:pt-[88px]"
      aria-labelledby="faq-title"
    >
      <div className="sticky top-14 self-start max-[651px]:static max-[651px]:text-center">
        <h2
          id="faq-title"
          className="text-[clamp(48px,4.65vw,67px)] leading-[1.08] font-[650] tracking-[-3.8px] max-[951px]:tracking-[-3px] max-[651px]:text-[40px] max-[651px]:leading-[1.1] max-[651px]:tracking-[-2.4px] max-[375px]:text-[36px]"
        >
          A little more
          <br />
          about <span>Worrek.</span>
        </h2>
        <p className="mt-[25px] max-w-[310px] text-[13px] leading-[1.8] text-muted max-[651px]:mx-auto max-[651px]:mt-[18px] max-[651px]:max-w-[290px] max-[651px]:text-[12px]">
          What it is, how it works, and what we’re building toward.
        </p>
      </div>
      <FAQList questions={FAQ_ITEMS} />
    </section>
  );
}
