# Mindtrip 核心功能复现文档：P0 多 Agent 协作方案

> 文档目标：以 Mindtrip 官网核心体验为参照，设计一个可落地的 P0 复现方案。  
> 复现重点：不是完整复制所有业务线，而是优先复现原产品最核心的 AI 旅行规划闭环：  
> `自然语言输入 → 意图识别 → 数据检索 → 行程生成 → 结果排序 → 地图展示 → 局部修改`

---

## 1. 网站介绍

### 1.1 产品故事

Mindtrip 是一个 AI 原生旅行规划平台。它试图解决的不是“帮用户写一篇旅行攻略”，而是把旅行规划过程中分散的信息、决策和执行动作统一到一个可编辑的 Trip Plan 里。

传统旅行规划通常发生在多个工具之间：

- 用户在搜索引擎查目的地攻略。
- 在地图里保存地点。
- 在社交媒体里收藏餐厅和景点。
- 在邮件里查机票、酒店、活动确认信息。
- 在聊天软件里和朋友讨论。
- 最后再手动整理到表格或备忘录。

Mindtrip 的产品故事是：用户不需要在这些工具之间来回切换，只要告诉 AI 想去哪、玩几天、喜欢什么，系统就可以生成一个带地图、推荐理由、地点卡片和可编辑结构的旅行计划。

P0 复现阶段，我们只聚焦这个故事中最核心的一段：

```text
用户用自然语言描述旅行需求
→ 系统理解用户意图
→ 检索候选地点
→ 排序并生成分天行程
→ 在地图上展示
→ 用户继续用自然语言局部修改
```

### 1.2 产品定义

P0 阶段复现的网站可以定义为：

```text
一个 AI 驱动的旅行规划工作台，用户可以通过聊天生成结构化行程，并在地图和推荐卡片中继续编辑、替换和保存计划。
```

它不是纯聊天机器人，也不是传统攻略网站，而是三者的结合：

| 类型 | 价值 | 在本产品中的体现 |
|---|---|---|
| AI Chat | 低门槛输入需求 | 用户一句话描述旅行 |
| Itinerary Builder | 结构化行程 | 分天、分时段、可编辑 |
| Map Planner | 验证可执行性 | 地点 marker、区域、距离感 |
| Recommendation Engine | 提升推荐质量 | POI 卡片、替换项、推荐理由 |

### 1.3 商业价值

Mindtrip 这类产品的商业价值来自旅行决策链路的入口地位。

用户一旦在平台里创建 Trip Plan，后续会自然产生以下高价值动作：

- 查酒店
- 查航班
- 查餐厅
- 查门票和活动
- 邀请同行者
- 保存收藏地点
- 在旅途中继续查询附近内容

因此，Trip Plan 是商业化入口。谁掌握用户的旅行计划，谁就能在合适时机推荐酒店、航班、活动、保险、当地体验和餐厅预订。

P0 虽然不做真实预订和支付，但要为后续商业化保留结构：

```text
Trip Plan
├── Destination
├── Dates
├── Traveler Preferences
├── Itinerary Days
├── POI Cards
├── Candidate Replacements
└── Future Booking Slots
```

### 1.4 潜在盈利模式

完整产品可采用多种盈利模式：

| 盈利模式 | 说明 | P0 是否实现 |
|---|---|---|
| 酒店/航班/活动佣金 | 用户从行程进入预订，平台获得 CPS/CPA | 不实现，仅保留入口 |
| 体验活动分销 | Viator、GetYourGuide 等本地体验 | 不实现 |
| 旅行订阅会员 | 高级规划、无限生成、协作、离线访问 | 不实现 |
| B2B 旅游导流 | 给 OTA、酒店、目的地营销组织导流 | 不实现 |
| Creator 内容合作 | 达人行程模板、精选攻略 | 不实现 |
| 广告/赞助推荐 | 目的地、餐厅、活动赞助位 | 不实现 |

P0 的任务不是变现，而是验证核心体验：

```text
用户是否愿意用 AI 生成 Trip Plan，并继续在这个 Trip Plan 里修改和决策。
```

---

## 2. 产品界面、功能与任务流程

### 2.1 P0 页面结构

P0 只需要 3 个核心页面/视图：

| 页面 | 作用 | 是否 P0 必做 |
|---|---|---|
| 首页 / Start Planning | 让用户输入旅行需求 | 是 |
| Trip Workspace | 展示行程、聊天、地图、推荐卡片 | 是 |
| Place Detail / Recommendation Card | 展示单个地点详情和替换操作 | 是，可作为组件 |

