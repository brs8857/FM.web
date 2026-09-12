import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FMWeb, { installDataset } from "./App.jsx";
import DatasetGate from "./components/app/DatasetGate.jsx";
import { loadDataset } from "./data/loadDataset.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DatasetGate load={loadDataset}>
      {(dataset) => {
        installDataset(dataset);
        return <FMWeb />;
      }}
    </DatasetGate>
  </React.StrictMode>
);
