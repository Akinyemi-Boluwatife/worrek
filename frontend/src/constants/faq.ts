export type FAQEntry = {
  question: string;
  paragraphs: string[];
};

export const FAQ_ITEMS = [
  {
    question: "What is Worrek?",
    paragraphs: [
      "Worrek is an AI-powered document editor that brings familiar word-processing tools and AI into one workspace. You can write, edit, format, and improve documents while using the built-in AI assistant to help rewrite content, summarize text, refine ideas, and make document work faster and easier.",
    ],
  },
  {
    question: "Can I use Worrek for free?",
    paragraphs: [
      "Yes. Worrek will include a free plan for users who want to create and edit documents and try its AI features. Paid plans will provide higher usage limits and additional capabilities for people who use Worrek more extensively.",
    ],
  },
  {
    question: "What is an AI document editor?",
    paragraphs: [
      "An AI document editor combines a traditional word processor with an AI assistant that can understand and work directly with your document.",
      "Instead of copying text between a document editor and a separate AI chatbot, you can write, format, rewrite, summarize, and improve your content from the same workspace.",
    ],
  },
  {
    question:
      "How is an AI document editor different from an AI document generator?",
    paragraphs: [
      "An AI document generator mainly creates content or files from a prompt.",
      "Worrek is designed to be a complete editing workspace. You can create a document yourself, open an existing one, format and edit it normally, and use AI whenever you need help with writing, rewriting, reviewing, or improving the document.",
    ],
  },
  {
    question: "What can Worrek’s AI help me do?",
    paragraphs: [
      "Worrek’s AI can assist with tasks such as rewriting text, improving clarity, fixing grammar, changing tone, summarizing content, expanding ideas, shortening sections, brainstorming, and helping you work through larger documents.",
      "The AI works alongside the editor so you can make changes without constantly leaving your document.",
    ],
  },
  {
    question: "Can Worrek edit Word documents?",
    paragraphs: [
      "Worrek is being designed with Word documents in mind, including support for working with DOCX files. The goal is to let you open a Word document, edit and format it, use AI to improve the content, and export your work when you’re finished.",
    ],
  },
  {
    question: "Is Worrek secure?",
    paragraphs: [
      "Worrek is being built with document privacy and security as an important part of the product. Documents and AI interactions will be handled using secure infrastructure and appropriate protections for user data.",
      "More detailed information about storage, encryption, sharing, and data retention will be published before launch.",
    ],
  },
];
