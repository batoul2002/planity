(function () {
  const STORAGE_KEY = "plannerMock";

  const buildItemKey = (item = {}) =>
    [
      (item.title || "").toString().trim().toLowerCase(),
      (item.service || "").toString().trim().toLowerCase(),
      (item.eventType || "").toString().trim().toLowerCase(),
      (item.category || "").toString().trim().toLowerCase(),
      (item.image || "").toString().trim().toLowerCase(),
    ].join("|");

  const withClientKey = (item = {}) => ({ ...item, clientKey: item.clientKey || buildItemKey(item) });

  const mockItems = [
    {
      id: "sample-1",
      title: "Bohemian Black",
      service: "Invitation Cards",
      eventType: "Wedding",
      category: "Bohemian",
      priceMin: 1.5,
      priceMax: 2.2,
      image: "../images/invitations/bohemian-black.jpg",
      status: "approved",
      source: "mock",
    },
    {
      id: "sample-2",
      title: "Greenery Luxe",
      service: "Invitation Cards",
      eventType: "Engagement",
      category: "Modern",
      priceMin: 1.8,
      priceMax: 2.6,
      image: "../images/invitations/greenery.jpg",
      status: "approved",
      source: "mock",
    },
    {
      id: "sample-3",
      title: "Rustic Lanterns",
      service: "Decoration",
      eventType: "Ramadan",
      category: "Lanterns",
      priceMin: 900,
      priceMax: 1500,
      image: "../images/decoration/ramadan/ramadanDecorationLanterns.jpg",
      status: "approved",
      source: "mock",
    },
  ];
  const decorationEvents = {
    wedding: {
      eventType: "Wedding",
      elements: [
        { title: "Floral Stage & Backdrop", image: "../images/decoration/wedding/weddingStage/decorationWeddingStage.jpg" },
        { title: "Bride & Groom Seating", image: "../images/decoration/wedding/weddingSeating/decoorationWeddingSeating.jpg" },
        { title: "Guest Tables", image: "../images/decoration/wedding/WeddingGuestTable/decoorationWeddingTable.jpg" },
        { title: "Chairs & Chair Covers", image: "../images/decoration/wedding/weddingChairs/decoorationWeddingChair.jpg" },
        { title: "Floral & Entry Stands", image: "../images/decoration/wedding/weddingEntryStand/decoorationWeddingStand.jpg" },
        { title: "Cake / Dessert Table", image: "../images/decoration/wedding/weddingDessertTable/decoorationWeddingDessert.jpg" },
      ],
    },
    birthday: {
      eventType: "Birthday",
      elements: [
        { title: "Main Backdrop & Name Sign", image: "../images/decoration/birthday/decorationBirthdayBackdrop.jpg" },
        { title: "Cake Table", image: "../images/decoration/birthday/decorationBirthdayCake.jpg" },
        { title: "Balloon Stands / Arches", image: "../images/decoration/birthday/decorationBirthdayballoons.jpg" },
        { title: "Kids / Guests Tables & Chairs", image: "../images/decoration/birthday/decorationBirthdayTable.jpg" },
        { title: "Centerpieces", image: "../images/decoration/birthday/decorationBirthdayCenterPieces.jpg" },
        { title: "Themed Props & Photo Corner", image: "../images/decoration/birthday/decorationBirthdayThemedprops.jpg" },
      ],
    },
    graduation: {
      eventType: "Graduation",
      elements: [
        { title: "Stage / Certificate Area", image: "../images/decoration/graduation/decorationgraduationStage.jpg" },
        { title: "Grad Photo Wall / Backdrop", image: "../images/decoration/graduation/decorationgraduationBackground.jpg" },
        { title: "Cake & Dessert Table", image: "../images/decoration/graduation/decorationgraduationDessert.jpg" },
        { title: "Guest Tables & Centerpieces", image: "../images/decoration/graduation/decorationgraduationGuest.jpg" },
        { title: "Themed Props", image: "../images/decoration/graduation/decorationgraduationThemedprops.png" },
      ],
    },
    gender: {
      eventType: "Gender Reveal",
      elements: [
        { title: "Main Reveal Area", image: "../images/decoration/GenderReveal/decorationGenderRevealMainArea.jpg" },
        { title: "Backdrop & Balloon Setup", image: "../images/decoration/GenderReveal/decorationGenderRevealBalloons.jpg" },
        { title: "Cake & Dessert Table", image: "../images/decoration/GenderReveal/decorationGenderRevealDessert.jpg" },
        { title: 'Tables & Centerpieces', image: "../images/decoration/GenderReveal/decorationGenderRevealCenterpiece.jpg" },
        { title: '"He or She?" Props & Details', image: "../images/decoration/GenderReveal/decorationGenderRevealProps.jpg" },
      ],
    },
    ramadan: {
      eventType: "Ramadan",
      elements: [
        { title: "Floor Seating / Low Tables", image: "../images/decoration/Ramadan/ramadanDecoraionSeating.jpg" },
        { title: "Lanterns & Candles", image: "../images/decoration/Ramadan/ramadanDecorationLanterns.jpg" },
        { title: "Dates & Dessert Corner", image: "../images/decoration/Ramadan/ramadanDecorationDates.jpg" },
        { title: "Ramadan Backdrop", image: "../images/decoration/Ramadan/decorationRamadanBackdrops.jpg" },
        { title: "Centerpieces", image: "../images/decoration/Ramadan/ramadanDecorationCenterpiece.jpg" },
        { title: "Buffet Setup", image: "../images/decoration/Ramadan/decorationRamadanBuffet.jpg" },
      ],
    },
    madeef: {
      eventType: "Madeef Ashouraii",
      elements: [
        { title: "Welcome & Reception", image: "../images/decoration/moharam/decorationMaharam.jpg" },
        { title: "Low Seating & Textiles", image: "../images/decoration/moharam/decorationMaharam.jpg" },
        { title: "Buffet & Platters", image: "../images/decoration/moharam/decorationMaharam.jpg" },
      ],
    },
  };

  const store = {
    data: load(),
    events: [],
    save() {},
    set(items) {
      this.data.items = (items || []).map(withClientKey);
    },
  };

  let editItemId = null;
  let itemModal;
  let itemForm;
  let itemHeader;
  let itemSubmitBtn;
  let imagePreview;
  let imagePreviewImg;
  let imagePreviewCaption;
  let imagePreviewPrev;
  let imagePreviewNext;
  let previewItems = [];
  let previewIndex = -1;
  const isValidObjectId = (val) => typeof val === "string" && /^[a-fA-F0-9]{24}$/.test(val);
  const allowedItemFields = ["title", "service", "eventType", "category", "priceMin", "priceMax", "image", "description", "status", "source", "clientKey"];
  const slugifyValue = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, "and")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const findItemById = (id) => store.data.items.find((i) => (i._id || i.id) === id);

  const getStoredRole = () => {
    const storedRole = localStorage.getItem("role");
    const user = localStorage.getItem("user");
    const parsed = user ? JSON.parse(user) : null;
    return storedRole || (parsed && parsed.role) || "";
  };

  const canModifyCatalog = () => {
    const page = document.body.dataset.page || "";
    return getStoredRole() === "admin" || page === "my-items";
  };
  const isMyItemsPage = () => (document.body.dataset.page || "") === "my-items";

  const sanitizeItemData = (item = {}) => {
    const cleaned = {};
    allowedItemFields.forEach((field) => {
      if (typeof item[field] !== "undefined" && item[field] !== null) {
        cleaned[field] = item[field];
      }
    });
    return cleaned;
  };

  const getAuthHeaders = (headers = {}) => {
    const token = localStorage.getItem("token");
    const base = { ...headers };
    if (token) base.Authorization = `Bearer ${token}`;
    if (!base["Content-Type"]) base["Content-Type"] = "application/json";
    return base;
  };

  async function apiFetch(url, options = {}) {
    const res = await fetch(url, { ...options, headers: getAuthHeaders(options.headers) });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json() : await res.text();
    if (!res.ok) {
      const message = data?.error || data?.message || res.statusText || "Request failed";
      throw new Error(message);
    }
    return data;
  }

  async function syncPlannerItems() {
    try {
      const data = await apiFetch("/api/v1/planner/items");
      const apiItems = (data.data || []).map(withClientKey);
      const clientItems = (await populateFromClientData(true)).map(withClientKey);
      const merged = mergeItems(clientItems, apiItems);
      const base = merged.length ? merged : clientItems;
      const visible = base.filter((i) => (i.status || "").toLowerCase() !== "deleted");
      const hydrated = await hydrateVenueItems(visible);
      store.set(hydrated);
    } catch (e) {
      console.warn("Could not load planner items from API:", e.message);
      const clientItems = (await populateFromClientData(true)).map(withClientKey);
      const merged = mergeItems(clientItems, store.data.items || []);
      const base = merged.length ? merged : clientItems;
      const visible = base.filter((i) => (i.status || "").toLowerCase() !== "deleted");
      const hydrated = await hydrateVenueItems(visible);
      store.set(hydrated);
    }
  }

  async function syncPlannerEvents() {
    try {
      const data = await apiFetch("/api/v1/events/mine");
      store.events = Array.isArray(data.data) ? data.data : [];
    } catch (e) {
      console.warn("Could not load planner events from API:", e.message);
      store.events = [];
    }
  }

  const getSearchInput = () =>
    document.getElementById("catalogSearch") || document.getElementById("searchTop") || document.getElementById("search");

  document.addEventListener("DOMContentLoaded", () => {
    initPlanner();
  });

  async function initPlanner() {
    roleGuard();
    wireNav();
    initAddModal();
    initImagePreview();
    updateEventFilterState();
    await syncPlannerItems();
    await syncPlannerEvents();
    updateCategoryOptions();
    if (document.body.dataset.page === "catalog" || document.body.dataset.page === "my-items") renderCatalog();
    if (document.body.dataset.page === "dashboard") renderDashboard();
  }

  function roleGuard() {
    const role = getStoredRole();
    if (role !== "planner" && role !== "admin") {
      window.location.href = "../login.html";
    }
  }

  function load() {
    return { items: [] };
  }

  function initImagePreview() {
    if (imagePreview) return;
    imagePreview = document.createElement("div");
    imagePreview.className = "image-preview";
    imagePreview.innerHTML = `
      <div class="image-preview__content">
        <button type="button" class="image-preview__nav prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="image-preview__close" aria-label="Close preview">&times;</button>
        <img src="" alt="Preview" />
        <div class="image-preview__caption"></div>
        <button type="button" class="image-preview__nav next" aria-label="Next image"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
    `;
    document.body.appendChild(imagePreview);
    imagePreviewImg = imagePreview.querySelector("img");
    imagePreviewCaption = imagePreview.querySelector(".image-preview__caption");
    imagePreviewPrev = imagePreview.querySelector(".image-preview__nav.prev");
    imagePreviewNext = imagePreview.querySelector(".image-preview__nav.next");
    const closeBtn = imagePreview.querySelector(".image-preview__close");
    const close = () => imagePreview.classList.remove("open");
    closeBtn.addEventListener("click", close);
    imagePreview.addEventListener("click", (e) => {
      if (e.target === imagePreview) close();
    });
    imagePreviewPrev.addEventListener("click", () => stepPreview(-1));
    imagePreviewNext.addEventListener("click", () => stepPreview(1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && imagePreview.classList.contains("open")) {
        close();
      }
      if (imagePreview.classList.contains("open")) {
        if (e.key === "ArrowLeft") stepPreview(-1);
        if (e.key === "ArrowRight") stepPreview(1);
      }
    });
  }

  function updateEventFilterState() {
    const serviceSelect = document.getElementById("filterService");
    const eventSelect = document.getElementById("filterEvent");
    if (!eventSelect) return;
    const ignoreEventFilter = (serviceSelect?.value || "").toLowerCase() === "catering";
    if (ignoreEventFilter) {
      eventSelect.value = "all";
      eventSelect.disabled = true;
      eventSelect.classList.add("filter-disabled");
    } else {
      eventSelect.disabled = false;
      eventSelect.classList.remove("filter-disabled");
    }
  }

  function renderPreview() {
    const item = previewItems[previewIndex];
    if (!item) return;
    imagePreviewImg.src = item.image || "";
    imagePreviewImg.alt = item.title || "Preview";
    imagePreviewCaption.textContent = item.title || "";
    imagePreview.classList.add("open");
    updatePreviewNav();
  }

  function stepPreview(delta) {
    if (!previewItems.length) return;
    previewIndex = (previewIndex + delta + previewItems.length) % previewItems.length;
    renderPreview();
  }

  function updatePreviewNav() {
    if (!imagePreviewPrev || !imagePreviewNext) return;
    const hasMultiple = previewItems.length > 1;
    imagePreviewPrev.style.display = hasMultiple ? "flex" : "none";
    imagePreviewNext.style.display = hasMultiple ? "flex" : "none";
  }

  function openImagePreviewById(id) {
    if (!previewItems.length) return;
    const idx = previewItems.findIndex((i) => (i._id || i.id) === id);
    previewIndex = idx >= 0 ? idx : 0;
    initImagePreview();
    renderPreview();
  }

  async function populateFromClientData(returnOnly = false) {
    const items = [];
    try {
      items.push(...(await mapInvitations()));
      items.push(...mapDecorations());
      items.push(...(await mapVenues()));
      items.push(...mapCatering());
      items.push(...mapPhotographers());
      items.push(...mapDjLighting());
    } catch (e) {
      console.warn("Could not load client data, using mock planner items.", e);
      if (!items.length) items.push(...mockItems);
    }
    if (!returnOnly && items.length) store.set(items);
    return items;
  }

  async function mapInvitations() {
    const res = await fetch("../data/invitations.json");
    const data = await res.json();
    return (data || []).map((inv, idx) =>
      withClientKey({
        id: `inv-${idx}`,
        title: inv.name?.replace(/\.[^/.]+$/, "") || "Invitation",
        service: "Invitation Cards",
        eventType: capitalize(inv.event || "Event"),
        category: inv.style ? capitalize(inv.style) : "",
        priceMin: Number(inv.salePrice || inv.price || 0),
        priceMax: Number(inv.price || inv.salePrice || 0) || Number(inv.salePrice || inv.price || 0),
        image: "../" + inv.image,
        status: "approved",
        source: "client",
      }),
    );
  }

  function mapDecorations() {
    const items = [];
    const library = window.DecorationLibrary || {};
    Object.entries(decorationEvents).forEach(([key, config]) => {
      const { eventType, elements } = config;
      const sourceElements = (library[key]?.elements?.length && library[key].elements) || elements || [];
      sourceElements.forEach((el, idx) => {
        const images = getImageList(el);
        images.forEach((img, imgIdx) => {
          const imagePath = normalizePlannerImagePath(img, el.image);
          if (!imagePath) return;
          const priceValue = parsePriceValue(typeof img === "object" ? img.price : null);
          const priceMin = priceValue || 800;
          const priceMax = priceValue || 2200;
          const title = images.length > 1 ? `${el.title} #${imgIdx + 1}` : el.title;
          items.push(
            withClientKey({
              id: `dec-${key}-${idx}${images.length > 1 ? `-${imgIdx}` : ""}`,
              title,
              service: "Decoration",
              eventType,
              category: el.title,
              priceMin,
              priceMax,
              image: imagePath,
              status: "approved",
              source: "client",
            }),
          );
        });
      });
    });
    return items;
  }

  function mergeItems(clientItems = [], apiItems = []) {
    const map = new Map();
    const upsert = (item, fromApi = false) => {
      if (!item) return;
      const keyed = withClientKey(item);
      const key = keyed.clientKey || buildItemKey(keyed);
      if (!key.trim()) return;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...keyed });
        return;
      }
      if (fromApi) {
        // Prefer server-approved data (includes _id) when available
        map.set(key, { ...existing, ...keyed });
      }
    };

    clientItems.forEach((i) => upsert(i, false));
    apiItems.forEach((i) => upsert(i, true));

    // Add any API items that truly don't match client keys
    apiItems.forEach((i) => {
      const keyed = withClientKey(i);
      const key = keyed.clientKey || buildItemKey(keyed);
      if (!map.has(key)) map.set(key, { ...keyed });
    });

    return Array.from(map.values());
  }

  function mapCatering() {
    const houses = [
      {
        id: "aljawad",
        name: "Al Jawad Restaurant",
        area: "Ghobeiry - Airport Road",
        image: "../images/catering/aljawad/aljawadCatering.png",
      },
      {
        id: "cremino",
        name: "Cremino Patisserie",
        area: "Haret Hreik",
        image: "../images/catering/cremino/creminoPatisserie.jpeg",
      },
      {
        id: "tastybees",
        name: "Tasty Bees",
        area: "Bir El Abed",
        image: "../images/catering/tastyBees/tastybeesCatering.jpeg",
      },
      {
        id: "alsultan",
        name: "Al Sultan Sweets",
        area: "Multiple branches",
        image: "../images/catering/alsultan/alsultanCatering.jpeg",
      },
      {
        id: "alsharek",
        name: "Al Shareq Sweets",
        area: "Haret Hreik",
        image: "../images/catering/alshareq/alshareq.png",
      },
      {
        id: "albohsali",
        name: "Al Bohsali 1870",
        area: "Downtown Beirut",
        image: "../images/catering/albohsali/albohsali.png",
      },
      {
        id: "daze",
        name: "Daze Sweets",
        area: "Beirut",
        image: "../images/catering/daze/daze.jpeg",
      },
      {
        id: "albaba",
        name: "Al Baba Sweets",
        area: "Khalde / Airport corridor",
        image: "../images/catering/albaba/albaba.png",
      },
      {
        id: "alabdallah",
        name: "Alabdallah Restaurant",
        area: "Beirut",
        image: "../images/catering/alabdalla/alabdullahRest.png",
      },
    ];
    return houses.map((h, idx) => ({
      id: `cater-${h.id || idx}`,
      title: h.name,
      service: "Catering",
      eventType: "Wedding",
      category: h.area || "Catering",
      priceMin: 600,
      priceMax: 1800,
      image: h.image,
      status: "approved",
      source: "client",
    })).map(withClientKey);
  }

  function mapPhotographers() {
    const shooters = [
      { id: "alyhadi", title: "Aly Hadi Photography", image: "../images/photographers/alyhadi.jpg", category: "Editorial" },
      { id: "farahnoon", title: "Farah Noon Photography", image: "../images/photographers/farahnoon.jpg", category: "Fine Art" },
      { id: "leila", title: "Leila Nasserdine", image: "../images/photographers/leila.jpg", category: "Romantic" },
      { id: "nada", title: "Studio Nada", image: "../images/photographers/nada.jpg", category: "Studio" },
      { id: "zahraa", title: "Zahraa Khafaja", image: "../images/photographers/zahraa.jpg", category: "Lifestyle" },
      { id: "zena", title: "Zena Nassereddine", image: "../images/photographers/zena.jpg", category: "Documentary" },
    ];
    return shooters.map((s) => ({
      id: `photo-${s.id}`,
      title: s.title,
      service: "Photographer",
      eventType: "Wedding",
      category: s.category,
      priceMin: 800,
      priceMax: 2200,
      image: s.image,
      status: "approved",
      source: "client",
    })).map(withClientKey);
  }

  function mapDjLighting() {
    return [
      {
        id: "dj-1",
        title: "DJ & Lighting Package",
        service: "DJ & Lighting",
        eventType: "Wedding",
        category: "Lighting",
        priceMin: 700,
        priceMax: 1600,
        image: "../images/services/dj.jpeg",
        status: "approved",
        source: "client",
      },
    ].map(withClientKey);
  }

  async function mapVenues() {
    const loadJson = async (path) => {
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return await res.json();
      } catch (e) {
        console.warn(`Could not load ${path}`, e);
        return [];
      }
    };

    const [oreblanc, venueDetails] = await Promise.all([loadJson("../data/oreblanc-venues.json"), loadJson("../data/venue-details.json")]);

    const merged = new Map();
    const toSlug = (value, fallback) => {
      if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
      if (fallback) return fallback.toString().trim().toLowerCase().replace(/\s+/g, "-");
      return "";
    };
    const placeholderImages = ["venue2 (2).jpeg", "venue3.jpeg", "venue4.jpeg"];
    const imageOverrides = {
      "royal-castle": "https://oreblanc.com/wp-content/uploads/2022/09/Royal.jpg",
      "san-stephano-resort": "https://oreblanc.com/wp-content/uploads/2022/09/San-Stephano.jpg",
      "sawary-resort": "https://oreblanc.com/wp-content/uploads/2022/09/Sawary.jpg",
      "blue-valley": "https://oreblanc.com/wp-content/uploads/2017/10/16998231_1376435632431952_2300310323215425046_n.jpg",
      "the-history": "https://oreblanc.com/wp-content/uploads/2022/09/The-history.jpg",
      "the-villa": "https://oreblanc.com/wp-content/uploads/2022/09/The-villa.jpg",
      "jardin-d-aphrodite": "../images/venues/Tanit Venue1.jpg",
      "waves-aqua-park-and-resort": "../images/venues/Batroun Village Club1.jpg",
      "the-legend": "../images/venues/Domaine De Zekrit1.jpg",
    };
    const extractPrices = (priceRange) => {
      const priceDigits = (priceRange || "").match(/[\d,.]+/g) || [];
      const numericMin = priceDigits[0] ? parsePriceValue(priceDigits[0]) : 0;
      const numericMax = priceDigits[1] ? parsePriceValue(priceDigits[1]) : numericMin;
      return { priceMin: Number.isFinite(numericMin) ? numericMin : 0, priceMax: Number.isFinite(numericMax) ? numericMax : numericMin };
    };
    const deriveCategory = (venue) =>
      venue?.location || venue?.region || venue?.priceTier || venue?.highlights?.[0] || venue?.type || "Venue";
    const deriveImage = (venue, slugKey) => {
      const override = imageOverrides[slugKey];
      if (override) return normalizePlannerImagePath(override, override);
      const primary = venue?.heroImage || venue?.gallery?.[0] || venue?.images?.[0];
      const normalized = normalizePlannerImagePath(primary, primary);
      const isPlaceholder = placeholderImages.some((ph) => (normalized || "").includes(ph));
      if (isPlaceholder && slugKey && imageOverrides[slugKey]) return normalizePlannerImagePath(imageOverrides[slugKey], imageOverrides[slugKey]);
      if (isPlaceholder) return "../images/venues/venue4.jpeg";
      return normalized || "../images/venues/venue4.jpeg";
    };
    const upsert = (venue, idx, sourceLabel) => {
      if (!venue) return;
      const slug = toSlug(venue.slug, `${sourceLabel}-${idx}`);
      const prices = extractPrices(venue.priceRange);
      const item = withClientKey({
        id: `venue-${slug || idx}`,
        clientKey: slug || undefined,
        title: venue.title || "Venue",
        service: "Venue",
        eventType: venue.region || venue.type || venue.eventType || "Venue",
        category: deriveCategory(venue),
        priceMin: prices.priceMin,
        priceMax: prices.priceMax,
        image: deriveImage(venue, slug),
        status: "approved",
        source: "client",
        description: [venue.summary || venue.description || "", venue.capacity || ""].filter(Boolean).join(" "),
      });
      const key = item.clientKey || buildItemKey(item);
      merged.set(key, item);
    };

    (Array.isArray(venueDetails) ? venueDetails : []).forEach((v, idx) => upsert(v, idx, "detail"));
    (Array.isArray(oreblanc) ? oreblanc : []).forEach((v, idx) => upsert(v, idx, "ore"));

    return Array.from(merged.values());
  }

  const venueDatasetCache = { data: null, promise: null };

  async function loadVenueDataset() {
    if (venueDatasetCache.data) return venueDatasetCache.data;
    if (!venueDatasetCache.promise) {
      venueDatasetCache.promise = fetch("../data/venue-details.json")
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);
    }
    const data = await venueDatasetCache.promise;
    venueDatasetCache.data = Array.isArray(data) ? data : [];
    return venueDatasetCache.data;
  }

  async function hydrateVenueItems(items = []) {
    const venues = await loadVenueDataset();
    if (!venues.length) return items;

    const index = new Map();
    venues.forEach((venue) => {
      const slug = slugifyValue(venue.slug || venue.title || "");
      if (slug) index.set(slug, venue);
    });

    const findVenue = (item) => {
      const candidates = [
        item.clientKey,
        item.slug,
        item.title,
        (item.category || "").replace(/\(.*?\)/g, "").trim(),
      ]
        .filter(Boolean)
        .map((c) => slugifyValue(c));
      for (const slug of candidates) {
        if (index.has(slug)) return index.get(slug);
      }
      return null;
    };

    return items.map((item) => {
      if ((item.service || "").toLowerCase() !== "venue") return item;
      const venue = findVenue(item);
      if (!venue) return item;

      const primary = venue.heroImage || (Array.isArray(venue.gallery) && venue.gallery[0]) || "";
      const normalizedImage = normalizePlannerImagePath(primary, primary);
      const prices = pricesFromLabel(venue.priceRange);

      return {
        ...item,
        clientKey: item.clientKey || slugifyValue(venue.slug || venue.title || ""),
        image:
          !item.image || item.image.includes("venue4.jpeg") || item.image.includes("venue3.jpeg")
            ? normalizedImage || item.image
            : item.image,
        priceMin: item.priceMin && item.priceMin > 0 ? item.priceMin : prices.priceMin,
        priceMax: item.priceMax && item.priceMax > 0 ? item.priceMax : prices.priceMax || item.priceMin || prices.priceMin,
        category: item.category || venue.location || venue.region || "Venue",
        description: item.description || venue.summary || venue.description || "",
      };
    });
  }

  function wireNav() {
    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === document.body.dataset.page) link.classList.add("active");
    });
    const search = getSearchInput();
    if (search) {
      search.addEventListener("input", renderCatalog);
    }
    const toggle = document.getElementById("navToggle");
    if (toggle) toggle.addEventListener("click", () => document.body.classList.toggle("nav-open"));

    ["filterService", "filterEvent", "filterCategory"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => {
        if (id === "filterService" || id === "filterEvent") {
          updateEventFilterState();
          updateCategoryOptions();
        }
        renderCatalog();
      });
    });
  }

  /* Dashboard */
  function renderDashboard() {
    const summaryGrid = document.getElementById("summaryGrid");
    if (!summaryGrid) return;

    const pendingCount = store.data.items.filter((i) => i.status === "pending").length;
    const data = buildDashboardData(pendingCount, store.events || []);

    setText("statActive", data.activeEvents);
    setText("statAwaiting", data.awaitingReply);
    setText("statPending", data.pendingApprovals);
    setText("statMessages", data.unreadMessages);
    setText("quickPending", data.pendingApprovals);
    setText("quickMessages", data.unreadMessages);

    setMetric("metricCompletionValue", `${data.completionRate}%`, "metricCompletionTrend", data.completionTrend);
    setMetric("metricResponseValue", data.responseTime, "metricResponseTrend", data.responseTrend);

    renderUpcoming(data.upcoming);
    renderActivity(data.activity);
    renderWorkflow(data.workflowStage);
  }

  function buildDashboardData(pendingCount, events = []) {
    const items = store.data.items || [];
    const totalItems = items.length;
    const approvedItems = items.filter((i) => (i.status || "").toLowerCase() === "approved").length;
    const awaitingItems = items.filter((i) => (i.status || "").toLowerCase() === "pending").length;

    const activeEvents = events.length;
    const awaitingReply = events.filter((e) => (e.status || "").includes("pending")).length;

    const completionRate = totalItems ? Math.round((approvedItems / totalItems) * 100) : 0;

    return {
      activeEvents,
      awaitingReply,
      pendingApprovals: pendingCount,
      unreadMessages: 0,
      completionRate,
      completionTrend: 0,
            responseTime: activeEvents ? `${Math.max(1, Math.min(24, awaitingReply * 2 || 2))}h` : "0h",
      responseTrend: 0,
      workflowStage: deriveWorkflowStage(approvedItems, awaitingItems, totalItems),
      upcoming: deriveUpcomingEvents(events),
      activity: deriveActivity(items),
    };
  }

  function renderUpcoming(events = []) {
    const list = document.getElementById("upcomingList");
    if (!list) return;
    const statusLabel = {
      chat: "In Chat",
      assigned: "Assigned",
      waiting: "Waiting",
    };
    if (!events.length) {
      list.innerHTML = `<div class="empty">No events scheduled in the next 7 days.</div>`;
      return;
    }
    list.innerHTML = events
      .map(
        (ev) => `
      <div class="upcoming-item">
        <div class="upcoming-date">${ev.day}</div>
        <div class="upcoming-meta">
          <strong>${ev.title} - ${ev.subtitle}</strong>
          <p class="muted small"><i class="fa-solid fa-location-dot"></i> ${ev.location} &nbsp; ${ev.code}</p>
        </div>
        <span class="status-pill ${ev.status}">${statusLabel[ev.status] || ev.status}</span>
      </div>
    `,
      )
      .join("");
  }

  function renderActivity(items = []) {
    const list = document.getElementById("activityList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `<div class="empty">No recent activity yet.</div>`;
      return;
    }
    list.innerHTML = items
      .map(
        (item) => `
      <div class="activity-row">
        <div class="activity-icon ${item.tone || ""}"><i class="fa-solid ${item.icon}"></i></div>
        <div>
          <strong>${item.title}</strong>
          <p class="muted small">${item.detail}</p>
        </div>
      </div>
    `,
      )
      .join("");
  }

  function renderWorkflow(stageIndex = 0) {
    const track = document.getElementById("workflowTrack");
    if (!track) return;
    const totalSteps = 5;
    const steps = Array.from({ length: totalSteps });
    track.innerHTML = steps
      .map((_, idx) => `<div class="workflow-step ${idx <= stageIndex ? "fill" : ""}"></div>`)
      .join("");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setMetric(valueId, value, trendId, trend) {
    setText(valueId, value);
    const trendEl = document.getElementById(trendId);
    if (trendEl) {
      const numeric = Number(trend);
      trendEl.textContent = Number.isFinite(numeric) ? `${numeric > 0 ? "+" : ""}${numeric}%` : "0%";
      trendEl.classList.remove("up", "down");
      trendEl.classList.add(numeric >= 0 ? "up" : "down");
    }
  }

  async function submitChangeRequest(action, itemId, itemData, clientKey) {
    const body = {
      action,
      itemId: itemId || undefined,
      clientKey,
      itemData,
    };
    return apiFetch("/api/v1/planner/item-requests", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  function deriveUpcomingEvents(events) {
    if (!Array.isArray(events) || !events.length) return [];
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);

    const filtered = events
      .filter((ev) => {
        if (!ev.date) return false;
        const d = new Date(ev.date);
        return d >= now && d <= inSevenDays;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    return filtered.map((ev) => {
      const d = new Date(ev.date);
      const day = String(d.getDate()).padStart(2, "0");
      const status = normalizeStatus(ev.status);
      const statusTag = status === "pending_assignment" || status === "pending" ? "waiting" : status === "assigned" ? "assigned" : "chat";
      return {
        day,
        title: ev.type || "Event",
        subtitle: ev.theme || ev.location || ev.status || "",
        location: ev.location || "TBD",
        code: (ev._id || "").toString().slice(-6).toUpperCase(),
        status: statusTag,
      };
    });
  }

  function deriveActivity(items) {
    if (!items.length) return [];
    return items
      .slice(-4)
      .reverse()
      .map((item) => {
        const status = normalizeStatus(item.status);
        const icon = status === "approved" ? "fa-circle-check" : status === "pending" ? "fa-clock" : "fa-pen";
        const tone = status === "approved" ? "green" : status === "pending" ? "amber" : "blue";
        return {
          title: `${capitalize(status || "Updated")}: ${item.title || "Item"}`,
          detail: `${item.service || "Service"} · ${item.eventType || "Event"}`,
          icon,
          tone,
        };
      });
  }

  function deriveWorkflowStage(approved, pending, total) {
    if (!total) return 0;
    const ratioApproved = approved / total;
    if (ratioApproved > 0.7) return 4;
    if (ratioApproved > 0.45) return 3;
    if (pending / total > 0.4) return 1;
    return 2;
  }

  function normalizeStatus(status = "") {
    return status.toLowerCase();
  }

  /* Catalog */
  function renderCatalog() {
    const grid = document.getElementById("itemGrid");
    if (!grid) return;
    const service = document.getElementById("filterService").value;
    const eventType = document.getElementById("filterEvent").value;
    const ignoreEventFilter = (service || "").toLowerCase() === "catering";
    const category = document.getElementById("filterCategory").value;
    const search = (getSearchInput()?.value || "").toLowerCase();

    const filtered = store.data.items.filter((item) => {
      if (isMyItemsPage() && (item.source || "").toLowerCase() === "client") return false;
      const status = (item.status || "").toLowerCase();
      if (status === "deleted") return false;
      if (service && service !== "all" && (item.service || "").toLowerCase() !== service.toLowerCase()) return false;
      if (!ignoreEventFilter && eventType && eventType !== "all" && (item.eventType || "").toLowerCase() !== eventType.toLowerCase())
        return false;
      if (category && category !== "all") {
        const icat = (item.category || "").toLowerCase();
        if (!icat || icat !== category.toLowerCase()) return false;
      }
      if (search) {
        const hay = `${item.title} ${item.service} ${item.eventType} ${item.category}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    grid.innerHTML = "";
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty">No items found with current filters.</div>`;
      return;
    }

    previewItems = filtered;

    const showActions = canModifyCatalog();

    filtered.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card catalog-card";
      const status = (item.status || "").toLowerCase();
      const statusLabel = capitalize(status || "Pending");
      const categoryChip = item.category || item.service || "";
      const itemId = item._id || item.id;
      card.dataset.image = item.image || "";
      card.dataset.title = item.title || "";
      card.dataset.itemId = itemId;
      const actions = showActions
        ? `<div class="card-actions">
            <button class="link-btn" data-edit="${itemId}"><i class="fa-solid fa-pen"></i>Edit</button>
            <button class="link-btn danger" data-delete="${itemId}"><i class="fa-solid fa-trash"></i>Delete</button>
          </div>`
        : "";
      card.innerHTML = `
        <div class="card-media">
          <img src="${item.image}" alt="${item.title}">
          ${categoryChip ? `<span class="chip">${categoryChip}</span>` : ""}
        </div>
        <div class="card-body">
          <div>
            <h4>${item.title}</h4>
            <p class="muted small">${item.service} / ${item.eventType}${item.category ? " / " + item.category : ""}</p>
          </div>
          <p class="price">${formatPrice(item)}</p>
          ${actions}
          <div class="status-row">
            <span class="pill ${status}">${statusLabel}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);

      card.addEventListener("click", (e) => {
        if (e.target.closest(".card-actions") || e.target.closest(".link-btn")) return;
        openImagePreviewById(card.dataset.itemId);
      });
    });

    if (showActions) {
      grid.querySelectorAll("[data-delete]").forEach((btn) =>
        btn.addEventListener("click", () => markPending(btn.dataset.delete, "delete")),
      );
      grid.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => startEdit(btn.dataset.edit)));
    }
  }

  function setFormMode(mode) {
    if (!itemForm) return;
    itemForm.dataset.mode = mode;
    if (itemHeader) itemHeader.textContent = mode === "edit" ? "Edit Item" : "Add New Item";
    if (itemSubmitBtn) itemSubmitBtn.textContent = mode === "edit" ? "Submit for approval" : "Add Item";
  }

  function resetFormState() {
    editItemId = null;
    setFormMode("add");
    if (itemForm) {
      delete itemForm.dataset.clientKey;
      delete itemForm.dataset.source;
    }
    itemForm?.reset();
  }

  function startEdit(id) {
    if (!canModifyCatalog()) {
      alert("Only admin can edit catalog items.");
      return;
    }
    if (!itemModal || !itemForm) return;
    const item = store.data.items.find((i) => (i._id || i.id) === id);
    if (!item) return;
    populateCategoryDatalist();
    editItemId = id;
    itemForm.dataset.clientKey = item.clientKey || buildItemKey(item);
    itemForm.dataset.source = item.source || "";
    setFormMode("edit");
    document.getElementById("addTitle").value = item.title || "";
    document.getElementById("addService").value = item.service || "";
    document.getElementById("addEvent").value = item.eventType || "";
    document.getElementById("addCategory").value = item.category || "";
    document.getElementById("addPriceMin").value = item.priceMin || "";
    document.getElementById("addPriceMax").value = item.priceMax || "";
    document.getElementById("addImage").value = item.image || "";
    document.getElementById("addDescription").value = item.description || "";
    itemModal.classList.add("open");
  }

  async function markPending(id, type) {
    if (!canModifyCatalog()) {
      alert("Only admin can delete catalog items.");
      return;
    }
    if (type !== "delete") return;
    const item = findItemById(id);
    if (!item) return;
    const key = item.clientKey || buildItemKey(item);
    const itemId = isValidObjectId(item._id || id) ? item._id || id : null;
    const payload = sanitizeItemData({ ...item, clientKey: key, source: item.source || "client" });
    try {
      await submitChangeRequest("delete", itemId, payload, key);
      await syncPlannerItems();
      renderCatalog();
      alert("Delete submitted for admin approval.");
    } catch (e) {
      alert(e.message || "Unable to submit delete request.");
    }
  }

  function initAddModal() {
    itemModal = document.getElementById("addItemModal");
    if (!itemModal) return;
    itemForm = document.getElementById("addItemForm");
    itemHeader = itemModal.querySelector(".modal-header h3");
    itemSubmitBtn = itemForm?.querySelector('button[type="submit"]');
    const imageInput = document.getElementById("addImage");
    const openBtn = document.querySelector(".add-btn");
    const closeBtn = document.getElementById("addModalClose");
    const cancelBtn = document.getElementById("addModalCancel");

    const close = () => {
      itemModal.classList.remove("open");
      resetFormState();
    };
    const open = () => {
      resetFormState();
      populateCategoryDatalist();
      itemModal.classList.add("open");
    };

    setFormMode("add");
    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    cancelBtn?.addEventListener("click", close);
    itemModal.addEventListener("click", (e) => {
      if (e.target === itemModal) close();
    });

    attachImageDropTarget(imageInput);

    itemForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("addTitle")?.value?.trim();
      const service = document.getElementById("addService")?.value || "";
      const eventType = document.getElementById("addEvent")?.value || "";
      const category = document.getElementById("addCategory")?.value?.trim() || "";
      const priceMin = Number(document.getElementById("addPriceMin")?.value || 0);
      const priceMax = Number(document.getElementById("addPriceMax")?.value || priceMin);
      const image = document.getElementById("addImage")?.value?.trim() || "../images/logo.png";
      const description = document.getElementById("addDescription")?.value?.trim() || "";

      if (!title || !service || !eventType) {
        alert("Please fill required fields.");
        return;
      }

      const payload = {
        title,
        service,
        eventType,
        category,
        priceMin: Number.isFinite(priceMin) ? priceMin : 0,
        priceMax: Number.isFinite(priceMax) ? priceMax : priceMin,
        image,
        description,
      };

      try {
        const targetItem = editItemId ? findItemById(editItemId) : null;
        const mode = itemForm.dataset.mode;
        const baseKey = itemForm.dataset.clientKey || targetItem?.clientKey || buildItemKey(payload);
        const source = targetItem?.source || payload.source || "manual";
        const preparedPayload = sanitizeItemData({ ...payload, clientKey: baseKey, source });

        if (mode === "edit" && editItemId) {
          const itemId = isValidObjectId(editItemId) ? editItemId : null;
          await submitChangeRequest("update", itemId, preparedPayload, baseKey);
          alert("Edit submitted for admin approval.");
        } else {
          const createKey = baseKey || buildItemKey(payload);
          await submitChangeRequest("create", null, { ...preparedPayload, clientKey: createKey }, createKey);
          alert("Item submitted for admin approval.");
        }
        await syncPlannerItems();
        updateCategoryOptions();
        renderCatalog();
        itemForm.reset();
        close();
      } catch (err) {
        alert(err.message || "Could not save item.");
      }
    });

  }

  function populateCategoryDatalist() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;
    const categories = Array.from(
      new Set(store.data.items.filter((i) => (i.status || "").toLowerCase() !== "deleted").map((i) => i.category).filter(Boolean)),
    ).sort();
    categoryList.innerHTML = categories.map((c) => `<option value="${c}"></option>`).join("");
  }

  function attachImageDropTarget(input) {
    if (!input) return;
    const onDragOver = (e) => {
      e.preventDefault();
      input.classList.add("dragging");
    };
    const clearDrag = () => input.classList.remove("dragging");
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          input.value = reader.result || "";
          clearDrag();
        };
        reader.readAsDataURL(file);
        return;
      }
      const text = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text");
      if (text) input.value = text;
      clearDrag();
    };

    input.addEventListener("dragover", onDragOver);
    input.addEventListener("dragenter", onDragOver);
    input.addEventListener("dragleave", clearDrag);
    input.addEventListener("drop", handleDrop);
  }

  function getImageList(el = {}) {
    if (Array.isArray(el.images) && el.images.length) return el.images;
    if (el.image) return [el.image];
    if (el.heroImage) return [el.heroImage];
    return [];
  }

  function normalizePlannerImagePath(raw, fallback) {
    const src = (typeof raw === "object" && raw !== null ? raw.src : raw) || fallback;
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("../")) return src;
    if (src.startsWith("/")) return ".." + src;
    return src.startsWith("images/") ? "../" + src : "../" + src.replace(/^\.\//, "");
  }

  function parsePriceValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (!value) return 0;
    const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function pricesFromLabel(label) {
    const digits = String(label || "").match(/[\d,.]+/g) || [];
    const min = parsePriceValue(digits[0]);
    const max = parsePriceValue(digits[1] || digits[0]);
    const priceMin = Number.isFinite(min) && min > 0 ? min : 0;
    const priceMax = Number.isFinite(max) && max > 0 ? max : priceMin;
    return { priceMin, priceMax };
  }

  function capitalize(str) {
    if (!str) return "";
    return str
      .toString()
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  function formatPrice(item) {
    const min = Number(item.priceMin || 0);
    const max = Number(item.priceMax || min);
    if (min === max) return `$${min.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }

  function updateCategoryOptions() {
    const categorySelect = document.getElementById("filterCategory");
    const service = document.getElementById("filterService")?.value || "all";
    const eventType = document.getElementById("filterEvent")?.value || "all";
    const ignoreEventFilter = (service || "").toLowerCase() === "catering";
    if (!categorySelect) return;

    const categories = store.data.items
      .filter((i) => {
        if (isMyItemsPage() && (i.source || "").toLowerCase() === "client") return false;
        if ((i.status || "").toLowerCase() === "deleted") return false;
        if (service !== "all" && i.service !== service) return false;
        if (!ignoreEventFilter && eventType !== "all" && i.eventType !== eventType) return false;
        return true;
      })
      .map((i) => i.category)
      .filter(Boolean);

    const unique = Array.from(new Set(categories)).sort();
    const current = categorySelect.value || "all";
    categorySelect.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All";
    categorySelect.appendChild(all);
    unique.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
    categorySelect.value = unique.includes(current) ? current : "all";
  }
})();

