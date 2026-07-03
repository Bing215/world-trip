# Mindtrip-like Travel Agent System v3

> 目标：补全并校正 v2 的 Agent 定义、功能清单与联动逻辑，形成一套更适合工程落地的设计。  
> 核心原则：Agent 只负责有明确决策/生成/检索边界的任务；纯工具能力归为 Skill 或 Service。

---

## 1. 总体分层

系统不应把所有能力都做成独立 Agent。更合理的分层是：

| 层级 | 职责 | 示例 |
|---|---|---|
| Product Surface | 用户入口与交互 | 对话框、地图、收藏、相机、协作编辑 |
| Orchestrator | 识别任务、调度 DAG、处理降级 | 文本规划、图片路由、链接抓取、冲突处理 |
| Domain Agent | 某个业务阶段的智能决策 | IntentAgent、TripPlannerAgent、ReceiptUnderstandingAgent |
| Skill | Agent 内部可测试能力 | slot_fill、rrf_fusion、timeline_insert |
| Service | 无业务智能的基础设施 | POI DB、Search、Vector Store、Redis、Maps API |

关键修正：

- 不把 CRUD、权限判断、文件类型识别这类纯规则能力包装成 Agent。
- 不让一个 Agent 同时承担“存储、判断、生成、同步”多个不相关职责。
- LLM 只参与模糊理解、生成、抽取和解释；事实、排序、权限、冲突检测尽量由结构化逻辑完成。

---

## 2. 顶层功能域

| 域 | 用户功能 | 核心输出 | 核心依赖 |
|---|---|---|---|
| A. Trip Planning | 对话生成/修改行程 | ItineraryDraft / ItineraryPatch | Intent、POI 检索、排序、地图 |
| B. Booking Import | 订单/收据导入 | BookingEvent + TimelinePatch | OCR、字段抽取、冲突检测 |
| C. Inspiration Capture | 链接/视频转收藏或行程 | Collection / ItineraryPatch | 抓取、多模态实体识别、POI 匹配 |
| D. In-trip Assistant | 相机识别、菜单翻译、附近推荐 | SceneCard / MenuCard / NearbyList | 视觉识别、GPS、POI 查询 |
| E. Collaboration | 多人协作编辑与决策 | CRDT Update / DecisionProposal | Yjs、权限、消息、偏好分析 |

---

## 3. 修订后的 Agent 清单

建议保留 14 个 Agent，而不是 21 个。被移除的 Agent 多数应降级为 Skill 或 Service。

| Agent | 所属域 | 是否调用 LLM | 核心职责 |
|---|---|---:|---|
| OrchestratorAgent | 全局 | 可选 | 任务分类、DAG 调度、降级策略、结果聚合 |
| IntentAgent | A | 是 | 识别用户旅行意图，生成 create/patch/query intent |
| RetrievalRankerAgent | A/C/D | 否 | POI 召回、融合排序、候选过滤 |
| TripPlannerAgent | A/E | 是 | 候选 POI 到分天行程/局部补丁 |
| ResponseComposerAgent | A/B/C/D/E | 是 | 把结构化结果变成用户可读响应与解释 |
| ReceiptUnderstandingAgent | B | 是 | OCR 后字段抽取、置信度判断 |
| TimelineMergeAgent | B | 可选 | 订单插入行程、冲突检测、修复建议 |
| ContentFetchAgent | C | 否 | URL/视频/地图链接抓取与媒体标准化 |
| InspirationUnderstandingAgent | C | 是 | 从文本/视频帧/字幕抽取旅行实体 |
| EntityResolutionAgent | C/D | 否 | 实体到标准 POI 的匹配与消歧 |
| CameraUnderstandingAgent | D | 是 | 地标、文字区域、场景类型识别 |
| MenuTranslationAgent | D | 是 | 菜单/路牌 OCR、翻译、解释 |
| CollaborationSyncAgent | E | 否 | CRDT 同步、语义冲突事件识别 |
| GroupDecisionAgent | E | 是 | 群体偏好总结、折中方案生成 |

说明：

- Permission 不单独成 Agent，应是 Auth/RBAC Service。
- Message 存储不单独成 Agent，应是 Messaging Service；只有“群体偏好分析”才需要 Agent。
- Render 不应只服务规划域，统一改为 ResponseComposerAgent，负责跨域解释、流式文案和前端 payload。
- POI 检索/排序被多域复用，因此从 A 域提升为共享 RetrievalRankerAgent。

---

## 4. OrchestratorAgent

