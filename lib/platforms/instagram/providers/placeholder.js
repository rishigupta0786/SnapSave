import { InstagramProvider } from "../provider";

export class PlaceholderInstagramProvider extends InstagramProvider {
  async analyze(url) {
    throw new Error("Instagram downloads require a third-party provider API to function without authentication. Please configure an Instagram provider.");
  }

  async download(url, formatId, destination, onProgress) {
    throw new Error("Instagram downloads require a third-party provider API to function without authentication. Please configure an Instagram provider.");
  }
}

// Export a singleton instance
export const placeholderInstagramProvider = new PlaceholderInstagramProvider();
