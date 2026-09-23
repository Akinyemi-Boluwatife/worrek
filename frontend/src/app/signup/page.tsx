import type { Metadata } from "next";

import { AuthHeader } from "@/_components/auth/auth-header";
import { SignupCard } from "@/_components/auth/signup-card";

export const metadata: Metadata = {
  title: "Create your account — Worrek",
  description:
    "Create a Worrek account to write, edit, and improve Word documents.",
};

export default function SignupPage() {
  return (
    <>
      <AuthHeader />

      <main className="page-wrap flex flex-1 items-center justify-center py-14 max-[651px]:py-10">
        <SignupCard />
      </main>
    </>
  );
}
