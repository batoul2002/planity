const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const root = path.join(__dirname, "..");
const venuePath = path.join(root, "public", "venue.html");
const imagesDir = path.join(root, "public", "images", "venues");
const outputPath = path.join(root, "public", "data", "venue-details.json");
const oreblancPath = path.join(root, "public", "data", "oreblanc-venues.json");

const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const toTitle = (text = "") => text.replace(/\s+/g, " ").trim();

const html = fs.readFileSync(venuePath, "utf8");
const $ = cheerio.load(html);
const imageFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
const oreblancData = fs.existsSync(oreblancPath)
  ? JSON.parse(fs.readFileSync(oreblancPath, "utf8"))
  : [];

const oreblancMap = {};
const registerOreEntry = (item) => {
  if (!item) return;
  oreblancMap[item.slug] = item;
  const cleanTitle = item.title?.replace(/\(.*?\)/g, "");
  if (cleanTitle) {
    const altSlug = slugify(cleanTitle);
    if (!oreblancMap[altSlug]) {
      oreblancMap[altSlug] = item;
    }
  }
};
oreblancData.forEach(registerOreEntry);

const findOreData = (slug, title) => {
  if (oreblancMap[slug]) return oreblancMap[slug];
  const altSlug = title ? slugify(title.replace(/\(.*?\)/g, "")) : "";
  if (altSlug && oreblancMap[altSlug]) return oreblancMap[altSlug];
  const match = oreblancData.find(
    (item) => slug.includes(item.slug) || item.slug.includes(slug) || item.title?.toLowerCase().includes(title?.toLowerCase() || "")
  );
  return match;
};

const venues = [];

$(".venue-card").each((_, card) => {
  const title = toTitle($(card).find("h3").first().text());
  if (!title) return;

  const slug = slugify(title);
  const location = toTitle($(card).find(".venue-card-head p").first().text());
  const region = toTitle($(card).find(".venue-region").first().text());
  const type = toTitle($(card).find(".venue-setting-tag").first().text());
  const summary = toTitle($(card).find(".venue-note").text()) || "Planity scouted venue.";
  const heroImage = $(card).find(".venue-card-media img").attr("src") || "";

  const metaItems = $(card)
    .find(".venue-meta li")
    .map((_, li) => toTitle($(li).text()))
    .get();

  const capacity = metaItems.find((item) => /guest|capacity|seated/i.test(item)) || metaItems[0] || "Capacity on request";
  const priceRange = metaItems.find((item) => /\$|investment|usd/i.test(item)) || "Contact for pricing";
  const priceTier = /\$35|premium|luxury/i.test(priceRange) ? "Premium" : "Moderate";

  const galleryPrefix = heroImage ? path.basename(heroImage).replace(/\.[^.]+$/, "").replace(/\d+$/, "") : "";
  const gallery = heroImage
    ? imageFiles
        .filter((file) => file.startsWith(galleryPrefix))
        .slice(0, 4)
        .map((file) => path.posix.join("images/venues", file))
    : [];

  const ore = findOreData(slug, title);

  venues.push({
    slug,
    title,
    location,
    region,
    type,
    summary: ore?.summary || summary,
    description: ore?.description || summary,
    capacity: ore?.capacity || capacity,
    priceRange: ore?.priceRange || priceRange,
    priceTier: ore?.priceTier || priceTier,
    rating: ore?.rating || 4.9,
    reviews: ore?.reviews || 120,
    heroImage: ore?.heroImage || heroImage,
    highlights: ore?.highlights?.length ? ore.highlights : metaItems,
    amenities: ore?.amenities?.length ? ore.amenities : metaItems,
    gallery: ore?.gallery?.length ? ore.gallery : gallery.length ? gallery : [heroImage].filter(Boolean),
    phone: ore?.phone || "+961 12345678",
    source: ore?.source || undefined,
  });
});

fs.writeFileSync(outputPath, JSON.stringify(venues, null, 2));
console.log(`Saved ${venues.length} venue detail entries to ${outputPath}`);
