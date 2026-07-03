# Mindtrip UI Design Skill：旅行地图工作台视觉与交互规范

> 用途：指导 WorldTrip AI / Mindtrip-like 原型的 UI 重构。  
> 目标：把当前零散的聊天、行程、地图、推荐卡片整理成清晰的旅行规划体验。  
> 风格参考：带有城市地图、信息图、旅行手账、路线贴纸和报刊拼贴感的视觉系统。整体要活泼、清晰、可探索，但不能牺牲可读性。

---

## 1. UI 设计目标

当前产品的核心体验是：

```text
用户通过对话表达旅行需求
→ 系统生成 Trip Plan
→ 用户在计划和地图之间对照查看
→ 用户替换地点、调整某一天、保存行程
```

因此 UI 不能把所有功能挤在一个三栏界面里。  
应该拆成两个核心空间：

```text
1. Chat Space：对话生成与修改入口
2. Plan Map Workspace：行程 + 地图对照工作台
```

其中：

- 对话是“输入和决策入口”
- 行程是“结构化计划”
- 地图是“空间验证”
- 推荐卡片是“局部替换和增强”
- 变更摘要是“系统反馈”

---

## 2. 用户旅程图

### 2.1 首次规划旅程

```text
进入首页
→ 看到大输入框和示例 prompt
→ 输入“伦敦及周边五日游”
→ 进入 Chat Space
→ AI 简短确认需求
→ 生成 Trip Plan
→ 自动切换到 Plan Map Workspace
→ 用户看到左侧五日计划，右侧地图路线
```

### 2.2 查看与理解行程

```text
用户进入 Plan Map Workspace
→ 左侧选择 Day 1 / Day 2 / Day 3
→ 中央地图高亮当天路线
→ 右侧显示当前地点详情和推荐理由
→ 用户理解每天为什么这样安排
```

### 2.3 局部修改

```text
用户点击“Ask AI to adjust”
→ 打开 Chat Space 或右侧轻量对话抽屉
→ 输入“第三天不要太多博物馆”
→ 系统更新 Day 3
→ 返回 Plan Map Workspace
→ 显示 Change Summary
```

### 2.4 替换地点

```text
用户在行程卡片上点击 Replace
→ 右侧弹出替换候选
→ 用户选择 Wallace Collection
→ 地图 marker 和行程卡片同步更新
→ Change Summary 显示替换原因
```

---

## 3. 页面功能结构

### 3.1 首页 Home

首页只做一件事：让用户开始规划。

布局：

```text
顶部：Logo / 保存的行程入口 / 简短导航
主体：大标题 + prompt 输入框
底部：示例 prompt chips + 伦敦示例 preview
```

首页不展示完整地图和行程，避免信息过载。

关键元素：

- 产品名
- 一句话定位
- 大 prompt 输入框
- Start planning 按钮
- 示例 prompt
- 可选的城市贴纸/地图纹理背景

---

### 3.2 Chat Space

Chat Space 是独立界面，不和完整地图工作台挤在一起。

用途：

- 新建行程
- 追问补充
- 局部修改
- 解释行程变化

布局：

```text
┌──────────────────────────────────────────┐
│ Top Bar: Trip title / Back to plan       │
├──────────────────────────────────────────┤
│ Conversation timeline                    │
│ - user request                           │
│ - assistant clarification                │
│ - generated summary                      │
├──────────────────────────────────────────┤
│ Prompt input                             │
└──────────────────────────────────────────┘
```

Chat Space 的输出要短，不写大段攻略。  
一旦生成 Trip Plan，主要体验应切到 Plan Map Workspace。

---

### 3.3 Plan Map Workspace

这是核心工作台。

它应该像一张“可操作旅行地图海报”，而不是普通 dashboard。

