document.addEventListener('DOMContentLoaded', () => {
  const filterPanel = document.querySelector('.invite-filter-panel');
  const filterOverlay = document.querySelector('.invite-filter-overlay');
  const openFilters = document.querySelector('[data-filter-toggle]');
  const closeFilters = document.querySelectorAll('[data-filter-close]');
  const eventChips = document.querySelectorAll('.event-chip');
  const styleContainer = document.querySelector('[data-style-container]');
  const styleHeading = document.querySelector('[data-style-heading]');
  const colorContainer = document.querySelector('[data-color-container]');
  const colorNote = document.querySelector('[data-color-note]');
  const grid = document.querySelector('[data-grid]');
  const pagination = document.querySelector('.invite-pagination');
  const viewToggleButtons = document.querySelectorAll('.view-toggle button');
  const sortSelect = document.querySelector('[data-sort]');
  let lightbox;
  const heroImage = document.querySelector('[data-hero-image]');
  const heroEyebrow = document.querySelector('[data-hero-eyebrow]');
  const heroTitle = document.querySelector('[data-hero-title]');
  const heroOldPrice = document.querySelector('[data-hero-old]');
  const heroNewPrice = document.querySelector('[data-hero-new]');
  const heroDots = document.querySelector('[data-hero-dots]');
  const heroPrev = document.querySelector('[data-hero-prev]');
  const heroNext = document.querySelector('[data-hero-next]');
  const emptyState = document.querySelector('.invite-empty');
  const priceCheckboxes = document.querySelectorAll('input[data-price-min]');
  const priceMinInput = document.querySelector('[data-price-min-input]');
  const priceMaxInput = document.querySelector('[data-price-max-input]');
  const applyButton = document.querySelector('.apply-filters');
  const PAGE_SIZE = 12;
  const API_BASE = window.location.origin + '/api/v1';
  let manifest = [];
  let filtered = [];
  let currentPage = 1;
  let heroIndex = 0;
  let heroTimer;
  let viewMode = 'grid';
  let sortMode = 'editors';
  let hashHandled = false;

  const stylePresets = {
    wedding: {
      heading: 'Wedding styles',
      options: [
        { id: 'all', label: 'All Wedding', swatch: 'linear-gradient(135deg, #3c5347, #2a3a32)' },
        { id: 'bohemian', label: 'Bohemian', swatch: 'linear-gradient(135deg, #c0816f, #f5d7d1)' },
        { id: 'classic', label: 'Classic', swatch: 'linear-gradient(135deg, #d8c7aa, #f1e9dc)' },
        { id: 'rustic', label: 'Rustic', swatch: 'linear-gradient(135deg, #3c5347, #97a18d)' }
      ]
    },
    graduation: {
      heading: 'Graduation',
      options: [{ id: 'all', label: 'All Graduation', swatch: 'linear-gradient(135deg, #1d2a44, #f6f3ec)' }]
    },
    birthday: {
      heading: 'Birthday',
      options: [{ id: 'all', label: 'All Birthday', swatch: 'linear-gradient(135deg, #ff7fb0, #ffd166)' }]
    },
    gender: {
      heading: 'Gender reveal',
      options: [{ id: 'all', label: 'All Reveal', swatch: 'linear-gradient(135deg, #f8c9d6, #c9def5)' }]
    },
    ramadan: {
      heading: 'Ramadan',
      options: [{ id: 'all', label: 'All Ramadan', swatch: 'linear-gradient(135deg, #1f2a36, #f2e8d8)' }]
    }
  };

  const colorPresets = {
    wedding: ['black', 'green', 'ivory', 'rose', 'navy', 'white'],
    graduation: ['black', 'green', 'ivory', 'rose', 'navy', 'white'],
    ramadan: ['black', 'green', 'white'],
    birthday: [],
    gender: []
  };

  const colorHex = {
    black: '#111',
    green: '#2f4637',
    ivory: '#f3ede1',
    rose: '#c0816f',
    navy: '#1d2a44',
    white: '#ffffff'
  };

  const state = { event: 'wedding', styles: new Set(), colors: new Set() };
  let favoriteSlugs = new Set();

  const slugify = (value = '') =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  // Derive a stable quantity per card so not all show the same minimum order
  const quantityFor = (item = {}) => {
    if (item.qty && Number(item.qty) > 0) return Number(item.qty);
    const slug = slugify(item.name || item.image || '');
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffffff;
    }
    const buckets = [50, 75, 90, 100, 110, 125, 150];
    return buckets[Math.abs(hash) % buckets.length];
  };

  const getToken = () => localStorage.getItem('token');

  const getHashSlug = () =>
    window.location.hash ? window.location.hash.replace('#', '').replace(/^invite-/, '') : '';

  const loadManifest = async () => {
    try {
      const res = await fetch('data/invitations.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return await res.json();
    } catch (err) {
      if (Array.isArray(window.INVITATION_MANIFEST)) {
        console.warn('Falling back to inline invitation manifest', err);
        return window.INVITATION_MANIFEST;
      }
      throw err;
    }
  };

  const apiFetch = async (path, options = {}) => {
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

  const loadFavoriteSlugs = async () => {
    if (!getToken()) {
      favoriteSlugs = new Set();
      return;
    }
    try {
      const res = await apiFetch('/favorites/mine', { method: 'GET' });
      const favorites = Array.isArray(res.data) ? res.data : [];
      favoriteSlugs = new Set(
        favorites.map((fav) => slugify(fav.slug || fav.name || '')).filter(Boolean)
      );
    } catch (err) {
      console.warn('Unable to load favorites', err.message || err);
      favoriteSlugs = new Set();
    }
  };

  const alignFiltersToHashTarget = () => {
    const slug = getHashSlug();
    if (!slug || !manifest.length) return;
    const target = manifest.find(
      (item) => slugify(item.name || item.image || '') === slug
    );
    if (!target) return;
    if (state.event !== target.event) {
      state.event = target.event;
      eventChips.forEach((chip) =>
        chip.classList.toggle('is-active', (chip.dataset.event || '') === state.event)
      );
      buildStyleTokens(state.event);
      buildDesignFilters(state.event);
      buildColorFilters(state.event);
    }
    if (target.style) state.styles = new Set([target.style]);
    syncStyleTokens();
    syncDesignFilters();
  };

  const eventStyles = {
    wedding: ['bohemian', 'classic', 'rustic'],
    graduation: ['grad'],
    birthday: ['birthday'],
    gender: ['gender'],
    ramadan: ['ramadan']
  };

  const heroSlides = [
    {
      image: 'images/bohemian cards/bohemian green/bohemian green1.jpg',
      eyebrow: 'Featured | Botanical Foil',
      title: 'Shining Greenery',
      oldPrice: 2.29,
      newPrice: 1.6
    },
    {
      image: 'images/bohemian cards/bohemian rose/bohemian rose1.jpg',
      eyebrow: 'Limited | Blush Letterpress',
      title: 'Rose Dust Script',
      oldPrice: 2.49,
      newPrice: 1.75
    },
    {
      image: 'images/bohemian cards/bohemian ivory/bohemian ivory1.jpg',
      eyebrow: 'New | Minimal Deckle',
      title: 'Ivory Crest',
      oldPrice: 2.39,
      newPrice: 1.68
    },
    {
      image: 'images/bohemian cards/bohemian navy/bohemian navy1.jpg',
      eyebrow: 'Editor\'s pick | Classic',
      title: 'Midnight Keepsake',
      oldPrice: 2.59,
      newPrice: 1.82
    }
  ];

  const isMobile = () => window.matchMedia('(max-width: 1100px)').matches;

  const setFilterState = (isOpen) => {
    if (!filterPanel || !filterOverlay) return;
    if (!isMobile()) {
      filterPanel.classList.remove('is-open');
      filterOverlay.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      if (isOpen) {
        filterPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    filterPanel.classList.toggle('is-open', isOpen);
    filterOverlay.classList.toggle('is-open', isOpen);
    document.body.classList.toggle('no-scroll', isOpen);
  };

  openFilters?.addEventListener('click', () => setFilterState(true));
  closeFilters.forEach((btn) => btn.addEventListener('click', () => setFilterState(false)));
  filterOverlay?.addEventListener('click', () => setFilterState(false));
  window.addEventListener('resize', () => setFilterState(false));

  document.querySelectorAll('.invite-card .wishlist').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      btn.classList.toggle('is-active');
    });
  });

  const applyFilters = () => {
    const hasColorFilter = state.colors.size > 0;
    const stylesForEvent = eventStyles[state.event] || [];
    const activeStyles = state.styles.size ? state.styles : new Set(stylesForEvent);
    const priceRanges = getPriceRanges();
    filtered = manifest.filter((item) => {
      if (item.event !== state.event) return false;
      if (activeStyles.size && !activeStyles.has(item.style)) return false;
      if (hasColorFilter) {
        const colorVal = (item.color || '').toLowerCase();
        if (!state.colors.has(colorVal)) return false;
      }
      if (priceRanges.length) {
        const priceVal = item.salePrice || item.price || 0;
        const inRange = priceRanges.some(([min, max]) => priceVal >= min && priceVal <= max);
        if (!inRange) return false;
      }
      return true;
    });
    sortFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    renderGrid();
    renderPagination(totalPages);
    if (emptyState) emptyState.hidden = filtered.length > 0;
  };

  const createColorDot = (color) =>
    color
      ? `<div class="color-dots"><span style="background:${colorHex[color] || '#ccc'}${color === 'white' ? '; border:1px solid #d9d9d9' : ''}"></span></div>`
      : '';

  const renderGrid = () => {
    if (!grid) return;
    if (!hashHandled && window.location.hash && filtered.length) {
      const targetSlug = window.location.hash.replace('#', '').replace(/^invite-/, '');
      const targetIdx = filtered.findIndex(
        (item) => slugify(item.name || item.image || '') === targetSlug
      );
      if (targetIdx >= 0) {
        currentPage = Math.floor(targetIdx / PAGE_SIZE) + 1;
      }
    }
    grid.innerHTML = '';
    grid.classList.toggle('is-list', viewMode === 'list');
    const start = (currentPage - 1) * PAGE_SIZE;
    filtered.slice(start, start + PAGE_SIZE).forEach((item, idx) => {
      const card = document.createElement('article');
      card.className = 'invite-card';
      if (viewMode === 'list') card.classList.add('is-list');
      const itemSlug = slugify(item.name || item.image || '');
      card.dataset.event = item.event;
      card.dataset.style = item.style;
      card.dataset.color = item.color || '';
      card.dataset.image = item.image || '';
      card.dataset.name = item.name || '';
      card.dataset.slug = itemSlug;
      card.dataset.price = item.price ?? '';
      card.dataset.salePrice = item.salePrice ?? '';
      const isSaved = favoriteSlugs.has(itemSlug);
      card.id = `invite-${itemSlug}`;
      const qty = quantityFor(item);
      card.style.setProperty('--card-delay', `${(start + idx) * 40}ms`);
      card.innerHTML = `
        <button class="wishlist ${isSaved ? 'is-active' : ''}" aria-pressed="${isSaved}" aria-label="Save ${item.name}" data-slug="${itemSlug}"><i class="fa-regular fa-heart"></i></button>
        <div class="invite-card-image" style="background-image:url('${item.image}')"></div>
        <div class="invite-card-body">
          <p class="card-eyebrow">${labelForEvent(item.event)}</p>
          <h3>${prettyName(item.name)}</h3>
          <div class="card-price"><span class="old">$${(item.price || 0).toFixed(2)}</span> <span class="new">$${(item.salePrice || item.price || 0).toFixed(2)} ea.</span> <span class="note">(${qty} qty)</span></div>
          ${createColorDot(item.color)}
        </div>
      `;
      grid.appendChild(card);
    });
    wireWishlists();
    if (!hashHandled && window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        hashHandled = true;
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    }
  };

  const renderPagination = (totalPages) => {
    if (!pagination) return;
    pagination.innerHTML = '';
    const addButton = (label, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if (disabled) btn.classList.add('is-disabled');
      if (active) btn.classList.add('is-active');
      btn.disabled = disabled;
      btn.addEventListener('click', () => {
        if (disabled) return;
        currentPage = page;
        renderGrid();
        renderPagination(totalPages);
      });
      pagination.appendChild(btn);
    };

    addButton('Prev', Math.max(1, currentPage - 1), currentPage === 1);

    const pagesToShow = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
    } else {
      pagesToShow.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      if (start > 2) pagesToShow.push('...');
      for (let i = start; i <= end; i++) pagesToShow.push(i);
      if (end < totalPages - 1) pagesToShow.push('...');
      pagesToShow.push(totalPages);
    }

    pagesToShow.forEach((p) => {
      if (p === '...') {
        const span = document.createElement('span');
        span.className = 'ellipsis';
        span.textContent = '...';
        pagination.appendChild(span);
      } else {
        addButton(String(p), p, false, p === currentPage);
      }
    });

    addButton('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages);
  };

  const getPriceValue = (item) => Number(item.salePrice ?? item.price ?? 0);

  const sortFiltered = () => {
    const sorters = {
      editors: (a, b) => (a.__idx ?? 0) - (b.__idx ?? 0),
      low: (a, b) => getPriceValue(a) - getPriceValue(b),
      high: (a, b) => getPriceValue(b) - getPriceValue(a),
      newest: (a, b) => (b.__idx ?? 0) - (a.__idx ?? 0)
    };
    const sorter = sorters[sortMode] || sorters.editors;
    filtered = [...filtered].sort(sorter);
  };

  const labelForEvent = (event) => {
    switch (event) {
      case 'wedding':
        return 'Wedding Invitations';
      case 'graduation':
        return 'Graduation';
      case 'birthday':
        return 'Birthday';
      case 'ramadan':
        return 'Ramadan Gathering';
      case 'gender':
        return 'Gender Reveal';
      default:
        return 'Invitations';
    }
  };

  const prettyName = (filename) => filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const wireWishlists = () => {
    document.querySelectorAll('.invite-card .wishlist').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const card = btn.closest('.invite-card');
        if (!card) return;
        if (!getToken()) {
          alert('Please log in to save favorites.');
          window.location.href = 'login.html';
          return;
        }
        const payload = {
          vendorSlug: card.dataset.slug || slugify(card.dataset.name || ''),
          vendorName: prettyName(card.dataset.name || 'Invitation'),
          vendorPhoto: card.dataset.image || '',
          vendorCategory: 'invitation'
        };
        apiFetch('/favorites', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
          .then((res) => {
            const msg = res?.message || '';
            const added = msg.toLowerCase().includes('added');
            btn.classList.toggle('is-active', added);
            btn.setAttribute('aria-pressed', added ? 'true' : 'false');
            const slug = card.dataset.slug || slugify(card.dataset.name || '');
            if (slug) {
              if (added) {
                favoriteSlugs.add(slug);
              } else {
                favoriteSlugs.delete(slug);
              }
            }
            alert(added ? 'Card saved successfully.' : 'Card removed successfully.');
          })
          .catch((err) => {
            alert(err.message || 'Unable to save favorite');
          });
      });
    });
  };

  const getPriceRanges = () => {
    const ranges = [];
    priceCheckboxes.forEach((input) => {
      if (input.checked) {
        const min = parseFloat(input.dataset.priceMin);
        const max = parseFloat(input.dataset.priceMax);
        if (!isNaN(min) && !isNaN(max)) ranges.push([min, max]);
      }
    });
    const minVal = parseFloat(priceMinInput?.value);
    const maxVal = parseFloat(priceMaxInput?.value);
    if (!isNaN(minVal) || !isNaN(maxVal)) {
      ranges.push([isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? Number.MAX_VALUE : maxVal]);
    }
    return ranges;
  };

  const formatPrice = (price) => `$${Number(price || 0).toFixed(2)}`;

  const renderHeroDots = () => {
    if (!heroDots) return;
    heroDots.innerHTML = '';
    heroSlides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot' + (idx === heroIndex ? ' is-active' : '');
      dot.addEventListener('click', () => {
        heroIndex = idx;
        renderHeroSlide(idx);
        restartHeroTimer();
      });
      heroDots.appendChild(dot);
    });
  };

  const renderHeroSlide = (index) => {
    if (!heroImage) return;
    const slide = heroSlides[index] || heroSlides[0];
    heroImage.style.backgroundImage = `url('${slide.image}')`;
    if (heroEyebrow) heroEyebrow.textContent = slide.eyebrow;
    if (heroTitle) heroTitle.textContent = slide.title;
    if (heroOldPrice) heroOldPrice.textContent = formatPrice(slide.oldPrice);
    if (heroNewPrice) heroNewPrice.textContent = `${formatPrice(slide.newPrice)} ea.`;
    heroDots?.querySelectorAll('.slider-dot').forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === index);
    });
  };

  const stepHero = (delta) => {
    heroIndex = (heroIndex + delta + heroSlides.length) % heroSlides.length;
    renderHeroSlide(heroIndex);
  };

  const restartHeroTimer = () => {
    if (heroTimer) clearInterval(heroTimer);
    heroTimer = setInterval(() => stepHero(1), 6000);
  };

  if (heroImage) {
    renderHeroDots();
    renderHeroSlide(heroIndex);
    restartHeroTimer();
    heroPrev?.addEventListener('click', () => {
      stepHero(-1);
      restartHeroTimer();
    });
    heroNext?.addEventListener('click', () => {
      stepHero(1);
      restartHeroTimer();
    });
  }

  const buildStyleTokens = (eventKey) => {
    if (!styleContainer) return;
    const preset = stylePresets[eventKey] || stylePresets.wedding;
    styleContainer.innerHTML = '';
    if (styleHeading) styleHeading.textContent = preset.heading;

    preset.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'style-token' + (idx === 0 ? ' is-active' : '');
      btn.dataset.style = opt.id;
      btn.innerHTML = `<span class="style-thumb" style="background-image:${opt.swatch};"></span>${opt.label}`;
      btn.addEventListener('click', () => {
        styleContainer.querySelectorAll('.style-token').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.styles = opt.id === 'all' ? new Set(eventStyles[state.event] || []) : new Set([opt.id]);
        syncDesignFilters();
        currentPage = 1;
        applyFilters();
      });
      styleContainer.appendChild(btn);
      if (idx === 0) {
        state.styles = new Set(eventStyles[eventKey] || []);
      }
    });
  };

  const buildDesignFilters = (eventKey) => {
    const designContainer = document.querySelector('[data-design-container]');
    if (!designContainer) return;
    designContainer.innerHTML = '';
    const styles = eventStyles[eventKey] || [];
    styles.forEach((styleId) => {
      const label = styleId.charAt(0).toUpperCase() + styleId.slice(1);
      const wrap = document.createElement('label');
      wrap.className = 'filter-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      input.dataset.style = styleId;
      wrap.appendChild(input);
      wrap.append(` ${label}`);
      input.addEventListener('change', () => {
        if (input.checked) {
          state.styles.add(styleId);
        } else {
          state.styles.delete(styleId);
        }
        currentPage = 1;
        syncStyleTokens();
        applyFilters();
      });
      designContainer.appendChild(wrap);
      state.styles.add(styleId);
    });
  };

  const syncDesignFilters = () => {
    const designContainer = document.querySelector('[data-design-container]');
    if (!designContainer) return;
    designContainer.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const styleId = input.dataset.style;
      input.checked = !state.styles.size || state.styles.has(styleId);
    });
  };

  const syncStyleTokens = () => {
    if (!styleContainer) return;
    const styles = eventStyles[state.event] || [];
    const allSelected = state.styles.size === styles.length || state.styles.size === 0;
    styleContainer.querySelectorAll('.style-token').forEach((btn) => {
      const styleId = btn.dataset.style;
      const shouldActive = (styleId === 'all' && allSelected) || state.styles.has(styleId);
      btn.classList.toggle('is-active', !!shouldActive);
    });
  };

  const buildColorFilters = (eventKey) => {
    if (!colorContainer || !colorNote) return;
    colorContainer.innerHTML = '';
    state.colors.clear();
    const colors = colorPresets[eventKey] || [];
    if (!colors.length) {
      colorNote.textContent = 'No color filters for this event.';
      return;
    }
    colorNote.textContent = 'Select one or more colors.';
    colors.forEach((color) => {
      const dot = document.createElement('button');
      dot.className = 'color-chip';
      dot.dataset.color = color;
      dot.innerHTML = `<span class="color-chip-dot" style="background:${colorHex[color] || '#ccc'}"></span>${color}`;
      dot.addEventListener('click', () => {
        const active = dot.classList.toggle('is-active');
        if (active) {
          state.colors.add(color);
        } else {
          state.colors.delete(color);
        }
        currentPage = 1;
        applyFilters();
      });
      colorContainer.appendChild(dot);
    });
  };

  eventChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      eventChips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.event = chip.dataset.event || 'wedding';
      state.styles = new Set(eventStyles[state.event] || []);
      currentPage = 1;
      buildStyleTokens(state.event);
      buildDesignFilters(state.event);
      buildColorFilters(state.event);
      syncStyleTokens();
      applyFilters();
    });
  });

  const toggles = (selector, activeClass) => {
    const items = document.querySelectorAll(selector);
    items.forEach((item) =>
      item.addEventListener('click', () => {
        items.forEach((el) => el.classList.remove(activeClass));
        item.classList.add(activeClass);
      })
    );
  };

  toggles('.invite-style-scroller .style-chip', 'is-active');
  buildStyleTokens(state.event);
  buildDesignFilters(state.event);
  buildColorFilters(state.event);
  syncStyleTokens();
  Promise.all([loadFavoriteSlugs(), loadManifest()])
    .then(([, data]) => {
      manifest = data.map((item, idx) => ({ ...item, __idx: idx }));
      alignFiltersToHashTarget();
      applyFilters();
    })
    .catch((err) => {
      console.error('Failed to load invitations manifest', err);
      if (emptyState) emptyState.hidden = false;
      const emptyMsg = emptyState?.querySelector('p');
      if (emptyMsg) {
        emptyMsg.textContent =
          'Unable to load the invitation catalog. Please check your connection or open this page via http(s).';
      }
    });

  window.addEventListener('hashchange', () => {
    hashHandled = false;
    alignFiltersToHashTarget();
    if (manifest.length) applyFilters();
  });

  viewToggleButtons.forEach((btn) => {
    const mode = btn.dataset.view || 'grid';
    btn.addEventListener('click', () => {
      viewMode = mode;
      viewToggleButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      renderGrid();
    });
  });

  sortSelect?.addEventListener('change', () => {
    sortMode = sortSelect.value || 'editors';
    sortFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    renderGrid();
    renderPagination(totalPages);
  });

  const ensureLightbox = () => {
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.className = 'invite-lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-overlay" data-lightbox-close></div>
      <div class="lightbox-frame">
        <button class="lightbox-close" type="button" data-lightbox-close aria-label="Close image"><i class="fa-solid fa-xmark"></i></button>
        <img src="" alt="Invitation preview" class="lightbox-image" />
      </div>
    `;
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target.closest('[data-lightbox-close]')) closeLightbox();
    });
    return lightbox;
  };

  const openLightbox = (src) => {
    if (!src) return;
    const lb = ensureLightbox();
    const img = lb.querySelector('.lightbox-image');
    img.src = src;
    lb.classList.add('is-open');
    document.body.classList.add('no-scroll');
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  };

  grid?.addEventListener('click', (e) => {
    const card = e.target.closest('.invite-card');
    if (!card) return;
    if (e.target.closest('.wishlist')) return;
    if (e.target.tagName === 'A') return;
    const imageUrl = card.dataset.image || '';
    openLightbox(imageUrl);
  });

  priceCheckboxes.forEach((cb) =>
    cb.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    })
  );
  [priceMinInput, priceMaxInput]
    .filter(Boolean)
    .forEach((input) =>
      input.addEventListener('input', () => {
        currentPage = 1;
        applyFilters();
      })
    );
  applyButton?.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = 1;
    applyFilters();
    setFilterState(false);
  });
});
