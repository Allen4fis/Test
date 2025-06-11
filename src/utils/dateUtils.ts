/**
 * Robust date parsing utilities with proper error handling
 */

// Helper function to parse date string as local date (fixes timezone issues)
export const parseLocalDate = (dateString: string | undefined | null): Date => {
  // Handle null/undefined cases
  if (!dateString || typeof dateString !== "string") {
    console.warn("Invalid date string provided:", dateString);
    return new Date(); // Return current date as fallback
  }

  // Handle empty string
  if (dateString.trim() === "") {
    console.warn("Empty date string provided");
    return new Date(); // Return current date as fallback
  }

  try {
    // Handle different date formats
    if (dateString.includes("-")) {
      // Expected format: YYYY-MM-DD
      const parts = dateString.split("-");
      if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateString}`);
      }

      const [year, month, day] = parts.map(Number);

      // Validate the numbers
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid date components: ${dateString}`);
      }

      // Validate ranges
      if (year < 1900 || year > 2100) {
        throw new Error(`Invalid year: ${year}`);
      }
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      if (day < 1 || day > 31) {
        throw new Error(`Invalid day: ${day}`);
      }

      const date = new Date(year, month - 1, day); // month is 0-indexed

      // Double-check the date is valid (handles invalid dates like Feb 30)
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        throw new Error(
          `Invalid date: ${dateString} resulted in ${date.toISOString()}`,
        );
      }

      return date;
    } else {
      // Try parsing as ISO string or other formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Could not parse date: ${dateString}`);
      }
      return date;
    }
  } catch (error) {
    console.error("Date parsing error:", error);
    console.warn("Falling back to current date for:", dateString);
    return new Date(); // Return current date as fallback
  }
};

// Safe date formatting function
export const formatLocalDate = (
  dateString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions,
): string => {
  try {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid Date";
  }
};

// Check if a date string is valid
export const isValidDateString = (
  dateString: string | undefined | null,
): boolean => {
  if (
    !dateString ||
    typeof dateString !== "string" ||
    dateString.trim() === ""
  ) {
    return false;
  }

  try {
    const date = parseLocalDate(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

// Get today's date in YYYY-MM-DD format
export const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Get date N days ago in YYYY-MM-DD format
export const getDaysAgoString = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

// Convert Date object to YYYY-MM-DD string
export const dateToString = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return getTodayString();
  }
  return date.toISOString().split("T")[0];
};
