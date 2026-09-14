import { connection } from "next/server";

type HealthResponse = {
  status: string;
};

export default async function Home() {
  await connection();

  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  const healthUrl = new URL("/api/health", apiUrl);
  const response = await fetch(healthUrl, { cache: "no-store" });

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