推荐布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: Trip title / Day tabs / Save / Ask AI               │
├───────────────────┬─────────────────────────────┬────────────┤
│ Day Plan          │ Map Canvas                  │ Detail     │
│                   │                             │ Panel      │
│ Day 1 card         │ Big visual route map         │ Place info │
│ Day 2 card         │ Color route lines            │ Replace    │
│ Day 3 card         │ Numbered markers             │ Summary    │
└───────────────────┴─────────────────────────────┴────────────┘
```

功能分工：

| 区域 | 负责什么 |
|---|---|
| Top Bar | 当前 Trip、Day tabs、保存、返回对话 |
| Day Plan | 分天行程、时段、地点卡片 |
| Map Canvas | 路线、marker、区域感、当天高亮 |
| Detail Panel | 当前地点详情、替换候选、变更摘要 |

核心原则：

- 行程和地图必须同屏对照。
- 用户选中 Day，地图只突出当天路线。
- 用户选中地点，地图 marker、地点卡片、详情面板同步高亮。
- 替换候选显示在 Detail Panel，不挤进行程列表。

---

## 4. 功能之间的协作方式

### 4.1 对话与计划的关系

对话负责输入和解释，计划负责承载结果。

```text
Chat Space 输入需求
→ 生成/修改 Trip Plan
→ Plan Map Workspace 展示结果
```

不要让用户在聊天流里阅读完整五日行程。  
聊天只显示摘要，完整结构放到 Trip Plan。

### 4.2 计划与地图的关系

计划和地图是互相验证关系。

```text
点击 Day 2
→ 地图高亮 Day 2 路线

点击地图 marker
→ 行程列表滚动/高亮对应地点

点击地点卡片
→ 地图定位该 marker
```

### 4.3 推荐与替换的关系

推荐不是单独页面，而是当前地点的上下文动作。

```text
点击 Replace
→ Detail Panel 显示候选
→ 用户选择候选
→ 行程和地图同步更新
```

### 4.4 变更摘要的位置

Change Summary 应该出现在 Detail Panel 或顶部提示条，而不是混在聊天历史里。

它的作用是解释刚刚发生了什么：

```text
已调整 Day 3：
- 减少一个博物馆
- 增加 Shoreditch 街区漫步
- 路线更集中
```

---

## 5. 视觉风格规范

### 5.1 风格关键词

参考图的核心不是“复杂”，而是：

- 城市地图
- 路线图
- 旅行海报
- 拼贴感
- 信息图
- 高饱和局部色块
- 手账式标注
- 轻微复古印刷感

产品应呈现：

```text
清晰的旅行工具 + 有记忆点的地图视觉
```

避免：

- 普通 SaaS 灰白 dashboard
- 全屏聊天机器人
- 大量圆角卡片堆叠
- 单调蓝紫渐变
- 只有文字没有地图视觉

---

### 5.2 色彩系统

基础色：

```text
paper: #F7F1E4
ink: #20242A
muted: #6B6F76
line: #D8CEBC
```

主色：

```text
green: #00A878
pink-map: #F4A0C7
blue-route: #1976D2
orange: #F15A3B
purple: #7C3AED
yellow: #F6C945
```

使用方式：

- 背景用 warm paper
- 地图区域可以用粉色或浅色大块底
- 路线使用蓝色或绿色
- 当前选中地点用橙色
- Day tabs 用不同高饱和色区分
- 文字保持深色，确保可读

---

### 5.3 字体层级

标题应该有海报感，但界面文字要克制。

建议：

| 层级 | 用法 |
|---|---|
| Display | 首页标题、Trip 标题 |
| Section | Day title、Panel title |
| Body | 推荐理由、地点说明 |
| Meta | 类型、区域、时间、预算 |

规则：

- 不用负字距。
- 不用随屏幕宽度缩放的正文。
- 地图内标注可以更像信息图，但不能影响主要信息阅读。

---

### 5.4 地图视觉

Map Canvas 是核心视觉。

设计方向：

```text
粉色地图底
白色道路线
蓝色路线线条
彩色编号 marker
少量插画贴纸
右侧信息标注框
```

当前不接真实地图 API 时，可以用模拟地图：

- 使用抽象网格/街区背景
- 用 POI 坐标映射到 canvas 百分比位置
- 用 SVG/HTML 线段连接当天路线
- marker 用 Day 编号和地点序号

地图必须承担功能，而不是装饰：

- 看得出路线顺序
- 看得出当天地点聚集程度
- 看得出哪个地点被选中

---

## 6. 组件设计规范

### 6.1 Day Tabs

用途：

- 快速切换 Day 1 - Day 5
- 控制地图高亮当天路线

样式：

- 使用色条或标签式 tabs
- 每天一个颜色
- 当前 day 更醒目

### 6.2 Day Plan Card

用途：

- 展示某一天的主题和安排

内容：

- Day number
- Day title
- main area
- morning / afternoon / evening
- 地点卡片列表

不要把五天全部展开得太长。  
建议默认展开当前 day，其他 day 折叠或紧凑显示。

### 6.3 Place Card

用途：

- 展示单个地点
- 触发 View / Replace / Lock / Delete

内容：

- 地点名称
- 类型
- 区域
- 时段
- 推荐理由
- 操作按钮

样式：

- 不要大面积厚重阴影
- 使用左侧颜色条表示 day/slot
- 选中时与地图 marker 同色

### 6.4 Detail Panel

用途：

- 当前地点详情
- 替换候选
- 变更摘要

状态：

```text
place_detail
replacement_candidates
change_summary
empty_hint
```

Detail Panel 不应该塞满所有信息。  
它只显示当前上下文最相关内容。

### 6.5 Chat Entry

Chat 不在主工作台常驻大面积展示。

入口形式：

- Top Bar 的 Ask AI 按钮
- 右下角轻量输入
- 或独立 Chat Space 页面

用途：

- 修改某一天
- 追加偏好
- 询问推荐原因

---

## 7. 页面状态设计

### 7.1 Empty State

用户还没有 Trip 时：

```text
大输入框 + 示例 prompt + 伦敦地图视觉 preview
```

### 7.2 Generating State

生成中：

- 不显示空白页
- 显示步骤感：

```text
理解旅行偏好
查找伦敦地点
组织五日路线
生成地图点位
```

### 7.3 Plan Ready State

行程生成后：

- 默认进入 Plan Map Workspace
- 当前选中 Day 1
- 地图显示 Day 1 路线
- 右侧显示第一个地点详情

### 7.4 Editing State

用户修改时：

- 保留当前 Trip
- 显示小型 processing 提示
- 修改完成后突出 Change Summary

### 7.5 Replacement State

用户点击 Replace：

- Detail Panel 切换成候选列表
- 候选限制 3-5 个
- 每个候选说明为什么适合替换

---

## 8. 信息架构建议

最终页面结构建议：

```text
Home
└── Start Planning

