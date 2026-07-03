import { planTripFromPrompt, patchTripFromPrompt } from "./services/chatService.js";
import { getReplacementCandidates, getById } from "./services/retrievalService.js";
import { removeItineraryItem, replaceItineraryItem, toggleLockItem, updateTripSettings } from "./services/plannerService.js";
import { clearTrip, loadTrip, saveDraft, saveTrip } from "./services/storageService.js";
import { buildMapMarkers, findItem, getBounds } from "./utils/itineraryHelpers.js";

const defaultPrompt = "帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。";

const state = {
  trip: loadTrip(),
  activeDay: 1,
  replacementFor: null,
  replacementCandidates: [],
  detailMode: "place",
  chatOpen: false,
  settingsOpen: null
};

const app = document.querySelector("#app");

if (state.trip) {
  state.activeDay = state.trip.itineraryDays[0]?.day || 1;
  state.trip.selectedPlaceId ||= state.trip.itineraryDays[0]?.items[0]?.id;
}

render();

function render() {
  app.innerHTML = "";
  if (!state.trip) {
    renderHome();
  } else {
    renderWorkspace();
  }
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
}

function renderHome() {
  app.innerHTML = `
    <main class="home poster-home">
      <section class="home-inner">
        <div class="brand-row">
          <div class="brand-mark">W</div>
          <div>WorldTrip AI</div>
        </div>
        <div class="hero poster-hero">
          <div>
            <p class="eyebrow">AI trip planning workspace</p>
            <h1>把旅行想法变成一份可编辑的 Trip Plan。</h1>
            <p>先从伦敦及周边五日游开始：输入偏好，生成行程计划，再按天查看、调整和保存。</p>
          </div>
          <div class="mini-map-preview" aria-hidden="true">
            <span class="preview-route"></span>
            <span class="preview-pin p1">1</span>
            <span class="preview-pin p2">2</span>
            <span class="preview-pin p3">3</span>
            <span class="preview-sticker">LONDON</span>
          </div>
          <div class="prompt-card">
            <div class="intake-header">
              <p class="eyebrow">Trip Plan setup</p>
              <h2>先把旅行对象说清楚</h2>
              <p>AI 会把这些字段理解成 Trip Plan 的初始约束，再生成可编辑路线。</p>
            </div>
            <div class="intake-form">
              <div class="form-field">
                <span>天数</span>
                ${renderSingleSelect("tripDays", ["3", "4", "5", "6", "7"], "5", (value) => `${value} 天`)}
              </div>
              <div class="form-field">
                <span>目的地</span>
                ${renderSingleSelect("tripDestination", destinationOptions(), "伦敦及周边")}
              </div>
              <label class="form-field">
                <span>航班 / 火车</span>
                <input id="tripFlight" value="暂不确定，先按市区出发规划" />
              </label>
              <label class="form-field">
                <span>交通工具</span>
                ${renderMultiSelect("tripTransportMode", ["步行", "地铁", "火车"], transportOptions())}
              </label>
              <label class="form-field">
                <span>餐厅</span>
                ${renderMultiSelect("tripDining", ["下午茶", "市场"], diningOptions())}
              </label>
              <div class="form-field">
                <span>住宿区域</span>
                ${renderSingleSelect("tripHotel", stayOptions(), "Westminster")}
              </div>
              <div class="form-field">
                <span>景点</span>
                ${renderMultiSelect("tripInterest", ["博物馆", "街区漫步", "地标", "周边小镇"], interestOptions())}
              </div>
              <div class="form-field">
                <span>酒店预算</span>
                ${renderSingleSelect("tripBudget", hotelBudgetOptions(), "£150-250/晚")}
              </div>
            </div>
            <label class="form-field full">
              <span>和 AI 补充说明</span>
              <textarea id="homePrompt">${defaultPrompt}</textarea>
            </label>
            <div class="prompt-actions">
              <div class="example-list">
                <button class="chip" data-example="${defaultPrompt}">伦敦五日游</button>
                <button class="chip" data-example="帮我规划一个伦敦五日游，少一点博物馆，多一些街区散步和下午茶。">慢节奏街区</button>
                <button class="chip" data-example="伦敦及周边五天，想去 Cambridge 或 Oxford，预算中等，晚上安排餐厅。">周边小镇</button>
              </div>
              <button class="btn primary" id="startPlanning">Start planning</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#homePrompt").value = button.dataset.example;
    });
  });

  document.querySelector("#startPlanning").addEventListener("click", async () => {
    const prompt = buildPlanningPrompt();
    state.trip = await planTripFromPrompt(prompt);
    state.activeDay = 1;
    state.trip.selectedPlaceId = state.trip.itineraryDays[0]?.items[0]?.id;
    saveDraft(state.trip);
    render();
  });
  bindCustomSelects(app);
}

function renderWorkspace() {
  app.innerHTML = `
    <main class="map-workspace">
      ${renderWorkspaceTopbar()}
      ${renderTripSettingsRail()}
      <section class="plan-map-grid">
        ${renderDayPlanPanel()}
        ${renderMapCanvasPanel()}
        ${renderDetailPanel()}
      </section>
      ${state.chatOpen ? renderChatDrawer() : ""}
    </main>
  `;

  bindWorkspaceEvents();
  bindCustomSelects(app);
}

function renderWorkspaceTopbar() {
  return `
    <header class="workspace-topbar">
      <div>
        <p class="eyebrow">Trip Plan</p>
        <h1>${state.trip.title}</h1>
      </div>
      <nav class="day-tabs" aria-label="Day tabs">
        ${state.trip.itineraryDays.map((day) => `
          <button class="day-tab ${state.activeDay === day.day ? "active" : ""}" data-day="${day.day}">
            <span>Day ${day.day}</span>
            <small>${day.mainArea}</small>
          </button>
        `).join("")}
      </nav>
      <div class="top-actions">
        <button class="btn ghost" id="openChat">Ask AI</button>
        <button class="btn" id="saveTrip">Save</button>
        <button class="btn ghost" id="newTrip">New</button>
      </div>
    </header>
  `;
}

function renderDayPlanPanel() {
  const day = getActiveDay();
  return `
    <aside class="day-plan-panel">
      <section class="active-day-card">
        <div class="day-header poster-label">
          <span>Day ${day.day}</span>
          <h2>${day.title}</h2>
          <p>${day.mainArea}</p>
        </div>
        <div class="active-day-items">
          ${day.items.map((item) => renderPlaceCard(item, day.day)).join("")}
        </div>
      </section>
    </aside>
  `;
}

function renderTripSettingsRail() {
  const values = getTripSettingsValues();
  const filters = [
    ["where", "Where", shortDestination(values.destination)],
    ["when", "When", `${values.daysCount} 天`],
    ["who", "Who", `${values.travelersCount} 人 · ${paceLabel(values.pace)}`],
    ["budget", "Hotel", shortBudget(values.budget)],
    ["places", "Places", `${countItems(state.trip)} 个 · ${shortAttractions(values.attractions)}`],
    ["move", "Move", shortTransport(values.transportModes)],
    ["food", "Food", shortDining(values.diningNotes)],
    ["stay", "Stay", shortStay(values.lodgingBase)]
  ];
  return `
    <section class="settings-rail">
      <div class="settings-pills" aria-label="Trip settings filters">
        ${filters.map(([key, label, value]) => `
          <button class="settings-pill ${state.settingsOpen === key ? "active" : ""}" data-settings-key="${key}">
            <span>${label}</span>
            <strong>${escapeHtml(value)}</strong>
          </button>
        `).join("")}
      </div>
      ${state.settingsOpen ? renderSettingsPopover(state.settingsOpen, values) : ""}
    </section>
  `;
}

function renderSettingsPopover(key, values) {
  const titles = {
    where: "Where",
    when: "When",
    who: "Who",
    budget: "Hotel budget",
    move: "Move",
    food: "Food",
    stay: "Stay",
    places: "Places"
  };
  return `
    <div class="settings-popover">
      <div class="settings-popover-head">
        <div>
          <p class="eyebrow">Trip settings</p>
          <h2>${titles[key]}</h2>
        </div>
        <button class="btn ghost small" id="closeSettings">Close</button>
      </div>
      <div class="settings-grid compact-popover">
        ${renderSettingsFields(key, values)}
      </div>
      <button class="btn primary settings-save" id="applyTripSettings">Apply settings</button>
    </div>
  `;
}

function renderSettingsFields(key, values) {
  if (key === "places") {
    return `
      <div class="form-field full">
        <span>景点偏好</span>
        ${renderMultiSelect("settingsInterest", values.attractionsList, interestOptions())}
      </div>
      <div class="settings-note">
        当前计划包含 ${countItems(state.trip)} 个地点，分布在 ${state.trip.nearbyDestinations.join(" / ")}。
      </div>
    `;
  }
  if (key === "where") {
    return `
      <div class="form-field">
        <span>目的地</span>
        ${renderSingleSelect("settingsDestination", destinationOptions(), values.destination)}
      </div>
      <div class="settings-note">
        周边目的地：${state.trip.nearbyDestinations.join(" / ")}
      </div>
    `;
  }
  if (key === "when") {
    return `
        <div class="form-field compact">
          <span>天数</span>
          ${renderSingleSelect("settingsDays", ["3", "4", "5", "6", "7", "8"], String(values.daysCount), (value) => `${value} 天`)}
        </div>
        <label class="form-field">
          <span>航班 / 火车</span>
          <input id="settingsArrival" value="${escapeHtml(values.arrivalInfo)}" />
        </label>
    `;
  }
  if (key === "who") {
    return `
      <div class="form-field compact">
        <span>人数</span>
        ${renderSingleSelect("settingsTravelers", ["1", "2", "3", "4", "5", "6"], String(values.travelersCount), (value) => `${value} 人`)}
      </div>
      <div class="form-field compact">
        <span>节奏</span>
        ${renderSingleSelect("settingsPace", ["relaxed", "balanced", "packed"], values.pace, paceLabel)}
      </div>
    `;
  }
  if (key === "budget") {
    return `
        <div class="form-field compact">
          <span>酒店预算</span>
          ${renderSingleSelect("settingsBudget", hotelBudgetOptions(), values.budget)}
        </div>
    `;
  }
  if (key === "move") {
    return `
      <label class="form-field">
        <span>城市交通</span>
        ${renderMultiSelect("settingsTransportMode", normalizeTransport(values.transportModes), transportOptions())}
      </label>
    `;
  }
  if (key === "food") {
    return `
      <label class="form-field">
        <span>餐厅偏好</span>
        ${renderMultiSelect("settingsDining", normalizeDiningList(values.diningNotes), diningOptions())}
      </label>
    `;
  }
  return `
    <div class="form-field">
      <span>住宿区域</span>
      ${renderSingleSelect("settingsLodging", stayOptions(), values.lodgingBase)}
    </div>
  `;
}

function renderPlaceCard(item, day) {
  const selected = state.trip.selectedPlaceId === item.id ? "selected" : "";
  return `
    <article class="place-card ${selected}" data-item-id="${item.id}">
      <div class="place-strip ${item.slot}"></div>
      <div class="place-content">
        <div class="place-title">
          <div>
            <span class="slot-label">${slotLabel(item.slot)}</span>
            <h4>${item.name}</h4>
          </div>
          <span class="type-pill">${typeLabel(item.type)}</span>
        </div>
        <p class="place-meta">Day ${day} · ${item.area} · ${item.durationMinutes} min ${item.locked ? "· Locked" : ""}</p>
        <p class="place-reason">${item.reason}</p>
        <div class="card-actions">
          <button class="btn small ghost" data-view="${item.id}">View</button>
          <button class="btn small" data-replace="${item.id}">Replace</button>
          <button class="btn small ghost" data-lock="${item.id}">${item.locked ? "Unlock" : "Lock"}</button>
          <button class="btn small ghost" data-delete="${item.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderMapCanvasPanel() {
  const markers = buildMapMarkers(state.trip);
  const activeMarkers = markers.filter((marker) => marker.day === state.activeDay);
  const visibleMarkers = activeMarkers.length ? activeMarkers : markers;
  const routePoints = visibleMarkers.map((marker) => markerPosition(marker, visibleMarkers));
  return `
    <section class="map-stage">
      <div class="map-stage-header">
        <div>
          <p class="eyebrow">Route map</p>
          <h2>${getActiveDay().title}</h2>
        </div>
        <span class="chip">${activeMarkers.length} stops highlighted</span>
      </div>
      <div class="poster-map">
        ${renderRouteSvg(routePoints)}
        ${visibleMarkers.map((marker) => renderMarker(marker, visibleMarkers)).join("")}
        <div class="map-sticker sticker-a">LONDON</div>
        <div class="map-sticker sticker-b">DAY ${state.activeDay}</div>
        <div class="map-legend">
          <strong>Plan + Map</strong>
          <span>点击 marker 或地点卡片，左右同步高亮。</span>
        </div>
      </div>
    </section>
  `;
}

