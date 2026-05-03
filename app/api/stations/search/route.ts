import { NextResponse } from "next/server";
import { getStationSearchRepository } from "@/src/lib/stations/drizzle-repository";
import { searchStations } from "@/src/lib/stations/search";

export async function GET(request: Request) {
  const repository = getStationSearchRepository();

  if (!repository) {
    return NextResponse.json(
      {
        error: "Set DATABASE_URL and import stations to enable search.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const results = await searchStations(repository, query);

  return NextResponse.json(results);
}
