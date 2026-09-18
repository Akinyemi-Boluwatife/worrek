import type { FAQEntry } from "@/constants/faq";

import { FAQItem } from "./faqItem";

type FAQListProps = {
  questions: FAQEntry[];
};

export function FAQList({ questions }: FAQListProps) {
  return (
    <div className="border-t border-[#d9dde4]">
      {questions.map((item, index) => (
        <FAQItem key={item.question} item={item} index={index} />
      ))}
    </div>
  );
}
