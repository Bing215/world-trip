# Mindtrip 核心 Agent / Skill 产品设计文档

> 本文档从产品角度设计复现 Mindtrip 核心体验所需的 Agent / Skill。  
> 重点说明每个 Agent 为什么存在、负责什么产品任务、如何与用户交互、如何与其他 Agent 协作，以及每个 Agent 下的 Skill 应承担什么功能。  
> 本文档不展开代码、接口、数据库、模型调用等技术实现细节。

---

## 1. 设计目标

复现 Mindtrip 的核心体验，需要让用户完成以下流程：

```text
用户输入旅行需求
→ 系统理解用户想要什么
→ 系统找到合适的地点
→ 系统把地点组织成可执行的 Trip Plan
→ 系统用清晰的方式展示行程、地图和推荐理由
→ 用户继续修改，系统只更新相关部分
```

为了实现这个体验，设计 5 个核心 Agent：

```text
1. OrchestratorAgent
2. IntentAgent
3. RetrievalRankerAgent
4. TripPlannerAgent
5. ResponseComposerAgent
```

这 5 个 Agent 对应产品体验中的 5 个关键问题：

| 产品问题 | 负责 Agent |
|---|---|
| 用户这次想做什么？ | OrchestratorAgent / IntentAgent |
| 用户说的话如何变成可执行意图？ | IntentAgent |
| 应该推荐哪些地点？ | RetrievalRankerAgent |
| 这些地点如何变成行程？ | TripPlannerAgent |
| 如何让用户看懂、继续操作？ | ResponseComposerAgent |

---

## 2. Agent 协作总览

### 2.1 新建行程的协作链路

用户输入：

```text
帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。
```

Agent 协作：

```text
OrchestratorAgent
→ 判断这是新建行程任务

IntentAgent
→ 理解目的地、天数、兴趣、节奏

RetrievalRankerAgent
→ 找到伦敦及周边合适地点，并排序

TripPlannerAgent
→ 把地点组织成五天行程

ResponseComposerAgent
→ 生成用户能看懂的说明、地点卡片、地图展示信息
```

用户看到：

```text
Day 1：Westminster 与 South Bank
Day 2：博物馆与西区
Day 3：Borough Market 与 East London
Day 4：Cambridge 一日游
Day 5：Windsor / Richmond 轻松收尾
```

### 2.2 局部修改的协作链路

用户输入：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

Agent 协作：

```text
OrchestratorAgent
→ 判断这是修改已有行程

IntentAgent
→ 识别目标是 Day 3，用户想减少博物馆，增加街区漫步

RetrievalRankerAgent
→ 找 Day 3 附近更适合散步的地点

TripPlannerAgent
→ 只更新 Day 3，不重写整个五日行程

ResponseComposerAgent
→ 生成变更摘要，让用户知道改了什么
```

用户看到：

```text
已调整 Day 3：
- 减少一个室内博物馆安排
- 增加 Shoreditch 街区漫步
- 保留 Borough Market 午餐
- 当天节奏更轻松，路线更集中
```

### 2.3 替换地点的协作链路

用户操作：

```text
点击 British Museum 卡片上的 Replace。
```

Agent 协作：

```text
OrchestratorAgent
→ 判断这是替换地点任务

RetrievalRankerAgent
→ 查找同类型或同区域替代地点

ResponseComposerAgent
→ 展示 3-5 个候选卡片

用户选择一个候选地点

TripPlannerAgent
→ 更新原行程中的地点

ResponseComposerAgent
→ 说明替换结果并更新地图展示
```

---

## 3. OrchestratorAgent

### 3.1 产品定位

OrchestratorAgent 是整个多 Agent 系统的调度者。

用户不会感知它的存在，但每一次请求都需要它先判断：

```text
这是新建行程吗？
这是修改已有行程吗？
这是替换地点吗？
这是普通问题吗？
现在是否有足够信息继续？
需要调用哪些 Agent？
```

它的核心价值是让用户感觉整个产品是一个统一的智能助手，而不是多个割裂工具。

### 3.2 负责的产品任务

