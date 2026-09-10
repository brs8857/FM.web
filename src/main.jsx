import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FMWeb from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FMWeb />
  </React.StrictMode>
);
