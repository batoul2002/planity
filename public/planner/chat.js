const allowedRoles = ["planner", "client", "admin"];
const API_BASE = "/api/v1/chat";
const EVENTS_API = "/api/v1/events/mine";
const STORAGE_KEY = "plannerChatThreads.v1";
const ACTIVE_THREAD_KEY = "plannerChatActiveThread.v1";
const searchParams = new URLSearchParams(window.location.search);

const messageList = document.getElementById("messageList"),
  messageInput = document.getElementById("messageInput"),
  sendButton = document.getElementById("sendButton"),
  statusChip = document.getElementById("statusChip"),
  roleToggle = document.getElementById("roleToggle"),
  rulesChip = document.getElementById("rulesChip"),
  markConfirmed = document.getElementById("markConfirmed"),
  menu = document.getElementById("menu"),
  menuButton = document.getElementById("menuButton"),
  menuPanel = document.getElementById("menuPanel"),
  addServiceButton = document.getElementById("addService"),
  serviceList = document.getElementById("serviceList"),
  generateProposal = document.getElementById("generateProposal"),
  generateContract = document.getElementById("generateContract"),
  attachButton = document.getElementById("attachButton"),
  fileInput = document.getElementById("fileInput"),
  threadList = document.getElementById("threadList"),
  threadSearch = document.getElementById("threadSearch"),
  chatTitle = document.getElementById("chatTitle"),
  chatSubtitleText = document.getElementById("chatSubtitleText"),
  chatPresence = document.getElementById("chatPresence");

const demoMessages = [
  { type: "system", text: "Planner Lana has been assigned to your event.", time: "Dec 15, 10:00 AM" },
  {
    type: "user",
    role: "planner",
    author: "Lana (Planner)",
    text: "Hello Sarah! I am excited to help plan your wedding. I reviewed your initial preferences. Let us discuss the details.",
    time: "10:02 AM"
  },
  {
    type: "user",
    role: "client",
    author: "Sarah (Client)",
    text: "Hi Lana! Thank you so much. We are thinking of a garden theme with lots of florals. Our budget is flexible but we want to stay around $15,000.",
    time: "10:15 AM"
  },
  { type: "system", text: "Budget updated from $10,000 -> $15,000", time: "10:18 AM" },
  {
    type: "user",
    role: "planner",
    author: "Lana (Planner)",
    text: "Great. I updated the budget. For a garden theme I recommend warm lighting and soft florals. Here is an inspiration photo.",
    time: "10:22 AM",
    attachments: [
      {
        type: "image",
        label: "Garden inspiration",
        src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80"
      }
    ]
  },
  { type: "system", text: "Lighting Setup service added", time: "10:40 AM" },
  { type: "action", text: "All event details have been discussed. Please review and confirm.", actionLabel: "Confirm Details", actionId: "confirm-details", time: "11:00 AM" }
];

function cloneMessages(messages) {
  return (messages || []).map((msg) => ({
    ...msg,
    attachments: Array.isArray(msg.attachments) ? msg.attachments.map((att) => ({ ...att })) : undefined
  }));
}

