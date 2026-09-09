import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5103",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({
                message: "Không thể kết nối máy chủ Backend API (http://localhost:5103). Vui lòng khởi động dịch vụ Backend .NET."
              }));
            }
          });
        }
      }
    }
  }
});