function renderRouteSvg(points) {
  if (points.length < 2) return "";
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return `
    <svg class="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" />
    </svg>
  `;
}

function renderMarker(marker, markers) {
  const pos = markerPosition(marker, markers);
  const selected = state.trip.selectedPlaceId === marker.id ? "selected" : "";
  const active = marker.day === state.activeDay ? "active" : "dim";
  return `<button class="map-marker ${selected} ${active}" data-marker="${marker.id}" style="left:${pos.x}%;top:${pos.y}%;background:${marker.color}">${marker.label}</button>`;
}

function renderDetailPanel() {
  return `
    <aside class="detail-panel">
      ${renderDetailMode()}
    </aside>
  `;
}

function renderDetailMode() {
  if (state.detailMode === "replacement" && state.replacementFor) {
    return renderReplacementPanel();
  }
  if (state.detailMode === "summary") {
    return renderChangeSummaryPanel();
  }
  return renderPlaceDetailPanel();
}

function renderPlaceDetailPanel() {
  const selected = findItem(state.trip, state.trip.selectedPlaceId);
  if (!selected) {
    return `
      <section class="detail-empty">
        <p class="eyebrow">Detail</p>
        <h2>选择一个地点</h2>
        <p>点击左侧地点或地图 marker 查看详情。</p>
      </section>
    `;
  }
  const item = selected.item;
  return `
    <section class="detail-card">
      <p class="eyebrow">Selected place</p>
      <h2>${item.name}</h2>
      <p class="detail-meta">Day ${selected.day.day} · ${typeLabel(item.type)} · ${item.area}</p>
      <p>${item.reason}</p>
      <dl class="detail-list">
        <div><dt>建议时段</dt><dd>${slotLabel(item.slot)}</dd></div>
        <div><dt>停留时间</dt><dd>${item.durationMinutes} min</dd></div>
        <div><dt>状态</dt><dd>${item.locked ? "Locked" : "Editable"}</dd></div>
      </dl>
      <div class="detail-actions">
        <button class="btn primary" data-replace="${item.id}">Find replacement</button>
        <button class="btn ghost" data-lock="${item.id}">${item.locked ? "Unlock" : "Lock"}</button>
      </div>
    </section>
    ${renderChangeSummaryPanel(true)}
  `;
}