const defaultThreads = [
  {
    id: "event-wedding",
    title: "Sarah's Wedding",
    eventType: "Wedding & Engagement",
    clientName: "Sarah Chen",
    presence: "Online",
    chatStatus: "In Chat",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Wedding & Engagement", location: "Rose Garden Venue, Los Angeles", date: "2025-03-15", budget: "15000", guestCount: "150" },
    services: [
      { name: "Floral Arrangements", vendor: "Bloom & Co.", qty: 1 },
      { name: "Catering Package", vendor: "Gourmet Events", qty: 150 },
      { name: "Photography", vendor: "Capture Moments", qty: 1 },
      { name: "Lighting Setup", vendor: "Sparkle Lights", qty: 1 }
    ],
    messages: cloneMessages(demoMessages),
    updatedAt: "2025-12-15T10:22:00Z"
  },
  {
    id: "event-birthday",
    title: "Maya's Birthday",
    eventType: "Birthday",
    clientName: "Maya Haddad",
    presence: "Offline",
    chatStatus: "In Chat",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Birthday", location: "Skyline Loft, Beirut", date: "2025-05-06", budget: "3500", guestCount: "45" },
    services: [
      { name: "Balloon Install", vendor: "Pop Studio", qty: 1 },
      { name: "Cake Table", vendor: "Sugar Lane", qty: 1 },
      { name: "DJ Set", vendor: "Studio Beats", qty: 1 }
    ],
    messages: [
      { type: "system", text: "Planner Dana has been assigned to your event.", time: "Jan 05, 9:10 AM" },
      { type: "user", role: "client", author: "Maya (Client)", text: "I want a pastel birthday with balloon arches.", time: "9:18 AM" },
      { type: "user", role: "planner", author: "Dana (Planner)", text: "Perfect. I will share cake and decor options shortly.", time: "9:30 AM" }
    ],
    updatedAt: "2025-01-05T09:30:00Z"
  },
  {
    id: "event-graduation",
    title: "Omar's Graduation",
    eventType: "Graduation",
    clientName: "Omar Saad",
    presence: "Online",
    chatStatus: "Planning",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Graduation", location: "Seaside Hall, Saida", date: "2025-06-12", budget: "6000", guestCount: "80" },
    services: [
      { name: "Stage Design", vendor: "Lumiere Stage", qty: 1 },
      { name: "Photo Booth", vendor: "SnapBox", qty: 1 },
      { name: "Catering", vendor: "Marina Kitchen", qty: 80 }
    ],
    messages: [
      { type: "system", text: "Planner Kareem has been assigned to your event.", time: "Feb 02, 2:00 PM" },
      { type: "user", role: "client", author: "Omar (Client)", text: "We need a simple stage and a photo booth corner.", time: "2:15 PM" },
      { type: "user", role: "planner", author: "Kareem (Planner)", text: "Got it. I will send layout options today.", time: "2:28 PM" }
    ],
    updatedAt: "2025-02-02T14:28:00Z"
  },
  {
    id: "event-gender",
    title: "Nadine's Reveal",
    eventType: "Gender Reveal",
    clientName: "Nadine Kassem",
    presence: "Offline",
    chatStatus: "In Chat",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Gender Reveal", location: "Garden Villa, Jounieh", date: "2025-04-03", budget: "2500", guestCount: "60" },
    services: [
      { name: "Balloon Arch", vendor: "Pop Studio", qty: 1 },
      { name: "Dessert Table", vendor: "Sweet Lab", qty: 1 },
      { name: "Reveal Props", vendor: "Peekaboo Party", qty: 1 }
    ],
    messages: [
      { type: "system", text: "Planner Rania has been assigned to your event.", time: "Jan 20, 3:40 PM" },
      { type: "user", role: "client", author: "Nadine (Client)", text: "We want a soft neutral theme with a smoke reveal.", time: "3:45 PM" },
      { type: "user", role: "planner", author: "Rania (Planner)", text: "Lovely. I will confirm the reveal setup tomorrow.", time: "3:58 PM" }
    ],
    updatedAt: "2025-01-20T15:58:00Z"
  },
  {
    id: "event-ramadan",
    title: "Ramadan Iftar",
    eventType: "Ramadan Gathering",
    clientName: "Al Hadi Family",
    presence: "Online",
    chatStatus: "Planning",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Ramadan Gathering", location: "Seaside Tent, Tyre", date: "2025-03-21", budget: "5200", guestCount: "120" },
    services: [
      { name: "Lantern Decor", vendor: "Noor Atelier", qty: 1 },
      { name: "Buffet Service", vendor: "Sahra Catering", qty: 120 },
      { name: "Floor Seating", vendor: "Majlis Co.", qty: 1 }
    ],
    messages: [
      { type: "system", text: "Planner Hadi has been assigned to your event.", time: "Mar 01, 6:00 PM" },
      { type: "user", role: "client", author: "Lina (Client)", text: "We need a large iftar setup with warm lanterns.", time: "6:12 PM" },
      { type: "user", role: "planner", author: "Hadi (Planner)", text: "Understood. I will send buffet and seating options.", time: "6:25 PM" }
    ],
    updatedAt: "2025-03-01T18:25:00Z"
  },
  {
    id: "event-madeef",
    title: "Ashouraii Madeef",
    eventType: "Madeef Ashouraii",
    clientName: "Al Zahraa Community",
    presence: "Offline",
    chatStatus: "In Chat",
    detailsStatus: "pending",
    assigned: true,
    event: { type: "Madeef Ashouraii", location: "Community Majlis, Nabatieh", date: "2025-07-10", budget: "4000", guestCount: "150" },
    services: [
      { name: "Low Seating", vendor: "Majlis Co.", qty: 1 },
      { name: "Catering Trays", vendor: "Dar Kitchen", qty: 150 },
      { name: "Sound System", vendor: "Echo Audio", qty: 1 }
    ],
    messages: [
      { type: "system", text: "Planner Ali has been assigned to your event.", time: "Feb 10, 7:00 PM" },
      { type: "user", role: "client", author: "Hussein (Client)", text: "We need traditional seating and a simple sound setup.", time: "7:08 PM" },
      { type: "user", role: "planner", author: "Ali (Planner)", text: "I will share seating layout options tonight.", time: "7:20 PM" }
    ],
    updatedAt: "2025-02-10T19:20:00Z"
  }
];

const state = {
  role: "planner",
  viewerRole: "planner",
  detailsStatus: "pending",
  assigned: true,
  permissions: { canEdit: true, canSend: true, canImpersonate: true },
  pendingFiles: [],
  threads: [],
  activeThreadId: "",
  event: {},
  services: [],
  messages: []
};

function highlightNav() {
  document.querySelectorAll("[data-nav]").forEach((l) => l.classList.toggle("active", l.dataset.nav === "chat"));
  const t = document.getElementById("navToggle");
  if (t) t.addEventListener("click", () => document.body.classList.toggle("nav-open"));
}

