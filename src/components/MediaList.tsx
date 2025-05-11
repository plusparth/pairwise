import React, { useState, useEffect, useRef } from "react";
import { MediaList as MediaListType, RankedMedia, Media } from "../types/media";
import { updateRankings, updateRatings } from "../services/storage";
import MediaCard from "./MediaCard";
import BatchMediaSelection from "./BatchMediaSelection";
import BatchSorting from "./BatchSorting";
import BellCurveRating from "./BellCurveRating";

interface MediaListProps {
  list: MediaListType;
  onUpdate: (updatedList: MediaListType) => void;
}

type Screen = "list" | "rate" | "batch-select" | "batch-sort";

const MediaList: React.FC<MediaListProps> = ({ list, onUpdate }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [batchSelectedMedia, setBatchSelectedMedia] = useState<Media[]>([]);
  const [sortedItems, setSortedItems] = useState<RankedMedia[]>(
    [...list.items].sort((a, b) => b.rank - a.rank) // Higher rank = better
  );
  const [needsRating, setNeedsRating] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<RankedMedia | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<RankedMedia | null>(
    null
  );
  const dragContainerRef = useRef<HTMLDivElement>(null);

  // Update sortedItems state when the list changes from outside
  useEffect(() => {
    setSortedItems([...list.items].sort((a, b) => b.rank - a.rank));

    // Check if any items need rating
    const unratedItems = list.items.filter((item) => item.rating === undefined);
    setNeedsRating(unratedItems.length > 0);
  }, [list.items]);

  // Handle batch selecting media items
  const handleBatchSelectComplete = (selectedMedia: Media[]) => {
    // Filter out any media that doesn't match the list type
    const filteredMedia = selectedMedia.filter(
      (media) => media.type === list.listType
    );

    if (filteredMedia.length < 2) {
      alert(`Please select at least 2 ${list.listType} items to compare.`);
      return;
    }

    setBatchSelectedMedia(filteredMedia);
    setCurrentScreen("batch-sort");
  };

  // Handle batch sorting completion
  const handleBatchSortComplete = (sortedMediaItems: RankedMedia[]) => {
    setSortedItems(sortedMediaItems);
    updateRankings(list.id, sortedMediaItems);
    onUpdate({
      ...list,
      items: sortedMediaItems,
    });
    setCurrentScreen("list");
    setBatchSelectedMedia([]);
  };

  // Handle cancelling the current action
  const handleCancel = () => {
    setCurrentScreen("list");
    setBatchSelectedMedia([]);
  };

  // Handle saving the bell curve ratings
  const handleRatingSaved = (ratedItems: RankedMedia[]) => {
    setSortedItems(ratedItems);
    updateRatings(list.id, ratedItems);
    onUpdate({
      ...list,
      items: ratedItems,
    });
    setCurrentScreen("list");
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: RankedMedia) => {
    // Only allow dragging unrated items
    if (item.rating !== undefined) {
      e.preventDefault();
      return;
    }

    setDraggedItem(item);

    // Make the drag image transparent
    if (e.dataTransfer.setDragImage) {
      const img = new Image();
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);
    }

    // Required for Firefox
    e.dataTransfer.setData("text/plain", item.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, item: RankedMedia) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggedOverItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: RankedMedia) => {
    e.preventDefault();

    // If we don't have a dragged item or if the dragged item is rated, don't proceed
    if (!draggedItem || draggedItem.rating !== undefined) {
      return;
    }

    // If the target is the same as the dragged item, don't proceed
    if (
      draggedItem.id === targetItem.id &&
      draggedItem.type === targetItem.type
    ) {
      return;
    }

    // Create a new array for the reordered items
    const updatedItems = [...sortedItems];

    // Find the indices of the dragged and target items
    const draggedIndex = updatedItems.findIndex(
      (item) => item.id === draggedItem.id && item.type === draggedItem.type
    );

    const targetIndex = updatedItems.findIndex(
      (item) => item.id === targetItem.id && item.type === targetItem.type
    );

    if (draggedIndex < 0 || targetIndex < 0) return;

    // Remove the dragged item
    const [removedItem] = updatedItems.splice(draggedIndex, 1);

    // Insert it at the new position
    updatedItems.splice(targetIndex, 0, removedItem);

    // Update ranks based on new positions
    const rerankedItems = updatedItems.map((item, index) => ({
      ...item,
      rank: updatedItems.length - 1 - index,
    }));

    // Update state and save changes
    setSortedItems(rerankedItems);
    updateRankings(list.id, rerankedItems);
    onUpdate({
      ...list,
      items: rerankedItems,
    });

    // Clear drag state
    handleDragEnd();
  };

  // Render different screens based on the current state
  const renderScreen = () => {
    switch (currentScreen) {
      case "batch-select":
        return (
          <BatchMediaSelection
            existingSortedItems={sortedItems}
            onComplete={handleBatchSelectComplete}
            onCancel={handleCancel}
            mediaType={list.listType || "movie"}
          />
        );

      case "batch-sort":
        return (
          <BatchSorting
            mediaItems={batchSelectedMedia}
            existingSortedItems={sortedItems}
            onComplete={handleBatchSortComplete}
            onCancel={handleCancel}
          />
        );

      case "rate":
        return (
          <BellCurveRating
            rankedList={sortedItems}
            onComplete={handleRatingSaved}
            onCancel={handleCancel}
          />
        );

      default:
        return renderListScreen();
    }
  };

  // Helper function to render each media item with drag capabilities for unrated items
  const renderMediaItem = (item: RankedMedia) => {
    const isUnrated = item.rating === undefined;
    const isDragged =
      draggedItem &&
      draggedItem.id === item.id &&
      draggedItem.type === item.type;
    const isDraggedOver =
      draggedOverItem &&
      draggedOverItem.id === item.id &&
      draggedOverItem.type === item.type;

    // Calculate drop indication - show drop indicator between items
    const showDropBefore =
      draggedItem &&
      !isDragged &&
      draggedOverItem &&
      draggedOverItem.id === item.id &&
      draggedOverItem.type === item.type;

    return (
      <div
        key={`${item.id}-${item.type}`}
        className={`
          relative 
          ${isUnrated ? "cursor-grab active:cursor-grabbing" : ""}
          ${isDragged ? "opacity-50 scale-95" : ""}
          ${showDropBefore ? "border-t-2 border-orange-peel pt-2" : ""}
          transition-all duration-200
        `}
        draggable={isUnrated}
        onDragStart={(e) => handleDragStart(e, item)}
        onDragOver={(e) => handleDragOver(e, item)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, item)}
      >
        <MediaCard media={item} showRating={item.rating !== undefined} />
        {isUnrated && (
          <div className="absolute top-0 right-0 bg-orange-peel text-white text-xs px-1.5 py-0.5 rounded-bl-md">
            Unrated
          </div>
        )}
        {isDraggedOver && !isDragged && (
          <div className="absolute inset-0 border-2 border-orange-peel rounded pointer-events-none"></div>
        )}
      </div>
    );
  };

  // Render the main list screen
  const renderListScreen = () => {
    // Split items into rated and unrated groups
    const ratedItems = sortedItems.filter((item) => item.rating !== undefined);
    const unratedItems = sortedItems.filter(
      (item) => item.rating === undefined
    );

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">{list.name}</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentScreen("batch-select")}
              className="px-4 py-2 bg-brunswick-green text-white rounded-md text-sm"
            >
              Add Media
            </button>

            <button
              onClick={() => setCurrentScreen("rate")}
              className={`px-4 py-2 ${
                needsRating
                  ? "bg-orange-peel text-rich-black"
                  : "bg-orange-peel/80 text-rich-black/80"
              } rounded-md text-sm font-medium ${
                needsRating ? "animate-pulse" : ""
              }`}
              disabled={sortedItems.length < 2}
            >
              {needsRating ? "Assign Ratings ●" : "Assign Ratings"}
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="px-4 py-2 bg-celadon/20 dark:bg-brunswick-green/30 rounded-md">
            <span className="font-medium">{sortedItems.length}</span> items
          </div>

          {ratedItems.length > 0 && (
            <div className="px-4 py-2 bg-celadon/20 dark:bg-brunswick-green/30 rounded-md">
              Average rating:{" "}
              <span className="font-medium">
                {(
                  ratedItems.reduce(
                    (sum, item) => sum + (item.rating || 0),
                    0
                  ) / ratedItems.length
                ).toFixed(1)}
              </span>
            </div>
          )}

          {unratedItems.length > 0 && (
            <div className="px-4 py-2 bg-celadon/20 dark:bg-brunswick-green/30 rounded-md">
              <span className="font-medium">{unratedItems.length}</span> unrated
              items
            </div>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-10 bg-celadon/10 dark:bg-brunswick-green/20 rounded-lg">
            <p className="text-gray-500 mb-4">
              Your list is empty. Add some movies, TV shows, or books to get
              started!
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentScreen("batch-select")}
                className="px-4 py-2 bg-brunswick-green text-white rounded-md"
              >
                Add Media
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Instructions for drag and drop if there are unrated items */}
            {unratedItems.length > 0 && (
              <div className="mb-4 p-3 bg-celadon/10 dark:bg-brunswick-green/20 rounded-lg text-sm">
                <p>
                  <span className="font-medium">Tip:</span> You can drag unrated
                  items to reorder them anywhere in the list. This lets you
                  place them relative to your rated items. Once you&apos;re
                  satisfied with the order, click &quot;Assign Ratings&quot; to
                  calculate ratings based on rank.
                </p>
              </div>
            )}

            {/* Main content grid */}
            <div
              ref={dragContainerRef}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 select-none"
            >
              {sortedItems.map((item) => renderMediaItem(item))}
            </div>
          </>
        )}
      </div>
    );
  };

  return <div className="container mx-auto p-4">{renderScreen()}</div>;
};

export default MediaList;
