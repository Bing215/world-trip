# 第四章：使用 Agent / Skill 方案的复现执行指南

> 本章承接前文的产品分析、核心功能拆解和 Agent / Skill 设计。  
> 前文已经说明了产品是什么、核心功能是什么、五个 Agent 分别负责什么。  
> 本章不再重复用户流程和 Agent 协作链路，而是说明如何把这套方案用于实际复现：按什么顺序做、每一步产出什么、如何判断是否完成。

---

## 4.1 复现执行总原则

### 4.1.1 先让 Trip Plan 成为产品中心

复现时不要先做一个纯聊天页面，再把行程作为聊天回复展示。

正确的产品中心应该是 Trip Plan：

```text
用户输入
→ Agent 理解和处理
→ 结果沉淀为 Trip Plan
→ 用户围绕 Trip Plan 继续编辑
```

Trip Plan 应该承载：

- 目的地
- 天数
- 用户偏好
- 分天行程
- 地点卡片
- 推荐理由
- 地图点位
- 修改摘要
- 用户已确认或锁定的内容

只要 Trip Plan 没有建立起来，后面的推荐、地图、局部修改都会变成零散功能。

### 4.1.2 先跑通主链路，再处理边缘场景

当前复现优先跑通主链路：

```text
伦敦及周边五日游需求
→ 意图识别
→ 地点推荐和排序
→ 生成五日 Trip Plan
→ 展示地图和地点卡片
→ 支持局部修改
```

不要一开始就扩展：

- 订单
- 航班
- 活动
- 多人协作
- 图片/PDF 导入
- Google Pins
- Start Anywhere

这些功能都应在核心 Trip Plan 体验成立后再做。

### 4.1.3 每一步都要有可验证产物

复现不能只判断“Agent 好像跑了”，而要判断每一步是否产生了产品上可用的结果。

例如：

- IntentAgent 的产物不是一段解释，而是用户意图理解结果。
- RetrievalRankerAgent 的产物不是一句推荐理由，而是可用于规划的候选地点。
- TripPlannerAgent 的产物不是攻略文本，而是分天 Trip Plan。
- ResponseComposerAgent 的产物不是闲聊回复，而是用户可读的卡片、摘要、地图展示信息。

### 4.1.4 Agent 只做自己该做的事

五个 Agent 必须边界清楚。

如果 IntentAgent 开始推荐具体地点，或者 ResponseComposerAgent 开始重排行程，系统会变得难以控制。

正确分工是：

```text
OrchestratorAgent：决定流程
IntentAgent：理解用户
RetrievalRankerAgent：找到地点
TripPlannerAgent：组织行程
ResponseComposerAgent：表达结果
```

---

## 4.2 复现执行顺序

建议按以下顺序使用前文的 Agent / Skill 方案进行复现。

### Step 1：定义 Trip Plan 产品对象

先明确 Trip Plan 在产品上需要承载什么。

这里不要只把 Trip Plan 理解成一个行程标题和几天安排。  
在产品上，它应该是一张完整的旅行计划表单，既能承接用户主动填写的信息，也能承接 Agent 后续生成、补全和修改的内容。

Trip Plan 表单建议按以下分组设计：

