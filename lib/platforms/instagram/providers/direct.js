import { InstagramProvider } from "../provider.js";
import { downloadFile } from "../../../downloader/http.js";
import { 
  InstagramValidationError, 
  InstagramSecurityError, 
  InstagramAccessibilityError 
} from "../errors.js";
import ig from "cakkatrok-instagram-downloader";
import youtubedl from "youtube-dl-exec";
import ffmpeg from "ffmpeg-static";

const cache = new Map();

export class DirectInstagramProvider extends InstagramProvider {
  /**
   * Validates and normalizes an Instagram URL to ensure it is secure and well-formed.
   */
  validateAndNormalizeUrl(inputUrl) {
    let parsed;
    try {
      parsed = new URL(inputUrl);
    } catch {
      throw new InstagramValidationError("Invalid URL format");
    }

    if (parsed.protocol !== "https:") {
      throw new InstagramSecurityError("Only HTTPS URLs are allowed");
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "instagram.com" && hostname !== "www.instagram.com") {
      throw new InstagramSecurityError("SSRF Validation Failed: Non-Instagram domain");
    }

    const pathname = parsed.pathname;
    const match = pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?/);
    if (!match) {
      throw new InstagramValidationError("Unsupported Instagram URL format. Must be a /p/, /reel/, or /tv/ link.");
    }

    return `https://www.instagram.com/${match[1]}/${match[2]}/`;
  }

  async analyze(url) {
    const cleanUrl = this.validateAndNormalizeUrl(url);
    
    // Use a short-lived cache to prevent Rate Limits from back-to-back calls
    if (cache.has(cleanUrl)) {
      const cached = cache.get(cleanUrl);
      if (Date.now() - cached.timestamp < 60000) { // 60 seconds
        return cached.data;
      }
      cache.delete(cleanUrl);
    }

    const mediaId = cleanUrl.split("/").filter(Boolean).pop();

    let result = null;

    // 1. Try yt-dlp first because it can extract high-quality DASH streams with merged Audio+Video
    try {
      const info = await youtubedl(cleanUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
      });

      if (info && info.formats && info.formats.length > 0) {
        result = {
          id: `ig_${mediaId}`,
          platform: "instagram",
          type: "video",
          title: info.title || `Instagram Post ${mediaId}`,
          provider: "ytdlp", // mark the engine used
          formats: [{
             id: "bestvideo+bestaudio/best",
             quality: "Best (Video + Audio)",
             extension: "mp4",
             hasVideo: true,
             hasAudio: true,
             url: cleanUrl // We just pass the cleanUrl back to yt-dlp download phase
          }]
        };
      }
    } catch (err) {
      // yt-dlp failed (likely due to no cookies or login wall), silently fallback to cakkatrok
    }

    // 2. Fallback to free API (cakkatrok) which might have no audio for some reels, but works reliably
    if (!result) {
      try {
        const response = await ig(cleanUrl);

        if (!response || (response.status !== 'success' && response.status !== 'ok')) {
          throw new InstagramAccessibilityError("No media found or extraction failed.");
        }

        const items = response.data || response.media || [];
        if (items.length === 0) {
          throw new InstagramAccessibilityError("No media items found.");
        }

        const formats = [];
        let formatCounter = 1;
        
        for (const item of items) {
          if (item.type === 'video') {
             formats.push({
               id: `ig_video_${formatCounter}`,
               quality: `Video ${formatCounter} (Fallback API)`,
               extension: "mp4",
               hasVideo: true,
               hasAudio: true, // We assume it has audio, though cakkatrok might drop DASH audio
               url: item.url,
               thumbnail: item.thumbnail
             });
             formatCounter++;
          }
        }

        if (formats.length === 0) {
           throw new InstagramAccessibilityError("No video media found in this Instagram post.");
        }

        result = {
          id: `ig_${mediaId}`,
          platform: "instagram",
          type: "video",
          title: `Instagram Post ${mediaId}`,
          provider: "cakkatrok",
          formats: formats
        };
      } catch (error) {
         if (error instanceof InstagramAccessibilityError) {
            throw error;
         }
         throw new InstagramAccessibilityError(`Instagram scraping failed: ${error.message}`);
      }
    }

    cache.set(cleanUrl, { timestamp: Date.now(), data: result });
    return result;
  }

  async download(url, formatId, destination, onProgress) {
    const media = await this.analyze(url);
    const format = media.formats.find(f => f.id === formatId);
    
    if (!format || !format.url) {
       throw new InstagramAccessibilityError("Requested format is unavailable");
    }

    // If yt-dlp was used in analyze, use it for downloading to correctly merge audio/video
    if (media.provider === "ytdlp") {
      return new Promise((resolve, reject) => {
        const subprocess = youtubedl.exec(format.url, {
          format: format.id,
          output: destination,
          noWarnings: true,
          noCheckCertificate: true,
          concurrentFragments: 1,
          mergeOutputFormat: "mp4",
          ffmpegLocation: ffmpeg
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
          if (code === 0) resolve(destination);
          else reject(new Error(`YouTube-dl download failed with exit code ${code}`));
        });

        subprocess.on("error", (err) => {
          reject(new Error(`YouTube-dl download failed: ${err.message}`));
        });
      });
    }

    // Otherwise, use the secure direct HTTP downloader for the fallback API URL
    return downloadFile(format.url, destination, onProgress);
  }
}
