# Mindtrip 网站复现文档：产品功能与用户链路

> 本文档用于指导复现 Mindtrip 官网 Traveler 端核心体验。  
> 重点不是设计一个泛旅行 AI 产品，而是按 Mindtrip 官网呈现的功能、入口、用户路径和联动逻辑，拆成可复现的产品模块。  
> 本文档是复现文档的一部分，偏产品与功能定义；技术架构、数据模型、Agent 实现另文展开。

---

## 1. 复现目标与范围

### 1.1 复现目标

P0 阶段复现一个 Mindtrip-like AI 旅行规划网站的最核心闭环：

```text
聊天提问
→ 生成行程
→ 浏览个性化推荐
→ 查看地图
→ 局部修改
→ 保存 Trip
```

P0 的目标不是完整复刻 Mindtrip 所有功能，而是先复现用户最容易感知到的主体验：用 AI 生成一个可编辑、可查看地图、可继续追问修改的 Trip Plan。

### 1.2 复现范围

P0 只复现 Traveler 端核心规划闭环：

- AI Chat Planner
- Trip Plan / Itinerary
- Recommendation Cards
- Map View
- Itinerary Editor
- Session Save

P0 暂不复现，只放入后续 backlog：

- Inspiration / Popular Itineraries
- Collections
- Google Pins Import
- Start Anywhere
- Receipts / Confirmations Organizer
- Plan with your crew
- Events Nearby
- Flights / Personal Flight Agent
- Mobile Nearby Assistant
- Creator 后台
- Business/Partner 后台
- 真实出票/支付闭环
- 原生 iOS App 完整实现
- 供应商管理后台

---

## 2. 官网功能映射

| 官网功能/表达 | 复现模块 | 复现重点 |
|---|---|---|
| Start chatting | AI Chat Planner | 对话生成建议或完整行程 |
| Popular itineraries / Inspiration | Inspiration Feed | 浏览他人行程、复制并自定义 |
| Personalized recommendations | Recommendation Explorer | 推荐餐厅、景点、酒店、活动 |
| Trip plan / Itinerary | Trip Workspace | 分天行程、地图、编辑、保存 |
| Collections | Collections | 按目的地/主题/vibe 保存地点 |
| Google Pins | Google Pins Import | 导入 Google Maps saved places 并生成收藏集 |
| Start Anywhere | Start Anywhere Import | 从链接、图片、截图、PDF 创建清单或行程 |
| Upload and organize travel receipts | Receipts Organizer | 上传/转发订单，统一管理确认信息 |
| Plan with your crew | Collaboration | 邀请同行者、群聊、共同编辑 |
| @Mindtrip in group chat | Group AI Assistant | 在群聊中总结偏好、给折中建议 |
| Events | Events Nearby | 找附近演出、市集、亲子活动等 |
| Flights / Personal Flight Agent | Flight Agent | 航班搜索、偏好理解、价格比较 |
| iOS location-smart exploring | Mobile Nearby Assistant | 旅途中基于位置发现 nearby 内容 |

---

## 3. 产品定位

Mindtrip 的核心不是“AI 生成旅行攻略”，而是“AI 旅行工作台”。

用户价值应体现为：

- 从聊天、灵感、地图收藏、订单、航班、附近探索等任意入口开始。
- 把分散信息统一沉淀到 Trip Plan。
- 所有推荐都能落到地点、地图、时间、来源和下一步操作。
- 用户可以不断修改，而不是每次重新生成。
- 多人旅行时，讨论、编辑、偏好和决策围绕同一个行程发生。

复现时应避免做成纯聊天产品。聊天只是入口之一，核心资产是 Trip Graph：

```text
Trip
├── Itinerary Days
├── Places
├── Hotels
├── Flights
├── Events
├── Receipts / Confirmations
├── Collections
├── Collaborators
└── Source Links
```

---

## 4. 核心用户与使用场景

### 4.1 从零开始规划的用户

用户想快速得到一个靠谱行程初稿。

