import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateInput, AppError } from './lib/schema.mjs';
import { subjects, quantities } from './lib/subjects.mjs';
import { configuration, checkModel, analyzeWithGemma, transcribeImage } from './lib/model.mjs';

const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/revision-note.js': ['revision-note.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/examples.json': ['examples.json', 'application/json'] };
let inFlight = 0;
export function createServer({ analyze = analyzeWithGemma, modelCheck = checkModel } = {}) {
  return http.createServer(async (req, res) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
    const json = (status, data) => { if (!res.destroyed) { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); } };
    try {
      const config = configuration();
      const actualPort = req.socket.localPort;
      const allowedHosts = [`127.0.0.1:${actualPort}`, `localhost:${actualPort}`, '[::1]:' + actualPort];
      if (config.host === '127.0.0.1' && !allowedHosts.includes(req.headers.host)) throw new AppError('Unrecognized local host.', 403);
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host && req.headers.origin !== 'https://' + req.headers.host) throw new AppError('Cross-origin requests are disabled.', 403);
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && assets[path]) {
        const [name, mime] = assets[path];
        const content = await readFile(fileURLToPath(new URL('./public/' + name, import.meta.url)));
        res.writeHead(200, { ...headers, 'Content-Type': mime + '; charset=utf-8' }); return res.end(content);
      }
      if (req.method === 'GET' && path === '/api/health') return json(200, { ok: true, configured: config.provider === 'ollama' || Boolean(config.key.trim()), provider: config.provider, offline: config.provider === 'ollama', model: config.model, subjects: Object.entries(subjects).map(([id, s]) => ({ id, name: s.name, supported: s.supported })), quantities });
      if (req.method === 'POST' && ['/api/analyze', '/api/model-check', '/api/transcribe'].includes(path)) {
        if (inFlight >= 2) throw new AppError('Two requests are already running. Please wait and retry.', 429);
        if (!req.headers['content-type']?.startsWith('application/json')) throw new AppError('Send application/json.', 415);
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > (path === '/api/transcribe' ? 3000000 : 20000)) throw new AppError('This solution is too long. Shorten it and retry.', 413); }
        let raw;
        try { raw = JSON.parse(body); } catch { throw new AppError('Invalid request JSON.'); }
        if (raw.expectedProvider && raw.expectedProvider !== config.provider) throw new AppError('The inference provider changed. Refresh Margin to see the current data notice before continuing.', 409, 'PROVIDER_CHANGED');
        inFlight++;
        try {
          if (path === '/api/transcribe') return json(200, await transcribeImage(raw, config));
          if (path === '/api/model-check') return json(200, await modelCheck(config));
          const input = validateInput(raw);
          const verification = subjects[input.subject].verify(input);
          return json(200, await analyze(input, verification, config));
        } finally { inFlight--; }
      }
      json(404, { error: 'Page not found.' });
    } catch (e) {
      // Do not log provider responses, keys, student work, or stack traces.
      json(e instanceof AppError ? e.status : 500, { error: e instanceof AppError ? e.message : 'An unexpected server error occurred. Please retry.', code: e instanceof AppError ? e.code : 'SERVER_ERROR' });
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port, host } = configuration();
  const server = createServer();
  server.requestTimeout = 200000;
  server.listen(port, host, () => console.log(`Margin is running at http://${host}:${port}`));
}
