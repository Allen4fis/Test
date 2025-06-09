import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time data clear for clean state
if (process.env.NODE_ENV === "development") {
  localStorage.removeItem("timeTrackingApp");
  localStorage.removeItem("trackity-doo-backups");
  localStorage.removeItem("timeTrackingApp_fallback");
}

createRoot(document.getElementById("root")!).render(<App />);