function renderReplacementPanel() {
  const selected = findItem(state.trip, state.replacementFor);
  return `
    <section class="detail-card">
      <p class="eyebrow">Replace</p>
      <h2>${selected?.item.name || "Selected place"}</h2>
      <p class="detail-meta">选择一个更适合当前路线和偏好的地点。</p>
      <div class="replacement-list">
        ${state.replacementCandidates.map((poi) => `
          <article class="rec-card">
            <h4>${poi.name}</h4>
            <p class="place-meta">${typeLabel(poi.type)} · ${poi.area}</p>
            <p class="place-reason">${poi.description}</p>
            <button class="btn small primary" data-choose-replacement="${poi.id}">Use this</button>
          </article>
        `).join("")}
      </div>
      <button class="btn ghost" id="closeReplacement">Back to detail</button>
    </section>
  `;
}

function renderChangeSummaryPanel(compact = false) {
  if (!state.trip.changeSummary?.length) return "";
  return `
    <section class="change-summary ${compact ? "compact" : ""}">
      <h3>Change summary</h3>
      <ul>${state.trip.changeSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
    </section>
  `;
}

function renderChatDrawer() {
  const messages = state.trip.messages || [];
  return `
    <div class="chat-backdrop" id="closeChatBackdrop"></div>
    <aside class="chat-drawer">
      <div class="topbar">
        <h2>Ask AI</h2>
        <button class="btn ghost small" id="closeChat">Close</button>
      </div>
      <div class="chat-log">
        ${renderChatPlanSnapshot()}
        ${messages.map((message) => `<div class="message ${message.role}">${escapeHtml(message.content)}</div>`).join("")}
      </div>
      <div class="chat-box">
        <textarea id="patchPrompt" placeholder="例如：第三天不要太多博物馆，换成更适合散步的安排。"></textarea>
        <div class="chat-actions">
          <button class="btn primary" id="sendPatch">Update trip</button>
        </div>
      </div>
    </aside>
  `;
}

