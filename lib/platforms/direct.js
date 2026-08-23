import crypto from "node:crypto";

export async function analyzeDirectMedia(url) {
  try {
    // Perform a HEAD request to check the Content-Type
    const response = await fetch(url, { method: "HEAD" });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch media info: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let mediaType = "unknown";
    let extension = "bin";
    
    if (contentType.startsWith("image/")) {
      mediaType = "image";
      extension = contentType.split("/")[1] || "jpg";
    } else if (contentType.startsWith("video/")) {
      mediaType = "video";
      extension = contentType.split("/")[1] || "mp4";
    } else if (contentType.startsWith("audio/")) {
      mediaType = "audio";
      extension = contentType.split("/")[1] || "mp3";
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const id = "direct_" + crypto.randomBytes(4).toString("hex");
    const filenameFromUrl = url.split("/").pop().split("?")[0] || "Direct Media";

    const formats = [
      {
        id: "original",
        quality: "Original",
        extension,
        hasVideo: mediaType === "video",
        hasAudio: mediaType === "video" || mediaType === "audio"
      }
    ];

    return {
      id,
      platform: "direct",
      type: mediaType,
      title: filenameFromUrl,
      formats
    };
  } catch (error) {
    throw new Error(`Direct media analysis failed: ${error.message}`);
  }
}
