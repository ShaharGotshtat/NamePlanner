import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF4EF",
    theme_color: "#FFF4EF",
  };
}
