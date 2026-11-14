import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 親フォルダ（tunetable）の postcss.config.mjs を拾わないようにする。
  // Tailwind は上の Vite プラグインで動かすので PostCSS の設定は不要。
  css: { postcss: {} },
});
