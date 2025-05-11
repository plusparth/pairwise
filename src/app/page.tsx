"use client";

import React, { useState, useEffect } from "react";
import { MediaList as MediaListType } from "../types/media";
import { getMediaLists } from "../services/storage";
import ListCreation from "../components/ListCreation";
import MediaList from "../components/MediaList";

import "./globals.css";

export default function Home() {
  const [lists, setLists] = useState<MediaListType[]>([]);
  const [selectedList, setSelectedList] = useState<MediaListType | null>(null);

  // Load lists from localStorage on component mount
  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = () => {
    const storedLists = getMediaLists();
    setLists(storedLists);
  };

  const handleListSelected = (list: MediaListType) => {
    setSelectedList(list);
  };

  const handleListUpdated = (updatedList: MediaListType) => {
    setSelectedList(updatedList);
    loadLists(); // Reload all lists to keep everything in sync
  };

  const handleBackToLists = () => {
    setSelectedList(null);
  };

  return (
    <main className="min-h-screen bg-celadon/10 dark:bg-rich-black text-rich-black dark:text-white">
      <header className="bg-white dark:bg-brunswick-green/20 shadow-sm">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1
            className="text-xl font-bold cursor-pointer"
            onClick={handleBackToLists}
          >
            Pairwise Media Rankings
          </h1>

          {selectedList && (
            <button
              onClick={handleBackToLists}
              className="px-3 py-1 bg-celadon/20 text-rich-black/80 rounded-md text-sm dark:bg-brunswick-green/30 dark:text-white"
            >
              ← Back to Lists
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto py-8">
        {selectedList ? (
          <MediaList list={selectedList} onUpdate={handleListUpdated} />
        ) : (
          <ListCreation
            existingLists={lists}
            onListSelect={handleListSelected}
            onListsUpdate={loadLists}
          />
        )}
      </div>
    </main>
  );
}
