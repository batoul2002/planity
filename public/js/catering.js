document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-cater-grid]');
  const detailGrid = document.querySelector('[data-cater-detail-grid]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailCopy = document.querySelector('[data-detail-copy]');
  const metaCopy = document.querySelector('[data-cater-meta]');
  const gallery = document.querySelector('[data-cater-gallery]');
  const detailSection = document.getElementById('cater-details');
  const favoriteBtn = document.querySelector('[data-cater-fav]');

  if (!grid || !detailGrid || !detailTitle || !detailCopy || !metaCopy || !gallery || !favoriteBtn) return;

  const { apiFetch: sharedApiFetch, getToken: sharedGetToken } = window.PlanityAPI || {};
  const API_BASE = window.location.origin + '/api/v1';
  const getToken = () => (typeof sharedGetToken === 'function' ? sharedGetToken() : localStorage.getItem('token'));
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

  let currentHouse = null;
  let currentVendorId = '';
  const vendorIdMap = new Map();

  const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=80`;

  const houses = [
    {
      id: 'aljawad',
      name: 'Al Jawad Restaurant',
      area: 'Ghobeiry - Airport Road',
      vibe: 'Knefe and grills',
      summary: 'Family kitchen and sweets house serving Dahye, Beirut south, and Airport Road.',
      image: 'images/catering/aljawad/aljawadCatering.png',
      detailCopy: 'Discover a menu full of flavors made with love, fresh ingredients, and dishes for every mood.',
      gallery: ['images/catering/aljawad/aljawadCatering.png'],
      details: [
        {
          title: 'Locations',
          description:
            '1) Tyre, Alramel Suburb, Near Corniche\n2) Tyre, Jal al Baher Mainroad\n3) Beirut, Chiyah, Mar Mkhayel Church road\n4) Beirut, Jnah, Centro Mall\n5) Beirut, Airport Road',
          image: photo('photo-1504674900247-0877df9cc836')
        }
      ]
    },
    {
      id: 'cremino',
      name: 'Cremino Patisserie',
      area: 'Haret Hreik',
      vibe: 'Gelato and modern patisserie',
      summary: 'Haret Hreik lab on Sayyed Hadi Nasrallah Highway with gelato cakes and minis.',
      image: 'images/catering/cremino/creminoPatisserie.jpeg',
      detailCopy:
        'Cremino Patisserie - where every bite blends luxury, passion, and the art of timeless sweetness.',
      gallery: ['images/catering/cremino/creminoPatisserie.jpeg'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Sayyed Hadi Nasrallah Highway, Haret Hreik. Regular deliveries across Dahye and Airport road venues.',
          image: photo('photo-1481391032119-d89fee407e44')
        },
        {
          title: 'Best sellers to book',
          description: 'Gelato cakes, profiterole towers, and mini eclairs for plated or buffet service.',
          image: photo('photo-1482049016688-2d3e1b311543')
        },
        {
          title: 'Event notes',
          description: 'Keep gelato items chilled; request insulated transport for summer timelines.',
          image: photo('photo-1499028344343-cd173ffc68a9')
        }
      ]
    },
    {
      id: 'tastybees',
      name: 'Tasty Bees',
      area: 'Bir El Abed',
      vibe: 'Honey cakes and mini pastries',
      summary: 'Bir El Abed spot for honey cakes, chocolate minis, and croissant trays.',
      image: 'images/catering/tastyBees/tastybeesCatering.jpeg',
      detailCopy:
        'Discover The Tasty Bees - where every bite is crafted with sweetness, freshness, and pure irresistible flavor.',
      gallery: ['images/catering/tastyBees/tastybeesCatering.jpeg'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Bir El Abed main street with delivery into Ghobeiry, Haret Hreik, and Airport road venues.',
          image: photo('photo-1467003909585-2f8a72700288')
        },
        {
          title: 'Best sellers to book',
          description: 'Honey cakes, chocolate mini eclairs, and fresh croissant platters.',
          image: photo('photo-1499028344343-cd173ffc68a9')
        },
        {
          title: 'Event notes',
          description: 'Order minis by tray; morning production slots fill quickly on weekends.',
          image: photo('photo-1470337458703-46ad1756a187')
        }
      ]
    },
    {
      id: 'alsultan',
      name: 'Al Sultan Sweets',
      area: 'Beirut / South',
      vibe: 'Lebanese sweets',
      summary: 'Al Sultan Sweets offers a wide range of Lebanese sweets, including traditional Arabic confections.',
      image: 'images/catering/alsultan/alsultan.jpg',
      detailCopy:
        'Al Sultan Sweets is a Lebanese culinary family business that handcrafts premium Arabic sweets',
      gallery: ['images/catering/alsultan/alsultan.jpg'],
      details: [
        {
          title: 'Locations',
          description:
            'Beirut, Sayed Hadi BLV, next to Mike Sport | +961 1 552538\nGhaziyeh, Al Zahrani Highway | +961 76 663 996\nNabatieh, Kfarjoz | +961 7 761418\nNabatieh, Facing the Mosque | +961 7 761418',
          image: 'images/catering/alsultan/alsultan.jpg'
        }
      ]
    },
    {
      id: 'alsharek',
      name: 'Al Shareq Sweets',
      area: 'Haret Hreik',
      vibe: 'Nammoura and knefe',
      summary: 'Haret Hreik counter popular for nammoura, mafroukeh, and knefe trays.',
      image: 'images/catering/alshareq/alshareq.png',
      detailCopy:
        'Al Shareq Sweets - where tradition meets exquisite flavor, offering handcrafted desserts made with the finest ingredients and a touch of authentic Middle Eastern warmth.',
      gallery: ['images/catering/alshareq/alshareq.png'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Haret Hreik / Sahat el Ghobeiry area with quick runs into nearby venues.',
          image: photo('photo-1499028344343-cd173ffc68a9')
        },
        {
          title: 'Best sellers to book',
          description: 'Nammoura with nuts, mafroukeh, and knefe trays that hold heat well.',
          image: photo('photo-1504674900247-0877df9cc836')
        },
        {
          title: 'Event notes',
          description: 'Order trays in advance; syrup-on-the-side helps with transport and service timing.',
          image: photo('photo-1467003909585-2f8a72700288')
        }
      ]
    },
    {
      id: 'albohsali',
      name: 'Al Bohsali 1870',
      area: 'Downtown Beirut to Dahye delivery',
      vibe: 'Heritage baklava',
      summary: 'Historic Beirut house famed for baklava and maamoul, delivering into Dahye.',
      image: 'images/catering/albohsali/albohsali.png',
      detailCopy:
        'Al Bohsali offers traditional Lebanese sweets like various Baklava (pistachio, assorted), Knafeh/Kunafa (cheese-filled pastry), shortbreads like Ghorayeba, date-filled Maamoul, and other delicate pastries such as Petit Fours (chocolate, round) and Anise Biscuits',
      gallery: ['images/catering/albohsali/albohsali.png'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Martyrs Square, Downtown Beirut; delivery arranged to Dahye and airport-side events.',
          image: photo('photo-1470337458703-46ad1756a187')
        },
        {
          title: 'Best sellers to book',
          description: 'Pistachio baklava assortments, mabroume, and walnut or pistachio maamoul.',
          image: photo('photo-1504674900247-0877df9cc836')
        },
        {
          title: 'Event notes',
          description: 'Heritage tins keep pastry crisp; useful for gifting tables and arrival favors.',
          image: photo('photo-1527515637462-cff94eecc1ac')
        }
      ]
    },
    {
      id: 'daze',
      name: 'Daze Sweets',
      area: 'Beirut',
      vibe: 'Cakes and pastries',
      summary: 'Daze Sweets prepares cakes and pastry assortments for Beirut and Airport Road venues.',
      image: 'images/catering/daze/daze.jpeg',
      detailCopy: 'The Sweet Side of Life',
      gallery: ['images/catering/daze/daze.jpeg'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Beirut. Delivers toward Airport Road and Beirut south venues.',
          image: 'images/catering/daze/daze.jpeg'
        }
      ]
    },
    {
      id: 'albaba',
      name: 'Al Baba Sweets',
      area: 'Khalde / Airport corridor',
      vibe: 'Pistachio knefe and rolls',
      summary: 'Saida heritage brand with Khalde branch serving airport-side and Dahye events.',
      image: 'images/catering/albaba/albaba.png',
      detailCopy:
        'We delight customers with consistently high-quality food and thoughtful innovation.',
      gallery: ['images/catering/albaba/albaba.png'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Khalde highway branch 10-15 minutes from Dahye and airport hotels.',
          image: photo('photo-1504674900247-0877df9cc836')
        },
        {
          title: 'Best sellers to book',
          description: 'Pistachio knefe, mafroukeh, and pistachio rolls favored for midnight servings.',
          image: photo('photo-1527515637462-cff94eecc1ac')
        },
        {
          title: 'Event notes',
          description: 'Coordinate delivery timing to keep knefe hot; trays are available in multiple sizes.',
          image: photo('photo-1482049016688-2d3e1b311543')
        }
      ]
    },
    {
      id: 'alabdallah',
      name: 'Alabdallah Restaurant',
      area: 'Beirut',
      vibe: 'Lebanese grill and catering',
      summary: 'Restaurant and catering service offering Lebanese dishes and platters for events.',
      image: 'images/catering/alabdalla/alabdullahRest.png',
      detailCopy:
        'Al Abdullah Restaurant offers authentic flavors, generous hospitality, and a rich culinary experience that brings tradition and taste together in every dish.',
      gallery: ['images/catering/alabdalla/alabdullahRest.png'],
      details: [
        {
          title: 'Location & coverage',
          description: 'Beirut-based; contact for catering trays and delivery to nearby venues.',
          image: photo('photo-1504674900247-0877df9cc836')
        }
      ]
    }
  ];

  const loadVendorIds = async () => {
    if (vendorIdMap.size) return;
    try {
      const res = await apiFetch('/vendors?limit=200&category=catering', { method: 'GET' });
      const vendors = Array.isArray(res.data) ? res.data : [];
      vendors.forEach((v) => {
        if (v?.name && v?._id) {
          vendorIdMap.set(slugify(v.name), v._id);
        }
      });
    } catch (err) {
      console.warn('Unable to load catering vendors', err.message || err);
    }
  };

  function renderCards() {
    grid.innerHTML = '';
    houses.forEach((house, idx) => {
      const card = document.createElement('article');
      card.className = 'decor-event-card sr-item';
      card.dataset.id = house.id;
      card.style.setProperty('--sr-delay', (0.05 * (idx % 4)).toFixed(2) + 's');
      const bg = house.image || photo('photo-1481391032119-d89fee407e44');
      card.innerHTML = `
        <div class="decor-event-photo" style="background-image:url('${bg}')"></div>
        <div class="decor-event-meta">
          <h3>${house.name}</h3>
          <p>${house.summary}</p>
          <button class="decor-cta" type="button" data-view="${house.id}">View details</button>
        </div>
      `;
      card.addEventListener('click', async () => {
        const opened = await setActive(house.id);
        if (opened && detailSection) {
          detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      grid.appendChild(card);
    });
  }

  async function resolveVendorId(house) {
    if (!house?.name) return '';
    await loadVendorIds();
    const slug = slugify(house.name);
    if (vendorIdMap.has(slug)) return vendorIdMap.get(slug);
    // fallback: loose match
    const match = Array.from(vendorIdMap.keys()).find((key) => key.includes(slug) || slug.includes(key));
    return match ? vendorIdMap.get(match) : '';
  }

  const setFavoriteState = (isSaved) => {
  if (!favoriteBtn) return;
  favoriteBtn.classList.toggle('is-active', Boolean(isSaved));
  favoriteBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
  };

  async function refreshFavoriteState(house) {
    const vendorId = await resolveVendorId(house);
    currentVendorId = vendorId;
    if (!getToken()) {
      setFavoriteState(false);
      return;
    }
    try {
      const res = await apiFetch('/favorites/mine', { method: 'GET' });
      const favorites = Array.isArray(res.data) ? res.data : [];
      const isSaved = favorites.some(
        (fav) =>
          fav &&
          ((vendorId && (fav._id === vendorId || fav.id === vendorId)) ||
            slugify(fav.name || '') === slugify(house.name))
      );
      setFavoriteState(isSaved);
    } catch (err) {
      console.warn('Unable to load favorites', err.message || err);
      setFavoriteState(false);
    }
  }

  async function setActive(id) {
    const house = houses.find((h) => h.id === id);
    if (!house) return false;
    currentHouse = house;
    document.querySelectorAll('.decor-event-card').forEach((c) => {
      c.classList.toggle('is-active', c.dataset.id === id);
    });
    detailSection?.classList.remove('cater-open');
    const isAlJawad = house.id === 'aljawad';
    const isCremino = house.id === 'cremino';
    const isTastyBees = house.id === 'tastybees';
    const isAlSultan = house.id === 'alsultan';
    const isAlShareq = house.id === 'alsharek';
    const isAlBohsali = house.id === 'albohsali';
    const isDaze = house.id === 'daze';
    const isAlBaba = house.id === 'albaba';
    const isAlAbdallah = house.id === 'alabdallah';
    if (
      !isAlJawad &&
      !isCremino &&
      !isTastyBees &&
      !isAlSultan &&
      !isAlShareq &&
      !isAlBohsali &&
      !isDaze &&
      !isAlBaba &&
      !isAlAbdallah
    ) {
      detailSection?.classList.add('is-hidden');
      detailTitle.textContent = house.name;
      detailCopy.textContent = '';
      metaCopy.textContent = '';
      gallery.innerHTML = '';
      detailGrid.innerHTML = '';
      return false;
    }

    const detailConfig = {
      aljawad: {
        copy: 'Discover a menu full of flavors made with love, fresh ingredients, and dishes for every mood.',
        locations: [
          'Tyre, Alramel Suburb, Near Corniche',
          'Tyre, Jal al Baher Mainroad',
          'Beirut, Chiyah, Mar Mkhayel Church road',
          'Beirut, Jnah, Centro Mall',
          'Beirut, Airport Road'
        ],
        menuLink: 'https://menu.omegasoftware.ca/branches/aljawadrestaurantsour',
        heroLine: 'Discover a menu full of flavors made with love, fresh ingredients, and dishes for every mood.'
      },
      cremino: {
        copy: 'Cremino Patisserie - where every bite blends luxury, passion, and the art of timeless sweetness.',
        locations: [
          'Lebanon, Beirut, Old Airport Road',
          'Beirut, Verdun, Le Mirage Plaza',
          'Lebanon, Tyre, Abbasiya Road'
        ],
        menuLink: 'https://www.instagram.com/creminolb/?hl=en',
        heroLine: 'Cremino Patisserie invites you to a world of sweet moments, freshly baked delights, and unforgettable flavors.'
      },
      tastybees: {
        copy: 'Discover The Tasty Bees - where every bite is crafted with sweetness, freshness, and pure irresistible flavor.',
        locations: [
          '1st branch: Sfeir, Mar Mkhaeil Church. 01/27 88 04 - 71/54 53 17',
          '2nd branch: Sayyed Hadi, Alkaem Street. 01/55 87 04 - 78/91 07 13',
          '3rd branch: Beshara El-Khoury. 01/66 95 01 - 71/35 60 42',
          '4th branch: Choueifat, Aramoun junction. 81/99 88 01 - 81/99 88 02',
          '5th branch: Airport road, Near the Islamic Council.'
        ],
        menuLink: 'https://www.shop.tastybees.com/',
        heroLine:
          'Discover the buzzing flavors of Tasty Bees - a menu crafted with sweetness, freshness, and irresistible taste in every bite.'
      },
      alsultan: {
        copy: 'Al Sultan Sweets is a Lebanese culinary family business that handcrafts premium Arabic sweets',
        locations: [
          'Beirut, Sayed Hadi BLV, next to Mike Sport - +961 1 552538',
          'Ghaziyeh, Al Zahrani Highway - +961 76 663 996',
          'Nabatieh, Kfarjoz - +961 7 761418',
          'Nabatieh, Facing the Mosque - +961 7 761418'
        ],
        menuLink: 'http://stg.alsultansweet.com/contact-us/',
        heroLine:
          'Discover the exquisite flavors of Al Sultan Sweets - a rich selection of traditional and premium desserts crafted with authentic taste and exceptional quality'
      },
      alsharek: {
        copy: 'Al Shareq Sweets - where tradition meets exquisite flavor, offering handcrafted desserts made with the finest ingredients and a touch of authentic Middle Eastern warmth.',
        locations: [
          'Beirut - 01-550630 | 81-890452',
          'Khalde - 03-779399',
          'Kfar Joz - 07-531100 | 81-246264',
          'Nabatiyeh - 07-769759 | 70-558584',
          'Tyre - 07-349449 | 76-747211'
        ],
        menuLink:
          'https://www.instagram.com/accounts/login/?next=%2Falsharqsweetslb%2F&source=omni_redirect&hl=en',
        heroLine:
          'Discover the delightful menu of Al Shareq Sweets - where every bite blends tradition, craftsmanship, and irresistible flavor.'
      },
      albohsali: {
        copy: 'Al Bohsali offers traditional Lebanese sweets like various Baklava (pistachio, assorted), Knafeh/Kunafa (cheese-filled pastry), shortbreads like Ghorayeba, date-filled Maamoul, and other delicate pastries such as Petit Fours (chocolate, round) and Anise Biscuits',
        locations: [
          "Downtown Beirut (Martyr's Square): A historic, often 24/7, location known for traditional sweets.",
          'Hamra, Beirut: Another popular branch for buying sweets.',
          'Kraytem, Beirut: Features both a takeaway shop and a coffee shop/restaurant.',
          'Jal el Dib: Located on the highway for easier access.',
          'Tyre (Sour): Has a branch in the Al-Buss area'
        ],
        menuLink: 'https://bohsali1870.com/?srsltid=AfmBOootlANGqWCMLPq96eDIPUPJP0fD3EfIDvIl4XEEan62cYZgS_zd',
        heroLine:
          'Al Bohsali Sweets - where authentic Lebanese flavors meet generations of craftsmanship, offering premium baklava and oriental desserts made with the finest ingredients.'
      },
      albaba: {
        copy: 'We delight customers with consistently high-quality food and thoughtful innovation.',
        locations: [
          'Saida Headquarters, Dr. Nazih Bizri Blvd. T: +961 7 735 226 ext. 201 M: +961 76883314',
          'Tayouneh, Omar Bayham St T: +961 1 399 500 M: +961 76883315',
          'Koreytem, Taj EL Din Soloh St.'
        ],
        menuLink: 'https://albaba-sweets.com/pages/al-baba-sweets-locations-lebanon-uae',
        heroLine:
          "To be the region's go-to destination for traditional sweets - where exceptional quality, hygiene, and heartfelt service come together"
      },
      alabdallah: {
        copy: 'Al Abdullah Restaurant offers authentic flavors, generous hospitality, and a rich culinary experience that brings tradition and taste together in every dish.',
        locations: [
          'Zalka',
          'Haret Hreik',
          'Forn El Chebbak',
          'City Center Beirut (inside the mall)',
          'Jnah',
          'Ghazieh',
          'Saida (Tyre/Sour area)',
          'Nabatieh',
          'Riyak, Chtaura',
          'Ghazir',
          'Batroun',
          'Hamra',
          'Mansourieh',
          'Zouk'
        ],
        menuLink: 'https://menu.alabdalla.org/lebanon',
        heroLine:
          'Discover the rich flavors of Al-Abdullah Restaurant with our carefully crafted menu, offering traditional dishes made with authentic taste and premium ingredients.'
      },
      daze: {
        copy: 'The Sweet Side of Life',
        locations: ['Tony Mousallem Bld, Ksara', 'Zahle, Bekaa, Lebanon'],
        menuLink: 'https://www.daze-lb.me/',
        heroLine: 'Welcome to our family-owned French patisserie, where every bite is a taste of luxury.'
      }
    };

    const cfg = detailConfig[house.id];
    if (!cfg) {
      favoriteBtn.hidden = true;
      favoriteBtn.dataset.slug = '';
      favoriteBtn.setAttribute('aria-pressed', 'false');
      return false;
    }

    detailSection?.classList.remove('is-hidden');
    detailSection?.classList.add('cater-open');
    detailTitle.textContent = house.name;
    detailCopy.textContent = cfg.copy;
    const slug = house.id;
    favoriteBtn.hidden = false;
    favoriteBtn.dataset.slug = slug;
    favoriteBtn.setAttribute('aria-pressed', 'false');
    favoriteBtn.setAttribute('aria-label', `Save ${house.name}`);
    setFavoriteState(false);
    const listClass =
      house.id === 'alabdallah' ? 'cater-location-list cater-location-list--two' : 'cater-location-list';
    metaCopy.innerHTML = `
      <div class="cater-locations-inline">
        <p class="cater-tag">Locations</p>
        <ul class="${listClass}">
          ${cfg.locations.map((loc) => `<li>${loc}</li>`).join('')}
        </ul>
      </div>
    `;

    gallery.innerHTML = '';
    (house.gallery || []).forEach((src, idx) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${house.name} gallery ${idx + 1}`;
      gallery.appendChild(img);
    });

    detailGrid.innerHTML = '';

    const introCard = document.createElement('article');
    introCard.className = 'decor-detail-card sr-item cater-card';
    introCard.innerHTML = `
      <div class="decor-detail-body">
        <p class="cater-tag">Signature taste</p>
        <p class="cater-hero-line">${cfg.heroLine}</p>
        <a class="decor-cta" href="${cfg.menuLink}" target="_blank" rel="noopener noreferrer">View full menu</a>
      </div>
    `;
    detailGrid.appendChild(introCard);

    await refreshFavoriteState(house);
    setupScrollReveal(detailSection);
    return true;
  }

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    if (!currentHouse || !favoriteBtn) return;
    const token = getToken();
    if (!token) {
      alert('Please log in to save favorites.');
      window.location.href = 'login.html';
      return;
    }
    const vendorId = currentVendorId || (await resolveVendorId(currentHouse));
    try {
      const res = await apiFetch('/favorites', {
        method: 'POST',
        body: JSON.stringify({
          vendorId,
          vendorSlug: slugify(currentHouse.name || ''),
          vendorName: currentHouse.name || '',
          vendorCategory: 'catering',
          vendorPhoto: currentHouse.image || ''
        })
      });
      if (res?.vendorId) {
        currentVendorId = res.vendorId;
      }
      await refreshFavoriteState(currentHouse);
      if (res?.message) alert(res.message);
    } catch (err) {
      alert(err.message || 'Unable to update favorites');
    }
  };

  favoriteBtn.addEventListener('click', handleFavoriteClick);

  function setupScrollReveal(root = document) {
    const items = Array.from(root.querySelectorAll('.sr-item')).filter(
      (el) => !el.classList.contains('sr-revealed')
    );
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sr-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    items.forEach((el) => observer.observe(el));
  }

  renderCards();
  setupScrollReveal();
});
