import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { resolveMedia } from "@/lib/platforms/resolver";
import { getDownloadsDirectory } from "@/lib/utils/path";
import { sanitizeFilename } from "@/lib/utils/filename";
import { downloadFile } from "@/lib/downloader/http";
import { downloadYoutubeMedia } from "@/lib/platforms/youtube";
import { activeInstagramProvider } from "@/lib/platforms/instagram";

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, formatId } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const media = await resolveMedia(url);
    const format = media.formats.find(f => f.id === formatId) || media.formats[0];

    const downloadsDir = getDownloadsDirectory();
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const baseFilename = sanitizeFilename(media.title);

    // Instagram posts with multiple images are downloaded one request per image
    // (each served and deleted before the next starts), so the file-existence
    // check below never sees siblings to disambiguate against. Number them
    // explicitly instead, using the index baked into the image's own format id.
    const imageNumber = media.platform === "instagram" && typeof format.id === "string"
      ? format.id.match(/^ig_image_(\d+)$/)?.[1]
      : null;
    const isMultiImagePost = imageNumber && media.formats.filter(f => !f.hasVideo).length > 1;

    const filename = isMultiImagePost ? `${baseFilename} ${imageNumber}` : baseFilename;
    const extension = format.extension;
    let finalPath = `${downloadsDir}${path.sep}${filename}.${extension}`;

    let counter = 1;
    while (fs.existsSync(finalPath)) {
      finalPath = `${downloadsDir}${path.sep}${filename} (${counter}).${extension}`;
      counter++;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event, data) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const onProgress = (progress) => {
          sendEvent("progress", progress);
        };

        try {
          if (media.platform === "youtube") {
            await downloadYoutubeMedia(url, formatId, finalPath, onProgress);
          } else if (media.platform === "instagram") {
            await activeInstagramProvider.download(url, formatId, finalPath, onProgress);
          } else {
            await downloadFile(url, finalPath, onProgress);
          }
          sendEvent("success", { 
            filename: `${filename}.${extension}`,
            serveUrl: `/api/serve?file=${encodeURIComponent(path.basename(finalPath))}`
          });
          controller.close();
        } catch (error) {
          sendEvent("error", { message: error.message || "Unable to download media" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to process request" },
      { status: 500 }
    );
  }
}
