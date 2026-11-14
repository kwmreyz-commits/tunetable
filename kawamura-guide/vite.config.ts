import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 公開版（--mode public）以外は、検索エンジンに載らないようにする
const noindexUnlessPublic = (mode: string): Plugin => ({
  name: "noindex-unless-public",
  transformIndexHtml: () =>
    mode === "public"
      ? []
      : [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" }, injectTo: "head" }],
});

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), noindexUnlessPublic(mode)],
  // 親フォルダ（tunetable）の postcss.config.mjs を拾わないようにする。
  // Tailwind は上の Vite プラグインで動かすので PostCSS の設定は不要。
  css: { postcss: {} },
}));
