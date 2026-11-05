import type { MetadataRoute } from "next";
import { APP_NAME, APP_NAME_EN } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · ${APP_NAME_EN}`,
    short_name: APP_NAME,
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F4",
    theme_color: "#FFF8F4",
  };
}
