import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

declare global {
  var emptyCarriageDb: Database | undefined;
  var emptyCarriagePool: Pool | undefined;
}

export function getDb(): Database | null {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!globalThis.emptyCarriageDb) {
    globalThis.emptyCarriagePool = new Pool({ connectionString });
    globalThis.emptyCarriageDb = drizzle(globalThis.emptyCarriagePool, { schema });
  }

  return globalThis.emptyCarriageDb;
}
