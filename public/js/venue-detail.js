const dataUrl = 'data/venue-details.json';
const defaultSlug = 'lancaster-eden-bay';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const qs = new URLSearchParams(window.location.search);
const requestedSlug = qs.get('venue');
const API_BASE = window.location.origin + '/api/v1';
const requestedVendorIdParam = qs.get('vendorId') || qs.get('vendor') || '';

const apiHelpers = window.PlanityAPI || {};
const getToken = apiHelpers.getToken || (() => localStorage.getItem('token'));
const apiFetch =
  apiHelpers.apiFetch ||
  (async (path, options = {}) => {
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
  });

const refs = {
  heroImage: document.querySelector('[data-venue-image]'),
  heroType: document.querySelector('[data-venue-type]'),
  heroTitle: document.querySelector('[data-venue-title]'),
  heroRating: document.querySelector('[data-venue-rating]'),
  heroReviews: document.querySelector('[data-venue-reviews]'),
  heroLocation: document.querySelector('[data-venue-location]'),
  heroSummary: document.querySelector('[data-venue-summary]'),
  aboutBody: document.querySelector('[data-about-text]'),
  sourceLink: document.querySelector('[data-source-link]'),
  capacityValue: document.querySelector('[data-capacity-value]'),
  priceRange: document.querySelector('[data-price-range]'),
  priceTier: document.querySelector('[data-price-tier]'),
  highlightsList: document.querySelector('[data-highlights-list]'),
  amenitiesSection: document.querySelector('[data-amenities-section]'),
  amenitiesList: document.querySelector('[data-amenities-list]'),
  gallerySection: document.querySelector('[data-gallery-section]'),
  galleryGrid: document.querySelector('[data-gallery-grid]'),
  quickLinks: document.querySelectorAll('[data-quick-nav]'),
  sectionTargets: document.querySelectorAll('[data-section-target]'),
  lightbox: document.querySelector('[data-lightbox]'),
  lightboxImg: document.querySelector('[data-lightbox-img]'),
  lightboxCaption: document.querySelector('[data-lightbox-caption]'),
  lightboxPrev: document.querySelector('[data-lightbox-prev]'),
  lightboxNext: document.querySelector('[data-lightbox-next]')
};

const normalizeList = (items = []) =>
  items
    .flatMap((item) =>
      String(item)
        .split(/[,|\u2022]|(?<=\w)\s{2,}/)
        .map((piece) => piece.trim())
        .filter(Boolean)
    )
    .filter(Boolean);

let revealObserver;
let sectionObserver;
let galleryImages = [];
let currentGalleryIndex = 0;
let currentVenueTitle = '';
const shareButtons = document.querySelectorAll('[data-share-trigger]');
let currentVendorId = /^[a-fA-F0-9]{24}$/.test(requestedVendorIdParam || '') ? requestedVendorIdParam : '';
let lastRenderedVenue = null;
let favoriteHandlersAttached = false;
let vendorCache = null;

const favoriteButtons = document.querySelectorAll('[data-favorite-trigger]');

const setFavoriteState = (isSaved) => {
  favoriteButtons.forEach((btn) => {
    btn.classList.toggle('is-favorite', Boolean(isSaved));
    btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
  });
};

const promptLoginForFavorite = () => {
  alert('Please log in to save venues to favorites.');
  window.location.href = 'login.html';
};

const refreshFavoriteState = async () => {
  if (!currentVendorId || !getToken()) {
    setFavoriteState(false);
    return;
  }
  try {
    const res = await apiFetch('/favorites/mine', { method: 'GET' });
    const favorites = Array.isArray(res.data) ? res.data : [];
    const isSaved = favorites.some((fav) => fav && (fav._id === currentVendorId || fav.id === currentVendorId));
    setFavoriteState(isSaved);
  } catch (err) {
    setFavoriteState(false);
    console.warn('Unable to check favorites', err.message || err);
  }
};

const handleFavoriteClick = async () => {
  if (!currentVendorId) {
    await resolveVendorIdFromApi(lastRenderedVenue);
  }
  const heroPhoto = lastRenderedVenue?.heroImage || lastRenderedVenue?.gallery?.[0] || '';
  if (!currentVendorId) {
    alert('This venue is missing a vendorId. Pass ?vendorId=<id> in the URL or add vendorId to the data.');
    return;
  }
  if (!getToken()) {
    promptLoginForFavorite();
    return;
  }
  try {
    const res = await apiFetch('/favorites', {
      method: 'POST',
      body: JSON.stringify({
        vendorId: currentVendorId,
        vendorSlug: slugify(lastRenderedVenue?.slug || lastRenderedVenue?.title || ''),
        vendorName: lastRenderedVenue?.title || '',
        vendorPhoto: heroPhoto,
        vendorCategory: 'venue'
      })
    });
    if (res?.vendorId) {
      currentVendorId = res.vendorId;
    }
    await refreshFavoriteState();
    if (res?.message) {
      alert(res.message);
    }
  } catch (err) {
    alert(err.message || 'Unable to update favorites');
  }
};

