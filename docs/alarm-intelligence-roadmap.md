# 告警智能管理落地方案

## 背景判断

竞品能力的核心不是“告警列表更丰富”，而是把大量原始告警压缩成少量可处理的事件。我们的现状是 `components/FaultAlarms.tsx` 已有告警列表、关键字搜索、等级筛选、状态筛选、日期筛选、站点筛选和查看/确认入口，但还缺少事件分组、根因解释、告警抑制、升级通知、工单流转和热力图。

建议将告警模块从“记录查询”升级为“事件处置中心”：

- 运维第一眼看到待处理根因事件，而不是所有告警明细。
- 原始告警仍可追溯，但默认被合并、降噪和排序。
- 高风险事件可以自动升级、通知和创建工单。
- 管理层通过热力图看站点、设备、时间段、告警类型的集中风险。

## 目标能力

### 1. 优先级排序

优先级不应只等于告警等级。建议计算 `priorityScore`：

```text
priorityScore =
  severityWeight
  + assetCriticalityWeight
  + activeDurationWeight
  + repeatFrequencyWeight
  + businessImpactWeight
  + safetyRiskWeight
```

排序规则：

- P0：安全风险、消防、水浸、过压/过温保护、系统停机、并网风险。
- P1：影响储能收益、削峰填谷、充放电能力、PCS/BMS 关键故障。
- P2：局部设备异常、通讯不稳定、降额运行。
- P3：提示类、已恢复、低频非关键告警。

前端展示建议：

- 在告警页顶部增加 “根因事件” 视图，默认按 P0/P1、持续时间、影响站点数排序。
- 列表中新增优先级列、影响范围、持续时间、关联告警数。
- 顶栏告警角标改为“未处理根因事件数”，悬浮或点击可查看严重事件。

### 2. 告警关联与根因事件

新增 `Incident` 概念，原始告警归并到事件下：

```ts
type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'suppressed';

interface Incident {
  id: string;
  rootCauseAlarmId: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: IncidentStatus;
  stationId: string;
  stationName: string;
  assetPath: string[];
  startedAt: string;
  lastSeenAt: string;
  durationSeconds: number;
  relatedAlarmCount: number;
  suppressedAlarmCount: number;
  confidence: number;
  probableCause: string;
  recommendedAction: string;
  escalationLevel: number;
  workOrderId?: string;
}
```

关联规则第一阶段可先用可解释规则，不必一开始上复杂 AI：

- 同站点、同设备、同告警码，在滑动窗口内重复出现，合并为同一事件。
- 同站点、同支路/同拓扑链路，短时间内出现 PCS、BMS、Meter 连锁告警，归为一个根因事件。
- 通讯中断后产生的大量采样异常，默认以“通讯异常”为根因，其他采样告警标记为被抑制。
- 主保护类告警出现后，后续派生告警挂到主保护事件下。
- 已恢复的低等级告警，如果根因事件仍未关闭，保留为时间线，不单独打扰。

### 3. 抑制干扰告警

抑制分两类：

- 自动抑制：由关联规则判断为派生告警、重复告警、维护窗口告警、短时抖动告警。
- 人工抑制：运维可对某类站点/设备/告警码配置静默规则，必须设置过期时间、原因和操作者。

前端需要清晰展示：

- 事件卡片中显示 “已抑制 32 条派生告警”。
- 详情抽屉提供 “查看被抑制告警”。
- 被抑制不等于删除，审计日志和原始告警必须完整保留。

### 4. 未解决事件升级

定义升级策略，而不是只做按钮：

- P0 超过 5 分钟未确认：短信 + 邮件通知值班负责人。
- P1 超过 15 分钟未确认：邮件通知站点负责人；超过 30 分钟升级到区域负责人。
- P2 超过 4 小时未处理：进入待办提醒。
- 重复发生超过阈值：自动建议创建工单或升级优先级。

升级状态建议在事件中展示：

- 未确认时长。
- 当前升级等级。
- 最近一次通知渠道和接收人。
- 下一次升级倒计时。

### 5. 短信、邮件和工单

建议把通知和工单都建成“动作编排”，不要写死在告警页面：

```ts
interface AlarmActionRule {
  id: string;
  name: string;
  trigger: 'incident_created' | 'incident_unack_timeout' | 'incident_repeated' | 'incident_resolved';
  filters: {
    priorities?: string[];
    stationIds?: string[];
    alarmCodes?: string[];
    assetTypes?: string[];
  };
  actions: Array<'email' | 'sms' | 'create_work_order' | 'webhook'>;
  recipients: string[];
  cooldownMinutes: number;
  enabled: boolean;
}
```

工单最小字段：

- 工单号、来源事件、站点、设备、优先级、负责人、状态、创建时间、SLA 截止时间。
- 根因摘要、关联告警、建议处理措施。
- 处理记录、附件、关闭原因。

第一阶段可以只做工单占位和外部系统 webhook；第二阶段再做完整工单模块。

### 6. 告警热力图

热力图建议做三种切换维度：

- 站点 × 时间：看哪些站点在一天/一周内集中爆发。
- 设备类型 × 告警类型：看 PCS/BMS/EMS/Meter 哪类问题最多。
- 地图区域 × 严重度：结合现有站点地图，显示区域风险密度。

指标不只看数量：

- 原始告警数。
- 根因事件数。
- P0/P1 事件数。
- 平均确认时间 MTTA。
- 平均恢复时间 MTTR。
- 抑制率，衡量告警风暴降噪效果。

