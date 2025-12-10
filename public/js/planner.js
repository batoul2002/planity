(function () {
  const isDashboard = document.querySelector('.planner-page');
  const isWorkspace = document.querySelector('.planner-workspace-page');

  const mockEvents = [
    {
      id: 'ev-101',
      title: 'Sunset Engagement',
      client: { name: 'Layla Nassif', email: 'layla@example.com', phone: '+961 70 111 222' },
      date: '2026-02-18T18:30:00Z',
      location: 'Byblos, Lebanon',
      type: 'Engagement',
      guests: 120,
      budget: 22000,
      status: 'planning',
      statusLabel: 'In planning',
      contract: 'Sent · awaiting signature',
      payment: 'Deposit pending (40%)',
      tasks: ['Confirm florist', 'Share seating draft', 'Send contract reminder'],
      timeline: ['Venue hold placed', 'Contract sent', 'Payment reminder in 3 days'],
      favorites: [
        { name: 'Byblos Sur Mer', category: 'Venue', city: 'Byblos', price: '$$ · Seaside', photo: 'images/venues/Aldea2.jpeg' },
        { name: 'Maison Florale', category: 'Decoration', city: 'Jounieh', price: '$$ · Garden style', photo: 'images/decorationDetails/wedding/weddingBackdrops/weddingBackdrop3.jpg' },
        { name: 'Lens & Light', category: 'Photographer', city: 'Beirut', price: '$$ · Cinematic', photo: 'images/photographers/alyhadi.jpg' }
      ],
      plan: [
        { category: 'Venue', selection: 'Byblos Sur Mer', status: 'Proposed', price: '$12,000', notes: 'Sunset terrace + indoor backup' },
        { category: 'Decoration', selection: 'Maison Florale', status: 'Draft', price: '$4,800', notes: 'Botanical / warm lights' },
        { category: 'Catering', selection: 'Le Gourmet', status: 'Pending', price: '$6,200', notes: 'Mediterranean buffet + live station' }
      ],
      chat: [
        { from: 'Planner', text: 'Hi! Sharing the decoration moodboard now.', at: '10:04' },
        { from: 'Client', text: 'Love it. Can we add more candles?', at: '10:06' },
        { from: 'Planner', text: 'Absolutely. I’ll include that in the proposal.', at: '10:08' }
      ],
      payments: [
        { label: 'Contract', state: 'Sent', tone: 'neutral' },
        { label: 'Deposit 40%', state: 'Pending', tone: 'warn' },
        { label: 'Balance', state: 'Not due', tone: 'muted' }
      ],
      checklist: [
        { label: 'Send contract reminder', due: 'Today', done: false },
        { label: 'Lock florist moodboard', due: 'Feb 12', done: false },
        { label: 'Share seating v1', due: 'Feb 15', done: false }
      ]
    },
    {
      id: 'ev-102',
      title: 'Corporate Summit',
      client: { name: 'ATB Holdings', email: 'office@atb.com', phone: '+961 3 555 777' },
      date: '2026-03-05T09:00:00Z',
      location: 'Beirut, Downtown',
      type: 'Conference',
      guests: 180,
      budget: 35000,
      status: 'contract',
      statusLabel: 'Contract stage',
      contract: 'Draft in review',
      payment: 'Not requested',
      tasks: ['Finalize AV quote', 'Upload floorplan', 'Confirm keynote'],
      timeline: ['Venue hold placed', 'AV quote pending', 'Catering tasting Feb 20'],
      favorites: [
        { name: 'Seaside Forum', category: 'Venue', city: 'Beirut', price: '$$$ · Ballroom', photo: 'images/venues/Bustan%20Zarife1.jpg' },
        { name: 'City Sound AV', category: 'AV', city: 'Beirut', price: '$$ · Full rig', photo: 'images/venues/Aldea2.jpeg' }
      ],
      plan: [
        { category: 'Venue', selection: 'Seaside Forum', status: 'Proposed', price: '$18,000', notes: 'Full ballroom + breakout' },
        { category: 'Catering', selection: 'Maison C', status: 'Draft', price: '$9,500', notes: 'Standing lunch + coffee breaks' }
      ],
      chat: [
        { from: 'Planner', text: 'Draft agenda attached.', at: '09:12' },
        { from: 'Client', text: 'Looks good. Waiting on AV quote.', at: '09:20' }
      ],
      payments: [
        { label: 'Contract', state: 'Draft', tone: 'neutral' },
        { label: 'Deposit', state: 'Not requested', tone: 'muted' }
      ],
      checklist: [
        { label: 'Upload floorplan', due: 'Feb 10', done: false },
        { label: 'AV quote', due: 'Feb 11', done: false }
      ]
    }
  ];

  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return iso;
    }
  };

  const renderStats = (events) => {
    const statsEl = document.getElementById('plannerStats');
    if (!statsEl) return;
    const counts = {
      new: events.filter(e => e.status === 'new').length,
      planning: events.filter(e => e.status === 'planning').length,
      contract: events.filter(e => e.status === 'contract').length,
      payment: events.filter(e => (e.payment || '').toLowerCase().includes('pending')).length
    };
    statsEl.innerHTML = `
      <div class="planner-stat"><p>In planning</p><strong>${counts.planning}</strong></div>
      <div class="planner-stat"><p>Contracts</p><strong>${counts.contract}</strong></div>
      <div class="planner-stat"><p>Payments pending</p><strong>${counts.payment}</strong></div>
    `;
  };

  const renderList = (events, filter = 'all') => {
    const list = document.getElementById('plannerEventList');
    const count = document.getElementById('plannerCount');
    if (!list) return;
    let filtered = events;
    if (filter === 'new') filtered = events.filter(e => e.status === 'new');
    if (filter === 'planning') filtered = events.filter(e => e.status === 'planning');
    if (filter === 'contract') filtered = events.filter(e => e.status === 'contract');
    if (filter === 'payment') filtered = events.filter(e => (e.payment || '').toLowerCase().includes('pending'));

    if (count) count.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
    if (!filtered.length) {
      list.innerHTML = '<p class="muted">No events match this filter.</p>';
      return;
    }

    list.innerHTML = filtered.map((ev) => `
      <article class="planner-row">
        <div>
          <h4>${ev.title}</h4>
          <p class="muted">${ev.type} · ${fmtDate(ev.date)} · ${ev.location}</p>
          <p class="muted">Client: ${ev.client.name}</p>
        </div>
        <div class="planner-row-meta">
          <span class="pill soft">${ev.statusLabel || ev.status}</span>
          <span class="pill ghost">${ev.payment || 'Payment: n/a'}</span>
        </div>
        <div class="planner-row-actions">
          <a class="planner-cta" href="event-workspace.html?eventId=${ev.id}">Open workspace</a>
          <button type="button" class="planner-ghost"><i class="fa-solid fa-comment-dots"></i> Chat</button>
          <button type="button" class="planner-ghost"><i class="fa-solid fa-file-signature"></i> Send contract</button>
        </div>
      </article>
    `).join('');
  };

  const renderTasks = (events) => {
    const tasksEl = document.getElementById('plannerTasks');
    if (!tasksEl) return;
    const tasks = events.flatMap(e => (e.tasks || []).map(task => ({ task, event: e.title }))).slice(0, 6);
    tasksEl.innerHTML = tasks.map(t => `<li><span>${t.task}</span><span class="muted">${t.event}</span></li>`).join('');
  };

  const renderPayments = (events) => {
    const payEl = document.getElementById('plannerPayments');
    if (!payEl) return;
    const items = events
      .map(e => ({ label: e.title, status: e.payment || 'No payment', tone: (e.payment || '').includes('pending') ? 'warn' : 'muted' }))
      .slice(0, 5);
    payEl.innerHTML = items.map(i => `<li><span>${i.label}</span><span class="pill ghost ${i.tone}">${i.status}</span></li>`).join('');
  };

  const getEvent = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('eventId');
    const found = mockEvents.find(e => e.id === id);
    return found || mockEvents[0];
  };

  const renderWorkspace = (event) => {
    if (!event) return;
    const statusEl = document.getElementById('wsStatus');
    const titleEl = document.getElementById('wsTitle');
    const metaEl = document.getElementById('wsMeta');
    const tagsEl = document.getElementById('wsTags');
    const preview = document.getElementById('wsPreview');
    if (statusEl) statusEl.textContent = event.statusLabel || event.status;
    if (titleEl) titleEl.textContent = event.title;
    if (metaEl) metaEl.textContent = `${event.type} · ${fmtDate(event.date)} · ${event.location}`;
    if (tagsEl) {
      tagsEl.innerHTML = `
        <span class="pill soft">Guests: ${event.guests}</span>
        <span class="pill soft">Budget: $${event.budget.toLocaleString()}</span>
      `;
    }
    if (preview) {
      preview.href = `plan-event.html?eventId=${event.id}`;
    }

    const clientEl = document.getElementById('wsClient');
    if (clientEl) {
      clientEl.innerHTML = `
        <li><strong>Name</strong><span>${event.client.name}</span></li>
        <li><strong>Email</strong><span>${event.client.email}</span></li>
        <li><strong>Phone</strong><span>${event.client.phone}</span></li>
      `;
    }

    const budgetEl = document.getElementById('wsBudget');
    if (budgetEl) {
      budgetEl.innerHTML = `
        <li><strong>Budget</strong><span>$${event.budget.toLocaleString()}</span></li>
        <li><strong>Status</strong><span>${event.contract}</span></li>
        <li><strong>Timeline</strong><span>${(event.timeline || []).join(' · ') || 'TBD'}</span></li>
      `;
    }

    const favGrid = document.getElementById('wsFavGrid');
    if (favGrid) {
      favGrid.innerHTML = (event.favorites || []).map(f => `
        <article class="ws-card">
          <div class="ws-card-img" style="background-image:url('${f.photo || ''}')"></div>
          <div class="ws-card-body">
            <h4>${f.name}</h4>
            <p class="muted">${f.category} · ${f.city || ''}</p>
            <span class="pill ghost">${f.price || ''}</span>
          </div>
        </article>
      `).join('') || '<p class="muted">No favorites captured.</p>';
    }

    const planTable = document.getElementById('wsPlanTable');
    if (planTable) {
      planTable.innerHTML = `
        <div class="ws-plan-head">
          <span>Category</span><span>Selection</span><span>Status</span><span>Price</span><span>Notes</span>
        </div>
        ${(event.plan || []).map(row => `
          <div class="ws-plan-row">
            <span>${row.category}</span>
            <span>${row.selection}</span>
            <span class="pill soft">${row.status}</span>
            <span>${row.price}</span>
            <span class="muted">${row.notes}</span>
          </div>
        `).join('') || '<p class="muted">No plan items yet.</p>'}
      `;
    }

    const chat = document.getElementById('wsChatThread');
    if (chat) {
      chat.innerHTML = (event.chat || []).map(msg => `
        <div class="ws-chat-msg ${msg.from === 'Planner' ? 'me' : ''}">
          <div class="ws-chat-meta">${msg.from} · ${msg.at}</div>
          <div class="ws-chat-body">${msg.text}</div>
        </div>
      `).join('') || '<p class="muted">No messages yet.</p>';
    }

    const contractEl = document.getElementById('wsContract');
    if (contractEl) {
      contractEl.innerHTML = (event.payments || []).map(p => `
        <div class="ws-list-row">
          <span>${p.label}</span>
          <span class="pill ghost ${p.tone || ''}">${p.state}</span>
        </div>
      `).join('') || '<p class="muted">No contract items.</p>';
    }

    const tasksEl = document.getElementById('wsTasks');
    if (tasksEl) {
      tasksEl.innerHTML = (event.checklist || []).map(t => `
        <li>
          <div>
            <input type="checkbox" ${t.done ? 'checked' : ''} disabled />
            <span>${t.label}</span>
          </div>
          <span class="muted">${t.due}</span>
        </li>
      `).join('') || '<p class="muted">No tasks yet.</p>';
    }
  };

  const bindFilters = (events) => {
    const filters = Array.from(document.querySelectorAll('#plannerFilters .pill'));
    if (!filters.length) return;
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter || 'all';
        renderList(events, filter);
      });
    });
  };

  const bindTabs = () => {
    const buttons = Array.from(document.querySelectorAll('.ws-tab-btn'));
    const panels = Array.from(document.querySelectorAll('.ws-panel'));
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach(b => b.classList.toggle('active', b === btn));
        panels.forEach(p => p.classList.toggle('active', p.id === `tab-${target}`));
        if (target === 'chat') {
          const chat = document.getElementById('wsChat');
          chat?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  };

  const initDashboard = () => {
    renderStats(mockEvents);
    renderList(mockEvents, 'all');
    renderTasks(mockEvents);
    renderPayments(mockEvents);
    bindFilters(mockEvents);
  };

  const initWorkspace = () => {
    const ev = getEvent();
    renderWorkspace(ev);
    bindTabs();
  };

  if (isDashboard) initDashboard();
  if (isWorkspace) initWorkspace();
})(); 
