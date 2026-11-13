import { NextRequest } from "next/server";
import { tmdb, apiError } from "@/lib/server";
export const revalidate = 300;
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") || "home";
  try {
    if (mode === "home" && !process.env.TMDB_ACCESS_TOKEN && !process.env.TMDB_API_KEY) {
      return Response.json({ error: "TMDB is not configured. Add TMDB_ACCESS_TOKEN or TMDB_API_KEY to the server environment." }, { status: 503 });
    }
    if (mode === "home") {
      const paths = [
        ["trending", "/trending/movie/week", {}],
        ["popular", "/movie/popular", { region: "IN" }],
        ["top", "/movie/top_rated", { region: "IN" }],
        ["tv", "/tv/popular", { region: "IN" }],
        ["kn", "/discover/movie", { with_original_language: "kn", sort_by: "popularity.desc" }],
        ["te", "/discover/movie", { with_original_language: "te", sort_by: "popularity.desc" }],
        ["ta", "/discover/movie", { with_original_language: "ta", sort_by: "popularity.desc" }],
        ["ml", "/discover/movie", { with_original_language: "ml", sort_by: "popularity.desc" }],
        ["hi", "/discover/movie", { with_original_language: "hi", sort_by: "popularity.desc" }],
        ["en", "/discover/movie", { with_original_language: "en", sort_by: "popularity.desc" }]
      ] as const;
      const results = await Promise.all(paths.map(async ([key, path, params]) => {
        try { const data = await tmdb<{ results?: any[] }>(path, params); return [key, (data.results || []).slice(0, 18)] as const; }
        catch (error) { console.error("TMDB section", key, error); return [key, []] as const; }
      }));
      const map = Object.fromEntries(results);
      const mixed = (items: any[], type: "movie" | "tv") => items.map(item => ({ ...item, media_type: type }));
      return Response.json({
        featured: mixed(map.trending || [], "movie").slice(0, 5),
        sections: [
          { key: "trending", title: "Trending Now", items: mixed(map.trending || [], "movie") },
          { key: "popular", title: "Popular Movies", items: mixed(map.popular || [], "movie") },
          { key: "top", title: "Top Rated", items: mixed(map.top || [], "movie") },
          { key: "tv", title: "Popular TV Shows", items: mixed(map.tv || [], "tv") },
          { key: "kn", title: "Kannada Movies", items: mixed(map.kn || [], "movie") },
          { key: "te", title: "Telugu Movies", items: mixed(map.te || [], "movie") },
          { key: "ta", title: "Tamil Movies", items: mixed(map.ta || [], "movie") },
          { key: "ml", title: "Malayalam Movies", items: mixed(map.ml || [], "movie") },
          { key: "hi", title: "Hindi Movies", items: mixed(map.hi || [], "movie") },
          { key: "en", title: "Hollywood & English", items: mixed(map.en || [], "movie") }
        ]
      });
    }
    if (mode === "search") {
      const q = (request.nextUrl.searchParams.get("q") || "").trim();
      if (q.length < 2) return Response.json({ results: [] });
      const type = request.nextUrl.searchParams.get("type") || "multi";
      const endpoint = type === "movie" ? "/search/movie" : type === "tv" ? "/search/tv" : "/search/multi";
      const page = Math.max(1, Math.min(500, Number(request.nextUrl.searchParams.get("page") || 1)));
      const year = request.nextUrl.searchParams.get("year") || undefined;
      const data = await tmdb<{ results?: any[]; total_pages?: number }>(endpoint, { query: q, page, year: type === "movie" ? year : undefined, first_air_date_year: type === "tv" ? year : undefined, include_adult: "false" });
      return Response.json({ results: (data.results || []).filter(item => item.media_type !== "person").map(item => ({ ...item, media_type: item.media_type || (type === "tv" ? "tv" : "movie") })), total_pages: data.total_pages || 1 });
    }
    if (mode === "popular-movies" || mode === "popular-tv") {
      const type = mode === "popular-tv" ? "tv" : "movie";
      const data = await tmdb<{ results?: any[] }>("/" + type + "/popular", { region: "IN" });
      return Response.json({ results: (data.results || []).map(item => ({ ...item, media_type: type })) });
    }
    if (mode === "details") {
      const id = request.nextUrl.searchParams.get("id") || "";
      const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
      if (!/^\d+$/.test(id)) return Response.json({ error: "A valid TMDB title ID is required." }, { status: 400 });
      const details = await tmdb<any>("/" + type + "/" + id, { append_to_response: "credits,videos,similar,recommendations" });
      return Response.json({ ...details, media_type: type });
    }
    return Response.json({ error: "Unknown catalogue mode." }, { status: 400 });
  } catch (error) { return apiError(error); }
}
