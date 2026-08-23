import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import https from 'https';

const BIN_DIR = path.join(process.cwd(), 'bin');
const IS_WINDOWS = os.platform() === 'win32';
const YTDLP_FILENAME = IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp_linux';
const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_FILENAME}`;

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      
      const file = createWriteStream(dest, { flags: 'w' });
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  try {
    await fs.mkdir(BIN_DIR, { recursive: true });
    const destPath = path.join(BIN_DIR, YTDLP_FILENAME);
    
    console.log(`Downloading ${YTDLP_FILENAME} to ${destPath}...`);
    await downloadFile(YTDLP_URL, destPath);
    
    if (!IS_WINDOWS) {
      console.log(`Making ${destPath} executable...`);
      await fs.chmod(destPath, 0o755);
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Failed to setup yt-dlp:', error);
    process.exit(1);
  }
}

main();
