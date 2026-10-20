import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
const root = document.getElementById("root");
const data = document.getElementById("news-data");
const app = (
  <StrictMode>
    <BrowserRouter>
      <App initialData={data ? JSON.parse(data.textContent) : null} />
    </BrowserRouter>
  </StrictMode>
);
if (root.dataset.ssr) hydrateRoot(root, app);
else createRoot(root).render(app);
