import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          });
        }
      });
    }).catch(() => {});
  });
}

const API_BASE = "https://msme-erp-api-3s11.onrender.com";
function keepAlive() {
  fetch(`${API_BASE}/api/health`).catch(() => {});
}
keepAlive();
setInterval(keepAlive, 4 * 60 * 1000);