function timeNow() {
  const n = new Date();
  let h = n.getHours();
  const m = n.getMinutes().toString().padStart(2, "0"),
    s = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + m + " " + s;
}

function formatTimestamp(ts) {
  if (!ts) return timeNow();
  try {
    const d = new Date(ts);
    const isSameDay = new Date().toDateString() === d.toDateString();
    const opts = isSameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    return d.toLocaleString(undefined, opts);
  } catch (_) {
    return ts;
  }
}

function formatInputDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch (_) {
    return String(value).slice(0, 10);
  }
}

function formatPersonLabel(person, fallback = "Client") {
  if (!person) return fallback;
  if (typeof person === "string") return person;
  return person.name || person.email || fallback;
}

function normalizeChatStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (["assigned", "planning", "draft"].includes(normalized)) return "In Chat";
  if (normalized === "pending_assignment") return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return "Cancelled";
  if (!normalized) return "In Chat";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function mapFavoritesToServices(favorites) {
  if (!Array.isArray(favorites)) return [];
  return favorites.map((fav) => {
    const name = fav?.name || fav?.category || "Favorite";
    const vendor = [fav?.category, fav?.city].filter(Boolean).join(" / ") || "Favorite";
    return { name, vendor, qty: 1 };
  });
}

function buildThreadFromEvent(event) {
  if (!event) return null;
  const eventId = event._id || event.id || "";
  if (!eventId) return null;
  const eventType = event.type || "Event";
  const clientName = formatPersonLabel(event.client, "Client");
  const guestCount = typeof event.guests !== "undefined" ? event.guests : event.guestCount;
  const budgetValue = typeof event.budget !== "undefined" ? event.budget : "";
  return {
    id: eventId,
    eventId,
    source: "live",
    title: eventType,
    eventType,
    clientName,
    presence: "Offline",
    chatStatus: normalizeChatStatus(event.status),
    detailsStatus: event.status === "confirmed" ? "confirmed" : "pending",
    assigned: Boolean(event.planner),
    event: {
      type: eventType,
      location: event.location || "",
      date: formatInputDate(event.date),
      budget: Number.isFinite(Number(budgetValue)) ? String(budgetValue) : "",
      guestCount: Number.isFinite(Number(guestCount)) ? String(guestCount) : ""
    },
    services: mapFavoritesToServices(event.favoritesSnapshot),
    messages: [],
    updatedAt: event.lastActivityAt || event.updatedAt || event.createdAt || new Date().toISOString()
  };
}

function truncateText(text, max = 90) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)) + "...";
}

function getThreadPreview(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  if (!messages.length) return { text: "No messages yet.", time: "" };
  const last = messages[messages.length - 1];
  const timeLabel = last.time || "";
  let text = last.text || last.actionLabel || "";
  if (last.type === "system") text = last.text || "System update";
  if (last.type === "action") text = last.text || last.actionLabel || "Action required";
  if (last.type === "user" && last.role) {
    const prefix = last.role === "planner" ? "Planner: " : "Client: ";
    text = prefix + (last.text || "");
  }
  return { text: truncateText(text, 88), time: timeLabel };
}

function getStoredRole() {
  try {
    const r = localStorage.getItem("role");
    if (r && allowedRoles.includes(r)) return r;
    const u = localStorage.getItem("user");
    const p = u ? JSON.parse(u) : null;
    const pr = p?.role;
    if (pr && allowedRoles.includes(pr)) return pr;
  } catch (e) {
    console.warn("Unable to read stored role", e);
  }
  return "planner";
}

const resolveViewerRole = () => {
  const r = getStoredRole();
  return allowedRoles.includes(r) ? r : "planner";
};

function getEventId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("eventId") || localStorage.getItem("currentEventId") || "";
}

function getActiveEventId(thread = getActiveThread()) {
  return thread?.eventId || thread?.id || getEventId();
}

function hasAuth() {
  return Boolean(localStorage.getItem("token"));
}

function useLiveChat(thread = getActiveThread()) {
  if (!thread || thread.source !== "live") return false;
  const eventId = getActiveEventId(thread);
  return Boolean(eventId && hasAuth());
}

function demoModeEnabled() {
  const qs = (searchParams.get("demo") || "").toLowerCase();
  return qs === "1" || qs === "true";
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function buildConfirmationSummary() {
  const ev = state.event || {};
  const parts = [
    ev.type ? `Event: ${ev.type}` : "",
    ev.location ? `Location: ${ev.location}` : "",
    ev.date ? `Date: ${ev.date}` : "",
    ev.guestCount ? `Guests: ${ev.guestCount}` : "",
    ev.budget ? `Budget: $${ev.budget}` : ""
  ].filter(Boolean);
  const servicesLine = state.services.length ? "Services: " + state.services.map((s) => `${s.name}${s.qty ? ` x${s.qty}` : ""}`).join(", ") : "";
  if (servicesLine) parts.push(servicesLine);
  return parts.join(" | ");
}

function loadThreadsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Unable to load saved chats", e);
    return [];
  }
}

