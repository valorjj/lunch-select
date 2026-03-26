import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

interface BookmarkItem {
  id: number;
  naverPlaceId: string;
  name: string;
  category: string;
  thumbnail: string;
  roadAddress: string;
  memo: string;
}

interface UseBookmarksReturn {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  isBookmarked: (placeId: string) => boolean;
  toggle: (placeId: string) => Promise<void>;
  refresh: () => void;
}

export function useBookmarks(isLoggedIn: boolean): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    apiFetch('/api/bookmarks')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setBookmarks(data))
      .catch(() => setBookmarks([]))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  const isBookmarked = useCallback(
    (placeId: string) => bookmarks.some((b) => b.naverPlaceId === placeId),
    [bookmarks]
  );

  const toggle = useCallback(async (placeId: string) => {
    if (!isLoggedIn) return;

    if (isBookmarked(placeId)) {
      await apiFetch(`/api/bookmarks/${placeId}`, { method: 'DELETE' });
    } else {
      await apiFetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naverPlaceId: placeId }),
      });
    }
    refresh();
  }, [isLoggedIn, isBookmarked, refresh]);

  return { bookmarks, isLoading, isBookmarked, toggle, refresh };
}
