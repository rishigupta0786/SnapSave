import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

export async function downloadFile(url, destination, onProgress) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response does not contain a body");
  }

  const totalBytes = parseInt(response.headers.get("content-length") || "0", 10);
  let downloadedBytes = 0;

  const progressStream = new Transform({
    transform(chunk, encoding, callback) {
      downloadedBytes += chunk.length;
      if (onProgress) {
        onProgress({ downloadedBytes, totalBytes });
      }
      callback(null, chunk);
    }
  });

  const fileStream = fs.createWriteStream(destination);

  await pipeline(
    response.body,
    progressStream,
    fileStream
  );

  return destination;
}
