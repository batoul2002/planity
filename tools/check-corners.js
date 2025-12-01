const Jimp = require('jimp');
const path = process.argv[2] || 'public/images/logo.png';

(async () => {
  const img = await Jimp.read(path);
  const { width, height } = img.bitmap;
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let allTransparent = true;
  for (const [x, y] of points) {
    const a = Jimp.intToRGBA(img.getPixelColor(x, y)).a;
    console.log(`corner (${x},${y}) alpha=${a}`);
    if (a !== 0) allTransparent = false;
  }
  if (!allTransparent) process.exit(2);
})();

