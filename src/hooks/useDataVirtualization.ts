import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface VirtualizationConfig {
  pageSize: number;
  bufferSize: number;
  maxCachePages: number;
}

interface VirtualizedData<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  isLoading: boolean;
  hasNextPage: boolean;
  loadNextPage: () => void;
  jumpToPage: (page: number) => void;
  refresh: () => void;
}

/**
 * Advanced data virtualization hook for handling large datasets
 * Implements progressive loading, caching, and memory management
 */
export function useDataVirtualization<T>(
  allData: T[],
  config: VirtualizationConfig = {
    pageSize: 100,
    bufferSize: 50,
    maxCachePages: 10
  }
): VirtualizedData<T> {
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]));
  const [isLoading, setIsLoading] = useState(false);
  
  // Cache for loaded pages with LRU eviction
  const cacheRef = useRef<Map<number, T[]>>(new Map());
  const accessOrderRef = useRef<number[]>([]);

  const totalCount = allData.length;
  const totalPages = Math.ceil(totalCount / config.pageSize);

  // LRU Cache Management
  const addToCache = useCallback((page: number, data: T[]) => {
    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;

    // Remove if already exists in access order
    const existingIndex = accessOrder.indexOf(page);
    if (existingIndex !== -1) {
      accessOrder.splice(existingIndex, 1);
    }

    // Add to front of access order
    accessOrder.unshift(page);

    // Evict least recently used pages if cache is full
    while (accessOrder.length > config.maxCachePages) {
      const evictPage = accessOrder.pop()!;
      cache.delete(evictPage);
      setLoadedPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(evictPage);
        return newSet;
      });
    }

    cache.set(page, data);
  }, [config.maxCachePages]);

  // Load data for a specific page
  const loadPage = useCallback(async (page: number) => {
    if (page < 0 || page >= totalPages || loadedPages.has(page)) {
      return;
    }

    setIsLoading(true);
    
    // Simulate async loading (in real app, this would be an API call)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const startIndex = page * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, totalCount);
    const pageData = allData.slice(startIndex, endIndex);
    
    addToCache(page, pageData);
    setLoadedPages(prev => new Set([...prev, page]));
    setIsLoading(false);
  }, [allData, totalCount, totalPages, config.pageSize, loadedPages, addToCache]);

  // Get currently visible items
  const visibleItems = useMemo(() => {
    const items: T[] = [];
    const cache = cacheRef.current;
    
    // Calculate visible page range
    const startPage = Math.max(0, currentPage - Math.floor(config.bufferSize / config.pageSize));
    const endPage = Math.min(totalPages - 1, currentPage + Math.floor(config.bufferSize / config.pageSize));
    
    for (let page = startPage; page <= endPage; page++) {
      const pageData = cache.get(page);
      if (pageData) {
        items.push(...pageData);
      }
    }
    
    return items;
  }, [currentPage, config.bufferSize, config.pageSize, totalPages, loadedPages]);

  // Load next page
  const loadNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    if (nextPage < totalPages) {
      setCurrentPage(nextPage);
      loadPage(nextPage);
      
      // Preload next few pages
      for (let i = 1; i <= 2; i++) {
        const preloadPage = nextPage + i;
        if (preloadPage < totalPages) {
          loadPage(preloadPage);
        }
      }
    }
  }, [currentPage, totalPages, loadPage]);

  // Jump to specific page
  const jumpToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      loadPage(page);
    }
  }, [totalPages, loadPage]);

  // Refresh data
  const refresh = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current = [];
    setLoadedPages(new Set([0]));
    setCurrentPage(0);
    loadPage(0);
  }, [loadPage]);

  // Initialize first page
  useEffect(() => {
    if (totalCount > 0 && !loadedPages.has(0)) {
      loadPage(0);
    }
  }, [totalCount, loadedPages, loadPage]);

  // Preload adjacent pages
  useEffect(() => {
    const preloadPages = [currentPage - 1, currentPage + 1];
    preloadPages.forEach(page => {
      if (page >= 0 && page < totalPages && !loadedPages.has(page)) {
        loadPage(page);
      }
    });
  }, [currentPage, totalPages, loadedPages, loadPage]);

  return {
    items: visibleItems,
    totalCount,
    currentPage,
    isLoading,
    hasNextPage: currentPage < totalPages - 1,
    loadNextPage,
    jumpToPage,
    refresh
  };
}

/**
 * Hook for infinite scroll with virtualization
 */
export function useInfiniteVirtualization<T>(
  allData: T[],
  itemsPerLoad: number = 100
) {
  const [loadedCount, setLoadedCount] = useState(itemsPerLoad);
  const [isLoading, setIsLoading] = useState(false);

  const visibleItems = useMemo(() => {
    return allData.slice(0, loadedCount);
  }, [allData, loadedCount]);

  const loadMore = useCallback(async () => {
    if (loadedCount >= allData.length || isLoading) return;

    setIsLoading(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setLoadedCount(prev => Math.min(prev + itemsPerLoad, allData.length));
    setIsLoading(false);
  }, [loadedCount, allData.length, isLoading, itemsPerLoad]);

  const hasMore = loadedCount < allData.length;

  return {
    items: visibleItems,
    isLoading,
    hasMore,
    loadMore,
    totalCount: allData.length,
    loadedCount
  };
}
