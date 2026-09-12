import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.PUBLIC_SUPABASE_URL": JSON.stringify(
        env.NETLIFY_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || ""
      ),
      "import.meta.env.PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
        env.NETLIFY_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ""
      )
    },
    server: {
      port: 5173,
      open: false
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      target: "es2020"
    }
  };
});
