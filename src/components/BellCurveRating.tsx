import React, { useState, useEffect, useRef, useMemo } from "react";
import { RankedMedia } from "../types/media";
import { applyBellCurve } from "../utils/bellCurve";
import MediaCard from "./MediaCard";

interface BellCurveRatingProps {
  rankedList: RankedMedia[];
  onComplete: (ratedList: RankedMedia[]) => void;
  onCancel: () => void;
}

// Generate a unique key for each item
const getItemKey = (item: RankedMedia): string => {
  return `${item.id}-${item.type}`;
};

const BellCurveRating: React.FC<BellCurveRatingProps> = ({
  rankedList,
  onComplete,
  onCancel,
}) => {
  // State for ratings and curve parameters
  const [mean, setMean] = useState(3.0);
  const [stdDev, setStdDev] = useState(1.0);
  const [items, setItems] = useState<RankedMedia[]>([]);

  // State for visible rating range (for zooming)
  const [visibleMinRating, setVisibleMinRating] = useState(0.5);
  const [visibleMaxRating, setVisibleMaxRating] = useState(5.0);
  const [isZoomed, setIsZoomed] = useState(false);

  // State for drag operations
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0); // Track offset between cursor and point
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);
  const [draggingAdjuster, setDraggingAdjuster] = useState<number | null>(null);
  const [adjusterOffsetX, setAdjusterOffsetX] = useState(0);
  const [originalAdjusterRating, setOriginalAdjusterRating] = useState<
    number | null
  >(null);

  // Refs for measurements
  const curveRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dimensions for curve visualizations
  const CURVE_WIDTH = 800;
  const CURVE_HEIGHT = 200;
  const POINT_RADIUS = 6;
  const ADJUSTER_POINT_RADIUS = 6;

  // Constants for rating ranges
  const MIN_RATING = 0.5;
  const MAX_RATING = 5.0;

  // Constants for drag sensitivity
  const DRAG_SENSITIVITY = 0.5; // Lower = less sensitive (0.5 = half as sensitive)
  const DRAG_DEAD_ZONE = 2; // Pixels of movement to ignore (small movements)

  // Utility functions for drag operations
  const findNeighborBounds = (
    items: RankedMedia[],
    currentRating: number
  ): [number, number] => {
    const itemRatings = items.map((item) => item.rating || 3);
    const sortedRatings = [...itemRatings].sort((a, b) => a - b);
    const currentIndex = sortedRatings.indexOf(currentRating);

    const lowerBound =
      currentIndex > 0 ? sortedRatings[currentIndex - 1] : MIN_RATING;
    const upperBound =
      currentIndex < sortedRatings.length - 1
        ? sortedRatings[currentIndex + 1]
        : MAX_RATING;

    return [lowerBound, upperBound];
  };

  const calculateDraggedPosition = (
    e: React.MouseEvent,
    rectBounds: DOMRect,
    currentX: number,
    offsetX: number
  ): number | null => {
    // Calculate raw movement
    const rawX = e.clientX - rectBounds.left - offsetX;
    const deltaX = rawX - currentX;

    // Apply dead zone - ignore very small movements
    if (Math.abs(deltaX) < DRAG_DEAD_ZONE) return null;

    // Apply sensitivity scaling to make dragging less sensitive
    const scaledDelta = deltaX * DRAG_SENSITIVITY;
    const newX = currentX + scaledDelta;

    // Constrain to curve bounds
    return Math.max(0, Math.min(CURVE_WIDTH, newX));
  };

  /**
   * Scale ratings of all items after adding a new item at an extreme position
   *
   * @param items Current list of rated items to scale
   * @param boundaryValue The new boundary value (min or max)
   * @param isScalingUp True if scaling up (new item at min), false if scaling down (new item at max)
   * @returns Array of items with adjusted ratings
   */
  const scaleRatings = (
    items: RankedMedia[],
    boundaryValue: number,
    isScalingUp: boolean
  ): RankedMedia[] => {
    if (items.length <= 1) return items;

    // Get current min and max ratings
    const ratings = items.map((item) => item.rating || 3.0);
    const currentMin = Math.min(...ratings);
    const currentMax = Math.max(...ratings);

    // Set new min/max based on direction of scaling
    let newMin, newMax;

    if (isScalingUp) {
      // Scaling up (new item at bottom)
      newMin = boundaryValue + 0.1;
      newMax = Math.min(
        MAX_RATING,
        currentMax + Math.abs(newMin - currentMin) * 0.5
      );
    } else {
      // Scaling down (new item at top)
      newMax = boundaryValue - 0.1;
      newMin = Math.max(
        MIN_RATING,
        currentMin - Math.abs(currentMax - newMax) * 0.5
      );
    }

    // Scale all items proportionally
    return items.map((item) => {
      if (item.rating === undefined) return item;

      // Calculate new rating with scaling
      const oldRange = currentMax - currentMin;
      const newRange = newMax - newMin;
      let newRating;

      if (oldRange > 0) {
        // Scale proportionally
        const relativePosition = (item.rating - currentMin) / oldRange;
        newRating = newMin + relativePosition * newRange;
      } else {
        // If all items had the same rating, just distribute evenly
        newRating = newMin + (newMax - newMin) * 0.5;
      }

      return {
        ...item,
        rating: parseFloat(newRating.toFixed(2)),
      };
    });
  };

  /**
   * Proportionally adjust ratings around a moved item
   * Used by the drag handlers to reposition items
   *
   * @param items The list of items to adjust
   * @param itemIndex Index of the item being moved
   * @param newRating New rating for the moved item
   * @returns New array of items with adjusted ratings
   */
  const adjustProportionally = (
    items: RankedMedia[],
    itemIndex: number,
    newRating: number
  ): RankedMedia[] => {
    // Create a copy of items
    const newItems = [...items];

    // Get the current rating of the item being moved
    const currentRating = items[itemIndex].rating || 3.0;

    // If no actual change, return the original list
    if (currentRating === newRating) return items;

    // First, update the directly moved item
    newItems[itemIndex] = {
      ...items[itemIndex],
      rating: newRating,
    };

    // Create a map with indices and ratings for sorting
    const itemsWithIndices = items.map((item, index) => ({
      index,
      rating: item.rating || 3.0,
    }));

    // Sort by rating
    itemsWithIndices.sort((a, b) => a.rating - b.rating);

    // Find the moved item in the sorted array
    const sortedIndex = itemsWithIndices.findIndex(
      (item) => item.index === itemIndex
    );

    // Get the actual min and max in the list (might not be global min/max)
    const listMinRating = itemsWithIndices[0].rating;
    const listMaxRating = itemsWithIndices[itemsWithIndices.length - 1].rating;

    // Whether we're moving down or up
    const isMovingDown = newRating < currentRating;

    // If we're moving down, adjust items below
    if (isMovingDown && sortedIndex > 0) {
      // Items below the moved item
      const itemsBelow = itemsWithIndices.slice(0, sortedIndex);

      // Calculate the ratio of compression/expansion
      const originalRange = currentRating - listMinRating;
      const newRange = newRating - listMinRating;

      // Safety check for tiny ranges
      if (originalRange < 0.01) return items;

      const ratio = newRange / originalRange;

      // Safety check for extreme ratios
      if (ratio < 0.1 || ratio > 10) return items;

      // Adjust each item below proportionally
      itemsBelow.forEach(({ index }) => {
        const itemRating = items[index].rating || 3.0;

        // Calculate how far this rating is from the minimum, as a percentage
        const distanceFromMin = itemRating - listMinRating;
        const percentageOfRange = distanceFromMin / originalRange;

        // Apply the same percentage to the new range
        const newItemRating = listMinRating + percentageOfRange * newRange;

        // Update the item
        newItems[index] = {
          ...items[index],
          rating: newItemRating,
        };
      });
    }

    // If we're moving up, adjust items above
    if (!isMovingDown && sortedIndex < itemsWithIndices.length - 1) {
      // Items above the moved item
      const itemsAbove = itemsWithIndices.slice(sortedIndex + 1);

      // Calculate the ratio of compression/expansion
      const originalRange = listMaxRating - currentRating;
      const newRange = listMaxRating - newRating;

      // Safety check for tiny ranges
      if (originalRange < 0.01) return newItems;

      const ratio = newRange / originalRange;

      // Safety check for extreme ratios
      if (ratio < 0 || ratio > 10) return newItems;

      // Adjust each item above proportionally
      itemsAbove.forEach(({ index }) => {
        const itemRating = items[index].rating || 3.0;

        // Calculate how far this rating is from the maximum, as a percentage
        const distanceFromMax = listMaxRating - itemRating;
        const percentageOfRange = distanceFromMax / originalRange;

        // Apply the same percentage to the new range
        const newItemRating = listMaxRating - percentageOfRange * newRange;

        // Update the item
        newItems[index] = {
          ...items[index],
          rating: newItemRating,
        };
      });
    }

    return newItems;
  };

  // Calculate the effective highlighted item key, taking into account both hover and drag states
  const effectiveHighlightedKey = useMemo(() => {
    // If we're dragging a point on the curve
    if (draggingPoint !== null && items[draggingPoint]) {
      return getItemKey(items[draggingPoint]);
    }

    // If we're dragging an adjuster point
    if (draggingAdjuster !== null && items[draggingAdjuster]) {
      return getItemKey(items[draggingAdjuster]);
    }

    // If we're dragging a card
    if (draggedItemKey !== null) {
      return draggedItemKey;
    }

    // Otherwise use the hover state
    return hoveredItemKey;
  }, [draggingPoint, draggingAdjuster, draggedItemKey, hoveredItemKey, items]);

  // Initialize with the ranked items
  useEffect(() => {
    // Sort the items by rank (higher rank = better)
    const sortedItems = [...rankedList].sort((a, b) => b.rank - a.rank);

    // Count how many items don't have ratings yet
    const unratedItems = sortedItems.filter(
      (item) => item.rating === undefined
    );

    // Only apply ratings to items that don't have them yet
    if (unratedItems.length > 0) {
      // First, separate rated and unrated items
      const ratedItems = sortedItems.filter(
        (item) => item.rating !== undefined
      );

      // Apply bell curve only to unrated items
      let processedItems: RankedMedia[] = [];

      // If there are existing rated items, we need to interpolate the new items
      if (ratedItems.length > 0) {
        // Prepare an array for all items
        processedItems = [...ratedItems];

        // For each unrated item, find its position in the sorted list
        // and interpolate its rating based on its neighbors
        unratedItems.forEach((unratedItem) => {
          // Find the position this item should be at in the fully sorted list
          const rankPosition = sortedItems.findIndex(
            (item) =>
              item.id === unratedItem.id && item.type === unratedItem.type
          );

          // Find the nearest rated items (one above and one below)
          let lowerRatedItem: RankedMedia | null = null;
          let upperRatedItem: RankedMedia | null = null;

          // Look for rated items above (better rank)
          for (let i = rankPosition - 1; i >= 0; i--) {
            if (sortedItems[i].rating !== undefined) {
              upperRatedItem = sortedItems[i];
              break;
            }
          }

          // Look for rated items below (worse rank)
          for (let i = rankPosition + 1; i < sortedItems.length; i++) {
            if (sortedItems[i].rating !== undefined) {
              lowerRatedItem = sortedItems[i];
              break;
            }
          }

          // Calculate the interpolated rating
          let interpolatedRating: number;

          if (upperRatedItem && lowerRatedItem) {
            // If we have items on both sides, interpolate between them
            const upperRating = upperRatedItem.rating || 3.0;
            const lowerRating = lowerRatedItem.rating || 3.0;

            interpolatedRating = (upperRating + lowerRating) / 2.0;
          } else if (rankPosition === 0) {
            // If we only have an item above, use its rating for this item
            // and scale all other rated items up proportionally
            interpolatedRating = sortedItems[1].rating || 3.0;

            // Find all existing rated items except the one we're about to add
            const existingRatedItems = processedItems.filter(
              (item) =>
                item.id !== unratedItem.id || item.type !== unratedItem.type
            );

            if (existingRatedItems.length > 0) {
              // Scale all ratings upward
              processedItems = scaleRatings(
                existingRatedItems,
                interpolatedRating,
                true
              );
            }
          } else if (rankPosition === sortedItems.length - 1) {
            // If we only have an item below, use its rating for this item
            // and scale all other rated items down proportionally
            interpolatedRating =
              sortedItems[sortedItems.length - 2].rating || 3.0;

            // Find all existing rated items except the one we're about to add
            const existingRatedItems = processedItems.filter(
              (item) =>
                item.id !== unratedItem.id || item.type !== unratedItem.type
            );

            if (existingRatedItems.length > 0) {
              // Scale all ratings downward
              processedItems = scaleRatings(
                existingRatedItems,
                interpolatedRating,
                false
              );
            }
          } else {
            // If we have no rated neighbors, use the middle of the range
            interpolatedRating = 3.0;
          }

          // Ensure the rating is within bounds
          const boundedRating = Math.max(
            MIN_RATING,
            Math.min(MAX_RATING, interpolatedRating)
          );

          // Add the item with its interpolated rating
          processedItems.push({
            ...unratedItem,
            rating: parseFloat(boundedRating.toFixed(2)),
          });
        });
      } else {
        // If there are no existing rated items, just apply bell curve to all
        processedItems = applyBellCurve(
          sortedItems,
          mean,
          stdDev,
          MIN_RATING,
          MAX_RATING
        );
      }

      // Sort by rank again to ensure consistent order
      processedItems.sort((a, b) => b.rank - a.rank);
      setItems(processedItems);
    } else {
      // If all items already have ratings, just use them
      setItems(sortedItems);
    }

    // Reset the zoom state when items change
    setIsZoomed(false);
    setVisibleMinRating(MIN_RATING);
    setVisibleMaxRating(MAX_RATING);
  }, [rankedList, mean, stdDev]);

  // Calculate the optimal visible range based on current ratings
  const calculateVisibleRange = () => {
    if (items.length < 2) return;

    // Get all ratings
    const ratings = items.map((item) => item.rating || 3.0);

    // Find min and max ratings in the data
    const dataMin = Math.min(...ratings);
    const dataMax = Math.max(...ratings);

    // Add some padding to the range (10% on each side)
    const padding = (dataMax - dataMin) * 0.1;

    // Make sure we don't go outside the absolute limits
    const newMin = Math.max(MIN_RATING, dataMin - padding);
    const newMax = Math.min(MAX_RATING, dataMax + padding);

    // Only zoom if the range is significantly smaller than the full range
    if (newMax - newMin < (MAX_RATING - MIN_RATING) * 0.7) {
      setVisibleMinRating(newMin);
      setVisibleMaxRating(newMax);
      setIsZoomed(true);
    } else {
      // Reset to full range if data spans most of the range
      resetZoom();
    }
  };

  // Reset to full rating range
  const resetZoom = () => {
    setVisibleMinRating(MIN_RATING);
    setVisibleMaxRating(MAX_RATING);
    setIsZoomed(false);
  };

  // Calculate Y position on the bell curve for a given rating
  const calculateCurveY = (rating: number): number => {
    const normalizedDist = Math.exp(
      -Math.pow(rating - mean, 2) / (2 * Math.pow(stdDev, 2))
    );
    return CURVE_HEIGHT - normalizedDist * CURVE_HEIGHT * 0.8;
  };

  // Calculate bell curve points for visualization
  const calculateCurvePath = (): string => {
    const points: [number, number][] = [];

    for (let i = 0; i <= CURVE_WIDTH; i += 5) {
      // Map x position to rating value using visible range
      const rating =
        visibleMinRating +
        (i / CURVE_WIDTH) * (visibleMaxRating - visibleMinRating);

      // Calculate bell curve height at this point
      const y = calculateCurveY(rating);
      points.push([i, y]);
    }

    return "M" + points.map(([x, y]) => `${x},${y}`).join(" L");
  };

  // Convert rating to x-position on the curve
  const ratingToX = (rating: number): number => {
    return (
      ((rating - visibleMinRating) / (visibleMaxRating - visibleMinRating)) *
      CURVE_WIDTH
    );
  };

  // Convert x-position to rating value
  const xToRating = (x: number): number => {
    const rawRating =
      visibleMinRating +
      (x / CURVE_WIDTH) * (visibleMaxRating - visibleMinRating);
    return Math.max(
      MIN_RATING,
      Math.min(MAX_RATING, parseFloat(rawRating.toFixed(2)))
    );
  };

  // Handle starting to drag a point on the curve
  const handlePointDragStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();

    if (!curveRef.current) return;

    // Get curve bounds
    const rect = curveRef.current.getBoundingClientRect();

    // Get the current point's position
    const item = items[index];
    const rating = item.rating || 3;
    const pointX = ratingToX(rating);

    // Calculate the offset between cursor and point center
    const cursorX = e.clientX - rect.left;
    const offset = cursorX - pointX;

    setDraggingPoint(index);
    setDragStartX(e.clientX);
    setDragOffsetX(offset);
  };

  // Handle point dragging
  const handlePointDrag = (e: React.MouseEvent) => {
    if (draggingPoint === null || !curveRef.current) return;

    // Get current rating and point position
    const currentRating = items[draggingPoint].rating || 3;
    const currentX = ratingToX(currentRating);

    // Calculate new position with sensitivity
    const newX = calculateDraggedPosition(
      e,
      curveRef.current.getBoundingClientRect(),
      currentX,
      dragOffsetX
    );
    if (newX === null) return;

    // Calculate new rating
    let newRating = xToRating(newX);
    newRating = Math.round(newRating * 100) / 100; // Snap to 0.01 increments

    // Apply constraints to prevent reordering
    const [lowerBound, upperBound] = findNeighborBounds(items, currentRating);
    newRating = Math.max(lowerBound, Math.min(upperBound, newRating));

    // Only update if rating changed
    if (currentRating === newRating) return;

    const newItems = [...items];
    newItems[draggingPoint] = {
      ...items[draggingPoint],
      rating: newRating,
    };

    setItems(newItems);
  };

  // Handle point drag end
  const handlePointDragEnd = () => {
    setDraggingPoint(null);
    setDragOffsetX(0);
  };

  // Handle point mouse enter
  const handlePointMouseEnter = (item: RankedMedia) => {
    // Only set hover if we're not dragging anything
    if (
      draggingPoint === null &&
      draggingAdjuster === null &&
      draggedItemKey === null
    ) {
      setHoveredItemKey(getItemKey(item));
    }
  };

  // Handle point mouse leave
  const handlePointMouseLeave = () => {
    // Only clear hover if we're not dragging anything
    if (
      draggingPoint === null &&
      draggingAdjuster === null &&
      draggedItemKey === null
    ) {
      setHoveredItemKey(null);
    }
  };

  // Handle starting to drag an adjuster point
  const handleAdjusterDragStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();

    if (!curveRef.current) return;

    // Get curve bounds
    const rect = curveRef.current.getBoundingClientRect();

    // Get the current adjuster point's rating and position
    const item = items[index];
    const rating = item.rating || 3;
    const pointX = ratingToX(rating);

    // Calculate the offset between cursor and point center
    const cursorX = e.clientX - rect.left;
    const offset = cursorX - pointX;

    setDraggingAdjuster(index);
    setDragStartX(e.clientX);
    setAdjusterOffsetX(offset);
    setOriginalAdjusterRating(rating);
  };

  // Handle adjuster point dragging while preserving gap proportions
  const handleAdjusterDrag = (e: React.MouseEvent) => {
    if (
      draggingAdjuster === null ||
      !curveRef.current ||
      originalAdjusterRating === null
    )
      return;

    // Get curve bounds
    const rect = curveRef.current.getBoundingClientRect();

    // Get current position and rating
    const draggedRating = items[draggingAdjuster].rating || 3;
    const currentX = ratingToX(draggedRating);

    // Calculate new position with sensitivity
    const newX = calculateDraggedPosition(e, rect, currentX, adjusterOffsetX);
    if (newX === null) return;

    // Calculate new target rating
    let newTargetRating = xToRating(newX);
    // newTargetRating = Math.round(newTargetRating * 10) / 10; // Snap to 0.1 increments

    // Apply constraints to prevent reordering
    const [lowerBound, upperBound] = findNeighborBounds(items, draggedRating);
    newTargetRating = Math.max(
      lowerBound,
      Math.min(upperBound, newTargetRating)
    );

    // Only update if rating changed
    if (draggedRating === newTargetRating) return;

    // Use the pure adjustProportionally function to get updated items
    const newItems = adjustProportionally(
      items,
      draggingAdjuster,
      newTargetRating
    );

    setItems(newItems);
  };

  // Handle adjuster drag end
  const handleAdjusterDragEnd = () => {
    setDraggingAdjuster(null);
    setAdjusterOffsetX(0);
    setOriginalAdjusterRating(null);
  };

  // Handle starting to drag a card
  const handleCardDragStart = (index: number, e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    e.preventDefault();
    const item = items[index];
    setDraggedItemKey(getItemKey(item));
    setDragStartX(e.clientX);
  };

  // Handle card dragging
  const handleCardDrag = (e: React.MouseEvent) => {
    if (draggedItemKey === null || !scrollContainerRef.current) return;

    const currentX = e.clientX;
    const dragDistance = currentX - dragStartX;
    const cardWidth = 160; // Approximate card width + margin

    // Only proceed if we've dragged far enough
    if (Math.abs(dragDistance) < cardWidth / 2) return;

    // Find current index of dragged item
    const currentIndex = items.findIndex(
      (item) => getItemKey(item) === draggedItemKey
    );

    if (currentIndex === -1) return;

    // Calculate target index
    const direction = dragDistance > 0 ? 1 : -1;
    const targetIndex = currentIndex + direction;

    // Check if target index is valid
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Create a new array with the swapped items
    const newItems = [...items];

    // Get references to both items
    const draggedItem = { ...newItems[currentIndex] };
    const targetItem = { ...newItems[targetIndex] };

    // Swap their ratings
    const draggedRating = draggedItem.rating;
    draggedItem.rating = targetItem.rating;
    targetItem.rating = draggedRating;

    // Update the array
    newItems[currentIndex] = targetItem;
    newItems[targetIndex] = draggedItem;

    // Update state
    setItems(newItems);
    setDragStartX(currentX); // Reset drag start position
  };

  // Handle card drag end
  const handleCardDragEnd = () => {
    setDraggedItemKey(null);
  };

  // Handle card mouse enter
  const handleCardMouseEnter = (item: RankedMedia) => {
    // Only set hover if we're not dragging anything
    if (
      draggingPoint === null &&
      draggingAdjuster === null &&
      draggedItemKey === null
    ) {
      setHoveredItemKey(getItemKey(item));
    }
  };

  // Handle card mouse leave
  const handleCardMouseLeave = () => {
    // Only clear hover if we're not dragging anything
    if (
      draggingPoint === null &&
      draggingAdjuster === null &&
      draggedItemKey === null
    ) {
      setHoveredItemKey(null);
    }
  };

  // Reset ratings to follow the bell curve exactly
  const handleResetRatings = () => {
    // If all items are either rated or unrated, reset all
    const sortedItems = [...items].sort((a, b) => b.rank - a.rank);
    const resetItems = applyBellCurve(
      sortedItems,
      mean,
      stdDev,
      MIN_RATING,
      MAX_RATING
    );
    setItems(resetItems);
  };

  // Save the current ratings
  const handleSaveRatings = () => {
    // Update ranks based on current order
    const updatedItems = items.map((item, index) => ({
      ...item,
      rank: items.length - 1 - index,
    }));

    onComplete(updatedItems);
  };

  // Not enough items check
  if (rankedList.length < 2) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-4">Not Enough Items</h2>
        <p className="mb-6">
          You need at least 2 items to distribute ratings on a curve.
        </p>
        <button
          className="px-4 py-2 bg-brunswick-green text-white rounded-md"
          onClick={onCancel}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 select-none">
      <h2 className="text-2xl font-semibold mb-6">
        Interactive Rating Distribution
      </h2>

      {/* Bell curve controls */}
      <div className="mb-8 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Mean Rating: {mean.toFixed(2)}
          </label>
          <input
            type="range"
            min={1.0}
            max={5.0}
            step={0.01}
            value={mean}
            onChange={(e) => setMean(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Standard Deviation: {stdDev.toFixed(2)}
          </label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={stdDev}
            onChange={(e) => setStdDev(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Interactive Bell Curve */}
      <div className="mb-8 relative">
        <div className="bg-celadon/10 dark:bg-brunswick-green/20 p-4 rounded-md">
          <svg
            ref={curveRef}
            width={CURVE_WIDTH}
            height={CURVE_HEIGHT + 40} // Extra height for adjuster
            className="w-full h-auto"
            viewBox={`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT + 40}`}
            onMouseMove={(e) => {
              if (draggingPoint !== null) {
                handlePointDrag(e);
              } else if (draggingAdjuster !== null) {
                handleAdjusterDrag(e);
              }
            }}
            onMouseUp={() => {
              if (draggingPoint !== null) {
                handlePointDragEnd();
              } else if (draggingAdjuster !== null) {
                handleAdjusterDragEnd();
              }
            }}
            onMouseLeave={() => {
              if (draggingPoint !== null) {
                handlePointDragEnd();
              } else if (draggingAdjuster !== null) {
                handleAdjusterDragEnd();
              }
            }}
          >
            {/* Bell curve path */}
            <path
              d={calculateCurvePath()}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-brunswick-green"
            />

            {/* Rating axis labels */}
            <text
              x="0"
              y={CURVE_HEIGHT + 40}
              fontSize="10"
              textAnchor="start"
              fill="#555"
            >
              {visibleMinRating.toFixed(1)}
            </text>
            <text
              x={CURVE_WIDTH / 4}
              y={CURVE_HEIGHT + 40}
              fontSize="10"
              textAnchor="middle"
              fill="#555"
            >
              {(
                visibleMinRating +
                (visibleMaxRating - visibleMinRating) / 4
              ).toFixed(1)}
            </text>
            <text
              x={CURVE_WIDTH / 2}
              y={CURVE_HEIGHT + 40}
              fontSize="10"
              textAnchor="middle"
              fill="#555"
            >
              {(
                visibleMinRating +
                (visibleMaxRating - visibleMinRating) / 2
              ).toFixed(1)}
            </text>
            <text
              x={(CURVE_WIDTH * 3) / 4}
              y={CURVE_HEIGHT + 40}
              fontSize="10"
              textAnchor="middle"
              fill="#555"
            >
              {(
                visibleMinRating +
                ((visibleMaxRating - visibleMinRating) * 3) / 4
              ).toFixed(1)}
            </text>
            <text
              x={CURVE_WIDTH}
              y={CURVE_HEIGHT + 40}
              fontSize="10"
              textAnchor="end"
              fill="#555"
            >
              {visibleMaxRating.toFixed(1)}
            </text>

            {/* Points representing each movie */}
            {items.map((item, index) => {
              const rating = item.rating || 3;
              const xPos = ratingToX(rating);
              const yPos = calculateCurveY(rating);
              const itemKey = getItemKey(item);
              const isHighlighted = effectiveHighlightedKey === itemKey;
              const isDragging = draggingPoint === index;

              return (
                <g
                  key={`point-${itemKey}`}
                  onMouseEnter={() => handlePointMouseEnter(item)}
                  onMouseLeave={handlePointMouseLeave}
                >
                  <circle
                    cx={xPos}
                    cy={yPos}
                    r={isHighlighted ? POINT_RADIUS + 2 : POINT_RADIUS}
                    fill={
                      isDragging
                        ? "#ffa630"
                        : isHighlighted
                        ? "#ff6b6b"
                        : "#004643"
                    }
                    stroke="#fff"
                    strokeWidth={isHighlighted ? "3" : "2"}
                    onMouseDown={(e) => handlePointDragStart(index, e)}
                    style={{
                      cursor: "grab",
                      transition: "r 0.1s, fill 0.1s, stroke-width 0.1s",
                    }}
                  />
                  <text
                    x={xPos}
                    y={yPos - 15}
                    fontSize={isHighlighted ? "12" : "10"}
                    fontWeight={isHighlighted ? "bold" : "normal"}
                    textAnchor="middle"
                    fill={isHighlighted ? "#ff6b6b" : "currentColor"}
                    style={{ transition: "font-size 0.1s, fill 0.1s" }}
                  >
                    {rating.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Adjustment axis */}
            <line
              x1="0"
              y1={CURVE_HEIGHT + 20}
              x2={CURVE_WIDTH}
              y2={CURVE_HEIGHT + 20}
              stroke="#555"
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* Adjustment points - one for each movie */}
            {items.map((item, index) => {
              const rating = item.rating || 3;
              const xPos = ratingToX(rating);
              const itemKey = getItemKey(item);
              const isHighlighted = effectiveHighlightedKey === itemKey;
              const isDragging = draggingAdjuster === index;

              return (
                <g
                  key={`adjuster-${itemKey}`}
                  onMouseEnter={() => handlePointMouseEnter(item)}
                  onMouseLeave={handlePointMouseLeave}
                >
                  <circle
                    cx={xPos}
                    cy={CURVE_HEIGHT + 20}
                    r={
                      isHighlighted
                        ? ADJUSTER_POINT_RADIUS + 1
                        : ADJUSTER_POINT_RADIUS
                    }
                    fill={
                      isDragging
                        ? "#ffa630"
                        : isHighlighted
                        ? "#ff6b6b"
                        : "#6a8d92"
                    }
                    stroke="#fff"
                    strokeWidth="2"
                    onMouseDown={(e) => handleAdjusterDragStart(index, e)}
                    style={{ cursor: "grab", transition: "r 0.1s, fill 0.1s" }}
                  />
                  {/* Visual connection line between curve point and adjustment point */}
                  <line
                    x1={xPos}
                    y1={calculateCurveY(rating)}
                    x2={xPos}
                    y2={CURVE_HEIGHT + 20}
                    stroke={isHighlighted ? "#ff6b6b" : "#ccc"}
                    strokeWidth={isHighlighted ? "1.5" : "1"}
                    strokeDasharray="2,2"
                    style={{ transition: "stroke 0.1s, stroke-width 0.1s" }}
                  />
                </g>
              );
            })}
          </svg>

          <div className="flex justify-between mt-4">
            <div className="text-sm text-rich-black/60 dark:text-white/60">
              <span className="inline-block w-3 h-3 bg-6a8d92 rounded-full mr-1 align-middle"></span>
              Drag on axis to adjust rating gaps proportionally while keeping
              ends fixed. Drag points for individual adjustments.
            </div>
            <div className="flex gap-2">
              <button
                className={`text-sm ${
                  isZoomed ? "bg-celadon/30" : "bg-celadon/20"
                } text-rich-black/80 px-3 py-1 rounded-md dark:bg-brunswick-green/30 dark:text-white`}
                onClick={calculateVisibleRange}
              >
                Zoom to Points
              </button>
              <button
                className={`text-sm ${
                  !isZoomed ? "bg-celadon/30" : "bg-celadon/20"
                } text-rich-black/80 px-3 py-1 rounded-md dark:bg-brunswick-green/30 dark:text-white`}
                onClick={resetZoom}
                disabled={!isZoomed}
              >
                Full Range
              </button>
              <button
                className="text-sm bg-celadon/20 text-rich-black/80 px-3 py-1 rounded-md dark:bg-brunswick-green/30 dark:text-white"
                onClick={handleResetRatings}
              >
                Reset to Curve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draggable Movie Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Drag to Reorder</h3>
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-4 gap-4"
          onMouseMove={draggedItemKey !== null ? handleCardDrag : undefined}
          onMouseUp={draggedItemKey !== null ? handleCardDragEnd : undefined}
          onMouseLeave={draggedItemKey !== null ? handleCardDragEnd : undefined}
        >
          {items.map((item, index) => {
            const itemKey = getItemKey(item);
            const isHighlighted = effectiveHighlightedKey === itemKey;
            const isDragging = draggedItemKey === itemKey;

            return (
              <div
                key={`card-${itemKey}`}
                className={`flex-shrink-0 w-36 relative transition-all duration-200 ${
                  isDragging ? "opacity-70" : ""
                } ${isHighlighted ? "transform scale-105 shadow-lg z-10" : ""}`}
                onMouseDown={(e) => handleCardDragStart(index, e)}
                onMouseEnter={() => handleCardMouseEnter(item)}
                onMouseLeave={handleCardMouseLeave}
                style={{ cursor: "grab" }}
              >
                <MediaCard media={item} showRating />
                {isHighlighted && (
                  <div className="absolute inset-0 border-2 border-bittersweet rounded-md pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between mt-6">
        <button
          className="px-4 py-2 bg-celadon/20 text-rich-black/80 rounded-md dark:bg-brunswick-green/30 dark:text-white"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-brunswick-green text-white rounded-md"
          onClick={handleSaveRatings}
        >
          Save Ratings
        </button>
      </div>
    </div>
  );
};

export default BellCurveRating;
