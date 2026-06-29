# AI Dispatch 前端模拟数据包说明

## 交付内容

- `dist/`：已按 mock 模式构建好的静态前端产物，可直接部署到 Nginx、Vercel、静态文件服务器或本地预览。
- `App.tsx`、`components/`、`cloudPriceModel.ts`、`dispatchAdapter.ts`：AI Dispatch、价格模型配置、预测边界、云调度草稿等核心前端源码。
- `public/data/M1.json`、`public/data/M2.json`、`public/data/M3.json`：随包提供的模拟曲线数据样例。
- `.env.mock`：启用前端内置模拟优化器，避免依赖 Python/FastAPI 后端。

## 本地运行

```bash
npm install
npm run dev:mock
```

默认访问：

```text
http://localhost:3000/?module=ai-dispatch&view=summary&lang=zh
```

英文：

```text
http://localhost:3000/?module=ai-dispatch&view=summary&lang=en
```

## 构建静态包

```bash
npm run build:mock
npm run preview
```

`build:mock` 会使用 `.env.mock`，打开前端内置模拟求解器。页面顶部会显示“模拟数据 / Mock Data”标识。

## 模拟逻辑

mock 模式不会请求 `/api/optimize`。前端会根据以下输入生成模拟优化结果：

- 买价 / 卖价曲线
- PV 预测 / 负荷预测
- SOC、容量、最大充放电功率
- 购电上限、外送上限、需量软上限
- 循环惩罚、弃光惩罚、超限惩罚

模拟策略采用启发式逻辑：低价或 PV 富余时充电，高价或需量超限时放电，并输出 96 点策略、SOC 曲线、购售电、弃光、收益摘要和 Cloud Dispatch 草稿。

## 对接后端

真实后端联调时使用普通模式：

```bash
npm run dev
```

普通模式会继续请求：

```text
POST /api/optimize
```

因此前端同事可以先用 mock 包完成 UI、交互和状态联调，再切换到真实优化器接口。