### 4.1 职责

OrchestratorAgent 是控制平面，不是业务生成器。

它负责：

- 输入分类：text、image、pdf、email、url、camera_frame、edit_operation。
- 意图路由：planning、booking_import、inspiration、camera、collaboration。
- 二义性处理：尤其是图片到底是订单截图还是现场照片。
- DAG 构建：根据任务选择 Agent，并标注依赖关系。
- 超时与降级：控制 partial response、重试、追问、异步补推。
- Session 写入：保存 intent、itinerary version、用户偏好、trace。

### 4.2 不负责

- 不直接生成行程。
- 不直接检索 POI。
- 不直接做完整 OCR 或实体识别；只可调用轻量预检 Service 辅助路由。
- 不保存聊天消息正文，消息应由 Messaging Service 处理。

### 4.3 输入输出

```ts
interface UserRequest {
  request_id: string;
  session_id: string;
  user_id: string;
  entry_point?: "chat" | "receipt_upload" | "camera" | "share" | "collab";
  modality: "text" | "image" | "pdf" | "email" | "url" | "camera_frame" | "edit_operation";
  payload: unknown;
  client_context?: {
    trip_id?: string;
    current_view?: "planning" | "booking" | "camera" | "collection" | "collab";
    gps?: { lat: number; lng: number };
    locale?: string;
  };
}

interface OrchestratorResponse {
  response_id: string;
  task_type: string;
  result: unknown;
  agent_trace: AgentTrace[];
  partial: boolean;
  follow_up_question?: string;
}
```

### 4.4 路由规则

| 输入 | 优先判断 | 目标 |
|---|---|---|
| chat text | 是否是创建/修改/查询行程 | A |
| image from receipt_upload | 入口明确 | B |
| image from camera | 入口明确 | D |
| image from chat | 最近对话 + 轻量文档/场景预检 + GPS | B 或 D |
| url | Google Maps/视频/文章/社媒 | C |
| edit_operation | 协作编辑事件 | E |

---

## 5. A 域：Trip Planning

### 5.1 IntentAgent

#### 职责

把用户自然语言和历史 session 合并成可执行旅行意图。

#### 功能清单

| Skill | 说明 |
|---|---|
| classify_action | 判断 create_trip、patch_trip、ask_trip、compare_options |
| slot_extract | 抽取目的地、天数、日期、预算、人数、兴趣、限制 |
| context_merge | 与历史 session 合并，只更新变化字段 |
| target_resolve | 解析“第二天”“那个拉面店”“下午那段”等引用 |
| ambiguity_check | 判断是否需要追问 |
| patch_plan_build | 生成局部修改指令，而不是整单重排 |

#### 输出

```ts
interface TripIntent {
  action: "create_trip" | "patch_trip" | "ask_trip" | "compare_options";
  destination?: string;
  date_range?: { start: string; end: string };
  days?: number;
  party_size?: number;
  interests?: string[];
  budget?: {
    level: "low" | "mid" | "high" | "luxury" | "unknown";
    amount_per_day?: number;
    currency?: string;
  };
  constraints?: string[];
  target?: {
    day?: number;
    poi_id?: string;
    slot?: "morning" | "afternoon" | "evening";
  };
  patch?: {
    add?: string[];
    remove?: string[];
    change_pace?: "relaxed" | "balanced" | "packed";
    lock_items?: string[];
  };
  missing_slots: string[];
  confidence: number;
  clarification_question?: string;
}
```

#### 失败降级

- 目的地缺失但用户明显想规划：追问目的地。
- 日期缺失：可继续规划，标注“未按具体营业日期过滤”。
- patch target 不明确：追问“你想改第几天/哪个地点？”

---

### 5.2 RetrievalRankerAgent

#### 职责

从 POI 库中召回并排序候选地点。它是共享 Agent，也服务灵感和相机附近推荐。

#### 功能清单

| Skill | 说明 |
|---|---|
| geo_scope_resolve | 根据目的地解析城市中心、行政边界、多城市路线 |
| query_expand | 把“寺庙、拉面、小众”扩展为 tags、alias、local language |
| lexical_search | ES/OpenSearch BM25 + geo filter |
| vector_search | 语义向量召回 |
| popularity_prior | 引入评分、评论数、收藏数、编辑精选 |
| rrf_fusion | 多路召回融合 |
| constraint_filter | 预算、开放时间、亲子/无障碍/季节性过滤 |
| diversity_rerank | 控制同类 POI 过密 |

