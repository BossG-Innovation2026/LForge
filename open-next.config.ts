import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No R2/KV incremental cache needed: all pages are dynamic and app data
  // lives in the NOTEBOOKS_KV binding.
});