| 分组 | 字段 | 产品作用 |
|---|---|---|
| 基础信息 | trip title | 让用户识别这次旅行，例如“伦敦及周边五日游” |
| 基础信息 | destination | 主目的地，例如伦敦 |
| 基础信息 | nearby destinations | 周边目的地，例如 Cambridge、Oxford、Windsor |
| 基础信息 | days | 旅行天数 |
| 基础信息 | date range | 出行日期，可为空，缺失时先生成通用行程 |
| 基础信息 | travelers | 出行人数、同行人类型，例如情侣、朋友、亲子、父母 |
| 偏好 | travel pace | 节奏，例如轻松、均衡、紧凑 |
| 偏好 | interests | 兴趣，例如博物馆、街区漫步、下午茶、市场、周边小镇 |
| 偏好 | avoid list | 不想要的内容，例如不要太多博物馆、不想太赶、不想购物 |
| 预算 | total budget | 总预算 |
| 预算 | daily budget | 每日预算 |
| 预算 | budget level | 低预算、中等、舒适、高端 |
| 交通 | arrival city / airport | 抵达城市或机场 |
| 交通 | departure city / airport | 离开城市或机场 |
| 交通 | flight info | 航班信息，可先作为占位字段 |
| 交通 | local transport | 当地交通偏好，例如步行、地铁、出租车、租车、火车 |
| 住宿 | hotel area | 住宿区域，例如 Westminster、Covent Garden、South Bank |
| 住宿 | hotel info | 酒店名称、地址、入住退房时间，可先作为占位字段 |
| 餐饮 | restaurant preferences | 餐厅偏好，例如本地餐厅、米其林、轻食、酒吧 |
| 餐饮 | afternoon tea preferences | 下午茶偏好，例如经典、高端、拍照友好 |
| 餐饮 | dietary restrictions | 饮食限制，例如素食、清真、过敏 |
| 景点 | must visit places | 必去地点 |
| 景点 | optional places | 可选地点 |
| 景点 | place cards | 地点卡片，承载名称、类型、区域、推荐理由、操作按钮 |
| 行程 | itinerary days | Day 1 - Day N |
| 行程 | itinerary items | 每天的上午、下午、晚上安排 |
| 行程 | locked items | 用户确认或锁定的项目 |
| 地图 | map markers | 地点 marker |
| 地图 | selected place | 当前选中的地点 |
| 地图 | day grouping | 地图上按天分组展示 |
| 状态 | change summary | 本次修改摘要 |
| 状态 | saved state | 保存状态 |
| 状态 | current version | 当前行程版本 |

从用户表单角度看，最核心的输入项可以简化成：

```text
目的地：伦敦及周边
天数：5 天
日期：可选
同行人：可选
兴趣：博物馆、街区漫步、英式下午茶、周边小镇
节奏：不要太赶
预算：中等 / 舒适
交通：步行 + 地铁 + 火车一日游
酒店区域：可选
餐厅偏好：下午茶、本地餐厅、适合晚上聊天的餐厅
必去景点：可选
不想要：太赶、一天太多博物馆、跨区太远
```

这些字段的意义不是要求用户一开始全部填写，而是让 Agent 有一个明确的产品对象可以持续补全：

- 用户说出的内容进入对应字段。
- 用户没说的内容可以为空。
- Agent 生成的推荐可以补充到 itinerary、place cards、map markers。
- 用户后续修改会更新 preferences、itinerary items、change summary。
- 用户确认的内容进入 locked items，后续不应被随意改掉。

完成标准：

```text
可以用一个 Trip Plan 表单承载完整的伦敦及周边五日游，包括目的地、天数、预算、交通、住宿、餐饮、景点、地图和修改状态。
```

### Step 2：准备伦敦及周边内容池

为了让推荐和排序系统能工作，需要先准备一组伦敦及周边地点内容。

内容池至少覆盖：

- 经典地标
- 博物馆
- 街区漫步
- 英式下午茶
- 市场与餐饮
- 公园与河岸
- 周边小镇
- 晚间体验

完成标准：

```text
RetrievalRankerAgent 能从内容池中找到足够多的候选地点。
```

### Step 3：准备核心用户输入样例

先固定一个主测试输入：

```text
帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。
```

再准备几个修改输入：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

```text
第四天不想去剑桥，换成牛津。
```

```text
帮我把第二天安排得轻松一点。
```

完成标准：

```text
这些输入能覆盖新建行程、局部修改、替换目的地、调整节奏四种核心动作。
```

### Step 4：让 IntentAgent 识别用户意图

用核心输入测试 IntentAgent。

它需要识别：

- 用户是否要新建行程
- 目的地是否明确
- 天数是多少
- 用户兴趣是什么
- 节奏偏好是什么
- 修改目标是哪一天或哪个地点

完成标准：

```text
IntentAgent 能把自然语言转成清晰的产品动作。
```

### Step 5：让 RetrievalRankerAgent 提供候选地点

使用 IntentAgent 的理解结果，让 RetrievalRankerAgent 提供候选地点。

它需要覆盖：

- 博物馆类地点
- 街区漫步类地点
- 下午茶地点
- 伦敦经典地标
- 周边一日游目的地
- 替换候选地点

完成标准：

```text
候选地点不是泛泛热门列表，而是能明显匹配用户偏好和伦敦五日游场景。
```

### Step 6：让 TripPlannerAgent 组织行程

使用候选地点生成五日 Trip Plan。

它需要做到：