#### 排序特征

```ts
interface PoiRankingFeatures {
  lexical_score: number;
  vector_score: number;
  geo_distance_km: number;
  popularity_score: number;
  rating_score: number;
  freshness_score: number;
  budget_match_score: number;
  opening_hours_score: number;
  diversity_penalty: number;
  already_used_penalty: number;
}
```

#### 输出

```ts
interface RankedPoiCandidate {
  poi: POI;
  rank: number;
  score: number;
  reasons: string[];
  warnings?: string[];
}
```

#### 失败降级

- 无结果：扩大半径。
- 仍无结果：去掉一个低优先级兴趣标签。
- 仍无结果：切换到城市级热门 POI。
- 目的地不在库：允许 LLM 生成“草案”，但所有 POI 标记为 unverified。

---

### 5.3 TripPlannerAgent

#### 职责

把候选 POI 变成可执行、可解释、可编辑的行程。

#### 功能清单

| Skill | 说明 |
|---|---|
| day_capacity_estimate | 根据天数、节奏、出行人群估算每天容量 |
| geo_cluster | 按区域把 POI 分到不同天 |
| anchor_select | 选择每天核心锚点 POI |
| route_order | 计算每天内部顺序 |
| time_slot_assign | 分配 morning/afternoon/evening |
| meal_balance | 保证餐饮和休息点合理出现 |
| constraint_satisfy | 满足预算、亲子、无障碍、不太累等限制 |
| llm_narrative | 生成标题、推荐理由、自然语言说明 |
| patch_apply | 对已有行程做局部修改，尽量少扰动用户已确认内容 |

#### 规划原则

- 先结构化规划，再让 LLM 写解释。
- 用户锁定的 POI 不被自动删除。
- 局部修改默认不重排全局，除非冲突无法局部修复。
- 每天至少有一个主区域，避免跨城跳跃。
- 每天保留休息/交通 buffer。

#### 输出

```ts
interface ItineraryDraft {
  trip_id: string;
  version: string;
  days: ItineraryDay[];
  quality: {
    preference_match: number;
    route_efficiency: number;
    diversity: number;
    confidence: number;
  };
  assumptions: string[];
  unresolved_warnings: string[];
}
```

---

### 5.4 ResponseComposerAgent

#### 职责

把结构化结果组织成用户能理解、前端能渲染的响应。

#### 功能清单

| Skill | 说明 |
|---|---|
| text_stream | SSE 生成自然语言回复 |
| map_payload_build | 生成 GeoJSON、路线段、marker |
| diff_summary | 说明这次改了什么 |
| confidence_explain | 对低置信度结果做透明解释 |
| action_buttons | 生成“确认/替换/保存/预订/投票”等下一步动作 |

---

## 6. B 域：Booking Import

### 6.1 ReceiptUnderstandingAgent

#### 职责

从图片、PDF、邮件中抽取标准 BookingEvent。

#### 功能清单

| Skill | 说明 |
|---|---|
| document_ocr | 图片/PDF/扫描件文字识别 |
| layout_parse | 区域识别：航班、酒店、价格、日期 |
| booking_type_classify | flight/hotel/activity/restaurant/other |
| schema_extract | 按 JSON Schema 抽取字段 |
| date_timezone_normalize | 日期和时区标准化 |
| field_confidence | 每个字段给置信度 |
| duplicate_detect | 按 confirmation_no/provider/date 去重 |

#### 输出

```ts
interface BookingEvent {
  type: "flight" | "hotel" | "train" | "activity" | "restaurant" | "other";
  provider?: string;
  confirmation_no?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  participants?: string[];
  price?: { amount: number; currency: string };
  source: {
    kind: "image" | "pdf" | "email";
    file_id?: string;
  };
  confidence: Record<string, number>;
  requires_review: string[];
}
```

### 6.2 TimelineMergeAgent

#### 职责

把 BookingEvent 插入行程时间轴，并处理冲突。

#### 功能清单

| Skill | 说明 |
|---|---|
| idempotent_insert | 幂等插入 |
| interval_conflict_detect | 时间重叠检测 |
| travel_feasibility_check | 飞机/酒店/景点之间的交通可行性 |
| severity_classify | minor/major/blocking |
| auto_fix_minor | 自动调整轻微冲突 |
| repair_options | 对重大冲突生成 2-3 个修复方案 |

#### 自动修复边界

- 可自动修：同城景点时间轻微重叠、顺序明显更合理。
- 不自动修：航班、酒店入住退房、已付款活动、用户锁定项目。

