import { useState, useEffect, useCallback } from 'react';
import { Restaurant } from '../types/restaurant';

const STORAGE_KEY = 'lunch-select-bookmarks';

interface UseBookmarksReturn {
  bookmarks: Restaurant[];
  isLoading: boolean;
  isBookmarked: (placeId: string) => boolean;
  toggle: (placeId: string, restaurant?: Restaurant) => void;
  addFromBookmark: (restaurant: Restaurant) => void;
  refresh: () => void;
}

function loadBookmarks(): Restaurant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Restaurant[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function useBookmarks(isLoggedIn: boolean): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Restaurant[]>(loadBookmarks);
  const [isLoading] = useState(false);

  const refresh = useCallback(() => {
    setBookmarks(loadBookmarks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBookmarked = useCallback(
    (placeId: string) => bookmarks.some((b) => b.id === placeId),
    [bookmarks]
  );

  const toggle = useCallback((placeId: string, restaurant?: Restaurant) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === placeId);
      let next: Restaurant[];
      if (exists) {
        next = prev.filter((b) => b.id !== placeId);
      } else if (restaurant) {
        next = [...prev, restaurant];
      } else {
        return prev;
      }
      saveBookmarks(next);
      return next;
    });
  }, []);

  const addFromBookmark = useCallback((restaurant: Restaurant) => {
    // This is a convenience method; the actual adding to the game list
    // is handled by the parent component
  }, []);

  return { bookmarks, isLoading, isBookmarked, toggle, addFromBookmark, refresh };
}
