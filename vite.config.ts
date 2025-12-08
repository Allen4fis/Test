import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    hmr: {
      protocol: "http",
      host: "localhost",
      port: 5173,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enhanced build optimizations
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
        pure_funcs:
          mode === "production" ? ["console.log", "console.info"] : [],
      },
    },
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
          ],
          charts: ["recharts"],
          utils: ["date-fns", "clsx", "class-variance-authority"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
          icons: ["lucide-react"],
        },
        // Optimize asset naming for better caching
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Enable tree shaking for optimal bundle size
    sourcemap: mode === "development",
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server startup
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "date-fns",
      "recharts",
    ],
    // Exclude large dependencies that should be loaded on demand
    exclude: ["@react-three/fiber"],
  },
  // Enable CSS code splitting
  css: {
    codeSplit: true,
    preprocessorOptions: {
      scss: {
        charset: false,
      },
    },
  },
}));