| 产品任务 | 说明 |
|---|---|
| 请求分类 | 判断用户当前是在创建、修改、替换、追问还是保存 |
| 上下文承接 | 读取当前 Trip、用户偏好和对话历史 |
| 流程调度 | 决定哪些 Agent 参与当前任务 |
| 结果聚合 | 把不同 Agent 的结果合并为一次完整产品反馈 |
| 异常处理 | 意图不清、缺少信息、无推荐结果时决定如何处理 |
| 状态更新 | 保存新的 Trip 状态和用户上下文 |

### 3.3 典型交互逻辑

#### 新建行程

```text
用户输入完整旅行需求
→ OrchestratorAgent 判断为 create_trip
→ 调用 IntentAgent、RetrievalRankerAgent、TripPlannerAgent、ResponseComposerAgent
```

#### 修改行程

```text
用户输入“第三天轻松一点”
→ OrchestratorAgent 发现已有 Trip
→ 判断为 patch_trip
→ 调用 IntentAgent 定位修改目标
→ 根据需要调用 RetrievalRankerAgent
→ 调用 TripPlannerAgent 更新行程
```

#### 信息不足

```text
用户输入“帮我安排一个五日游”
→ OrchestratorAgent 判断缺少目的地
→ 不继续生成行程
→ 让 ResponseComposerAgent 生成追问
```

### 3.4 Skills

#### task_route

判断用户请求属于哪一种产品任务。

需要识别：

- 新建行程
- 修改行程
- 替换地点
- 查询地点
- 保存行程
- 追问补充

产品价值：

```text
避免用户每次输入都被当成“重新生成行程”。
```

#### context_read

读取当前用户上下文。

需要包含：

- 当前 Trip 是否存在
- 当前行程有哪些天
- 用户最近修改了什么
- 用户偏好是什么
- 哪些地点已经锁定或确认

产品价值：

```text
让系统能够理解“第二天”“这个地方”“刚才那个安排”等上下文表达。
```

#### flow_decide

决定当前任务应该调用哪些 Agent。

示例：

| 任务 | 调用链路 |
|---|---|
| 新建行程 | Intent → RetrievalRanker → TripPlanner → ResponseComposer |
| 修改节奏 | Intent → TripPlanner → ResponseComposer |
| 新增地点类型 | Intent → RetrievalRanker → TripPlanner → ResponseComposer |
| 替换地点 | RetrievalRanker → ResponseComposer → TripPlanner |

产品价值：

```text
让每次请求只调用必要能力，避免过度修改。
```

#### exception_policy

处理无法继续的情况。

常见情况：

- 目的地缺失
- 天数缺失
- 修改目标不明确
- 没有找到合适地点
- 用户请求会破坏已锁定安排

产品价值：

```text
在不确定时追问，而不是硬生成错误结果。
```

#### state_update

保存更新后的产品状态。

需要保存：

- 当前 Trip
- 用户偏好变化
- 用户最近操作
- 当前选中地点
- 修改摘要

产品价值：

```text
让 Trip Plan 是一个可持续编辑的对象，而不是一次性回复。
```

---

## 4. IntentAgent

### 4.1 产品定位

IntentAgent 负责理解用户自然语言背后的旅行意图。

它不是聊天回复生成器，而是把用户输入转成产品可以执行的结构化意图。

例如用户说：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

IntentAgent 应该理解为：

```text
任务：修改行程
目标：Day 3
减少：博物馆
增加：街区漫步
范围：局部修改
```

### 4.2 负责的产品任务

| 产品任务 | 说明 |
|---|---|
| 判断用户意图 | 新建、修改、替换、查询、保存 |
| 提取旅行槽位 | 目的地、天数、兴趣、节奏、预算、同行人 |
| 解析修改目标 | 第二天、第三天、下午、这个餐厅、那个博物馆 |
| 更新用户偏好 | 喜欢什么、不喜欢什么、想更轻松还是更紧凑 |
| 判断是否追问 | 信息不足或目标不明确时要求补充 |
| 保持局部修改意识 | 能识别用户不是要重建全部行程 |

### 4.3 典型交互逻辑

#### 新建行程输入

用户输入：

