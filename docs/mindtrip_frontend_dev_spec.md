# Mindtrip P0 前端开发规范与模拟数据方案

> 目标：用纯前端 + 模拟数据先复现 Mindtrip 核心体验。  
> 当前不接地图、航班、酒店、餐厅、POI 等外部 API；只预留 AI 对话接口。  
> 开发重点：页面结构清晰、数据结构稳定、内容池可扩展、后续能平滑接入真实后端和 Agent。

---

## 1. 开发目标

当前阶段要做的是一个可运行的 P0 原型：

```text
用户输入旅行需求
→ 前端调用对话接口或 mock 对话逻辑
→ 从本地内容池读取伦敦 POI
→ 生成 Trip Plan
→ 展示分天行程、地点卡片、地图占位/模拟地图
→ 支持局部修改和替换地点
→ 保存到 localStorage
```

当前不做：

- 真实地图 API
- 真实 POI API
- 真实航班 API
- 真实酒店 API
- 真实餐厅 API
- 登录注册
- 支付预订
- 多人协作
- 图片/PDF/链接导入

当前只预留：

- AI 对话 API 接口
- 后续地图 API 接入口
- 后续真实 POI 数据替换口

---

## 2. 推荐技术形态

如果只是快速原型，可以使用：

```text
HTML + CSS + JavaScript
```

如果后续会继续扩展为正式应用，建议直接使用：

```text
Vite + React + TypeScript
```

考虑到后续会有 Agent、复杂状态、组件复用和数据结构，推荐使用 React 版本。

本开发规范按 React 项目组织，但其中的数据结构和模块边界也适用于原生 HTML/CSS/JS。

---

## 3. 项目目录结构

建议目录：

```text
src/
  main.tsx
  App.tsx

  styles/
    globals.css
    layout.css
    components.css

  data/
    londonPoiPool.ts
    mockTrips.ts
    mockResponses.ts

  types/
    trip.ts
    poi.ts
    chat.ts
    ui.ts

  services/
    chatService.ts
    tripGenerator.ts
    retrievalService.ts
    plannerService.ts
    storageService.ts

  components/
    Home/
      HomePage.tsx
      PromptBox.tsx
      ExamplePrompts.tsx

    TripWorkspace/
      TripWorkspace.tsx
      ChatPanel.tsx
      ItineraryPanel.tsx
      MapPanel.tsx
      ChangeSummary.tsx

    Cards/
      PlaceCard.tsx
      RecommendationCard.tsx
      DayCard.tsx

    Controls/
      Button.tsx
      Tag.tsx
      Select.tsx

  utils/
    scoring.ts
    itineraryHelpers.ts
    textParsers.ts
```

### 3.1 各目录职责

| 目录 | 职责 |
|---|---|
| `data/` | 本地模拟内容池和示例行程 |
| `types/` | Trip、POI、Chat、UI 等核心类型 |
| `services/` | 模拟 Agent 行为和业务逻辑 |
| `components/` | 页面和 UI 组件 |
| `styles/` | 全局样式、布局、组件样式 |
| `utils/` | 评分、文本解析、行程辅助函数 |

---

## 4. 核心页面结构

当前只需要两个页面状态：

```text
HomePage
TripWorkspace
```

### 4.1 HomePage

功能：

- 展示产品标题
- 展示大输入框
- 展示示例 prompt
- 点击开始规划后生成 Trip

页面组件：

```text
HomePage
├── PromptBox
└── ExamplePrompts
```

默认示例：

```text
帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。
```

### 4.2 TripWorkspace

功能：

- 展示聊天与修改输入
- 展示分天 Trip Plan
- 展示地图占位和地点 marker
- 展示地点卡片和替换候选
- 展示变更摘要

页面布局：

```text
TripWorkspace
├── ChatPanel
├── ItineraryPanel
│   └── DayCard
│       └── PlaceCard
├── MapPanel
├── RecommendationCard
└── ChangeSummary
```

布局建议：

```text
desktop:
┌──────────────┬──────────────────┬──────────────┐
│ Chat Panel   │ Itinerary Panel  │ Map Panel    │
└──────────────┴──────────────────┴──────────────┘

mobile:
┌──────────────┐
│ Chat Panel   │
├──────────────┤
│ Itinerary    │
├──────────────┤
│ Map / Cards  │
└──────────────┘
```

---

## 5. 核心数据结构

### 5.1 POI

本地内容池的最小结构：

```ts
export interface POI {
  id: string;
  name: string;
  type:
    | "landmark"
    | "museum"
    | "neighborhood"
    | "market"
    | "restaurant"
    | "afternoon_tea"
    | "park"
    | "day_trip"
    | "nightlife";
  area: string;
  city: string;
  lat: number;
  lng: number;
  tags: string[];
  description: string;
  popularityScore: number;
  durationMinutes: number;
  bestTime: Array<"morning" | "afternoon" | "evening">;
  budgetLevel: "low" | "mid" | "high";
}
```

