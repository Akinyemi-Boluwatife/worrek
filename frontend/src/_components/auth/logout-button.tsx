"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/_lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function onLogout() {
    setIsPending(true);
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void onLogout()}
      disabled={isPending}
      className="shrink-0 cursor-pointer rounded-md border border-[#d9dde4] bg-white px-2.5 py-1.5 text-[12px] font-[650] text-foreground hover:border-[#b8cbed] disabled:cursor-not-allowed disabled:opacity-65"
    >
      {isPending ? "Logging out…" : "Log out"}
    </button>
  );
}