复现重点：

- 首页/工作台有明显聊天入口。
- 支持输入目的地、天数、偏好、预算、同行人。
- 输出不是长文，而是分天行程 + 地图点位 + 可替换推荐。

### 4.2 被内容种草的用户

用户在文章、短视频、地图列表中看到地点，想整理成清单或行程。

复现重点：

- 支持粘贴链接。
- 支持导入图片、截图、PDF。
- 识别地点后先进入 Collection 或 Custom List，再可生成行程。
- 保留来源链接。

### 4.3 已经有 Google Maps 收藏的用户

用户在 Google Maps 里存了很多地点，希望迁移到旅行计划里。

复现重点：

- 提供 Google Pins 导入入口。
- 导入后按城市/主题自动分组。
- 支持一键转 Collection 或 Trip Plan。

### 4.4 已经预订行程的用户

用户有航班、酒店、活动确认邮件或截图，想集中管理。

复现重点：

- 上传文件或转发邮件。
- 自动识别订单字段。
- 插入 Trip Timeline。
- 检查与行程安排的冲突。

### 4.5 多人一起旅行的用户

用户想邀请朋友一起规划，并减少群聊决策成本。

复现重点：

- 分享邀请链接。
- 同一行程多人编辑。
- 群聊可以关联到行程条目。
- 用户 @Mindtrip 时，AI 总结偏好并给建议。

### 4.6 旅途中探索的用户

用户已到达目的地，想知道附近有什么值得去。

复现重点：

- 基于位置展示 nearby 推荐。
- 支持问“现在开门吗”“值不值得去”“附近有什么适合小孩”。
- 可把附近地点加入当天计划。

---

## 5. 页面级复现

### 5.1 首页

首页要承担两个任务：解释产品价值，并把用户快速带入规划。

必须复现：

- 主 CTA：Start planning / Start chatting。
- 输入框：用户可直接输入目的地或旅行想法。
- 功能入口：Flights、Inspiration、Collections、Google Pins、Events。
- 热门 itinerary 或 destination 示例。
- “从任何地方开始”的入口说明。

不建议首页只是营销页。用户应能在首屏直接开始规划。

### 5.2 Chat / Plan Trip 页面

这是最重要的工作流入口。

页面组成：

- 对话区
- 行程区
- 地图区
- 推荐卡片区
- 变更确认区

用户输入示例：

```text
Plan a 5 day Kyoto trip with temples, coffee, and ramen. Keep it relaxed.
```

页面应输出：

- 分天 itinerary
- 地图点位
- 每日区域
- POI 推荐理由
- 可替换项
- 保存/分享/邀请按钮

### 5.3 Trip Detail 页面

Trip Detail 是复现核心。

必须支持：

- Day-by-day itinerary
- 上午/下午/晚上结构
- POI 卡片
- 酒店、航班、活动、餐厅预约
- 地图路线
- 拖拽或按钮式调整
- 锁定条目
- 替换地点
- 添加备注
- 分享/邀请

每个条目至少包含：

- 名称
- 类型
- 地址/地图坐标
- 时间或建议时段
- 推荐理由
- 来源
- 状态：planned / booked / favorite / needs review

### 5.4 Inspiration 页面

复现 Popular itineraries / Inspiration。

页面应展示：

- 热门目的地
- 热门 itinerary
- 主题行程：family、food、outdoors、romantic、local gems
- 可复制到自己的 trip
- 可基于模板继续对话修改

关键交互：

```text
浏览一个 Paris 3-day itinerary
→ 点击 Add to my trip
→ 系统创建副本
→ 用户输入“make it more kid-friendly”
→ 行程变成亲子版本
```

### 5.5 Recommendation Explorer

复现 personalized recommendations。

页面/组件应支持：

- 餐厅
- 景点
- 酒店
- 活动
- 事件
- 附近地点

每张推荐卡展示：

