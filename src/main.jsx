import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./app/App.jsx";
import DatasetGate from "./app/DatasetGate.jsx";
import ErrorBoundary from "./app/ErrorBoundary.jsx";
import UpdatePrompt from "./app/UpdatePrompt.jsx";
import { loadDataset } from "./data/loadDataset.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DatasetGate load={loadDataset}>
        {(dataset) => <App dataset={dataset} />}
      </DatasetGate>
      <UpdatePrompt register={registerSW} />
    </ErrorBoundary>
  </React.StrictMode>
);
