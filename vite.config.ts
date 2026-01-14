import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/expense-cycle/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // 讓你可以控制「有更新時提示使用者」
      includeAssets: ["pwa/icon-192.png", "pwa/icon-512.png"],
      manifest: {
        name: "ExpenseCycle",
        short_name: "ExpenseCycle",
        description: "週期性支出/訂閱管理",
        theme_color: "#1976d2",
        background_color: "#0b0f14",
        display: "standalone",
        scope: "/expense-cycle/",
        start_url: "/expense-cycle/",
        icons: [
          {
            src: "pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // 預設會把 build 後的資源 precache，讓 App 殼可離線開啟
        navigateFallback: "/index.html",
      },
      devOptions: {
        enabled: true, // 開發時也啟用（方便你立刻測試）
      },
    }),
  ],
  server: {
    host: true,
    port: 2222,
    strictPort: true,
  },
});