- 每天有主题
- 每天有主要区域
- 每天地点数量符合“不要太赶”
- 周边小镇单独成天
- 同一天地点尽量顺路
- 博物馆、街区、餐饮和周边游有平衡

完成标准：

```text
用户看到的不是地点清单，而是一个可以执行的五日行程。
```

### Step 7：让 ResponseComposerAgent 生成展示内容

Trip Plan 生成后，需要转成用户能理解的产品表达。

需要生成：

- 行程总览
- 每日标题
- 地点卡片文案
- 推荐理由
- 地图展示信息
- 修改摘要
- 下一步操作建议

完成标准：

```text
用户不用看内部结构，也能理解行程为什么这样安排，并知道下一步可以怎么改。
```

### Step 8：接入 Trip Workspace

把 Agent 输出放进产品界面。

Trip Workspace 至少要展示：

- Chat Panel
- Itinerary Panel
- Map Panel
- Place Card
- Recommendation Card
- Change Summary

完成标准：

```text
用户能在同一个页面看到行程、地点卡片、地图和修改入口。
```

### Step 9：测试局部修改

用修改输入测试局部修改能力：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

需要检查：

- 是否定位到 Day 3
- 是否减少博物馆
- 是否增加街区或散步体验
- 是否保留其他天
- 是否输出变更摘要

完成标准：

```text
系统只修改目标范围，不重写整个行程。
```

### Step 10：测试替换地点

使用地点卡片上的 Replace 动作。

例如：

```text
Replace British Museum
```

需要检查：

- 是否出现 3-5 个替代候选
- 候选是否与原地点类型接近
- 候选是否不破坏当天路线
- 用户选择后 Trip Plan 是否更新

完成标准：

```text
用户能对单个地点进行可控替换。
```

---

## 4.3 每一步的产出物

| 步骤 | 使用对象 | 需要准备什么 | 产出物 | 完成判断 |
|---|---|---|---|---|
| 定义 Trip Plan | 产品对象 | Trip 需要承载的内容 | 可展示的 Trip Plan 结构 | 能承载五日行程 |
| 准备内容池 | RetrievalRankerAgent | 伦敦及周边地点 | 候选 POI 内容池 | 覆盖核心偏好类型 |
| 准备输入样例 | 全局 | 主输入和修改输入 | 测试用例 | 覆盖新建和修改 |
| 意图识别 | IntentAgent | 用户输入 | 产品动作理解 | 能识别目的地、天数、偏好 |
| 推荐排序 | RetrievalRankerAgent | 用户偏好和内容池 | 排序候选地点 | 推荐结果符合偏好 |
| 行程规划 | TripPlannerAgent | 候选地点 | 五日 Trip Plan | 每天主题明确、路线合理 |
| 结果表达 | ResponseComposerAgent | Trip Plan | 说明、卡片、摘要、地图信息 | 用户能理解并操作 |
| 页面承载 | Trip Workspace | Agent 输出 | 行程工作台 | 行程和地图同屏展示 |
| 局部修改 | 五个 Agent 协作 | 修改指令 | 更新后的 Day | 只改目标范围 |
| 替换地点 | Retrieval + Planner | Replace 操作 | 替代候选和更新结果 | 候选合理、替换可控 |

---

## 4.4 最小内容范围

为了复现核心体验，不需要一开始就准备全球 POI 数据。  
只需要先准备足够支撑“伦敦及周边五日游”的内容池。

### 4.4.1 经典地标

用于满足用户第一次到访伦敦的基础体验。

建议包含：

- Westminster
- Big Ben
- Buckingham Palace
- South Bank
- Tower Bridge
- St Paul's Cathedral
- Covent Garden

### 4.4.2 博物馆与文化地点

用于满足用户“喜欢博物馆”的偏好。

建议包含：

- British Museum
- National Gallery
- Victoria and Albert Museum
- Tate Modern
- Sir John Soane's Museum
- Wallace Collection
- Courtauld Gallery
- Museum of London Docklands

### 4.4.3 街区漫步

用于满足用户“喜欢街区漫步”的偏好。

建议包含：

- Shoreditch
- Notting Hill
- Greenwich
- Hampstead
- Covent Garden
- South Bank walk
- Richmond riverside

### 4.4.4 英式下午茶与餐饮

用于满足用户“英式下午茶”和餐饮体验。

