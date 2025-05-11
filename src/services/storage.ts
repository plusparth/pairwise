import { MediaList, RankedMedia, Media } from "../types/media";

const MEDIA_LISTS_KEY = "pairwise-media-lists";

// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined";

// Get all stored media lists
export function getMediaLists(): MediaList[] {
  if (!isBrowser()) return [];

  try {
    const storedLists = localStorage.getItem(MEDIA_LISTS_KEY);
    if (!storedLists) return [];

    const lists = JSON.parse(storedLists) as MediaList[];

    // Add listType for backwards compatibility with existing lists
    return lists.map((list) => {
      if (!list.listType) {
        // Determine list type based on first item, default to "movie"
        const firstItem = list.items[0];
        const listType = firstItem ? firstItem.type : "movie";
        return { ...list, listType };
      }
      return list;
    });
  } catch (error) {
    console.error("Error loading media lists:", error);
    return [];
  }
}

// Get a specific media list by ID
export function getMediaListById(id: string): MediaList | undefined {
  const lists = getMediaLists();
  return lists.find((list) => list.id === id);
}

// Save a media list
export function saveMediaList(list: MediaList): void {
  if (!isBrowser()) return;

  const lists = getMediaLists();
  const existingIndex = lists.findIndex((l) => l.id === list.id);

  if (existingIndex >= 0) {
    lists[existingIndex] = {
      ...list,
      updatedAt: new Date().toISOString(),
    };
  } else {
    lists.push({
      ...list,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(MEDIA_LISTS_KEY, JSON.stringify(lists));
}

// Delete a media list
export function deleteMediaList(id: string): void {
  if (!isBrowser()) return;

  const lists = getMediaLists();
  const filteredLists = lists.filter((list) => list.id !== id);

  localStorage.setItem(MEDIA_LISTS_KEY, JSON.stringify(filteredLists));
}

// Add media item to a list
export function addMediaToList(listId: string, media: Media): RankedMedia[] {
  const list = getMediaListById(listId);
  if (!list) return [];

  // Check if media already exists in the list
  const exists = list.items.some(
    (item) => item.id === media.id && item.type === media.type
  );
  if (exists) return list.items;

  // Add as unranked initially (will be ranked through pairwise comparison)
  const newItem: RankedMedia = {
    ...media,
    rank: list.items.length, // Temporary rank at the end
  };

  const updatedList = {
    ...list,
    items: [...list.items, newItem],
    updatedAt: new Date().toISOString(),
  };

  saveMediaList(updatedList);
  return updatedList.items;
}

// Update rankings for a list
export function updateRankings(listId: string, items: RankedMedia[]): void {
  const list = getMediaListById(listId);
  if (!list) return;

  // Remove duplicates from the items list
  const uniqueItems: RankedMedia[] = [];

  items.forEach((item) => {
    const isDuplicate = uniqueItems.some(
      (existingItem) =>
        existingItem.id === item.id && existingItem.type === item.type
    );

    if (!isDuplicate) {
      uniqueItems.push(item);
    }
  });

  const updatedList = {
    ...list,
    items: uniqueItems,
    updatedAt: new Date().toISOString(),
  };

  saveMediaList(updatedList);
}

// Update media ratings based on bell curve
export function updateRatings(listId: string, items: RankedMedia[]): void {
  const list = getMediaListById(listId);
  if (!list) return;

  // Remove duplicates from the items list
  const uniqueItems: RankedMedia[] = [];

  items.forEach((item) => {
    const isDuplicate = uniqueItems.some(
      (existingItem) =>
        existingItem.id === item.id && existingItem.type === item.type
    );

    if (!isDuplicate) {
      uniqueItems.push(item);
    }
  });

  const updatedList = {
    ...list,
    items: uniqueItems,
    updatedAt: new Date().toISOString(),
  };

  saveMediaList(updatedList);
}
