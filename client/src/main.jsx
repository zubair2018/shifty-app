// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* If Vite serves under a sub-path, set basename accordingly.
       For now we keep it root; if URL looks like /shif-T-/,
       you can change to basename="/shif-T-/" */}
<BrowserRouter basename="/shif-T-/">
  <App />
</BrowserRouter>

  </React.StrictMode>
);