### 5.2 TripPlan

```ts
export interface TripPlan {
  id: string;
  title: string;
  destination: string;
  nearbyDestinations: string[];
  daysCount: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  travelers?: {
    count?: number;
    type?: "solo" | "couple" | "friends" | "family" | "parents";
  };
  preferences: TripPreferences;
  transport: TransportPreferences;
  lodging: LodgingPreferences;
  dining: DiningPreferences;
  itineraryDays: ItineraryDay[];
  selectedPlaceId?: string;
  changeSummary: string[];
  savedState: "draft" | "saved";
  version: number;
}
```

### 5.3 TripPreferences

```ts
export interface TripPreferences {
  pace: "relaxed" | "balanced" | "packed";
  interests: string[];
  avoid: string[];
  budgetLevel: "low" | "mid" | "high" | "unknown";
  totalBudget?: number;
  dailyBudget?: number;
}
```

### 5.4 Transport / Lodging / Dining

```ts
export interface TransportPreferences {
  arrivalAirport?: string;
  departureAirport?: string;
  flightInfo?: string;
  localTransport: Array<"walk" | "tube" | "taxi" | "train" | "car">;
}

export interface LodgingPreferences {
  hotelArea?: string;
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface DiningPreferences {
  restaurantPreferences: string[];
  afternoonTeaPreference?: "classic" | "luxury" | "photo_friendly" | "local";
  dietaryRestrictions: string[];
}
```

### 5.5 ItineraryDay / ItineraryItem

```ts
export interface ItineraryDay {
  day: number;
  title: string;
  mainArea: string;
  items: ItineraryItem[];
}

export interface ItineraryItem {
  id: string;
  poiId: string;
  name: string;
  type: POI["type"];
  slot: "morning" | "afternoon" | "evening";
  area: string;
  reason: string;
  durationMinutes: number;
  lat: number;
  lng: number;
  locked: boolean;
}
```

### 5.6 ChatMessage

```ts
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
```

---

## 6. 内容池结构

内容池先使用本地文件：

```text
src/data/londonPoiPool.ts
```

示例：

```ts
export const londonPoiPool: POI[] = [
  {
    id: "poi_westminster",
    name: "Westminster",
    type: "landmark",
    area: "Westminster",
    city: "London",
    lat: 51.4995,
    lng: -0.1248,
    tags: ["classic", "history", "first-time", "walkable"],
    description: "Classic London area around Big Ben and Parliament.",
    popularityScore: 95,
    durationMinutes: 90,
    bestTime: ["morning", "afternoon"],
    budgetLevel: "low"
  }
];
```

### 6.1 内容池分类

至少准备以下分类：

| 类型 | 数量建议 | 示例 |
|---|---:|---|
| classic landmarks | 8-12 | Westminster, Tower Bridge, St Paul's |
| museums | 8-12 | British Museum, National Gallery, V&A |
| neighborhoods | 8-12 | Shoreditch, Notting Hill, Greenwich |
| markets / food | 6-10 | Borough Market, Covent Garden |
| afternoon tea | 5-8 | Fortnum & Mason, Sketch |
| parks / riverside | 5-8 | Hyde Park, Richmond riverside |
| day trips | 4-6 | Cambridge, Oxford, Windsor |
| nightlife | 4-6 | Soho, Shoreditch bars |

### 6.2 内容池字段规范

每个 POI 必须有：

- `id`
- `name`
- `type`
- `area`
- `city`
- `lat`
- `lng`
- `tags`
- `description`
- `popularityScore`
- `durationMinutes`
- `bestTime`
- `budgetLevel`

不要在内容池里写长篇攻略。  
内容池只提供推荐和规划所需的结构化素材。

---

## 7. 模拟 Agent 服务设计

在开发阶段，可以不用真正拆成后端 Agent。  
前端先用 service 模块模拟 Agent 行为：

```text
chatService.ts
retrievalService.ts
plannerService.ts
tripGenerator.ts
storageService.ts
```

### 7.1 chatService

职责：

- 接收用户输入
- 预留真实 AI 对话接口
- 当前阶段可用 mock parser

建议函数：

```ts
planTripFromPrompt(prompt: string): Promise<TripPlan>
patchTripFromPrompt(trip: TripPlan, prompt: string): Promise<TripPlan>
```

接口预留：

```ts
// 后续接真实对话 API
async function callChatApi(payload: ChatPayload): Promise<ChatResult> {}
```

### 7.2 retrievalService

职责：

