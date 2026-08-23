"use client";

import { useState } from "react";
import UrlInput from "./components/UrlInput";
import MediaPreview from "./components/MediaPreview";
import QualitySelector from "./components/QualitySelector";

export default function Home() {
  const [media, setMedia] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");

  const [downloadProgress, setDownloadProgress] = useState(null);

  const handleDownload = async () => {
    if (!media || !selectedFormat) return;

    try {
      setDownloading(true);
      setDownloadMessage("Starting download...");
      setDownloadProgress(null);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: media.url,
          formatId: selectedFormat
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to start download (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;
            
            const data = JSON.parse(dataStr);
            if (currentEvent === 'progress') {
              setDownloadProgress(data);
              setDownloadMessage("Downloading...");
            } else if (currentEvent === 'success') {
              setDownloadMessage("Download complete! Saving file...");
              setDownloadProgress(null);
              // Trigger browser's native Save As dialog
              const a = document.createElement("a");
              a.href = data.serveUrl;
              a.download = data.filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setDownloadMessage("File saved successfully!");
            } else if (currentEvent === 'error') {
              throw new Error(data.message);
            }
          }
        }
      }
    } catch (error) {
      setDownloadMessage(`Error: ${error.message}`);
      setDownloadProgress(null);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-black">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl overflow-hidden p-8">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Media Downloader
          </h1>
          <p className="text-gray-500 text-lg">
            Download supported media to your local <span className="font-semibold">Downloads</span> folder.
          </p>
        </div>

        <UrlInput
          onResult={(result) => {
            setMedia(result);
            setDownloadMessage("");
            setDownloadProgress(null);
            if (result.formats?.length) {
              setSelectedFormat(result.formats[0].id);
            }
          }}
        />

        {media && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MediaPreview media={media} />

            {media.formats && (
              <QualitySelector
                formats={media.formats}
                selected={selectedFormat}
                onSelect={setSelectedFormat}
              />
            )}

            <div className="pt-4 border-t">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {downloading ? "Downloading..." : "Download Media"}
              </button>

              {downloadProgress && (
                <div className="mt-4 fade-in animate-in duration-300">
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress.totalBytes ? Math.min(100, Math.max(2, Math.round((downloadProgress.downloadedBytes / downloadProgress.totalBytes) * 100))) : 5}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2 flex justify-between font-medium">
                    <span>
                      {downloadProgress.totalBytes ? `${Math.round((downloadProgress.downloadedBytes / downloadProgress.totalBytes) * 100)}%` : 'Downloading...'}
                    </span>
                    <span>
                      {(downloadProgress.downloadedBytes / 1024 / 1024).toFixed(1)} MB 
                      {downloadProgress.totalBytes ? ` / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {downloadMessage && (
              <div className={`p-4 rounded-lg mt-4 font-medium shadow-sm transition-all ${downloadMessage.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                {downloadMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
