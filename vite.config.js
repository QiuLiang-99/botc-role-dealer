import { defineConfig } from "vite";
import vue2 from "@vitejs/plugin-vue2";

export default defineConfig({
  plugins: [vue2()],
  base: "./",
  // 原仓库使用 webpack 的省略后缀导入（如 "./components/Token"），这里补齐 .vue 解析
  resolve: {
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 2000
  }
});
