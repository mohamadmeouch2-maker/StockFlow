import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerServiceWorker } from "./pwa/installApp";

// Install as an app: listen for the browser's offer from the start, and add the offline page helper
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
