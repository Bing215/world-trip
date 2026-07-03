import { getByType, retrieveCandidates, getById } from "./retrievalService.js";
import { detectPatchIntent } from "../utils/textParsers.js";

const dayTemplates = [
  {
    title: "Westminster 与 South Bank",
    mainArea: "Westminster / South Bank",
    preferred: ["poi_westminster", "poi_south_bank", "poi_tower_bridge"]
  },
  {
    title: "博物馆与西区文化",
    mainArea: "Bloomsbury / West End",
    preferred: ["poi_british_museum", "poi_national_gallery", "poi_covent_garden", "poi_dishoom"]
  },
  {
    title: "市场、美食与东伦敦街区",
    mainArea: "London Bridge / East London",
    preferred: ["poi_borough_market", "poi_tate_modern", "poi_shoreditch", "poi_soho"]
  },
  {
    title: "Cambridge 一日游",
    mainArea: "Cambridge",
    preferred: ["poi_cambridge"]
  },
  {
    title: "温莎或河畔慢节奏收尾",
    mainArea: "Windsor / Richmond",
    preferred: ["poi_windsor", "poi_richmond", "poi_fortnum"]
  }
];

export function buildItinerary(candidates, preferences, daysCount = 5) {
  const days = [];
  for (let index = 0; index < daysCount; index += 1) {
    const template = dayTemplates[index] || buildFallbackDay(index, candidates);
    const pois = template.preferred.map(getById).filter(Boolean);
    days.push({
      day: index + 1,
      title: template.title,
      mainArea: template.mainArea,
      items: pois.map((poi, poiIndex) => toItineraryItem(poi, index + 1, slotForIndex(poiIndex)))
    });
  }

  if (preferences.interests.includes("afternoon-tea")) {
    ensureTea(days);
  }

  return days;
}

export function applyTripPatch(trip, prompt) {
  const patch = detectPatchIntent(prompt);
  const next = structuredClone(trip);
  const targetDayNumber = patch.targetDay || 3;
  const day = next.itineraryDays.find((entry) => entry.day === targetDayNumber);
  if (!day) return next;

  const summary = [];

  if (patch.replaceCambridge) {
    const oxford = getById("poi_oxford");
    const cambridgeIndex = day.items.findIndex((item) => item.poiId === "poi_cambridge");
    if (oxford && cambridgeIndex >= 0) {
      day.items[cambridgeIndex] = toItineraryItem(oxford, day.day, "morning");
      day.title = "Oxford 一日游";
      day.mainArea = "Oxford";
      summary.push("已将 Cambridge 一日游替换为 Oxford 一日游。");
    }
  }

  if (patch.reduceMuseums || patch.addWalking || patch.makeRelaxed) {
    const museumIndex = day.items.findIndex((item) => item.type === "museum" && !item.locked);
    if (museumIndex >= 0 && day.items.length > 2) {
      day.items.splice(museumIndex, 1);
      summary.push(`减少了 Day ${day.day} 的一个室内博物馆安排。`);
    }
    const walkingCandidates = ["poi_shoreditch", "poi_greenwich", "poi_south_bank", "poi_notting_hill"]
      .map(getById)
      .filter(Boolean)
      .filter((poi) => !day.items.some((item) => item.poiId === poi.id));
    if (walkingCandidates[0]) {
      day.items.splice(Math.min(1, day.items.length), 0, toItineraryItem(walkingCandidates[0], day.day, "afternoon"));
      summary.push(`增加了 ${walkingCandidates[0].name}，让当天更适合散步。`);
    }
    summary.push(`Day ${day.day} 的节奏已调轻松，路线更集中。`);
  }

  if (patch.addTea) {
    const tea = getById("poi_fortnum") || getByType("afternoon_tea", 1)[0];
    if (tea && !day.items.some((item) => item.poiId === tea.id)) {
      day.items.push(toItineraryItem(tea, day.day, "afternoon"));
      summary.push(`加入了 ${tea.name} 作为下午茶体验。`);
    }
  }

  if (patch.addDinner) {
    const dinner = getById("poi_soho") || getByType("restaurant", 1)[0];
    if (dinner && !day.items.some((item) => item.poiId === dinner.id)) {
      day.items.push(toItineraryItem(dinner, day.day, "evening"));
      summary.push(`加入了 ${dinner.name} 作为晚间安排。`);
    }
  }

  next.changeSummary = summary.length ? summary : [`已根据你的要求更新 Day ${day.day}。`];
  next.version += 1;
  return next;
}

export function replaceItineraryItem(trip, itemId, newPoi) {
  const next = structuredClone(trip);
  for (const day of next.itineraryDays) {
    const index = day.items.findIndex((item) => item.id === itemId);
    if (index >= 0) {
      const old = day.items[index];
      day.items[index] = toItineraryItem(newPoi, day.day, old.slot, old.locked);
      next.selectedPlaceId = day.items[index].id;
      next.changeSummary = [
        `已将 ${old.name} 替换为 ${newPoi.name}。`,
        `${newPoi.name} 更符合当前路线或偏好，且不会破坏 Day ${day.day} 的整体结构。`
      ];
      next.version += 1;
      return next;
    }
  }
  return next;
}

export function toggleLockItem(trip, itemId) {
  const next = structuredClone(trip);
  for (const day of next.itineraryDays) {
    const item = day.items.find((entry) => entry.id === itemId);
    if (item) {
      item.locked = !item.locked;
      next.changeSummary = [`${item.name} 已${item.locked ? "锁定" : "解除锁定"}。`];
      next.version += 1;
      return next;
    }
  }
  return next;
}

