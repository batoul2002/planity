/*
  Edge-aware white background removal for PNG logos.
  - Keeps code unchanged by writing back to the same filename.
  - Flood fills from borders to remove only contiguous near-white pixels.
*/

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function main() {
  const inPath = process.argv[2] || path.join('public', 'images', 'logo.png');
  const outPath = process.argv[3] || inPath; // overwrite by default
  const backup = outPath.replace(/\.png$/i, '.original.png');
  const threshold = parseInt(process.argv[4] || '245', 10); // 0..255 per channel

  if (!fs.existsSync(inPath)) {
    console.error(`Input not found: ${inPath}`);
    process.exit(1);
  }

  const img = await Jimp.read(inPath);
  const { width, height } = img.bitmap;

  // Backup once if not present
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(inPath, backup);
    console.log(`Backup created: ${backup}`);
  } else {
    console.log(`Backup exists: ${backup}`);
  }

  const visited = new Uint8Array(width * height);
  const idx = (x, y) => y * width + x;

  const isNearWhite = (r, g, b, a) => {
    // treat transparent as background too
    if (a === 0) return true;
    return r >= threshold && g >= threshold && b >= threshold;
  };

  const stack = [];
  // seed from all edge pixels
  for (let x = 0; x < width; x++) {
    stack.push([x, 0]);
    stack.push([x, height - 1]);
  }
  for (let y = 1; y < height - 1; y++) {
    stack.push([0, y]);
    stack.push([width - 1, y]);
  }

  let removed = 0;

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = idx(x, y);
    if (visited[i]) continue;
    visited[i] = 1;

    const clr = Jimp.intToRGBA(img.getPixelColor(x, y));
    if (!isNearWhite(clr.r, clr.g, clr.b, clr.a)) continue;

    // set fully transparent
    img.setPixelColor(Jimp.rgbaToInt(clr.r, clr.g, clr.b, 0), x, y);
    removed++;

    // 4-neighbors
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  await img.writeAsync(outPath);
  console.log(`Saved ${outPath} (removed ${removed.toLocaleString()} background px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

