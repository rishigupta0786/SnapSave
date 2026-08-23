import youtubedl from "youtube-dl-exec";

async function run() {
  try {
    const url = "https://www.youtube.com/watch?v=zBjJUV-lzHo";
    console.log("Fetching...");
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });
    console.log("Success", info.title);
  } catch (error) {
    console.log("CATCH BLOCK");
    console.log("Message:", error.message);
    console.log("Stderr:", error.stderr);
    console.log("Stdout:", error.stdout);
    console.log("Code:", error.code);
  }
}
run();