不做：

- Collections 页面
- Google Pins 导入页
- Flights 页面
- Events 页面
- Receipts 页面
- 协作页面
- 移动端专用页面

### 2.2 首页

首页的核心目标是让用户快速开始规划，不应做成纯营销页。

首页必须包含：

- 品牌/产品一句话定位
- 大输入框
- 示例 prompt
- Start planning 按钮
- 热门目的地快捷入口

示例输入：

```text
Plan a 5 day Kyoto trip with temples, coffee, and ramen. Keep it relaxed.
```

首页交互逻辑：

```text
用户输入旅行需求
→ 点击 Start planning
→ 创建 session
→ 调用 OrchestratorAgent
→ 进入 Trip Workspace
```

### 2.3 Trip Workspace

Trip Workspace 是 P0 的核心界面。

建议布局：

```text
┌────────────────────────────────────────────────────┐
│ Top Bar: Trip title / Save / Share placeholder     │
├───────────────┬───────────────────┬────────────────┤
│ Chat Panel    │ Itinerary Panel   │ Map Panel      │
│               │                   │                │
│ user input    │ Day 1             │ markers        │
│ assistant     │ Day 2             │ selected POI   │
│ diff summary  │ Day 3             │ route preview  │
└───────────────┴───────────────────┴────────────────┘
```

核心区域：

| 区域 | 功能 |
|---|---|
| Chat Panel | 用户继续用自然语言修改行程 |
| Itinerary Panel | 分天展示行程 |
| Map Panel | 展示地点 marker 和选中地点 |
| Recommendation Cards | 展示替换候选、推荐理由 |
| Change Summary | 展示本次修改影响 |

### 2.4 分天行程

每一天至少包含：

- day number
- day title
- main area
- morning / afternoon / evening
- POI 列表
- 每个 POI 的推荐理由
- 预计停留时长
- 到下一站的粗略通勤时间

示例：

```text
Day 2: Arashiyama Slow Day

Morning
- Tenryu-ji Temple
  Reason: Classic temple garden, best visited early before crowds.

Afternoon
- Arashiyama Bamboo Grove
  Reason: Close to Tenryu-ji, keeps the day geographically compact.

Evening
- Local izakaya near Kyoto Station
  Reason: Easy return route and relaxed dinner option.
```

### 2.5 地图交互

地图不是装饰，而是复现 Mindtrip 体验的关键。用户需要通过地图判断行程是否合理。

P0 地图必须支持：

- 展示所有 POI marker
- 不同天使用不同颜色或编号
- 点击行程条目时地图定位到对应 marker
- 点击 marker 时高亮 itinerary 里的对应条目
- 显示当前选中的 POI 简卡

P0 地图可以暂不支持：

- 真实导航路线
- 实时交通
- 精确步行/公交时间
- 多人位置

### 2.6 推荐卡片

推荐卡片用于表达“为什么是这个地点”和“还有什么可替换”。

卡片字段：

- place name
- type
- area
- short reason
- tags
- estimated duration
- confidence/source
- Add / Replace / View on map

示例：

```text
% Arabica Kyoto Arashiyama
Type: Coffee
Area: Arashiyama
Reason: Good fit for a relaxed afternoon near the bamboo grove.
Actions: Replace current coffee stop / Add to Day 2 / View on map
```

### 2.7 核心任务流程

#### 流程 A：新建行程

```text
用户输入旅行需求
→ 系统识别目的地、天数、兴趣、节奏
→ 检索候选 POI
→ 进行地点排序和分天规划
→ 生成 itinerary JSON
→ 生成地图 payload
→ 前端展示 Trip Workspace
```

#### 流程 B：局部修改

```text
用户输入“make day 2 lighter”
→ 系统识别为 patch itinerary
→ 定位修改目标 Day 2
→ 保留用户已确认/锁定项目
→ 重新选择或减少 POI
→ 更新 Day 2
→ 输出变更摘要
```

#### 流程 C：替换地点

```text
用户点击某 POI 的 Replace
→ 系统检索同区域/同类型候选
→ 排序候选
→ 展示 3-5 个替换卡片
→ 用户选择一个
→ 更新 itinerary 和地图
```

#### 流程 D：保存和恢复

```text
用户生成行程
→ 系统保存 session + trip JSON
→ 用户刷新页面
→ 系统恢复当前 trip
```

