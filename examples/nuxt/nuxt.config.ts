import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-10",
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss() as any],
  },
});
