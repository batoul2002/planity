const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const normalizeColor = (raw) => raw.trim().toLowerCase();

function listByStyle(rootFolder, event, style) {
  const base = path.join(publicDir, 'images', rootFolder);
  const entries = [];
  const subdirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory());
  subdirs.forEach((dirent) => {
    const color = normalizeColor(dirent.name.split(' ').pop());
    const dir = path.join(base, dirent.name);
    const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
    files.forEach((file) => {
      entries.push({
        event,
        style,
        color,
        name: file,
        image: path.join('images', rootFolder, dirent.name, file).replace(/\\/g, '/')
      });
    });
  });
  return entries;
}

function listFlat(rootFolder, event, style) {
  const base = path.join(publicDir, 'images', rootFolder);
  const entries = [];
  const files = fs.readdirSync(base).filter((f) => !f.startsWith('.'));
  files.forEach((file) => {
    entries.push({
      event,
      style,
      color: '',
      name: file,
      image: path.join('images', rootFolder, file).replace(/\\/g, '/')
    });
  });
  return entries;
}

const manifest = [
  ...listByStyle('bohemian cards', 'wedding', 'bohemian'),
  ...listByStyle('classic cards', 'wedding', 'classic'),
  ...listByStyle('rustic cards', 'wedding', 'rustic'),
  ...listByStyle('graduationEvent', 'graduation', 'grad'),
  ...listByStyle('BirthdayEvents', 'birthday', 'birthday'),
  ...listByStyle('ramadanEvents', 'ramadan', 'ramadan'),
  ...listFlat('genderRevealEvents', 'gender', 'gender')
];

// Deterministic pseudo-price based on name
const priceBuckets = {
  wedding: [1.79, 1.89, 1.99, 2.19, 2.39],
  graduation: [1.49, 1.59, 1.69, 1.79, 1.89],
  birthday: [0.99, 1.09, 1.19, 1.29, 1.39],
  ramadan: [1.39, 1.49, 1.59, 1.69, 1.79],
  gender: [0.89, 0.95, 0.99, 1.05, 1.09]
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

manifest.forEach((item) => {
  const buckets = priceBuckets[item.event] || [1.59, 1.79, 1.99];
  const idx = hash(item.name) % buckets.length;
  const base = buckets[idx];
  item.price = base;
  item.salePrice = Math.max(0.79, +(base * 0.8).toFixed(2));
});

const outPath = path.join(publicDir, 'data', 'invitations.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${manifest.length} invitation items to ${path.relative(process.cwd(), outPath)}`);

// Also emit a JS fallback so the gallery can work even when fetch() to the JSON is blocked
const jsOutPath = path.join(publicDir, 'data', 'invitations-manifest.js');
const jsContent = `window.INVITATION_MANIFEST = ${JSON.stringify(manifest)};`;
fs.writeFileSync(jsOutPath, jsContent);
console.log(`Wrote invitation manifest fallback to ${path.relative(process.cwd(), jsOutPath)}`);