- 图片
- 名称
- 类型
- 评分/评论摘要
- 地图位置
- 为什么推荐
- Save / Add to trip / Replace 按钮

### 5.6 Collections 页面

Collections 是灵感和行程之间的中间层。

必须支持：

- 创建 collection
- 按目的地、主题、vibe 分组
- 保存地点
- 从 collection 生成 itinerary
- 邀请朋友协作收藏
- 展示来源链接

示例：

```text
Tokyo coffee shops
Kyoto temples
Paris with kids
NYC rainy day list
```

### 5.7 Google Pins Import 页面

这是官网明确功能，应单独复现。

用户路径：

```text
连接/上传 Google Maps saved places
→ 系统读取地点列表
→ 按城市和主题分组
→ 生成 themed collection
→ 用户选择保存或生成行程
```

复现时可先简化为：

- 用户粘贴 Google Maps list 链接。
- 系统解析地点名称和坐标。
- 生成 Collection。

### 5.8 Start Anywhere 页面/入口

Start Anywhere 是“任意素材变旅行清单或行程”的统一入口。

输入类型：

- URL
- 图片
- 截图
- PDF
- 文章
- 社媒内容
- 地图链接

输出类型：

- Custom List
- Collection
- Itinerary Draft
- Trip Patch

用户路径：

```text
上传一张截图或粘贴链接
→ 系统识别其中的地点/订单/旅行信息
→ 展示提取结果
→ 用户选择保存成清单或加入行程
```

### 5.9 Receipts / Confirmations 页面

复现上传和整理旅行确认信息。

必须支持：

- 上传图片/PDF
- 邮件转发入口说明
- 订单列表
- 订单详情
- 低置信字段确认
- 插入行程
- 冲突提醒

订单类型：

- Flight
- Hotel
- Restaurant reservation
- Activity / tour
- Train / transit
- Other

### 5.10 Collaboration 页面/侧栏

复现 Plan with your crew。

必须支持：

- 邀请成员
- 成员权限
- 群聊
- 对某个 Day 或 POI 评论
- @Mindtrip 提问
- AI 生成折中建议
- 投票

AI 不应自动插嘴，只在用户 @Mindtrip 或出现明确冲突时介入。

### 5.11 Events 页面/模块

复现 Events。

用户可发现：

- Concerts
- Comedy shows
- Farmers' markets
- Family activities
- Local festivals
- Food events

排序应更偏即时性：

- 距离
- 时间
- 当前是否可参加
- 与用户 vibe 是否匹配
- 是否适合同行人

操作：

- Save
- Add to trip
- Buy tickets，占位即可

### 5.12 Flights 页面

复现 Personal Flight Agent。

用户可以输入：

```text
Find flights from SFO to Tokyo in late March, flexible by 3 days, prefer nonstop.
```

功能清单：

- 出发地/目的地
- 日期或灵活日期
- 单程/往返/多城市
- 人数
- 舱位
- 预算
- 偏好：直飞、早上出发、少转机、航空公司
- 结果排序：价格、总时长、转机次数、出发时间

MVP 可不做真实出票，只做航班搜索结果和加入行程。

### 5.13 Mobile Nearby Assistant

复现 iOS 端 location-smart exploration 的核心体验。

功能：

- 读取当前位置
- 显示附近推荐
- 支持自然语言问附近问题
- 标注 open now
- 标注距离
- 支持加入当前行程

相机识别、菜单翻译可作为增强功能，不作为官网一级必复现功能。

---

## 6. 功能模块复现说明

### 6.1 AI Chat Planner

用户目标：

- 从一句话得到旅行建议或完整行程。
- 能持续追问和修改。

复现功能：

| 功能 | 复现要求 |
|---|---|
| 新建行程 | 根据目的地、天数、偏好生成 itinerary |
| 旅行建议 | 用户不确定目的地时，先推荐 destination |
| 局部修改 | “第二天轻松点”只修改 Day 2 |
| 替换地点 | “换一个更近的餐厅”返回候选替换 |
| 解释原因 | 说明为什么这样安排 |
| 地图同步 | 生成行程同时生成地图点位 |

