import test from "node:test";
import assert from "node:assert";

import { DirectInstagramProvider } from "../lib/platforms/instagram/providers/direct.js";
import { 
  InstagramValidationError, 
  InstagramSecurityError, 
  InstagramAccessibilityError 
} from "../lib/platforms/instagram/errors.js";
import { detectPlatform } from "../lib/utils/url.js";

const provider = new DirectInstagramProvider();

test("DirectInstagramProvider Validation - accepts valid /p/ URLs", () => {
  const url = "https://www.instagram.com/p/C_KjV9-P1Q5/";
  assert.strictEqual(provider.validateAndNormalizeUrl(url), url);
});

test("DirectInstagramProvider Validation - accepts valid /reel/ URLs", () => {
  const url = "https://www.instagram.com/reel/C_KjV9-P1Q5/";
  assert.strictEqual(provider.validateAndNormalizeUrl(url), url);
});

test("DirectInstagramProvider Validation - accepts valid /tv/ URLs", () => {
  const url = "https://www.instagram.com/tv/C_KjV9-P1Q5/";
  assert.strictEqual(provider.validateAndNormalizeUrl(url), url);
});

test("DirectInstagramProvider Validation - rejects non-HTTPS URLs", () => {
  assert.throws(() => {
    provider.validateAndNormalizeUrl("http://www.instagram.com/p/123/");
  }, InstagramSecurityError);
});

test("DirectInstagramProvider Validation - rejects non-Instagram domains (SSRF)", () => {
  assert.throws(() => {
    provider.validateAndNormalizeUrl("https://evil.com/p/123/");
  }, InstagramSecurityError);
});

test("DirectInstagramProvider Validation - rejects unsupported Instagram paths", () => {
  assert.throws(() => {
    provider.validateAndNormalizeUrl("https://www.instagram.com/someuser/");
  }, InstagramValidationError);
});

test("detectPlatform correctly identifies Instagram URLs", () => {
  assert.strictEqual(detectPlatform("https://www.instagram.com/p/123/"), "instagram");
  assert.strictEqual(detectPlatform("https://instagram.com/reel/123/"), "instagram");
  assert.strictEqual(detectPlatform("https://www.instagram.com/someuser/"), "direct");
});

test("DirectInstagramProvider Extraction - successfully extracts video using free api", async () => {
  const url = "https://www.instagram.com/reel/DcYdfPmowCD/";
  
  const media = await provider.analyze(url);
  assert.strictEqual(media.platform, "instagram");
  assert.strictEqual(media.type, "video");
  assert.ok(media.formats.length > 0);
  assert.ok(media.formats[0].url.startsWith("http"));
});
