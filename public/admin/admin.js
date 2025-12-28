(function () {
  const page = document.body.dataset.page;
  const API_BASE = window.location.origin + "/api/v1";
  const getToken =
    (window.PlanityAPI && window.PlanityAPI.getToken) ||
    (() => {
      try {
        return localStorage.getItem("token");
      } catch (_) {
        return null;
      }
    });
  const apiFetch =
    (window.PlanityAPI && window.PlanityAPI.apiFetch) ||
    (async (path, options = {}) => {
      const headers = options.headers ? { ...options.headers } : {};
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
      const res = await fetch(API_BASE + path, { ...options, headers });
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return json;
    });

  const defaults = {
    stats: { activeEvents: 0, pendingAssignment: 0, inProgress: 0, approvals: 0, overdue: 0 },
    requests: [],
    planners: [],
    events: [],
    catalog: [],
    approvals: [],
    payments: { revenue: 0, pending: 0, contracts: 0, entries: [] },
    notifications: []
  };

  let data = { ...defaults };
  let catalogFiltersBound = false;

  const fmtMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
  const uniqueList = (list = []) => Array.from(new Set(list.filter(Boolean).map((v) => v.toString().trim()))).sort((a, b) => a.localeCompare(b));
  const fmtDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };
  const fmtMonthYear = (value) => {
    if (!value) return "--";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  const fmtRangePrice = (item = {}) => {
    const num = (v) => {
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };
    const min = num(item.priceMin ?? item.price);
    const max = num(item.priceMax ?? item.price);
    if (min !== null && max !== null && min !== max) return `${fmtMoney(min)} - ${fmtMoney(max)}`;
    if (min !== null) return fmtMoney(min);
    if (max !== null) return fmtMoney(max);
    return "Price on request";
  };
  const fmtPerson = (person) => {
    if (!person) return "";
    if (typeof person === "string") return person;
    return person.name || person.email || "";
  };
  const stripAutoNote = (text = "") => {
    if (!text) return "";
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((line) => {
        const lower = line.toLowerCase();
        return !lower.startsWith("client:") && !lower.startsWith("email:") && !lower.startsWith("phone:") && !lower.startsWith("designation:") && !lower.startsWith("requested status:") && !lower.startsWith("client images:");
      })
      .join("\n");
  };
  const getFavoritesList = (req) => {
    if (Array.isArray(req.favorites)) return req.favorites;
    if (Array.isArray(req.favoritesSnapshot)) return req.favoritesSnapshot.map((f) => f.name || f.title || f.category || "").filter(Boolean);
    return [];
  };
  const fallbackServices = ["Venue", "Decoration", "Catering", "Invitation Cards", "Photographer", "DJ & Lighting"];
  const fallbackEvents = ["Wedding", "Birthday", "Graduation", "Ramadan", "Gender Reveal", "Engagement", "Madeef Ashouraii"];
  const emptyState = (text) => `<div class="empty">${text}</div>`;
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const setCatalogMessage = (message) => {
    const el = document.getElementById("catalogTable");
    if (el) el.innerHTML = emptyState(message);
  };
  const requireAdmin = async () => {
    const me = await apiFetch("/auth/me");
    if (!me?.user || me.user.role !== "admin") {
      const err = new Error("Admin access required");
      err.status = 403;
      throw err;
    }
    return me.user;
  };
  const showAccessError = (message) => {
    ["eventsTable", "plannerGrid", "requestsTable", "catalogTable"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = emptyState(message);
    });
  };
  const withClientKey = (item = {}) => ({ ...item, clientKey: item.clientKey || buildCatalogKey(item) });
  const buildCatalogKey = (item = {}) => {
    const parts = [
      (item.clientKey || "").toString().trim().toLowerCase(),
      (item.title || item.name || "").toString().trim().toLowerCase(),
      (item.service || "").toString().trim().toLowerCase(),
      (item.eventType || item.event || "").toString().trim().toLowerCase(),
      (item.category || "").toString().trim().toLowerCase(),
      (item.image || "").toString().trim().toLowerCase()
    ].filter(Boolean);
    if (parts.length) return parts.join("|");
    if (item._id || item.id) return (item._id || item.id).toString().trim().toLowerCase();
    return "";
  };
  const capitalizeWords = (value = "") =>
    value
      .toString()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const parsePriceValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (!value) return 0;
    const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const normalizePlannerImagePath = (raw, fallback) => {
    const src = (typeof raw === "object" && raw !== null ? raw.src : raw) || fallback;
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("../")) return src;
    if (src.startsWith("/")) return ".." + src;
    return src.startsWith("images/") ? "../" + src : "../" + src.replace(/^\.\//, "");
  };
  const getImageList = (el = {}) => {
    if (Array.isArray(el.images) && el.images.length) return el.images;
    if (el.image) return [el.image];
    if (el.heroImage) return [el.heroImage];
    return [];
  };
  const loadVenueDataset = (() => {
    const cache = { data: null, promise: null };
    return async () => {
      if (cache.data) return cache.data;
      if (!cache.promise) {
        cache.promise = fetch("../data/venue-details.json")
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []);
      }
      const data = await cache.promise;
      cache.data = Array.isArray(data) ? data : [];
      return cache.data;
    };
  })();
  const hydrateVenueItems = async (items = []) => {
    const venues = await loadVenueDataset();
    if (!venues.length) return items;
    const index = new Map();
    venues.forEach((venue) => {
      const slug = (venue.slug || venue.title || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (slug) index.set(slug, venue);
    });
    const slugify = (val = "") =>
      val
        .toString()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const pricesFromLabel = (label) => {
      const digits = String(label || "").match(/[\d,.]+/g) || [];
      const min = parsePriceValue(digits[0]);
      const max = parsePriceValue(digits[1] || digits[0]);
      return { priceMin: min || 0, priceMax: max || min || 0 };
    };
    const findVenue = (item) => {
      const candidates = [
        item.clientKey,
        item.slug,
        item.title,
        (item.category || "").replace(/\(.*?\)/g, "").trim()
      ]
        .filter(Boolean)
        .map((c) => slugify(c));
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
        clientKey: item.clientKey || slugify(venue.slug || venue.title || ""),
        image: !item.image || item.image.includes("venue4.jpeg") ? normalizedImage || item.image : item.image,
        priceMin: item.priceMin && item.priceMin > 0 ? item.priceMin : prices.priceMin,
        priceMax: item.priceMax && item.priceMax > 0 ? item.priceMax : prices.priceMax || item.priceMin || prices.priceMin,
        category: item.category || venue.location || venue.region || "Venue",
        description: item.description || venue.summary || venue.description || ""
      };
    });
  };
  const decorationEvents = {
    wedding: {
      eventType: "Wedding",
      elements: [
        { title: "Floral Stage & Backdrop", image: "../images/decoration/wedding/weddingStage/decorationWeddingStage.jpg" },
        { title: "Bride & Groom Seating", image: "../images/decoration/wedding/weddingSeating/decoorationWeddingSeating.jpg" },
        { title: "Guest Tables", image: "../images/decoration/wedding/WeddingGuestTable/decoorationWeddingTable.jpg" },
        { title: "Chairs & Chair Covers", image: "../images/decoration/wedding/weddingChairs/decoorationWeddingChair.jpg" },
        { title: "Floral & Entry Stands", image: "../images/decoration/wedding/weddingEntryStand/decoorationWeddingStand.jpg" },
        { title: "Cake / Dessert Table", image: "../images/decoration/wedding/weddingDessertTable/decoorationWeddingDessert.jpg" }
      ]
    },
    birthday: {
      eventType: "Birthday",
      elements: [
        { title: "Main Backdrop & Name Sign", image: "../images/decoration/birthday/decorationBirthdayBackdrop.jpg" },
        { title: "Cake Table", image: "../images/decoration/birthday/decorationBirthdayCake.jpg" },
        { title: "Balloon Stands / Arches", image: "../images/decoration/birthday/decorationBirthdayballoons.jpg" },
        { title: "Kids / Guests Tables & Chairs", image: "../images/decoration/birthday/decorationBirthdayTable.jpg" },
        { title: "Centerpieces", image: "../images/decoration/birthday/decorationBirthdayCenterPieces.jpg" },
        { title: "Themed Props & Photo Corner", image: "../images/decoration/birthday/decorationBirthdayThemedprops.jpg" }
      ]
    },
    graduation: {
      eventType: "Graduation",
      elements: [
        { title: "Stage / Certificate Area", image: "../images/decoration/graduation/decorationgraduationStage.jpg" },
        { title: "Grad Photo Wall / Backdrop", image: "../images/decoration/graduation/decorationgraduationBackground.jpg" },
        { title: "Cake & Dessert Table", image: "../images/decoration/graduation/decorationgraduationDessert.jpg" },
        { title: "Guest Tables & Centerpieces", image: "../images/decoration/graduation/decorationgraduationGuest.jpg" },
        { title: "Themed Props", image: "../images/decoration/graduation/decorationgraduationThemedprops.png" }
      ]
    },
    gender: {
      eventType: "Gender Reveal",
      elements: [
        { title: "Main Reveal Area", image: "../images/decoration/GenderReveal/decorationGenderRevealMainArea.jpg" },
        { title: "Backdrop & Balloon Setup", image: "../images/decoration/GenderReveal/decorationGenderRevealBalloons.jpg" },
        { title: "Cake & Dessert Table", image: "../images/decoration/GenderReveal/decorationGenderRevealDessert.jpg" },
        { title: "Tables & Centerpieces", image: "../images/decoration/GenderReveal/decorationGenderRevealCenterpiece.jpg" },
        { title: '"He or She?" Props & Details', image: "../images/decoration/GenderReveal/decorationGenderRevealProps.jpg" }
      ]
    },
    ramadan: {
      eventType: "Ramadan",
      elements: [
        { title: "Floor Seating / Low Tables", image: "../images/decoration/Ramadan/ramadanDecoraionSeating.jpg" },
        { title: "Lanterns & Candles", image: "../images/decoration/Ramadan/ramadanDecorationLanterns.jpg" },
        { title: "Dates & Dessert Corner", image: "../images/decoration/Ramadan/ramadanDecorationDates.jpg" },
        { title: "Ramadan Backdrop", image: "../images/decoration/Ramadan/decorationRamadanBackdrops.jpg" },
        { title: "Centerpieces", image: "../images/decoration/Ramadan/ramadanDecorationCenterpiece.jpg" },
        { title: "Buffet Setup", image: "../images/decoration/Ramadan/decorationRamadanBuffet.jpg" }
      ]
    },
    madeef: {
      eventType: "Madeef Ashouraii",
      elements: [
        { title: "Welcome & Reception", image: "../images/decoration/moharam/decorationMaharam.jpg" },
        { title: "Low Seating & Textiles", image: "../images/decoration/moharam/decorationMaharam.jpg" },
        { title: "Buffet & Platters", image: "../images/decoration/moharam/decorationMaharam.jpg" }
      ]
    }
  };
  const mapInvitations = async () => {
    try {
      const res = await fetch("../data/invitations.json");
      const data = await res.json();
      return (data || []).map((inv, idx) => ({
        id: `inv-${idx}`,
        title: inv.name?.replace(/\.[^/.]+$/, "") || "Invitation",
        service: "Invitation Cards",
        eventType: capitalizeWords(inv.event || "Event"),
        category: inv.style ? capitalizeWords(inv.style) : "",
        priceMin: Number(inv.salePrice || inv.price || 0),
        priceMax: Number(inv.price || inv.salePrice || 0) || Number(inv.salePrice || inv.price || 0),
        image: "../" + inv.image,
        status: "approved",
        source: "client"
      }));
    } catch (err) {
      console.warn("Could not load invitations catalog", err);
      return [];
    }
  };
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
      source: "mock"
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
      source: "mock"
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
      source: "mock"
    }
  ];
  const mapDecorations = () => {
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
          items.push({
            id: `dec-${key}-${idx}${images.length > 1 ? `-${imgIdx}` : ""}`,
            title,
            service: "Decoration",
            eventType,
            category: el.title,
            priceMin,
            priceMax,
            image: imagePath,
            status: "approved",
            source: "client"
          });
        });
      });
    });
    return items;
  };
  const mapCatering = () => {
    const houses = [
      {
        id: "aljawad",
        name: "Al Jawad Restaurant",
        area: "Ghobeiry - Airport Road",
        image: "../images/catering/aljawad/aljawadCatering.png"
      },
      {
        id: "cremino",
        name: "Cremino Patisserie",
        area: "Haret Hreik",
        image: "../images/catering/cremino/creminoPatisserie.jpeg"
      },
      {
        id: "tastybees",
        name: "Tasty Bees",
        area: "Bir El Abed",
        image: "../images/catering/tastyBees/tastybeesCatering.jpeg"
      },
      {
        id: "alsultan",
        name: "Al Sultan Sweets",
        area: "Multiple branches",
        image: "../images/catering/alsultan/alsultanCatering.jpeg"
      },
      {
        id: "alsharek",
        name: "Al Shareq Sweets",
        area: "Haret Hreik",
        image: "../images/catering/alshareq/alshareq.png"
      },
      {
        id: "albohsali",
        name: "Al Bohsali 1870",
        area: "Downtown Beirut",
        image: "../images/catering/albohsali/albohsali.png"
      },
      {
        id: "daze",
        name: "Daze Sweets",
        area: "Beirut",
        image: "../images/catering/daze/daze.jpeg"
      },
      {
        id: "albaba",
        name: "Al Baba Sweets",
        area: "Khalde / Airport corridor",
        image: "../images/catering/albaba/albaba.png"
      },
      {
        id: "alabdallah",
        name: "Alabdallah Restaurant",
        area: "Beirut",
        image: "../images/catering/alabdalla/alabdullahRest.png"
      }
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
      source: "client"
    }));
  };
  const mapPhotographers = () =>
    [
      { id: "alyhadi", title: "Aly Hadi Photography", image: "../images/photographers/alyhadi.jpg", category: "Editorial" },
      { id: "farahnoon", title: "Farah Noon Photography", image: "../images/photographers/farahnoon.jpg", category: "Fine Art" },
      { id: "leila", title: "Leila Nasserdine", image: "../images/photographers/leila.jpg", category: "Romantic" },
      { id: "nada", title: "Studio Nada", image: "../images/photographers/nada.jpg", category: "Studio" },
      { id: "zahraa", title: "Zahraa Khafaja", image: "../images/photographers/zahraa.jpg", category: "Lifestyle" },
      { id: "zena", title: "Zena Nassereddine", image: "../images/photographers/zena.jpg", category: "Documentary" }
    ].map((s) => ({
      id: `photo-${s.id}`,
      title: s.title,
      service: "Photographer",
      eventType: "Wedding",
      category: s.category,
      priceMin: 800,
      priceMax: 2200,
      image: s.image,
      status: "approved",
      source: "client"
    }));
  const mapDjLighting = () => [
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
      source: "client"
    }
  ];
  const mapVenues = async () => {
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
      "the-legend": "../images/venues/Domaine De Zekrit1.jpg"
    };
    const extractPrices = (priceRange) => {
      const priceDigits = (priceRange || "").match(/[\d,.]+/g) || [];
      const numericMin = priceDigits[0] ? parsePriceValue(priceDigits[0]) : 0;
      const numericMax = priceDigits[1] ? parsePriceValue(priceDigits[1]) : numericMin;
      return { priceMin: Number.isFinite(numericMin) ? numericMin : 0, priceMax: Number.isFinite(numericMax) ? numericMax : numericMin };
    };
    const deriveCategory = (venue) => venue?.location || venue?.region || venue?.priceTier || venue?.highlights?.[0] || venue?.type || "Venue";
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
      const item = {
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
        description: [venue.summary || venue.description || "", venue.capacity || ""].filter(Boolean).join(" ")
      };
      const key = item.clientKey || buildCatalogKey(item);
      if (!merged.has(key)) merged.set(key, item);
    };

    (Array.isArray(venueDetails) ? venueDetails : []).forEach((v, idx) => upsert(v, idx, "detail"));
    (Array.isArray(oreblanc) ? oreblanc : []).forEach((v, idx) => upsert(v, idx, "ore"));

    return Array.from(merged.values());
  };
  const clientCatalogCache = { data: null, promise: null };
  const loadClientCatalog = async () => {
    if (clientCatalogCache.data) return clientCatalogCache.data;
    if (!clientCatalogCache.promise) {
      clientCatalogCache.promise = (async () => {
        const items = [];
        try {
          items.push(...(await mapInvitations()));
        } catch (err) {
          console.warn("Invitation mapping failed", err);
        }
        try {
          items.push(...mapDecorations());
        } catch (err) {
          console.warn("Decoration mapping failed", err);
        }
        try {
          items.push(...(await mapVenues()));
        } catch (err) {
          console.warn("Venue mapping failed", err);
        }
        try {
          items.push(...mapCatering());
        } catch (err) {
          console.warn("Catering mapping failed", err);
        }
        try {
          items.push(...mapPhotographers());
        } catch (err) {
          console.warn("Photographer mapping failed", err);
        }
        try {
          items.push(...mapDjLighting());
        } catch (err) {
          console.warn("DJ & lighting mapping failed", err);
        }
        const hydrated = await hydrateVenueItems(items.map(withClientKey));
        const unique = new Map();
        hydrated.forEach((item) => {
          const key = buildCatalogKey(item);
          if (key && !unique.has(key)) unique.set(key, item);
        });
        return Array.from(unique.values());
      })().catch((err) => {
        console.warn("Could not load client catalog data", err);
        return [];
      });
    }
    const loaded = await clientCatalogCache.promise;
    clientCatalogCache.data = loaded;
    return loaded;
  };
  const fetchCatalog = async (preferAuth = true) => {
    const merged = new Map();
    const addList = (list = []) => {
      list.forEach((item) => {
        if (!item) return;
        const key = buildCatalogKey(item);
        if (!key) return;
        if (!merged.has(key)) merged.set(key, item);
      });
    };

    if (preferAuth && typeof apiFetch === "function") {
      try {
        const res = await apiFetch("/planner/items");
        addList(normalizeCatalog(res?.data || []));
      } catch (err) {
        console.warn("Auth catalog fetch failed, will try public", err);
      }
    }

    try {
      const res = await fetch(API_BASE + "/public/planner-items");
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `Catalog request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      addList(normalizeCatalog(json?.data || []));
    } catch (err) {
      console.error("Public catalog fetch failed", err);
    }

    try {
      const clientItems = await loadClientCatalog();
      if (clientItems?.length) addList(normalizeCatalog(clientItems));
      else addList(normalizeCatalog(mockItems.map(withClientKey)));
    } catch (err) {
      console.warn("Client catalog load failed", err);
      addList(normalizeCatalog(mockItems.map(withClientKey)));
    }

    if (!merged.size) throw new Error("No catalog data available");

    return Array.from(merged.values());
  };

  const statusBadge = (status) => {
    const normalized = (status || "").toLowerCase();
    if (["submitted", "pending_assignment"].includes(normalized)) return '<span class="pill warn">Submitted</span>';
    if (["in chat", "assigned", "planning"].includes(normalized)) return '<span class="pill soft">In Chat</span>';
    if (normalized === "confirmed") return '<span class="pill success">Confirmed</span>';
    if (normalized === "pending") return '<span class="pill warn">Pending</span>';
    if (normalized === "signed") return '<span class="pill success">Signed</span>';
    if (normalized === "unsigned") return '<span class="pill warn">Not Signed</span>';
    if (normalized === "paid") return '<span class="pill success">Paid</span>';
    if (normalized === "completed") return '<span class="pill success">Completed</span>';
    if (normalized === "overdue") return '<span class="pill danger">Overdue</span>';
    return `<span class="pill soft">${status || "Status"}</span>`;
  };

  const priorityBadge = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return '<span class="priority-badge high">High</span>';
    if (p === "medium") return '<span class="priority-badge medium">Medium</span>';
    return '<span class="priority-badge low">Low</span>';
  };

  const getPendingRequests = () => {
    if (Array.isArray(data.requests) && data.requests.length) return data.requests;
    const events = Array.isArray(data.events) ? data.events : [];
    return events.filter((ev) => {
      const status = (ev.rawStatus || ev.status || "").toString().toLowerCase();
      return ["pending_assignment", "pending", "submitted"].includes(status);
    });
  };

  const hydrateNav = () => {
    const pendingRequests = getPendingRequests();
    const navCounts = {
      requests: pendingRequests.length,
      assignment: pendingRequests.length,
      events: data.events.length,
      planners: data.planners.length,
      catalog: data.catalog.length,
      approvals: data.approvals.length,
      payments: data.payments.entries.length,
      notifications: data.notifications.length
    };

    document.querySelectorAll(".admin-nav a").forEach((link) => {
      const nav = link.dataset.nav;
      if (nav === page) link.classList.add("active");
      const badge = link.querySelector(".nav-count");
      if (badge) {
        const key = badge.dataset.countFor || nav;
        const value = navCounts[key];
        if (typeof value === "number") badge.textContent = value;
        else badge.style.display = "none";
      }
    });
  };

  const renderDashboard = () => {
    const { stats, requests, approvals, events } = data;
    setText("statActive", stats.activeEvents);
    setText("statPendingAssign", stats.pendingAssignment);
    setText("statInProgress", stats.inProgress);
    setText("statApprovals", stats.approvals);
    setText("statOverdue", stats.overdue);

    const attentionList = document.getElementById("dashboardAttention");
    if (attentionList) {
      const overdueEvents = events.filter((ev) => (ev.status || "").toLowerCase() === "overdue");
      const items = [
        ...requests.slice(0, 2).map((req) => ({
          title: `Assign planner for ${fmtPerson(req.client)}`,
          meta: `${req.type} · ${fmtDate(req.date)}`,
          tag: "Assignment"
        })),
        ...approvals.slice(0, 2).map((ap) => ({
          title: `${ap.type} request: ${ap.item}`,
          meta: `${ap.planner} · ${fmtDate(ap.date)}`,
          tag: "Approval"
        })),
        ...overdueEvents.map((ev) => ({
          title: `Overdue follow-up: ${fmtPerson(ev.client)}`,
          meta: `${ev.type} · ${fmtDate(ev.date)}`,
          tag: "Overdue"
        }))
      ].slice(0, 4);

      attentionList.innerHTML =
        items
          .map(
            (item) => `
          <div class="notification-item">
            <div class="action-links">
              <span class="tag">${item.tag}</span>
              <span class="muted small">${item.meta}</span>
            </div>
            <strong>${item.title}</strong>
          </div>
        `
          )
          .join("") || emptyState("Nothing critical right now.");
    }

    const reqList = document.getElementById("dashboardRequests");
    if (reqList) {
      if (!requests.length) {
        reqList.innerHTML = emptyState("No new requests.");
        return;
      }
      reqList.innerHTML = requests
        .slice(0, 3)
        .map(
          (req) => `
          <div class="assign-card">
            <div class="panel-head">
              <div>
                <strong>${fmtPerson(req.client)}</strong>
                <p class="muted small">${req.type} · ${fmtDate(req.date)}</p>
              </div>
              ${priorityBadge(req.priority)}
            </div>
            <div class="action-links">
              <span class="tag"><i class="fa-solid fa-location-dot"></i> ${req.location}</span>
              <span class="tag"><i class="fa-solid fa-coins"></i> ${fmtMoney(req.budget)}</span>
              <span class="request-note"><i class="fa-solid fa-star"></i> ${getFavoritesList(req).slice(0, 2).join(", ")}</span>
            </div>
            <div class="action-links" style="margin-top:8px;">
              <a class="link-btn" href="assignment.html">Assign planner</a>
              <a class="link-btn" href="event-requests.html">Review request</a>
            </div>
          </div>
        `
        )
        .join("");
    }
  };

  const renderRequests = () => {
    const container = document.getElementById("requestsTable");
    const count = document.getElementById("requestsCount");
    const sourceList = data.requests.length ? data.requests : data.events;
    if (count) count.textContent = `${sourceList.length} requests`;
    if (!container) return;
    if (!sourceList.length) {
      container.innerHTML = emptyState("No event requests yet.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Event</th>
              <th>Date</th>
              <th>Location</th>
              <th>Budget</th>
              <th>Favorites</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Submission</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sourceList
              .map((req) => {
                const status = req.status || req.rawStatus || "Submitted";
                return `
              <tr>
                <td>
                  <strong>${fmtPerson(req.client)}</strong>
                  <div class="muted small">${req.client?.email || req.email || ""}</div>
                </td>
                <td>${req.type}</td>
                <td>${fmtDate(req.date)}</td>
                <td>${req.location}</td>
                <td>${fmtMoney(req.budget)}</td>
                <td>
                  ${getFavoritesList(req)
                    .slice(0, 2)
                    .map((fav) => `<span class="tag">${fav}</span>`)
                    .join(" ")}
                </td>
                <td>${fmtDate(req.createdAt || req.submitted)}</td>
                <td>${statusBadge(status)}</td>
                <td>
                  ${
                    (() => {
                      const sub = req.clientSubmission || {};
                      const pieces = [];
                      if (sub.requestedStatus) pieces.push(`Status: ${sub.requestedStatus}`);
                      if (sub.phone) pieces.push(`Phone: ${sub.phone}`);
                      if (sub.designation) pieces.push(`Role: ${sub.designation}`);
                      if (Array.isArray(sub.uploads) && sub.uploads.length) pieces.push(`${sub.uploads.length} upload${sub.uploads.length > 1 ? "s" : ""}`);
                      return pieces.join("<br/>") || "—";
                    })()
                  }
                </td>
                <td>${priorityBadge(req.priority)}</td>
                <td>
                  <div class="action-links">
                    <a class="link-btn" href="assignment.html"><i class="fa-solid fa-user-plus"></i> Assign</a>
                    <span class="request-note"><i class="fa-solid fa-note-sticky"></i> ${stripAutoNote(req.note || req.notes || "")}</span>
                  </div>
                </td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderAssignment = () => {
    const list = document.getElementById("assignmentList");
    const workload = document.getElementById("plannerWorkload");
    const queueCount = document.querySelector("[data-assignment-count]");
    const getInitials = (name = "") => {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "PL";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    };
    const pendingRequests = getPendingRequests();
    const activePlanners = data.planners.filter((p) => p.isActive !== false && !p.deletedAt);
    if (queueCount) {
      const count = pendingRequests.length || 0;
      queueCount.textContent = count ? `${count} waiting` : "No pending";
    }
    if (list) {
      const plannerOptions = activePlanners
        .map((p) => `<option value="${p._id || p.id}">${p.name} (${p.email})</option>`)
        .join("");
      if (!pendingRequests.length) {
        list.innerHTML = emptyState("Nothing to assign right now.");
      } else {
        list.innerHTML = pendingRequests
          .map((req) => {
            const priority = (req.priority || "").toString().toLowerCase();
            const priorityKey = priority.includes("high") ? "high" : priority.includes("medium") ? "medium" : priority.includes("low") ? "low" : "";
            const priorityClass = priorityKey ? `priority-${priorityKey}` : "";
            const submittedAt = req.createdAt || req.submitted || req.submittedAt;
            const submittedLabel = submittedAt ? `Submitted ${fmtDate(submittedAt)}` : "Submitted recently";
            const favorites = getFavoritesList(req).slice(0, 3);
            const client = req.client || {};
            const submission = req.clientSubmission || {};
            const displayName = fmtPerson(client) || submission.name || "Client";
            const email = client.email || submission.email;
            const phone = client.phone || submission.phone;
            const contactLine = [email, phone]
              .filter(Boolean)
              .filter((value, index, arr) => arr.indexOf(value) === index && value !== displayName)
              .join(" | ");
            const detailItems = [
              { icon: "fa-calendar", label: fmtDate(req.date) },
              { icon: "fa-location-dot", label: req.location || "Location TBD" },
              { icon: "fa-dollar-sign", label: req.budget ? fmtMoney(req.budget) : "Budget TBD" }
            ];
            if (req.guests) detailItems.push({ icon: "fa-users", label: `${req.guests} guests` });
            if (req.theme) detailItems.push({ icon: "fa-palette", label: req.theme });
            if (submission.requestedStatus) detailItems.push({ icon: "fa-flag", label: submission.requestedStatus });
            if (submission.designation) detailItems.push({ icon: "fa-id-card", label: submission.designation });
            const detailsMarkup = detailItems
              .map((item) => `<div class="assign-details-item"><i class="fa-solid ${item.icon}"></i> ${item.label}</div>`)
              .join("");
            const note = stripAutoNote(req.note || req.notes || "");
            return `
        <div class="assign-card ${priorityClass}" data-req="${req._id || req.id}">
          <div class="assign-card-head">
            <div class="assign-card-title">
              <div class="assign-card-icon"><i class="fa-solid fa-user"></i></div>
              <div>
                <h3>${displayName}</h3>
                ${contactLine ? `<div class="muted small">${contactLine}</div>` : ""}
                <div class="assign-card-tags">
                  <span class="assign-chip">${req.type || "Event"}</span>
                  ${priorityBadge(req.priority)}
                </div>
              </div>
            </div>
          </div>
          <div class="assign-details">
            ${detailsMarkup}
          </div>
          <div class="assign-tag-list">
            ${
              favorites.length
                ? favorites.map((fav) => `<span class="assign-tag">${fav}</span>`).join("")
                : `<span class="assign-tag">No favorites yet</span>`
            }
          </div>
          <div class="assign-footer">
            <div class="muted small"><i class="fa-solid fa-clock"></i> ${submittedLabel}</div>
            <div class="assign-actions">
              <label class="assign-select">
                <span>Planner</span>
                <select class="select" aria-label="Choose planner">
                  <option value="">Select planner</option>
                  ${plannerOptions}
                </select>
              </label>
              <button class="btn btn-assign" data-assign>Assign</button>
              <a class="link-btn" href="events-monitoring.html"><i class="fa-solid fa-arrow-up-right-from-square"></i> View</a>
            </div>
          </div>
          ${note ? `<p class="request-note"><i class="fa-solid fa-sticky-note"></i> ${note}</p>` : ""}
        </div>
      `;
          })
          .join("");
      }

      if (!list.dataset.assignBound) {
        list.dataset.assignBound = "1";
        list.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-assign]");
          if (!btn) return;
          const card = btn.closest("[data-req]");
          const select = card?.querySelector("select");
          const eventId = card?.dataset.req;
          const plannerId = select?.value;
          if (!plannerId) {
            alert("Select a planner first.");
            return;
          }
          const planner = data.planners.find((p) => (p.id || p._id || "").toString() === plannerId);
          btn.disabled = true;
          btn.textContent = "Assigning...";
          if (typeof apiFetch !== "function") {
            btn.textContent = "Assign";
            btn.disabled = false;
            alert("API not available.");
            return;
          }
          apiFetch(`/admin/events/${eventId}/assign`, {
            method: "POST",
            body: JSON.stringify({ plannerId })
          })
            .then(() => {
              btn.textContent = planner ? `Assigned to ${planner.name}` : "Assigned";
              btn.classList.add("pill", "success");
              loadData();
            })
            .catch((err) => {
              btn.textContent = "Assign";
              btn.disabled = false;
              alert(err?.message || "Assignment failed");
            });
        });
      }
    }

    if (workload) {
      workload.innerHTML =
        activePlanners
          .map((p) => {
            const plannerName = p.name || p.email || "Planner";
            const rawLoad = p.workload ?? p.activeEvents ?? 0;
            const percent = Math.min(rawLoad <= 5 ? rawLoad * 20 : rawLoad, 100);
            return `
          <div class="assignment-planner-card">
            <div class="assignment-planner-head">
              <div class="assignment-avatar">${getInitials(plannerName)}</div>
              <div>
                <strong>${plannerName}</strong>
                <div class="assignment-planner-meta">
                  <span>${p.activeEvents || 0} active</span>
                  <span>${p.completed || 0} completed</span>
                </div>
              </div>
            </div>
            ${p.specialty ? `<div class="muted small">${p.specialty}</div>` : ""}
            <div class="assignment-workload">
              <div class="assignment-workload-label">
                <span>Workload</span>
                <span>${Math.round(percent)}%</span>
              </div>
              <div class="workload-bar">
                <div class="workload-fill" style="width:${percent}%"></div>
              </div>
            </div>
          </div>
        `;
          })
          .join("") || emptyState("No planners available.");
    }
  };

  const renderEvents = () => {
    const container = document.getElementById("eventsTable");
    const count = document.getElementById("eventsCount");
    if (count) count.textContent = `${data.events.length} events tracked`;
    if (!container) return;
    if (!data.events.length) {
      container.innerHTML = emptyState("No events to display.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Event</th>
              <th>Date</th>
              <th>Location</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Planner</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.events
              .map((ev) => {
                const plannerName = fmtPerson(ev.planner);
                const plannerLabel = plannerName || "Unassigned";
                const hasPlanner = Boolean(plannerName);
                const assignLabel = hasPlanner ? "Assigned" : "Assign";
                const assignIcon = hasPlanner ? "fa-user-check" : "fa-user-plus";
                const assignTitle = hasPlanner ? `Assigned to ${plannerName}` : "Assign planner";
                const eventId = ev._id || ev.id;
                const assignMarkup = hasPlanner
                  ? `<span class="link-btn is-disabled" aria-disabled="true"><i class="fa-solid ${assignIcon}"></i> ${assignLabel}</span>`
                  : `<a class="link-btn" href="event-assign.html?eventId=${eventId}" title="${assignTitle}"><i class="fa-solid ${assignIcon}"></i> ${assignLabel}</a>`;
                const remindMarkup = hasPlanner
                  ? `<a class="link-btn" href="event-assign.html?eventId=${eventId}" title="Reassign planner"><i class="fa-solid fa-arrows-rotate"></i> Reassign</a>`
                  : `<button class="link-btn" data-remind="${eventId}"><i class="fa-solid fa-bell"></i> Remind</button>`;
                const assignmentActions = hasPlanner ? `<span class="action-group">${assignMarkup}${remindMarkup}</span>` : `${assignMarkup}${remindMarkup}`;
                return `
              <tr>
                <td>
                  <strong>${fmtPerson(ev.client)}</strong>
                  <div class="muted small">${ev.client?.email || ""}</div>
                </td>
                <td>${ev.type}</td>
                <td>${fmtDate(ev.date)}</td>
                <td>${ev.location || ""}</td>
                <td>${fmtMoney(ev.budget)}</td>
                <td>${statusBadge(ev.status)}</td>
                <td>${plannerLabel}</td>
                <td>${fmtDate(ev.deadline || ev.lastActivityAt)}</td>
                <td>
                  <div class="action-links inline-actions">
                    <a class="link-btn" href="../admin-event.html?eventId=${eventId}"><i class="fa-solid fa-eye"></i> View</a>
                    ${assignmentActions}
                  </div>
                </td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remind]");
      if (!btn) return;
      if (typeof apiFetch !== "function") return alert("API not available.");
      const eventId = btn.dataset.remind;
      btn.disabled = true;
      btn.textContent = "Reminding...";
      apiFetch(`/admin/events/${eventId}/remind`, { method: "POST" })
        .then(() => {
          btn.textContent = "Reminded";
          btn.classList.add("pill", "success");
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = "Remind";
          alert(err?.message || "Unable to send reminder.");
        });
    });
  };

  const renderPlanners = () => {
    const grid = document.getElementById("plannerGrid");
    if (!grid) return;
    grid.innerHTML =
      data.planners
        .map((p) => {
          const statusLabel = p.status || (p.isActive ? "Active" : "Inactive");
          const statusClass = p.status === "Active" || p.isActive ? "success" : "warn";
          const joinedLabel = fmtMonthYear(p.joined || p.createdAt);
          const email = p.email || "--";
          const phone = p.phone || "--";
          return `
        <div class="planner-card">
          <div class="planner-card-head">
            <div class="planner-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="planner-card-info">
              <div class="planner-card-title">
                <strong>${p.name || "Planner"}</strong>
                <span class="pill ${statusClass}">${statusLabel}</span>
              </div>
              <div class="planner-card-email">${email}</div>
            </div>
            <details class="planner-card-menu">
              <summary aria-label="Planner actions"><i class="fa-solid fa-ellipsis-vertical"></i></summary>
              <div class="planner-card-menu-list">
                <a class="planner-menu-item" href="assignment.html"><i class="fa-solid fa-user-plus"></i> Assign</a>
                <button class="planner-menu-item primary" type="button" data-planner-edit="${p._id || p.id}">
                  <i class="fa-solid fa-pen"></i> Edit Details
                </button>
                <button class="planner-menu-item danger" type="button" data-planner-toggle="${p._id || p.id}" data-active="${p.isActive ? "1" : "0"}">
                  <i class="fa-solid fa-ban"></i> ${p.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </details>
          </div>
          <div class="planner-card-stats">
            <div class="planner-stat stat-gold">
              <i class="fa-solid fa-briefcase"></i>
              <span class="planner-stat-value">${p.activeEvents || 0}</span>
              <span class="planner-stat-label">Active Events</span>
            </div>
            <div class="planner-stat stat-green">
              <i class="fa-solid fa-circle-check"></i>
              <span class="planner-stat-value">${p.completed || 0}</span>
              <span class="planner-stat-label">Completed</span>
            </div>
            <div class="planner-stat stat-blue">
              <i class="fa-solid fa-calendar"></i>
              <span class="planner-stat-value">${joinedLabel}</span>
              <span class="planner-stat-label">Joined</span>
            </div>
          </div>
          ${p.specialty ? `<div class="planner-card-specialty">${p.specialty}</div>` : ""}
          <div class="planner-card-divider"></div>
          <div class="planner-card-contact">
            <span><i class="fa-solid fa-envelope"></i> ${email}</span>
            <span><i class="fa-solid fa-phone"></i> ${phone}</span>
          </div>
        </div>
      `;
        })
        .join("") || emptyState("No planners found.");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-planner-toggle]");
      const editBtn = e.target.closest("[data-planner-edit]");
      if (!btn && !editBtn) return;
      const menu = e.target.closest("details");
      if (menu) menu.removeAttribute("open");
      if (typeof apiFetch !== "function") {
        alert("API not available.");
        return;
      }
      if (editBtn) {
        const id = editBtn.dataset.plannerEdit;
        const planner = data.planners.find((p) => (p._id || p.id || "").toString() === id);
        openModal(
          "Edit planner",
          [
            { label: "Name", value: planner?.name || "" },
            { label: "Email", value: planner?.email || "" },
            { label: "Phone", value: planner?.phone || "" }
          ],
          async ([name, email, phone], close) => {
            if (!name || !email) return alert("Name and email are required.");
            try {
              await apiFetch(`/admin/planners/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ name, email, phone })
              });
              close();
              loadData();
            } catch (err) {
              alert(err?.message || "Unable to update planner.");
            }
          }
        );
        return;
      }
      const plannerId = btn.dataset.plannerToggle;
      const currentActive = btn.dataset.active === "1";
      btn.disabled = true;
      btn.textContent = currentActive ? "Deactivating..." : "Activating...";
      apiFetch(`/admin/planners/${plannerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive })
      })
        .then(() => loadData())
        .catch((err) => {
          alert(err?.message || "Unable to update planner.");
          btn.disabled = false;
          btn.textContent = currentActive ? "Deactivate" : "Activate";
        });
    });
  };

  const catalogStatusPill = (status = "") => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "approved") return '<span class="pill approved">Approved</span>';
    if (["pending", "submitted", "draft", "review"].includes(normalized)) return '<span class="pill pending">Pending</span>';
    if (["deleted", "inactive", "deactivated"].includes(normalized)) return '<span class="pill rejected">Removed</span>';
    return `<span class="pill soft">${status || "Status"}</span>`;
  };

  const getCatalogFilters = () => {
    const searchInput = document.getElementById("catalogSearch") || document.getElementById("catalogSearchTop");
    const search = (searchInput?.value || "").trim().toLowerCase();
    const service = document.getElementById("catalogService")?.value || "all";
    const eventType = document.getElementById("catalogEvent")?.value || "all";
    const category = document.getElementById("catalogCategory")?.value || "all";
    return { search, service, eventType, category };
  };

  const populateCatalogFilters = () => {
    const serviceSelect = document.getElementById("catalogService");
    const eventSelect = document.getElementById("catalogEvent");
    const categorySelect = document.getElementById("catalogCategory");
    if (!serviceSelect || !eventSelect || !categorySelect) return;

    const current = getCatalogFilters();
    const services = uniqueList(data.catalog.map((c) => c.service || ""));
    serviceSelect.innerHTML = ['<option value="all">All Services</option>', ...services.map((s) => `<option value="${s}">${s}</option>`)].join("");
    serviceSelect.value = services.includes(current.service) ? current.service : "all";
    const serviceValue = serviceSelect.value;

    const events = uniqueList(
      data.catalog.filter((c) => serviceValue === "all" || (c.service || "").toLowerCase() === serviceValue.toLowerCase()).map((c) => c.eventType || "")
    );
    eventSelect.innerHTML = ['<option value="all">All Events</option>', ...events.map((ev) => `<option value="${ev}">${ev}</option>`)].join("");
    eventSelect.value = events.includes(current.eventType) ? current.eventType : "all";
    const eventValue = eventSelect.value;
    const ignoreEventFilter = (serviceValue || "").toLowerCase() === "catering";

    const categories = uniqueList(
      data.catalog
        .filter((c) => {
          if (serviceValue !== "all" && (c.service || "").toLowerCase() !== serviceValue.toLowerCase()) return false;
          if (!ignoreEventFilter && eventValue !== "all" && (c.eventType || "").toLowerCase() !== eventValue.toLowerCase()) return false;
          return true;
        })
        .map((c) => c.category || "")
    );
    categorySelect.innerHTML = ['<option value="all">All Categories</option>', ...categories.map((cat) => `<option value="${cat}">${cat}</option>`)].join("");
    categorySelect.value = categories.includes(current.category) ? current.category : "all";
  };

  const bindCatalogFilters = () => {
    if (catalogFiltersBound) return;
    const search = document.getElementById("catalogSearch");
    const searchTop = document.getElementById("catalogSearchTop");
    const service = document.getElementById("catalogService");
    const eventType = document.getElementById("catalogEvent");
    const category = document.getElementById("catalogCategory");
    const syncSearchInputs = (value) => {
      if (search && search.value !== value) search.value = value;
      if (searchTop && searchTop.value !== value) searchTop.value = value;
    };
    const handleSearch = (e) => {
      syncSearchInputs(e.target.value || "");
      renderCatalog();
    };

    if (search) search.addEventListener("input", handleSearch);
    if (searchTop) searchTop.addEventListener("input", handleSearch);
    [
      { el: service, evt: "change" },
      { el: eventType, evt: "change" },
      { el: category, evt: "change" }
    ].forEach(({ el, evt }) => {
      if (!el) return;
      el.addEventListener(evt, () => renderCatalog());
    });
    catalogFiltersBound = true;
  };

  const renderCatalog = () => {
    const wrap = document.getElementById("catalogTable");
    if (!wrap) return;
    bindCatalogFilters();
    populateCatalogFilters();

    const { search, service, eventType, category } = getCatalogFilters();
    const ignoreEventFilter = (service || "").toLowerCase() === "catering";
    const filtered = data.catalog.filter((item) => {
      const status = (item.status || "").toLowerCase();
      if (status === "deleted") return false;
      if (service !== "all" && (item.service || "").toLowerCase() !== service.toLowerCase()) return false;
      if (!ignoreEventFilter && eventType !== "all" && (item.eventType || "").toLowerCase() !== eventType.toLowerCase()) return false;
      if (category !== "all" && (item.category || "").toLowerCase() !== category.toLowerCase()) return false;
      if (search) {
        const haystack = `${item.title || item.name || ""} ${item.service || ""} ${item.eventType || ""} ${item.category || ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      wrap.innerHTML = emptyState("No items found with current filters.");
      return;
    }

    wrap.innerHTML = `
      <div class="grid catalog-grid" id="catalogGrid">
        ${filtered
          .map((item) => {
            const id = item._id || item.id;
            const title = item.title || item.name || "Catalog item";
            const descriptor = [item.service, item.eventType, item.category].filter(Boolean).join(" / ") || "Catalog item";
            const chip = item.category || item.service || "";
            return `
            <div class="card catalog-card" data-catalog-id="${id}">
              <div class="card-media">
                <img src="${item.image || "../images/logo.original.png"}" alt="${title}">
                ${chip ? `<span class="chip">${chip}</span>` : ""}
              </div>
              <div class="card-body">
                <div>
                  <h4>${title}</h4>
                  <p class="muted small">${descriptor}</p>
                </div>
                <p class="price">${fmtRangePrice(item)}</p>
                <div class="card-actions">
                  <button class="link-btn" data-catalog-edit="${id}"><i class="fa-solid fa-pen"></i> Edit</button>
                  <button class="link-btn danger" data-catalog-deactivate="${id}"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
                <div class="status-row">
                  ${catalogStatusPill(item.status)}
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;

    const addBtn = document.getElementById("catalogAddBtn");
    if (addBtn) {
      addBtn.onclick = () => {
        const opts = (() => {
          const services = uniqueList([...data.catalog.map((c) => c.service || ""), ...fallbackServices]);
          const events = uniqueList([...data.catalog.map((c) => c.eventType || c.event || ""), ...fallbackEvents]);
          const categories = uniqueList(data.catalog.map((c) => c.category || ""));
          const toOptions = (list) => list.map((v) => ({ value: v, label: v }));
          return { services: toOptions(services), events: toOptions(events), categories: toOptions(categories) };
        })();
        openModal(
          "Add catalog item",
          [
            { label: "Title", value: "", placeholder: "Item name" },
            { label: "Service", value: "", type: "select", options: opts.services, placeholder: "Select service" },
            { label: "Event Type", value: "", type: "select", options: opts.events, placeholder: "Select event type" },
            { label: "Category", value: "", type: "select", options: opts.categories, placeholder: "Select or add category", allowCustom: true },
            { label: "Price", value: "0", type: "number", placeholder: "Price" }
          ],
          async ([title, service, eventType, category, price], close) => {
            if (!title) return alert("Title is required");
            if (!service) return alert("Service is required");
            try {
              await apiFetch("/planner-items", {
                method: "POST",
                body: JSON.stringify({
                  title,
                  service,
                  eventType,
                  category,
                  priceMin: Number(price) || 0,
                  priceMax: Number(price) || 0,
                  status: "approved"
                })
              });
              close();
              loadData();
            } catch (err) {
              alert(err?.message || "Unable to add item.");
            }
          }
        );
      };
    }

    wrap.onclick = async (e) => {
      const editBtn = e.target.closest("[data-catalog-edit]");
      const deactBtn = e.target.closest("[data-catalog-deactivate]");
      if (editBtn) {
        if (typeof apiFetch !== "function") return alert("API not available.");
        const id = editBtn.dataset.catalogEdit;
        const item = data.catalog.find((c) => (c._id || c.id || "").toString() === id);
        const opts = (() => {
          const services = uniqueList([...data.catalog.map((c) => c.service || ""), ...fallbackServices, item?.service || ""]);
          const events = uniqueList([...data.catalog.map((c) => c.eventType || c.event || ""), ...fallbackEvents, item?.eventType || ""]);
          const categories = uniqueList([...data.catalog.map((c) => c.category || ""), item?.category || ""]);
          const toOptions = (list) => list.map((v) => ({ value: v, label: v }));
          return { services: toOptions(services), events: toOptions(events), categories: toOptions(categories) };
        })();
        openModal(
          "Edit catalog item",
          [
            { label: "Title", value: item?.name || "", placeholder: "Item name" },
            { label: "Service", value: item?.service || "", type: "select", options: opts.services, placeholder: "Select service" },
            { label: "Event Type", value: item?.eventType || item?.event || "", type: "select", options: opts.events, placeholder: "Select event type" },
            { label: "Category", value: item?.category || "", type: "select", options: opts.categories, placeholder: "Select or add category", allowCustom: true },
            { label: "Price", value: item?.price || item?.priceMin || 0, type: "number", placeholder: "Price" }
          ],
          async ([title, service, eventType, category, price], close) => {
            if (!title) return alert("Title is required");
            if (!service) return alert("Service is required");
            try {
              await apiFetch(`/planner-items/${id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  title,
                  service,
                  eventType,
                  category,
                  priceMin: Number(price) || 0,
                  priceMax: Number(price) || 0,
                  status: "approved"
                })
              });
              close();
              loadData();
            } catch (err) {
              alert(err?.message || "Unable to update item.");
            }
          }
        );
      }
      if (deactBtn) {
        if (typeof apiFetch !== "function") return alert("API not available.");
        const id = deactBtn.dataset.catalogDeactivate;
        const confirmAction = confirm("Deactivate this catalog item?");
        if (!confirmAction) return;
        apiFetch(`/planner-items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "deleted" })
        })
          .then(() => loadData())
          .catch((err) => alert(err?.message || "Unable to deactivate item."));
      }
    };
  };

  const renderApprovals = () => {
    const wrap = document.getElementById("approvalList");
    if (!wrap) return;
    setText("approvalsCount", `${data.approvals.length} pending`);
    wrap.innerHTML =
      data.approvals
        .map(
          (ap) => `
        <div class="approval-card" data-approval-id="${ap.id || ""}">
          <div class="panel-head">
            <strong>${ap.item}</strong>
            <span class="pill soft">${ap.type} request</span>
          </div>
          <div class="approval-meta">
            <span class="tag"><i class="fa-solid fa-user"></i> ${ap.planner}</span>
            <span class="tag"><i class="fa-solid fa-clock"></i> ${fmtDate(ap.date)}</span>
          </div>
          <div class="approval-beforeafter">
            <div><strong>Before</strong><br/><span class="muted">${ap.before || "New item"}</span></div>
            <div><strong>After</strong><br/><span class="muted">${ap.after}</span></div>
          </div>
          <p class="muted">${ap.note}</p>
          <div class="action-links">
            <button class="btn" type="button" data-approval-action="approve"><i class="fa-solid fa-check"></i> Approve</button>
            <button class="btn btn-ghost" type="button" data-approval-action="reject"><i class="fa-solid fa-xmark"></i> Reject</button>
            <a class="link-btn" href="#"><i class="fa-solid fa-pen"></i> Edit manually</a>
          </div>
        </div>
      `
        )
        .join("") || emptyState("No pending approvals.");
    wrap.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-approval-action]");
      if (!actionBtn) return;
      const card = actionBtn.closest("[data-approval-id]");
      const changeId = card?.dataset.approvalId;
      const action = actionBtn.dataset.approvalAction;
      if (!changeId || !["approve", "reject"].includes(action)) return;
      if (typeof apiFetch !== "function") {
        alert("API not available.");
        return;
      }
      actionBtn.disabled = true;
      actionBtn.textContent = action === "approve" ? "Approving..." : "Rejecting...";
      apiFetch(`/planner-item-changes/${changeId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify({ note: "" })
      })
        .then(() => loadData())
        .catch((err) => {
          alert(err?.message || "Unable to update request.");
          actionBtn.disabled = false;
          actionBtn.textContent = action === "approve" ? "Approve" : "Reject";
        });
    });
  };

  const renderPayments = () => {
    const { payments } = data;
    setText("totalRevenue", fmtMoney(payments.revenue));
    setText("pendingPayments", fmtMoney(payments.pending));
    setText("contractsSigned", payments.contracts);
    const table = document.getElementById("paymentsTable");
    if (!table) return;
    if (!payments.entries.length) {
      table.innerHTML = emptyState("No payments or contracts yet.");
      return;
    }
    table.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Contract Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${payments.entries
              .map(
                (row) => `
              <tr>
                <td>${row.event || row.eventTitle || ""}</td>
                <td>${fmtMoney(row.amount)}</td>
                <td>${statusBadge(row.paymentStatus)}</td>
                <td>${statusBadge(row.contractStatus)}</td>
                <td>${fmtDate(row.date)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderNotifications = () => {
    const wrap = document.getElementById("notificationsList");
    if (!wrap) return;
    wrap.innerHTML =
      data.notifications
        .map(
          (note) => `
        <div class="notification-item">
          <div class="action-links">
            <span class="notice-level ${note.level}">${note.level}</span>
            <span class="muted small">${note.time}</span>
          </div>
          <strong>${note.title}</strong>
          <p class="muted">${note.detail}</p>
        </div>
      `
        )
        .join("") || emptyState("No alerts right now.");
  };

  const normalizeApprovals = (list = []) =>
    list.map((ap) => ({
      id: ap._id || ap.id,
      item: ap.itemData?.title || ap.item || ap.itemId?.title || "Catalog item",
      type: ap.action ? ap.action.charAt(0).toUpperCase() + ap.action.slice(1) : ap.type || "Add",
      planner: ap.createdBy?.name || ap.createdBy?.email || ap.planner || "Planner",
      date: ap.createdAt || ap.date,
      before: ap.before || ap.itemData?.before || "",
      after: ap.after || ap.itemData?.after || ap.itemData?.price || "",
      note: ap.note || ""
    }));

  const computePayments = (entries = []) => {
    const revenue = entries.filter((p) => (p.paymentStatus || "").toLowerCase() === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
    const pending = entries.filter((p) => (p.paymentStatus || "").toLowerCase() !== "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
    const contracts = entries.filter((p) => (p.contractStatus || "").toLowerCase() === "signed").length;
    return { revenue, pending, contracts, entries };
  };

  const normalizeEvents = (list = []) =>
    list.map((ev) => ({
      _id: ev._id || ev.id,
      id: ev._id || ev.id,
      type: ev.type || "Event",
      date: ev.date,
      location: ev.location || "",
      budget: ev.budget || 0,
      status: ev.status || ev.rawStatus || "",
      client: ev.client,
      planner: ev.planner,
      favoritesSnapshot: ev.favoritesSnapshot,
      createdAt: ev.createdAt,
      lastActivityAt: ev.lastActivityAt
    }));

  const normalizeCatalog = (items = []) =>
    items.map((item) => ({
      _id: item._id || item.id,
      id: item._id || item.id,
      clientKey: item.clientKey || buildCatalogKey(item),
      title: item.title || item.name || "Catalog item",
      name: item.title || item.name || "Catalog item",
      image: item.image || item.thumbnail || "",
      category: item.category || item.service || "",
      service: item.service || item.category || "",
      eventType: item.eventType || item.event || "",
      price: item.priceMax || item.priceMin || item.price || 0,
      priceMin: item.priceMin,
      priceMax: item.priceMax,
      description: item.description || "",
      status: item.status || "pending",
      createdBy: item.owner,
      usage: item.usage || 0
    }));

  const openModal = (title, fields = [], onSubmit) => {
    const overlay = document.createElement("div");
    overlay.className = "admin-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "admin-modal";
    const renderField = (f, idx) => {
      if (f.type === "select") {
        const opts = Array.isArray(f.options) ? [...f.options] : [];
        const hasValue = f.value && !opts.some((o) => o.value === f.value);
        if (hasValue) opts.unshift({ value: f.value, label: f.value });
        const placeholder = f.placeholder || `Select ${f.label.toLowerCase()}`;
        const customOption = f.allowCustom ? '<option value="__custom">Custom...</option>' : "";
        return `
          <label for="modal-field-${idx}">${f.label}</label>
          <select id="modal-field-${idx}" data-allow-custom="${f.allowCustom ? "1" : ""}">
            <option value="" disabled ${f.value ? "" : "selected"}>${placeholder}</option>
            ${opts.map((o) => `<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`).join("")}
            ${customOption}
          </select>
        `;
      }
      return `
        <label for="modal-field-${idx}">${f.label}</label>
        <input id="modal-field-${idx}" type="${f.type || "text"}" value="${f.value ?? ""}" placeholder="${f.placeholder || ""}" />
      `;
    };
    modal.innerHTML = `
      <h3>${title}</h3>
      <div class="modal-error" data-modal-error role="alert"></div>
      <div class="modal-body">
        ${fields.map(renderField).join("")}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-modal-cancel>Cancel</button>
        <button class="btn" data-modal-submit>Save</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const errorEl = modal.querySelector("[data-modal-error]");
    const submitBtn = modal.querySelector("[data-modal-submit]");
    const defaultSubmitText = submitBtn?.textContent || "Save";

    const setError = (message) => {
      if (!errorEl) return;
      if (!message) {
        errorEl.textContent = "";
        errorEl.style.display = "none";
        return;
      }
      errorEl.textContent = message;
      errorEl.style.display = "block";
    };

    const setLoading = (isLoading) => {
      if (!submitBtn) return;
      submitBtn.disabled = !!isLoading;
      submitBtn.textContent = isLoading ? "Saving..." : defaultSubmitText;
    };

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-modal-cancel]")) close();
    });
    modal.querySelector("[data-modal-submit]").addEventListener("click", () => {
      setError("");
      const values = fields.map((field, idx) => {
        const el = modal.querySelector(`#modal-field-${idx}`);
        if (!el) return "";
        if (field.type === "select" && field.allowCustom && el.value === "__custom") {
          const manual = prompt(`Enter ${field.label.toLowerCase()}`);
          return (manual || "").trim();
        }
        return el.value || "";
      });
      onSubmit(values, close, { setError, setLoading });
    });
  };

  const refreshPlanners = async () => {
    if (typeof apiFetch !== "function") return;
    try {
      const res = await apiFetch("/admin/planners");
      data.planners = res?.data || data.planners || [];
      if (page === "planners") renderPlanners();
      if (page === "assignment") renderAssignment();
      hydrateNav();
    } catch (err) {
      console.error("Planner list refresh failed", err);
    }
  };

  const refreshRequests = async () => {
    if (typeof apiFetch !== "function") return;
    try {
      const res = await apiFetch("/admin/event-requests");
      data.requests = res?.data || data.requests || [];
      if (page === "requests" || page === "assignment" || page === "dashboard") {
        renderRequests();
        renderAssignment();
        renderDashboard();
      }
      hydrateNav();
    } catch (err) {
      console.error("Request list refresh failed", err);
    }
  };

  const refreshEvents = async () => {
    if (typeof apiFetch !== "function") return;
    try {
      const res = await apiFetch("/admin/events");
      data.events = normalizeEvents(res?.data || []);
      if (page === "dashboard") renderDashboard();
      if (page === "events") renderEvents();
      if (page === "requests") renderRequests();
      hydrateNav();
    } catch (err) {
      console.error("Events list refresh failed", err);
    }
  };

  const refreshCatalog = async () => {
    try {
      data.catalog = await fetchCatalog(typeof apiFetch === "function");
      if (page === "catalog") renderCatalog();
      hydrateNav();
    } catch (err) {
      console.error("Catalog list refresh failed", err);
      setCatalogMessage(err?.message || "Unable to load catalog.");
    }
  };

  const bindAddPlanner = () => {
    if (page !== "planners") return;
    const addBtn = document.getElementById("addPlannerBtn");
    if (!addBtn) return;
    addBtn.addEventListener("click", () => {
      openModal(
        "Add planner",
        [
          { label: "Name", value: "", placeholder: "Planner name" },
          { label: "Email", value: "", type: "email", placeholder: "planner@email.com" },
          { label: "Phone", value: "", placeholder: "Phone (optional)" },
          { label: "Password", value: "", type: "password", placeholder: "Temporary password" }
        ],
        async ([nameRaw, emailRaw, phoneRaw, password], close, helpers = {}) => {
          const { setError = () => {}, setLoading = () => {} } = helpers || {};
          setError("");
          const name = (nameRaw || "").trim();
          const email = (emailRaw || "").trim();
          const phone = (phoneRaw || "").trim();
          if (!name || !email || !password) {
            return setError("Name, email, and password are required.");
          }
          if (typeof apiFetch !== "function") {
            setError("API not available.");
            return;
          }
          setLoading(true);
          try {
            await apiFetch("/admin/planners", {
              method: "POST",
              body: JSON.stringify({
                name,
                email,
                phone,
                password
              })
            });
            close();
            await refreshPlanners();
            loadData();
          } catch (err) {
            setError(err?.message || "Unable to add planner.");
          } finally {
            setLoading(false);
          }
        }
      );
    });
  };

  const loadData = async () => {
    const apiAvailable = typeof apiFetch === "function";
    let isAdmin = false;

    if (apiAvailable) {
      try {
        await requireAdmin();
        isAdmin = true;
      } catch (err) {
        const msg = err.status === 401 ? "Please log in as an admin to see live data." : err?.message || "Admin access required.";
        showAccessError(msg);
        setCatalogMessage(msg);
      }
    }

    if (isAdmin) {
      try {
        const res = await apiFetch("/admin/ui/overview");
        const payload = res?.data || {};
        const paymentsEntries = payload.payments?.entries || payload.payments || payload.paymentEntries || [];
        let catalogItems = [];
        try {
          catalogItems = await fetchCatalog(true);
        } catch (err) {
          console.warn("Direct catalog fetch failed, using overview data", err);
          catalogItems = normalizeCatalog(payload.catalog || []);
        }
        data = {
          ...data,
          stats: { ...defaults.stats, ...(payload.stats || {}) },
          requests: payload.requests || [],
          approvals: normalizeApprovals(payload.approvals || []),
          events: payload.events || [],
          planners: payload.planners || [],
          payments: computePayments(paymentsEntries),
          catalog: catalogItems
        };
      } catch (err) {
        console.error("Admin UI load failed", err);
        setCatalogMessage(err?.message || "Unable to load catalog data.");
      }
    } else {
      // Show public approved catalog even if admin auth is missing so the UI isn't blank
      try {
        data.catalog = await fetchCatalog(false);
      } catch (err) {
        setCatalogMessage(err?.message || "Unable to load catalog data.");
      }
    }

    hydrateNav();
    if (page === "dashboard") renderDashboard();
    if (page === "requests") renderRequests();
    if (page === "assignment") renderAssignment();
    if (page === "events") renderEvents();
    if (page === "planners") renderPlanners();
    if (page === "catalog") renderCatalog();
    if (page === "approvals") renderApprovals();
    if (page === "payments") renderPayments();
    if (page === "notifications") renderNotifications();
    await Promise.all([refreshPlanners(), refreshRequests(), refreshEvents(), refreshCatalog()]);
  };

  bindAddPlanner();
  loadData();
})(); 