### 6.2 Personalized Recommendations

用户目标：

- 发现适合自己的餐厅、景点、酒店和活动。

复现功能：

| 功能 | 复现要求 |
|---|---|
| 推荐卡片 | 图片、名称、类型、评分、位置、理由 |
| Save | 保存到 Collection |
| Add to trip | 加入某一天 |
| Replace | 替换当前行程里的同类地点 |
| Filter | 类型、距离、预算、开放状态 |

### 6.3 Itinerary Editor

用户目标：

- 像编辑文档一样编辑行程。

复现功能：

- 分天展示。
- 添加/删除/移动地点。
- 锁定地点。
- 修改时段。
- 显示通勤时间。
- 显示冲突。
- 保存版本。

### 6.4 Inspiration / Popular Itineraries

用户目标：

- 从他人的行程获得灵感，并复制修改。

复现功能：

- 热门行程列表。
- 按目的地/主题筛选。
- 行程详情预览。
- Add to my trip。
- 基于模板继续对话修改。

### 6.5 Collections

用户目标：

- 不急着规划时，先保存灵感。

复现功能：

- 新建 collection。
- 保存 POI。
- 自动按目的地/主题整理。
- 从 collection 生成 itinerary。
- 分享 collection。

### 6.6 Google Pins

用户目标：

- 把 Google Maps 里的收藏地点迁移进 Mindtrip-like 产品。

复现功能：

- 导入 Google Maps list。
- 解析 POI。
- 去重。
- 自动生成 themed collection。
- 可继续生成 itinerary。

### 6.7 Start Anywhere

用户目标：

- 任何旅行素材都能变成可用清单。

复现功能：

- 粘贴 URL。
- 上传图片/截图/PDF。
- 提取地点或订单信息。
- 展示识别结果。
- 选择输出为 List / Collection / Itinerary。

### 6.8 Receipts Organizer

用户目标：

- 管理所有旅行确认信息。

复现功能：

- 上传订单。
- 字段识别。
- 低置信字段确认。
- 按时间排序。
- 插入行程。
- 冲突提示。

### 6.9 Collaboration

用户目标：

- 和朋友一起规划，不再靠群聊散乱决策。

复现功能：

- 邀请链接。
- 成员列表。
- 共同编辑。
- 群聊。
- @Mindtrip。
- 总结偏好。
- 生成折中方案。
- 投票。

### 6.10 Events Nearby

用户目标：

- 在目的地找到临时可参加的本地活动。

复现功能：

- 按日期和位置展示活动。
- 支持 vibe 筛选。
- 加入行程。
- 买票按钮占位。

### 6.11 Flight Agent

用户目标：

- 用自然语言找航班，并把航班作为行程约束。

复现功能：

- 航班搜索表单。
- 自然语言解析。
- 灵活日期。
- 多城市。
- 价格/时长/转机排序。
- 保存航班到 Trip。

### 6.12 Mobile Nearby Assistant

用户目标：

- 到当地后快速找到附近可去的地方。

复现功能：

- Nearby list。
- Open now。
- 距离。
- Ask nearby question。
- Add to today。

---

## 7. 功能联动逻辑

### 7.1 Chat → Trip Plan

```text
用户输入旅行需求
→ 系统识别目的地/天数/偏好
→ 推荐 POI
→ 生成分天 itinerary
→ 同步地图
→ 用户继续修改
```

### 7.2 Inspiration → Trip Plan

```text
用户浏览热门 itinerary
→ Add to my trip
→ 系统复制模板
→ 用户用聊天调整偏好
→ 生成个人版本
```

### 7.3 Start Anywhere → Collection / Itinerary

```text
用户上传截图/PDF/链接
→ 系统识别地点或旅行信息
→ 展示提取结果
→ 用户选择保存为 Collection 或生成 Itinerary
```

### 7.4 Google Pins → Collection → Itinerary