function renderChatPlanSnapshot() {
  const prefs = state.trip.preferences;
  return `
    <section class="planning-snapshot">
      <p class="eyebrow">Current Trip Plan</p>
      <h3>${state.trip.title}</h3>
      <div class="snapshot-grid">
        <span><strong>${state.trip.daysCount}</strong> 天</span>
        <span><strong>${state.trip.travelers?.count || 1}</strong> 人</span>
        <span><strong>${paceLabel(prefs.pace)}</strong> 节奏</span>
        <span><strong>${state.trip.budget || "£150-250/晚"}</strong> 酒店预算</span>
      </div>
      <p>${state.trip.destination} · ${prefs.interests.join("、")} · 周边：${state.trip.nearbyDestinations.join(" / ")}</p>
      <p>交通：${state.trip.transport?.modes?.join("、") || "步行、地铁、火车"}；航班/火车：${state.trip.transport?.arrivalInfo || "未填写"}</p>
    </section>
  `;
}

function bindWorkspaceEvents() {
  app.onclick = async (event) => {
    const target = event.target.closest("button, .chat-backdrop");
    if (!target) return;

    if (target.id === "openChat") {
      state.chatOpen = true;
      render();
      return;
    }

    if (target.id === "closeChat" || target.id === "closeChatBackdrop") {
      state.chatOpen = false;
      render();
      return;
    }

    if (target.id === "newTrip") {
      clearTrip();
      state.trip = null;
      resetTransientState();
      render();
      return;
    }

    if (target.id === "saveTrip") {
      saveTrip(state.trip);
      state.trip = loadTripSafe();
      render();
      return;
    }

    if (target.id === "sendPatch") {
      const prompt = document.querySelector("#patchPrompt")?.value.trim();
      if (!prompt) return;
      state.trip = await patchTripFromPrompt(state.trip, prompt);
      state.activeDay = inferActiveDayFromPrompt(prompt) || state.activeDay;
      state.trip.selectedPlaceId = getActiveDay().items[0]?.id || state.trip.selectedPlaceId;
      state.detailMode = "summary";
      state.chatOpen = false;
      state.replacementFor = null;
      state.replacementCandidates = [];
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.settingsKey) {
      state.settingsOpen = state.settingsOpen === target.dataset.settingsKey ? null : target.dataset.settingsKey;
      render();
      return;
    }

    if (target.id === "closeSettings") {
      state.settingsOpen = null;
      render();
      return;
    }

    if (target.id === "applyTripSettings") {
      state.trip = updateTripSettings(state.trip, readTripSettings());
      state.activeDay = Math.min(state.activeDay, state.trip.daysCount);
      state.trip.selectedPlaceId = getActiveDay().items[0]?.id || state.trip.selectedPlaceId;
      state.detailMode = "summary";
      state.replacementFor = null;
      state.replacementCandidates = [];
      state.settingsOpen = null;
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.day) {
      state.activeDay = Number(target.dataset.day);
      state.trip.selectedPlaceId = getActiveDay().items[0]?.id || state.trip.selectedPlaceId;
      state.detailMode = "place";
      state.replacementFor = null;
      state.replacementCandidates = [];
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.view || target.dataset.marker) {
      const id = target.dataset.view || target.dataset.marker;
      state.trip.selectedPlaceId = id;
      const found = findItem(state.trip, id);
      if (found) state.activeDay = found.day.day;
      state.detailMode = "place";
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.replace) {
      const itemId = target.dataset.replace;
      const result = findItem(state.trip, itemId);
      if (!result) return;
      state.replacementFor = itemId;
      state.replacementCandidates = getReplacementCandidates(result.item.poiId, state.trip);
      state.trip.selectedPlaceId = itemId;
      state.activeDay = result.day.day;
      state.detailMode = "replacement";
      render();
      return;
    }

    if (target.id === "closeReplacement") {
      state.replacementFor = null;
      state.replacementCandidates = [];
      state.detailMode = "place";
      render();
      return;
    }

    if (target.dataset.chooseReplacement) {
      const poi = getById(target.dataset.chooseReplacement);
      if (!poi || !state.replacementFor) return;
      state.trip = replaceItineraryItem(state.trip, state.replacementFor, poi);
      state.activeDay = findItem(state.trip, state.trip.selectedPlaceId)?.day.day || state.activeDay;
      state.replacementFor = null;
      state.replacementCandidates = [];
      state.detailMode = "summary";
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.lock) {
      state.trip = toggleLockItem(state.trip, target.dataset.lock);
      state.detailMode = "summary";
      saveDraft(state.trip);
      render();
      return;
    }

    if (target.dataset.delete) {
      state.trip = removeItineraryItem(state.trip, target.dataset.delete);
      state.detailMode = "summary";
      saveDraft(state.trip);
      render();
    }
  };
}

