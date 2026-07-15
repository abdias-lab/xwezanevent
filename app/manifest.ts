import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "XwézanEvent — Billetterie du Bénin",
    short_name: "XwézanEvent",
    description: "Concerts, festivals, soirées, culture — réservez vos tickets en quelques secondes",
    start_url: "/",
    display: "standalone",
    background_color: "#151009",
    theme_color: "#151009",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
