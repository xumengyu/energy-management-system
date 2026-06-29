# EcoWatt EMS 主功能破坏性测试报告

## 测试信息

| 项目 | 内容 |
|------|------|
| 测试日期 | 2026-06-04 |
| 测试地址 | `http://223.6.248.244:8090/eco-watt` |
| 登录用户 | `admin` / `SUPER ADMINISTRATEUR` |
| 当前语言 | Francais |
| 重点电站 | `Portuguese Farm` |
| 测试方式 | 尽量点击所有可见按钮、弹窗、切换、空表单提交和非破坏性入口 |
| 未执行动作 | 未点击最终下发、未提交真实新增、未保存支路配置、未删除数据、未执行设备控制 |

## 执行范围

| 模块 | 覆盖内容 |
|------|----------|
| Dispatch IA | 编排页、模板页、策略表、Deploy 弹窗、安全校验、日期控件、策略数据逻辑 |
| Vue Execution | 实时调度监控、预测数据、价格/功率/SOC 展示 |
| Schema d Architecture | 总览/详情入口、功率平衡、设备状态与功率一致性 |
| Real-time Overview / Detail | ESS/PV 标签、详情列表、BESS 详情分组、刷新/导出入口识别 |
| Analyse des Donnees | 功率/SOC/电池分析、设备/簇选择、日期选择器 |
| Statistiques Energie | 储能/PV/负荷统计、月份选择器、数据合理性 |
| Liste des Stations | 状态筛选、分页状态、新建站点空表单校验、支路配置入口和新增支路弹窗 |
| Alarmes | 告警列表、徽标跳转、状态/等级筛选控件、日期入口 |
| 全局 | 语言菜单、主题按钮、站点上下文、错误提示、时区一致性 |

## 关键测试结果