export function removeItineraryItem(trip, itemId) {
  const next = structuredClone(trip);
  for (const day of next.itineraryDays) {
    const index = day.items.findIndex((entry) => entry.id === itemId);
    if (index >= 0) {
      const [removed] = day.items.splice(index, 1);
      next.changeSummary = [`已从 Day ${day.day} 删除 ${removed.name}。`];
      next.version += 1;
      return next;
    }
  }
  return next;
}

export function updateTripSettings(trip, settings) {
  const next = structuredClone(trip);
  const previousDays = next.daysCount;
  const daysCount = clampNumber(Number(settings.daysCount) || previousDays, 1, 10);
  const travelersCount = clampNumber(Number(settings.travelersCount) || 1, 1, 20);
  const summary = [];

  next.daysCount = daysCount;
  next.destination = settings.destination || next.destination;
  next.title = formatTripTitle(next.destination, daysCount);
  next.travelers = {
    ...(next.travelers || {}),
    count: travelersCount
  };
  next.budget = settings.budget || next.budget || "£150-250/晚";
  next.preferences = {
    ...next.preferences,
    pace: settings.pace || next.preferences.pace,
    attractionLabel: settings.attractions || next.preferences.attractionLabel
  };
  next.transport = {
    ...(next.transport || {}),
    modes: splitList(settings.transportModes || "步行、地铁、火车"),
    arrivalInfo: settings.arrivalInfo || ""
  };
  next.dining = {
    ...(next.dining || {}),
    notes: settings.diningNotes || ""
  };
  next.lodging = {
    ...(next.lodging || {}),
    base: settings.lodgingBase || ""
  };

  if (daysCount !== previousDays) {
    const candidates = retrieveCandidates(next.preferences);
    const rebuiltDays = buildItinerary(candidates, next.preferences, daysCount);
    if (daysCount > previousDays) {
      next.itineraryDays = [
        ...next.itineraryDays,
        ...rebuiltDays.slice(previousDays)
      ];
      summary.push(`已将行程从 ${previousDays} 天延长到 ${daysCount} 天，并补充后续 Day Plan。`);
    } else {
      next.itineraryDays = next.itineraryDays.slice(0, daysCount);
      summary.push(`已将行程从 ${previousDays} 天调整为 ${daysCount} 天。`);
    }
    next.selectedPlaceId = next.itineraryDays[Math.min(previousDays, next.itineraryDays.length) - 1]?.items[0]?.id
      || next.itineraryDays[0]?.items[0]?.id;
  }

  summary.push(`目的地：${next.destination}；景点偏好：${next.preferences.attractionLabel || "默认经典组合"}。`);
  summary.push(`人数：${travelersCount} 人；酒店预算：${next.budget}；节奏：${paceText(next.preferences.pace)}。`);
  if (next.transport.arrivalInfo) summary.push(`已记录航班/火车信息：${next.transport.arrivalInfo}。`);
  if (next.transport.modes.length) summary.push(`主要交通方式：${next.transport.modes.join("、")}。`);
  if (next.lodging.base) summary.push(`住宿区域：${next.lodging.base}。`);
  if (next.dining.notes) summary.push(`餐厅偏好：${next.dining.notes}。`);

  next.changeSummary = summary;
  next.version += 1;
  return next;
}

function buildFallbackDay(index, candidates) {
  const start = index * 3;
  return {
    title: `London Day ${index + 1}`,
    mainArea: "London",
    preferred: candidates.slice(start, start + 3).map((poi) => poi.id)
  };
}

function ensureTea(days) {
  const hasTea = days.some((day) => day.items.some((item) => item.type === "afternoon_tea"));
  if (!hasTea) {
    const tea = getById("poi_fortnum");
    if (tea && days[1]) days[1].items.push(toItineraryItem(tea, 2, "afternoon"));
  }
}

function toItineraryItem(poi, day, slot, locked = false) {
  return {
    id: `item_${day}_${poi.id}_${Math.random().toString(16).slice(2, 7)}`,
    poiId: poi.id,
    name: poi.name,
    type: poi.type,
    slot,
    area: poi.area,
    reason: buildReason(poi),
    durationMinutes: poi.durationMinutes,
    lat: poi.lat,
    lng: poi.lng,
    locked
  };
}

function buildReason(poi) {
  const reasonByType = {
    landmark: "适合作为伦敦经典印象的一部分，位置清晰，方便串联周边路线。",
    museum: "匹配你的博物馆和文化偏好，适合放在白天慢慢参观。",
    neighborhood: "适合街区漫步，能让行程不只停留在景点打卡。",
    market: "适合作为午餐和本地氛围体验的锚点。",
    restaurant: "适合补充餐饮体验，让当天安排更完整。",
    afternoon_tea: "匹配英式下午茶偏好，也能给行程留出慢节奏休息。",
    park: "适合轻松收尾，减少连续城市景点的疲劳。",
    day_trip: "满足伦敦及周边的需求，适合单独安排成一日游。",
    nightlife: "适合作为晚间体验，补足白天行程之外的城市氛围。"
  };
  return reasonByType[poi.type] || poi.description;
}

function slotForIndex(index) {
  return ["morning", "afternoon", "evening", "evening"][index] || "afternoon";
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function splitList(value) {
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function paceText(pace) {
  return { relaxed: "轻松", balanced: "均衡", packed: "特种兵" }[pace] || pace;
}

function formatTripTitle(destination, daysCount) {
  const readableDestination = /london/i.test(destination) ? "伦敦及周边" : destination;
  return `${readableDestination}${daysCount}日游`;
}
