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

  const venuesListEl = document.querySelector('[data-venues-list]');
  const invitesListEl = document.querySelector('[data-invite-list]');
  const venuesEmptyEl = document.querySelector('[data-empty-venues]');
  const invitesEmptyEl = document.querySelector('[data-empty-invites]');
  const venuesCountEl = document.querySelector('[data-favorites-count]');
  const invitesCountEl = document.querySelector('[data-invite-count]');
  let venueImageMapPromise = null;
  let invitePriceMapPromise = null;

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

  const getInvitationPriceMap = async () => {
    if (invitePriceMapPromise) return invitePriceMapPromise;
    invitePriceMapPromise = fetch('data/invitations.json')
      .then((res) => res.json())
      .then((items) => {
        const map = {};
        (items || []).forEach((item) => {
          const slug = slugify(item.name || item.image || '');
          if (!slug) return;
          map[slug] = {
            price: Number(item.price || 0),
            salePrice: Number(item.salePrice || item.price || 0)
          };
        });
        return map;
      })
      .catch(() => ({}));
    return invitePriceMapPromise;
  };

  const ensureAuthed = () => {
    if (getToken()) return true;
    window.location.href = 'login.html';
    return false;
  };

  const renderEmpty = (type) => {
    if (type === 'venues') {
      venuesEmptyEl?.classList.remove('is-hidden');
      if (venuesListEl) venuesListEl.innerHTML = '';
      if (venuesCountEl) venuesCountEl.textContent = '0';
    } else if (type === 'invites') {
      invitesEmptyEl?.classList.remove('is-hidden');
      if (invitesListEl) invitesListEl.innerHTML = '';
      if (invitesCountEl) invitesCountEl.textContent = '0';
    }
  };

  const renderFavorites = (vendors = [], imageMap = {}, invitePriceMap = {}) => {
    if (venuesListEl) venuesListEl.innerHTML = '';
    if (invitesListEl) invitesListEl.innerHTML = '';

    const venues = vendors.filter((v) => (v.category || '').toLowerCase() !== 'invitation');
    const invites = vendors.filter((v) => (v.category || '').toLowerCase() === 'invitation');

    if (!venues.length) {
      renderEmpty('venues');
    } else {
      venuesEmptyEl?.classList.add('is-hidden');
      if (venuesCountEl) venuesCountEl.textContent = String(venues.length);
    }

    if (!invites.length) {
      renderEmpty('invites');
    } else {
      invitesEmptyEl?.classList.add('is-hidden');
      if (invitesCountEl) invitesCountEl.textContent = String(invites.length);
    }

    const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

    const priceLabelFor = (vendor, slug) => {
      const category = (vendor.category || '').toLowerCase();
      if (category === 'invitation') {
        const pricing = invitePriceMap[slug] || {};
        const sale = pricing.salePrice || pricing.price;
        if (sale) return `${formatPrice(sale)} ea.`;
      }
      if (vendor.pricing && vendor.pricing.amount) {
        return `${vendor.pricing.type === 'per-person' ? 'Per person' : 'Package'} at $${vendor.pricing.amount}`;
      }
      return 'Contact for pricing';
    };

    const renderList = (list, targetEl) => {
      list.forEach((vendor, index) => {
        const card = document.createElement('article');
        card.className = 'favorite-card';
        card.style.setProperty('--fav-delay', `${index * 70}ms`);
        const venueSlug = slugify(vendor.slug || vendor.vendorSlug || vendor.name || '');
        const vendorId = vendor._id || vendor.id || '';
        const photo = imageMap[venueSlug] || vendor.photos?.[0] || 'images/venues/venue2 (2).jpeg';
        const priceLabel = priceLabelFor(vendor, venueSlug);

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
            ${
              (vendor.category || '').toLowerCase() === 'invitation'
                ? `<a class="favorite-link" href="invitation-cards.html#invite-${venueSlug}">Invitation</a>`
                : `<a class="favorite-link" href="venue-detail.html?venue=${venueSlug}&vendorId=${vendorId}">
              View venue <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>`
            }
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

        targetEl?.appendChild(card);
      });
    };

    renderList(venues, venuesListEl);
    renderList(invites, invitesListEl);
  };

  async function loadFavorites() {
    if (!ensureAuthed()) return;
    try {
      const [imageMap, invitePriceMap, res] = await Promise.all([
        getVenueImageMap(),
        getInvitationPriceMap(),
        apiFetch('/favorites/mine', { method: 'GET' })
      ]);
      renderFavorites(Array.isArray(res.data) ? res.data : [], imageMap || {}, invitePriceMap || {});
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
