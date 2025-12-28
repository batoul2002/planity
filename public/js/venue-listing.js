const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

document.addEventListener("DOMContentLoaded", () => {
  const cards = Array.from(document.querySelectorAll(".venue-card"));
  if (!cards.length) return;

  const normalizeKey = (value = "") => slugify(String(value || "").trim());
  const buildDeletedSet = (items = []) => {
    const set = new Set();
    items.forEach((item) => {
      if (!item) return;
      const clientKey = normalizeKey(item.clientKey || "");
      const titleKey = normalizeKey(item.title || item.name || "");
      if (clientKey) set.add(clientKey);
      if (titleKey) set.add(titleKey);
    });
    return set;
  };

  const hideDeletedCards = (deletedSet = new Set()) => {
    if (!deletedSet.size) return;
    cards.forEach((card) => {
      const name = card.querySelector("h3")?.textContent?.trim() || "";
      const slugFromData = normalizeKey(card.dataset.venueSlug || "");
      const slugFromTitle = normalizeKey(name);
      if (deletedSet.has(slugFromData) || deletedSet.has(slugFromTitle)) {
        card.style.display = "none";
        card.setAttribute("aria-hidden", "true");
      }
    });
  };

  const fetchDeletedVenues = async () => {
    try {
      const params = new URLSearchParams();
      params.append("service", "Venue");
      params.append("status", "deleted");
      const res = await fetch(`/api/v1/public/planner-items?${params.toString()}`);
      if (!res.ok) return new Set();
      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data : [];
      return buildDeletedSet(items);
    } catch (_) {
      return new Set();
    }
  };

  const linkCards = (slugMap = {}) => {
    cards.forEach((card) => {
      const name = card.querySelector("h3")?.textContent?.trim();
      if (!name) return;
      const rawSlug = slugify(name);
      const matchedSlug =
        slugMap[rawSlug] ||
        slugMap[slugify(name.replace(/\(.*?\)/g, "").trim())] || // ignore parentheses
        Object.keys(slugMap).find((key) => key.includes(rawSlug) || rawSlug.includes(key));
      const finalSlug = matchedSlug || rawSlug;
      const link = card.querySelector(".venue-card-cta");
      if (link) {
        link.href = `venue-detail.html?venue=${finalSlug}`;
      }
      card.dataset.venueSlug = finalSlug;
    });
  };

  const applyVenueLinks = async (slugMap = {}) => {
    linkCards(slugMap);
    const deletedSet = await fetchDeletedVenues();
    hideDeletedCards(deletedSet);
  };

  fetch("data/venue-details.json")
    .then((res) => res.json())
    .then((venues) => {
      const map = {};
      (venues || []).forEach((venue) => {
        const dataSlug = slugify(venue.slug || venue.title || "");
        const titleSlug = slugify(venue.title || "");
        if (dataSlug) map[dataSlug] = venue.slug || dataSlug;
        if (titleSlug) map[titleSlug] = venue.slug || dataSlug;
      });
      applyVenueLinks(map);
    })
    .catch(() => applyVenueLinks());
});
