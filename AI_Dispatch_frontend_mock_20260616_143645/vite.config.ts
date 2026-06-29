import path from 'path';
import { spawn } from 'node:child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildDispatchStrategyDraft } from './dispatchAdapter';

function optimizerApiPlugin() {
  const projectRoot = path.resolve(__dirname, '..');
  const pythonBin = path.join(projectRoot, '.venv', 'bin', 'python3');
  const optimizerCli = path.join(projectRoot, 'optimize_cli.py');

  function readRequestBody(req: any, res: any, next: any, onBody: (body: string) => void) {
    let body = '';
    let tooLarge = false;

    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 5_000_000 && !tooLarge) {
        tooLarge = true;
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ detail: 'Request body is too large' }));
        req.destroy();
      }
    });

    req.on('error', next);
    req.on('end', () => {
      if (!tooLarge) onBody(body);
    });
  }

  function runOptimizer(payload: string) {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(pythonBin, [optimizerCli], {
        cwd: projectRoot,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || `Optimizer exited with code ${code}`));
        }
      });
      child.stdin.end(payload);
    });
  }

  function optimizerPayloadFromDispatchRequest(parsed: any) {
    if (parsed?.optimizer && typeof parsed.optimizer === 'object') return parsed.optimizer;
    return {
      dtMinutes: parsed.dtMinutes,
      buyPrice: parsed.buyPrice,
      sellPrice: parsed.sellPrice,
      pvForecastKW: parsed.pvForecastKW,
      loadForecastKW: parsed.loadForecastKW,
      battery: parsed.battery,
      exportLimitKW: parsed.exportLimitKW,
      importLimitKW: parsed.importLimitKW,
      demandLimitKW: parsed.demandLimitKW,
      demandLimitSeriesKW: parsed.demandLimitSeriesKW,
      demandViolationCostPerKWh: parsed.demandViolationCostPerKWh,
      cycleCostPerKWh: parsed.cycleCostPerKWh,
      curtailPenalty: parsed.curtailPenalty,
    };
  }

  function sendJson(res: any, statusCode: number, payload: unknown) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  }

  function methodGuard(req: any, res: any) {
    if (req.method === 'POST') return false;
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
    } else {
      res.statusCode = 405;
    }
    res.setHeader('Allow', 'POST, OPTIONS');
    res.end();
    return true;
  }

  return {
    name: 'optimizer-api',
    configureServer(server) {
      server.middlewares.use('/api/optimize', (req, res, next) => {
        if (methodGuard(req, res)) return;

        readRequestBody(req, res, next, async (body) => {
          try {
            const stdout = await runOptimizer(body);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(stdout);
          } catch (error: any) {
            sendJson(res, 500, { detail: error?.message || String(error) });
          }
        });
      });

      server.middlewares.use('/api/dispatch/optimize', (req, res, next) => {
        if (methodGuard(req, res)) return;

        readRequestBody(req, res, next, async (body) => {
          try {
            const parsed = JSON.parse(body || '{}');
            const optimizerPayload = optimizerPayloadFromDispatchRequest(parsed);
            const stdout = await runOptimizer(JSON.stringify(optimizerPayload));
            const optimized = JSON.parse(stdout);
            const station = parsed.station ?? {};
            const strategy = parsed.strategy ?? {};
            const market = parsed.market ?? parsed.price_model?.source ?? {};
            const priceModel = parsed.priceModel ?? parsed.price_model ?? undefined;
            const draft = buildDispatchStrategyDraft({
              stationId: station.id ?? parsed.stationId ?? 'ST-002',
              stationName: station.name ?? parsed.stationName ?? 'Station #2 (Munich)',
              strategyDate: strategy.date ?? parsed.strategyDate ?? new Date().toISOString().slice(0, 10),
              mode: strategy.mode === 'rolling' ? 'rolling' : 'day_ahead',
              objective: strategy.objective ?? parsed.objective ?? 'storage_profit',
              marketSource: market.source ?? market.market ?? parsed.marketSource ?? 'unknown',
              granularity: market.granularity ?? parsed.granularity ?? `${optimizerPayload.dtMinutes ?? 15}分钟`,
              timezone: market.timezone ?? parsed.timezone ?? 'Asia/Shanghai',
              priceModel,
              dtMinutes: optimizerPayload.dtMinutes ?? 15,
              steps: optimized.steps ?? [],
              summary: optimized.summary ?? {},
            });
            sendJson(res, 200, {
              draft,
              optimizerResult: optimized,
              integration: {
                targetModule: 'AI Dispatch / Cloud Dispatch',
                deployAction: 'Use existing Deploy Strategy after user approval',
                sourceAdapter: 'dynamic-price-optimizer',
                phase2: 'Embedded price model configuration is included in draft.priceModel',
              },
            });
          } catch (error: any) {
            sendJson(res, 500, { detail: error?.message || String(error) });
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: env.VITE_BASE || '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [optimizerApiPlugin(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __USE_MOCK_OPTIMIZER__: JSON.stringify(env.VITE_USE_MOCK_OPTIMIZER === 'true')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