前端形态：

- 告警页顶部增加 `事件 / 明细 / 热力图 / 规则` tabs。
- 热力图页默认显示最近 24 小时站点 × 小时矩阵。
- 单元格点击后过滤下方事件列表。
- 管理视角增加趋势条：本周事件数、P0/P1、平均 MTTR、抑制率。

## 推荐分期

### V1：可演示的智能告警中心

目标：先让用户看见“少量根因事件”，并能解释为什么。

范围：

- 新增事件视图：根因事件列表、优先级、关联告警数、持续时间、建议动作。
- 新增事件详情抽屉：根因摘要、时间线、关联告警、被抑制告警、确认按钮。
- 新增热力图 tab：站点 × 小时的事件/告警热力图。
- 前端 mock 数据升级：从 `ALARM` 增加 `INCIDENT`、`suppressed`、`relatedAlarmIds`。
- 顶栏角标改为活跃事件数，同时保留原始告警总数。

验收标准：

- 运维进入告警页时，默认看到根因事件，而不是原始明细。
- 每个事件能展开看到关联告警和建议处理动作。
- 至少能演示一次通讯中断导致的告警风暴被合并和抑制。
- 热力图点击后能过滤到对应事件或告警。

### V2：规则引擎与通知升级

目标：把演示能力变成可配置能力。

范围：

- 后端新增告警事件聚合服务。
- 支持站点、设备、告警码、拓扑关系、时间窗口的关联规则。
- 支持维护窗口和静默规则。
- 支持未确认超时升级。
- 接入邮件、短信或 webhook。
- 记录通知、确认、抑制、升级审计日志。

验收标准：

- P0/P1 事件按 SLA 自动升级。
- 重复/派生告警不会反复打扰用户。
- 每条自动抑制都有可解释原因。
- 通知失败可重试并可追踪。

### V3：工单闭环与智能诊断

目标：从“发现故障”进入“闭环解决”。

范围：

- 事件一键创建工单。
- 工单状态回写事件状态。
- 结合历史处理记录生成推荐措施。
- 统计 MTTA、MTTR、重复故障率、站点健康评分。
- 支持基于历史模式的根因置信度优化。

验收标准：

- 事件、通知、工单、恢复记录可闭环追踪。
- 管理者可以按站点/设备/责任人查看处置效率。
- 重复故障能沉淀为知识库或规则建议。

## 前端改造建议

当前 `FaultAlarms` 可以保留为明细 tab，同时新增智能告警中心壳层：

```text
FaultAlarms
  ├─ AlarmOverviewKpis
  ├─ IncidentList
  ├─ IncidentDetailDrawer
  ├─ RawAlarmTable
  ├─ AlarmHeatmap
  └─ AlarmRuleSummary
```

交互优先级：

1. 默认进入 `事件` tab。
2. P0/P1 事件固定在列表顶部。
3. 详情抽屉承载解释和操作，不把主列表做得过重。
4. `明细` tab 保留当前筛选能力，增加事件 ID 和抑制状态。
5. `热力图` tab 用于定位问题集中区域，再联动事件列表。

视觉原则：

- 告警中心是运维工具，页面应保持信息密度，不做营销式大卡片。
- 优先使用表格、矩阵、紧凑 KPI、抽屉。
- 严重告警使用红色，但不要让整页变成红色；红色只用于 P0/P1 和危险动作。
- 抑制、已恢复、已确认要有明显但克制的状态区分。

## 后端与数据流建议

```text
设备/EMS 上报
  -> 原始告警流 AlarmEvent
  -> 去重/抖动过滤
  -> 关联与根因聚合 Incident Correlator
  -> 事件状态机 Incident Store
  -> 升级与通知 Action Orchestrator
  -> 工单/短信/邮件/Webhook
  -> 前端查询与 WebSocket 推送
```

关键表或集合：

- `alarm_events`：不可变原始告警。
- `alarm_incidents`：根因事件。
- `incident_alarm_links`：事件与原始告警关联关系。
- `alarm_suppression_rules`：静默/维护/抑制规则。
- `incident_actions`：通知、升级、工单动作记录。
- `work_orders`：故障工单。
- `alarm_rule_audit_logs`：规则命中与人工操作审计。

接口建议：

- `GET /api/incidents`：事件列表，支持优先级、状态、站点、时间范围筛选。
- `GET /api/incidents/:id`：事件详情、时间线、关联告警。
- `POST /api/incidents/:id/ack`：确认事件。
- `POST /api/incidents/:id/escalate`：人工升级。
- `POST /api/incidents/:id/work-order`：创建工单。
- `GET /api/alarms`：原始告警明细。
- `GET /api/alarm-heatmap`：热力图聚合数据。
- `GET /api/alarm-rules` / `POST /api/alarm-rules`：规则配置。

## 立即可做的下一步

建议下一步先做 V1 前端原型，范围控制在一个迭代内：

- 在 `components/FaultAlarms.tsx` 或拆分子组件中加入 `事件 / 明细 / 热力图` tabs。
- 增加 mock incident 数据，复用现有站点和告警 mock。
- 做一个可解释的“告警风暴被合并”示例。
- 更新测试用例，新增事件列表、事件详情、热力图联动、抑制状态、升级入口。

这会让销售/产品演示马上从“我们也有告警列表”升级为“我们能帮运维看根因并减少噪音”。