---

## 7. C 域：Inspiration Capture

### 7.1 ContentFetchAgent

#### 职责

把 URL 变成统一 MediaContent。

#### 功能清单

| Skill | 说明 |
|---|---|
| platform_detect | maps/article/youtube/instagram/tiktok |
| html_extract | 正文、标题、图片 |
| video_subtitle_extract | 字幕与描述 |
| frame_sample | 抽关键帧 |
| maps_place_parse | Google Maps/Apple Maps 链接解析 |
| partial_fallback | 抓取失败时返回可用部分 |

### 7.2 InspirationUnderstandingAgent

#### 职责

从内容中识别旅行实体和内容意图。

#### 功能清单

| Skill | 说明 |
|---|---|
| text_entity_extract | 从正文/字幕抽取地点、店名、区域 |
| visual_entity_extract | 从关键帧识别招牌、菜单、建筑 |
| cross_modal_align | 对齐“这家店”等指代 |
| sentiment_extract | 判断博主推荐/避雷/中性 |
| import_intent_classify | 收藏、追加行程、创建新草案 |

### 7.3 EntityResolutionAgent

#### 职责

把抽取实体匹配到标准 POI。

#### 功能清单

| Skill | 说明 |
|---|---|
| alias_lookup | 多语言别名查询 |
| fuzzy_match | 模糊匹配 |
| geo_context_filter | 城市和 GPS 上下文过滤 |
| candidate_disambiguate | 同名地点消歧 |
| low_confidence_candidates | 返回候选供用户选择 |

---

## 8. D 域：In-trip Assistant

### 8.1 CameraUnderstandingAgent

#### 职责

识别现场图像中的地标、场景、文字区域。

#### 功能清单

| Skill | 说明 |
|---|---|
| image_precheck | 压缩、质量检查、模糊检测 |
| landmark_detect | 地标识别 |
| text_region_detect | 菜单/路牌/说明牌区域 |
| scene_classify | landmark/menu/street/sign/museum/object |
| gps_fallback | 用 GPS 查询附近 POI |
| uncertainty_label | 明确标注不确定识别 |

### 8.2 MenuTranslationAgent

#### 职责

菜单、路牌、说明牌的 OCR、翻译和解释。

#### 功能清单

| Skill | 说明 |
|---|---|
| targeted_ocr | 对文字区域 OCR |
| language_detect | 识别源语言 |
| translation | 保留原文对照 |
| dish_explain | 菜品解释、食材、口味 |
| allergen_tag | 过敏原风险标签 |
| unknown_guard | 不确定时不编造 |

---

## 9. E 域：Collaboration

### 9.1 CollaborationSyncAgent

#### 职责

处理多人实时编辑和语义冲突事件。

#### 功能清单

| Skill | 说明 |
|---|---|
| crdt_apply | 应用 Yjs update |
| broadcast_update | WebSocket 广播 |
| offline_replay | 离线操作回放 |
| semantic_conflict_detect | 同一时段/同一 POI 的语义冲突识别 |
| decision_trigger | 触发 GroupDecisionAgent |

注意：RBAC 是 Permission Service，不是 Agent。

### 9.2 GroupDecisionAgent

#### 职责

在冲突或用户主动请求时，提炼群体偏好并生成折中方案。

#### 功能清单

| Skill | 说明 |
|---|---|
| preference_matrix | 从聊天和编辑行为提取偏好 |
| disagreement_summary | 解释分歧点 |
| option_generate | 调用 TripPlannerAgent 生成 1-3 个方案 |
| vote_payload_build | 生成投票选项 |

触发条件：

- SyncAgent 检测到语义冲突。
- 用户明确说“投票”“大家觉得”“AI 帮忙决定”。
- 用户点击决策按钮。

---

## 10. 关键端到端链路

### 10.1 新建行程

```text
User text
→ OrchestratorAgent
→ IntentAgent
→ RetrievalRankerAgent
→ TripPlannerAgent
→ ResponseComposerAgent
→ UI: text stream + map payload
```

### 10.2 修改行程

```text
User: "第二天轻松点，删掉一个寺庙"
→ IntentAgent 输出 patch_trip + target day=2
→ TripPlannerAgent 局部重排 Day 2
→ ResponseComposerAgent 输出 diff summary
```

### 10.3 导入订单

```text
Receipt image/pdf/email
→ OrchestratorAgent route to booking
→ ReceiptUnderstandingAgent
→ TimelineMergeAgent
→ ResponseComposerAgent
```