### 2.8 交互逻辑

P0 的交互原则：

- 用户输入自然语言，系统输出结构化行程。
- 用户修改时，默认局部修改，不重新生成整份行程。
- 系统必须说明“改了什么”。
- 地图和行程始终联动。
- 推荐结果必须能继续操作，不只是文本解释。

好的交互：

```text
用户：第二天轻松点，晚上加个居酒屋
系统：已把 Day 2 调轻松：
- 删除了一个跨区景点
- 下午集中在岚山
- 晚上加入京都站附近居酒屋
- 预计减少约 35 分钟通勤
```

不好的交互：

```text
京都是一座历史悠久的城市，有丰富文化遗产……
```

---

## 3. 复现计划与 P0 分级

### 3.1 当前只做 P0

P0 是唯一当前开发范围。

P0 要复现的是：

```text
Start chatting
→ AI-generated itinerary
→ map-backed trip plan
→ recommendation cards
→ local edit loop
```

### 3.2 P0 必做

| 模块 | 必做内容 |
|---|---|
| 首页 | 输入旅行需求，进入规划 |
| Chat Planner | 识别新建行程和修改行程 |
| Trip Workspace | 展示聊天、行程、地图 |
| Itinerary | 分天、分时段、POI 卡片 |
| Map | marker 展示和点击联动 |
| Recommendation | 推荐理由、替换候选 |
| Edit Loop | 支持局部修改 |
| Session | 保存和恢复当前 Trip |

### 3.3 P0 不做

| 原产品能力 | P0 是否做 | 原因 |
|---|---|---|
| Popular Itineraries | 不做 | 属于内容增长，不影响核心规划闭环 |
| Collections | 不做 | 是灵感沉淀层，P0 先直接进入 Trip |
| Google Pins | 不做 | 导入复杂，后续做更合适 |
| Start Anywhere | 不做 | 多模态输入复杂，先做文本规划 |
| Receipts | 不做 | OCR/订单时间轴是独立闭环 |
| Collaboration | 不做 | 实时同步和群聊复杂 |
| Flights | 不做 | 需要实时航班数据和价格 |
| Events | 不做 | 需要本地活动数据源 |
| Mobile Nearby | 不做 | 更偏移动端和定位场景 |
| Booking/payment | 不做 | 商业化后置 |

### 3.4 P0 验收标准

功能验收：

- 用户能从首页输入旅行需求。
- 系统能生成 3-5 天结构化行程。
- 每天有标题、区域和时段。
- 每个 POI 有名称、类型、推荐理由、坐标。
- 地图能展示所有 POI。
- 点击 POI 和地图 marker 可以联动。
- 用户能输入至少两类局部修改：
  - 调整节奏：如“第二天轻松点”
  - 添加/替换地点：如“加一个居酒屋”“换个更近的餐厅”
- 系统能输出变更摘要。
- 刷新后能恢复当前 Trip。

体验验收：

- 首屏能看到行程和地图，不是纯聊天。
- 输出不是长篇攻略。
- 推荐理由具体，和用户偏好有关。
- 行程地点不能明显跨区乱跳。
- 修改时尽量只改用户指定范围。

### 3.5 P1-P4 Backlog

P0 完成后再考虑：

| 阶段 | 内容 |
|---|---|
| P1 | Collections、Inspiration、Google Pins、Start Anywhere 简化版 |
| P2 | Receipts、订单时间轴、协作、@Mindtrip |
| P3 | Flights、Events |
| P4 | Mobile Nearby、相机识别、菜单翻译 |

---

## 4. 多 Agent / Skill 组成与子任务拆解

### 4.1 总体协作思路

P0 不需要大量 Agent。为了复现核心功能，建议使用 5 个主要 Agent：

```text
OrchestratorAgent
IntentAgent
RetrievalRankerAgent
TripPlannerAgent
ResponseComposerAgent
```

它们共同完成：

```text
用户输入
→ 用户意图识别
→ 上下文合并
→ POI 数据检索
→ 候选结果排序
→ 行程规划
→ 内容生成
→ 地图 payload 生成
→ 局部修改和变更摘要
```

### 4.2 Agent 总览

| Agent | 职责 | 输入 | 输出 |
|---|---|---|---|
| OrchestratorAgent | 调度中枢，决定任务流程 | UserRequest | OrchestratorResponse |
| IntentAgent | 理解用户意图和上下文 | raw text + session | TripIntent |
| RetrievalRankerAgent | 检索和排序 POI 候选 | TripIntent | RankedPoiCandidates |
| TripPlannerAgent | 生成或修改行程 | Intent + candidates + current trip | ItineraryDraft / ItineraryPatch |
| ResponseComposerAgent | 生成前端可展示内容 | trip/patch/candidates | UIResponse |