```text
帮我规划一个伦敦及周边五日游，喜欢博物馆、街区漫步、英式下午茶和周边小镇，不要太赶。
```

IntentAgent 应理解：

```text
目的地：伦敦及周边
天数：5
兴趣：博物馆、街区漫步、下午茶、周边小镇
节奏：轻松
任务：新建行程
```

#### 局部修改输入

用户输入：

```text
Day 4 不想去剑桥，换成牛津可以吗？
```

IntentAgent 应理解：

```text
任务：替换目的地
目标：Day 4
原地点：Cambridge
新偏好：Oxford
范围：只修改 Day 4
```

#### 信息不足输入

用户输入：

```text
帮我安排一个五日游。
```

IntentAgent 应判断：

```text
缺少目的地，需要追问。
```

### 4.4 Skills

#### intent_classify

判断用户输入的产品意图。

需要识别：

- create_trip
- patch_trip
- replace_place
- ask_place
- save_trip
- clarify_answer

产品价值：

```text
决定用户输入会触发哪种产品动作。
```

#### slot_extract

提取旅行规划所需信息。

常见槽位：

- 目的地
- 天数
- 日期
- 兴趣
- 节奏
- 预算
- 同行人
- 不想要的内容

产品价值：

```text
把自然语言变成可用于行程规划的结构化偏好。
```

#### target_resolve

解析用户指代的修改目标。

需要理解：

- 第二天 / Day 2
- 下午那段
- 这个餐厅
- 刚才那个博物馆
- 周边小镇那一天

产品价值：

```text
让用户可以自然地局部修改，而不是每次手动选择对象。
```

#### preference_interpret

解释用户偏好。

示例：

| 用户表达 | 产品理解 |
|---|---|
| 不要太赶 | 每天地点数量减少，通勤距离控制 |
| 更小众一点 | 降低热门景点权重，提高特色地点权重 |
| 适合散步 | 增加街区、公园、河岸路线 |
| 不想太多博物馆 | 降低 museum 类型密度 |

产品价值：

```text
把模糊偏好转化为推荐和规划规则。
```

#### clarification_judge

判断是否需要追问。

应该追问：

- 不知道目的地
- 修改目标不明确
- 用户要求会影响多个已确认安排
- 用户表达冲突

不应该追问：

- 日期缺失但可先生成通用行程
- 预算缺失但不影响初版
- 用户偏好可以合理默认

产品价值：

```text
减少无意义追问，同时避免错误执行。
```

---

## 5. RetrievalRankerAgent

### 5.1 产品定位

RetrievalRankerAgent 负责推荐结果的可信度和质量。

它决定系统推荐哪些地点、以什么顺序推荐、哪些地点适合同一天、哪些地点适合作为替换项。

如果没有这个 Agent，产品就容易变成大模型凭空写攻略，用户看到的地点可能不真实、不顺路、不符合偏好。

### 5.2 负责的产品任务

| 产品任务 | 说明 |
|---|---|
| 找候选地点 | 根据目的地和偏好找到可用地点 |
| 区域过滤 | 控制候选地点在合理地理范围内 |
| 类型匹配 | 博物馆、街区、下午茶、小镇、市场、餐厅等 |
| 偏好排序 | 根据用户兴趣提高相关地点优先级 |
| 热门度排序 | 第一次去伦敦时优先经典高价值地点 |
| 多样性控制 | 避免一天全是同类地点 |
| 替换候选 | 为某个地点提供 3-5 个替代选择 |

### 5.3 典型交互逻辑

#### 新建伦敦五日游

用户偏好：

```text
博物馆、街区漫步、下午茶、周边小镇、不要太赶
```

RetrievalRankerAgent 应提供的候选集合包括：

- 经典地标：Westminster、South Bank、Tower Bridge
- 博物馆：British Museum、National Gallery、V&A
- 街区：Notting Hill、Shoreditch、Covent Garden、Greenwich
- 市场：Borough Market、Columbia Road Flower Market
- 下午茶：Fortnum & Mason、Sketch、The Wolseley
- 周边小镇：Cambridge、Oxford、Windsor

#### 替换 British Museum

用户想换掉 British Museum，但仍想保留文化体验。

候选应更偏：

