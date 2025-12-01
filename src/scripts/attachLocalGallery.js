const fs = require('fs');
const path = require('path');

const VENUE_JSON = path.join(__dirname, '..', 'public', 'data', 'venue-details.json');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'venues');

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const naturalCompare = (a, b) => {
  const getParts = (str) => {
    const match = str.match(/(\d+)(\.[^.]+)?$/);
    return match ? Number(match[1]) : Infinity;
  };
  return getParts(a) - getParts(b);
};

if (!fs.existsSync(VENUE_JSON)) {
  console.error('Cannot find venue-details.json');
  process.exit(1);
}

const files = fs
  .readdirSync(IMAGES_DIR)
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file));

const imageMap = new Map();
files.forEach((file) => {
  const base = file.replace(/\d+(?=\.[^.]+$)/, '').replace(/\.[^.]+$/, '').trim();
  const slug = slugify(base);
  if (!slug) return;
  if (!imageMap.has(slug)) {
    imageMap.set(slug, []);
  }
  imageMap.get(slug).push(file);
});

imageMap.forEach((list) => list.sort(naturalCompare));

const data = JSON.parse(fs.readFileSync(VENUE_JSON, 'utf8'));
const fallbackGallery = [
  'images/venues/venue2 (2).jpeg',
  'images/venues/venue3.jpeg',
  'images/venues/venue4.jpeg',
];

const findImagesForSlug = (slug) => {
  if (imageMap.has(slug)) {
    return imageMap.get(slug);
  }
  for (const [key, files] of imageMap.entries()) {
    if (slug.includes(key)) {
      return files;
    }
  }
  for (const [key, files] of imageMap.entries()) {
    if (key.includes(slug)) {
      return files;
    }
  }
  return null;
};

let updated = 0;
const unmatched = [];

data.forEach((venue) => {
  const slug = venue.slug;
  const filesForSlug = findImagesForSlug(slug);
  if (!filesForSlug || !filesForSlug.length) {
    venue.gallery = fallbackGallery;
    venue.heroImage = fallbackGallery[0];
    unmatched.push(slug);
    return;
  }
  let gallery = filesForSlug.slice(0, 3).map((file) => `images/venues/${file}`);
  while (gallery.length && gallery.length < 3) {
    gallery.push(gallery[gallery.length % filesForSlug.length]);
  }
  venue.gallery = gallery;
  venue.heroImage = gallery[0];
  updated += 1;
});

fs.writeFileSync(VENUE_JSON, JSON.stringify(data, null, 2));

console.log(`Updated ${updated} venue entries with local galleries.`);
if (unmatched.length) {
  console.warn(`No local images found for ${unmatched.length} venues: ${unmatched.join(', ')}`);
}