function bindCustomSelects(root) {
  root.querySelectorAll("[data-single-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const targetId = button.dataset.singleTarget;
      const input = document.querySelector(`#${targetId}`);
      const details = button.closest(".single-select");
      if (!input || !details) return;
      input.value = button.dataset.singleValue || "";
      details.querySelector(".select-summary-text").textContent = button.textContent.trim();
      details.querySelectorAll(".single-select-option").forEach((option) => {
        option.classList.toggle("selected", option === button);
      });
      details.removeAttribute("open");
    });
  });
}

function resetTransientState() {
  state.activeDay = 1;
  state.replacementFor = null;
  state.replacementCandidates = [];
  state.detailMode = "place";
  state.chatOpen = false;
  state.settingsOpen = null;
}

function getActiveDay() {
  return state.trip.itineraryDays.find((day) => day.day === state.activeDay) || state.trip.itineraryDays[0];
}

function markerPosition(marker, markers) {
  const bounds = getBounds(markers);
  return {
    x: scale(marker.lng, bounds.minLng, bounds.maxLng, 8, 92),
    y: scale(marker.lat, bounds.minLat, bounds.maxLat, 88, 12)
  };
}

function inferActiveDayFromPrompt(prompt) {
  const match = prompt.match(/day\s*(\d+)|第([一二三四五六七八九十\d]+)天/i);
  if (!match) return undefined;
  return Number(match[1] || chineseNumberToInt(match[2]) || match[2]);
}

