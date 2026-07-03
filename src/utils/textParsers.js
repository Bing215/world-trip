export function parsePrompt(prompt) {
  const lower = prompt.toLowerCase();
  const daysMatch = lower.match(/(\d+)\s*(day|days|天)/);
  const chineseDaysMatch = prompt.match(/([一二三四五六七八九十])日|([一二三四五六七八九十])天/);
  const days = daysMatch ? Number(daysMatch[1]) : chineseNumberToInt(chineseDaysMatch?.[1] || chineseDaysMatch?.[2]) || 5;

  const interests = [];
  const avoid = [];
  const localTransport = ["walk", "tube", "train"];

  addIf(prompt, interests, ["博物馆", "museum"], "museum");
  addIf(prompt, interests, ["街区", "漫步", "walk"], "walk");
  addIf(prompt, interests, ["下午茶", "tea"], "afternoon-tea");
  addIf(prompt, interests, ["周边", "小镇", "nearby", "town"], "nearby-town");
  addIf(prompt, interests, ["市场", "market"], "market");
  addIf(prompt, interests, ["餐厅", "美食", "restaurant", "food"], "food");

  if (/不要太赶|轻松|relaxed|slow/i.test(prompt)) {
    avoid.push("too packed");
  }
  if (/不要太多博物馆|not too many museums/i.test(prompt)) {
    avoid.push("too many museums");
  }

  return {
    destination: /伦敦|london/i.test(prompt) ? "London" : "London",
    nearbyDestinations: ["Cambridge", "Oxford", "Windsor"],
    daysCount: days,
    preferences: {
      pace: /紧凑|packed/i.test(prompt) ? "packed" : /轻松|不要太赶|relaxed|slow/i.test(prompt) ? "relaxed" : "balanced",
      interests: interests.length ? interests : ["museum", "walk", "afternoon-tea", "nearby-town"],
      avoid,
      budgetLevel: /高端|luxury/i.test(prompt) ? "high" : /便宜|low/i.test(prompt) ? "low" : "mid"
    },
    transport: {
      localTransport
    },
    lodging: {
      hotelArea: ""
    },
    dining: {
      restaurantPreferences: ["local restaurants", "afternoon tea"],
      afternoonTeaPreference: "classic",
      dietaryRestrictions: []
    }
  };
}

export function detectPatchIntent(prompt) {
  const dayMatch = prompt.match(/day\s*(\d+)|第([一二三四五六七八九十\d]+)天/i);
  const targetDay = dayMatch ? Number(dayMatch[1] || chineseNumberToInt(dayMatch[2]) || dayMatch[2]) : undefined;
  const lower = prompt.toLowerCase();
  return {
    targetDay,
    makeRelaxed: /轻松|不要太赶|lighter|relaxed|散步|walk/i.test(prompt),
    reduceMuseums: /不要太多博物馆|少.*博物馆|not too many museums|less museum/i.test(prompt),
    addWalking: /散步|街区|walk|neighborhood/i.test(prompt),
    replaceCambridge: /不想去剑桥|换成牛津|oxford/i.test(prompt),
    addTea: /下午茶|tea/i.test(prompt),
    addDinner: /餐厅|酒吧|dinner|bar|pub/i.test(prompt)
  };
}

function addIf(text, list, needles, value) {
  if (needles.some((needle) => text.toLowerCase().includes(needle.toLowerCase())) && !list.includes(value)) {
    list.push(value);
  }
}

function chineseNumberToInt(value) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return map[value];
}
