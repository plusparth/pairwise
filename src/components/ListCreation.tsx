import React, { useState } from "react";
import { MediaList } from "../types/media";
import { saveMediaList, deleteMediaList } from "../services/storage";
import { v4 as uuidv4 } from "uuid";

interface ListCreationProps {
  onListSelect: (list: MediaList) => void;
  existingLists: MediaList[];
  onListsUpdate: () => void;
}

const ListCreation: React.FC<ListCreationProps> = ({
  onListSelect,
  existingLists,
  onListsUpdate,
}) => {
  const [newListName, setNewListName] = useState("");

  const handleCreateList = () => {
    if (!newListName.trim()) return;

    const newList: MediaList = {
      id: uuidv4(),
      name: newListName.trim(),
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMediaList(newList);
    onListsUpdate();
    setNewListName("");
  };

  const handleDeleteList = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this list? This action cannot be undone."
      )
    ) {
      deleteMediaList(id);
      onListsUpdate();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create a New List</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="My Movie Rankings..."
            className="flex-1 px-4 py-2 border rounded-md dark:bg-rich-black dark:border-brunswick-green/50"
            onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
          />
          <button
            onClick={handleCreateList}
            disabled={!newListName.trim()}
            className="px-4 py-2 bg-brunswick-green text-white rounded-md disabled:bg-brunswick-green/50"
          >
            Create List
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Lists</h2>

        {existingLists.length === 0 ? (
          <div className="text-center py-10 bg-celadon/10 dark:bg-brunswick-green/20 rounded-lg">
            <p className="text-rich-black/60 dark:text-white/60">
              You don&apos;t have any lists yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {existingLists.map((list) => (
              <div
                key={list.id}
                className="bg-white dark:bg-rich-black rounded-lg shadow-md overflow-hidden border border-celadon/20 dark:border-brunswick-green/30"
              >
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{list.name}</h3>
                    <p className="text-sm text-rich-black/60 dark:text-white/60">
                      {list.items.length} items • Created{" "}
                      {new Date(list.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onListSelect(list)}
                      className="px-3 py-1 bg-brunswick-green text-white text-sm rounded-md"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="px-3 py-1 bg-bittersweet text-white text-sm rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListCreation;
