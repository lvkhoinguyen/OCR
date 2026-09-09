import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: "#fef2f2", color: "#991b1b", fontFamily: "sans-serif" }}>
          <h2 style={{ margin: "0 0 12px 0" }}>Đã xảy ra lỗi khi tải giao diện:</h2>
          <pre style={{ background: "#fff", padding: 12, borderRadius: 6, border: "1px solid #fecaca", overflowX: "auto" }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          {this.state.errorInfo && (
            <pre style={{ background: "#fff", padding: 12, borderRadius: 6, border: "1px solid #fecaca", marginTop: 12, overflowX: "auto", fontSize: 12 }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 12, padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
          >
            Xóa bộ nhớ tạm (Clear Cache & LocalStorage) và tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  console.error("Window Error:", event.error || event.message);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