function chineseNumberToInt(value) {
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return map[value];
}

function loadTripSafe() {
  return loadTrip() || state.trip;
}

function renderSingleSelect(id, options, selectedValue, labeler = (value) => value) {
  const list = options.includes(selectedValue) || !selectedValue ? options : [selectedValue, ...options];
  const current = selectedValue || list[0] || "";
  return `
    <input type="hidden" id="${id}" value="${escapeHtml(current)}" />
    <details class="single-select">
      <summary><span class="select-summary-text">${escapeHtml(labeler(current))}</span></summary>
      <div class="select-menu">
        ${list.map((value) => `
          <button
            type="button"
            class="single-select-option ${value === current ? "selected" : ""}"
            data-single-target="${id}"
            data-single-value="${escapeHtml(value)}"
          >${escapeHtml(labeler(value))}</button>
        `).join("")}
      </div>
    </details>
  `;
}

function renderMultiSelect(name, selectedValues, options) {
  const selected = new Set(normalizeMultiValues(selectedValues, options));
  return `
    <details class="multi-select">
      <summary>${escapeHtml(formatMultiSummary([...selected]))}</summary>
      <div class="multi-select-menu">
      ${options.map((option) => `
        <label class="multi-select-option">
          <input type="checkbox" name="${name}" value="${escapeHtml(option)}" ${selected.has(option) ? "checked" : ""} />
          <span>${option}</span>
        </label>
      `).join("")}
      </div>
    </details>
  `;
}

