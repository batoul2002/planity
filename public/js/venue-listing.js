const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".venue-card").forEach((card) => {
    const name = card.querySelector("h3")?.textContent?.trim();
    if (!name) return;
    const slug = slugify(name);
    const link = card.querySelector(".venue-card-cta");
    if (link) {
      link.href = `venue-detail.html?venue=${slug}`;
    }
  });
});

