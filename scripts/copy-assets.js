// Copy non-TS assets into dist after the tsc build.
const fs = require("fs");
const path = require("path");

const copies = [
  ["nodes/SeventeenTrack/seventeenTrack.svg", "nodes/SeventeenTrack/seventeenTrack.svg"],
  ["nodes/SeventeenTrack/seventeenTrack.dark.svg", "nodes/SeventeenTrack/seventeenTrack.dark.svg"],
  ["credentials/seventeenTrackApi.svg", "credentials/seventeenTrackApi.svg"],
];

let missing = 0;
for (const [src, dest] of copies) {
  const from = path.join(__dirname, "..", src);
  const to = path.join(__dirname, "..", "dist", dest);
  if (fs.existsSync(from)) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log("copied", src);
  } else {
    missing++;
    console.error("missing asset:", from);
  }
}
process.exit(missing > 0 ? 1 : 0);
