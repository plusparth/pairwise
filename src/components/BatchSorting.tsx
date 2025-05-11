import React, { useState, useEffect } from "react";
import { Media, RankedMedia } from "../types/media";
import MediaCard from "./MediaCard";
import {
  getNextComparisonIndex,
  insertMediaItem,
} from "../utils/pairwiseComparison";

interface BatchSortingProps {
  mediaItems: Media[];
  existingSortedItems?: RankedMedia[];
  onComplete: (sortedItems: RankedMedia[]) => void;
  onCancel: () => void;
}

/**
 * This component implements a sequential sorting algorithm that builds a sorted list
 * by taking each unsorted item and finding its proper place in the sorted list
 * through pairwise comparisons.
 */
const BatchSorting: React.FC<BatchSortingProps> = ({
  mediaItems,
  existingSortedItems = [],
  onComplete,
  onCancel,
}) => {
  // Current stage of sorting
  const [currentStage, setCurrentStage] = useState<
    "initial" | "sorting" | "complete"
  >("initial");

  // Currently sorted items
  const [sortedItems, setSortedItems] = useState<RankedMedia[]>([]);

  // Items waiting to be sorted
  const [remainingItems, setRemainingItems] = useState<Media[]>([]);

  // Current item being sorted
  const [currentItem, setCurrentItem] = useState<Media | null>(null);

  // Binary search bounds for the current comparison
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);

  // Current comparison index
  const [comparisonIndex, setComparisonIndex] = useState<number | null>(null);

  // Progress tracking
  const [totalItems] = useState(mediaItems.length);
  const [sortedCount, setSortedCount] = useState(0);
  const [comparisonCount, setComparisonCount] = useState(0);

  // Animation state
  const [selectedCardType, setSelectedCardType] = useState<
    "new" | "existing" | null
  >(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Helper function to check if a media item already exists in a list
  const isMediaDuplicate = (
    media: Media,
    list: (Media | RankedMedia)[]
  ): boolean => {
    return list.some(
      (item) => item.id === media.id && item.type === media.type
    );
  };

  // Initialize the sorting process
  useEffect(() => {
    if (currentStage === "initial") {
      if (existingSortedItems.length > 0) {
        // Start with the existing sorted items (ensuring no duplicates)
        setSortedItems([...existingSortedItems]);

        // Filter out any media items that already exist in existingSortedItems
        const newItems = mediaItems.filter(
          (media) => !isMediaDuplicate(media, existingSortedItems)
        );

        // Filter out any duplicate media items from the new items themselves
        const uniqueNewItems: Media[] = [];
        newItems.forEach((media) => {
          if (!isMediaDuplicate(media, uniqueNewItems)) {
            uniqueNewItems.push(media);
          }
        });

        setRemainingItems([...uniqueNewItems]);
        setSortedCount(0);
      } else if (mediaItems.length > 0) {
        // Start with the first item as our sorted list when no existing items
        const firstItem = mediaItems[0];
        const firstRankedItem: RankedMedia = {
          ...firstItem,
          rank: 0, // First item gets rank 0 (will be updated later)
        };

        setSortedItems([firstRankedItem]);
        setSortedCount(1);

        // Filter out any duplicates from remaining items
        const remainingUniqueItems: Media[] = [];
        mediaItems.slice(1).forEach((media) => {
          if (media.id !== firstItem.id || media.type !== firstItem.type) {
            if (!isMediaDuplicate(media, remainingUniqueItems)) {
              remainingUniqueItems.push(media);
            }
          }
        });

        setRemainingItems(remainingUniqueItems);
      }

      // Move to the sorting stage
      setCurrentStage("sorting");
    }
  }, [currentStage, mediaItems, existingSortedItems]);

  // When we move to the sorting stage or finish sorting an item
  useEffect(() => {
    if (currentStage !== "sorting") return;

    // If no current item, pick the next one from remaining
    if (!currentItem && remainingItems.length > 0 && !isAnimating) {
      setCurrentItem(remainingItems[0]);
      setRemainingItems(remainingItems.slice(1));

      // Reset the binary search bounds for the new item
      setLow(0);
      setHigh(sortedItems.length);
      setComparisonIndex(null);
      setSelectedCardType(null);
    }

    // If we've sorted all items, we're done
    if (!currentItem && remainingItems.length === 0 && !isAnimating) {
      setCurrentStage("complete");
    }
  }, [currentStage, currentItem, remainingItems, sortedItems, isAnimating]);

  // Update the comparison index whenever the bounds change
  useEffect(() => {
    if (currentStage !== "sorting" || !currentItem || isAnimating) return;

    // Check if we've narrowed down to a single position
    if (low >= high) {
      // We've found the insertion position
      // Add the current item to the sorted list
      const rankedItem: RankedMedia = {
        ...currentItem,
        rank: low, // The insertion position is the current 'low' value
      };

      // Insert and update ranks
      const updatedList = insertMediaItem(sortedItems, rankedItem, low);
      setSortedItems(updatedList);

      // Clear current item to move to the next one
      setCurrentItem(null);
      setSortedCount(sortedCount + 1);

      return;
    }

    // Calculating the index for the next comparison
    const nextIndex = getNextComparisonIndex(sortedItems, low, high);
    setComparisonIndex(nextIndex);
  }, [
    currentStage,
    currentItem,
    sortedItems,
    low,
    high,
    sortedCount,
    isAnimating,
  ]);

  // Handle when the user selects that the new item is better
  const handlePreferNewItem = () => {
    if (comparisonIndex === null || isAnimating) return;

    // Start animation
    setSelectedCardType("new");
    setIsAnimating(true);

    // After animation completes, update the sorting algorithm
    setTimeout(() => {
      // If new item is better, it goes after the current comparison item
      setLow(comparisonIndex + 1);
      setComparisonCount(comparisonCount + 1);
      setSelectedCardType(null);
      setIsAnimating(false);
    }, 500); // Animation duration
  };

  // Handle when the user selects that the new item is worse
  const handlePreferExistingItem = () => {
    if (comparisonIndex === null || isAnimating) return;

    // Start animation
    setSelectedCardType("existing");
    setIsAnimating(true);

    // After animation completes, update the sorting algorithm
    setTimeout(() => {
      // If new item is worse, it goes before the current comparison item
      setHigh(comparisonIndex);
      setComparisonCount(comparisonCount + 1);
      setSelectedCardType(null);
      setIsAnimating(false);
    }, 500); // Animation duration
  };

  // Continue to the next stage
  const handleComplete = () => {
    if (currentStage === "complete") {
      onComplete(sortedItems);
    }
  };

  // Render the completion screen
  if (currentStage === "complete") {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 text-center">
        <h2 className="text-2xl font-semibold mb-4">Sorting Complete!</h2>
        <p className="mb-6">
          Added {totalItems} items to your list with {comparisonCount}{" "}
          comparisons.
        </p>
        <button
          onClick={handleComplete}
          className="px-6 py-3 bg-brunswick-green text-white rounded-md"
        >
          Continue
        </button>
      </div>
    );
  }

  // Render the comparison UI
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-center mb-2">
          Click on the item you prefer
        </h2>
        <div className="flex justify-between items-center">
          <p className="text-sm text-rich-black/60 dark:text-white/60">
            Item {sortedCount + 1} of {totalItems}
          </p>
          <p className="text-sm text-rich-black/60 dark:text-white/60">
            {comparisonCount} comparisons made
          </p>
        </div>

        <div className="w-full bg-celadon/20 dark:bg-brunswick-green/30 h-2 rounded-full mt-2">
          <div
            className="bg-orange-peel h-2 rounded-full transition-all duration-300"
            style={{ width: `${(sortedCount / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {currentItem && comparisonIndex !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-full max-w-[250px] relative group cursor-pointer transform transition-all duration-300 
                ${
                  selectedCardType === "new"
                    ? "scale-110 shadow-[0_0_20px_rgba(85,183,152,0.8)]"
                    : ""
                } 
                ${
                  selectedCardType === "existing"
                    ? "scale-75 opacity-50 rotate-3"
                    : ""
                }
                ${
                  !isAnimating
                    ? "hover:scale-105 hover:shadow-[0_0_15px_rgba(85,183,152,0.5)]"
                    : ""
                }
              `}
              onClick={handlePreferNewItem}
            >
              <MediaCard media={currentItem} />
              <div
                className={`absolute inset-0 bg-celadon ${
                  selectedCardType === "new"
                    ? "opacity-20"
                    : "opacity-0 group-hover:opacity-10"
                } rounded-lg transition-opacity duration-200`}
              ></div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-full max-w-[250px] relative group cursor-pointer transform transition-all duration-300 
                ${
                  selectedCardType === "existing"
                    ? "scale-110 shadow-[0_0_20px_rgba(85,183,152,0.8)]"
                    : ""
                } 
                ${
                  selectedCardType === "new"
                    ? "scale-75 opacity-50 rotate-3"
                    : ""
                }
                ${
                  !isAnimating
                    ? "hover:scale-105 hover:shadow-[0_0_15px_rgba(85,183,152,0.5)]"
                    : ""
                }
              `}
              onClick={handlePreferExistingItem}
            >
              <MediaCard media={sortedItems[comparisonIndex]} />
              <div
                className={`absolute inset-0 bg-celadon ${
                  selectedCardType === "existing"
                    ? "opacity-20"
                    : "opacity-0 group-hover:opacity-10"
                } rounded-lg transition-opacity duration-200`}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-celadon/20 text-rich-black/80 rounded-md dark:bg-brunswick-green/30 dark:text-white"
        >
          Cancel Sorting
        </button>
      </div>
    </div>
  );
};

export default BatchSorting;