Chat Space
└── Conversation + Prompt Input

Plan Map Workspace
├── Top Bar
│   ├── Trip title
│   ├── Day tabs
│   ├── Ask AI
│   └── Save
├── Day Plan Panel
│   ├── Day summary
│   └── Place cards
├── Map Canvas
│   ├── route lines
│   ├── markers
│   └── area labels
└── Detail Panel
    ├── Place detail
    ├── Replacement candidates
    └── Change summary
```

---

## 9. UI Skill 使用规则

当后续重构前端 UI 时，必须遵守：

1. 对话和计划不要挤在同等权重的三栏里。
2. 计划和地图必须同屏对照。
3. 地图是主视觉，不是右侧小组件。
4. 替换候选进入 Detail Panel，不要打断行程结构。
5. Change Summary 要贴近用户刚修改的上下文。
6. 默认选中某一天，而不是一次展开所有复杂信息。
7. 页面风格要有旅行地图海报感，但信息层级必须清楚。
8. 所有颜色都要服务 day、route、selection、status，不做纯装饰色块。
9. 地点卡片必须能继续操作。
10. 用户始终知道自己在看哪一天、哪个地点、哪条路线。

---

## 10. 下一步重构目标

基于本 UI Skill，下一步前端应改成：

```text
Home 独立首页
Chat Space 独立或抽屉式对话
Plan Map Workspace 作为主工作台
Day tabs 控制行程和地图
Map Canvas 居中放大
Detail Panel 负责地点详情、替换候选、变更摘要
```

当前原型的主要问题是：

- 对话、行程、地图三栏权重相同，导致视觉混乱。
- 地图太像附属面板，没有成为核心。
- 五天行程全部展开，信息密度过高。
- 替换候选和地图详情没有形成稳定的右侧上下文区。

重构时应优先解决这些问题。

