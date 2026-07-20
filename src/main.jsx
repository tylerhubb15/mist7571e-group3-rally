import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data here (profiles, sessions, matches) doesn't change second to
      // second — the default staleTime of 0 meant every mount and every
      // window refocus refetched everything, all the time. 30s cuts that
      // chatter while staying well under how often anything here actually
      // changes; individual hooks already set a longer staleTime where
      // it's warranted (useProfile, useNearbyCourts, etc).
      staleTime: 1000 * 30,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
