const http = require('http');
const { URL } = require('url');

const port = Number(process.env.PORT) || 4000;
const listenHost = process.env.HOST || '0.0.0.0';
const once = process.argv.includes('--once');

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
};

const readJson = async (req) =>
  new Promise((resolve, reject) => {
    let data = '';

    req
      .on('data', (chunk) => {
        data += chunk.toString();
      })
      .on('end', () => {
        if (!data) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/v1/analysis/meal') {
    try {
      await readJson(req);
    } catch (error) {
      console.error('[mock-api] Failed to parse body', error);
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const response = {
      dish: {
        name: 'Куриная грудка с овощами',
        confidence: 0.76,
        portionGrams: 320,
        macros: {
          calories: 420,
          protein: 45,
          carbs: 28,
          fat: 12,
        },
        alternatives: [
          { name: 'Индейка гриль', confidence: 0.14 },
          { name: 'Стейк с салатом', confidence: 0.1 },
        ],
      },
      inference: {
        source: 'cloud',
        latencyMs: 240,
        modelVersion: 'mock-local-1',
      },
    };

    console.log('[mock-api] Responded with mock inference data');
    sendJson(res, 200, response);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, listenHost, () => {
  console.log(`[mock-api] Listening on http://${listenHost}:${port}`);

  if (once) {
    setTimeout(() => server.close(() => process.exit(0)), 500);
  }
});
