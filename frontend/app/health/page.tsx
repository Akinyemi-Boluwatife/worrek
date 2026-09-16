import { connection } from "next/server";

import { api } from "@/lib/api";

type HealthResponse = {
  status: string;
};

export default async function HealthPage() {
  await connection();

  const response = await api.databaseHealth();

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  const health: HealthResponse = await response.json();

  return (
    <main>
      <h1>API status: {health.status}</h1>
    </main>
  );
}
