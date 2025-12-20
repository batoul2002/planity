document.addEventListener('DOMContentLoaded', () => {
  const cards = Array.from(document.querySelectorAll('.photog-card'));
  if (!cards.length) return;

  const { apiFetch: sharedApiFetch, getToken: sharedGetToken } = window.PlanityAPI || {};
  const API_BASE = window.location.origin + '/api/v1';
  const getToken =
    typeof sharedGetToken === 'function' ? sharedGetToken : () => localStorage.getItem('token');
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

  const slugify = (value = '') =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const extractUrl = (bg = '') => {
    if (!bg) return '';
    const match = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match ? match[2] : '';
  };

  const getPhotoFromCard = (mediaEl) => {
    if (!mediaEl) return '';
    const inline = mediaEl.style?.backgroundImage || '';
    const inlineUrl = extractUrl(inline);
    if (inlineUrl) return inlineUrl;
    try {
      const computed = window.getComputedStyle(mediaEl).backgroundImage;
      return extractUrl(computed);
    } catch (_) {
      return '';
    }
  };

  const cardsMeta = cards
    .map((card) => {
      const btn = card.querySelector('.fav');
      if (!btn) return null;
      const name = card.querySelector('.name')?.textContent?.trim() || 'Photographer';
      const media = card.querySelector('.media');
      const photo = getPhotoFromCard(media);
      const slug = slugify(card.dataset.slug || name);
      card.dataset.slug = slug;
      btn.setAttribute('aria-label', `Save ${name}`);
      btn.setAttribute('aria-pressed', 'false');
      return { card, btn, name, slug, photo };
    })
    .filter(Boolean);

  if (!cardsMeta.length) return;

  let favoriteSlugs = new Set();

  const syncButtons = () => {
    cardsMeta.forEach(({ btn, slug }) => {
      const isActive = favoriteSlugs.has(slug);
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-solid', isActive);
        icon.classList.toggle('fa-regular', !isActive);
      }
    });
  };

  const loadFavorites = async () => {
    if (!getToken()) {
      favoriteSlugs = new Set();
      syncButtons();
      return;
    }
    try {
      const res = await apiFetch('/favorites/mine', { method: 'GET' });
      const favorites = Array.isArray(res.data) ? res.data : [];
      favoriteSlugs = new Set(
        favorites
          .map((fav) => slugify(fav.slug || fav.vendorSlug || fav.name || fav.vendorName || ''))
          .filter(Boolean)
      );
    } catch (err) {
      console.warn('Unable to load favorites', err.message || err);
      favoriteSlugs = new Set();
    }
    syncButtons();
  };

  const toggleFavorite = async (meta) => {
    if (!meta || !meta.btn) return;
    if (!getToken()) {
      alert('Please log in to save favorites.');
      window.location.href = 'login.html';
      return;
    }
    const wasActive = favoriteSlugs.has(meta.slug);
    try {
      const res = await apiFetch('/favorites', {
        method: 'POST',
        body: JSON.stringify({
          vendorSlug: meta.slug,
          vendorName: meta.name,
          vendorPhoto: meta.photo,
          vendorCategory: 'photographer'
        })
      });
      const message = res?.message?.toLowerCase?.() || '';
      const added = message.includes('added');
      const removed = message.includes('removed');
      const isActive = added ? true : removed ? false : !wasActive;
      if (isActive) {
        favoriteSlugs.add(meta.slug);
      } else {
        favoriteSlugs.delete(meta.slug);
      }
      syncButtons();
      alert(isActive ? 'Photographer saved to favorites.' : 'Photographer removed from favorites.');
    } catch (err) {
      alert(err.message || 'Unable to update favorites');
    }
  };

  cardsMeta.forEach((meta) => {
    meta.btn.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      toggleFavorite(meta);
    });
  });

  loadFavorites();
});
