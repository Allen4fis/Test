import { useState, useMemo } from "react";

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  pageInfo: string;
  startItem: number;
  endItem: number;
}

export function usePagination<T>({
  data,
  itemsPerPage = 20,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageInfo = `${startItem}-${endItem} of ${totalItems}`;

  // Reset to page 1 when data changes significantly
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
    pageInfo,
    startItem,
    endItem,
  };
}
