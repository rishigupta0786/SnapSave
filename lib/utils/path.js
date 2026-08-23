import os from "node:os";
import path from "node:path";

export function getDownloadsDirectory() {
  // Vercel serverless has a read-only filesystem; only /tmp is writable
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "downloads");
  }
  const homeDir = os.homedir();
  return path.join(homeDir, "Downloads");
}
