import { RankedMedia } from "../types/media";

/**
 * Calculate which item to compare next for binary insertion
 *
 * @param sortedList The current sorted list of media
 * @param low The lower bound index
 * @param high The upper bound index
 * @returns The index of the next item to compare
 */
export function getNextComparisonIndex(
  sortedList: RankedMedia[],
  low: number,
  high: number
): number {
  // Binary search midpoint
  return Math.floor((low + high) / 2);
}

/**
 * Update the ranking of all items after inserting a new item
 * Ranks will now go from N-1 (worst) to 0 (best)
 *
 * @param items The list of media items
 * @returns Updated items with correct rankings
 */
export function updateRankingsAfterInsertion(
  items: RankedMedia[]
): RankedMedia[] {
  const totalItems = items.length;

  // Assign reversed ranks: totalItems-1 (worst) to 0 (best)
  return items.map((item, index) => ({
    ...item,
    rank: totalItems - 1 - index,
  }));
}

/**
 * Insert a new item into the sorted list at the determined position
 *
 * @param sortedList The current sorted list
 * @param newItem The new item to insert
 * @param insertPosition The position to insert the new item (lower values = better)
 * @returns Updated list with the new item inserted
 */
export function insertMediaItem(
  sortedList: RankedMedia[],
  newItem: RankedMedia,
  insertPosition: number
): RankedMedia[] {
  const updatedList = [
    ...sortedList.slice(0, insertPosition),
    { ...newItem, rank: insertPosition },
    ...sortedList.slice(insertPosition),
  ];

  // Update all rankings
  return updateRankingsAfterInsertion(updatedList);
}
