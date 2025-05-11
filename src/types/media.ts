export interface Media {
  id: number;
  title: string;
  posterPath: string;
  type: "movie" | "tv";
  releaseDate?: string;
  overview?: string;
}

export interface RankedMedia extends Media {
  rank: number;
  rating?: number; // The 5-star rating after bell curve fitting
}

export interface MediaList {
  id: string;
  name: string;
  items: RankedMedia[];
  createdAt: string;
  updatedAt: string;
}
