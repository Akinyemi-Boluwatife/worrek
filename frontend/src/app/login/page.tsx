import type { Metadata } from "next";

import { AuthHeader } from "@/_components/auth/auth-header";
import { LoginCard } from "@/_components/auth/login-card";

export const metadata: Metadata = {
  title: "Sign in — Worrek",
  description:
    "Sign in to your Worrek account to write and edit Word documents.",
};

export default function LoginPage() {
  return (
    <>
      <AuthHeader />

      <main className="page-wrap flex flex-1 items-center justify-center py-14 max-[651px]:py-10">
        <LoginCard />
      </main>
    </>
  );
}
