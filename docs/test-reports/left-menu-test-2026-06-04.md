# EcoWatt EMS 左侧菜单测试报告

## 测试信息

| 项目 | 内容 |
|------|------|
| 测试日期 | 2026-06-04 |
| 测试地址 | `http://223.6.248.244:8090/eco-watt` |
| 登录用户 | `admin` / `SUPER ADMINISTRATEUR` |
| 当前语言 | Francais |
| 选中站点 | `test2` |
| 测试范围 | 当前部署页面左侧菜单中可见且存在于 DOM 的全部业务菜单 |

## 菜单清单

当前左侧菜单实际存在 10 个业务入口：

| 序号 | 菜单分组 | 菜单名称 |
|------|----------|----------|
| 1 | APERCU | Vue des Actifs |
| 2 | APERCU | Liste des Stations |
| 3 | GESTION | Schema d Architecture |
| 4 | GESTION | Real-time Overview |
| 5 | GESTION | Real-time Detail |
| 6 | GESTION | Analyse des Donnees |
| 7 | GESTION | Statistiques Energie |
| 8 | Alarmes | Alarmes |
| 9 | COMMERCE PRIX | Vue Execution |
| 10 | COMMERCE PRIX | Dispatch IA |

> 说明：已检查左侧菜单 DOM 和滚动区域，当前部署版本未出现更多菜单项。

## 测试结果

| 编号 | 菜单 | 跳转路由 | 结果 | 页面表现/问题 |
|------|------|----------|------|---------------|
| LM-001 | Vue des Actifs | `/eco-watt/asset-overview` | 通过 | 页面展示 Operations Summary、Station Distribution、容量统计；页面底部/提示区出现多条 `System error` |
| LM-002 | Liste des Stations | `/eco-watt/station-list` | 通过 | 页面展示站点列表、状态筛选、新建站点、分页；页面出现多条 `System error` |
| LM-003 | Schema d Architecture | `/eco-watt/station-architecture` | 部分通过 | 路由跳转成功；页面显示 `No data available`、`Select a station and retry`，并出现 `Record not found`、`System error` |
| LM-004 | Real-time Overview | `/eco-watt/station-realtime` | 通过 | 页面展示 ESS 监控、SOC、充放电、曲线；同时出现 `System error`、`Record not found` |
| LM-005 | Real-time Detail | `/eco-watt/station-realtime-details` | 部分通过 | 路由跳转成功；页面显示 `No ESS devices configured for this station`，并出现 `Record not found` |
| LM-006 | Analyse des Donnees | `/eco-watt/station-analysis` | 通过 | 页面展示功率/SOC/电池分析标签与日期范围；同时出现 `System error`、`Record not found` |
| LM-007 | Statistiques Energie | `/eco-watt/station-energy-statistics` | 部分通过 | 路由跳转成功；页面显示 `No nodes`，并出现 `System error`、`Record not found` |
| LM-008 | Alarmes | `/eco-watt/faults` | 通过 | 页面展示告警总数、活跃告警、等级/状态筛选和告警表格 |
| LM-009 | Vue Execution | `/eco-watt/execution-view` | 部分通过 | 路由跳转成功；页面仅显示 `Record not found`，缺少有效执行视图内容 |
| LM-010 | Dispatch IA | `/eco-watt/dispatch-strategy` | 部分通过 | 页面展示当前策略模板、边缘策略、云端调度和下发入口；同时显示 `Validation failed`、`Record not found` |

## 发现的问题

| 问题编号 | 严重级别 | 问题描述 | 影响菜单 |
|----------|----------|----------|----------|
| BUG-LM-001 | P1 | 多个菜单页面进入后出现 `System error`，但页面未给出明确接口、原因或恢复建议 | Vue des Actifs、Liste des Stations、Real-time Overview、Analyse des Donnees、Statistiques Energie 等 |
| BUG-LM-002 | P1 | 多个站点相关页面对当前站点 `test2` 返回 `Record not found` 或空数据，缺少统一空态说明 | Schema d Architecture、Real-time Detail、Statistiques Energie、Vue Execution、Dispatch IA |
| BUG-LM-003 | P1 | `Vue Execution` 页面跳转成功但仅显示 `Record not found`，无页面标题、空态引导或可操作信息 | Vue Execution |
| BUG-LM-004 | P2 | 法语环境下仍存在英文菜单和英文页面文案，如 `Real-time Overview`、`Real-time Detail`、`Operations Summary`、`Record not found` | 多个菜单 |
| BUG-LM-005 | P2 | `Dispatch IA` 页面同时出现正常策略内容和 `Validation failed`，错误来源不清晰 | Dispatch IA |

## 结论

左侧菜单的 10 个业务入口均可点击且不会导致登出或白屏；其中 `Alarmes` 表现最好，告警列表数据完整。站点相关、调度相关页面普遍存在接口错误、记录缺失或空态说明不足的问题，建议优先排查当前站点 `test2` 的数据绑定、接口返回和错误提示展示。
