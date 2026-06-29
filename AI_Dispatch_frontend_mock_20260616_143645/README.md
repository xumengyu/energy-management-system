# EcoWatt BESS Cloud EMS

Vite + React front end for the dynamic price optimization prototype. The page now has a cloud-platform configuration layer that maps price templates, flow-price rules, solver limits, objectives, and strategy modes into the existing Python LP optimizer.

## Run Locally

From this directory:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/
```

The Vite dev server includes a local `/api/optimize` middleware. It spawns `../optimize_cli.py`, which calls `../optimizer_server_market_soft_demand.py`, so the front end can run optimization without a separate FastAPI process during local development.

## Full Stack Script

From the parent `动态电价3` directory:

```bash
./start_all.sh
```

This starts the FastAPI optimizer on `127.0.0.1:8000` and the Vite app on `127.0.0.1:3000`.

## Build

```bash
npm run build
```

## Current Optimizer Contract

The current API accepts:

- `buyPrice`, `sellPrice`
- `pvForecastKW`, `loadForecastKW`
- battery capacity, SOC, charge/discharge limits, efficiency
- import/export limits, demand soft limit, cycle cost, curtailment penalty

The cloud price model is richer than this API. The adapter currently maps `grid_to_load` to `buyPrice`, maps the lower of `pv_to_grid` and `bess_to_grid` to `sellPrice`, and maps the mean `curtailment` flow price to `curtailPenalty`.

## EMS Integration Phases

- Phase 1 replaces the original `AI Dispatch / Cloud Dispatch` strategy generation with the dynamic-price optimizer output. The local endpoint is `POST /api/dispatch/optimize`, and the response includes `draft.segments` in the original Cloud Dispatch table shape.
- Phase 2 embeds price model configuration into the dispatch workflow. The Step 6 `价格模型` tab lets operators configure market source, granularity, negative-price policy, and flow-price rules inside the dispatch context. The generated EMS draft now carries `draft.priceModel`, so the original Deploy Strategy path can receive both dispatch segments and the price model snapshot.
