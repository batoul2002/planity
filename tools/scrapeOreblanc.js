const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const CATEGORY_URL = "https://oreblanc.com/category/outdoor-wedding-venues/";
const OUTPUT = path.join(__dirname, "..", "public", "data", "oreblanc-venues.json");

const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function extractServices($) {
  const data = {};
  $(".su-service").each((_, el) => {
    const title = cleanText($(el).find(".su-service-title").text()).toLowerCase();
    const contentNode = $(el).find(".su-service-content");
    const values =
      contentNode.find("p").length > 0
        ? contentNode
            .find("p")
            .map((__, p) => cleanText($(p).text()))
            .get()
            .filter(Boolean)
        : [cleanText(contentNode.text())].filter(Boolean);

    if (title.includes("indoor capacity")) data.indoorCapacity = values.join(" ");
    if (title.includes("outdoor capacity")) data.outdoorCapacity = values.join(" ");
    if (title.includes("amenities")) data.amenities = values;
    if (title.includes("additional amenities")) data.extraAmenities = values;
    if (title.includes("catering")) data.catering = values.join(", ");
  });
  return data;
}

function extractContacts($) {
  const phones = [];
  $(".su-spoiler-content a[href^='tel']").each((_, link) => {
    const phone = $(link).attr("href")?.replace(/tel:/i, "").trim();
    if (phone) phones.push(phone);
  });
  return [...new Set(phones)];
}

function extractGallery($) {
  const seen = new Set();
  const images = [];
  $(".entry-content img").each((_, img) => {
    const src = $(img).attr("data-src") || $(img).attr("src");
    if (!src || seen.has(src)) return;
    seen.add(src);
    images.push(src);
  });
  return images.slice(0, 6);
}

async function scrapeVenue(url) {
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const title = cleanText($("h1.entry-title").text());
  const slug = slugify(title || url.split("/").filter(Boolean).pop());
  const summary = cleanText($(".entry-content > p").first().text());
  const heroImage =
    $("meta[property='og:image']").attr("content") ||
    $("meta[property='twitter:image']").attr("content") ||
    $(".entry-content img").first().attr("src");

  const services = extractServices($);
  const gallery = extractGallery($);
  const contacts = extractContacts($);

  const highlights = [];
  $(".entry-content li").slice(0, 10).each((_, li) => {
    const text = cleanText($(li).text());
    if (text) highlights.push(text);
  });

  const capacityParts = [];
  if (services.indoorCapacity) capacityParts.push(`Indoor: ${services.indoorCapacity}`);
  if (services.outdoorCapacity) capacityParts.push(`Outdoor: ${services.outdoorCapacity}`);

  return {
    slug,
    title,
    summary,
    description: summary,
    capacity: capacityParts.join(" • ") || undefined,
    priceRange: "Contact for pricing",
    heroImage,
    highlights: highlights.length ? highlights : undefined,
    amenities: services.amenities || services.extraAmenities,
    gallery,
    phone: contacts[0],
    source: url,
  };
}

async function scrapeCategory() {
  const html = await fetchHTML(CATEGORY_URL);
  const $ = cheerio.load(html);
  const links = [];
  $("article").each((_, article) => {
    const href = $(article).find("h2 a, h3 a, .entry-title a").attr("href");
    if (href && !links.includes(href)) links.push(href);
  });
  const results = [];
  for (const link of links) {
    try {
      const detail = await scrapeVenue(link);
      results.push(detail);
      console.log(`Scraped ${detail.title}`);
    } catch (error) {
      console.error(`Failed to scrape ${link}`, error.message);
    }
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} entries to ${OUTPUT}`);
}

scrapeCategory().catch((err) => {
  console.error(err);
  process.exit(1);
});
