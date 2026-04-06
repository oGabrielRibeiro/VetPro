import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { queryClient } from "./utils/queryClient";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { reportWebVitals } from "./services/webVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

serviceWorkerRegistration.register();
reportWebVitals();
