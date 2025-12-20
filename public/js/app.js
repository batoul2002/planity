// Basic front-end wiring to call the backend API
// Assumes this site is served by the same Express server

(function () {
  const API_BASE = window.location.origin + '/api/v1';

  const sel = (q) => document.querySelector(q);
  const $ = sel;

  function getToken() {
    return localStorage.getItem('token');
  }

  function setAuth(token, user) {
    localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    if (user && user.role) localStorage.setItem('role', user.role);
  }

  function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function apiFetch(path, options = {}) {
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
  }

  function syncAuthNav() {
    const loginLink = document.querySelector('a[href="login.html"]');
    if (!loginLink) return;
    if (getToken()) {
      loginLink.textContent = 'Logout';
      loginLink.href = '#';
      loginLink.onclick = (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = 'index.html';
      };
    } else {
      loginLink.textContent = 'Log In';
      loginLink.href = 'login.html';
      loginLink.onclick = null;
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = (document.getElementById('email') || {}).value?.trim();
    const password = (document.getElementById('password') || {}).value;
    if (!email || !password) return alert('Email and password are required');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!data.success || !data.token) throw new Error('Login failed');
      setAuth(data.token, data.user);
      const role = (data.user && data.user.role) || 'client';
      if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else if (role === 'planner') {
        window.location.href = 'planner/dashboard.html';
      } else {
        window.location.href = 'index.html';
      }
    } catch (err) {
      const message = err?.message?.toLowerCase?.() || '';
      if (message.includes('invalid') || message.includes('credential') || message.includes('password')) {
        alert('Invalid email or password. Try again.');
      } else {
        alert(err.message || 'Login failed');
      }
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = (document.getElementById('name') || {}).value?.trim();
    const email = (document.getElementById('email') || {}).value?.trim();
    const password = (document.getElementById('password') || {}).value;
    const phone = (document.getElementById('phone') || {}).value?.trim();
    const allowedDomains = ['@gmail.com', '@mu.edu.lb', '@live.com', '@hotmail.com', '@me.com'];

    if (!name || !email || !password || typeof password === 'undefined') {
      alert('Please fill all the fields.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be more than 6 characters.');
      return;
    }

    if (!allowedDomains.some((domain) => email.toLowerCase().endsWith(domain))) {
      alert('Email must end with @gmail.com, @mu.edu.lb, @live.com, @hotmail.com, or @me.com.');
      return;
    }
    try {
      const body = { name, email, password, phone, role: 'client' };
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!data.success) throw new Error(data.message || 'Registration failed');
      alert('Registration successful. Please verify your email before logging in.');
      window.location.href = 'login.html';
    } catch (err) {
      alert(err.message || 'Registration failed');
    }
  }

  async function handleForgotPassword() {
    const email = (document.getElementById('email') || {}).value?.trim();
    if (!email) {
      alert('Please enter your email first, then click Forgot password.');
      return;
    }
    try {
      const res = await apiFetch('/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      alert(res.message || 'If this email exists, a reset link has been sent.');
    } catch (err) {
      alert(err.message || 'Unable to request reset right now.');
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    const email = (document.getElementById('reset-email') || {}).value?.trim();
    const password = (document.getElementById('reset-password') || {}).value;
    const confirm = (document.getElementById('reset-password-confirm') || {}).value;
    const token = (document.getElementById('reset-token') || {}).value?.trim();

    if (!email || !password || !confirm || !token) {
      alert('Please fill all the fields.');
      return;
    }
    if (password.length < 6) {
      alert('Password must be more than 6 characters.');
      return;
    }
    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword: password })
      });
      alert(res.message || 'Password reset successful. Please log in.');
      window.location.href = 'login.html';
    } catch (err) {
      alert(err.message || 'Unable to reset password. Check your link or try again.');
    }
  }

  function prefillResetFields() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    const emailEl = document.getElementById('reset-email');
    const tokenEl = document.getElementById('reset-token');
    if (emailEl && email) emailEl.value = email;
    if (tokenEl && token) tokenEl.value = token;
  }

  let CURRENT_USER = null;

  async function renderAccount() {
    const container = document.getElementById('account-details');
    if (!container) return; // not on account page
    const token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    try {
      const me = await apiFetch('/auth/me', { method: 'GET' });
      const user = me.user || {};
      CURRENT_USER = user;
      // Fill header identity if present
      const nameEl = document.getElementById('account-name');
      const emailEl = document.getElementById('account-email');
      const roleEl = document.getElementById('account-role');
      const avatarEl = document.getElementById('account-avatar');
      if (nameEl) nameEl.textContent = user.name || '';
      if (emailEl) emailEl.textContent = user.email || '';
      if (roleEl) roleEl.textContent = user.role || '';
      if (avatarEl) {
        const initial = (user.name?.trim?.()[0] || user.email?.trim?.()[0] || 'U').toUpperCase();
        avatarEl.textContent = initial;
      }
      container.innerHTML = `
        <div class="account-row"><strong>Name:</strong> <span>${user.name || ''}</span></div>
        <div class="account-row"><strong>Email:</strong> <span>${user.email || ''}</span></div>
        <div class="account-row"><strong>Role:</strong> <span>${user.role || ''}</span></div>
        <div class="account-row"><strong>Phone:</strong> <span>${user.phone || ''}</span></div>
      `;
    } catch (err) {
      clearAuth();
      window.location.href = 'login.html';
    }
  }

  function toggleEditProfile(show) {
    const wrap = document.getElementById('editProfileWrap');
    if (!wrap) return;
    if (typeof show === 'boolean') {
      wrap.classList.toggle('hidden', !show);
    } else {
      wrap.classList.toggle('hidden');
    }
  }

  function fillEditProfileForm() {
    const u = CURRENT_USER || JSON.parse(localStorage.getItem('user') || '{}');
    const name = document.getElementById('ep_name');
    const phone = document.getElementById('ep_phone');
    const locale = document.getElementById('ep_locale');
    const avatar = document.getElementById('ep_avatar');
    if (name) name.value = u.name || '';
    if (phone) phone.value = u.phone || '';
    if (locale) locale.value = u.locale || '';
    if (avatar) avatar.value = u.avatar || '';
  }

  async function handleEditProfileSubmit(e) {
    e.preventDefault();
    const name = (document.getElementById('ep_name') || {}).value?.trim();
    const phone = (document.getElementById('ep_phone') || {}).value?.trim();
    const locale = (document.getElementById('ep_locale') || {}).value;
    const avatar = (document.getElementById('ep_avatar') || {}).value?.trim();

    const body = {};
    if (name) body.name = name;
    if (typeof phone !== 'undefined') body.phone = phone; // allow empty to clear
    if (locale) body.locale = locale; // optional
    if (typeof avatar !== 'undefined') body.avatar = avatar; // allow empty to clear

    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
      if (!res.success) throw new Error(res.message || 'Update failed');
      const me = await apiFetch('/auth/me', { method: 'GET' });
      const user = me.user || {};
      localStorage.setItem('user', JSON.stringify(user));
      await renderAccount();
      toggleEditProfile(false);
      alert('Profile updated');
    } catch (err) {
      alert(err.message || 'Unable to update profile');
    }
  }

  function setupDetailCarousel() {
    const carousels = document.querySelectorAll('.hero-carousel');
    carousels.forEach((carousel) => {
      const track = carousel.querySelector('.carousel-track');
      const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
      if (!track || slides.length <= 1) {
        carousel.classList.add('single');
        return;
      }

      let currentIndex = 0;

      const prevBtn = document.createElement('button');
      prevBtn.className = 'carousel-nav prev';
      prevBtn.type = 'button';
      prevBtn.setAttribute('aria-label', 'Previous slide');
      prevBtn.innerHTML = '&#10094;';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'carousel-nav next';
      nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', 'Next slide');
      nextBtn.innerHTML = '&#10095;';

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'carousel-dots';

      const dots = slides.map((_, idx) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show slide ${idx + 1}`);
        dot.addEventListener('click', () => goToSlide(idx));
        dotsContainer.append(dot);
        return dot;
      });

      function goToSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
      }

      prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
      nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

      carousel.append(prevBtn, nextBtn, dotsContainer);
    });
  }

  async function init() {
    syncAuthNav();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) forgotBtn.addEventListener('click', handleForgotPassword);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);

    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
      prefillResetFields();
      resetForm.addEventListener('submit', handleResetSubmit);
    }

    await renderAccount();
    setupDetailCarousel();


    // Account page: logout button inside card
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = 'index.html';
      });
    }

    // Edit profile toggle + submit
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('editProfileCancel');
    const editForm = document.getElementById('editProfileForm');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        fillEditProfileForm();
        toggleEditProfile(true);
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => toggleEditProfile(false));
    }
    if (editForm) {
      editForm.addEventListener('submit', handleEditProfileSubmit);
    }

    // Removed redirect from event-type cards to services.html

    // Navbar dropdowns: allow click to toggle menus (works on mobile)
    (function setupDropdowns() {
      const dropdowns = Array.from(document.querySelectorAll('li.dropdown'));
      if (!dropdowns.length) return;
      dropdowns.forEach((dd) => {
        const btn = dd.querySelector('.dropbtn');
        const menu = dd.querySelector('.dropdown-menu');
        if (!btn || !menu) return;
        btn.addEventListener('click', (e) => {
          // On wider screens let the link navigate (so buttons stay clickable)
          if (window.innerWidth >= 960) {
            return;
          }
          // Mobile / tablet: toggle dropdown on tap
          e.preventDefault();
          dropdowns.forEach((d2) => {
            if (d2 === dd) return;
            const m2 = d2.querySelector('.dropdown-menu');
            if (m2) m2.classList.remove('show');
            d2.classList.remove('open');
          });
          menu.classList.toggle('show');
          dd.classList.toggle('open');
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (e.target.closest('li.dropdown')) return;
        document.querySelectorAll('.dropdown-menu.show').forEach((m) => m.classList.remove('show'));
        document.querySelectorAll('li.dropdown.open').forEach((d) => d.classList.remove('open'));
      });
    })();
    // About page: subtle parallax on hero collage
    (function setupParallax() {

    // About page: stats counters + scroll-reveal + gallery lightbox
    (function setupAboutEnhancements() {
      const isAbout = document.querySelector('.about-hero');
      if (!isAbout) return;

      // Scroll-reveal
      const srItems = Array.from(document.querySelectorAll('.sr-item'));
      if (srItems.length) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('sr-revealed');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.12 });
        srItems.forEach((el) => obs.observe(el));
      }

      // Counters
      const counters = Array.from(document.querySelectorAll('.stat-num'));
      if (counters.length) {
        const seen = new WeakSet();
        const cObs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            if (seen.has(el)) return;
            seen.add(el);
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            const start = performance.now();
            const duration = 900 + Math.random() * 500; // 0.9-1.4s
            function tick(now) {
              const t = Math.min(1, (now - start) / duration);
              const eased = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // easeInOutQuad
              const val = Math.round(target * eased);
              el.textContent = val.toString();
              if (t < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
        }, { threshold: 0.4 });
        counters.forEach((el) => cObs.observe(el));
      }

      // Lightbox
      const lb = document.querySelector('.lightbox');
      const lbImg = lb ? lb.querySelector('.lb-img') : null;
      const lbClose = lb ? lb.querySelector('.lb-close') : null;
      const thumbs = Array.from(document.querySelectorAll('.gallery-grid .g-item'));
      if (lb && lbImg && lbClose && thumbs.length) {
        function open(src) {
          lbImg.src = src;
          lb.removeAttribute('hidden');
          lb.focus();
        }
        function close() {
          lb.setAttribute('hidden', '');
          lbImg.removeAttribute('src');
        }
        thumbs.forEach((a) => {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const src = a.getAttribute('data-src');
            if (src) open(src);
          });
        });
        lbClose.addEventListener('click', close);
        lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hasAttribute('hidden')) close(); });
      }
    })();
      const hero = document.querySelector('.about-hero');
      const c1 = document.querySelector('.ah-collage .col-1');
      const c2 = document.querySelector('.ah-collage .col-2');
      const c3 = document.querySelector('.ah-collage .col-3');
      if (!hero || !c1 || !c2 || !c3) return;

      let ticking = false;
      function onScroll() {
        if (window.innerWidth < 720) return; // keep static on small screens
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = hero.getBoundingClientRect();
          const vh = Math.max(window.innerHeight, 1);
          // progress: 0 at top of viewport, to ~1 when hero bottom hits top
          const progress = Math.min(1, Math.max(0, (0 - rect.top) / (rect.height || 1)));
          // Translate at different rates for depth
          const t1 = progress * 18; // slow
          const t2 = progress * 30; // medium
          const t3 = progress * 42; // fast
          c1.style.transform = `translate3d(0, ${t1}px, 0)`;
          c2.style.transform = `translate3d(0, ${t2}px, 0)`;
          c3.style.transform = `translate3d(0, ${t3}px, 0)`;
          ticking = false;
        });
      }
      // Init and bind, passive listener for perf
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    })();

    // About page: testimonials auto-advance (fade)
    (function setupTestimonials() {
      const root = document.querySelector('.about-testimonials');
      const grid = root ? root.querySelector('.t-grid') : null;
      const cards = grid ? Array.from(grid.querySelectorAll('.t-card')) : [];
      if (!root || !grid || cards.length < 2) return;

      let idx = 0;
      let timer = null;

      function setActive(i) {
        cards.forEach((c, j) => c.classList.toggle('active', j === i));
      }

      function start() {
        stop();
        setActive(idx);
        timer = setInterval(() => {
          idx = (idx + 1) % cards.length;
          setActive(idx);
        }, 4000);
      }

      function stop() {
        if (timer) clearInterval(timer);
        timer = null;
      }

      function applyMode() {
        const useSlider = window.innerWidth < 960; // slider on mobile/tablet
        root.classList.toggle('has-slider', useSlider);
        // ensure an active card always exists
        if (!cards.some(c => c.classList.contains('active'))) setActive(idx);
      }

      applyMode();
      start();
      window.addEventListener('resize', applyMode);
      // Pause on hover for accessibility
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', start);
    })();

    // servic.html: reveal + 3D tilt hover and CTA smooth scroll
    (function setupServicPage() {
      const onPage = document.querySelector('.svx-page');
      if (!onPage) return;

      // Scroll reveal for .sr-item
      const items = Array.from(document.querySelectorAll('.sr-item'));
      if (items.length) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('sr-revealed');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.12 });
        items.forEach((el) => obs.observe(el));
      }

      // CTA scroll
      document.querySelectorAll('.svx-cta[data-scroll]')
        .forEach((btn) => btn.addEventListener('click', (e) => {
          const sel = btn.getAttribute('data-scroll');
          const target = sel && document.querySelector(sel);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }));

      // 3D tilt on cards (no libs)
      const maxTilt = 8; // degrees
      document.querySelectorAll('.svx-card[data-tilt]').forEach((card) => {
        let rect = null;
        function calc(e) {
          if (!rect) rect = card.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) / (rect.width / 2);
          const dy = (e.clientY - cy) / (rect.height / 2);
          const rx = (+dy) * maxTilt; // invert for natural tilt
          const ry = (-dx) * maxTilt;
          card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        }
        function reset() {
          rect = null;
          card.style.transform = '';
        }
        card.addEventListener('mousemove', calc);
        card.addEventListener('mouseleave', reset);
      });

      // Hero carousel parallax
      const heroCarousel = document.querySelector('.svx-hero-carousel');
      if (heroCarousel) {
        const updateParallax = () => {
          const offset = Math.min(window.scrollY * 0.08, 40);
          heroCarousel.style.setProperty('--hero-parallax', `${offset}px`);
        };
        updateParallax();
        window.addEventListener('scroll', updateParallax, { passive: true });
      }

      // Hero stat count-up
      const statCounters = document.querySelectorAll('.svx-count[data-count]');
      if (statCounters.length) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            obs.unobserve(el);
            animateCount(el);
          });
        }, { threshold: 0.6 });
        statCounters.forEach((el) => counterObserver.observe(el));
      }

  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    if (Number.isNaN(target)) return;
    const suffix = el.dataset.suffix || '';
    const duration = Number(el.dataset.duration || 1500);
    const start = performance.now();
    const initial = 0;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(initial + (target - initial) * progress);
      el.textContent = value + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(tick);
  }

  // Floating CTA offset so it doesn't cover footer
  const fab = document.querySelector('.svx-fab');
  if (fab) {
    const footer = document.querySelector('footer');
    if (footer) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fab.classList.add('svx-fab-hide');
          } else {
            fab.classList.remove('svx-fab-hide');
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
      observer.observe(footer);
    }
  }

})();

    // Index page: scroll-reveal setup
    (function setupIndexReveal() {
      const intro = document.getElementById('intro');
      const onIndex = !!intro;
      if (!onIndex) return;

      const toReveal = [];
      const introImages = document.querySelector('.intro-images');
      const introContent = document.querySelector('.intro-content');
      if (introImages) { introImages.classList.add('sr-item'); introImages.style.setProperty('--sr-delay', '.05s'); toReveal.push(introImages); }
      if (introContent) { introContent.classList.add('sr-item'); introContent.style.setProperty('--sr-delay', '.10s'); toReveal.push(introContent); }

      document.querySelectorAll('#guest-intro .gi-serif, #guest-intro .gi-script, #guest-intro .gi-copy').forEach((el, i) => {
        el.classList.add('sr-item');
        el.style.setProperty('--sr-delay', (0.04 * i).toFixed(2) + 's');
        toReveal.push(el);
      });

      const cards = Array.from(document.querySelectorAll('.guest-card'));
      cards.forEach((card, i) => {
        card.classList.add('sr-item');
        card.style.setProperty('--sr-delay', (0.06 * (i % 3)).toFixed(2) + 's');
        toReveal.push(card);
      });

      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('sr-revealed');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      toReveal.forEach((el) => obs.observe(el));
    })();

    // Email verification flow (verify-email or verify-email.html)
    if (window.location.pathname.endsWith('/verify-email') || window.location.pathname.endsWith('/verify-email.html')) {
      const el = document.getElementById('verify-status');
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token') || '';
      const email = params.get('email') || '';
      if (!token) {
        if (el) el.textContent = 'Missing verification token.';
        return;
      }
      try {
        const data = await apiFetch('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token, email })
        });
        if (el) el.textContent = 'Your email has been verified. Redirecting to login...';
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      } catch (err) {
        if (el) el.textContent = (err && err.message) ? err.message : 'Verification failed';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Floating CTA offset so it doesn't cover footer
  const fab = document.querySelector('.svx-fab');
  if (fab) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          fab.classList.add('svx-fab-hide');
        } else {
          fab.classList.remove('svx-fab-hide');
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    const footer = document.querySelector('footer');
    if (footer) {
      observer.observe(footer);
    }
  }

  // Venue hero carousel
  const venueCarousel = document.querySelector('[data-venue-carousel]');
  if (venueCarousel) {
    const track = venueCarousel.querySelector('[data-carousel-track]');
    const slides = Array.from(track?.querySelectorAll('.venue-carousel-slide') || []);
    const prevBtn = venueCarousel.querySelector('[data-carousel-prev]');
    const nextBtn = venueCarousel.querySelector('[data-carousel-next]');
    const dotsWrap = venueCarousel.querySelector('[data-carousel-dots]');
    let currentSlide = 0;
    const AUTO_DELAY = 7000;
    let autoTimer;

    function syncSlides() {
      slides.forEach((slide, idx) => {
        const isActive = idx === currentSlide;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle('is-active', idx === currentSlide);
      });
    }

    function goToSlide(index, manual = false) {
      if (!slides.length) return;
      currentSlide = (index + slides.length) % slides.length;
      syncSlides();
      if (manual) restartAutoplay();
    }

    function restartAutoplay() {
      if (autoTimer) clearInterval(autoTimer);
      if (slides.length < 2) return;
      autoTimer = setInterval(() => goToSlide(currentSlide + 1), AUTO_DELAY);
    }

    function buildDots() {
      if (!dotsWrap) return [];
      dotsWrap.innerHTML = '';
      return slides.map((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
        dot.dataset.index = String(idx);
        dotsWrap.appendChild(dot);
        dot.addEventListener('click', () => goToSlide(idx, true));
        return dot;
      });
    }

    const dots = buildDots();

    prevBtn?.addEventListener('click', () => goToSlide(currentSlide - 1, true));
    nextBtn?.addEventListener('click', () => goToSlide(currentSlide + 1, true));

    venueCarousel.addEventListener('mouseenter', () => {
      if (autoTimer) clearInterval(autoTimer);
    });
    venueCarousel.addEventListener('mouseleave', restartAutoplay);

    syncSlides();
    restartAutoplay();
  }

  // South elite slider
  const southSlider = document.querySelector('[data-south-slider]');
  if (southSlider) {
    const southTrack = southSlider.querySelector('[data-south-track]');
    const southSlides = Array.from(southTrack?.children || []);
    const southPrev = southSlider.querySelector('[data-south-prev]');
    const southNext = southSlider.querySelector('[data-south-next]');
    let southIndex = 0;
    let southSlideWidth = 0;
    let southSlideGap = 0;
    let southTimer;
    const SOUTH_DELAY = 3000;

    const computeSouthMetrics = () => {
      if (!southSlides.length) return;
      const bounds = southSlides[0].getBoundingClientRect();
      southSlideWidth = bounds.width;
      const styles = window.getComputedStyle(southTrack);
      southSlideGap = parseFloat(styles.columnGap || styles.gap || '0');
      southTrack.style.transform = `translateX(-${southIndex * (southSlideWidth + southSlideGap)}px)`;
    };

    const goToSouthSlide = (index, manual = false) => {
      if (!southSlides.length) return;
      southIndex = (index + southSlides.length) % southSlides.length;
      const offset = southIndex * (southSlideWidth + southSlideGap);
      southTrack.style.transform = `translateX(-${offset}px)`;
      if (manual) restartSouthAuto();
    };

    const restartSouthAuto = () => {
      if (southTimer) clearInterval(southTimer);
      if (southSlides.length < 2) return;
      southTimer = setInterval(() => goToSouthSlide(southIndex + 1), SOUTH_DELAY);
    };

    southPrev?.addEventListener('click', () => goToSouthSlide(southIndex - 1, true));
    southNext?.addEventListener('click', () => goToSouthSlide(southIndex + 1, true));

    southSlider.addEventListener('mouseenter', () => {
      if (southTimer) clearInterval(southTimer);
    });
    southSlider.addEventListener('mouseleave', restartSouthAuto);

    let southResizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(southResizeTimeout);
      southResizeTimeout = setTimeout(computeSouthMetrics, 150);
    });

    computeSouthMetrics();
    setTimeout(computeSouthMetrics, 120);
    restartSouthAuto();
  }

  // Bekaa elite slider
  const bekaaSlider = document.querySelector('[data-bekaa-slider]');
  if (bekaaSlider) {
    const bekaaTrack = bekaaSlider.querySelector('[data-bekaa-track]');
    const bekaaSlides = Array.from(bekaaTrack?.children || []);
    const bekaaPrev = bekaaSlider.querySelector('[data-bekaa-prev]');
    const bekaaNext = bekaaSlider.querySelector('[data-bekaa-next]');
    let bekaaIndex = 0;
    let bekaaSlideWidth = 0;
    let bekaaSlideGap = 0;
    let bekaaTimer;
    const BEKAA_DELAY = 3200;

    const computeBekaaMetrics = () => {
      if (!bekaaSlides.length) return;
      const rect = bekaaSlides[0].getBoundingClientRect();
      bekaaSlideWidth = rect.width;
      const styles = window.getComputedStyle(bekaaTrack);
      bekaaSlideGap = parseFloat(styles.columnGap || styles.gap || '0');
      bekaaTrack.style.transform = `translateX(-${bekaaIndex * (bekaaSlideWidth + bekaaSlideGap)}px)`;
    };

    const goToBekaaSlide = (index, manual = false) => {
      if (!bekaaSlides.length) return;
      bekaaIndex = (index + bekaaSlides.length) % bekaaSlides.length;
      const offset = bekaaIndex * (bekaaSlideWidth + bekaaSlideGap);
      bekaaTrack.style.transform = `translateX(-${offset}px)`;
      if (manual) restartBekaaAuto();
    };

    const restartBekaaAuto = () => {
      if (bekaaTimer) clearInterval(bekaaTimer);
      if (bekaaSlides.length < 2) return;
      bekaaTimer = setInterval(() => goToBekaaSlide(bekaaIndex + 1), BEKAA_DELAY);
    };

    bekaaPrev?.addEventListener('click', () => goToBekaaSlide(bekaaIndex - 1, true));
    bekaaNext?.addEventListener('click', () => goToBekaaSlide(bekaaIndex + 1, true));

    bekaaSlider.addEventListener('mouseenter', () => {
      if (bekaaTimer) clearInterval(bekaaTimer);
    });
    bekaaSlider.addEventListener('mouseleave', restartBekaaAuto);

    let bekaaResizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(bekaaResizeTimeout);
      bekaaResizeTimeout = setTimeout(computeBekaaMetrics, 150);
    });

    computeBekaaMetrics();
    setTimeout(computeBekaaMetrics, 120);
    restartBekaaAuto();
  }

  // Venue listing filters
  const venueFilterBar = document.querySelector('.venue-filter-bar');
  if (venueFilterBar && document.querySelector('.venue-card')) {
    const regionSelect = venueFilterBar.querySelector('#venue-region');
    const settingSelect = venueFilterBar.querySelector('#venue-setting');
    const budgetInput = venueFilterBar.querySelector('#venue-budget');
    const filterBtn = venueFilterBar.querySelector('[data-venue-filter]');
    const venueCards = Array.from(document.querySelectorAll('.venue-card'));

    const applyVenueFilters = () => {
      const region = (regionSelect?.value || 'all').toLowerCase();
      const setting = (settingSelect?.value || 'all').toLowerCase();
      const maxBudget = parseInt(budgetInput?.value, 10);

      venueCards.forEach((card) => {
        const cardRegion = (card.dataset.region || '').toLowerCase();
        const cardSetting = (card.dataset.setting || 'all').toLowerCase();
        const cardBudget = parseInt(card.dataset.budget || '0', 10);
        const regionMatch = region === 'all' || region === cardRegion;
        const settingMatch = setting === 'all' || setting === cardSetting;
        const budgetMatch = Number.isNaN(maxBudget) ? true : cardBudget <= maxBudget;
        card.style.display = regionMatch && budgetMatch && settingMatch ? '' : 'none';
      });
    };

    filterBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      applyVenueFilters();
    });

    applyVenueFilters();
  }

  // Expose shared helpers for other pages (favorites, detail, etc.)
  window.PlanityAPI = {
    apiFetch,
    getToken,
    setAuth,
    clearAuth,
    syncAuthNav
  };
})();
