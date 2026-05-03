export type StationSearchResult = {
  station_id: string;
  name: string;
  routes: string[];
};

export type StationSearchRepository = {
  searchStations(query: string, limit: number): Promise<StationSearchResult[]>;
};

export async function searchStations(
  repository: StationSearchRepository,
  query: string,
  limit = 10,
): Promise<StationSearchResult[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  return repository.searchStations(normalizedQuery, limit);
}
