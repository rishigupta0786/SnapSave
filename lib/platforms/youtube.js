import { create } from "youtube-dl-exec";
import ffmpeg from "ffmpeg-static";
import path from "path";
import os from "os";
import fs from "fs";

const IS_WINDOWS = os.platform() === 'win32';
const YTDLP_FILENAME = IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp_linux';
const BIN_DIR = path.join(process.cwd(), 'bin', YTDLP_FILENAME);

const youtubedl = create(BIN_DIR);

export async function analyzeYoutubeMedia(url) {
  try {
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      extractorArgs: "youtube:player_client=ios,android,web,tv"
    };

    // If a dummy cookie string is provided via environment variables, write it to a temp file
    let cookieFile = null;
    if (process.env.YOUTUBE_COOKIES) {
      cookieFile = path.join(os.tmpdir(), "yt-cookies.txt");
      fs.writeFileSync(cookieFile, process.env.YOUTUBE_COOKIES);
      options.cookies = cookieFile;
    }

    const info = await youtubedl(url, options);
    
    const title = info.title;
    const id = info.id;

    if (!info.formats || info.formats.length === 0) {
      throw new Error("Failed to find any playable formats");
    }

    // Filter to only real downloadable formats (skip storyboards, mhtml, etc.)
    const videoFormats = info.formats.filter(f => 
      f.url && f.vcodec !== 'none' && f.vcodec !== 'images' && f.ext !== 'mhtml'
    );

    const formats = [];
    
    // Deduplicate by height, keeping the best format for each resolution
    const heightMap = new Map();
    for (const f of videoFormats) {
      const h = f.height || 0;
      if (!heightMap.has(h) || (f.tbr || 0) > (heightMap.get(h).tbr || 0)) {
        heightMap.set(h, f);
      }
    }

    // Sort heights descending
    const sortedHeights = [...heightMap.keys()].sort((a, b) => b - a);

    for (const height of sortedHeights) {
      const f = heightMap.get(height);
      const formatId = f.format_id;
      // If this format already has audio, use it directly; otherwise try merging with best audio
      const hasAudio = f.acodec && f.acodec !== 'none';
      formats.push({
        id: hasAudio ? formatId : `${formatId}+bestaudio/best`,
        quality: `${height}p (Video + Audio)`,
        extension: "mp4",
        hasVideo: true,
        hasAudio: true
      });
    }

    // Always provide a "best available" fallback
    if (formats.length === 0) {
      formats.push({
        id: "best",
        quality: "Best Available",
        extension: "mp4",
        hasVideo: true,
        hasAudio: true
      });
    }

    // Audio-only option
    const audioFormats = info.formats.filter(f => 
      f.url && f.vcodec === 'none' && f.acodec && f.acodec !== 'none'
    );
    if (audioFormats.length > 0) {
       formats.push({
          id: audioFormats[0].format_id,
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
    const options = {
      format: formatId,
      output: destination,
      noWarnings: true,
      noCheckCertificate: true,
      concurrentFragments: 1,
      mergeOutputFormat: "mp4",
      ffmpegLocation: ffmpeg,
      extractorArgs: "youtube:player_client=ios,android,web,tv"
    };

    if (process.env.YOUTUBE_COOKIES) {
      const cookieFile = path.join(os.tmpdir(), "yt-cookies.txt");
      fs.writeFileSync(cookieFile, process.env.YOUTUBE_COOKIES);
      options.cookies = cookieFile;
    }

    const subprocess = youtubedl.exec(url, options);

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