### 4.3 OrchestratorAgent

#### 职责

OrchestratorAgent 是控制平面。它不直接生成行程，不直接做 POI 推荐，而是负责：

- 接收用户请求。
- 判断这是新建行程、修改行程还是替换地点。
- 读取 session。
- 调用对应 Agent。
- 处理异常和降级。
- 聚合最终结果。

#### Skills

| Skill | 说明 |
|---|---|
| request_classify | 判断请求类型：create_trip / patch_trip / replace_place |
| session_load | 读取当前 Trip 和对话上下文 |
| dag_schedule | 按任务类型组织 Agent 调用顺序 |
| error_decide | 无结果、意图不清、生成失败时决定追问或降级 |
| session_save | 保存更新后的 Trip 和 trace |

#### P0 调用逻辑

新建行程：

```text
IntentAgent
→ RetrievalRankerAgent
→ TripPlannerAgent
→ ResponseComposerAgent
```

局部修改：

```text
IntentAgent
→ RetrievalRankerAgent，如果需要新 POI
→ TripPlannerAgent
→ ResponseComposerAgent
```

替换地点：

```text
IntentAgent
→ RetrievalRankerAgent
→ ResponseComposerAgent 展示候选
→ 用户确认后 TripPlannerAgent 应用 patch
```

### 4.4 IntentAgent

#### 职责

IntentAgent 负责用户意图识别。它要把自然语言转成结构化意图，而不是直接回答用户。

#### 子任务

| 子任务 | 说明 |
|---|---|
| action_classify | 判断用户是创建、修改、替换、询问 |
| slot_extract | 抽取目的地、天数、兴趣、预算、节奏 |
| context_merge | 把新输入与已有 Trip 合并 |
| target_resolve | 解析“第二天”“这个餐厅”“下午那段” |
| ambiguity_check | 判断是否需要追问 |
| patch_intent_build | 生成局部修改指令 |

#### 输出结构

```ts
interface TripIntent {
  action: "create_trip" | "patch_trip" | "replace_place" | "ask_place";
  destination?: string;
  days?: number;
  interests?: string[];
  pace?: "relaxed" | "balanced" | "packed";
  budget?: "low" | "mid" | "high" | "unknown";
  target?: {
    day?: number;
    slot?: "morning" | "afternoon" | "evening";
    poi_id?: string;
  };
  patch?: {
    add_interest?: string[];
    remove_interest?: string[];
    add_place_type?: string;
    replace_place_type?: string;
    change_pace?: "relaxed" | "balanced" | "packed";
  };
  missing_slots: string[];
  confidence: number;
  clarification_question?: string;
}
```

#### 示例

用户输入：

```text
第二天轻松点，晚上加个居酒屋
```

IntentAgent 输出：

```json
{
  "action": "patch_trip",
  "target": { "day": 2 },
  "patch": {
    "change_pace": "relaxed",
    "add_place_type": "izakaya"
  },
  "missing_slots": [],
  "confidence": 0.91
}
```

### 4.5 RetrievalRankerAgent

#### 职责

RetrievalRankerAgent 负责数据检索和结果排序。它保证推荐不是 LLM 凭空编造，而是来自 POI 数据源。

#### 子任务

| 子任务 | 说明 |
|---|---|
| query_build | 根据 intent 构造检索 query |
| geo_scope_resolve | 解析目的地或当前行程区域 |
| lexical_search | 用关键词检索 POI |
| vector_search | 用语义偏好检索 POI |
| candidate_merge | 合并多路候选 |
| rrf_fusion | 用 RRF 融合排序 |
| constraint_filter | 按节奏、预算、区域过滤 |
| diversity_rerank | 避免同类地点过多 |

#### 排序维度

| 维度 | 作用 |
|---|---|
| preference_match | 是否符合用户兴趣 |
| geo_fit | 是否与当天区域接近 |
| popularity | 是否值得第一次去 |
| diversity | 是否避免重复 |
| pace_fit | 是否符合轻松/紧凑节奏 |
| source_confidence | 数据是否可信 |

#### 输出结构