建议包含：

- Fortnum & Mason
- Sketch
- The Wolseley
- The Savoy afternoon tea
- Borough Market
- Dishoom
- The Churchill Arms

### 4.4.5 周边小镇与一日游

用于满足用户“伦敦及周边”的需求。

建议包含：

- Cambridge
- Oxford
- Windsor
- Bath
- Canterbury

### 4.4.6 晚间体验

用于让行程不只停留在白天景点。

建议包含：

- West End theatre
- Soho dinner
- South Bank evening walk
- Covent Garden evening
- Shoreditch bars

---

## 4.5 主链路测试用例

### 4.5.1 测试用例一：完整生成行程

输入：

```text
帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。
```

期望结果：

- 生成五日 Trip Plan
- 每天有主题
- 每天有上午、下午、晚上或等价结构
- 至少包含一个周边一日游
- 至少包含一个下午茶体验
- 至少包含博物馆和街区漫步
- 地点安排大致顺路
- 输出不是长篇攻略

### 4.5.2 测试用例二：局部修改

输入：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

期望结果：

- 只更新 Day 3
- 减少博物馆类地点
- 增加街区、河岸或市场类地点
- 其他天不变
- 输出变更摘要

### 4.5.3 测试用例三：替换地点

操作：

```text
Replace British Museum
```

期望结果：

- 出现 3-5 个替代候选
- 候选属于博物馆、画廊或文化地点
- 候选不明显破坏当天路线
- 用户选择后 Trip Plan 更新
- 地图和地点卡片同步更新

### 4.5.4 测试用例四：信息不足追问

输入：

```text
帮我安排一个五日游。
```

期望结果：

- 系统不直接生成行程
- 系统追问目的地
- 追问简短明确

示例：

```text
你想去哪个城市或地区？比如伦敦及周边、巴黎、京都等。
```

---

## 4.6 Agent 使用边界

为了让系统稳定，五个 Agent 必须避免互相越权。

| Agent | 应该做 | 不应该做 |
|---|---|---|
| OrchestratorAgent | 判断任务、读取上下文、调度流程、保存状态 | 生成具体行程内容 |
| IntentAgent | 理解用户意图、提取偏好、定位修改目标 | 推荐具体地点 |
| RetrievalRankerAgent | 找地点、过滤地点、排序候选、提供替换项 | 安排每天行程 |
| TripPlannerAgent | 组织行程、分天安排、局部修改 | 凭空发明地点 |
| ResponseComposerAgent | 表达结果、生成摘要、准备卡片和地图展示 | 改变规划决策 |

使用边界的意义：

```text
让每个 Agent 的产物可检查，避免系统输出不可控。
```

---

## 4.7 当前阶段不要做什么

为了保证复现聚焦，当前阶段不要做：

- 订单导入
- 航班搜索
- 活动发现
- 多人协作
- Google Pins
- Start Anywhere
- 图片 / PDF / 视频内容识别
- 移动端 Nearby
- 真实预订和支付
- 复杂账户体系

这些能力都可以在核心 Trip Plan 跑通后继续扩展。

当前阶段只验证：

```text
AI 对话规划 + 推荐排序 + Trip Plan 行程工作台
```

---

## 4.8 完成标准

### 4.8.1 产品体验完成

满足以下条件，可以认为核心产品体验成立：

- 用户看到的是旅行工作台，不是纯聊天页面。
- 用户能生成伦敦及周边五日游。
- 行程以 Day 1 - Day 5 结构展示。
- 每个地点有推荐理由。
- 地图能辅助理解地点位置。
- 用户能继续修改行程。
- 系统能解释修改结果。

### 4.8.2 Agent 协作完成

满足以下条件，可以认为 Agent 协作成立：

- OrchestratorAgent 能正确判断请求类型。
- IntentAgent 能正确理解用户意图。
- RetrievalRankerAgent 能提供符合偏好的候选地点。
- TripPlannerAgent 能生成结构化行程。
- ResponseComposerAgent 能生成用户可理解的展示内容。
- 每个 Agent 只处理自己负责的任务。

### 4.8.3 核心链路完成

至少跑通四条链路：

- 新建行程
- 局部修改
- 替换地点
- 信息不足追问

当这四条链路都成立时，说明本方案已经可以复现 Mindtrip 最核心的产品体验。
