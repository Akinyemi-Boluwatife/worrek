import {
  BiggerEditsDemo,
  InstructionsDemo,
  ReviewDemo,
  WorkflowDemo,
} from "@/app/_components/landing/feature-demos";
import type { ComponentType } from "react";

export type Feature = {
  title: string;
  description: string;
  Demo: ComponentType;
};

export const FEATURES = [
  {
    title: "Edit with simple instructions",
    description:
      "Tell Worrek what you want changed in plain language. Rewrite a paragraph, improve the tone, shorten a section, fix grammar, or make your writing clearer without leaving the document.",
    Demo: InstructionsDemo,
  },
  {
    title: "Handle bigger edits with AI",
    description:
      "Worrek can help with more than small text changes. Ask it to reorganize a section, improve document structure, rewrite multiple paragraphs, or make changes across a longer document while keeping the context in mind.",
    Demo: BiggerEditsDemo,
  },
  {
    title: "Write and improve in one workspace",
    description:
      "Write normally when you want to, then use AI whenever you need help. Worrek combines familiar document editing tools and AI in the same workspace, so you do not have to keep moving text between a word processor and a separate chatbot.",
    Demo: WorkflowDemo,
  },
  {
    title: "Stay in control of every change",
    description:
      "AI should help you edit, not take over your document. Review suggested changes before they become part of your work, then keep, adjust, or reject them.",
    Demo: ReviewDemo,
  },
] satisfies readonly Feature[];