function persistThreads() {
  try {
    const toStore = state.threads
      .filter((t) => t.source !== "live")
      .map((thread) => ({
        ...thread,
        messages: (thread.messages || []).map((msg) => ({
          ...msg,
          attachments: Array.isArray(msg.attachments)
            ? msg.attachments.map((att) => ({
                type: att?.type || "file",
                label: att?.label || "Attachment",
                src: (att?.src || "").startsWith("blob:") ? "" : att?.src || ""
              }))
            : undefined
        }))
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn("Unable to save chats", e);
  }
}

function persistActiveThreadId() {
  try {
    if (state.activeThreadId) localStorage.setItem(ACTIVE_THREAD_KEY, state.activeThreadId);
  } catch (e) {
    console.warn("Unable to save active chat", e);
  }
}

function normalizeThread(thread, fallback = {}) {
  const base = fallback || {};
  const safe = { ...base, ...(thread || {}) };
  safe.event = { ...(base.event || {}), ...(thread?.event || {}) };
  safe.services = Array.isArray(thread?.services) ? thread.services : base.services || [];
  safe.messages = Array.isArray(thread?.messages) ? thread.messages : base.messages || [];
  safe.detailsStatus = safe.detailsStatus || "pending";
  safe.chatStatus = safe.chatStatus || "Saved";
  safe.assigned = safe.assigned !== false;
  safe.updatedAt = safe.updatedAt || new Date().toISOString();
  return safe;
}

function mergeThreads(stored, defaults) {
  const map = new Map();
  (defaults || []).forEach((t) => map.set(t.id, normalizeThread(t)));
  (stored || []).forEach((t) => {
    const existing = map.get(t.id);
    map.set(t.id, normalizeThread(t, existing || {}));
  });
  return Array.from(map.values());
}

function buildLiveThread(eventId) {
  return {
    id: eventId,
    title: "Event Chat",
    eventType: "Event",
    clientName: "Client",
    presence: "Offline",
    chatStatus: "Live",
    detailsStatus: "pending",
    assigned: true,
    eventId,
    source: "live",
    event: { type: "Event", location: "", date: "", budget: "", guestCount: "" },
    services: [],
    messages: [],
    updatedAt: new Date().toISOString()
  };
}

function sortThreads(threads) {
  return [...threads].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || "");
    const bTime = Date.parse(b.updatedAt || "");
    if (!isNaN(aTime) && !isNaN(bTime)) return bTime - aTime;
    return 0;
  });
}

async function loadLiveThreadsFromServer() {
  if (!hasAuth()) return null;
  try {
    const res = await fetch(EVENTS_API, { headers: authHeaders() });
    if (!res.ok) throw new Error("load events failed");
    const data = await res.json();
    const events = Array.isArray(data.data) ? data.data : [];
    return events.map(buildThreadFromEvent).filter(Boolean);
  } catch (err) {
    console.warn("Unable to load live chats:", err);
    return null;
  }
}

async function initializeThreads() {
  const stored = loadThreadsFromStorage();
  let threads = mergeThreads(stored, defaultThreads);
  const canUseLive = hasAuth() && !demoModeEnabled();
  if (canUseLive) {
    const liveThreads = await loadLiveThreadsFromServer();
    threads = Array.isArray(liveThreads) ? liveThreads : [];
  }
  const eventId = getEventId();
  if (eventId) {
    const liveThread = buildLiveThread(eventId);
    const exactMatch = threads.find((t) => t.id === eventId);
    const legacyMatch = threads.find((t) => t.id === `live-${eventId}` || t.eventId === eventId);
    const existing = exactMatch || legacyMatch;
    if (existing) {
      threads = threads.map((t) => (t.id === existing.id ? normalizeThread(t, liveThread) : t));
    } else {
      threads = [liveThread, ...threads];
    }
  }
  state.threads = threads;
}

function resolveActiveThreadId(threads) {
  const eventId = getEventId();
  if (eventId) {
    const liveId = `live-${eventId}`;
    if (threads.some((t) => t.id === eventId)) return eventId;
    if (threads.some((t) => t.id === liveId)) return liveId;
  }
  try {
    const storedId = localStorage.getItem(ACTIVE_THREAD_KEY);
    if (storedId && threads.some((t) => t.id === storedId)) return storedId;
    if (storedId && storedId.startsWith("live-")) {
      const legacy = storedId.replace("live-", "");
      if (legacy && threads.some((t) => t.id === legacy)) return legacy;
    }
  } catch (e) {
    console.warn("Unable to read active chat", e);
  }
  return threads[0]?.id || "";
}

function getActiveThread() {
  return state.threads.find((t) => t.id === state.activeThreadId);
}

