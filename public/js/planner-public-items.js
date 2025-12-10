document.addEventListener('DOMContentLoaded', () => {
  const mounts = document.querySelectorAll('[data-planner-grid]');
  if (!mounts.length) return;

  const formatPrice = (item) => {
    const min = Number(item.priceMin || 0);
    const max = Number(item.priceMax || min);
    if (min === max) return `$${min.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  };

  const buildCard = (item) => {
    const card = document.createElement('div');
    card.className = 'planner-card';
    card.innerHTML = `
      <div class="planner-card-media">
        <img src="${item.image || 'images/logo.png'}" alt="${item.title || 'Planner item'}">
      </div>
      <div class="planner-card-body">
        <p class="planner-card-eyebrow">${item.service || ''}${item.eventType ? ' · ' + item.eventType : ''}</p>
        <h4>${item.title || 'Item'}</h4>
        <p class="planner-card-meta">${item.category || ''}</p>
        <p class="planner-card-price">${formatPrice(item)}</p>
      </div>
    `;
    return card;
  };

  const loadForMount = async (mount) => {
    const wrapper = mount.closest('[data-service]');
    const service = wrapper?.dataset.service || '';
    const eventType = wrapper?.dataset.event || '';
    const params = new URLSearchParams();
    if (service) params.append('service', service);
    if (eventType) params.append('eventType', eventType);
    try {
      const res = await fetch(`/api/v1/public/planner-items?${params.toString()}`);
      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data.filter((i) => (i.status || '').toLowerCase() === 'approved') : [];
      if (!items.length) {
        mount.closest('.planner-public-section')?.classList.add('is-hidden');
        return;
      }
      mount.innerHTML = '';
      items.forEach((item) => mount.appendChild(buildCard(item)));
    } catch (err) {
      console.warn('Unable to load planner items for public page', err);
      mount.closest('.planner-public-section')?.classList.add('is-hidden');
    }
  };

  mounts.forEach(loadForMount);
});