- 同类型文化地点
- 不破坏当天路线
- 可更小众或更轻量

候选示例：

- Sir John Soane's Museum
- Wallace Collection
- Courtauld Gallery
- Museum of London Docklands

### 5.4 Skills

#### query_intent_build

把用户意图转成推荐需求。

示例：

```text
伦敦及周边 + 5 天 + 博物馆 + 街区漫步 + 下午茶 + 周边小镇 + 轻松节奏
```

产品价值：

```text
让推荐系统知道应该找什么，而不是泛泛推荐热门景点。
```

#### geo_scope_define

确定推荐范围。

需要区分：

- 伦敦市区
- 伦敦不同区域
- 周边一日游目的地
- 当天已规划区域附近

产品价值：

```text
避免行程跨区跳跃，提升路线合理性。
```

#### candidate_retrieve

召回候选地点。

候选类型包括：

- 景点
- 博物馆
- 街区
- 餐厅
- 下午茶
- 市场
- 公园
- 周边小镇

产品价值：

```text
为行程规划提供足够丰富的候选池。
```

#### relevance_rank

按照用户偏好排序。

影响因素：

- 是否匹配兴趣
- 是否匹配节奏
- 是否适合首次到访
- 是否与当前区域匹配
- 是否适合当前时段

产品价值：

```text
让用户看到的推荐有明显“为我而选”的感觉。
```

#### diversity_balance

控制推荐多样性。

需要避免：

- 一天安排太多博物馆
- 连续几天都是市场
- 全程都是经典地标，缺少街区体验
- 全程都是小众地点，缺少第一次到访应有的重点

产品价值：

```text
让行程体验更丰富，不单调。
```

#### replacement_candidates

为某个地点提供替换项。

替换候选应满足：

- 类型相近
- 区域相近或路线不被破坏
- 更符合用户新偏好
- 数量控制在 3-5 个

产品价值：

```text
让用户能够细粒度控制行程，而不是只能接受整份计划。
```

---

## 6. TripPlannerAgent

### 6.1 产品定位

TripPlannerAgent 负责把推荐地点组织成真正可执行的 Trip Plan。

它不是简单列出地点，而是决定：

```text
五天怎么分？
每天去哪个区域？
上午、下午、晚上怎么安排？
周边小镇放哪一天？
怎样避免太赶？
用户修改时怎样只改相关部分？
```

### 6.2 负责的产品任务

| 产品任务 | 说明 |
|---|---|
| 分天规划 | 生成 Day 1 到 Day 5 |
| 每日主题 | 给每天安排一个清晰主题或区域 |
| 时段安排 | 上午、下午、晚上分别安排什么 |
| 区域组织 | 同一天地点尽量集中 |
| 节奏控制 | 根据“不要太赶”减少地点数量 |
| 体验平衡 | 平衡经典景点、街区、餐饮、周边小镇 |
| 局部修改 | 只修改用户指定的那一天或地点 |
| 锁定保护 | 用户已确认的地点不应被随意移除 |

### 6.3 典型交互逻辑

#### 初版五日游

TripPlannerAgent 可以组织为：

```text
Day 1：Westminster 与 South Bank
Day 2：博物馆与西区
Day 3：Borough Market 与 East London
Day 4：Cambridge 一日游
Day 5：Windsor / Richmond 轻松收尾
```

这样的结构让用户感觉：

- 每天主题明确
- 路线有区域逻辑
- 有经典景点
- 有街区体验
- 有周边一日游
- 节奏不是过度拥挤

#### 局部修改 Day 3

用户说：

```text
第三天不要太多博物馆，换成更适合散步的安排。
```

TripPlannerAgent 应做：

- 只检查 Day 3
- 保留 Day 3 合理地点，如 Borough Market
- 删除或降低博物馆类地点
- 增加 Shoreditch / South Bank walk / Greenwich 等散步体验
- 不影响 Day 1、Day 2、Day 4、Day 5

### 6.4 Skills

#### day_framework_build

创建行程骨架。

例如：

```text
5 天 → Day 1 / Day 2 / Day 3 / Day 4 / Day 5
```

产品价值：