| 编号 | 模块 | 测试点 | 结果 | 说明 |
|------|------|--------|------|------|
| DT-001 | Dispatch IA | Deploy Strategy 打开 | 通过 | 可打开安全校验弹窗，显示 `Security Verification`、验证码数字、输入框、`Verify & Deploy` |
| DT-002 | Dispatch IA | Deploy 弹窗关闭 | 未通过 | 弹窗没有明显 `Cancel/Close`；打开后侧边栏点击也被遮挡，只能通过路由跳转恢复 |
| DT-003 | Dispatch IA | 最终下发 | 未执行 | 需要验证码且属于真实下发动作；未代填验证码，未点击 `Verify & Deploy` |
| DT-004 | Dispatch IA | 策略日期控件 | 部分通过 | `input[type=date]` 值为 `2026-06-04`，但 disabled，不能切换策略日期 |
| DT-005 | Dispatch IA | 边缘策略时间覆盖 | 部分通过 | 时间段基本连续，但边缘表最后一段是 `23:00-23:59`，云端表是 `23:00-24:00` |
| DT-006 | Dispatch IA | 策略功率合理性 | 通过 | 功率范围 0-5000 kW，未见明显越界；存在 15 分钟粒度频繁充放电 |
| DT-007 | Dispatch IA | 模板页签 | 通过 | `Station Strategy Templates` 可打开；显示 Profit Maximization AI 和 Green Power 模板 |
| DT-008 | Dispatch IA | Change 按钮 | 部分通过 | 页面存在 3 个同名 `Change` 按钮，定位/可访问性存在歧义 |
| DT-009 | Dispatch IA | 裸露数值 | 未通过 | 页面底部多次出现 `45`、`-70.00` 等无标签裸数值 |
| DT-010 | Vue Execution | 实时调度展示 | 通过 | 显示 Active、Profit Max AI、SOC `4.8%`、实时价格 `91 EUR/MWh` |
| DT-011 | Vue Execution | 明日预测 | 部分通过 | 预测失败原因清晰：`2026-06-05` 电价数据不可用 |
| DT-012 | Schema d Architecture | 功率平衡 | 通过 | `Load 4264.35 kW ≈ Grid 3853.05 kW + PV 411.30 kW + BESS 0 kW` |
| DT-013 | Schema d Architecture | 状态/功率一致性 | 未通过 | PV 显示 `Deconnecte` 但输出 `411.30 kW`；BESS 显示 `Deconnecte` 但有 SOC |
| DT-014 | Real-time Overview | PV 汇总 | 通过 | PV Monitor `402.5 kW`，PV1-PV10 合计约 `402-403 kW` |
| DT-015 | Real-time Overview | ESS SOC | 未通过 | 概览 SOC 显示 `0`，但详情/架构图为 `4.8%-4.9%` |
| DT-016 | Real-time Detail | BESS 详情 | 通过 | 可进入详情，分组包括 Status、AC/DC、Battery、Power、Temperature、Frequency |
| DT-017 | Real-time Detail | 数据合理性 | 通过 | 频率 `50.00 Hz`，温度 `27-32°C`，SOC/SOH 在合理范围 |
| DT-018 | Analyse des Donnees | 功率/SOC/电池标签 | 通过 | 三个分析标签均能显示图表，电池分析可显示 BESS/Cluster |
| DT-019 | Analyse des Donnees | 日期弹层 | 部分通过 | 可打开；法语环境出现中文 `2026年6月` 和英文 `Cancel/Apply` |
| DT-020 | Statistiques Energie | 储能/PV 数据 | 通过 | 储能有充放电统计，PV 有发电统计 |
| DT-021 | Statistiques Energie | 负荷统计 | 部分通过 | `Charge` 标签显示 `No nodes` |
| DT-022 | Liste des Stations | 状态筛选 | 通过 | `Tout/Normal/Fault/Offline` 可点击；当前分页按钮禁用符合 6 条数据场景 |
| DT-023 | Liste des Stations | 新建站点空提交 | 部分通过 | 只提示投运日期、时区、站点类型、设备类型；`EMS Device SN*`、`Station Name*` 等星号字段未提示 |
| DT-024 | Liste des Stations | 支路配置入口 | 通过 | Portuguese Farm 支路配置可打开，已有 BESS/PV POI 等支路 |
| DT-025 | 支路配置 | 新增支路弹窗 | 通过 | 弹窗可打开，未选绑定电表时 `Create` 禁用 |
| DT-026 | 支路配置 | 保存支路 | 未执行 | `Save` 会修改配置，未点击 |
| DT-027 | Alarmes | 告警列表 | 通过 | 显示 Total 177 / Active 9，表格可展示告警数据 |
| DT-028 | Alarmes | 告警徽标跳转 | 通过 | 顶栏 `143` 可跳转到 `/faults` |
| DT-029 | Alarmes | 状态筛选 Actif | 未通过 | 点击 `Actif` 后跳转到 `/asset-overview`，未在告警页筛选 |
| DT-030 | Alarmes | 筛选控件语义 | 部分通过 | 等级/状态看起来是 select 选项，不是按钮；自动化和可访问性较弱 |
| DT-031 | 全局 | 语言菜单 | 通过 | 法语菜单可打开，包含 English / Français |
| DT-032 | 全局 | 国际化一致性 | 未通过 | 多处混用英文、中文、法文，如 `Cancel`、`Apply`、`2026年6月`、`Real-time Overview` |

## 时区核查

| 编号 | 页面 | 现象 | 判断 |
|------|------|------|------|
| TZ-DT-001 | Vue Execution | 显示 `2026-06-04 08:20:50` | 符合 Portuguese Farm 所在葡萄牙夏令时当地时间 |
| TZ-DT-002 | Analyse des Donnees | 图表时间轴截止约 `08:20-08:29` | 符合 Portuguese Farm 当地时间 |
| TZ-DT-003 | Real-time Detail | `Derniere mise a jour: 04/06/2026, 15:20:06` | 更像中国/浏览器时区，与站点当地时间不一致 |
| TZ-DT-004 | Dispatch IA | `LAST SYNC: 2026-06-04 15:20:56` | 页面知道站点为 `PT`，但同步时间未按 PT 时区显示 |
| TZ-DT-005 | Dispatch IA | `LAST DISPATCH: 2026-06-03 23:15` | 需要确认该字段是站点本地时间、UTC 还是服务器时间 |

