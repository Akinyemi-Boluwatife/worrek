import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

type HyperdriveBinding = CloudflareBindings["HYPERDRIVE"];

export async function createDb(hyperdrive: HyperdriveBinding) {
  const client = new Client({
    connectionString: hyperdrive.connectionString,
  });

  await client.connect();

  return drizzle({ client });
}