```text
把 AI 推荐转成用户能理解的旅行结构。
```

#### day_theme_assign

给每天分配主题。

示例：

| Day | 主题 |
|---|---|
| Day 1 | 经典伦敦初印象 |
| Day 2 | 博物馆与西区 |
| Day 3 | 市场与东伦敦街区 |
| Day 4 | 周边大学城一日游 |
| Day 5 | 温莎或泰晤士河畔轻松收尾 |

产品价值：

```text
让用户快速理解每天为什么这样安排。
```

#### area_grouping

按区域组织地点。

产品要求：

- 同一天尽量在同一区域或相邻区域
- 周边小镇单独成天
- 不把远距离地点硬塞进同一天

产品价值：

```text
保证行程看起来可走、可执行。
```

#### time_slot_arrange

把地点放入上午、下午、晚上。

示例：

- 上午：博物馆、经典景点
- 下午：街区漫步、市场、下午茶
- 晚上：餐厅、剧院、酒吧、河岸散步

产品价值：

```text
让行程从地点清单变成真实一天的安排。
```

#### pace_adjust

根据用户节奏控制行程密度。

示例：

| 用户表达 | 规划效果 |
|---|---|
| 不要太赶 | 每天 3-4 个核心安排 |
| 想多玩一点 | 每天 4-6 个安排 |
| 适合爸妈 | 减少步行、增加休息 |

产品价值：

```text
让行程符合用户旅行方式，而不是默认塞满。
```

#### experience_balance

平衡行程体验类型。

需要平衡：

- 经典景点
- 博物馆
- 街区漫步
- 餐饮
- 下午茶
- 周边小镇
- 留白时间

产品价值：

```text
让五天行程有层次，不重复。
```

#### local_edit_apply

应用局部修改。

产品要求：

- 用户指定 Day 3，就只改 Day 3
- 用户替换一个地点，就只替换该地点
- 除非必要，不重排整份行程

产品价值：

```text
让用户觉得系统尊重自己的修改意图。
```

#### locked_item_protect

保护用户确认过的地点。

例如用户锁定 Cambridge 一日游，后续修改不应自动删除它。

产品价值：

```text
增强用户对行程编辑的控制感。
```

---

## 7. ResponseComposerAgent

### 7.1 产品定位

ResponseComposerAgent 负责把系统结果变成用户能理解、能继续操作的产品表达。

它不重新决定行程，也不负责检索地点，而是负责：

```text
怎么告诉用户结果？
怎么解释推荐理由？
怎么说明这次修改？
怎么生成地点卡片和地图展示信息？
```

### 7.2 负责的产品任务

| 产品任务 | 说明 |
|---|---|
| 行程说明 | 用简短语言说明整体规划 |
| 每日标题 | 让用户快速理解每天主题 |
| 推荐理由 | 解释每个地点为什么适合 |
| 变更摘要 | 修改后告诉用户改了什么 |
| 卡片内容 | 生成地点卡片展示文案 |
| 地图展示信息 | 让前端知道展示哪些地点和选中状态 |
| 下一步动作 | 提示用户可以替换、保存、锁定或继续修改 |

### 7.3 典型交互逻辑

#### 新建行程后的表达

系统不应该输出长篇攻略，而应该输出：

```text
我为你安排了一个节奏轻松的伦敦及周边五日游：
- 前两天集中在伦敦经典区域和博物馆
- 第三天加入市场和东伦敦街区漫步
- 第四天安排 Cambridge 一日游
- 第五天用 Windsor / Richmond 做轻松收尾
```

#### 局部修改后的表达

用户修改 Day 3 后，ResponseComposerAgent 应输出：

```text
已调整 Day 3：
- 减少一个室内博物馆安排
- 增加 Shoreditch 街区漫步
- 保留 Borough Market 午餐
- 当天节奏更轻松，路线更集中
```

### 7.4 Skills

#### trip_overview_write

生成整体行程说明。

产品价值：

```text
让用户快速理解整份行程的安排逻辑。
```

#### day_title_write

生成每日标题。

示例：

- Day 1：经典伦敦与泰晤士河
- Day 2：博物馆与西区文化
- Day 3：市场、美食与东伦敦街区
- Day 4：Cambridge 一日游
- Day 5：温莎或河畔慢节奏收尾

