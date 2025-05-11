import React, { useState, useRef, useEffect } from "react";
import { Media, RankedMedia } from "../types/media";
import { searchMedia } from "../services/tmdb";
import { searchBooks } from "../services/openlibrary";
import MediaCard from "./MediaCard";

interface BatchMediaSelectionProps {
  existingSortedItems?: RankedMedia[];
  onComplete: (selectedMedia: Media[]) => void;
  onCancel: () => void;
  mediaType: "movie" | "tv" | "book";
}

const BatchMediaSelection: React.FC<BatchMediaSelectionProps> = ({
  existingSortedItems = [],
  onComplete,
  onCancel,
  mediaType,
}) => {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv" | "book">(
    mediaType
  );
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Reference to the search input for focusing
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected media with existing items
  useEffect(() => {
    if (existingSortedItems.length > 0) {
      setSelectedMedia([...existingSortedItems]);
    }
  }, [existingSortedItems]);

  // Focus on the search input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Set initial search type based on mediaType prop
  useEffect(() => {
    setSearchType(mediaType);
  }, [mediaType]);

  // Debounced search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      handleSearch();
    }, 100);

    setDebounceTimeout(timeout);

    // Cleanup function
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [query, searchType]);

  // Handle search input
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let results: Media[] = [];

      if (searchType === "book") {
        results = await searchBooks(query);
      } else {
        results = await searchMedia(query, searchType);
      }

      setSearchResults(results);

      if (results.length === 0) {
        setError("No results found. Try a different search term.");
      }
    } catch (err) {
      setError(`Error searching for ${searchType}. Please try again.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a media item to the selection
  const handleAddMedia = (media: Media) => {
    // Check if the item is already selected
    if (
      !selectedMedia.some(
        (item) => item.id === media.id && item.type === media.type
      )
    ) {
      setSelectedMedia([...selectedMedia, media]);
    }

    // Clear the search field and results
    setQuery("");
    setSearchResults([]);

    // Focus back on the search input for quick successive searches
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle removing a media item from the selection
  const handleRemoveMedia = (media: Media) => {
    setSelectedMedia(
      selectedMedia.filter(
        (item) => !(item.id === media.id && item.type === media.type)
      )
    );
  };

  // Handle completing the selection process
  const handleComplete = () => {
    if (selectedMedia.length < 2) {
      setError("Please select at least 2 items to compare.");
      return;
    }

    onComplete(selectedMedia);
  };

  // Handle clearing all selected media except existing items
  const handleClearNew = () => {
    // If we have existingSortedItems, keep those and remove only new items
    if (existingSortedItems.length > 0) {
      setSelectedMedia([...existingSortedItems]);
    } else {
      setSelectedMedia([]);
    }
  };

  // Check if a media item is an existing item
  const isExistingItem = (media: Media) => {
    return existingSortedItems.some(
      (item) => item.id === media.id && item.type === media.type
    );
  };

  // Restore all original items
  const handleRestoreAllExisting = () => {
    // Get all newly added items (items that aren't in existingSortedItems)
    const newItems = selectedMedia.filter(
      (media) =>
        !existingSortedItems.some(
          (item) => item.id === media.id && item.type === media.type
        )
    );

    // Combine existing items with new items
    setSelectedMedia([...existingSortedItems, ...newItems]);
  };

  // Count removed existing items
  const removedExistingCount =
    existingSortedItems.length -
    selectedMedia.filter((media) =>
      existingSortedItems.some(
        (item) => item.id === media.id && item.type === media.type
      )
    ).length;

  // Get the media type display name
  const getMediaTypeDisplay = (type: "movie" | "tv" | "book") => {
    switch (type) {
      case "movie":
        return "Movies";
      case "tv":
        return "TV Shows";
      case "book":
        return "Books";
      default:
        return "Media";
    }
  };

  // Determine if search type switcher should be shown
  const shouldShowTypeSelector = mediaType === "movie" || mediaType === "tv";

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-6">
        Select {getMediaTypeDisplay(mediaType)}
      </h2>

      {existingSortedItems.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-celadon/10 dark:bg-brunswick-green/20 rounded-md">
          <div className="flex justify-between items-center">
            <p className="text-rich-black/70 dark:text-white/70">
              Your list has {existingSortedItems.length} items. Add more items
              or remove existing ones.
              {removedExistingCount > 0 && (
                <span className="ml-2 text-bittersweet">
                  ({removedExistingCount} existing items will be removed)
                </span>
              )}
            </p>
            {removedExistingCount > 0 && (
              <button
                onClick={handleRestoreAllExisting}
                className="text-sm text-brunswick-green hover:text-brunswick-green/80 dark:text-celadon dark:hover:text-celadon/80"
              >
                Restore All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search controls */}
      <div className="mb-8">
        {shouldShowTypeSelector && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex rounded-md overflow-hidden">
              <button
                className={`px-4 py-2 text-sm ${
                  searchType === "movie"
                    ? "bg-brunswick-green text-white"
                    : "bg-celadon/20 text-rich-black/70 dark:bg-brunswick-green/30 dark:text-white/80"
                }`}
                onClick={() => setSearchType("movie")}
              >
                Movies
              </button>
              <button
                className={`px-4 py-2 text-sm ${
                  searchType === "tv"
                    ? "bg-brunswick-green text-white"
                    : "bg-celadon/20 text-rich-black/70 dark:bg-brunswick-green/30 dark:text-white/80"
                }`}
                onClick={() => setSearchType("tv")}
              >
                TV Shows
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search for ${getMediaTypeDisplay(
              searchType
            ).toLowerCase()}...`}
            className="w-full px-4 py-2 border rounded-md dark:bg-rich-black dark:border-brunswick-green/50"
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin h-5 w-5 border-2 border-orange-peel rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>

        {error && <p className="text-bittersweet text-sm mt-2">{error}</p>}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Search Results</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {searchResults.map((media) => {
              const isExisting = isExistingItem(media);
              const isSelected = selectedMedia.some(
                (item) => item.id === media.id && item.type === media.type
              );

              return (
                <div
                  key={`search-${media.id}-${media.type}`}
                  className={`relative ${
                    isExisting || isSelected
                      ? "ring-1 ring-celadon/50 dark:ring-brunswick-green/50"
                      : ""
                  }`}
                >
                  <MediaCard
                    media={media}
                    onClick={() => !isSelected && handleAddMedia(media)}
                  />
                  {isExisting && !isSelected && (
                    <div className="absolute top-1 right-1 bg-celadon text-rich-black rounded-md text-xs px-1.5 py-0.5">
                      In List
                    </div>
                  )}
                  {isSelected && !isExisting && (
                    <div className="absolute top-1 right-1 bg-orange-peel text-rich-black rounded-md text-xs px-1.5 py-0.5">
                      Selected
                    </div>
                  )}
                  {isSelected && isExisting && (
                    <div className="absolute top-1 right-1 bg-celadon text-rich-black rounded-md text-xs px-1.5 py-0.5">
                      In List
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected media items */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">
            Selected Items ({selectedMedia.length})
          </h3>
          {selectedMedia.length > existingSortedItems.length && (
            <button
              onClick={handleClearNew}
              className="text-sm text-bittersweet hover:text-bittersweet/80"
            >
              Clear New Items
            </button>
          )}
        </div>

        {selectedMedia.length === 0 ? (
          <div className="text-center py-10 bg-celadon/10 dark:bg-brunswick-green/20 rounded-lg">
            <p className="text-rich-black/60 dark:text-white/60">
              Search and select {getMediaTypeDisplay(searchType).toLowerCase()}{" "}
              to add them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedMedia.map((media) => {
              const isExisting = isExistingItem(media);

              return (
                <div
                  key={`selected-${media.id}-${media.type}`}
                  className={`relative ${
                    isExisting
                      ? "ring-1 ring-celadon/50 dark:ring-brunswick-green/50"
                      : ""
                  }`}
                >
                  <MediaCard media={media} />
                  <button
                    onClick={() => handleRemoveMedia(media)}
                    className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center ${
                      isExisting
                        ? "bg-bittersweet/80 text-white hover:bg-bittersweet"
                        : "bg-bittersweet text-white hover:bg-bittersweet/80"
                    }`}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                  {isExisting && (
                    <div className="absolute top-1 left-1 bg-celadon text-rich-black rounded-md text-xs px-1.5 py-0.5">
                      Existing
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-celadon/20 text-rich-black/80 rounded-md dark:bg-brunswick-green/30 dark:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleComplete}
          disabled={selectedMedia.length < 2}
          className="px-4 py-2 bg-brunswick-green text-white rounded-md disabled:bg-brunswick-green/50"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default BatchMediaSelection;
