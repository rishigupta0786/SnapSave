import { create } from "youtube-dl-exec";
import ffmpeg from "ffmpeg-static";
import path from "path";
import os from "os";

const IS_WINDOWS = os.platform() === 'win32';
const YTDLP_FILENAME = IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp_linux';
const BIN_DIR = path.join(process.cwd(), 'bin', YTDLP_FILENAME);

const youtubedl = create(BIN_DIR);

export async function analyzeYoutubeMedia(url) {
  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      extractorArgs: "youtube:player_client=ios,android,web"
    });
    
    const title = info.title;
    const id = info.id;

    if (!info.formats || info.formats.length === 0) {
      throw new Error("Failed to find any playable formats");
    }

    const availableHeights = [...new Set(
      info.formats
        .filter(f => f.vcodec !== 'none' && f.height)
        .map(f => f.height)
    )].sort((a, b) => b - a);

    const formats = [];
    
    for (const height of availableHeights) {
       formats.push({
          id: `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
          quality: `${height}p (Video + Audio)`,
          extension: "mp4",
          hasVideo: true,
          hasAudio: true
       });
    }

    const hasAudioOnly = info.formats.some(f => f.vcodec === 'none' && f.acodec !== 'none');
    if (hasAudioOnly || formats.length === 0) {
       formats.push({
          id: "bestaudio/best",
          quality: "Best Audio Only",
          extension: "m4a",
          hasVideo: false,
          hasAudio: true
       });
    }

    return {
      id: `yt_${id}`,
      platform: "youtube",
      type: "video",
      title: title,
      formats: formats
    };
  } catch (error) {
    console.error("YTDL Error:", error);
    throw new Error(`YouTube media analysis failed: ${error.stack || error.message || error}`);
  }
}

export function downloadYoutubeMedia(url, formatId, destination, onProgress) {
  return new Promise((resolve, reject) => {
    const subprocess = youtubedl.exec(url, {
      format: formatId,
      output: destination,
      noWarnings: true,
      noCheckCertificate: true,
      concurrentFragments: 1,
      mergeOutputFormat: "mp4",
      ffmpegLocation: ffmpeg,
      extractorArgs: "youtube:player_client=ios,android,web"
    });

    let currentTotalBytes = 0;

    subprocess.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      
      const percentMatch = text.match(/\[download\]\s+([\d\.]+)%/);
      if (percentMatch) {
         const percentage = parseFloat(percentMatch[1]);
         
         const sizeMatch = text.match(/of\s+~?\s*([\d\.]+)(KiB|MiB|GiB|B)/);
         let totalBytes = currentTotalBytes;
         
         if (sizeMatch) {
           const sizeVal = parseFloat(sizeMatch[1]);
           const unit = sizeMatch[2];
           if (unit === 'GiB') totalBytes = sizeVal * 1024 * 1024 * 1024;
           else if (unit === 'MiB') totalBytes = sizeVal * 1024 * 1024;
           else if (unit === 'KiB') totalBytes = sizeVal * 1024;
           else if (unit === 'B') totalBytes = sizeVal;
           currentTotalBytes = totalBytes;
         }

         if (onProgress) {
           const downloadedBytes = totalBytes ? Math.round((percentage / 100) * totalBytes) : 0;
           onProgress({ downloadedBytes, totalBytes });
         }
      }
    });

    subprocess.on("close", (code) => {
      if (code === 0) {
        resolve(destination);
      } else {
        reject(new Error(`YouTube download failed with exit code ${code}`));
      }
    });

    subprocess.on("error", (err) => {
      reject(new Error(`YouTube download failed: ${err.message}`));
    });
  });
}
