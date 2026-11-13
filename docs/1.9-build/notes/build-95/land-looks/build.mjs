// The land looks. page for the owner (build 95 note 16): the kit's own
// style, whole, around body.html. Writes page.html (a whole document, for the
// check) and artifact.html (the same without the document's own tags, as the
// Artifact tool publishes a page).   node docs/1.9-build/notes/build-95/holy-mountain/build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const kit = fs.readFileSync(path.join(HERE, "../../../../brand/kit/artifact-template.html"), "utf8");
const style = kit.slice(kit.indexOf("<style"), kit.indexOf("</style>") + 8);
const fonts = kit.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
// Two small things the page needs that the kit has no piece for, built from its tokens alone:
// two stills side by side, and a name with its reason under it.
const own = `<style>
.hm-name { margin-block: var(--k-space-6) 0; }
.hm-pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--k-space-3); margin-block: var(--k-space-3) var(--k-space-4); }
.hm-pair .k-figure { margin: 0; min-width: 0; }
.hm-pair .k-figure img { border-radius: 14px; }
.hm-pair figcaption { text-align: center; font-family: var(--k-font-sans); }
.hm-why { margin: 0 0 var(--k-space-5); max-width: var(--k-measure); }
.hm-why dt { margin-block-start: var(--k-space-3); font-family: var(--k-font-sans); font-size: var(--k-text-caption); line-height: 18px; color: var(--k-ink-3); }
.hm-why dd { margin: var(--k-space-1) 0 0; font-family: var(--k-font-serif); font-size: var(--k-text-body); line-height: 1.6; color: var(--k-ink-2); }
.hm-reasons dt { margin-block-start: var(--k-space-5); padding-block-start: var(--k-space-4); border-block-start: 1px solid var(--k-line); font-family: var(--k-font-serif); font-weight: 600; font-size: 18px; line-height: 24px; color: var(--k-ink); }
.hm-reasons dt:first-child { margin-block-start: var(--k-space-3); }
</style>`;
const rows = fs.existsSync(path.join(HERE, "rows.html")) ? fs.readFileSync(path.join(HERE, "rows.html"), "utf8").trim() : "";
const body = fs.readFileSync(path.join(HERE, "body.html"), "utf8").replace("<!--ROWS-->", rows);
const head = `<title>Land looks rework</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n${style}\n${own}`;
fs.writeFileSync(path.join(HERE, "page.html"), `<!doctype html>\n<html lang="en" dir="ltr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
fs.writeFileSync(path.join(HERE, "artifact.html"), `${head}\n${body}\n`);
console.log("page.html", fs.statSync(path.join(HERE, "page.html")).size, "bytes");
