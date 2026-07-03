import { parsePrompt } from "../utils/textParsers.js";
import { retrieveCandidates } from "./retrievalService.js";
import { buildItinerary, applyTripPatch } from "./plannerService.js";

export async function planTripFromPrompt(prompt) {
  const parsed = parsePrompt(prompt);
  const initialSettings = extractInitialSettings(prompt);
  const candidates = retrieveCandidates(parsed.preferences);
  const itineraryDays = buildItinerary(candidates, parsed.preferences, parsed.daysCount);

  return {
    id: `trip_${Date.now()}`,
    title: `伦敦及周边${parsed.daysCount}日游`,
    destination: parsed.destination,
    nearbyDestinations: parsed.nearbyDestinations,
    daysCount: parsed.daysCount,
    dateRange: {},
    travelers: {
      count: 1
    },
    budget: initialSettings.budget,
    preferences: parsed.preferences,
    transport: {
      ...parsed.transport,
      modes: splitList(initialSettings.transportModes || "步行、地铁、火车"),
      arrivalInfo: initialSettings.arrivalInfo
    },
    lodging: {
      ...parsed.lodging,
      base: initialSettings.lodgingBase
    },
    dining: {
      ...parsed.dining,
      notes: initialSettings.diningNotes
    },
    itineraryDays,
    selectedPlaceId: itineraryDays[0]?.items[0]?.id,
    changeSummary: [
      "已生成一个节奏轻松的伦敦及周边五日游。",
      "前两天集中在经典伦敦和博物馆，第三天加入市场与街区漫步，后两天安排周边一日游和轻松收尾。"
    ],
    savedState: "draft",
    version: 1,
    messages: [
      {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString()
      },
      {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: "我已生成一个可编辑的伦敦及周边五日游。你可以点击地点查看地图，也可以要求某一天更轻松或替换某个地点。",
        createdAt: new Date().toISOString()
      }
    ]
  };
}

export async function patchTripFromPrompt(trip, prompt) {
  const next = applyTripPatch(trip, prompt);
  next.messages = [
    ...(trip.messages || []),
    {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString()
    },
    {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: next.changeSummary.join(" "),
      createdAt: new Date().toISOString()
    }
  ];
  return next;
}

export async function callChatApi(payload) {
  // Reserved for a real conversation API.
  return payload;
}

function extractInitialSettings(prompt) {
  return {
    budget: extractLineValue(prompt, "酒店预算") || "£150-250/晚",
    transportModes: extractLineValue(prompt, "主要交通工具") || "步行、地铁、火车",
    arrivalInfo: extractLineValue(prompt, "航班信息") || "暂不确定，先按市区出发规划",
    lodgingBase: extractLineValue(prompt, "住宿区域") || "Westminster",
    diningNotes: extractLineValue(prompt, "餐厅偏好") || "下午茶 + 市场"
  };
}

function extractLineValue(text, label) {
  const line = text.split("\n").find((entry) => entry.startsWith(`${label}：`));
  return line?.replace(`${label}：`, "").replace(/。$/, "").trim();
}

function splitList(value) {
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