```text
用户导入 Google Maps saved places
→ 系统按城市/主题分组
→ 生成 Collection
→ 用户选择部分地点
→ 生成 Trip Plan
```

### 7.5 Receipts → Trip Timeline

```text
用户上传订单
→ 系统识别航班/酒店/活动
→ 插入时间轴
→ 检查冲突
→ 用户确认修复方案
```

### 7.6 Flights → Trip Plan

```text
用户搜索航班
→ 选择候选航班
→ 保存到 Trip
→ 航班到达/离开时间成为行程约束
→ Planner 调整首尾两天安排
```

### 7.7 Events → Itinerary

```text
用户浏览目的地 Events
→ 筛选日期和 vibe
→ Save 或 Add to trip
→ 系统把 event 作为固定时间活动加入当天
```

### 7.8 Collaboration → Group Decision

```text
成员在群聊讨论
→ 用户 @Mindtrip
→ 系统总结大家偏好
→ 生成 1-3 个折中方案
→ 成员投票
→ 胜出方案更新行程
```

### 7.9 Mobile Nearby → Today Plan

```text
用户在目的地打开 Nearby
→ 系统读取当前位置
→ 推荐附近 open now 地点
→ 用户加入今天下午
→ 系统检查是否影响后续安排
```

---

## 8. 用户意图识别

复现时，意图识别要服务具体产品动作，而不是只输出聊天分类。

| 用户输入 | 产品意图 | 默认动作 |
|---|---|---|
| “Plan 5 days in Kyoto” | create_trip | 新建行程 |
| “Make day 2 more relaxed” | patch_itinerary | 局部修改 Day 2 |
| “Find a better sushi place near hotel” | replace_place | 推荐替换项 |
| “Save this video” | import_inspiration | 提取地点并保存 |
| “Make a trip from this list” | collection_to_trip | 用 Collection 生成行程 |
| “Import my Google pins” | import_google_pins | 进入 Google Pins 导入 |
| 上传机票截图 | import_receipt | 识别订单 |
| “Find flights to Tokyo” | search_flights | 进入 Flight Agent |
| “What’s happening nearby tonight?” | search_events | 搜 nearby events |
| “@Mindtrip what should we pick?” | group_decision | 总结偏好并给方案 |

### 8.1 追问策略

应该追问：

- 不知道目的地但用户要生成行程。
- 修改目标不明确，例如“改一下”。
- 上传图片无法判断是订单还是旅行灵感。
- 低置信订单字段会影响时间。
- 即将移动航班、酒店、已付款活动。

不应该追问：

- 日期缺失但可以先生成通用行程。
- 预算模糊但可以默认中等。
- 用户只是想保存链接。
- Google Pins 已能解析出城市和地点。

---

## 9. 推荐、检索与排序的产品逻辑

用户不关心底层检索方式，只关心推荐是否可信、顺路、符合偏好。

### 9.1 推荐质量维度

| 维度 | 产品含义 |
|---|---|
| Preference fit | 是否符合用户兴趣 |
| Location fit | 是否顺路或靠近当前区域 |
| Time fit | 是否适合该时段/是否开放 |
| Popularity | 是否经典或高评价 |
| Novelty | 是否有小众惊喜 |
| Budget fit | 是否符合预算 |
| Group fit | 是否覆盖多人偏好 |
| Source trust | 来源是否可信 |
| Freshness | 数据是否可能过期 |

### 9.2 不同场景的排序差异

| 场景 | 排序优先级 |
|---|---|
| 首次去热门城市 | 经典程度 + 顺路 + 高可信 |
| 二刷/深度游 | 小众程度 + 本地感 + 低重复 |
| 亲子旅行 | 安全 + 交通便利 + 停留舒适 |
| 附近探索 | 距离 + 当前开放 + 可立即前往 |
| Events | 时间匹配 + 距离 + vibe |
| Flights | 价格 + 总时长 + 转机次数 + 时间偏好 |
| 多人协作 | 覆盖多人核心偏好 |

