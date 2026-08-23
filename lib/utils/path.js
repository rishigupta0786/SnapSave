import os from "node:os";
import path from "node:path";

export function getDownloadsDirectory() {
  const homeDir = os.homedir();
  return path.join(homeDir, "Downloads");
}
