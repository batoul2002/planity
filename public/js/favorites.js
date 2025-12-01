(() => {
  const api = window.PlanityAPI || {};
  const API_BASE = window.location.origin + '/api/v1';

  const slugify = (value = '') =>
    value
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const getToken = api.getToken || (() => localStorage.getItem('token'));
  const apiFetch =
    api.apiFetch ||
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

  const listEl = document.querySelector('[data-favorites-list]');
  const emptyEl = document.querySelector('[data-empty-state]');
  const countEl = document.querySelector('[data-favorites-count]');
  let venueImageMapPromise = null;

  const getVenueImageMap = async () => {
    if (venueImageMapPromise) return venueImageMapPromise;
    venueImageMapPromise = fetch('venue.html')
      .then((res) => res.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const map = {};
        doc.querySelectorAll('.venue-card').forEach((card) => {
          const name = card.querySelector('h3')?.textContent?.trim();
          const img = card.querySelector('img')?.getAttribute('src');
          if (!name || !img) return;
          map[slugify(name)] = img;
        });
        return map;
      })
      .catch(() => ({}));
    return venueImageMapPromise;
  };

  const ensureAuthed = () => {
    if (getToken()) return true;
    window.location.href = 'login.html';
    return false;
  };

  const renderEmpty = () => {
    if (emptyEl) emptyEl.classList.remove('is-hidden');
    if (listEl) listEl.innerHTML = '';
    if (countEl) countEl.textContent = '0';
  };

  const renderFavorites = (vendors = [], imageMap = {}) => {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!vendors.length) {
      renderEmpty();
      return;
    }

    if (emptyEl) emptyEl.classList.add('is-hidden');
    if (countEl) countEl.textContent = String(vendors.length);

    vendors.forEach((vendor, index) => {
      const card = document.createElement('article');
      card.className = 'favorite-card';
      card.style.setProperty('--fav-delay', `${index * 70}ms`);
      const venueSlug = slugify(vendor.name || vendor.slug || '');
      const vendorId = vendor._id || vendor.id || '';
      const photo = imageMap[venueSlug] || vendor.photos?.[0] || 'images/venues/venue2 (2).jpeg';
      const priceLabel =
        vendor.pricing && vendor.pricing.amount
          ? `${vendor.pricing.type === 'per-person' ? 'Per person' : 'Package'} · $${vendor.pricing.amount}`
          : 'Contact for pricing';

      card.innerHTML = `
        <div class="favorite-media" style="background-image: url('${photo}')"></div>
        <div class="favorite-body">
          <h3 class="favorite-title">${vendor.name || 'Vendor'}</h3>
          <div class="favorite-meta">
            <span class="favorite-pill"><i class="fa-solid fa-heart"></i> ${vendor.category || 'venue'}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${vendor.city || 'Lebanon'}</span>
          </div>
          <p class="favorite-meta">${priceLabel}</p>
          <div class="favorite-actions">
            <a class="favorite-link" href="venue-detail.html?venue=${venueSlug}&vendorId=${vendorId}">
              View venue <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button class="favorite-remove" type="button" data-remove-id="${vendorId}">
              Remove
            </button>
          </div>
        </div>
      `;

      const removeBtn = card.querySelector('[data-remove-id]');
      removeBtn?.addEventListener('click', async () => {
        if (!vendorId) return;
        try {
          await apiFetch('/favorites', {
            method: 'POST',
            body: JSON.stringify({ vendorId })
          });
          await loadFavorites();
        } catch (err) {
          alert(err.message || 'Unable to update favorites');
        }
      });

      listEl.appendChild(card);
    });
  };

  async function loadFavorites() {
    if (!ensureAuthed()) return;
    try {
      const [imageMap, res] = await Promise.all([
        getVenueImageMap(),
        apiFetch('/favorites/mine', { method: 'GET' })
      ]);
      renderFavorites(Array.isArray(res.data) ? res.data : [], imageMap || {});
    } catch (err) {
      renderEmpty();
      alert(err.message || 'Unable to load favorites');
    }
  }

  function init() {
    api.syncAuthNav?.();
    loadFavorites();
  }

  init();
})();
