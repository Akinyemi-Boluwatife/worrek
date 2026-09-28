import type { Feature } from "@/constants/features";

import { FeatureItem } from "./featureItem";

type FeaturesListProps = {
  features: readonly Feature[];
};

export function FeaturesList({ features }: FeaturesListProps) {
  return (
    <div className="space-y-[132px] max-[1200px]:space-y-[118px] max-[901px]:space-y-[108px] max-[651px]:space-y-[91px]">
      {features.map((feature, index) => (
        <FeatureItem key={feature.title} feature={feature} index={index} />
      ))}
    </div>
  );
}
