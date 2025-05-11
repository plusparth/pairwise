import { Media } from "../types/media";

const OPENLIBRARY_BASE_URL = "https://openlibrary.org";

// Interface for OpenLibrary search result
export interface OpenLibraryBook {
  key: string; // The book ID (e.g., "/works/OL45804W")
  title: string;
  author_name?: string[];
  cover_i?: number; // Cover ID
  first_publish_year?: number;
  description?: string;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryBook[];
}

// Function to search for books
export async function searchBooks(query: string): Promise<Media[]> {
  const url = `${OPENLIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(
    query
  )}&limit=20`;

  try {
    const response = await fetch(url);
    const data: OpenLibrarySearchResponse = await response.json();

    return data.docs.map((book) => {
      // Extract the work ID from the key (e.g., "OL45804W" from "/works/OL45804W")
      const idMatch = book.key.match(/\/works\/(.+)/);
      const bookId = idMatch
        ? parseInt(idMatch[1].replace(/\D/g, ""))
        : Math.floor(Math.random() * 1000000);

      // Build the cover URL if cover_i exists
      let posterPath = "";
      if (book.cover_i) {
        posterPath = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
      }

      return {
        id: bookId,
        title: book.title,
        posterPath,
        type: "book" as const,
        releaseDate: book.first_publish_year
          ? book.first_publish_year.toString()
          : undefined,
        overview: book.description,
        authors: book.author_name,
      };
    });
  } catch (error) {
    console.error("Error searching OpenLibrary:", error);
    return [];
  }
}