### 9.3 来源可信度

推荐结果应显示或内部保留来源：

- 官方/地图数据
- 用户收藏
- Google Pins
- 来源链接
- 订单确认
- 热门 itinerary
- AI 推测

AI 推测不能伪装成事实。低可信地点要标记 needs review。

---

## 10. 结果生成与展示规范

### 10.1 输出不应是长篇攻略

优先输出结构化对象：

- itinerary day
- place card
- recommendation card
- collection item
- receipt item
- event card
- flight card

### 10.2 每个结果都要有下一步动作

常见动作：

- Save
- Add to trip
- Replace
- Lock
- Move
- Invite
- Vote
- Confirm
- View on map
- Book，占位

### 10.3 变更要有摘要

用户修改行程后，应展示：

```text
已把 Day 2 调轻松：
- 删除 1 个跨区景点
- 下午集中在岚山
- 晚上加入居酒屋
- 预计少通勤 35 分钟
```

### 10.4 地图必须与行程联动

复现时，地图不是装饰，而是验证行程可执行性的核心组件。

必须支持：

- 点击行程条目，地图定位。
- 点击地图 marker，打开 POI 卡片。
- 不同天不同颜色。
- 显示当天主要路线。
- 提醒跨区过远或时间过紧。

---

## 11. 复现优先级

### 11.1 P0：核心规划闭环

P0 是唯一当前要做的范围。它对应 Mindtrip 官网最核心的体验：Start chatting → AI-generated itinerary → personalized recommendations → map-backed trip plan。

P0 必须完成：

- 首页聊天入口
- AI Chat Planner
- Trip Detail / Trip Workspace
- 分天 itinerary
- Map View
- Recommendation Cards
- 局部修改
- Session Save

P0 不做：

- 真实登录体系，可先用本地 session 或 mock user。
- 真实预订和支付。
- 订单/收据导入。
- 多人协作。
- Google Pins。
- Start Anywhere。
- Flights。
- Events。
- Mobile Nearby。
- 原生 App。

### 11.2 P0 功能拆分

| 子模块 | 必做能力 | 不做能力 |
|---|---|---|
| 首页 | 输入目的地/偏好并开始规划 | 复杂营销页、完整 SEO 内容 |
| Chat Planner | 理解目的地、天数、兴趣、节奏，生成行程 | 多模态输入、航班搜索、订单识别 |
| Trip Workspace | 展示分天行程和 POI 卡片 | 多人实时编辑 |
| Map View | 展示每天地点 marker，点击联动 POI | 精准路线导航、实时交通 |
| Recommendations | 展示候选地点、推荐理由、替换按钮 | 全量酒店/票务库存 |
| Edit Flow | 支持“第二天轻松点”“换个餐厅”这类局部修改 | 任意复杂自然语言操作 |
| Save Session | 保留当前 trip 和对话上下文 | 跨设备账户同步 |

### 11.3 P0 用户主流程

```text
用户进入首页
→ 输入“Kyoto 5 days, temples, coffee, ramen, relaxed”
→ 系统生成 Trip
→ 用户进入 Trip Detail
→ 左侧/中间看到分天 itinerary
→ 右侧看到地图点位
→ 用户点击某个 POI，地图定位
→ 用户输入“make day 2 lighter and add an izakaya”
→ 系统只修改 Day 2
→ 用户保存 Trip
```

### 11.4 P0 验收标准

功能验收：

- 用户能从首页一句话开始规划。
- 系统能生成至少 3-5 天结构化行程。
- 每天包含 morning / afternoon / evening 或等价时段结构。
- 每个 POI 有名称、类型、推荐理由、坐标或可展示位置。
- 地图能展示行程点位。
- 点击 itinerary 条目能联动地图。
- 支持至少 2 类局部修改：调整节奏、替换/新增 POI。
- 修改后要展示变更摘要。
- 刷新页面后能恢复当前 Trip。

