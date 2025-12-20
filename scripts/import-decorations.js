require('dotenv').config();
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

const decorations = [
  // Wedding
  {
    event: 'wedding',
    title: 'Floral Stage & Backdrop',
    description: 'Soft white and blush flowers with golden arches and candle clusters.',
    tags: ['Romantic', 'Elegant', 'White & Gold'],
    heroImage: 'images/decorationDetails/wedding/weddingBackdrops/weddinBackdrop.jpg'
  },
  {
    event: 'wedding',
    title: 'Bride & Groom Seating',
    description: 'Ivory loveseat or twin chairs with draped textiles and low florals.',
    tags: ['Statement seating', 'Ivory', 'Gold piping'],
    heroImage: 'images/decorationDetails/wedding/weddingSeating/weddingseating1.jpg'
  },
  {
    event: 'wedding',
    title: 'Guest Tables',
    description: 'Ivory linens, layered chargers, taper candles, and petite floral runners.',
    tags: ['Candlelit', 'Layered linens', 'Chargers'],
    heroImage: 'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding1.jpg'
  },
  {
    event: 'wedding',
    title: 'Chairs & Chair Covers',
    description: 'Gold chiavari or acrylic seating with soft cushions that match the palette.',
    tags: ['Chiavari', 'Acrylic', 'Neutral cushions'],
    heroImage: 'images/decorationDetails/wedding/weddingChairs/chairsWedding1.jpg'
  },
  {
    event: 'wedding',
    title: 'Floral & Entry Stands',
    description: 'Paired floral towers with ambient lanterns guiding arrivals.',
    tags: ['Entry moment', 'Lanterns'],
    heroImage: 'images/decorationDetails/wedding/weddingStand/entryStandWedding1.jpg'
  },
  {
    event: 'wedding',
    title: 'Cake / Dessert Table',
    description: 'Pedestals, glass cloches, ribboned labels, and fresh florals for the finale.',
    tags: ['Dessert focal', 'Glass details'],
    heroImage: 'images/decorationDetails/wedding/dessertTable/cakeTableWedding1.jpg'
  },
  // Birthday
  {
    event: 'birthday',
    title: 'Main Backdrop & Name Sign',
    description: 'Themed print or neon signage framed by balloons and soft draping.',
    tags: ['Personalized', 'Backdrop', 'Name sign'],
    heroImage: 'images/decorationDetails/Birthday/backdrops/backdropBirthday1.jpg'
  },
  {
    event: 'birthday',
    title: 'Cake Table',
    description: 'Styled risers, linen runners, candles, and coordinated serveware.',
    tags: ['Cake focal', 'Layered heights'],
    heroImage: 'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday1.jpg'
  },
  {
    event: 'birthday',
    title: 'Balloon Stands / Arches',
    description: 'Curated palette balloons with metallic accents and organic shapes.',
    tags: ['Balloons', 'Metallic accents'],
    heroImage: 'images/decorationDetails/Birthday/balloonStand/balloonBirthday1.jpg'
  },
  {
    event: 'birthday',
    title: 'Kids / Guests Tables & Chairs',
    description: 'Comfortable seating, themed runners, and playful chair tags.',
    tags: ['Kid-friendly', 'Comfort seating'],
    heroImage: 'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday1.jpg'
  },
  {
    event: 'birthday',
    title: 'Centerpieces',
    description: 'Mini florals, confetti-safe candles, and themed objects.',
    tags: ['Low profile', 'Themed accents'],
    heroImage: 'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday1.jpg'
  },
  {
    event: 'birthday',
    title: 'Themed Props & Photo Corner',
    description: 'Photo wall props, instant camera station, and milestone markers.',
    tags: ['Photo-ready', 'Props'],
    heroImage: 'images/decorationDetails/Birthday/themedprops/themedPropsBirthday1.jpg'
  },
  // Graduation
  {
    event: 'graduation',
    title: 'Stage / Certificate Area',
    description: 'Podium, clean skirting, focused lighting, and branded crest.',
    tags: ['Podium', 'Spotlit'],
    heroImage: 'images/decorationDetails/graduation/stage/StageGraduation1.jpg'
  },
  {
    event: 'graduation',
    title: 'Grad Photo Wall / Backdrop',
    description: 'Graphic wall with year numbers, metallic accents, and tassel details.',
    tags: ['Photo wall', 'Year numbers'],
    heroImage: 'images/decorationDetails/graduation/backdrop/BackDropGraduation1.jpg'
  },
  {
    event: 'graduation',
    title: 'Cake & Dessert Table',
    description: 'Tiered stands with scroll and cap toppers, paired with candles.',
    tags: ['Tiered display', 'Gold accents'],
    heroImage: 'images/decorationDetails/graduation/dessert/DessertTableGraduation1.jpg'
  },
  {
    event: 'graduation',
    title: 'Guest Tables & Centerpieces',
    description: 'Black napkins, gold flatware accents, and crisp center florals.',
    tags: ['Black & gold', 'Crisp lines'],
    heroImage: 'images/decorationDetails/graduation/tables/centerpiecesGraduation1.jpg'
  },
  {
    event: 'graduation',
    title: 'Themed Props',
    description: 'Caps, scrolls, year numbers, and congratulatory signage.',
    tags: ['Caps & scrolls', 'Signage'],
    heroImage: 'images/decorationDetails/graduation/props/themePropsGraduation1.jpg'
  },
  // Gender Reveal
  {
    event: 'gender',
    title: 'Main Reveal Area',
    description: 'Central moment with smoke pop, confetti, or balloon drop.',
    tags: ['Reveal focal', 'Countdown'],
    heroImage: 'images/decorationDetails/genderReveal/revealArea/mainGenderReveal1.jpg'
  },
  {
    event: 'gender',
    title: 'Backdrop & Balloon Setup',
    description: 'Pastel backdrop with organic balloon clusters and ribbons.',
    tags: ['Pastel', 'Balloons'],
    heroImage: 'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal1.jpg'
  },
  {
    event: 'gender',
    title: 'Cake & Dessert Table',
    description: 'He/She signage, dual-tone sweets, and candle glow.',
    tags: ['Dual-tone', 'Sweet table'],
    heroImage: 'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal1.jpg'
  },
  {
    event: 'gender',
    title: 'Tables & Centerpieces',
    description: 'Soft linens, mixed pastel blooms, and keepsake cards.',
    tags: ['Soft linens', 'Pastel florals'],
    heroImage: 'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal1.jpg'
  },
  {
    event: 'gender',
    title: '"He or She?" Props & Details',
    description: 'Voting board, pins, stickers, and fun reveal clues.',
    tags: ['Interactive', 'Props'],
    heroImage: 'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal.jpg'
  },
  // Ramadan Gathering
  {
    event: 'ramadan',
    title: 'Floor Seating / Low Tables',
    description: 'Layered rugs, cushions, or classic tables dressed with runners.',
    tags: ['Layered rugs', 'Low tables'],
    heroImage: 'images/about/ramadanGathering.jpeg'
  },
  {
    event: 'ramadan',
    title: 'Lanterns & Candles',
    description: 'Mixed brass lanterns, pillar candles, and star accents.',
    tags: ['Lantern clusters', 'Ambient light'],
    heroImage: 'images/services/dj.jpeg'
  },
  {
    event: 'ramadan',
    title: 'Dates & Dessert Corner',
    description: 'Tiered trays, ornate jars, and calligraphed labels for sweets.',
    tags: ['Dates', 'Dessert bar'],
    heroImage: 'images/services/catering.jpg'
  },
  {
    event: 'ramadan',
    title: 'Ramadan Backdrop',
    description: 'Crescent and star cutouts with patterned textiles and arches.',
    tags: ['Crescent & star', 'Patterned drape'],
    heroImage: 'images/about/ramadanGathering.jpeg'
  },
  {
    event: 'ramadan',
    title: 'Centerpieces',
    description: 'Lanterns, crescents, and florals in warm metallic tones.',
    tags: ['Center lantern', 'Warm metallics'],
    heroImage: 'images/services/flower.jpeg'
  },
  {
    event: 'ramadan',
    title: 'Buffet Setup',
    description: 'Coordinated chafers, label stands, and beverage dispensers.',
    tags: ['Service flow', 'Labels'],
    heroImage: 'images/services2/catering2.jpeg'
  },
  // Madeef Ashouraii
  {
    event: 'madeef',
    title: 'Welcome & Reception',
    description: 'Entrance styled with lanterns, incense, and welcoming signage.',
    tags: ['Lanterns', 'Welcome'],
    heroImage: 'images/decoration/moharam/decorationMaharam.jpg'
  },
  {
    event: 'madeef',
    title: 'Low Seating & Textiles',
    description: 'Layered rugs, cushions, and low tables for shared hospitality.',
    tags: ['Low seating', 'Layered rugs'],
    heroImage: 'images/decoration/moharam/decorationMaharam.jpg'
  },
  {
    event: 'madeef',
    title: 'Buffet & Platters',
    description: 'Generous platters with coordinated serveware and labels.',
    tags: ['Buffet', 'Serveware'],
    heroImage: 'images/decoration/moharam/decorationMaharam.jpg'
  }
];

const buildVendorPayload = (item) => ({
  name: item.title,
  slug: slugify(`${item.event}-${item.title}`),
  category: 'decorator',
  pricing: { type: 'package', amount: 0 },
  city: 'Lebanon',
  amenities: [],
  styles: item.tags || [],
  cuisines: [],
  dietaryOptions: [],
  photos: item.heroImage ? [item.heroImage] : [],
  verified: true,
  isActive: true,
  averageRating: 0,
  ratingCount: 0
});

const run = async () => {
  await connectDB();
  let created = 0;
  let updated = 0;

  for (const item of decorations) {
    const payload = buildVendorPayload(item);
    const existing = await Vendor.findOne({ slug: payload.slug });
    if (existing) {
      await Vendor.updateOne({ _id: existing._id }, payload);
      updated += 1;
    } else {
      await Vendor.create(payload);
      created += 1;
    }
  }

  console.log(`Decorations sync complete. Created: ${created}, Updated: ${updated}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
