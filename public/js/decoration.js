document.addEventListener('DOMContentLoaded', () => {
  const eventGrid = document.querySelector('[data-event-grid]');
  const detailGrid = document.querySelector('[data-detail-grid]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailCopy = document.querySelector('[data-detail-copy]');
  const selectedEyebrow = document.querySelector('[data-selected-eyebrow]');
  const selectedChip = document.querySelector('[data-selected-chip]');
  const detailSection = document.getElementById('decor-details');

  if (!eventGrid || !detailGrid) return;

  const events = {
    wedding: {
      name: 'Wedding & Engagement',
      summary: 'Romantic palettes, candle clusters, and layered florals for a quiet-luxury ceremony.',
      vibe: 'Romantic / Elegant / White & Gold',
      detailCopy:
        'Soft white and blush florals, golden accents, and candlelight layers welcome guests into a romantic ceremony.',
      image: 'images/decoration/wedding/weddingStage/decorationWeddingStage.jpg',
      elements: [
        {
          title: 'Floral Stage & Backdrop',
          description: 'Soft white and blush flowers with golden arches and candle clusters.',
          tags: ['Romantic', 'Elegant', 'White & Gold'],
          image: 'images/decoration/wedding/weddingStage/decorationWeddingStage.jpg'
        },
        {
          title: 'Bride & Groom Seating',
          description: 'Ivory loveseat or twin chairs with draped textiles and low florals.',
          tags: ['Statement seating', 'Ivory', 'Gold piping'],
          image: 'images/decoration/wedding/weddingSeating/decoorationWeddingSeating.jpg'
        },
        {
          title: 'Guest Tables',
          description: 'Ivory linens, layered chargers, taper candles, and petite floral runners.',
          tags: ['Candlelit', 'Layered linens', 'Chargers'],
          image: 'images/decoration/wedding/WeddingGuestTable/decoorationWeddingTable.jpg'
        },
        {
          title: 'Chairs & Chair Covers',
          description: 'Gold chiavari or clean acrylic chairs with soft cushions to match the palette.',
          tags: ['Chiavari', 'Acrylic', 'Neutral cushions'],
          image: 'images/decoration/wedding/weddingChairs/decoorationWeddingChair.jpg'
        },
        {
          title: 'Floral & Entry Stands',
          description: 'Paired floral towers with ambient lanterns guiding arrivals.',
          tags: ['Entry moment', 'Lanterns'],
          image: 'images/decoration/wedding/weddingEntryStand/decoorationWeddingStand.jpg'
        },
        {
          title: 'Cake / Dessert Table',
          description: 'Pedestals, glass cloches, ribboned labels, and fresh florals for the finale.',
          tags: ['Dessert focal', 'Glass details'],
          image: 'images/decoration/wedding/weddingDessertTable/decoorationWeddingDessert.jpg'
        }
      ]
    },
    birthday: {
      name: 'Birthday',
      summary: 'Playful colors, themed props, and photo corners tuned to the guest of honor.',
      vibe: 'Joyful / Personalized / Balloons & Lights',
      detailCopy:
        'Layered backdrops, balloon art, and dessert styling tailored to the honoree with plenty of photo-ready corners.',
      image: 'images/decoration/birthday/decorationBirthday.jpg',
      elements: [
        {
          title: 'Main Backdrop & Name Sign',
          description: 'Themed print or neon signage framed by balloons and soft draping.',
          tags: ['Personalized', 'Backdrop', 'Name sign'],
          image: 'images/decoration/birthday/decorationBirthdayBackdrop.jpg'
        },
        {
          title: 'Cake Table',
          description: 'Styled risers, linen runners, candles, and coordinated serveware.',
          tags: ['Cake focal', 'Layered heights'],
          image: 'images/decoration/birthday/decorationBirthdayCake.jpg'
        },
        {
          title: 'Balloon Stands / Arches',
          description: 'Curated palette balloons with metallic accents and organic shapes.',
          tags: ['Balloons', 'Metallic accents'],
          image: 'images/decoration/birthday/decorationBirthdayballoons.jpg'
        },
        {
          title: 'Kids / Guests Tables & Chairs',
          description: 'Comfortable seating, themed runners, and playful chair tags.',
          tags: ['Kid-friendly', 'Comfort seating'],
          image: 'images/decoration/birthday/decorationBirthdayTable.jpg'
        },
        {
          title: 'Centerpieces',
          description: 'Mini florals, confetti-safe candles, and themed objects.',
          tags: ['Low profile', 'Themed accents'],
          image: 'images/decoration/birthday/decorationBirthdayCenterPieces.jpg'
        },
        {
          title: 'Themed Props & Photo Corner',
          description: 'Photo wall props, instant camera station, and milestone markers.',
          tags: ['Photo-ready', 'Props'],
          image: 'images/decoration/birthday/decorationBirthdayThemedprops.jpg'
        }
      ]
    },
    graduation: {
      name: 'Graduation',
      summary: 'Scholarly motifs, bold backdrops, and a confident certificate stage.',
      vibe: 'Scholarly / Bold / Black & Gold',
      detailCopy:
        'Clean lines, cap-and-scroll motifs, and a confident stage moment to celebrate the graduate.',
      image: 'images/decoration/graduation/graduationProfile.jpg',
      elements: [
        {
          title: 'Stage / Certificate Area',
          description: 'Podium, clean skirting, focused lighting, and branded crest.',
          tags: ['Podium', 'Spotlit'],
          image: 'images/decoration/graduation/decorationgraduationStage.jpg'
        },
        {
          title: 'Grad Photo Wall / Backdrop',
          description: 'Graphic wall with year numbers, metallic accents, and tassel details.',
          tags: ['Photo wall', 'Year numbers'],
          image: 'images/decoration/graduation/decorationgraduationBackground.jpg'
        },
        {
          title: 'Cake & Dessert Table',
          description: 'Tiered stands with scroll and cap toppers, paired with candles.',
          tags: ['Tiered display', 'Gold accents'],
          image: 'images/decoration/graduation/decorationgraduationDessert.jpg'
        },
        {
          title: 'Guest Tables & Centerpieces',
          description: 'Black napkins, gold flatware accents, and crisp center florals.',
          tags: ['Black & gold', 'Crisp lines'],
          image: 'images/decoration/graduation/decorationgraduationGuest.jpg'
        },
        {
          title: 'Themed Props',
          description: 'Caps, scrolls, year numbers, and congratulatory signage.',
          tags: ['Caps & scrolls', 'Signage'],
          image: 'images/decoration/graduation/decorationgraduationThemedprops.png'
        }
      ]
    },
    gender: {
      name: 'Gender Reveal',
      summary: 'Pastel palettes, playful props, and a sweet reveal cue for guests.',
      vibe: 'Playful / Pastel / Reveal-ready',
      detailCopy:
        'Soft pink and blue cues, layered balloons, and a reveal focal point that keeps guests guessing.',
      image: 'images/decoration/GenderReveal/decorationGenderReveal.jpg',
      elements: [
        {
          title: 'Main Reveal Area',
          description: 'Central moment with smoke pop, confetti, or balloon drop.',
          tags: ['Reveal focal', 'Countdown'],
          image: 'images/decoration/GenderReveal/decorationGenderRevealMainArea.jpg'
        },
        {
          title: 'Backdrop & Balloon Setup',
          description: 'Pastel backdrop with organic balloon clusters and ribbons.',
          tags: ['Pastel', 'Balloons'],
          image: 'images/decoration/GenderReveal/decorationGenderRevealBalloons.jpg'
        },
        {
          title: 'Cake & Dessert Table',
          description: 'He/She signage, dual-tone sweets, and candle glow.',
          tags: ['Dual-tone', 'Sweet table'],
          image: 'images/decoration/GenderReveal/decorationGenderRevealDessert.jpg'
        },
        {
          title: 'Tables & Centerpieces',
          description: 'Soft linens, mixed pastel blooms, and keepsake cards.',
          tags: ['Soft linens', 'Pastel florals'],
          image: 'images/decoration/GenderReveal/decorationGenderRevealCenterpiece.jpg'
        },
        {
          title: '"He or She?" Props & Details',
          description: 'Voting board, pins, stickers, and fun reveal clues.',
          tags: ['Interactive', 'Props'],
          image: 'images/decoration/GenderReveal/decorationGenderRevealProps.jpg'
        }
      ]
    },
    ramadan: {
      name: 'Ramadan Gathering',
      summary: 'Lantern light, warm textiles, and generous dessert corners for welcoming nights.',
      vibe: 'Warm / Lantern-lit / Heritage',
      detailCopy:
        'Lanterns, candlelight, and dates corners that honor the spirit of gathering through warm textures and hospitality.',
      image: 'images/decoration/Ramadan/ramadanDecorationLanterns.jpg',
      elements: [
        {
          title: 'Floor Seating / Low Tables',
          description: 'Layered rugs, cushions, or classic tables dressed with runners.',
          tags: ['Layered rugs', 'Low tables'],
          image: 'images/decoration/Ramadan/ramadanDecoraionSeating.jpg'
        },
        {
          title: 'Lanterns & Candles',
          description: 'Mixed brass lanterns, pillar candles, and star accents.',
          tags: ['Lantern clusters', 'Ambient light'],
          image: 'images/decoration/Ramadan/ramadanDecorationLanterns.jpg'
        },
        {
          title: 'Dates & Dessert Corner',
          description: 'Tiered trays, ornate jars, and calligraphed labels for sweets.',
          tags: ['Dates', 'Dessert bar'],
          image: 'images/decoration/Ramadan/ramadanDecorationDates.jpg'
        },
        {
          title: 'Ramadan Backdrop',
          description: 'Crescent and star cutouts with patterned textiles and arches.',
          tags: ['Crescent & star', 'Patterned drape'],
          image: 'images/decoration/Ramadan/decorationRamadanBackdrops.jpg'
        },
        {
          title: 'Centerpieces',
          description: 'Lanterns, crescents, and florals in warm metallic tones.',
          tags: ['Center lantern', 'Warm metallics'],
          image: 'images/decoration/Ramadan/ramadanDecoraionCenterpiece.jpg'
        },
        {
          title: 'Buffet Setup',
          description: 'Coordinated chafers, label stands, and beverage dispensers.',
          tags: ['Service flow', 'Labels'],
          image: 'images/decoration/Ramadan/decorationRamadanBuffet.jpg'
        }
      ]
    },
    madeef: {
      name: 'Madeef Ashouraii',
      summary: 'Traditional madeef hospitality with warm lantern light and generous spreads.',
      vibe: 'Heritage / Warm / Welcoming',
      detailCopy:
        'Low seating, layered textiles, lanterns, and abundant platters styled to honor Ashouraii gatherings.',
      image: 'images/decoration/moharam/decorationMaharam.jpg',
      elements: [
        {
          title: 'Welcome & Reception',
          description: 'Entrance styled with lanterns, incense, and welcoming signage.',
          tags: ['Lanterns', 'Welcome'],
          image: 'images/decoration/moharam/decorationMaharam.jpg'
        },
        {
          title: 'Low Seating & Textiles',
          description: 'Layered rugs, cushions, and low tables for shared hospitality.',
          tags: ['Low seating', 'Layered rugs'],
          image: 'images/decoration/moharam/decorationMaharam.jpg'
        },
        {
          title: 'Buffet & Platters',
          description: 'Generous platters with coordinated serveware and labels.',
          tags: ['Buffet', 'Serveware'],
          image: 'images/decoration/moharam/decorationMaharam.jpg'
        }
      ]
    }
  };

  const order = ['wedding', 'birthday', 'graduation', 'gender', 'ramadan', 'madeef'];
  const cardMap = new Map();
  let currentKey = null;

  const selectEvent = (key, { scroll = true } = {}) => {
    if (!events[key]) return;
    currentKey = key;
    cardMap.forEach((card, cardKey) => card.classList.toggle('is-active', cardKey === currentKey));
    const event = events[currentKey];
    if (selectedEyebrow) selectedEyebrow.textContent = event.name;
    if (detailTitle) detailTitle.textContent = `${event.name} decoration elements`;
    if (detailCopy) detailCopy.textContent = event.detailCopy;
    if (selectedChip) selectedChip.textContent = event.vibe;
    if (detailSection) detailSection.classList.remove('is-hidden');
    renderDetails();
    if (detailSection && scroll) {
      detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderEventCards = () => {
    eventGrid.innerHTML = '';
    cardMap.clear();
    order.forEach((key) => {
      const event = events[key];
      const card = document.createElement('article');
      card.className = 'decor-event-card';
      card.dataset.eventKey = key;
      card.style.backgroundImage = `url('${event.image}')`;
      card.innerHTML = `
        <div class="decor-event-photo" style="background-image:url('${event.image}')"></div>
        <div class="decor-event-meta">
          <h3>${event.name}</h3>
          <button class="decor-cta" type="button">View decoration</button>
        </div>
      `;
      card.addEventListener('click', () => selectEvent(key));
      cardMap.set(key, card);
      eventGrid.appendChild(card);
    });
  };

  const slugify = (value = '') =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const renderDetails = () => {
    const event = events[currentKey];
    if (!event) return;
    detailGrid.innerHTML = '';
    event.elements.forEach((item) => {
      const card = document.createElement('article');
      const slug = slugify(item.title);
      card.className = 'decor-detail-card';
      card.innerHTML = `
        <a class="decor-detail-link" href="decoration-gallery.html?event=${currentKey}&slug=${slug}">
          <div class="decor-detail-photo" style="background-image:url('${item.image}')"></div>
          <div class="decor-detail-body">
            <h3>${item.title}</h3>
            <span class="decor-more">View full gallery</span>
          </div>
        </a>
      `;
      detailGrid.appendChild(card);
    });
  };

  renderEventCards();
});