function interestOptions() {
  return ["博物馆", "街区漫步", "地标", "周边小镇", "市场", "公园", "下午茶", "亲子友好"];
}

function destinationOptions() {
  return ["伦敦市区", "伦敦及周边", "伦敦 + Oxford", "伦敦 + Cambridge", "伦敦 + Windsor"];
}

function transportOptions() {
  return ["步行", "地铁", "火车", "打车", "机场快线", "租车"];
}

function diningOptions() {
  return ["下午茶", "市场", "晚餐餐厅", "咖啡轻食", "高预算餐厅", "顺路即可"];
}

function formatMultiSummary(values) {
  const list = values.filter(Boolean);
  if (list.length <= 3) return list.join("、");
  return `${list.slice(0, 3).join("、")} +${list.length - 3}`;
}

function normalizeMultiValues(value, options) {
  if (Array.isArray(value)) return value.length ? value.filter((item) => options.includes(item)) : options.slice(0, 2);
  const text = String(value || "");
  const matched = options.filter((option) => text.includes(option));
  return matched.length ? matched : options.slice(0, 2);
}

function normalizeInterests(value) {
  if (Array.isArray(value)) return value.length ? value : ["博物馆", "街区漫步", "地标", "周边小镇"];
  const text = String(value || "");
  const matched = interestOptions().filter((option) => text.includes(option));
  if (text.includes("市场")) matched.push("市场");
  if (text.includes("下午茶")) matched.push("下午茶");
  return [...new Set(matched.length ? matched : ["博物馆", "街区漫步", "地标", "周边小镇"])];
}

function stayOptions() {
  return ["Westminster", "King’s Cross", "Bloomsbury", "Kensington", "Battersea", "South Bank", "Soho", "未确定"];
}

function hotelBudgetOptions() {
  return ["£100 以下/晚", "£100-150/晚", "£150-250/晚", "£250-400/晚", "£400+/晚"];
}

function shortDestination(value) {
  return String(value).replace("伦敦 + ", "+ ");
}

function shortBudget(value) {
  return String(value).replace("/晚", "");
}

function shortAttractions(value) {
  const list = normalizeInterests(value);
  return list.slice(0, 2).join(" + ");
}

function shortTransport(value) {
  return formatMultiSummary(normalizeTransport(value));
}

function shortDining(value) {
  return formatMultiSummary(normalizeDiningList(value));
}

function shortStay(value) {
  const text = String(value);
  if (/King|Cross/i.test(text)) return "King’s Cross";
  if (/Bloomsbury/i.test(text)) return "Bloomsbury";
  if (/Kensington|肯辛顿/i.test(text)) return "Kensington";
  if (/Battersea|巴特西/i.test(text)) return "Battersea";
  if (/South Bank/i.test(text)) return "South Bank";
  if (/Soho|West End/i.test(text)) return "Soho";
  if (/未确定|暂未/.test(text)) return "未确定";
  return "Westminster";
}

