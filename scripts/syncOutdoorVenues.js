const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_URL = 'https://oreblanc.com/wp-json/wp/v2/posts?categories=4&per_page=100&_embed';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'venue-details.json');

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const decodeHtml = (text = '') =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8230;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

const stripHtml = (html = '') => decodeHtml(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const toFullImage = (url = '') => url.replace(/-\d+x\d+(?=\.[a-z]{3,4}$)/i, '');

const collectImages = (html = '') => {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)];
  const urls = matches
    .map((match) => match[1])
    .filter((src) => /wp-content\/uploads\//.test(src) && !/Maroun-Chedid-Ad/i.test(src))
    .map((src) => toFullImage(src));
  return [...new Set(urls)];
};

const extractServices = (html = '') => {
  const services = [];
  const regex =
    /su-service-title[^>]*>([\s\S]*?)<\/div>\s*<div class="su-service-content[^>]*>([\s\S]*?)<\/div>/gi;
  let match = regex.exec(html);
  while (match) {
    const label = stripHtml(match[1]);
    const value = stripHtml(match[2]);
    if (label || value) {
      services.push({ label, value });
    }
    match = regex.exec(html);
  }
  return services;
};

const extractListItems = (html = '') =>
  [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);

const extractParagraphs = (html = '', count = 2) => {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
  return paragraphs.slice(0, count);
};

const extractPhone = (html = '') => {
  const telMatch = html.match(/tel:\+?(\d+)/i);
  if (telMatch) {
    const digits = telMatch[1];
    return digits.startsWith('961') ? `+${digits}` : `+${digits}`;
  }
  return '';
};

const buildEntryFromPost = (post) => {
  const titleRaw = decodeHtml(post?.title?.rendered || '').replace(/\s+/g, ' ').trim();
  const baseTitle = titleRaw.replace(/\(.*?\)/g, '').trim() || titleRaw;
  const slug = slugify(baseTitle);
  const locationMatch = titleRaw.match(/\((.*?)\)/);
  const location = locationMatch ? locationMatch[1].trim() : '';

  const excerpt = stripHtml(post?.excerpt?.rendered || '');
  const paragraphs = extractParagraphs(post?.content?.rendered || '', 3);
  const description = paragraphs.join('\n\n') || excerpt;
  const summary = excerpt || paragraphs.slice(0, 2).join(' ');

  const services = extractServices(post?.content?.rendered || '');
  const listHighlights = extractListItems(post?.content?.rendered || '');

  const highlights = [
    ...services
      .filter((service) => service.label && !/amenities/i.test(service.label))
      .map((service) => `${service.label}: ${service.value}`),
    ...listHighlights,
  ]
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const amenitiesService = services.find((service) => /amenities/i.test(service.label));
  const amenities = amenitiesService
    ? amenitiesService.value.split(/[\r\n]+/).map((item) => item.trim()).filter(Boolean)
    : highlights.slice(0, 6);

  const capacityService = services.find((service) => /capacity/i.test(service.label));

  const gallery = collectImages(post?.content?.rendered || '');
  const featured =
    post?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    gallery[0] ||
    'images/venues/venue2 (2).jpeg';
  if (featured && !gallery.includes(toFullImage(featured))) {
    gallery.unshift(toFullImage(featured));
  }

  return {
    slug,
    title: titleRaw,
    location: location || 'Lebanon',
    region: 'Outdoor Venues',
    type: 'Outdoor',
    summary,
    description,
    capacity: capacityService ? capacityService.value : '',
    priceRange: 'Contact for pricing',
    priceTier: 'Outdoor',
    rating: 4.9,
    reviews: 127,
    heroImage: toFullImage(featured),
    highlights: highlights.slice(0, 10),
    amenities,
    gallery: gallery.slice(0, 9),
    phone: extractPhone(post?.content?.rendered || ''),
    source: post?.link || 'https://oreblanc.com',
  };
};

const mergeEntry = (existing, incoming) => {
  const merged = { ...existing, ...incoming };
  merged.capacity = incoming.capacity || existing.capacity || 'Contact for capacity';
  merged.summary = incoming.summary || existing.summary || '';
  merged.description = incoming.description || existing.description || '';
  merged.highlights = incoming.highlights?.length ? incoming.highlights : existing.highlights || [];
  merged.amenities = incoming.amenities?.length ? incoming.amenities : existing.amenities || [];
  merged.gallery = incoming.gallery?.length ? incoming.gallery : existing.gallery || [];
  merged.heroImage = incoming.heroImage || existing.heroImage || '';
  merged.phone = incoming.phone || existing.phone || '';
  merged.location = incoming.location || existing.location || 'Lebanon';
  merged.region = incoming.region || existing.region || 'Outdoor Venues';
  merged.type = incoming.type || existing.type || 'Outdoor';
  merged.priceRange = incoming.priceRange || existing.priceRange || 'Contact for pricing';
  merged.priceTier = incoming.priceTier || existing.priceTier || 'Outdoor';
  merged.rating = existing.rating || 4.9;
  merged.reviews = existing.reviews || 127;
  merged.source = incoming.source || existing.source || 'https://oreblanc.com';
  return merged;
};

const run = async () => {
  const posts = await fetchJson(DATA_URL);
  const existing = fs.existsSync(OUTPUT_PATH)
    ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
    : [];
  const map = new Map(existing.map((item) => [item.slug, item]));

  posts.forEach((post) => {
    const entry = buildEntryFromPost(post);
    if (!entry.slug) return;
    const current = map.get(entry.slug) || {};
    const merged = mergeEntry(current, entry);
    map.set(entry.slug, merged);
  });

  const updated = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(updated, null, 2));
  console.log(`Synced ${posts.length} outdoor venues into ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
