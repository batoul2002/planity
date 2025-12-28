(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId");

  const els = {
    plannerList: document.querySelector("[data-planner-list]"),
    summaryTitle: document.querySelector("[data-summary-title]"),
    summaryType: document.querySelector("[data-summary-type]"),
    summaryDate: document.querySelector("[data-summary-date]"),
    summaryBudget: document.querySelector("[data-summary-budget]"),
    summaryLocation: document.querySelector("[data-summary-location]"),
    summaryFavorites: document.querySelector("[data-summary-favorites]"),
    note: document.querySelector("[data-note]"),
    status: document.querySelector("[data-assign-status]"),
    assignBtn: document.querySelector("[data-assign-submit]"),
    eventIdLabel: document.querySelector("[data-event-id-label]"),
    eventTypePill: document.querySelector("[data-event-type-pill]")
  };

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
        throw new Error(msg);
      }
      return json;
    });
  const requireAdmin = async () => {
    const token = getToken();
    if (!token) {
      setStatus("Please log in as an admin to continue.", "danger");
      setTimeout(() => (window.location.href = "/login.html"), 500);
      throw new Error("Missing auth token");
    }
    const me = await apiFetch("/auth/me");
    if (!me?.user || me.user.role !== "admin") {
      setStatus("Admin access required.", "danger");
      setTimeout(() => (window.location.href = "/login.html"), 500);
      throw new Error("Not an admin");
    }
    return me.user;
  };

  const fallbackPlanners = [
    { id: "planner-1", name: "Emma Wilson", email: "emma@eventpro.com", activeEvents: 4, completed: 28 },
    { id: "planner-2", name: "David Park", email: "david@eventpro.com", activeEvents: 3, completed: 42 },
    { id: "planner-3", name: "Sofia Rodriguez", email: "sofia@eventpro.com", activeEvents: 2, completed: 15 }
  ];

  const fallbackEvents = [
    {
      id: "demo-event",
      type: "Wedding",
      date: "2024-03-15",
      budget: 45000,
      location: "The Grand Ballroom, NYC",
      favoritesSnapshot: [{ name: "Floral Arch" }, { name: "String Quartet" }, { name: "Champagne Tower" }],
      client: { name: "Demo Client" }
    }
  ];

  const state = {
    apiReady: true,
    eventId,
    event: null,
    planners: [],
    selectedPlanner: null
  };

  const getPlannerId = (planner) => {
    if (!planner) return "";
    if (typeof planner === "string") return planner;
    return planner._id || planner.id || "";
  };
  const hasAssignedPlanner = () => Boolean(getPlannerId(state.event?.planner));
  const assignActionLabel = () => (hasAssignedPlanner() ? "Reassign Planner" : "Assign Planner");
  const assignActionVerb = () => (hasAssignedPlanner() ? "Reassign" : "Assign");

  const fmtMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
  const fmtDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });
  };
  const normalizeEvents = (list = []) =>
    list.map((ev) => ({
      id: ev._id || ev.id,
      type: ev.type || "Event",
      date: ev.date,
      budget: ev.budget || 0,
      location: ev.location || "",
      favoritesSnapshot: ev.favoritesSnapshot || ev.favorites || [],
      client: ev.client,
      planner: ev.planner,
      title: ev.title || ev.type || "Event"
    }));
  const normalizePlanners = (list = []) =>
    list.map((p) => ({
      id: p._id || p.id,
      name: p.name || p.email || "Planner",
      email: p.email || "",
      activeEvents: p.activeEvents || p.workload || 0,
      completed: p.completed || 0
    }));
  const getFavoritesList = (ev) => {
    if (Array.isArray(ev?.favoritesSnapshot)) return ev.favoritesSnapshot.map((f) => f.name || f.title || f.category || f).filter(Boolean);
    return [];
  };

  const setStatus = (message, tone = "muted") => {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.className = "assign-status";
    if (tone && tone !== "muted") els.status.classList.add(tone);
  };

  const setButtonState = (label, disabled) => {
    if (!els.assignBtn) return;
    const labelEl = els.assignBtn.querySelector(".btn-label");
    if (labelEl) labelEl.textContent = label;
    els.assignBtn.disabled = !!disabled;
  };

  const setText = (el, value) => {
    if (!el) return;
    const safeValue = value === undefined || value === null || value === "" ? "-" : value;
    el.textContent = safeValue;
  };

  const populatePills = () => {
    if (els.eventIdLabel) {
      if (state.eventId) {
        els.eventIdLabel.textContent = `Event ID: ${state.eventId}`;
        els.eventIdLabel.style.display = "inline-flex";
      } else {
        els.eventIdLabel.style.display = "none";
      }
    }
    if (els.eventTypePill) {
      if (state.event?.type) {
        els.eventTypePill.textContent = state.event.type;
        els.eventTypePill.style.display = "inline-flex";
      } else {
        els.eventTypePill.style.display = "none";
      }
    }
  };

  const renderSummary = () => {
    const ev = state.event;
    if (!ev) {
      setText(els.summaryTitle, "Event not found");
      setText(els.summaryType, "-");
      setText(els.summaryDate, "-");
      setText(els.summaryBudget, "-");
      setText(els.summaryLocation, "-");
      if (els.summaryFavorites) {
        els.summaryFavorites.innerHTML = `<span class="favorite-chip ghost">No favorites</span>`;
      }
      return;
    }
    setText(els.summaryTitle, ev.title || ev.type || "Event");
    setText(els.summaryType, ev.type || "Event");
    setText(els.summaryDate, fmtDate(ev.date));
    setText(els.summaryBudget, fmtMoney(ev.budget));
    setText(els.summaryLocation, ev.location || "TBD");
    if (els.summaryFavorites) {
      const favs = getFavoritesList(ev);
      els.summaryFavorites.innerHTML =
        favs.length > 0
          ? favs.map((fav) => `<span class="favorite-chip">${fav}</span>`).join("")
          : `<span class="favorite-chip ghost">No favorites added</span>`;
    }
  };

  const renderPlanners = () => {
    if (!els.plannerList) return;
    if (!state.planners.length) {
      els.plannerList.innerHTML = `<div class="empty-state">No planners available to assign.</div>`;
      return;
    }
    els.plannerList.innerHTML = state.planners
      .map(
        (p) => `
          <button type="button" class="planner-option ${state.selectedPlanner?.id === p.id ? "is-selected" : ""}" data-planner-id="${p.id}">
            <div class="planner-avatar"><i class="fa-solid fa-user"></i></div>
            <div>
              <div class="planner-name">${p.name}</div>
              <div class="planner-email">${p.email}</div>
              <div class="planner-meta">
                <span><i class="fa-solid fa-briefcase"></i> ${p.activeEvents || 0} active</span>
                <span><i class="fa-regular fa-clock"></i> ${p.completed || 0} done</span>
              </div>
            </div>
            <div class="planner-check">
              <i class="fa-solid ${state.selectedPlanner?.id === p.id ? "fa-circle-check" : "fa-circle"}"></i>
            </div>
          </button>
        `
      )
      .join("");

    els.plannerList.querySelectorAll("[data-planner-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.plannerId;
        const planner = state.planners.find((p) => p.id === id);
        state.selectedPlanner = planner || null;
        renderPlanners();
        if (planner) setStatus(`Selected ${planner.name}. Click ${assignActionVerb()} to confirm.`, "muted");
      });
    });
  };

  const handleAssign = async () => {
    if (!state.selectedPlanner) return setStatus("Select a planner first.", "warn");
    if (!state.event) return setStatus("Event details not found.", "danger");
    if (!state.apiReady) return setStatus("API not available; assignment not sent.", "warn");
    setButtonState(hasAssignedPlanner() ? "Reassigning..." : "Assigning...", true);
    setStatus("");
    const note = (els.note?.value || "").trim();
    try {
      await apiFetch(`/admin/events/${state.event.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ plannerId: state.selectedPlanner.id, note: note || undefined })
      });
      const verb = hasAssignedPlanner() ? "Reassigned" : "Assigned";
      if (state.event) {
        state.event.planner = {
          _id: state.selectedPlanner.id,
          name: state.selectedPlanner.name,
          email: state.selectedPlanner.email
        };
      }
      setStatus(`${verb} to ${state.selectedPlanner.name}`, "success");
      setButtonState(verb, true);
    } catch (err) {
      setStatus(err?.message || "Unable to assign planner.", "danger");
      setButtonState(assignActionLabel(), false);
    }
  };

  const loadData = async () => {
    setStatus("Loading event details...");
    let payload = null;
    try {
      await requireAdmin();
      payload = await apiFetch("/admin/ui/overview");
    } catch (err) {
      console.warn("Admin overview unavailable", err);
      state.apiReady = false;
    }

    const events = normalizeEvents(payload?.data?.events || []);
    const planners = normalizePlanners(payload?.data?.planners || []);

    state.planners = planners.length ? planners : normalizePlanners(fallbackPlanners);
    const targetId = (state.eventId || "").toString();
    const foundEvent = events.find((ev) => (ev.id || "").toString() === targetId);
    if (targetId && !foundEvent) {
      state.event = null;
      setStatus("Event not found. Go back and reopen the assignment link from the event list.", "danger");
      setButtonState("Assign Planner", true);
      populatePills();
      renderSummary();
      renderPlanners();
      return;
    }
    if (!targetId && !events.length) {
      state.event = null;
      setStatus("No events available to assign.", "warn");
      setButtonState("Assign Planner", true);
      populatePills();
      renderSummary();
      renderPlanners();
      return;
    }

    state.event = foundEvent || events[0] || null;
    const eventPlannerId = getPlannerId(state.event?.planner);
    if (!state.selectedPlanner && eventPlannerId) {
      state.selectedPlanner =
        state.planners.find((p) => p.id === eventPlannerId) ||
        state.planners.find((p) => p.email && state.event?.planner?.email && p.email === state.event.planner.email) ||
        null;
    }
    if (!state.selectedPlanner && state.planners.length) state.selectedPlanner = state.planners[0];

    populatePills();
    renderSummary();
    renderPlanners();
    setButtonState(state.event ? assignActionLabel() : "Assign Planner", !state.event);
    setStatus(
      state.event
        ? state.apiReady
          ? hasAssignedPlanner()
            ? "Select a planner to reassign."
            : "Select a planner to assign."
          : "Previewing sample data (API unavailable)."
        : "Select an event from the Events page to assign a planner.",
      state.event ? (state.apiReady ? "muted" : "warn") : "warn"
    );
  };

  if (els.assignBtn) els.assignBtn.addEventListener("click", handleAssign);
  loadData();
})();
