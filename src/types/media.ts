export interface Media {
  id: number;
  title: string;
  posterPath: string;
  type: "movie" | "tv" | "book";
  releaseDate?: string;
  overview?: string;
  authors?: string[]; // For books
}

export interface RankedMedia extends Media {
  rank: number;
  rating?: number; // The 5-star rating after bell curve fitting
}

export interface MediaList {
  id: string;
  name: string;
  listType: "movie" | "tv" | "book"; // The type of media in this list
  items: RankedMedia[];
  createdAt: string;
  updatedAt: string;
}