function renderHeader(thread) {
  if (!thread) return;
  if (chatTitle) chatTitle.textContent = thread.title || thread.eventType || "Event Chat";
  if (chatSubtitleText) {
    const client = thread.clientName || "Client";
    const presence = thread.presence || "Offline";
    chatSubtitleText.textContent = `${client} - ${presence}`;
  }
  if (chatPresence) {
    chatPresence.style.display = thread.presence === "Online" ? "inline-block" : "none";
  }
}

function renderThreadList() {
  if (!threadList) return;
  const query = (threadSearch?.value || "").trim().toLowerCase();
  const filtered = sortThreads(state.threads).filter((thread) => {
    const haystack = `${thread.title || ""} ${thread.eventType || ""} ${thread.clientName || ""}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  if (!filtered.length) {
    threadList.innerHTML = `<div class="thread-empty">${query ? "No chats match this search." : "No saved chats yet."}</div>`;
    return;
  }
  threadList.innerHTML = filtered
    .map((thread) => {
      const preview = getThreadPreview(thread);
      const timeLabel = preview.time || formatTimestamp(thread.updatedAt);
      const statusLabel = thread.chatStatus || "Saved";
      const storageLabel = thread.source === "live" ? "Live" : "Saved";
      const title = thread.title || thread.eventType || "Event chat";
      const subtitle = `${thread.eventType || "Event"} - ${thread.clientName || "Client"}`;
      return (
        `<button type="button" class="thread-card${thread.id === state.activeThreadId ? " active" : ""}" data-thread-id="${thread.id}">` +
        `<div class="thread-top"><div class="thread-title">${title}</div><div class="thread-time">${timeLabel || ""}</div></div>` +
        `<div class="thread-sub">${subtitle}</div>` +
        `<div class="thread-preview">${preview.text || ""}</div>` +
        `<div class="thread-meta"><span class="pill">${statusLabel}</span><span>${storageLabel}</span></div>` +
        `</button>`
      );
    })
    .join("");
  threadList.querySelectorAll("[data-thread-id]").forEach((btn) => {
    btn.onclick = () => setActiveThread(btn.dataset.threadId);
  });
}

function syncActiveThread({ updateUpdatedAt = true } = {}) {
  const thread = getActiveThread();
  if (!thread) return;
  thread.event = state.event;
  thread.services = state.services;
  thread.messages = state.messages;
  thread.detailsStatus = state.detailsStatus;
  thread.assigned = state.assigned;
  if (updateUpdatedAt) thread.updatedAt = new Date().toISOString();
  persistThreads();
}

async function hydrateThreadMessages(thread) {
  if (!thread) {
    state.messages = [];
    return;
  }
  if (useLiveChat(thread)) {
    const loaded = await loadMessagesFromServer(thread);
    if (!loaded && demoModeEnabled() && (!thread.messages || thread.messages.length === 0)) {
      thread.messages = cloneMessages(demoMessages);
    }
  }
  state.messages = Array.isArray(thread.messages) ? thread.messages : [];
}

function applyRolePermissions() {
  const v = state.viewerRole;
  const isPlanner = v === "planner",
    isClient = v === "client",
    isAdmin = v === "admin";
  state.permissions.canEdit = state.assigned && isPlanner;
  state.permissions.canSend = state.assigned && (isPlanner || isClient);
  state.permissions.canImpersonate = state.assigned && isPlanner;
  if (isAdmin) {
    state.permissions.canEdit = false;
    state.permissions.canSend = false;
    state.permissions.canImpersonate = false;
  }
}

function lockIfUnassigned() {
  if (state.assigned) return;
  state.permissions.canEdit = false;
  state.permissions.canSend = false;
  state.permissions.canImpersonate = false;
  const exists = state.messages.some((m) => m.type === "system" && (m.text || "").includes("Chat will open once a planner is assigned"));
  if (!exists) addMessage({ type: "system", text: "Chat will open once a planner is assigned to this event.", time: timeNow() });
}

function mapApiMessage(msg) {
  const role = (msg.sender?.role || "").toLowerCase() === "client" ? "client" : "planner";
  const author = msg.sender?.name || "Message";
  const timeLabel = formatTimestamp(msg.createdAt || msg.time);
  const attachments = (msg.attachments || []).map((att) => ({
    type: (att.mimetype || "").startsWith("image/") ? "image" : "file",
    label: att.name || "Attachment",
    src: att.url || att.src || ""
  }));
  return {
    type: "user",
    role,
    author: `${author}${role === "planner" ? " (Planner)" : " (Client)"}`,
    text: msg.content || msg.text || "",
    attachments,
    time: timeLabel
  };
}

async function loadMessagesFromServer(thread) {
  if (!useLiveChat(thread)) return false;
  try {
    const eventId = getActiveEventId(thread);
    const res = await fetch(`${API_BASE}?eventId=${encodeURIComponent(eventId)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("load messages failed");
    const data = await res.json();
    const msgs = Array.isArray(data.data) ? data.data : [];
    const mapped = msgs.map(mapApiMessage);
    state.messages = mapped;
    thread.messages = mapped;
    const last = msgs[msgs.length - 1];
    thread.updatedAt = last?.createdAt || thread.updatedAt || new Date().toISOString();
    persistThreads();
    return true;
  } catch (err) {
    console.warn("Falling back to demo data:", err);
    return false;
  }
}

function renderMessages() {
  if (!messageList) return;
  const html = state.messages
    .map((msg) => {
      if (msg.type === "system")
        return '<article class="message system"><div class="bubble"><div>' + msg.text + "</div></div><div class=\"meta\">" + msg.time + "</div></article>";
      if (msg.type === "action")
        return (
          '<article class="message action"><div class="bubble"><div class="system-note">' +
          msg.text +
          '</div><button class="action-button" data-action-id="' +
          msg.actionId +
          '">' +
          msg.actionLabel +
          '</button></div><div class="meta">' +
          msg.time +
          "</div></article>"
        );
      const roleClass = msg.role === "planner" ? "planner" : "client";
      const tag = msg.role === "planner" ? "Planner" : "Client";
      const attachments = (msg.attachments || [])
        .map((f) => {
          if (f.type === "image") return '<div class="attachment"><img src="' + f.src + '" alt="' + (f.label || "attachment") + '" /></div>';
          const label = f.label || "Attachment";
          return '<div class="attachment file-chip">' + (f.src ? '<a href="' + f.src + '" target="_blank" rel="noopener">' + label + "</a>" : "<span>" + label + "</span>") + "</div>";
        })
        .join("");
      return (
        '<article class="message ' +
        roleClass +
        '"><div class="bubble"><div class="msg-header"><span>' +
        (msg.author || "Message") +
        '</span><span class="tag">' +
        tag +
        "</span></div><div>" +
        msg.text +
        "</div>" +
        attachments +
        '</div><div class="meta">' +
        msg.time +
        "</div></article>"
      );
    })
    .join("");
  messageList.innerHTML = html;
  messageList.scrollTop = messageList.scrollHeight;
  attachActionHandlers();
}

function attachActionHandlers() {
  document.querySelectorAll("[data-action-id]").forEach((btn) => {
    btn.onclick = () => handleAction(btn.dataset.actionId);
  });
}

function addMessage(m) {
  state.messages.push(m);
  syncActiveThread();
  renderMessages();
  renderThreadList();
}

function handleAction(id) {
  if (id === "confirm-details") {
    if (state.viewerRole !== "client") {
      addMessage({ type: "system", text: "Only the client can confirm the details.", time: timeNow() });
      return;
    }
    confirmByClient();
  }
  if (id === "view-proposal") addMessage({ type: "system", text: "Client opened the proposal link.", time: timeNow() });
  if (id === "view-contract") addMessage({ type: "system", text: "Client viewed the contract draft.", time: timeNow() });
  if (id === "pay-link") addMessage({ type: "system", text: "Payment link opened by client.", time: timeNow() });
}

function renderServices() {
  if (!serviceList) return;
  serviceList.innerHTML = state.services
    .map(
      (s) =>
        '<div class="service-card"><div class="meta"><div class="name">' + s.name + '</div><div class="vendor">' + s.vendor + '</div></div><span class="pill">x' + s.qty + "</span></div>"
    )
    .join("");
}

function renderPendingFiles() {
  const wrap = document.getElementById("pendingFiles");
  if (!wrap) return;
  wrap.innerHTML = state.pendingFiles
    .map((f, i) => '<span class="file-pill">' + f.name + ' <button data-remove-file="' + i + '" aria-label="Remove ' + f.name + '">&times;</button></span>')
    .join("");
  wrap.querySelectorAll("[data-remove-file]").forEach((btn) => {
    btn.onclick = () => {
      state.pendingFiles.splice(Number(btn.dataset.removeFile), 1);
      renderPendingFiles();
    };
  });
}

function renderForm() {
  const typeInput = document.querySelector("[data-field='type']");
  const locationInput = document.querySelector("[data-field='location']");
  const dateInput = document.querySelector("[data-field='date']");
  const guestInput = document.querySelector("[data-field='guestCount']");
  const budgetInput = document.querySelector("[data-field='budget']");
  if (typeInput) typeInput.value = state.event.type || "";
  if (locationInput) locationInput.value = state.event.location || "";
  if (dateInput) dateInput.value = formatInputDate(state.event.date);
  if (guestInput) guestInput.value = state.event.guestCount || "";
  if (budgetInput) budgetInput.value = state.event.budget || "";
}

function updateStatusChip() {
  const confirmed = state.detailsStatus === "confirmed";
  statusChip.textContent = confirmed ? "Confirmed" : "Pending";
  statusChip.classList.toggle("confirmed", confirmed);
  statusChip.classList.toggle("pending", !confirmed);
  markConfirmed.disabled = confirmed || state.role !== "planner" || !state.permissions.canEdit;
}

function setRole(role) {
  if (!state.permissions.canImpersonate && role !== state.viewerRole) role = state.viewerRole;
  state.role = role;
  document.querySelectorAll("#roleToggle button").forEach((btn) => {
    const a = btn.dataset.role === role;
    btn.classList.toggle("active", a);
    btn.setAttribute("aria-pressed", a);
    if (!state.permissions.canImpersonate && btn.dataset.role !== state.viewerRole) btn.setAttribute("disabled", "true");
    else btn.removeAttribute("disabled");
  });
  const canEdit = role === "planner" && state.permissions.canEdit;
  rulesChip.textContent = canEdit ? "Planner can edit" : "Client view only";
  addServiceButton.disabled = !canEdit;
  generateProposal.disabled = !canEdit;
  generateContract.disabled = !canEdit;
  menuButton.disabled = !canEdit;
  document.querySelectorAll("#detailsForm input").forEach((i) => (i.disabled = !canEdit));
  sendButton.disabled = !state.permissions.canSend;
  messageInput.disabled = !state.permissions.canSend;
  attachButton.disabled = !state.permissions.canSend;
  fileInput.disabled = !state.permissions.canSend;
  updateStatusChip();
}

function formChangeHandler(e) {
  const input = e.target;
  if (!input.dataset.field) return;
  if (state.role !== "planner" || !state.permissions.canEdit) {
    input.value = state.event[input.dataset.field] || "";
    return;
  }
  const field = input.dataset.field,
    prev = state.event[field],
    next = input.value;
  if (prev === next) return;
  state.event[field] = next;
  if (state.detailsStatus === "confirmed") {
    state.detailsStatus = "pending";
    addMessage({ type: "system", text: "Details edited. Status set back to pending.", time: timeNow() });
  }
  const labels = { type: "Event type", location: "Location", date: "Date", guestCount: "Guest count", budget: "Budget" };
  addMessage({ type: "system", text: labels[field] + " updated to " + next, time: timeNow() });
  updateStatusChip();
}

async function uploadAttachment(file) {
  const form = new FormData();
  form.append("attachment", file);
  const res = await fetch(`${API_BASE}/attachments`, { method: "POST", headers: authHeaders(), body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.data;
}

async function sendUserMessage() {
  if (!state.permissions.canSend) return;
  const text = messageInput.value.trim();
  if (!text && state.pendingFiles.length === 0) return;
  const localAttachments = state.pendingFiles.map((f) => ({
    type: f.type.startsWith("image/") ? "image" : "file",
    label: f.name,
    src: f.preview,
    file: f.file
  }));
  const baseMessage = {
    type: "user",
    role: state.role,
    author: state.role === "planner" ? "You (Planner)" : "You (Client)",
    text,
    attachments: localAttachments,
    time: timeNow()
  };

  const thread = getActiveThread();
  if (!useLiveChat(thread)) {
    addMessage(baseMessage);
    state.pendingFiles = [];
    renderPendingFiles();
    messageInput.value = "";
    if (fileInput) fileInput.value = "";
    return;
  }

  try {
    const eventId = getActiveEventId(thread);
    const uploaded = [];
    for (const f of state.pendingFiles) {
      const uploadedFile = await uploadAttachment(f.file);
      uploaded.push(uploadedFile);
    }
    const apiAttachments = uploaded.map((u) => ({ url: u.url, name: u.name, mimetype: u.mimetype, size: u.size }));
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ eventId, content: text, attachments: apiAttachments })
    });
    if (!res.ok) throw new Error("Send failed");
    const data = await res.json();
    const mapped = mapApiMessage(data.data || {});
    addMessage(mapped);
  } catch (err) {
    console.warn("Live send failed, falling back to local:", err);
    addMessage({ type: "system", text: "Message could not be sent to server. Showing locally.", time: timeNow() });
    addMessage(baseMessage);
  }

  state.pendingFiles = [];
  renderPendingFiles();
  messageInput.value = "";
  if (fileInput) fileInput.value = "";
}

