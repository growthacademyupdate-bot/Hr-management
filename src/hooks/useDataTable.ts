import { useState, useMemo, useEffect } from "react";

export type SortOrder = "asc" | "desc";

export interface UseDataTableOptions<T> {
  data: T[];
  searchFields?: ((item: T) => string | undefined | null)[] | ((item: T) => (string | undefined | null)[]);
  defaultSortField?: string;
  defaultSortOrder?: SortOrder;
  defaultPageSize?: number;
  getValueForSort?: (item: T, field: string) => any;
}

export function useDataTable<T extends Record<string, any>>({
  data,
  searchFields,
  defaultSortField = "",
  defaultSortOrder = "asc",
  defaultPageSize = 10,
  getValueForSort,
}: UseDataTableOptions<T>) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, sortField, sortOrder, pageSize]);

  // 1. Search Filter
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const query = search.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields) {
        if (typeof searchFields === "function") {
          const values = searchFields(item);
          return values.some((v) => v != null && String(v).toLowerCase().includes(query));
        } else if (Array.isArray(searchFields)) {
          return searchFields.some((fn) => {
            const val = fn(item);
            return val != null && String(val).toLowerCase().includes(query);
          });
        }
      }
      
      // Default: search all top-level object string/number values
      return Object.values(item).some((val) => {
        if (val == null) return false;
        if (typeof val === "object") return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, search, searchFields]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (getValueForSort) {
        aVal = getValueForSort(a, sortField);
        bVal = getValueForSort(b, sortField);
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === "asc" ? 1 : -1;
      if (bVal == null) return sortOrder === "asc" ? -1 : 1;

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle dates or date strings
      const aDate = Date.parse(aVal);
      const bDate = Date.parse(bVal);
      if (!isNaN(aDate) && !isNaN(bDate) && typeof aVal === "string" && (aVal.includes("-") || aVal.includes("/"))) {
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }

      // Default string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder, getValueForSort]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortField("");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return {
    search,
    setSearch,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    toggleSort,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedData,
    filteredAndSortedData: sortedData,
  };
}
