import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

type HyperdriveBinding = CloudflareBindings["HYPERDRIVE"];

export async function createDb(hyperdrive: HyperdriveBinding) {
  const client = new Client({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    ssl: false,
  });

  await client.connect();

  return {
    db: drizzle({ client }),
    client,
  };
}
