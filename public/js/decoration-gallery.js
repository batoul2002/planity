document.addEventListener('DOMContentLoaded', () => {
  const heroEvent = document.querySelector('[data-hero-event]');
  const heroTitle = document.querySelector('[data-hero-title]');
  const heroDescription = document.querySelector('[data-hero-description]');
  const heroTags = document.querySelector('[data-hero-tags]');
  const heroPhoto = document.querySelector('[data-hero-photo]');
  const heroCells = {
    tl: document.querySelector('[data-hero-cell="tl"]'),
    tr: document.querySelector('[data-hero-cell="tr"]'),
    center: document.querySelector('[data-hero-cell="center"]')
  };
  const galleryTitle = document.querySelector('[data-gallery-title]');
  const galleryGrid = document.querySelector('[data-gallery-grid]');
  const galleryEmpty = document.querySelector('[data-gallery-empty]');
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImg = document.querySelector('[data-lightbox-img]');
  const lightboxCaption = document.querySelector('[data-lightbox-caption]');
  const lightboxPrice = document.querySelector('[data-lightbox-price]');
  const lightboxClose = document.querySelector('[data-lightbox-close]');
  const lightboxPrev = document.querySelector('[data-lightbox-prev]');
  const lightboxNext = document.querySelector('[data-lightbox-next]');
  const { apiFetch: sharedApiFetch, getToken: sharedGetToken } = window.PlanityAPI || {};
  const API_BASE = window.location.origin + '/api/v1';
  const getToken = () => (typeof sharedGetToken === 'function' ? sharedGetToken() : localStorage.getItem('token'));
  const apiFetch =
    typeof sharedApiFetch === 'function'
      ? sharedApiFetch
      : async (path, options = {}) => {
          const headers = options.headers ? { ...options.headers } : {};
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
          const token = getToken();
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch(API_BASE + path, { ...options, headers });
          let data = null;
          try {
            data = await res.json();
          } catch (_) {}
          if (!res.ok) {
            const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
            throw new Error(msg);
          }
          return data;
        };

  let currentImages = [];
  let currentIndex = 0;
  let favoriteSlugs = new Set();

  const params = new URLSearchParams(window.location.search);
  const eventKey = params.get('event') || 'wedding';
  const slug = params.get('slug') || '';

  const slugify = (value = '') =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const withPrices = (files = [], { base = 280, step = 15 } = {}) =>
    files.map((src, idx) => ({ src, price: `$${(base + idx * step).toFixed(0)}` }));

  const library = {
    wedding: {
      name: 'Wedding & Engagement',
      elements: [
        {
          title: 'Floral Stage & Backdrop',
          description: 'Soft white and blush flowers with golden arches and candle clusters.',
          tags: ['Romantic', 'Elegant', 'White & Gold'],
          heroImage: 'images/decorationDetails/wedding/weddingBackdrops/weddinBackdrop.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop1.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop2.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop3.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop4.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop5.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop6.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop7.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop8.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop9.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop10.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop11.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop12.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop13.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop14.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop15.jpg',
              'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop16.jpg'
            ],
            { base: 380, step: 12 }
          )
        },
        {
          title: 'Bride & Groom Seating',
          description: 'Ivory loveseat or twin chairs with draped textiles and low florals.',
          tags: ['Statement seating', 'Ivory', 'Gold piping'],
          heroImage: 'images/decorationDetails/wedding/weddingSeating/weddingseating1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/weddingSeating/weddingseating1.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating2.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating3.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating4.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating5.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating6.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating7.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating8.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating9.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating10.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating11.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating12.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating13.jpg',
              'images/decorationDetails/wedding/weddingSeating/weddingseating14.jpg'
            ],
            { base: 340, step: 10 }
          )
        },
        {
          title: 'Guest Tables',
          description: 'Ivory linens, layered chargers, taper candles, and petite floral runners.',
          tags: ['Candlelit', 'Layered linens', 'Chargers'],
          heroImage: 'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding1.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding2.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding3.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding4.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding5.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding6.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding7.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding8.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding9.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding10.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding11.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding12.jpg',
              'images/decorationDetails/wedding/weddingGuestTable/guestTableWedding13.jpg'
            ],
            { base: 310, step: 8 }
          )
        },
        {
          title: 'Chairs & Chair Covers',
          description: 'Gold chiavari or acrylic seating with soft cushions that match the palette.',
          tags: ['Chiavari', 'Acrylic', 'Neutral cushions'],
          heroImage: 'images/decorationDetails/wedding/weddingChairs/chairsWedding1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/weddingChairs/chairsWedding1.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding2.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding3.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding4.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding5.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding6.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding7.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding8.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding9.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding10.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding11.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding12.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding13.jpg',
              'images/decorationDetails/wedding/weddingChairs/chairsWedding14.jpg'
            ],
            { base: 180, step: 6 }
          )
        },
        {
          title: 'Floral & Entry Stands',
          description: 'Paired floral towers with ambient lanterns guiding arrivals.',
          tags: ['Entry moment', 'Lanterns'],
          heroImage: 'images/decorationDetails/wedding/weddingStand/entryStandWedding1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/weddingStand/entryStandWedding1.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding2.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding3.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding4.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding5.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding6.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding7.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding8.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding9.jpg',
              'images/decorationDetails/wedding/weddingStand/entryStandWedding10.jpg'
            ],
            { base: 260, step: 10 }
          )
        },
        {
          title: 'Cake / Dessert Table',
          description: 'Pedestals, glass cloches, ribboned labels, and fresh florals for the finale.',
          tags: ['Dessert focal', 'Glass details'],
          heroImage: 'images/decorationDetails/wedding/dessertTable/cakeTableWedding1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding1.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding2.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding3.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding4.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding5.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding6.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding7.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding8.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding9.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding10.jpg',
              'images/decorationDetails/wedding/dessertTable/cakeTableWedding11.jpg'
            ],
            { base: 240, step: 10 }
          )
        }
      ]
    },
    birthday: {
      name: 'Birthday',
      elements: [
        {
          title: 'Main Backdrop & Name Sign',
          description: 'Themed print or neon signage framed by balloons and soft draping.',
          tags: ['Personalized', 'Backdrop', 'Name sign'],
          heroImage: 'images/decorationDetails/Birthday/backdrops/backdropBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/backdrops/backdropBirthday1.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday2.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday3.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday4.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday5.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday6.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday7.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday8.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday9.jpg',
              'images/decorationDetails/Birthday/backdrops/backdropBirthday10.jpg'
            ],
            { base: 210, step: 10 }
          )
        },
        {
          title: 'Cake Table',
          description: 'Styled risers, linen runners, candles, and coordinated serveware.',
          tags: ['Cake focal', 'Layered heights'],
          heroImage: 'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday1.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday2.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday3.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday4.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday5.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday6.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday7.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday8.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday9.jpg',
              'images/decorationDetails/Birthday/cakeTable/cakeTableBirthday10.jpg'
            ],
            { base: 180, step: 8 }
          )
        },
        {
          title: 'Balloon Stands / Arches',
          description: 'Curated palette balloons with metallic accents and organic shapes.',
          tags: ['Balloons', 'Metallic accents'],
          heroImage: 'images/decorationDetails/Birthday/balloonStand/balloonBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday1.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday2.png',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday3.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday4.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday5.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday6.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday7.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday8.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday9.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday10.jpg',
              'images/decorationDetails/Birthday/balloonStand/balloonBirthday11.jpg'
            ],
            { base: 160, step: 7 }
          )
        },
        {
          title: 'Kids / Guests Tables & Chairs',
          description: 'Comfortable seating, themed runners, and playful chair tags.',
          tags: ['Kid-friendly', 'Comfort seating'],
          heroImage: 'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday1.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday2.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday3.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday4.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday5.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday6.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday7.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday8.jpg',
              'images/decorationDetails/Birthday/guestTable&chairs/guestTableBirthday9.jpg'
            ],
            { base: 140, step: 6 }
          )
        },
        {
          title: 'Centerpieces',
          description: 'Mini florals, confetti-safe candles, and themed objects.',
          tags: ['Low profile', 'Themed accents'],
          heroImage: 'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday1.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday2.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday3.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday4.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday5.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday6.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday7.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday8.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday9.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday10.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday11.jpg',
              'images/decorationDetails/Birthday/centerpieces/centerpieceBirthday12.jpg'
            ],
            { base: 120, step: 6 }
          )
        },
        {
          title: 'Themed Props & Photo Corner',
          description: 'Photo wall props, instant camera station, and milestone markers.',
          tags: ['Photo-ready', 'Props'],
          heroImage: 'images/decorationDetails/Birthday/themedprops/themedPropsBirthday1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday1.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday2.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday3.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday4.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday5.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday6.jpg',
              'images/decorationDetails/Birthday/themedprops/themedPropsBirthday7.jpg'
            ],
            { base: 110, step: 5 }
          )
        }
      ]
    },
    graduation: {
      name: 'Graduation',
      elements: [
        {
          title: 'Stage / Certificate Area',
          description: 'Podium, clean skirting, focused lighting, and branded crest.',
          tags: ['Podium', 'Spotlit'],
          heroImage: 'images/decorationDetails/graduation/stage/StageGraduation1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/graduation/stage/StageGraduation1.jpg',
              'images/decorationDetails/graduation/stage/StageGraduation2.jpg',
              'images/decorationDetails/graduation/stage/StageGraduation3.jpg',
              'images/decorationDetails/graduation/stage/StageGraduation4.jpg',
              'images/decorationDetails/graduation/stage/StageGraduation5.png',
              'images/decorationDetails/graduation/stage/StageGraduation6.jpg'
            ],
            { base: 260, step: 12 }
          )
        },
        {
          title: 'Grad Photo Wall / Backdrop',
          description: 'Graphic wall with year numbers, metallic accents, and tassel details.',
          tags: ['Photo wall', 'Year numbers'],
          heroImage: 'images/decorationDetails/graduation/backdrop/BackDropGraduation1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/graduation/backdrop/BackDropGraduation1.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation2.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation3.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation4.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation5.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation6.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation7.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation8.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation9.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation10.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation11.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation12.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation13.jpg',
              'images/decorationDetails/graduation/backdrop/BackDropGraduation14.jpg'
            ],
            { base: 230, step: 9 }
          )
        },
        {
          title: 'Cake & Dessert Table',
          description: 'Tiered stands with scroll and cap toppers, paired with candles.',
          tags: ['Tiered display', 'Gold accents'],
          heroImage: 'images/decorationDetails/graduation/dessert/DessertTableGraduation1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/graduation/dessert/DessertTableGraduation1.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation2.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation3.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation4.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation5.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation6.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation7.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation8.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation9.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation10.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation11.jpg',
              'images/decorationDetails/graduation/dessert/DessertTableGraduation12.jpg'
            ],
            { base: 210, step: 9 }
          )
        },
        {
          title: 'Guest Tables & Centerpieces',
          description: 'Black napkins, gold flatware accents, and crisp center florals.',
          tags: ['Black & gold', 'Crisp lines'],
          heroImage: 'images/decorationDetails/graduation/tables/centerpiecesGraduation1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/graduation/tables/centerpiecesGraduation1.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation2.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation3.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation4.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation5.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation6.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation7.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation8.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation9.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation10.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation11.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation12.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation13.jpg',
              'images/decorationDetails/graduation/tables/centerpiecesGraduation14.jpg'
            ],
            { base: 190, step: 8 }
          )
        },
        {
          title: 'Themed Props',
          description: 'Caps, scrolls, year numbers, and congratulatory signage.',
          tags: ['Caps & scrolls', 'Signage'],
          heroImage: 'images/decorationDetails/graduation/props/themePropsGraduation1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/graduation/props/themePropsGraduation1.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation2.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation3.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation4.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation5.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation6.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation7.jpg',
              'images/decorationDetails/graduation/props/themePropsGraduation8.jpg'
            ],
            { base: 170, step: 7 }
          )
        }
      ]
    },
    gender: {
      name: 'Gender Reveal',
      elements: [
        {
          title: 'Main Reveal Area',
          description: 'Central moment with smoke pop, confetti, or balloon drop.',
          tags: ['Reveal focal', 'Countdown'],
          heroImage: 'images/decorationDetails/genderReveal/revealArea/mainGenderReveal1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal1.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal2.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal3.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal4.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal5.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal6.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal7.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal8.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal9.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal10.jpg',
              'images/decorationDetails/genderReveal/revealArea/mainGenderReveal11.jpg'
            ],
            { base: 260, step: 12 }
          )
        },
        {
          title: 'Backdrop & Balloon Setup',
          description: 'Pastel backdrop with organic balloon clusters and ribbons.',
          tags: ['Pastel', 'Balloons'],
          heroImage: 'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal1.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal2.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal3.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal4.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal5.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal6.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal7.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal8.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal9.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal10.jpg',
              'images/decorationDetails/genderReveal/backdropBalloons/balloonGenderReveal11.jpg'
            ],
            { base: 190, step: 8 }
          )
        },
        {
          title: 'Cake & Dessert Table',
          description: 'He/She signage, dual-tone sweets, and candle glow.',
          tags: ['Dual-tone', 'Sweet table'],
          heroImage: 'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal1.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal2.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal3.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal4.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal5.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal6.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal7.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal8.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal9.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal10.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal11.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal12.jpg',
              'images/decorationDetails/genderReveal/dessertTable/dessertTableGenderReveal13.jpg'
            ],
            { base: 170, step: 7 }
          )
        },
        {
          title: 'Tables & Centerpieces',
          description: 'Soft linens, mixed pastel blooms, and keepsake cards.',
          tags: ['Soft linens', 'Pastel florals'],
          heroImage: 'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal1.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal2.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal3.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal4.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal5.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal6.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal7.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal8.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal9.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal10.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal11.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal12.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal13.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal14.jpg',
              'images/decorationDetails/genderReveal/Tables&Centerpieces/CenterPieceGenderReveal15.jpg'
            ],
            { base: 150, step: 6 }
          )
        },
        {
          title: '"He or She?" Props & Details',
          description: 'Voting board, pins, stickers, and fun reveal clues.',
          tags: ['Interactive', 'Props'],
          heroImage: 'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal.jpg',
          images: withPrices(
            [
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal1.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal2.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal3.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal4.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal5.jpg',
              'images/decorationDetails/genderReveal/themedprops/themedPropsGenderReveal6.jpg'
            ],
            { base: 130, step: 5 }
          )
        }
      ]
    },
    ramadan: {
      name: 'Ramadan Gathering',
      elements: [
        {
          title: 'Floor Seating / Low Tables',
          description: 'Layered rugs, cushions, or classic tables dressed with runners.',
          tags: ['Layered rugs', 'Low tables'],
          heroImage: 'images/decorationDetails/ramadan/floorSeating/seatingRamadan1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan1.jpg',
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan2.jpg',
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan3.jpg',
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan4.jpg',
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan5.jpg',
              'images/decorationDetails/ramadan/floorSeating/seatingRamadan6.jpg'
            ],
            { base: 260, step: 10 }
          )
        },
        {
          title: 'Lanterns & Candles',
          description: 'Mixed brass lanterns, pillar candles, and star accents.',
          tags: ['Lantern clusters', 'Ambient light'],
          heroImage: 'images/decorationDetails/ramadan/lanterns/lanternsRamadan1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan1.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan2.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan3.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan4.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan5.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan6.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan7.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan8.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan9.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan10.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan11.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan12.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan13.jpg',
              'images/decorationDetails/ramadan/lanterns/lanternsRamadan14.jpg'
            ],
            { base: 180, step: 6 }
          )
        },
        {
          title: 'Dates & Dessert Corner',
          description: 'Tiered trays, ornate jars, and calligraphed labels for sweets.',
          tags: ['Dates', 'Dessert bar'],
          heroImage: 'images/decorationDetails/ramadan/datesCorner/dessertsRamadan.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan1.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan2.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan3.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan4.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan5.jpg',
              'images/decorationDetails/ramadan/datesCorner/dessertsRamadan6.jpg'
            ],
            { base: 210, step: 8 }
          )
        },
        {
          title: 'Ramadan Backdrop',
          description: 'Crescent and star cutouts with patterned textiles and arches.',
          tags: ['Crescent & star', 'Patterned drape'],
          heroImage: 'images/decorationDetails/ramadan/backdrops/BackdropsRamadan1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan1.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan2.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan3.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan4.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan5.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan6.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan7.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan8.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan9.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan10.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan11.jpg',
              'images/decorationDetails/ramadan/backdrops/BackdropsRamadan12.jpg'
            ],
            { base: 230, step: 9 }
          )
        },
        {
          title: 'Centerpieces',
          description: 'Lanterns, crescents, and florals in warm metallic tones.',
          tags: ['Center lantern', 'Warm metallics'],
          heroImage: 'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan1.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan2.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan3.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan4.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan5.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan6.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan7.jpg',
              'images/decorationDetails/ramadan/centerpieces/centerpiecesRamadan8.jpg'
            ],
            { base: 150, step: 6 }
          )
        },
        {
          title: 'Buffet Setup',
          description: 'Coordinated chafers, label stands, and beverage dispensers.',
          tags: ['Service flow', 'Labels'],
          heroImage: 'images/decorationDetails/ramadan/buffet/buffetRamadan1.jpg',
          images: withPrices(
            [
              'images/decorationDetails/ramadan/buffet/buffetRamadan1.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan2.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan3.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan4.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan5.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan6.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan7.jpg',
              'images/decorationDetails/ramadan/buffet/buffetRamadan8.jpg'
            ],
            { base: 200, step: 8 }
          )
        }
      ]
    },
    madeef: {
      name: 'Madeef Ashouraii',
      elements: [
        {
          title: 'Welcome & Reception',
          description: 'Entrance styled with lanterns, incense, and welcoming signage.',
          tags: ['Lanterns', 'Welcome'],
          heroImage: 'images/decoration/moharam/decorationMaharam.jpg',
          images: ['images/decoration/moharam/decorationMaharam.jpg']
        },
        {
          title: 'Low Seating & Textiles',
          description: 'Layered rugs, cushions, and low tables for shared hospitality.',
          tags: ['Low seating', 'Layered rugs'],
          heroImage: 'images/decoration/moharam/decorationMaharam.jpg',
          images: ['images/decoration/moharam/decorationMaharam.jpg']
        },
        {
          title: 'Buffet & Platters',
          description: 'Generous platters with coordinated serveware and labels.',
          tags: ['Buffet', 'Serveware'],
          heroImage: 'images/decoration/moharam/decorationMaharam.jpg',
          images: ['images/decoration/moharam/decorationMaharam.jpg']
        }
      ]
    }
  };

  // Expose the decoration library for other pages (planner) and short-circuit when the gallery UI is absent.
  window.DecorationLibrary = library;
  if (!galleryGrid || !galleryEmpty) return;

  const openLightbox = ({ src = '', caption = '', price = '' } = {}) => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || 'Gallery image';
    if (lightboxCaption) lightboxCaption.textContent = caption;
    if (lightboxPrice) lightboxPrice.textContent = price;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-active'));
    document.body.classList.add('no-scroll');
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-active');
    document.body.classList.remove('no-scroll');
    setTimeout(() => {
      if (lightbox) lightbox.hidden = true;
      if (lightboxImg) lightboxImg.src = '';
    }, 180);
  };

  const openByIndex = (index = 0) => {
    if (!currentImages.length) return;
    currentIndex = (index + currentImages.length) % currentImages.length;
    openLightbox(currentImages[currentIndex]);
  };

  const showPrev = () => openByIndex(currentIndex - 1);
  const showNext = () => openByIndex(currentIndex + 1);

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (evt) => {
      if (evt.target === lightbox) closeLightbox();
    });
  }
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrev);
  if (lightboxNext) lightboxNext.addEventListener('click', showNext);
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') closeLightbox();
    if (evt.key === 'ArrowLeft') showPrev();
    if (evt.key === 'ArrowRight') showNext();
  });

  const resolveElement = () => {
    const event = library[eventKey];
    if (!event) return null;
    const element = (event.elements || []).find((el) => slugify(el.title) === slug) || event.elements?.[0];
    if (!element) return null;
    return { event, element };
  };

  const loadFavoriteSlugs = async () => {
    if (!getToken()) {
      favoriteSlugs = new Set();
      return;
    }
    try {
      const res = await apiFetch('/favorites/mine', { method: 'GET' });
      const data = Array.isArray(res.data) ? res.data : [];
      favoriteSlugs = new Set(
        data
          .map((fav) => slugify(fav.slug || fav.name || fav.title || ''))
          .filter(Boolean)
      );
    } catch (err) {
      console.warn('Unable to load favorites', err.message || err);
      favoriteSlugs = new Set();
    }
  };

  const syncButtonState = async (vendorSlug, btn) => {
    await loadFavoriteSlugs();
    const isActive = favoriteSlugs.has(vendorSlug);
    if (btn) {
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    return isActive;
  };

  const makeShortCaption = (el = {}, idx = 0) => {
    const toWords = (text = '') =>
      text
        .toString()
        .replace(/&/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);
    const titleWords = toWords(el.title);
    const tags = Array.isArray(el.tags) ? el.tags : [];
    const tagWords = toWords(tags.length ? tags[idx % tags.length] : '');
    const descWords = toWords(el.description);
    const pool = [...titleWords, ...tagWords, ...descWords];
    const unique = [];
    const seen = new Set();
    pool.forEach((word) => {
      const clean = word.replace(/[^a-z0-9]/gi, '');
      if (!clean) return;
      const key = clean.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(clean);
    });
    const fillers = ['Decor', 'Style', 'Inspo'];
    while (unique.length < 3 && fillers.length) {
      unique.push(fillers.shift());
    }
    return unique.slice(0, 3).join(' ');
  };

  const applyFavoriteState = () => {
    if (!galleryGrid) return;
    galleryGrid.querySelectorAll('.gallery-card').forEach((card) => {
      const btn = card.querySelector('.gallery-like');
      const slug = card.dataset.slug;
      if (!btn || !slug) return;
      const isActive = favoriteSlugs.has(slug);
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const render = () => {
    const match = resolveElement();
    if (!match || !galleryGrid || !galleryEmpty) return;
    const { event, element } = match;
    const getSrc = (img) => (typeof img === 'string' ? img : img?.src || '');
    const pickHeroImage = (el) => {
      if (!el) return '';
      if (el.heroImage) return getSrc(el.heroImage);
      if (typeof el.heroImageIndex === 'number' && el.images?.[el.heroImageIndex]) {
        return getSrc(el.images[el.heroImageIndex]);
      }
      const imgs = el.images || [];
      if (imgs.length > 1) return getSrc(imgs[1]); // prefer second image to avoid always using the first
      return getSrc(imgs[0]);
    };
    const resolveHeroImages = (el) => {
      const pool = el.images || [];
      const heroGallery =
        Array.isArray(el.heroGallery) && el.heroGallery.length
          ? el.heroGallery
          : pool.slice(0, 3);
      const resolveItem = (item) => {
        if (typeof item === 'number') return getSrc(pool[item]);
        return getSrc(item);
      };
      const custom = heroGallery.map(resolveItem).filter(Boolean);
      const fallback = [
        pickHeroImage(el),
        getSrc(pool[1]),
        getSrc(pool[2]),
        getSrc(pool[0]),
        getSrc(pool[3])
      ].filter(Boolean);
      const merged = [];
      [...custom, ...fallback].forEach((src) => {
        if (src && !merged.includes(src)) merged.push(src);
      });
      return merged.slice(0, 3);
    };

    if (heroEvent) heroEvent.textContent = event.name;
    if (heroTitle) heroTitle.textContent = element.title;
    if (heroDescription) heroDescription.textContent = element.description;
    if (heroTags) {
      heroTags.innerHTML = '';
      (element.tags || []).forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        heroTags.appendChild(span);
      });
    }
    const heroImages = resolveHeroImages(element);
    if (heroPhoto) {
      const heroBackground = heroImages[0];
      heroPhoto.style.backgroundImage = heroBackground ? `url('${heroBackground}')` : '';
    }
    if (heroCells.tl) heroCells.tl.style.backgroundImage = heroImages[0] ? `url('${heroImages[0]}')` : '';
    if (heroCells.tr) heroCells.tr.style.backgroundImage = heroImages[1] ? `url('${heroImages[1]}')` : '';
    if (heroCells.center) heroCells.center.style.backgroundImage = heroImages[2] ? `url('${heroImages[2]}')` : '';
    if (galleryTitle) galleryTitle.textContent = `${element.title} images`;

    galleryGrid.innerHTML = '';
    const images = element.images || [];
    currentImages = [];
    images.forEach((img, idx) => {
      const src = typeof img === 'string' ? img : img.src;
      const elementSlug = slugify(element.title);
      const imgName =
        (src && src.split('/').pop()?.replace(/\.[^/.]+$/, '')) || `img-${idx + 1}`;
      const vendorSlug = `${eventKey}-${elementSlug}-${slugify(imgName)}`;
      const caption =
        typeof img === 'object' && img.caption
          ? img.caption
          : makeShortCaption(element, idx);
      const price =
        typeof img === 'object' && img.price
          ? img.price
          : `$${(120 + idx * 15).toFixed(0)}`;
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.dataset.index = idx.toString();
      card.dataset.src = src;
      card.dataset.caption = caption;
      card.dataset.price = price;
      card.dataset.slug = vendorSlug;
      card.dataset.name = element.title;
      card.dataset.image = src;
      card.dataset.category = 'decoration';
      const isSaved = favoriteSlugs.has(vendorSlug);
      card.innerHTML = `
        <div class="gallery-img" style="background-image:url('${src}')"></div>
        <div class="gallery-meta">
          <button class="gallery-like ${isSaved ? 'is-active' : ''}" type="button" aria-pressed="${isSaved}" aria-label="Save ${caption}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <p class="gallery-price">${price}</p>
        </div>
      `;
      const likeButton = card.querySelector('.gallery-like');
      if (likeButton) {
        likeButton.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          if (!getToken()) {
            alert('Please log in to save favorites.');
            window.location.href = 'login.html';
            return;
          }
          try {
            const res = await apiFetch('/favorites', {
              method: 'POST',
              body: JSON.stringify({
                vendorSlug,
                vendorName: `${element.title} #${idx + 1}`,
                vendorPhoto: src,
                vendorCategory: 'decorator'
              })
            });
            const message = res?.message?.toLowerCase?.() || '';
            if (!message.includes('added') && !message.includes('removed')) {
              console.warn('Unexpected favorites response', res);
            }
            const isActive = await syncButtonState(vendorSlug, likeButton);
            alert(isActive ? 'Decoration saved to favorites.' : 'Decoration removed from favorites.');
          } catch (err) {
            alert(err.message || 'Unable to update favorites');
          }
        });
      }
      galleryGrid.appendChild(card);
      currentImages.push({ src, caption, price });
    });
    const hasImages = images.length > 0;
    galleryEmpty.hidden = hasImages;
    galleryGrid.hidden = !hasImages;
    applyFavoriteState();

    galleryGrid.querySelectorAll('.gallery-card').forEach((card) => {
      card.addEventListener('click', () => openByIndex(Number(card.dataset.index) || 0));
    });
  };

  const init = async () => {
    await loadFavoriteSlugs();
    render();
  };

  init();
});
