const allowedRoles = ["planner", "client", "admin"];
const API_BASE = "/api/v1/chat";
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
  fileInput = document.getElementById("fileInput");

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

const state = {
  role: "planner",
  viewerRole: "planner",
  status: "pending",
  assigned: true,
  permissions: { canEdit: true, canSend: true, canImpersonate: true },
  pendingFiles: [],
  event: { type: "Wedding", location: "Rose Garden Venue, Los Angeles", date: "2025-03-15", budget: "15000", guestCount: "150" },
  services: [
    { name: "Floral Arrangements", vendor: "Bloom & Co.", qty: 1 },
    { name: "Catering Package", vendor: "Gourmet Events", qty: 150 },
    { name: "Photography", vendor: "Capture Moments", qty: 1 },
    { name: "Lighting Setup", vendor: "Sparkle Lights", qty: 1 }
  ],
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

function hasAuth() {
  return Boolean(localStorage.getItem("token"));
}

function useLiveChat() {
  return Boolean(getEventId() && hasAuth());
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
  return parts.join(" • ");
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
  addMessage({ type: "system", text: "Chat will open once a planner is assigned to this event.", time: timeNow() });
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

async function loadMessagesFromServer() {
  if (!useLiveChat()) return false;
  try {
    const eventId = getEventId();
    const res = await fetch(`${API_BASE}?eventId=${encodeURIComponent(eventId)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("load messages failed");
    const data = await res.json();
    const msgs = Array.isArray(data.data) ? data.data : [];
    state.messages = msgs.map(mapApiMessage);
    return true;
  } catch (err) {
    console.warn("Falling back to demo data:", err);
    return false;
  }
}

function renderMessages() {
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
  renderMessages();
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
  document.querySelector("[data-field='type']").value = state.event.type || "";
  document.querySelector("[data-field='location']").value = state.event.location || "";
  document.querySelector("[data-field='date']").value = state.event.date || "";
  document.querySelector("[data-field='guestCount']").value = state.event.guestCount || "";
  document.querySelector("[data-field='budget']").value = state.event.budget || "";
}

function updateStatusChip() {
  statusChip.textContent = state.status === "confirmed" ? "Confirmed" : "Pending";
  statusChip.classList.toggle("confirmed", state.status === "confirmed");
  statusChip.classList.toggle("pending", state.status !== "confirmed");
  markConfirmed.disabled = state.status === "confirmed" || state.role !== "planner" || !state.permissions.canEdit;
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
    input.value = state.event[input.dataset.field];
    return;
  }
  const field = input.dataset.field,
    prev = state.event[field],
    next = input.value;
  if (prev === next) return;
  state.event[field] = next;
  if (state.status === "confirmed") {
    state.status = "pending";
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

  if (!useLiveChat()) {
    addMessage(baseMessage);
    state.pendingFiles = [];
    renderPendingFiles();
    messageInput.value = "";
    return;
  }

  try {
    const eventId = getEventId();
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
}

function markDetailsConfirmed() {
  if (state.role !== "planner" || !state.permissions.canEdit) return;
  const summary = buildConfirmationSummary();
  state.status = "pending";
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
  state.status = "confirmed";
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
}

async function init() {
  state.viewerRole = resolveViewerRole();
  state.role = state.viewerRole;
  applyRolePermissions();
  highlightNav();
  await loadMessagesFromServer();
  applyRolePermissions();
  renderMessages();
  lockIfUnassigned();
  if (!useLiveChat() && demoModeEnabled() && state.messages.length === 0) {
    state.messages = [...demoMessages];
  }
  renderForm();
  renderServices();
  renderPendingFiles();
  updateStatusChip();
  setRole(state.role);
  renderConnectionBanner();
  wireEvents();
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
  const live = useLiveChat();
  if (live) {
    bar.textContent = "Live chat enabled";
    bar.classList.add("live");
    return;
  }
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
  bar.classList.remove("live");
  bar.innerHTML = "";
  bar.append("Demo mode: add ?eventId=... and set token to sync with backend.", setToken, setEvent);
}