- 根据偏好从内容池筛选 POI
- 为替换地点提供候选

建议函数：

```ts
retrieveCandidates(preferences: TripPreferences): POI[]
getReplacementCandidates(poiId: string, trip: TripPlan): POI[]
```

### 7.3 plannerService

职责：

- 把候选 POI 组织成行程
- 应用局部修改
- 应用替换地点

建议函数：

```ts
buildItinerary(candidates: POI[], preferences: TripPreferences): ItineraryDay[]
applyTripPatch(trip: TripPlan, prompt: string): TripPlan
replaceItineraryItem(trip: TripPlan, itemId: string, newPoi: POI): TripPlan
```

### 7.4 storageService

职责：

- 保存 Trip 到 localStorage
- 恢复当前 Trip
- 清空 Trip

建议函数：

```ts
saveTrip(trip: TripPlan): void
loadTrip(): TripPlan | null
clearTrip(): void
```

---

## 8. 前端状态流转

### 8.1 新建行程

```text
HomePage 输入 prompt
→ chatService.planTripFromPrompt
→ retrievalService.retrieveCandidates
→ plannerService.buildItinerary
→ 生成 TripPlan
→ storageService.saveTrip
→ 展示 TripWorkspace
```

### 8.2 局部修改

```text
ChatPanel 输入修改 prompt
→ chatService.patchTripFromPrompt
→ plannerService.applyTripPatch
→ 更新 TripPlan
→ storageService.saveTrip
→ 展示 ChangeSummary
```

### 8.3 替换地点

```text
用户点击 PlaceCard.Replace
→ retrievalService.getReplacementCandidates
→ 展示 RecommendationCard
→ 用户选择候选
→ plannerService.replaceItineraryItem
→ 更新 TripPlan
→ storageService.saveTrip
```

### 8.4 地图联动

```text
点击 PlaceCard
→ 设置 selectedPlaceId
→ MapPanel 高亮对应 marker

点击 Map marker
→ 设置 selectedPlaceId
→ ItineraryPanel 高亮对应 PlaceCard
```

---

## 9. CSS / UI 规范

### 9.1 整体风格

风格应偏旅行工作台，而不是营销落地页。

关键词：

- 清爽
- 信息密度适中
- 地图和行程并重
- 卡片简洁
- 操作按钮明确

### 9.2 布局

桌面端：

```css
.workspace {
  display: grid;
  grid-template-columns: 320px minmax(420px, 1fr) 380px;
  gap: 16px;
  height: 100vh;
}
```

移动端：

```css
@media (max-width: 800px) {
  .workspace {
    display: flex;
    flex-direction: column;
  }
}
```

### 9.3 组件样式

建议 class 命名：

```text
.home
.prompt-box
.workspace
.chat-panel
.itinerary-panel
.map-panel
.day-card
.place-card
.recommendation-card
.change-summary
```

按钮类型：

```text
primary: Start planning / Save
secondary: Replace / Add
ghost: View on map / Lock / Delete
```

---

## 10. 代码规范

### 10.1 组件原则

- 页面组件只负责布局。
- 卡片组件只负责展示。
- service 负责业务逻辑。
- utils 负责纯辅助函数。
- 不要把筛选、排序、生成行程逻辑写在组件里。

### 10.2 数据原则

- 所有 Trip 数据都走统一 `TripPlan`。
- 所有地点都来自 `POI`。
- 所有地图 marker 都由 itinerary item 派生。
- 不在 UI 里手写 POI 文本。

### 10.3 命名原则

使用清晰业务命名：

```text
TripPlan
ItineraryDay
ItineraryItem
POI
TripPreferences
RecommendationCard
ChangeSummary
```

避免：

```text
data
item
thing
result
info
```

### 10.4 Mock 与真实 API 切换

所有 mock 逻辑都放在 service 层。

后续接真实 API 时，只替换：

- `chatService`
- `retrievalService`
- `plannerService`

组件层不应该感知数据来自 mock 还是后端。

---

## 11. 当前阶段验收标准

### 11.1 功能验收

- 用户能从首页输入伦敦五日游需求。
- 系统能生成 Trip Workspace。
- 行程能按 Day 1 - Day 5 展示。
- 地点卡片能展示名称、类型、区域、理由。
- 地图面板能展示 marker 或 marker 占位。
- 用户能点击地点并高亮地图。
- 用户能修改某一天。
- 用户能替换某个地点。
- Trip 能保存到 localStorage。
- 刷新后能恢复 Trip。

### 11.2 结构验收

- 文件结构清晰。
- mock 数据和 UI 分离。
- 业务逻辑不写在组件里。
- TripPlan 数据结构统一。
- 对话 API 有预留入口。
- 后续能替换真实 POI 和地图 API。

