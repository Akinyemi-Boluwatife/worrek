import { FEATURES } from "@/constants/features";
import { FeaturesList } from "./featuresList";

export function Features() {
  return (
    <section
      className="page-wrap pt-[154px] max-[1200px]:pt-[132px] max-[951px]:pt-28 max-[651px]:w-[calc(100%_-_24px)] max-[651px]:pt-24"
      aria-labelledby="why-title"
    >
      <header className="mx-auto mb-[100px] max-w-[710px] text-center max-[951px]:mb-[82px] max-[651px]:mb-[70px]">
        <p className="mb-6 text-[9px] font-[650] tracking-[1.8px] text-[#7e8795] max-[651px]:mb-[17px] max-[651px]:text-[7px] max-[651px]:leading-[1.6] max-[651px]:tracking-[1.3px]">
          BUILT FOR THE WAY DOCUMENTS ACTUALLY GET DONE.
        </p>
        <h2
          id="why-title"
          className="text-[clamp(58px,5.25vw,76px)] leading-[1.08] font-[650] tracking-[-4.5px] max-[651px]:text-[45px] max-[651px]:tracking-[-2.7px] max-[375px]:text-[40px]"
        >
          Why use <span>Worrek?</span>
        </h2>
        <p className="mx-auto mt-[25px] max-w-[490px] text-[14px] leading-[1.8] text-muted max-[651px]:mt-[18px] max-[651px]:text-[12px]">
          Keep the tools you know. Bring AI into the document when it helps.
        </p>
      </header>
      <FeaturesList features={FEATURES} />
    </section>
  );
}
