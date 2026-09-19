import type { Feature } from "@/constants/features";

type FeatureItemProps = {
  feature: Feature;
  index: number;
};

export function FeatureItem({ feature, index }: FeatureItemProps) {
  const { title, description, Demo } = feature;

  return (
    <article
      className={`grid items-center gap-[clamp(54px,6.5vw,94px)] max-[1200px]:gap-12 max-[951px]:gap-[38px] max-[901px]:grid-cols-1 max-[901px]:gap-10 max-[651px]:gap-[31px] ${
        index % 2 === 1
          ? "min-[951px]:grid-cols-[minmax(560px,1.38fr)_minmax(260px,0.62fr)] min-[901px]:max-[951px]:grid-cols-[minmax(520px,1.42fr)_minmax(220px,0.58fr)] min-[901px]:[&>div:first-child]:col-start-2 min-[901px]:[&>div:first-child]:row-start-1 min-[901px]:[&>div:last-child]:col-start-1 min-[901px]:[&>div:last-child]:row-start-1"
          : "min-[951px]:grid-cols-[minmax(260px,0.62fr)_minmax(560px,1.38fr)] min-[901px]:max-[951px]:grid-cols-[minmax(220px,0.58fr)_minmax(520px,1.42fr)]"
      }`}
    >
      <div className="max-w-[400px] max-[901px]:max-w-[520px] max-[651px]:mx-auto max-[651px]:text-center">
        <h3 className="mb-[17px] text-[clamp(31px,2.65vw,38px)] leading-[1.16] font-[650] tracking-[-2px] max-[1200px]:text-[32px] max-[951px]:text-[29px] max-[951px]:tracking-[-1.5px] max-[901px]:text-[34px] max-[651px]:mt-[17px] max-[651px]:mb-[13px] max-[651px]:text-[29px] max-[651px]:tracking-[-1.4px] max-[375px]:text-[27px]">
          {title}
        </h3>
        <p className="text-[13px] leading-[1.9] text-[#6f7681] max-[951px]:text-[12px] max-[901px]:text-[13px] max-[651px]:text-[12px] max-[651px]:leading-[1.82]">
          {description}
        </p>
      </div>
      <Demo />
    </article>
  );
}
