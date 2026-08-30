import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (see Neon console).");
}

const globalForDb = globalThis as unknown as { postgresClient?: postgres.Sql };

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
