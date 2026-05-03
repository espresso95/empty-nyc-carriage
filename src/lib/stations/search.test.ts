import { describe, expect, it } from "vitest";
import { searchStations, type StationSearchRepository } from "./search";

describe("searchStations", () => {
  it("does not query for too-short search terms", async () => {
    const repository = new FakeStationSearchRepository();

    await expect(searchStations(repository, "b")).resolves.toEqual([]);
    expect(repository.queries).toEqual([]);
  });

  it("normalizes query text and delegates to the repository", async () => {
    const repository = new FakeStationSearchRepository();

    await expect(searchStations(repository, "  bedford  ", 5)).resolves.toEqual([
      {
        station_id: "L08",
        name: "Bedford Av",
        routes: ["L"],
      },
    ]);
    expect(repository.queries).toEqual([{ query: "bedford", limit: 5 }]);
  });
});

class FakeStationSearchRepository implements StationSearchRepository {
  queries: Array<{ query: string; limit: number }> = [];

  async searchStations(query: string, limit: number) {
    this.queries.push({ query, limit });

    return [
      {
        station_id: "L08",
        name: "Bedford Av",
        routes: ["L"],
      },
    ];
  }
}