### 10.4 链接转收藏/行程

```text
URL
→ ContentFetchAgent
→ InspirationUnderstandingAgent
→ EntityResolutionAgent
→ RetrievalRankerAgent enrich
→ TripPlannerAgent optional
→ ResponseComposerAgent
```

### 10.5 相机识别

```text
Camera frame + GPS
→ CameraUnderstandingAgent
→ EntityResolutionAgent / RetrievalRankerAgent
→ MenuTranslationAgent if text region exists
→ ResponseComposerAgent
```

### 10.6 协作冲突

```text
EditOperation
→ Permission Service
→ CollaborationSyncAgent
→ semantic conflict event
→ GroupDecisionAgent
→ TripPlannerAgent optional
→ Messaging Service push proposal
```

---

## 11. 自查：v2 逻辑问题与 v3 修正

| v2 问题 | 风险 | v3 修正 |
|---|---|---|
| Agent 数量偏多，Router/Permission/Message 都被 Agent 化 | 增加延迟和状态同步复杂度 | 纯规则/存储能力降级为 Service |
| RetrievalAgent 只放在规划域 | 灵感和相机也需要 POI 检索 | 提升为共享 RetrievalRankerAgent |
| RenderAgent 只服务规划 | 其他域也需要解释、按钮、置信度说明 | 改为 ResponseComposerAgent |
| 收据 RouterAgent 价值偏低 | MIME 判断不需要 Agent | 合并进 Orchestrator/Service |
| 协作 MessageAgent 不需要 AI | 容易把存储和分析耦合 | 消息存储为 Service，偏好分析归 GroupDecisionAgent |
| PlannerAgent 混合“选点”和“写文案” | 容易让 LLM 决定事实 | 结构化规划优先，LLM 只写解释 |
| 图片路由依赖上下文但未定义预检 | 误把订单当现场照片 | Orchestrator 增加 OCR/场景轻量预检 |
| 排序只提 RRF，不含最终展示排序 | 推荐可能相关但不顺路 | 分召回排序、规划排序、展示排序三层 |
| 自动修复边界不清 | 可能擅自改用户已付款活动 | 明确 minor 可自动修，major/blocking 需确认 |
| LLM 生成事实风险 | 幻觉 POI、价格、营业时间 | 所有非库内事实标记 unverified/ai_generated |

---

## 12. MVP 建议

Phase 1 不要做全部 14 个 Agent。建议只做 5 个：

1. OrchestratorAgent
2. IntentAgent
3. RetrievalRankerAgent
4. TripPlannerAgent
5. ResponseComposerAgent

最小闭环：

```text
自然语言 → Intent → POI 检索排序 → 行程规划 → 地图 + 流式文本
```

Phase 1 必须实现的能力：

- create_trip
- patch_trip
- POI hybrid retrieval
- RRF 融合
- 简单地理聚类
- 每日 POI 容量控制
- GeoJSON 输出
- session 持久化
- partial/error trace

Phase 1 暂缓：

- 收据解析
- Magic Camera
- 视频链接抓取
- 多人 CRDT 协作
- 预订交易
- 高精度 TSP

---

## 13. 实现优先级

| 优先级 | 模块 | 原因 |
|---|---|---|
| P0 | Intent schema + session state | 后续所有域都依赖 |
| P0 | POI 数据模型 + 检索接口 | 决定推荐质量 |
| P0 | TripPlanner 结构化输出 | 决定产品主体验 |
| P0 | Response payload contract | 决定前后端联调 |
| P1 | Patch itinerary | 多轮对话核心 |
| P1 | Error/partial response | 真实系统必需 |
| P2 | Booking import | 强化旅行闭环 |
| P2 | Inspiration capture | 增长入口 |
| P3 | Camera assistant | 移动端体验 |
| P3 | Collaboration | 高复杂度后置 |

---

## 14. 核心结论

这套系统的中心不是“多 Agent 越多越好”，而是围绕 Trip Graph 建立一组可靠的智能工作流：

- IntentAgent 负责理解用户到底想改什么。
- RetrievalRankerAgent 负责确保内容来自可信数据。
- TripPlannerAgent 负责把候选内容变成可执行计划。
- ResponseComposerAgent 负责把结构化结果讲清楚。
- 其他域都应复用这些能力，而不是各自重新造一套检索、排序和生成逻辑。

最终架构应追求：少量高内聚 Agent + 明确 Skill + 可观测 DAG + 结构化数据契约。
