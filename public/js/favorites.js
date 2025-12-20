(() => {
  const api = window.PlanityAPI || {};
  const getToken = api.getToken || (() => localStorage.getItem('token'));
  const apiFetch =
    api.apiFetch ||
    ((path, options = {}) => {
      const headers = options.headers ? { ...options.headers } : {};
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      const token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(`${window.location.origin}/api/v1${path}`, { ...options, headers }).then(async (res) => {
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
    });

  const views = {
    services: document.querySelector('[data-view="services"]'),
    categories: document.querySelector('[data-view="categories"]'),
    subcategories: document.querySelector('[data-view="subcategories"]'),
    items: document.querySelector('[data-view="items"]')
  };

  const grids = {
    services: document.querySelector('[data-service-grid]'),
    categories: document.querySelector('[data-category-grid]'),
    subcategories: document.querySelector('[data-subcategory-grid]'),
    items: document.querySelector('[data-item-grid]')
  };

  const headers = {
    collectionIcon: document.querySelector('[data-collection-icon]'),
    collectionTitle: document.querySelector('[data-collection-title]'),
    collectionSub: document.querySelector('[data-collection-sub]'),
    collectionCount: document.querySelector('[data-collection-count]'),
    itemIcon: document.querySelector('[data-item-icon]'),
    itemTitle: document.querySelector('[data-item-title]'),
    itemSub: document.querySelector('[data-item-sub]'),
    itemCount: document.querySelector('[data-item-count]')
  };

  const breadcrumbs = {
    sub: document.querySelector('[data-breadcrumb-sub]'),
    items: document.querySelector('[data-breadcrumb-items]')
  };

  const state = {
    favorites: [],
    services: [],
    service: null,
    collection: null,
    subcategory: null,
    venueImageMap: {},
    invitePriceMap: {},
    totalCount: 0
  };

  const slugify = (value = '') =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const normalizeCategory = (category = '') => {
    const c = category.toLowerCase();
    if (['decor', 'decorator', 'decoration'].includes(c)) return 'decoration';
    if (['invite', 'invitation', 'card', 'cards'].includes(c)) return 'invitation';
    if (['cater', 'catering', 'caterer'].some((k) => c.includes(k))) return 'catering';
    if (['photo', 'photographer', 'photography'].some((k) => c.includes(k))) return 'photographer';
    return 'venue';
  };

  const metaForService = {
    decoration: {
      id: 'decoration',
      title: 'Decoration',
      tagline: 'Saved setups by event type',
      tone: '120, 156, 128',
      toneSoft: '168, 198, 172',
      icon: 'fa-wand-magic-sparkles',
      image: 'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop3.jpg'
    },
    venues: {
      id: 'venues',
      title: 'Venues',
      tagline: 'Spaces you saved to compare later',
      tone: '86, 122, 101',
      toneSoft: '138, 176, 150',
      icon: 'fa-building-columns',
      image: 'images/venues/Aldea2.jpeg'
    },
    photographers: {
      id: 'photographers',
      title: 'Photographers',
      tagline: 'Artists capturing your moments',
      tone: '102, 126, 142',
      toneSoft: '158, 182, 194',
      icon: 'fa-camera-retro',
      image: 'images/photographers/alyhadi.jpg'
    },
    catering: {
      id: 'catering',
      title: 'Catering',
      tagline: 'Sweet houses and menus you saved',
      tone: '124, 139, 118',
      toneSoft: '170, 188, 170',
      icon: 'fa-bell-concierge',
      image: 'images/services/catering.jpg'
    },
    invites: {
      id: 'invites',
      title: 'Invitation Cards',
      tagline: 'Cards you loved for your event',
      tone: '156, 128, 92',
      toneSoft: '206, 180, 140',
      icon: 'fa-envelope-open-text',
      image: 'images/classic%20cards/classic%20rose/classic%20rose1.jpg'
    }
  };

  const eventMeta = {
    'gender-reveal': {
      title: 'Gender Reveal',
      tagline: 'Playful moments for the big surprise',
      icon: 'fa-baby',
      tone: '190, 160, 120',
      toneSoft: '227, 202, 167',
      image: 'images/genderRevealEvents/genderReveal1.jpg'
    },
    wedding: {
      title: 'Wedding Decoration',
      tagline: 'Elegant arrangements for your special day',
      icon: 'fa-ring',
      tone: '156, 128, 92',
      toneSoft: '206, 180, 140',
      image: metaForService.decoration.image
    },
    birthday: {
      title: 'Birthday Decoration',
      tagline: 'Celebrate another year in style',
      icon: 'fa-cake-candles',
      tone: '120, 156, 128',
      toneSoft: '168, 198, 172',
      image: 'images/decorationDetails/Birthday/backdrops/backdropBirthday5.jpg'
    },
    graduation: {
      title: 'Graduation',
      tagline: 'Honor academic achievements',
      icon: 'fa-graduation-cap',
      tone: '86, 122, 101',
      toneSoft: '138, 176, 150',
      image: 'images/graduationEvent/black/graduation%20black3.jpg'
    },
    ramadan: {
      title: 'Ramadan Gathering',
      tagline: 'Warm gatherings and serene nights',
      icon: 'fa-moon',
      tone: '190, 160, 120',
      toneSoft: '227, 202, 167',
      image: 'images/ramadanEvents/black/ramadan%20black2.jpg'
    },
    other: {
      title: 'Other Events',
      tagline: 'Personalized touches for every occasion',
      icon: 'fa-house',
      tone: '120, 156, 128',
      toneSoft: '168, 198, 172',
      image: 'images/venues/Bustan%20Zarife1.jpg'
    }
  };

  const decorSubMeta = {
    backdrop: { title: 'Stage Backdrops', icon: 'fa-masks-theater' },
    balloon: { title: 'Balloon Stand', icon: 'fa-cloud' },
    cake: { title: 'Cake Table', icon: 'fa-utensils' },
    centerpiece: { title: 'Table Centerpieces', icon: 'fa-wine-glass' },
    'guest-table': { title: 'Guest Table & Chairs', icon: 'fa-chair' },
    'themed-props': { title: 'Themed Props', icon: 'fa-star' }
  };

  const ensureAuthed = () => {
    if (getToken()) return true;
    window.location.href = 'login.html';
    return false;
  };

  const getVenueImageMap = async () => {
    if (state.venueImageMap && Object.keys(state.venueImageMap).length) return state.venueImageMap;
    try {
      const venues = await fetch('data/venue-details.json').then((res) => res.json());
      const map = {};
      (venues || []).forEach((venue) => {
        const slug = slugify(venue.slug || venue.title || '');
        const primary = venue.heroImage || (Array.isArray(venue.gallery) && venue.gallery[0]);
        if (slug && primary) {
          map[slug] = primary;
        }
      });
      // Fallback to the legacy venue.html scrape only if JSON was empty
      if (!Object.keys(map).length) {
        const html = await fetch('venue.html').then((res) => res.text());
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('.venue-card').forEach((card) => {
          const name = card.querySelector('h3')?.textContent?.trim();
          const img = card.querySelector('img')?.getAttribute('src');
          if (!name || !img) return;
          map[slugify(name)] = img;
        });
      }
      state.venueImageMap = map;
    } catch (_) {
      state.venueImageMap = {};
    }
    return state.venueImageMap;
  };

  const getInvitationPriceMap = async () => {
    if (state.invitePriceMap && Object.keys(state.invitePriceMap).length) return state.invitePriceMap;
    try {
      const items = await fetch('data/invitations.json').then((res) => res.json());
      const map = {};
      (items || []).forEach((item) => {
        const slug = slugify(item.name || item.image || '');
        if (!slug) return;
        map[slug] = {
          price: Number(item.price || 0),
          salePrice: Number(item.salePrice || item.price || 0),
          image: item.image
        };
      });
      state.invitePriceMap = map;
    } catch (_) {
      state.invitePriceMap = {};
    }
    return state.invitePriceMap;
  };

  const detectEventKey = (vendor = {}) => {
    const slug = slugify(vendor.slug || vendor.name || '');
    if (slug.includes('gender') || slug.includes('reveal')) return 'gender-reveal';
    if (slug.includes('wedding')) return 'wedding';
    if (slug.includes('birthday')) return 'birthday';
    if (slug.includes('graduation')) return 'graduation';
    if (slug.includes('ramadan')) return 'ramadan';
    return 'other';
  };

  const detectDecorSubKey = (vendor = {}) => {
    const slug = slugify(vendor.slug || vendor.name || '');
    if (slug.includes('backdrop') || slug.includes('stage')) return 'backdrop';
    if (slug.includes('balloon')) return 'balloon';
    if (slug.includes('cake') || slug.includes('dessert') || slug.includes('sweet')) return 'cake';
    if (slug.includes('centerpiece') || slug.includes('centerpieces')) return 'centerpiece';
    if (slug.includes('guest-table') || slug.includes('guest') || slug.includes('chair')) return 'guest-table';
    if (slug.includes('theme') || slug.includes('prop') || slug.includes('decor')) return 'themed-props';
    return 'other';
  };

  const priceLabelFor = (vendor, slug, priceMap) => {
    const category = normalizeCategory(vendor.category || vendor.serviceType || '');
    if (category === 'invitation') {
      const pricing = priceMap[slug] || {};
      const sale = pricing.salePrice || pricing.price;
      if (sale) return `$${Number(sale).toFixed(2)} ea.`;
    }
    if (vendor.pricing && vendor.pricing.amount) {
      return `${vendor.pricing.type === 'per-person' ? 'Per person' : 'Package'} at $${vendor.pricing.amount}`;
    }
    return 'Contact for pricing';
  };

  const detailLinkForDecoration = (item) => {
    const vendor = item.raw || {};
    const eventKey = detectEventKey(vendor);
    const slug = item.slug || slugify(vendor.slug || vendor.name || '');
    return `decoration-gallery.html?event=${eventKey}&slug=${slug}`;
  };

  const vendorToItem = (vendor, { priceMap, venueImages }) => {
    const slug = slugify(vendor.slug || vendor.vendorSlug || vendor.name || '');
    const category = normalizeCategory(vendor.category || vendor.serviceType || '');
    const isVenue = category === 'venue';
    const isInvite = category === 'invitation';
    const fallbackInvite = state.invitePriceMap[slug]?.image;
    const photo =
      vendor.photos?.[0] ||
      (isVenue ? venueImages[slug] : null) ||
      (isInvite ? fallbackInvite : null) ||
      'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop3.jpg';

    return {
      id: vendor._id || vendor.id || slug,
      slug,
      title: vendor.name || 'Vendor',
      vendor: vendor.vendorName || vendor.brand || vendor.name || 'Vendor',
      rating: vendor.averageRating || vendor.rating || vendor.score || 0,
      price: priceLabelFor(vendor, slug, priceMap),
      location: vendor.city || 'Lebanon',
      image: photo,
      category,
      raw: vendor
    };
  };

  const buildDecorationCollections = (decorVendors) => {
    const grouped = {};
    decorVendors.forEach((vendor) => {
      const eventKey = detectEventKey(vendor);
      const detectedSubKey = detectDecorSubKey(vendor);
      const vendorSlug = slugify(vendor.slug || vendor.name || '');
      const hasPreset = decorSubMeta[detectedSubKey] && detectedSubKey !== 'other';
      const subKey = hasPreset ? detectedSubKey : vendorSlug || 'custom-decor';
      if (!grouped[eventKey]) grouped[eventKey] = {};
      if (!grouped[eventKey][subKey]) grouped[eventKey][subKey] = [];
      grouped[eventKey][subKey].push(vendor);
    });

    return Object.entries(grouped).map(([key, subMap]) => {
      const meta = eventMeta[key] || eventMeta.other;
      const subcategories = Object.entries(subMap).map(([subKey, vendors]) => {
        const subMeta = decorSubMeta[subKey] || {};
        const items = vendors.map((vendor) =>
          vendorToItem(vendor, { priceMap: state.invitePriceMap, venueImages: state.venueImageMap })
        );
        return {
          id: `${key}-${subKey}`,
          title: subMeta.title || vendors[0]?.name || 'Decor',
          description: meta.tagline,
          count: items.length,
          icon: subMeta.icon || 'fa-star',
          items
        };
      });

      const allItems = Object.values(subMap).flat();
      const firstItemPhoto =
        subcategories.find((s) => s.items?.[0])?.items?.[0]?.image || meta.image;

      return {
        id: key,
        title: meta.title,
        tagline: meta.tagline,
        tone: meta.tone,
        toneSoft: meta.toneSoft,
        icon: meta.icon,
        image: firstItemPhoto,
        savedCount: allItems.length,
        subcategories
      };
    });
  };

  const buildServices = () => {
    const base = {
      decoration: { ...metaForService.decoration, collections: [], savedCount: 0 },
      venues: { ...metaForService.venues, items: [], savedCount: 0 },
      photographers: { ...metaForService.photographers, items: [], savedCount: 0 },
      catering: { ...metaForService.catering, items: [], savedCount: 0 },
      invites: { ...metaForService.invites, items: [], savedCount: 0 }
    };

    const venueImages = state.venueImageMap || {};
    const priceMap = state.invitePriceMap || {};

    state.favorites.forEach((vendor) => {
      const category = normalizeCategory(vendor.category || vendor.serviceType || '');
      const item = vendorToItem(vendor, { priceMap, venueImages });
      if (category === 'decoration') {
        if (!base.decoration._raw) base.decoration._raw = [];
        base.decoration._raw.push(vendor);
      } else if (category === 'invitation') {
        base.invites.items.push(item);
      } else if (category === 'catering') {
        base.catering.items.push(item);
      } else if (category === 'photographer') {
        base.photographers.items.push(item);
      } else {
        base.venues.items.push(item);
      }
    });

    if (base.decoration._raw) {
      base.decoration.collections = buildDecorationCollections(base.decoration._raw);
      base.decoration.savedCount = base.decoration.collections.reduce((acc, c) => acc + (c.savedCount || 0), 0);
    }
    base.venues.savedCount = base.venues.items.length;
    base.photographers.savedCount = base.photographers.items.length;
    base.catering.savedCount = base.catering.items.length;
    base.invites.savedCount = base.invites.items.length;

    state.services = Object.values(base);
  };

  const formatCount = (value) => `${value} item${value === 1 ? '' : 's'} saved`;

  const goToServices = () => {
    state.service = null;
    state.collection = null;
    state.subcategory = null;
    showView('services');
  };

  const goToCategories = () => {
    state.collection = null;
    state.subcategory = null;
    showView('categories');
  };

  const showView = (view) => {
    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      el.classList.toggle('is-hidden', name !== view);
    });
  };

  const renderBreadcrumb = (target, segments) => {
    if (!target) return;
    target.innerHTML = '';
    segments.forEach((segment, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'fav-crumb-sep';
        sep.textContent = '>';
        target.appendChild(sep);
      }
      if (segment.action) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fav-crumb';
        btn.textContent = segment.label;
        btn.addEventListener('click', segment.action);
        target.appendChild(btn);
      } else {
        const span = document.createElement('span');
        span.textContent = segment.label;
        target.appendChild(span);
      }
    });
  };

  const attachTone = (el, collection) => {
    if (!el || !collection) return;
    el.style.setProperty('--tone', collection.tone || '232, 73, 110');
    el.style.setProperty('--tone-soft', collection.toneSoft || collection.tone || '232, 73, 110');
  };

  const renderServices = () => {
    const target = grids.services;
    if (!target) return;
    target.innerHTML = '';

    if (!state.services.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-items';
      empty.textContent = 'No favorites yet. Save items to see them here.';
      target.appendChild(empty);
      return;
    }

    state.services.forEach((service) => {
      const card = document.createElement('article');
      card.className = 'category-card service-card';
      card.style.setProperty('--tone', service.tone);
      card.style.setProperty('--tone-soft', service.toneSoft || service.tone);
      card.style.setProperty('--card-photo', `url('${service.image}')`);

      card.innerHTML = `
        <div class="fav-mini-icon"><i class="fa-solid ${service.icon}"></i></div>
        <div>
          <h3>${service.title}</h3>
          <p>${service.tagline || ''}</p>
        </div>
        <div class="fav-card-footer">
          <span class="fav-pill">${formatCount(service.savedCount || 0)}</span>
          <div class="fav-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
      `;

      card.addEventListener('click', () => openService(service.id));
      target.appendChild(card);
    });

    const total = state.totalCount || 0;
    const totalEl = document.querySelector('[data-fav-total]');
    if (totalEl) totalEl.textContent = `${total} favorite${total === 1 ? '' : 's'} saved`;
  };

  const renderCategories = () => {
    const service = state.service;
    if (!service || !Array.isArray(service.collections)) return;
    const target = grids.categories;
    if (!target) return;
    target.innerHTML = '';

    service.collections.forEach((collection) => {
      const card = document.createElement('article');
      card.className = 'category-card';
      card.style.setProperty('--tone', collection.tone);
      card.style.setProperty('--tone-soft', collection.toneSoft || collection.tone);
      card.style.setProperty('--card-photo', `url('${collection.image || service.image}')`);

      card.innerHTML = `
        <div class="fav-mini-icon"><i class="fa-solid ${collection.icon || service.icon}"></i></div>
        <div>
          <h3>${collection.title}</h3>
          <p>${collection.tagline || service.tagline || ''}</p>
        </div>
        <div class="fav-card-footer">
          <span class="fav-pill">${formatCount(collection.savedCount || 0)}</span>
          <div class="fav-arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
      `;

      card.addEventListener('click', () => openCategory(collection.id));
      target.appendChild(card);
    });

    if (!service.collections.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-items';
      empty.textContent = 'No decoration favorites yet.';
      target.appendChild(empty);
    }
  };

  const renderSubcategories = () => {
    const collection = state.collection;
    if (!collection || !grids.subcategories) return;
    attachTone(views.subcategories, collection);
    attachTone(headers.collectionIcon, collection);
    if (headers.collectionIcon) {
      headers.collectionIcon.innerHTML = `<i class="fa-solid ${collection.icon || state.service?.icon}"></i>`;
    }
    if (headers.collectionTitle) headers.collectionTitle.textContent = collection.title;
    if (headers.collectionSub) headers.collectionSub.textContent = collection.tagline || '';
    if (headers.collectionCount) headers.collectionCount.textContent = formatCount(collection.savedCount || 0);

    const serviceTitle = state.service?.title || 'Decoration';
    renderBreadcrumb(breadcrumbs.sub, [
      { label: 'Favorites', action: goToServices },
      {
        label: serviceTitle,
        action: state.service ? () => openService(state.service.id) : goToServices
      },
      { label: collection.title }
    ]);

    grids.subcategories.innerHTML = '';
    (collection.subcategories || []).forEach((sub) => {
      const itemsCount = Array.isArray(sub.items) ? sub.items.length : sub.count || 0;
      const card = document.createElement('article');
      card.className = 'sub-card';
      card.style.setProperty('--tone', collection.tone);
      card.innerHTML = `
        <div class="sub-icon"><i class="fa-solid ${sub.icon || collection.icon || 'fa-star'}"></i></div>
        <div class="sub-copy">
          <h4>${sub.title}</h4>
          <div class="sub-meta">${itemsCount} item${itemsCount === 1 ? '' : 's'}</div>
        </div>
        <div class="sub-arrow"><i class="fa-solid fa-chevron-right"></i></div>
      `;
      card.addEventListener('click', () => openSubcategory(sub.id));
      grids.subcategories.appendChild(card);
    });

    if (!collection.subcategories || !collection.subcategories.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-items';
      empty.textContent = 'No saved setups yet.';
      grids.subcategories.appendChild(empty);
    }
  };

  const renderItems = (context, subcategoryId, options = {}) => {
    const target = grids.items;
    if (!target) return;
    const collection = options.isDirectService ? context : state.collection;
    const sub = options.isDirectService
      ? { title: context.title, description: context.tagline, items: context.items || [], icon: context.icon }
      : (collection?.subcategories || []).find((s) => s.id === subcategoryId) || state.subcategory;

    if (!collection || !sub) return;

    attachTone(views.items, collection);
    attachTone(headers.itemIcon, collection);
    if (headers.itemIcon) {
      const icon = sub.icon || collection.icon || context.icon;
      headers.itemIcon.innerHTML = `<i class="fa-solid ${icon || 'fa-heart'}"></i>`;
    }
    if (headers.itemTitle) headers.itemTitle.textContent = sub.title || collection.title;
    if (headers.itemSub) headers.itemSub.textContent = sub.description || collection.tagline || '';
    if (headers.itemCount) {
      const totalItems = Array.isArray(sub.items) ? sub.items.length : 0;
      headers.itemCount.textContent = `${totalItems} saved item${totalItems === 1 ? '' : 's'}`;
    }

    const crumbs = [{ label: 'Favorites', action: goToServices }];
    if (options.isDirectService) {
      crumbs.push({ label: collection.title });
    } else {
      crumbs.push({ label: state.service?.title || 'Decoration', action: () => openService(state.service.id) });
      crumbs.push({ label: collection.title, action: () => openCategory(collection.id) });
      crumbs.push({ label: sub.title });
    }
    renderBreadcrumb(breadcrumbs.items, crumbs);

    target.innerHTML = '';
    if (!sub.items || !sub.items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-items';
      empty.textContent = 'No saved items yet for this set.';
      target.appendChild(empty);
      return;
    }

    sub.items.forEach((item) => {
      const ratingLabel = item.rating ? (item.rating.toFixed ? item.rating.toFixed(1) : item.rating) : 'New';
      const card = document.createElement('article');
      card.className = 'item-card';
      card.style.setProperty('--tone', collection.tone);
      const isDecoration = state.service?.id === 'decoration';
      const detailHref = isDecoration ? detailLinkForDecoration(item) : '#';

      card.innerHTML = `
        <div class="item-media">
          <img src="${item.image}" alt="${item.title}" />
          <div class="item-like"><i class="fa-solid fa-heart"></i></div>
        </div>
        <div class="item-body">
          <h5 class="item-title">${item.title}</h5>
          <div class="item-meta">
            <span><i class="fa-solid fa-star"></i> ${ratingLabel}</span>
            <span>&bull;</span>
            <span>${item.vendor}</span>
          </div>
          <div class="item-meta">
            <span class="item-price">${item.price || 'Contact for details'}</span>
          </div>
          <div class="item-actions">
            <span class="pill-soft"><i class="fa-solid fa-heart"></i> Saved</span>
            <a class="fav-btn" href="${detailHref}">View Details</a>
          </div>
        </div>
      `;

      target.appendChild(card);
    });
  };

  const openService = (serviceId) => {
    const service = state.services.find((s) => s.id === serviceId);
    state.service = service || null;
    state.collection = null;
    state.subcategory = null;
    if (!service) return;

    if (service.id === 'decoration') {
      renderCategories();
      showView('categories');
      return;
    }

    renderItems(service, null, { isDirectService: true });
    showView('items');
  };

  const openCategory = (collectionId) => {
    const collection = state.service?.collections?.find((c) => c.id === collectionId) || null;
    state.collection = collection;
    state.subcategory = null;
    if (!collection) return;
    renderSubcategories();
    showView('subcategories');
  };

  const openSubcategory = (subcategoryId) => {
    state.subcategory = state.collection?.subcategories?.find((s) => s.id === subcategoryId) || null;
    if (!state.collection || !state.subcategory) return;
    renderItems(state.collection, subcategoryId);
    showView('items');
  };

  const loadFavorites = async () => {
    if (!ensureAuthed()) return;
    try {
      const [venueMap, inviteMap, res] = await Promise.all([
        getVenueImageMap(),
        getInvitationPriceMap(),
        apiFetch('/favorites/mine', { method: 'GET' })
      ]);
      state.venueImageMap = venueMap || {};
      state.invitePriceMap = inviteMap || {};
      state.favorites = Array.isArray(res.data) ? res.data : [];
      state.totalCount = state.favorites.length;
      buildServices();
      renderServices();
      showView('services');
    } catch (err) {
      alert(err.message || 'Unable to load favorites');
    }
  };

  const init = () => {
    if (!views.services) return;
    api.syncAuthNav?.();
    loadFavorites();
  };

  init();
})();