function getTripSettingsValues() {
  const trip = state.trip;
  return {
    destination: trip.destination === "London" ? "伦敦及周边" : trip.destination,
    daysCount: trip.daysCount,
    travelersCount: trip.travelers?.count || 1,
    budget: trip.budget || "£150-250/晚",
    pace: trip.preferences?.pace || "relaxed",
    arrivalInfo: trip.transport?.arrivalInfo || "未填写，先按市区出发规划",
    transportModes: normalizeTransport(trip.transport?.modes?.join("、") || "步行、地铁、火车").join("、"),
    diningNotes: normalizeDiningList(trip.dining?.notes || "下午茶、市场").join("、"),
    lodgingBase: shortStay(trip.lodging?.base || "Westminster"),
    attractions: trip.preferences?.attractionLabel || "博物馆、街区漫步、地标、周边小镇",
    attractionsList: normalizeInterests(trip.preferences?.attractionLabel),
    interestsSummary: trip.preferences?.interests?.join("、") || "经典组合"
  };
}

function normalizeTransport(value) {
  return normalizeMultiValues(value, transportOptions());
}

function normalizeDiningList(value) {
  return normalizeMultiValues(value, diningOptions());
}

function buildPlanningPrompt() {
  const field = (id) => document.querySelector(`#${id}`)?.value.trim();
  const interests = readCheckedValues("tripInterest").join("、") || "博物馆、街区漫步、地标、周边小镇";
  const transportModes = readCheckedValues("tripTransportMode").join("、") || "步行、地铁、火车";
  const diningNotes = readCheckedValues("tripDining").join("、") || "下午茶、市场";
  const prompt = field("homePrompt") || defaultPrompt;
  return [
    `帮我规划一个${field("tripDestination") || "伦敦及周边"}${field("tripDays") || "5"}日游。`,
    `航班信息：${field("tripFlight") || "暂不确定"}。`,
    `主要交通工具：${transportModes}。`,
    `餐厅偏好：${diningNotes}。`,
    `住宿区域：${field("tripHotel") || "Westminster"}。`,
    `想去的景点类型：${interests}。`,
    `酒店预算：${field("tripBudget") || "£150-250/晚"}。`,
    `补充说明：${prompt}`
  ].join("\n");
}

function readTripSettings() {
  const values = getTripSettingsValues();
  const field = (id) => document.querySelector(`#${id}`)?.value.trim();
  const interests = readCheckedValues("settingsInterest");
  const transportModes = readCheckedValues("settingsTransportMode");
  const diningNotes = readCheckedValues("settingsDining");
  return {
    destination: field("settingsDestination") || values.destination,
    attractions: interests.length ? interests.join("、") : values.attractions,
    daysCount: field("settingsDays") || values.daysCount,
    travelersCount: field("settingsTravelers") || values.travelersCount,
    budget: field("settingsBudget") || values.budget,
    pace: field("settingsPace") || values.pace,
    arrivalInfo: field("settingsArrival") || values.arrivalInfo,
    transportModes: transportModes.length ? transportModes.join("、") : values.transportModes,
    diningNotes: diningNotes.length ? diningNotes.join("、") : values.diningNotes,
    lodgingBase: field("settingsLodging") || values.lodgingBase
  };
}

function readCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function countItems(trip) {
  return trip.itineraryDays.reduce((sum, day) => sum + day.items.length, 0);
}

function scale(value, min, max, outMin, outMax) {
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function paceLabel(pace) {
  return { relaxed: "轻松", balanced: "均衡", packed: "特种兵" }[pace] || pace;
}

function slotLabel(slot) {
  return { morning: "上午", afternoon: "下午", evening: "晚上" }[slot] || slot;
}

function typeLabel(type) {
  return {
    landmark: "地标",
    museum: "博物馆",
    neighborhood: "街区",
    market: "市场",
    restaurant: "餐厅",
    afternoon_tea: "下午茶",
    park: "公园",
    day_trip: "周边游",
    nightlife: "夜生活"
  }[type] || type;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
