import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import FMWeb from "./App.jsx";
import DatasetGate from "./components/app/DatasetGate.jsx";
import ErrorBoundary from "./components/app/ErrorBoundary.jsx";
import { loadDataset } from "./data/loadDataset.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DatasetGate load={loadDataset}>
        {(dataset) => <FMWeb dataset={dataset} />}
      </DatasetGate>
    </ErrorBoundary>
  </React.StrictMode>
);