const initFavoriteButtons = () => {
  if (favoriteHandlersAttached) return;
  favoriteButtons.forEach((btn) => btn.addEventListener('click', handleFavoriteClick));
  favoriteHandlersAttached = true;
};

const loadVenueVendors = async () => {
  if (vendorCache) return vendorCache;
  try {
    const res = await apiFetch('/vendors?limit=200&category=venue&includeInactive=true', { method: 'GET' });
    vendorCache = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn('Unable to load venue vendors', err.message || err);
    vendorCache = [];
  }
  return vendorCache;
};

const buildVenueFromVendor = (vendor) => {
  if (!vendor) return null;
  const photos = Array.isArray(vendor.photos) ? vendor.photos.filter(Boolean) : [];
  const slug = slugify(vendor.slug || vendor.name || '');
  const price = vendor.pricing?.amount
    ? `${vendor.pricing.type === 'per-person' ? 'Per person' : 'Package'} at $${vendor.pricing.amount}`
    : 'Contact for pricing';
  return {
    slug,
    title: vendor.name || 'Venue',
    location: vendor.city || 'Lebanon',
    region: vendor.city || vendor.category || 'Venue',
    type: 'Venue',
    summary: vendor.description || '',
    description: vendor.description || '',
    priceRange: price,
    priceTier: vendor.pricing?.type || '',
    amenities: vendor.amenities || [],
    highlights: vendor.amenities || [],
    gallery: photos,
    heroImage: photos[0],
    vendorId: vendor._id,
    source: vendor.website || ''
  };
};

const resolveVendorIdFromApi = async (venue) => {
  if (currentVendorId || !venue?.title) return;
  const candidates = [
    venue.slug,
    slugify(venue.title || ''),
    requestedSlug ? slugify(requestedSlug) : '',
    venue.region ? slugify(venue.region + '-' + venue.title) : ''
  ]
    .filter(Boolean)
    .reduce((acc, item) => (acc.includes(item) ? acc : acc.concat(item)), []);
  try {
    const vendors = await loadVenueVendors();
    const match = vendors.find((v) => {
      const vs = slugify(v.name || '');
      return candidates.some((c) => vs === c || vs.includes(c) || c.includes(vs));
    });
    if (match?._id) {
      currentVendorId = match._id;
      refreshFavoriteState();
    }
  } catch (err) {
    console.warn('Unable to auto-link vendor to favorite', err.message || err);
  }
};

const handleShare = async () => {
  const shareData = {
    title: currentVenueTitle || 'Venue',
    text: currentVenueTitle || 'Check out this venue on Planity',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (_) {
      /* ignore user cancellation */
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(shareData.url);
    alert('Link copied to clipboard');
  } catch (_) {
    alert('Unable to share. Please copy the link manually: ' + shareData.url);
  }
};

shareButtons.forEach((btn) => btn.addEventListener('click', handleShare));

const setupRevealObserver = () => {
  if (revealObserver) {
    revealObserver.disconnect();
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('.reveal-item').forEach((el) => {
    if (!el.classList.contains('is-visible')) {
      revealObserver.observe(el);
    }
  });
};

const setupSectionObserver = () => {
  if (sectionObserver) {
    sectionObserver.disconnect();
  }
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          refs.quickLinks.forEach((link) => {
            if (link.dataset.quickNav === id) {
              link.classList.add('is-active');
            } else {
              link.classList.remove('is-active');
            }
          });
        }
      });
    },
    { threshold: 0.35 }
  );

  refs.sectionTargets.forEach((section) => sectionObserver.observe(section));
};

refs.quickLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const amenityIcons = [
  { keywords: ['parking', 'valet'], icon: 'fa-car-side' },
  { keywords: ['sound', 'dj'], icon: 'fa-volume-high' },
  { keywords: ['suite', 'room'], icon: 'fa-champagne-glasses' },
  { keywords: ['lighting'], icon: 'fa-lightbulb' },
  { keywords: ['coordination', 'planner'], icon: 'fa-user-tie' },
  { keywords: ['wifi', 'network'], icon: 'fa-wifi' },
  { keywords: ['pool', 'beach'], icon: 'fa-water' }
];

const getAmenityIcon = (text = '') => {
  const lower = text.toLowerCase();
  const match = amenityIcons.find((option) =>
    option.keywords.some((keyword) => lower.includes(keyword))
  );
  return match ? match.icon : 'fa-circle-check';
};

