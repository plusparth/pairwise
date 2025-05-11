import { Media } from "../types/media";

// This will be replaced with your actual TMDB API key
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  overview: string;
}

export interface TMDBTvShow {
  id: number;
  name: string;
  poster_path: string;
  first_air_date: string;
  overview: string;
}

export interface SearchResponse {
  page: number;
  results: (TMDBMovie | TMDBTvShow)[];
  total_results: number;
  total_pages: number;
}

export async function searchMedia(
  query: string,
  type: "movie" | "tv"
): Promise<Media[]> {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB API key is not set");
  }

  const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url);
    const data: SearchResponse = await response.json();

    return data.results.map((item) => {
      if (type === "movie") {
        const movie = item as TMDBMovie;
        return {
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          releaseDate: movie.release_date,
          overview: movie.overview,
          type: "movie",
        };
      } else {
        const tvShow = item as TMDBTvShow;
        return {
          id: tvShow.id,
          title: tvShow.name,
          posterPath: tvShow.poster_path,
          releaseDate: tvShow.first_air_date,
          overview: tvShow.overview,
          type: "tv",
        };
      }
    });
  } catch (error) {
    console.error("Error searching TMDB:", error);
    return [];
  }
}
