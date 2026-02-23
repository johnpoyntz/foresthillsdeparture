import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forest Hills Departure",
    short_name: "Departure",
    description: "Real-time MBTA Orange Line leave-time timer for Forest Hills.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ef",
    theme_color: "#ed8b00",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