function markDetailsConfirmed() {
  if (state.role !== "planner" || !state.permissions.canEdit) return;
  const summary = buildConfirmationSummary();
  state.detailsStatus = "pending";
  addMessage({
    type: "system",
    text: summary ? `All event details have been discussed. Awaiting client review. ${summary}` : "All event details have been discussed. Awaiting client review.",
    time: timeNow()
  });
  addMessage({
    type: "action",
    text: summary ? `Please review and confirm these details: ${summary}` : "All event details have been discussed. Please review and confirm.",
    actionLabel: "Confirm Details",
    actionId: "confirm-details",
    time: timeNow()
  });
}

function confirmByClient() {
  state.detailsStatus = "confirmed";
  updateStatusChip();
  addMessage({ type: "system", text: "Client confirmed event details.", time: timeNow() });
}

function addService() {
  if (state.role !== "planner" || !state.permissions.canEdit) return;
  const newService = { name: "Catering Service", vendor: "Chef's Table", qty: 200 };
  state.services.push(newService);
  renderServices();
  addMessage({ type: "system", text: "Catering Service added (Chef's Table, x200)", time: timeNow() });
}

function generateMenuAction(action) {
  if (state.role !== "planner" || !state.permissions.canEdit) return;
  if (action === "proposal") {
    addMessage({ type: "system", text: "Proposal generated and sent to client", time: timeNow() });
    addMessage({ type: "action", text: "Your event proposal is ready for review.", actionLabel: "View Proposal", actionId: "view-proposal", time: timeNow() });
  }
  if (action === "contract") {
    addMessage({ type: "system", text: "Contract draft created for review", time: timeNow() });
    addMessage({ type: "action", text: "Contract draft is ready. Please review.", actionLabel: "View Contract", actionId: "view-contract", time: timeNow() });
  }
  if (action === "payment") {
    addMessage({ type: "system", text: "Payment link sent to client", time: timeNow() });
    addMessage({ type: "action", text: "Ready to secure the date? Complete payment to proceed.", actionLabel: "Open Payment", actionId: "pay-link", time: timeNow() });
  }
}

