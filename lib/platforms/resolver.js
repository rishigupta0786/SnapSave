import { detectPlatform } from "../utils/url";
import { analyzeDirectMedia } from "./direct";
import { analyzeYoutubeMedia } from "./youtube";
import { activeInstagramProvider } from "./instagram";

export async function resolveMedia(url) {
  const platform = detectPlatform(url);

  switch (platform) {
    case "direct":
      return analyzeDirectMedia(url);

    case "youtube":
      return analyzeYoutubeMedia(url);

    case "instagram":
      return activeInstagramProvider.analyze(url);

    default:
      throw new Error("Unsupported platform");
  }
}
