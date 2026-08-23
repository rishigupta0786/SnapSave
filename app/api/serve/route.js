import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDownloadsDirectory } from "@/lib/utils/path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json({ error: "File parameter is required" }, { status: 400 });
    }

    // Prevent path traversal attacks
    const sanitized = path.basename(file);
    const downloadsDir = getDownloadsDirectory();
    const filePath = `${downloadsDir}${path.sep}${sanitized}`;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(sanitized).toLowerCase();

    const mimeTypes = {
      ".mp4": "video/mp4",
      ".m4a": "audio/mp4",
      ".webm": "video/webm",
      ".mkv": "video/x-matroska",
      ".mp3": "audio/mpeg",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Clean up the temp file after reading
    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitized}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to serve file" },
      { status: 500 }
    );
  }
}