## 数据合理性

| 项目 | 结论 | 说明 |
|------|------|------|
| PV 汇总功率 | 合理 | 单台 PV 约 40.2-40.3 kW，10 台合计与汇总一致 |
| 架构图功率平衡 | 合理 | Load 与 Grid + PV + BESS 基本闭合 |
| BESS 详情参数 | 合理 | 频率、温度、电压、SOC/SOH 未见明显物理越界 |
| BESS 概览 SOC | 不合理 | 概览为 0，详情为 4.8%-4.9% |
| PV 状态 | 不合理 | 架构图状态断开但有功率输出 |
| PV 发电量 | 需确认 | `Generation Totale 8.8 kWh` 相对 402.5 kW 实时功率偏低，需确认累计口径 |
| 策略时间段 | 需修正 | 23:59 与 24:00 混用，容易造成 1 分钟缺口或口径不一致 |

## 缺陷清单

| 缺陷编号 | 优先级 | 描述 | 建议 |
|----------|--------|------|------|
| BUG-DT-001 | P0 | Deploy 安全校验弹窗无明显关闭/取消入口，打开后阻塞导航 | 增加 Cancel / Close / Esc / 点击遮罩关闭 |
| BUG-DT-002 | P1 | Portuguese Farm 多页面时区口径不一致：08:20 与 15:20 混用 | 统一使用站点时区，或明确标注 UTC/Local/Browser |
| BUG-DT-003 | P1 | 架构图 PV/BESS 状态与实时功率/SOC 矛盾 | 排查状态字段来源和展示逻辑 |
| BUG-DT-004 | P1 | 实时概览 BESS SOC 与详情/架构图不一致 | 统一 SOC 数据源和聚合规则 |
| BUG-DT-005 | P1 | 告警页 `Actif` 点击后跳转资产概览 | 修复筛选控件事件或路由冲突 |
| BUG-DT-006 | P1 | 新建站点空提交漏校验 `EMS Device SN*`、`Station Name*` 等必填项 | 完整补齐必填校验和错误提示 |
| BUG-DT-007 | P2 | Dispatch 页存在多个同名 `Change`，可访问性和自动化定位困难 | 增加明确 aria-label 或区分文案 |
| BUG-DT-008 | P2 | 策略日期控件 disabled，但无说明为什么不可改 | 增加禁用原因或改为只读文本 |
| BUG-DT-009 | P2 | 页面底部出现无上下文裸数值 `45`、`-70.00` 等 | 检查图表轴标签/tooltip 溢出 |
| BUG-DT-010 | P2 | 法语界面混用中英文 | 完善 i18n 字典和日期格式本地化 |
| BUG-DT-011 | P2 | 告警等级/状态筛选为 select，但视觉像按钮/文本，语义不清 | 统一控件样式和可访问性 |
| BUG-DT-012 | P2 | 站点搜索自动化填充受限，需人工复核搜索逻辑 | 建议后续人工或专用脚本复测搜索 |

## 未完成/需确认的破坏性动作

以下动作会真实改变系统或影响边缘设备，本轮只测试到入口或弹窗，未执行最终确认：

| 动作 | 所在模块 | 风险 |
|------|----------|------|
| Verify & Deploy | Dispatch IA | 可能向边缘设备下发策略 |
| Fetch Latest | Dispatch IA | 可能触发边缘策略同步 |
| Save | 支路配置 | 修改站点支路配置 |
| Create Station | 新建站点 | 创建真实站点数据 |
| Apply Strategy | 策略模板 | 修改当前站点策略 |

## 结论

这轮测试已经覆盖主功能的绝大多数可见按钮和主要业务逻辑。Portuguese Farm 数据相对完整，适合作为回归测试站点。当前最高优先级问题是 Deploy 弹窗无法关闭、时区不统一、架构图状态与功率矛盾、实时概览 SOC 不一致、告警筛选误跳转。真正会写入或下发的最终动作仍需在确认测试环境安全后单独执行。