体验验收：

- 首屏不是纯聊天记录，要能看到行程和地图。
- 输出不能是大段攻略文章。
- 用户能看出“为什么推荐这些地点”。
- 用户能看出“这次修改改了哪里”。
- 推荐结果不能明显跨区乱跳。

示例验收流：

```text
用户输入“Kyoto 5 days, temples, coffee, ramen, relaxed”
→ 系统生成 5 天游玩计划
→ 地图展示每天点位
→ 用户输入“make day 2 lighter and add an izakaya”
→ 系统只修改 Day 2
```

### 11.5 P1：灵感与收藏闭环

P1 进入 backlog，P0 完成前不做。

后续可做：

- Inspiration 页面
- Collections
- Start Anywhere 简化版
- Google Maps 单地点/列表导入简化版
- Collection → Trip

验收：

```text
用户粘贴一组地点或链接
→ 系统提取地点
→ 生成 Collection
→ 用户选择生成 3 天游玩计划
```

### 11.6 P2：订单与协作闭环

P2 进入 backlog。

后续可做：

- Receipts Organizer
- 订单插入 Trip Timeline
- 冲突提醒
- 邀请协作
- 群聊
- @Mindtrip 决策建议

### 11.7 P3：Flights 与 Events

P3 进入 backlog。

后续可做：

- Flight Agent 搜索与结果页
- 保存航班到 Trip
- Events Nearby
- Add event to trip

### 11.8 P4：移动端附近探索

P4 进入 backlog。

后续可做：

- Nearby list
- Open now
- Ask nearby
- Add to today

相机识别、菜单翻译可作为增强功能，不放入首版必复现。

---

## 12. 与官网一致性自查

| 官网能力 | 当前复现设计状态 |
|---|---|
| Start chatting | P0 复现 |
| AI-generated itinerary | P0 复现 |
| Personalized recommendations | P0 只复现行程内推荐卡片 |
| Trip plan / Itinerary | P0 复现 |
| Map-backed planning | P0 复现 |
| Popular itineraries | P1 backlog |
| Collections | P1 backlog |
| Google Pins | P1 backlog |
| Start Anywhere | P1 backlog |
| Receipts / confirmations | P2 backlog |
| Plan with your crew | P2 backlog |
| @Mindtrip group suggestions | P2 backlog |
| Events | P3 backlog |
| Flights | P3 backlog |
| iOS nearby assistant | P4 backlog |
| Creator / Business | 暂不复现 |

---

## 13. 复现时的产品边界

### 13.1 不做成纯 ChatGPT Wrapper

判断标准：

- 是否有可编辑 Trip Detail。
- 是否有地图。
- 是否能保存地点和来源。
- 是否能从 Collection/Receipt/Flight/Event 回流到 Trip。
- 是否能局部修改而不是整篇重写。

### 13.2 不过度依赖 AI

适合 AI 的部分：

- 理解用户偏好。
- 生成行程草稿。
- 总结变更。
- 从非结构化内容提取地点。
- 总结多人偏好。

不适合 AI 单独决定的部分：

- 航班价格和库存。
- 订单确认信息。
- 地点是否真实存在。
- 当前是否营业。
- 权限判断。
- 支付/出票。

### 13.3 所有入口最终沉淀到 Trip 或 Collection

这是复现 Mindtrip 体验的关键：

```text
Chat → Trip
Inspiration → Trip / Collection
Google Pins → Collection → Trip
Start Anywhere → List / Collection / Trip
Receipts → Trip Timeline
Flights → Trip Timeline
Events → Trip Item
Nearby → Today Plan
Collaboration → Trip Version
```

---

## 14. 一句话总结

本复现文档要复现的不是“AI 写攻略”，而是 Mindtrip 的核心体验：

```text
用户可以从聊天、灵感、地图收藏、订单、航班、活动和附近探索任意入口开始，
并把所有旅行信息汇聚成一个可编辑、可协作、可验证的智能 Trip Plan。
```