async function setActiveThread(id) {
  const thread = state.threads.find((t) => t.id === id);
  if (!thread) return;
  state.activeThreadId = thread.id;
  state.event = thread.event || {};
  state.services = thread.services || [];
  state.messages = thread.messages || [];
  state.detailsStatus = thread.detailsStatus || "pending";
  state.assigned = thread.assigned !== false;
  state.pendingFiles = [];
  renderHeader(thread);
  applyRolePermissions();
  await hydrateThreadMessages(thread);
  renderMessages();
  renderForm();
  renderServices();
  renderPendingFiles();
  setRole(state.role);
  lockIfUnassigned();
  renderThreadList();
  renderConnectionBanner();
  persistActiveThreadId();
}

function wireEvents() {
  sendButton.onclick = sendUserMessage;
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendUserMessage();
    }
  });
  document.getElementById("detailsForm").addEventListener("input", formChangeHandler);
  markConfirmed.onclick = markDetailsConfirmed;
  roleToggle.querySelectorAll("button").forEach((btn) => (btn.onclick = () => setRole(btn.dataset.role)));
  addServiceButton.onclick = addService;
  generateProposal.onclick = () => generateMenuAction("proposal");
  generateContract.onclick = () => generateMenuAction("contract");
  menuButton.onclick = () => {
    if (menuButton.disabled) return;
    const open = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
  };
  menuPanel.querySelectorAll("button").forEach((btn) => (btn.onclick = () => {
    if (menuButton.disabled) return;
    generateMenuAction(btn.dataset.menu);
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
  attachButton.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const files = Array.from(fileInput.files || []);
    state.pendingFiles = files.map((f) => ({ name: f.name, type: f.type || "file/unknown", preview: URL.createObjectURL(f), file: f }));
    renderPendingFiles();
  };
  if (threadSearch) threadSearch.addEventListener("input", renderThreadList);
}

async function init() {
  state.viewerRole = resolveViewerRole();
  state.role = state.viewerRole;
  highlightNav();
  await initializeThreads();
  state.activeThreadId = resolveActiveThreadId(state.threads);
  wireEvents();
  if (state.activeThreadId) {
    await setActiveThread(state.activeThreadId);
  } else {
    renderThreadList();
    renderConnectionBanner();
  }
}

init();

function renderConnectionBanner() {
  const host = document.querySelector(".chat-panel") || document.querySelector(".chat-surface") || document.body;
  let bar = document.getElementById("chatConnectionBanner");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "chatConnectionBanner";
    bar.className = "chat-banner";
    host.prepend(bar);
  } else {
    bar.className = "chat-banner";
    if (!host.contains(bar)) host.prepend(bar);
  }
  const thread = getActiveThread();
  if (!thread) {
    bar.textContent = hasAuth() ? "Select a chat to view messages." : "Sign in to load chats.";
    return;
  }
  if (useLiveChat(thread)) {
    bar.textContent = "Live chat enabled";
    bar.classList.add("live");
    return;
  }
  const needsToken = !hasAuth();
  const hasEventId = Boolean(getActiveEventId(thread));
  bar.classList.remove("live");
  bar.innerHTML = "";
  const note = document.createElement("span");
  note.textContent = thread?.source === "live" ? "Live chat needs a token and eventId to sync." : "Saved chat stored locally.";
  bar.append(note);
  if (!needsToken && hasEventId) return;
  const setToken = document.createElement("button");
  setToken.textContent = "Set token";
  setToken.onclick = () => {
    const val = prompt("Paste JWT token");
    if (val) {
      localStorage.setItem("token", val.trim());
      renderConnectionBanner();
    }
  };
  const setEvent = document.createElement("button");
  setEvent.textContent = "Set eventId";
  setEvent.onclick = () => {
    const val = prompt("Enter eventId");
    if (val) {
      localStorage.setItem("currentEventId", val.trim());
      renderConnectionBanner();
    }
  };
  bar.append(setToken, setEvent);
}