const buildAmenityItem = (label) => {
  const li = document.createElement('li');
  const iconSpan = document.createElement('span');
  iconSpan.className = 'amenity-chip-icon';
  iconSpan.innerHTML = `<i class="fa-solid ${getAmenityIcon(label)}"></i>`;
  const textSpan = document.createElement('span');
  textSpan.textContent = label;
  li.appendChild(iconSpan);
  li.appendChild(textSpan);
  return li;
};

const buildFeatureItem = (label) => {
  const item = document.createElement('div');
  item.className = 'feature-card';
  item.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i><span>${label}</span>`;
  return item;
};

const fillList = (listEl, items) => {
  if (!listEl) return false;
  const normalized = normalizeList(items);
  if (!normalized.length) {
    listEl.innerHTML = '<li>Details coming soon.</li>';
    return false;
  }
  listEl.innerHTML = '';
  normalized.forEach((item) => {
    if (listEl.hasAttribute('data-amenities-list')) {
      listEl.appendChild(buildAmenityItem(item));
    } else {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    }
  });
  return true;
};

const setText = (el, value, fallback = '') => {
  if (!el) return;
  el.textContent = value || fallback;
};

const renderVenue = (venue, { showFallbackNotice } = {}) => {
  if (!venue) {
    setText(refs.heroTitle, 'Venue not found');
    if (refs.aboutBody) {
      refs.aboutBody.innerHTML = '<p>We could not find a matching venue.</p>';
    }
    return;
  }

  lastRenderedVenue = venue;

  if (refs.heroImage && venue.heroImage) {
    refs.heroImage.src = venue.heroImage;
    refs.heroImage.alt = `${venue.title} hero image`;
  }

  setText(refs.heroType, venue.type || venue.region || 'Featured venue');
  setText(refs.heroTitle, venue.title);

  if (refs.heroRating) {
    refs.heroRating.textContent =
      typeof venue.rating === 'number' ? venue.rating.toFixed(1) : '4.9';
  }
  if (refs.heroReviews) {
    refs.heroReviews.textContent = venue.reviews
      ? `(${venue.reviews} reviews)`
      : 'Verified listing';
  }

  setText(refs.heroLocation, venue.location || venue.region || 'Lebanon');
  if (refs.heroSummary) {
    const firstParagraph = (venue.description || '')
      .split(/\n+/)
      .map((p) => p.trim())
      .find(Boolean);
    const summaryText = venue.summary || firstParagraph || '';
    refs.heroSummary.textContent = summaryText || 'Discover the details below.';
  }

  if (refs.aboutBody) {
    refs.aboutBody.innerHTML = '';
    const paragraphs = (venue.description || venue.summary || '').split(/\n+/);
    paragraphs.forEach((text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const p = document.createElement('p');
      p.textContent = trimmed;
      refs.aboutBody.appendChild(p);
    });
    if (!refs.aboutBody.children.length) {
      const p = document.createElement('p');
      p.textContent = 'Detailed description coming soon.';
      refs.aboutBody.appendChild(p);
    }
  }

  if (refs.sourceLink && venue.source) {
    refs.sourceLink.href = venue.source;
  }
  setText(refs.capacityValue, venue.capacity || 'Contact for capacity');
  setText(refs.priceRange, venue.priceRange || 'Contact for pricing');
  setText(refs.priceTier, venue.priceTier ? `${venue.priceTier} tier` : '');

  if (refs.highlightsList) {
    const highlightSource =
      (Array.isArray(venue.highlights) && venue.highlights.length && venue.highlights) ||
      (Array.isArray(venue.amenities) ? venue.amenities.slice(0, 6) : []);
    const normalizedHighlights = normalizeList(highlightSource);
    refs.highlightsList.innerHTML = '';
    if (normalizedHighlights.length) {
      normalizedHighlights.forEach((item, index) => {
        const feature = buildFeatureItem(item);
        feature.style.setProperty('--reveal-delay', `${0.25 + index * 0.05}s`);
        feature.classList.add('reveal-item');
        refs.highlightsList.appendChild(feature);
      });
    } else {
      const feature = buildFeatureItem('Highlights coming soon.');
      refs.highlightsList.appendChild(feature);
    }
  }

  if (!fillList(refs.amenitiesList, venue.amenities)) {
    refs.amenitiesSection?.classList.add('is-hidden');
  } else {
    refs.amenitiesSection?.classList.remove('is-hidden');
  }

  if (refs.galleryGrid) {
    refs.galleryGrid.innerHTML = '';
    if (Array.isArray(venue.gallery) && venue.gallery.length) {
      galleryImages = venue.gallery.slice();
      venue.gallery.forEach((imgUrl, index) => {
        const figure = document.createElement('figure');
        figure.classList.add('reveal-item');
        figure.style.setProperty('--reveal-delay', `${0.45 + index * 0.05}s`);
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = `${venue.title} gallery ${index + 1}`;
        img.loading = index > 1 ? 'lazy' : 'eager';
        figure.appendChild(img);
        refs.galleryGrid.appendChild(figure);
      });
      refs.gallerySection?.classList.remove('is-hidden');
    } else {
      refs.gallerySection?.classList.add('is-hidden');
      galleryImages = [];
    }
  }

  if (venue.title) {
    document.title = `Planity | ${venue.title}`;
    currentVenueTitle = venue.title;
  }

  // Wire favorites with vendorId (from query param or dataset)
  currentVendorId = currentVendorId || venue.vendorId || '';
  initFavoriteButtons();
  refreshFavoriteState();
  resolveVendorIdFromApi(venue);

  setupRevealObserver();
  setupSectionObserver();

  if (showFallbackNotice) {
    console.warn(`Venue slug "${requestedSlug}" not found. Showing ${venue.slug} instead.`);
  }
};

setupRevealObserver();
setupSectionObserver();

const mergeVenueWithVendor = (venue, vendorVenue) => {
  if (!vendorVenue) return venue;
  return {
    ...venue,
    vendorId: vendorVenue.vendorId || venue.vendorId,
    heroImage: venue.heroImage || vendorVenue.heroImage,
    gallery: Array.isArray(venue.gallery) && venue.gallery.length ? venue.gallery : vendorVenue.gallery,
    priceRange: venue.priceRange || vendorVenue.priceRange,
    priceTier: venue.priceTier || vendorVenue.priceTier,
    amenities: Array.isArray(venue.amenities) && venue.amenities.length ? venue.amenities : vendorVenue.amenities,
    highlights: Array.isArray(venue.highlights) && venue.highlights.length ? venue.highlights : vendorVenue.highlights,
    summary: venue.summary || vendorVenue.summary,
    description: venue.description || vendorVenue.description,
    location: venue.location || vendorVenue.location,
    region: venue.region || vendorVenue.region,
    type: venue.type || vendorVenue.type,
    source: venue.source || vendorVenue.source
  };
};

const loadVenueFromApi = async (slug) => {
  const vendors = await loadVenueVendors();
  if (!vendors.length) return null;
  const target = vendors.find((v) => slugify(v.slug || v.name || '') === slug);
  return buildVenueFromVendor(target);
};

const openLightbox = (index) => {
  if (!galleryImages.length || !refs.lightboxImg) return;
  currentGalleryIndex = (index + galleryImages.length) % galleryImages.length;
  refs.lightboxImg.src = galleryImages[currentGalleryIndex];
  refs.lightboxCaption.textContent = `${currentVenueTitle || 'Venue'} - Photo ${currentGalleryIndex + 1}`;
  refs.lightbox?.classList.add('is-visible');
};

const closeLightbox = () => {
  refs.lightbox?.classList.remove('is-visible');
};

refs.galleryGrid?.addEventListener('click', (event) => {
  const figure = event.target.closest('figure');
  if (!figure) return;
  const figures = Array.from(refs.galleryGrid.querySelectorAll('figure'));
  const index = figures.indexOf(figure);
  if (index >= 0) {
    openLightbox(index);
  }
});

refs.lightboxPrev?.addEventListener('click', () => openLightbox(currentGalleryIndex - 1));
refs.lightboxNext?.addEventListener('click', () => openLightbox(currentGalleryIndex + 1));
refs.lightbox?.querySelectorAll('[data-lightbox-close]').forEach((button) => {
  button.addEventListener('click', closeLightbox);
});

const initVenuePage = async () => {
  const normalizedSlug = requestedSlug ? slugify(requestedSlug) : defaultSlug;
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error('Unable to load venue data');
    const venues = await res.json();
    if (!Array.isArray(venues) || !venues.length) {
      throw new Error('Venue dataset is empty');
    }

    const venueMatch = venues.find((v) => v.slug === normalizedSlug);
    const fallback = venues.find((v) => v.slug === defaultSlug) || venues[0];

    if (!venueMatch) {
      const apiVenue = await loadVenueFromApi(normalizedSlug);
      if (apiVenue) {
        renderVenue(apiVenue, { showFallbackNotice: true });
        return;
      }
      renderVenue(fallback, { showFallbackNotice: true });
      return;
    }

    const apiVenue = await loadVenueFromApi(slugify(venueMatch.slug || venueMatch.title || normalizedSlug));
    const hydrated = mergeVenueWithVendor(venueMatch, apiVenue);
    renderVenue(hydrated, { showFallbackNotice: false });
  } catch (error) {
    console.error(error);
    const apiVenue = await loadVenueFromApi(normalizedSlug);
    if (apiVenue) {
      renderVenue(apiVenue, { showFallbackNotice: true });
    } else {
      renderVenue(null);
    }
  }
};

initVenuePage();
