import React from "react";
import { ErrorNote } from "./Shared.jsx";

// Catches render-time throws anywhere below it (a null read on a
// malformed row, a third-party SDK error, etc.) that would otherwise
// unmount the whole React tree and white-screen the app with nothing but
// a console stack trace. getDerivedStateFromError/componentDidCatch only
// exist as class lifecycle methods — there's no hook equivalent, so this
// has to be a class component even though the rest of the app is
// functional.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Rally crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rally court-bg flex-center p-24">
        <div className="card p-24 max-w-380">
          <ErrorNote
            error={this.state.error}
            label={`Something went wrong: ${this.state.error.message || "Unknown error"}`}
          />
          <button className="btn btn-o btn-full" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