```ts
interface RankedPoiCandidate {
  id: string;
  name: string;
  type: "attraction" | "restaurant" | "cafe" | "hotel" | "activity";
  area: string;
  location: { lat: number; lng: number };
  tags: string[];
  score: number;
  rank: number;
  reason_features: string[];
}
```

### 4.6 TripPlannerAgent

#### 职责

TripPlannerAgent 负责把候选 POI 变成分天行程，或把已有行程局部修改。

#### 子任务

| 子任务 | 说明 |
|---|---|
| day_capacity_estimate | 根据天数和节奏估算每天安排多少地点 |
| geo_cluster | 按区域把 POI 分到不同天 |
| anchor_select | 每天选择核心地点 |
| time_slot_assign | 分配 morning / afternoon / evening |
| route_order | 粗排当天地点顺序 |
| diversity_check | 控制同类地点密度 |
| patch_apply | 局部修改已有行程 |
| locked_item_respect | 保留用户已确认/锁定地点 |

#### 输出结构

```ts
interface ItineraryDraft {
  trip_id: string;
  title: string;
  destination: string;
  days: ItineraryDay[];
  quality: {
    preference_match: number;
    route_efficiency: number;
    diversity: number;
  };
  assumptions: string[];
}

interface ItineraryDay {
  day: number;
  title: string;
  area: string;
  items: ItineraryItem[];
}

interface ItineraryItem {
  poi_id: string;
  name: string;
  type: string;
  slot: "morning" | "afternoon" | "evening";
  duration_min: number;
  reason: string;
  location: { lat: number; lng: number };
  source: "poi_db" | "llm_suggested";
}
```

### 4.7 ResponseComposerAgent

#### 职责

ResponseComposerAgent 负责把结构化结果转成前端可展示内容。它不负责重新规划，只负责解释、摘要和 UI payload。

#### 子任务

| 子任务 | 说明 |
|---|---|
| itinerary_text_build | 生成简短行程说明 |
| change_summary_build | 生成修改摘要 |
| recommendation_card_build | 生成推荐卡片 |
| map_payload_build | 生成 marker/GeoJSON |
| action_build | 生成可操作按钮 |
| confidence_explain | 对不确定结果做说明 |

#### 输出结构

```ts
interface UIResponse {
  message: string;
  itinerary?: ItineraryDraft;
  change_summary?: string[];
  map_payload: {
    markers: MapMarker[];
    selected_marker_id?: string;
  };
  recommendation_cards: RecommendationCard[];
  actions: UIAction[];
}
```

### 4.8 Agent 协作链路

#### 新建行程链路

```text
User
→ OrchestratorAgent
→ IntentAgent
→ RetrievalRankerAgent
→ TripPlannerAgent
→ ResponseComposerAgent
→ Frontend
```

#### 局部修改链路

```text
User
→ OrchestratorAgent
→ IntentAgent
→ TripPlannerAgent
→ ResponseComposerAgent
→ Frontend
```

如果修改需要新增地点：

```text
User
→ OrchestratorAgent
→ IntentAgent
→ RetrievalRankerAgent
→ TripPlannerAgent
→ ResponseComposerAgent
→ Frontend
```

#### 替换地点链路

```text
User clicks Replace
→ OrchestratorAgent
→ RetrievalRankerAgent
→ ResponseComposerAgent
→ Frontend shows candidates
→ User selects candidate
→ TripPlannerAgent applies patch
```

### 4.9 子任务归类

| 产品能力 | 子任务 | 负责 Agent |
|---|---|---|
| 用户意图识别 | action_classify、slot_extract、target_resolve | IntentAgent |
| 上下文合并 | context_merge、session_load | IntentAgent / OrchestratorAgent |
| 数据检索 | lexical_search、vector_search、geo_scope_resolve | RetrievalRankerAgent |
| 结果排序 | rrf_fusion、constraint_filter、diversity_rerank | RetrievalRankerAgent |
| 行程规划 | geo_cluster、time_slot_assign、route_order | TripPlannerAgent |
| 内容生成 | itinerary_text_build、reason generation | TripPlannerAgent / ResponseComposerAgent |
| 局部修改 | patch_intent_build、patch_apply | IntentAgent / TripPlannerAgent |
| 地图渲染 | map_payload_build | ResponseComposerAgent |
| 保存状态 | session_save | OrchestratorAgent |

---

## 5. 如何使用本方案复现产品核心功能

### 5.1 实施顺序

建议按以下顺序开发：

