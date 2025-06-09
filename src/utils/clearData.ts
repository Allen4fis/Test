// One-time data clearing utility
export const clearApplicationData = () => {
  // Clear the main data
  localStorage.removeItem("timeTrackingApp");

  // Clear any backup data
  localStorage.removeItem("trackity-doo-backups");

  // Clear fallback storage
  localStorage.removeItem("timeTrackingApp_fallback");

  // Reload the page to ensure fresh state
  window.location.reload();
};

// Auto-execute if this file is imported during development
if (process.env.NODE_ENV === "development") {
  // This will run once to clear existing data
  clearApplicationData();
}