产品价值：

```text
让用户不用读完细节，也能理解每天主题。
```

#### poi_reason_write

生成地点推荐理由。

好的推荐理由应该具体：

```text
推荐 Borough Market，因为它适合作为午餐停留点，也能承接你对街区漫步和本地食物体验的偏好。
```

不好的推荐理由：

```text
这是一个很受欢迎的地方。
```

产品价值：

```text
建立推荐可信度。
```

#### change_summary_write

生成变更摘要。

需要说明：

- 改了哪一天
- 删除了什么
- 新增了什么
- 为什么这样改
- 对节奏或路线有什么影响

产品价值：

```text
让用户理解系统不是乱改，而是按他的意图调整。
```

#### card_content_prepare

准备地点卡片内容。

包括：

- 名称
- 类型
- 区域
- 推荐理由
- 标签
- 操作建议

产品价值：

```text
让每个推荐都可比较、可操作。
```

#### map_display_prepare

准备地图展示信息。

包括：

- 哪些地点显示在地图上
- 当前选中哪个地点
- 每天用什么分组
- 地点和行程卡片如何联动

产品价值：

```text
让 Trip Plan 从文字变成空间上可理解的计划。
```

#### next_action_prompt

生成下一步操作建议。

示例：

- 保存这个行程
- 替换某个地点
- 让某一天更轻松
- 加一个下午茶
- 查看地图

产品价值：

```text
引导用户继续编辑，而不是看完就结束。
```

---

## 8. 五个 Agent 的协作关系

### 8.1 协作原则

五个 Agent 不应该各自生成一段答案，而应该像一个产品团队一样分工：

```text
OrchestratorAgent：决定流程
IntentAgent：理解用户
RetrievalRankerAgent：找到合适内容
TripPlannerAgent：组织成行程
ResponseComposerAgent：表达给用户
```

### 8.2 新建行程协作

```text
用户输入伦敦五日游需求
→ OrchestratorAgent 判断任务类型
→ IntentAgent 提取旅行意图
→ RetrievalRankerAgent 提供候选地点
→ TripPlannerAgent 组织成 Trip Plan
→ ResponseComposerAgent 生成可展示内容
```

### 8.3 局部修改协作

```text
用户要求修改 Day 3
→ OrchestratorAgent 确认是已有 Trip 的修改
→ IntentAgent 理解修改目标和偏好变化
→ RetrievalRankerAgent 根据需要找新候选
→ TripPlannerAgent 只修改 Day 3
→ ResponseComposerAgent 解释修改结果
```

### 8.4 替换地点协作

```text
用户点击 Replace
→ OrchestratorAgent 识别替换任务
→ RetrievalRankerAgent 提供候选
→ ResponseComposerAgent 展示候选卡片
→ 用户选择
→ TripPlannerAgent 应用替换
→ ResponseComposerAgent 说明结果
```

### 8.5 追问协作

```text
用户信息不足
→ IntentAgent 判断缺失关键信息
→ OrchestratorAgent 暂停生成
→ ResponseComposerAgent 生成清晰追问
```

---

## 9. 当前阶段结论

为了复现 Mindtrip 的核心体验，当前阶段应优先设计并实现这 5 个 Agent：

```text
OrchestratorAgent
IntentAgent
RetrievalRankerAgent
TripPlannerAgent
ResponseComposerAgent
```

每个 Agent 下都需要 Skill，但 Skill 的作用不是技术插件，而是产品任务单元：

- OrchestratorAgent 负责流程判断和状态承接。
- IntentAgent 负责理解用户真实意图。
- RetrievalRankerAgent 负责让推荐可信。
- TripPlannerAgent 负责让行程可执行。
- ResponseComposerAgent 负责让结果可理解、可操作。

这套 Agent / Skill 组合可以覆盖核心闭环：

```text
自然语言输入
→ 意图识别
→ 地点推荐与排序
→ 行程规划
→ 用户可理解的展示
→ 局部修改
```

后续文档可以继续展开每个 Skill 的输入、输出、边界和验收标准。