```text
1. 定义 Trip / POI / Itinerary 数据结构
2. 准备一批 POI mock 数据或小型真实数据
3. 实现首页输入和 Trip Workspace 页面
4. 实现 IntentAgent
5. 实现 RetrievalRankerAgent
6. 实现 TripPlannerAgent
7. 实现 ResponseComposerAgent
8. 接入地图展示
9. 实现局部修改
10. 实现 session 保存和恢复
```

### 5.2 最小数据模型

P0 至少需要：

```ts
interface POI {
  id: string;
  name: string;
  type: string;
  area: string;
  location: { lat: number; lng: number };
  tags: string[];
  description: string;
  popularity_score: number;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  user_preferences: {
    interests: string[];
    pace: "relaxed" | "balanced" | "packed";
    budget?: string;
  };
  itinerary: ItineraryDraft;
  messages: ChatMessage[];
  version: number;
}
```

### 5.3 最小前端功能

前端需要实现：

- 首页输入框。
- Trip Workspace 三栏布局。
- Chat Panel。
- Itinerary Panel。
- Map Panel。
- POI / Recommendation Card。
- Replace / Add / Save 按钮。
- 修改摘要展示。

### 5.4 最小后端接口

```text
POST /api/trips/plan
输入：用户自然语言
输出：Trip + UIResponse

POST /api/trips/:id/patch
输入：用户修改指令
输出：更新后的 Trip + change summary

POST /api/trips/:id/replace-candidates
输入：poi_id + constraints
输出：候选替换 POI

GET /api/trips/:id
输出：Trip

POST /api/trips/:id/save
输出：保存结果
```

### 5.5 P0 推荐实现方式

为了快速复现，不建议一开始就接入复杂外部数据。

推荐路径：

#### 第一步：Mock POI 数据

先准备 3-5 个热门城市的数据，例如：

- Kyoto
- Tokyo
- Paris
- New York
- San Francisco

每个城市准备 50-100 个 POI，字段包括：

- name
- type
- area
- tags
- coordinates
- description
- popularity score

#### 第二步：简单检索 + 排序

先用规则检索：

```text
目的地匹配
→ tags 匹配
→ type 匹配
→ popularity 排序
→ diversity rerank
```

后续再替换成：

- Elasticsearch
- pgvector
- RRF 融合

#### 第三步：结构化规划

先不用复杂 TSP：

```text
按 area 分组
→ 每天选一个主区域
→ 每天 3-5 个 POI
→ 分配 morning / afternoon / evening
→ 避免同类型过密
```

#### 第四步：LLM 只做理解和文案

LLM 适合：

- 提取用户意图。
- 生成推荐理由。
- 生成变更摘要。
- 解释为什么这样安排。

LLM 不应单独决定：

- 地点是否真实存在。
- 坐标。
- 当前是否营业。
- 价格和库存。

### 5.6 P0 示例端到端

用户输入：

```text
Plan a 5 day Kyoto trip with temples, coffee, and ramen. Keep it relaxed.
```

系统处理：

```text
IntentAgent:
destination=Kyoto
days=5
interests=[temples, coffee, ramen]
pace=relaxed

RetrievalRankerAgent:
检索 Kyoto POI
优先 temples / coffee / ramen
按 area 和 popularity 排序

TripPlannerAgent:
Day 1: Higashiyama
Day 2: Arashiyama
Day 3: Downtown Kyoto
Day 4: Fushimi / Uji
Day 5: Nishiki / Kyoto Station

ResponseComposerAgent:
生成简短说明、推荐卡片、地图 markers
```

用户继续输入：

```text
Make day 2 lighter and add an izakaya at night.
```

系统处理：

```text
IntentAgent:
action=patch_trip
target.day=2
change_pace=relaxed
add_place_type=izakaya

RetrievalRankerAgent:
检索 Day 2 区域附近 izakaya

TripPlannerAgent:
减少 Day 2 一个低优先级 POI
加入 evening izakaya
保留 Day 2 主区域

ResponseComposerAgent:
输出变更摘要
更新地图 marker
```

### 5.7 成功标准

当用户完成以下流程时，P0 复现成立：

```text
用户能从首页一句话生成行程
→ 看到分天 itinerary
→ 看到地图点位
→ 理解每个地点为什么被推荐
→ 用自然语言局部修改
→ 系统只修改相关部分
→ 修改结果同步到地图
→ 刷新后 Trip 能恢复
```

这就是原产品最核心的用户感知价值，也是后续扩展 Collections、Receipts、Flights、Events、Collaboration 的基础。

