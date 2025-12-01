/**
 * Import vendors from the static public/venue.html cards into MongoDB.
 * - Upserts by slug (or name fallback)
 * - Sets category=venue, city from card, pricing.amount from data-budget (package)
 * - Leaves other optional fields empty
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const connectDB = require('../src/config/db');
const Vendor = require('../src/models/Vendor');

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const loadVenueCards = () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'venue.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);
  const venues = [];

  $('.venue-card').each((_, el) => {
    const name = $(el).find('h3').text().trim();
    if (!name) return;
    const slug = slugify(name);
    const city = $(el).find('div.venue-card-head p').first().text().trim() || 'Lebanon';
    const region = $(el).attr('data-region') || '';
    const setting = $(el).attr('data-setting') || '';
    const budget = Number($(el).attr('data-budget') || 0) || 0;

    venues.push({
      name,
      slug,
      city,
      region,
      setting,
      pricing: { type: 'package', amount: budget }
    });
  });

  return venues;
};

const upsertVendors = async (venues = []) => {
  let created = 0;
  let updated = 0;
  for (const venue of venues) {
    const filter = venue.slug
      ? { slug: venue.slug }
      : { name: new RegExp(`^${venue.name}$`, 'i'), category: 'venue' };

    const existing = await Vendor.findOne(filter);
    if (existing) {
      existing.name = venue.name;
      existing.slug = venue.slug || existing.slug;
      existing.city = venue.city;
      existing.pricing = venue.pricing;
      existing.category = 'venue';
      if (venue.region) existing.styles = [venue.region];
      if (venue.setting) existing.amenities = [venue.setting];
      await existing.save();
      updated += 1;
    } else {
      await Vendor.create({
        name: venue.name,
        slug: venue.slug,
        category: 'venue',
        city: venue.city,
        pricing: venue.pricing,
        amenities: venue.setting ? [venue.setting] : [],
        styles: venue.region ? [venue.region] : [],
        photos: [],
        verified: false,
        isActive: true
      });
      created += 1;
    }
  }
  return { created, updated };
};

const run = async () => {
  await connectDB();
  const venues = loadVenueCards();
  console.log(`Parsed ${venues.length} venue cards from public/venue.html`);
  const { created, updated } = await upsertVendors(venues);
  console.log(`Vendors upserted. Created: ${created}, Updated: ${updated}`);
  process.exit(0);
};

run().catch((err) => {
  console.error('Import failed', err);
  process.exit(1);
});
