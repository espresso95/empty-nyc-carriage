import { asc, ilike } from "drizzle-orm";
import { getDb } from "../../db/client";
import { stations } from "../../db/schema";
import type { StationSearchRepository } from "./search";

export function getStationSearchRepository(): StationSearchRepository | null {
  const db = getDb();

  if (!db) {
    return null;
  }

  return {
    async searchStations(query: string, limit: number) {
      const rows = await db
        .select({
          stationId: stations.id,
          name: stations.name,
          routes: stations.routes,
        })
        .from(stations)
        .where(ilike(stations.name, `%${query}%`))
        .orderBy(asc(stations.name))
        .limit(limit);

      return rows.map((row) => ({
        station_id: row.stationId,
        name: row.name,
        routes: row.routes,
      }));
    },
  };
}
