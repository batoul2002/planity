(function () {
  const { apiFetch, syncAuthNav } = window.PlanityAPI || {};
  const isAdminDash = document.querySelector('.admin-page');
  const isAdminEvent = document.querySelector('.admin-event-page');

  if (typeof syncAuthNav === 'function') syncAuthNav();

  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return iso;
    }
  };

  const safeFetch = async (path, opts = {}) => {
    if (typeof apiFetch !== 'function') throw new Error('API not ready');
    const normalize = (p) => {
      if (!p) return '/';
      if (p.startsWith('http')) return p; // allow absolute URLs if ever needed
      const trimmed = p.startsWith('/api/v1') ? p.replace('/api/v1', '') : p;
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    };
    return apiFetch(normalize(path), opts);
  };

  const renderStats = (stats) => {
    const el = document.getElementById('adminStats');
    if (!el || !stats) return;
    el.innerHTML = `
      <div class="planner-stat"><p>Users</p><strong>${stats.totalUsers ?? 0}</strong></div>
      <div class="planner-stat"><p>Planners</p><strong>${stats.planners ?? 0}</strong></div>
      <div class="planner-stat"><p>Events</p><strong>${stats.events ?? 0}</strong></div>
      <div class="planner-stat"><p>Vendors</p><strong>${stats.vendors ?? 0}</strong></div>
    `;
  };

  const renderPending = (events, planners) => {
    const wrap = document.getElementById('pendingList');
    const count = document.getElementById('pendingCount');
    if (!wrap) return;
    const list = events || [];
    if (count) count.textContent = `${list.length} pending`;
    if (!list.length) {
      wrap.innerHTML = '<p class="muted">No pending requests.</p>';
      return;
    }
    wrap.innerHTML = list.map((ev) => {
      const plannerOptions = (planners || [])
        .filter(p => p.isActive && !p.deletedAt)
        .map(p => `<option value="${p._id}">${p.name} (${p.email})</option>`)
        .join('');
      return `
        <article class="planner-row" data-ev="${ev._id}">
          <div>
            <h4>${ev.type || 'Event'}</h4>
            <p class="muted">${fmtDate(ev.date)} · ${ev.location || 'Location TBD'}</p>
            <p class="muted">Client: ${ev.client?.name || ''} (${ev.client?.email || ''})</p>
            <p class="muted">Budget: $${Number(ev.budget || 0).toLocaleString()}</p>
          </div>
          <div class="planner-row-actions">
            <select class="planner-select" data-assign-select>
              <option value="">Select planner</option>
              ${plannerOptions}
            </select>
            <button type="button" class="planner-cta" data-assign-btn>Assign</button>
            <a class="planner-ghost" href="admin-event.html?eventId=${ev._id}">View</a>
          </div>
        </article>
      `;
    }).join('');
  };

  const renderEvents = (events) => {
    const wrap = document.getElementById('eventsList');
    const count = document.getElementById('eventsCount');
    if (!wrap) return;
    const list = events || [];
    if (count) count.textContent = `${list.length} events`;
    if (!list.length) {
      wrap.innerHTML = '<p class="muted">No events found.</p>';
      return;
    }
    wrap.innerHTML = list.map((ev) => `
      <article class="planner-row">
        <div>
          <h4>${ev.type || 'Event'}</h4>
          <p class="muted">${fmtDate(ev.date)} · ${ev.location || 'Location TBD'}</p>
          <p class="muted">Client: ${ev.client?.name || ''}</p>
          <p class="muted">Planner: ${ev.planner?.name || 'Unassigned'}</p>
        </div>
        <div class="planner-row-meta">
          <span class="pill soft">${ev.status}</span>
          <span class="pill ghost">Budget: $${Number(ev.budget || 0).toLocaleString()}</span>
        </div>
        <div class="planner-row-actions">
          <a class="planner-ghost" href="admin-event.html?eventId=${ev._id}">Open</a>
        </div>
      </article>
    `).join('');
  };

  const renderPlanners = (planners) => {
    const el = document.getElementById('plannerList');
    if (!el) return;
    const list = (planners || []).filter(p => !p.deletedAt);
    el.innerHTML = list.map(p => `
      <li>
        <span>${p.name}</span>
        <span class="pill ghost ${p.isActive ? '' : 'muted'}">${p.isActive ? 'Active' : 'Inactive'}</span>
      </li>
    `).join('') || '<li class="muted">No planners</li>';
  };

  const renderAdminPayments = (events) => {
    const el = document.getElementById('adminPayments');
    if (!el) return;
    const items = (events || []).slice(0, 5);
    el.innerHTML = items.map(ev => `
      <li>
        <span>${ev.type || 'Event'}</span>
        <span class="pill ghost">${ev.status || ''}</span>
      </li>
    `).join('') || '<li class="muted">No payment data</li>';
  };

  const bindAssign = (planners) => {
    const wrap = document.getElementById('pendingList');
    if (!wrap) return;
    wrap.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-assign-btn]');
      if (!btn) return;
      const card = btn.closest('[data-ev]');
      const select = card?.querySelector('[data-assign-select]');
      const eventId = card?.dataset.ev;
      const plannerId = select?.value;
      if (!plannerId) {
        alert('Select a planner first.');
        return;
      }
      try {
        await safeFetch(`/api/v1/admin/events/${eventId}/assign`, {
          method: 'POST',
          body: JSON.stringify({ plannerId })
        });
        btn.textContent = 'Assigned';
        btn.disabled = true;
        if (card) card.style.opacity = '0.6';
      } catch (err) {
        alert(err?.message || 'Assignment failed');
      }
    });
  };

  const loadDashboard = async () => {
    try {
      const [statsRes, pendingRes, eventsRes, plannersRes] = await Promise.all([
        safeFetch('/api/v1/admin/stats'),
        safeFetch('/api/v1/admin/event-requests'),
        safeFetch('/api/v1/admin/events'),
        safeFetch('/api/v1/admin/planners')
      ]);
      renderStats(statsRes.data);
      renderPending(pendingRes.data, plannersRes.data);
      renderEvents(eventsRes.data);
      renderPlanners(plannersRes.data);
      renderAdminPayments(eventsRes.data);
      bindAssign(plannersRes.data);
    } catch (err) {
      console.error(err);
      const wrap = document.getElementById('pendingList');
      if (wrap) wrap.innerHTML = `<p class="muted">${err?.message || 'Unable to load admin data'}</p>`;
    }
  };

  const getEventId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId');
  };

  const renderEventDetail = (payload) => {
    if (!payload) return;
    const { event, messages } = payload;
    const statusEl = document.getElementById('admStatus');
    const titleEl = document.getElementById('admTitle');
    const metaEl = document.getElementById('admMeta');
    const tagsEl = document.getElementById('admTags');
    if (statusEl) statusEl.textContent = event.status;
    if (titleEl) titleEl.textContent = event.type || 'Event';
    if (metaEl) metaEl.textContent = `${fmtDate(event.date)} · ${event.location || ''}`;
    if (tagsEl) {
      tagsEl.innerHTML = `
        <span class="pill soft">Budget: $${Number(event.budget || 0).toLocaleString()}</span>
        <span class="pill soft">Guests: ${event.guests || 'N/A'}</span>
      `;
    }
    const clientEl = document.getElementById('admClient');
    if (clientEl) {
      clientEl.innerHTML = `
        <li><strong>Name</strong><span>${event.client?.name || ''}</span></li>
        <li><strong>Email</strong><span>${event.client?.email || ''}</span></li>
        <li><strong>Phone</strong><span>${event.client?.phone || ''}</span></li>
      `;
    }
    const plannerEl = document.getElementById('admPlanner');
    if (plannerEl) {
      plannerEl.innerHTML = `
        <li><strong>Name</strong><span>${event.planner?.name || 'Unassigned'}</span></li>
        <li><strong>Email</strong><span>${event.planner?.email || ''}</span></li>
        <li><strong>Phone</strong><span>${event.planner?.phone || ''}</span></li>
      `;
    }
    const notesEl = document.getElementById('admNotes');
    if (notesEl) {
      const scrubNotes = (text) => {
        if (!text) return '';
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const filtered = lines.filter((line) => {
          const lower = line.toLowerCase();
          return !lower.startsWith('client:') &&
            !lower.startsWith('email:') &&
            !lower.startsWith('phone:') &&
            !lower.startsWith('designation:') &&
            !lower.startsWith('requested status:') &&
            !lower.startsWith('client images:');
        });
        return (filtered.join('\n') || '').trim();
      };
      const cleanedNotes = scrubNotes(event.notes);
      notesEl.textContent = cleanedNotes || 'No notes';
    }
    const submissionEl = document.getElementById('admSubmission');
    const submissionCard = document.getElementById('admSubmissionCard');
    if (submissionEl) {
      const sub = event.clientSubmission || {};
      const rows = [];
      const addRow = (label, value) => rows.push(`
        <div class="ws-list-row">
          <span>${label}</span>
          <span class="muted">${value || '—'}</span>
        </div>
      `);
      if (sub.designation) addRow('Designation', sub.designation);
      if (sub.requestedStatus) addRow('Requested status', sub.requestedStatus);
      if (sub.name) addRow('Submitted name', sub.name);
      if (sub.email) addRow('Submitted email', sub.email);
      if (sub.phone) addRow('Submitted phone', sub.phone);
      if (Array.isArray(sub.uploads) && sub.uploads.length) {
        rows.push(`
          <div class="ws-list-row">
            <span>Uploads</span>
            <span class="muted">
              ${sub.uploads
                .map((u, idx) => `<a href="${u}" target="_blank" rel="noopener noreferrer">File ${idx + 1}</a>`)
                .join(' • ')}
            </span>
          </div>
        `);
      }
      const html = rows.join('');
      submissionEl.innerHTML = html || '<p class="muted">No extra submission details.</p>';
      if (submissionCard) submissionCard.style.display = html ? '' : 'none';
    }
    const favGrid = document.getElementById('admFavGrid');
    if (favGrid) {
      const favs = Array.isArray(payload?.favorites) && payload.favorites.length ? payload.favorites : event.favoritesSnapshot || [];
      favGrid.innerHTML = favs.map(f => `
        <article class="ws-card">
          <div class="ws-card-img" style="background-image:url('${f.photo || ''}')"></div>
          <div class="ws-card-body">
            <h4>${f.name || ''}</h4>
            <p class="muted">${f.category || ''} · ${f.city || ''}</p>
          </div>
        </article>
      `).join('') || '<p class="muted">No favorites captured.</p>';
    }
    const chatEl = document.getElementById('admChat');
    if (chatEl) {
      chatEl.innerHTML = (messages || []).map(m => `
        <div class="ws-chat-msg">
          <div class="ws-chat-meta">${m.sender?.name || 'System'} · ${fmtDate(m.createdAt)}</div>
          <div class="ws-chat-body">${m.content || ''}</div>
        </div>
      `).join('') || '<p class="muted">No messages.</p>';
    }
    const contractEl = document.getElementById('admContracts');
    if (contractEl) {
      contractEl.innerHTML = `
        <div class="ws-list-row">
          <span>Status</span>
          <span class="pill ghost">${event.status}</span>
        </div>
        <div class="ws-list-row">
          <span>Last activity</span>
          <span class="muted">${fmtDate(event.lastActivityAt)}</span>
        </div>
      `;
    }
  };

  const bindTabs = () => {
    const buttons = Array.from(document.querySelectorAll('.ws-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.ws-panel'));
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach(b => b.classList.toggle('active', b === btn));
        panels.forEach(p => p.classList.toggle('active', p.id === `adm-tab-${target}`));
      });
    });
  };

  const loadEvent = async () => {
    const id = getEventId();
    if (!id) return;
    try {
      const res = await safeFetch(`/api/v1/admin/events/${id}`);
      renderEventDetail(res.data);
      bindTabs();
    } catch (err) {
      console.error(err);
      const title = document.getElementById('admTitle');
      if (title) title.textContent = err?.message || 'Unable to load event';
    }
  };

  if (isAdminDash) loadDashboard();
  if (isAdminEvent) loadEvent();
})(); 

