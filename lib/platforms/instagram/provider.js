/**
 * Base class for an Instagram Download Provider.
 * All future providers (e.g., RapidAPI, headless browser scrapers) must implement this interface.
 */
export class InstagramProvider {
  /**
   * Analyzes the given Instagram URL and returns metadata and available formats.
   * @param {string} url - The Instagram media URL
   * @returns {Promise<Object>} An object containing { id, platform, type, title, formats: [...] }
   */
  async analyze(url) {
    throw new Error("analyze() must be implemented by the provider");
  }

  /**
   * Downloads the specific format to the destination.
   * @param {string} url - The Instagram media URL
   * @param {string} formatId - The ID of the format to download
   * @param {string} destination - The absolute path where the file should be saved
   * @param {Function} onProgress - Callback for real-time progress updates: ({ downloadedBytes, totalBytes }) => void
   * @returns {Promise<string>} The destination path
   */
  async download(url, formatId, destination, onProgress) {
    throw new Error("download() must be implemented by the provider");
  }
}
