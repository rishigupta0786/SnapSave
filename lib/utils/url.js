import { URL } from "node:url";

export function detectPlatform(input) {
  let parsed;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "instagram.com" ||
    hostname === "www.instagram.com"
  ) {
    if (parsed.pathname.match(/^\/(p|reel|tv)\//)) {
      return "instagram";
    }
  }

  if (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "youtu.be"
  ) {
    return "youtube";
  }

  // Fallback to direct for unknown CDNs or other direct links
  return "direct";
}
