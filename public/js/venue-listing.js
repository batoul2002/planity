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
      linkCards(map);
    })
    .catch(() => linkCards());
});
