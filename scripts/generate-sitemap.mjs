import { mkdirSync, writeFileSync } from "node:fs";
import { problems } from "../src/data/problems.ts";

const SITE = "https://dsa-with.ragug.com";
const today = new Date().toISOString().slice(0, 10);

const paths = [
  "/",
  "/about",
  "/playground",
  ...problems.map((p) => `/problems/${encodeURIComponent(p.id)}/`),
];

const urls = paths
  .map(
    (path) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/sitemap.xml", xml);
writeFileSync(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(`sitemap.xml written with ${paths.length} URLs`);
