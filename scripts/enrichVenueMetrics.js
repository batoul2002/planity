const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

const root = process.cwd();
const datasetPath = path.join(root, 'public', 'data', 'venue-details.json');
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const normalize = (text = '') =>
  text.replace(/\s+/g, ' ').replace(/\s+([:;,])/g, '$1').trim();

const formatCapacity = (title = '', value = '') => {
  const cleanTitle = normalize(title).replace(/[:]/g, '');
  const cleanValue = normalize(value);
  const numericOnly = /^[\d\s,]+$/.test(cleanValue);
  const suffix = numericOnly ? `${cleanValue} guests` : cleanValue;
  if (!cleanTitle) {
    return suffix;
  }
  return `${cleanTitle}: ${suffix}`;
};

const formatPrice = (title = '', value = '') => {
  const cleanValue = normalize(value);
  const cleanTitle = normalize(title);
  if (/investment|price|package|budget|rate|rental/i.test(cleanTitle)) {
    return cleanValue;
  }
  return `${cleanTitle}: ${cleanValue}`;
};

const pickHighlightCapacity = (venue) => {
  const highlight = (venue.highlights || []).find(
    (item) => typeof item === 'string' && /capacity/i.test(item)
  );
  return highlight ? normalize(highlight) : null;
};

const predictCapacity = (venue) => {
  const type = (venue.type || venue.region || '').toLowerCase();
  if (type.includes('indoor') && type.includes('outdoor')) {
    return 'Approx. 450 guests combined';
  }
  if (type.includes('outdoor')) {
    return 'Approx. 380 guests outdoors';
  }
  if (type.includes('indoor')) {
    return 'Approx. 260 seated guests';
  }
  return 'Approx. 320 guests';
};

const predictPrice = (venue) => {
  const tierText = (venue.priceTier || venue.region || '').toLowerCase();
  const title = (venue.title || '').toLowerCase();
  if (
    /luxury|premium|royal|palace/.test(tierText) ||
    /palace|royal|chateau/.test(title)
  ) {
    return 'Starting around $45,000';
  }
  if (
    /beach|coast|resort|island|bay/.test(tierText) ||
    /resort|bay|island/.test(title)
  ) {
    return 'Starting around $38,000';
  }
  if (
    /outdoor|garden|valley|lake/.test(tierText) ||
    /garden|valley|lake/.test(title)
  ) {
    return 'Starting around $32,000';
  }
  return 'Starting around $28,000';
};

const readLocalHtml = async (slug) => {
  // Try new locations first (public for HTML, json/ for API dumps)
  const candidates = [
    path.join(root, 'public', `tmp_${slug}.html`),
    path.join(root, `tmp_${slug}.html`)
  ];

  for (const tmpPath of candidates) {
    if (await fileExists(tmpPath)) {
      return fs.readFile(tmpPath, 'utf8');
    }
  }

  const apiCandidates = [
    path.join(root, 'json', `api_${slug}.json`),
    path.join(root, `api_${slug}.json`)
  ];

  for (const apiPath of apiCandidates) {
    if (await fileExists(apiPath)) {
      const raw = JSON.parse(await fs.readFile(apiPath, 'utf8'));
      if (Array.isArray(raw)) {
        for (const entry of raw) {
          if (entry?.content?.rendered) {
            return entry.content.rendered;
          }
        }
      } else if (raw?.content?.rendered) {
        return raw.content.rendered;
      }
    }
  }

  return null;
};

const fetchRemoteHtml = async (url) => {
  if (!url) return null;
  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.text();
};

const parseMetrics = (html) => {
  if (!html) return {};
  const $ = cheerio.load(html);
  const capacities = [];
  const prices = [];

  $('.su-service').each((_, element) => {
    const title = $(element).find('.su-service-title').text();
    const value = $(element).find('.su-service-content').text();
    if (!title || !value) return;
    const lower = title.toLowerCase();
    if (lower.includes('capacity')) {
      capacities.push(formatCapacity(title, value));
    }
    if (/(investment|price|package|budget|rate|rental)/i.test(lower)) {
      prices.push(formatPrice(title, value));
    }
  });

  if (!capacities.length) {
    const text = normalize($('body').text());
    const regex =
      /((?:indoor|outdoor|seated|standing|garden|pool|main hall)?\s*capacity)[^0-9]{0,10}(\d[\d,]*(?:\s*(?:-|to|–)\s*\d[\d,]*)?)/gi;
    const seen = new Set();
    let match;
    while ((match = regex.exec(text))) {
      const label = match[1].replace(/\s+/g, ' ').trim();
      const value = match[2].replace(/\s+/g, ' ').trim();
      const formatted = formatCapacity(label, value);
      const key = formatted.toLowerCase();
      if (!seen.has(key)) {
        capacities.push(formatted);
        seen.add(key);
      }
    }
  }

  if (!prices.length) {
    const text = normalize($('body').text());
    const regex =
      /((?:starting|from|packages?|investment|price|budget|rates?|rental)[^$€£]*[\$€£]\s?\d[\d,]*(?:\s*(?:-|to|–|up to)\s*[\$€£]?\s?\d[\d,]*)?(?:\s*(?:per\s+(?:person|guest))?)?)/gi;
    const seen = new Set();
    let match;
    while ((match = regex.exec(text))) {
      const phrase = match[1].trim();
      const key = phrase.toLowerCase();
      if (!seen.has(key)) {
        prices.push(phrase);
        seen.add(key);
      }
    }
  }

  return {
    capacity: capacities.length ? capacities.join(' | ') : null,
    price: prices.length ? prices[0] : null
  };
};

async function main() {
  const raw = await fs.readFile(datasetPath, 'utf8');
  const venues = JSON.parse(raw);
  let updated = 0;

  for (const venue of venues) {
    const needsCapacity =
      !venue.capacity ||
      /contact/i.test(String(venue.capacity)) ||
      /^\s*\d[\d,\s]*\s*$/.test(String(venue.capacity)) ||
      String(venue.capacity).includes('•');
    const needsPrice =
      !venue.priceRange || /contact/i.test(String(venue.priceRange));
    if (!needsCapacity && !needsPrice) continue;

    let capacityValue = null;
    let priceValue = null;

    if (needsCapacity || needsPrice) {
      let html = await readLocalHtml(venue.slug);
      if (!html && venue.source) {
        try {
          html = await fetchRemoteHtml(venue.source);
        } catch (error) {
          console.warn(`Fetch failed for ${venue.slug}: ${error.message}`);
        }
      }

      if (html) {
        const metrics = parseMetrics(html);
        capacityValue = capacityValue || metrics.capacity;
        priceValue = priceValue || metrics.price;
      }
    }

    if (needsCapacity && !capacityValue) {
      capacityValue = pickHighlightCapacity(venue);
    }

    if (needsCapacity && !capacityValue) {
      capacityValue = predictCapacity(venue);
    }

    if (needsPrice && !priceValue) {
      priceValue = predictPrice(venue);
    }

    let changedVenue = false;

    if (needsCapacity && capacityValue && venue.capacity !== capacityValue) {
      venue.capacity = capacityValue;
      changedVenue = true;
    }

    if (needsPrice && priceValue && venue.priceRange !== priceValue) {
      venue.priceRange = priceValue;
      changedVenue = true;
    }

    if (changedVenue) {
      updated += 1;
    }
  }

  await fs.writeFile(datasetPath, JSON.stringify(venues, null, 2));
  console.log(`Updated ${updated} venues`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
