// Judge saved recordings with the old measure (the export worktree's, at the head) and the new one (the main checkout's).
import fs from "node:fs";
const files = process.argv.slice(2);
const OLD = await import(process.env.OLD_FRAMES ?? "/home/user/purifyapp/scripts/gate/frames.mjs");
const NEW = await import("/home/user/purifyapp/scripts/gate/frames.mjs");
for (const f of files) {
  const { name, rec } = JSON.parse(fs.readFileSync(f, "utf8"));
  const o = await OLD.judgeFrames(rec, { motion: "on" });
  const n = await NEW.judgeFrames(rec, { motion: "on" });
  const say = (v) => `${v.fails.length ? v.fails.map((x) => `${x.kind}: ${x.detail}`).join("; ") : "passes"}${v.glides?.length ? ` [glide: ${v.glides.join("; ")}]` : ""}${v.unsure.length ? ` [unsure: ${v.unsure.join("; ")}]` : ""}`;
  console.log(`${f.split("/").pop()} (${name}, ${rec.frames.length} frames, change ${o.change}):\n  old: ${say(o)}\n  new: ${say(n)}`);
}
