import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig, type Plugin } from 'vite';

const run = promisify(execFile);

// Dev-only: the voice booth (public/booth.html) POSTs a WAV here and it lands in
// art/audio/voice/<name>.wav, committed and pushed, so a take goes from the mic
// to the repo in one tap. Never part of the production build.
function voiceBooth(): Plugin {
  return {
    name: 'voice-booth',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__booth/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url ?? '', 'http://x');
        const name = (url.searchParams.get('name') ?? 'take').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          const dir = join(server.config.root, 'art', 'audio', 'voice');
          mkdirSync(dir, { recursive: true });
          const rel = `art/audio/voice/${name}.wav`;
          writeFileSync(join(server.config.root, rel), Buffer.concat(chunks));
          let pushed = false;
          let error = '';
          try {
            await run('git', ['add', rel], { cwd: server.config.root });
            await run('git', ['commit', '-m', `Voice take: ${name}`], { cwd: server.config.root });
            await run('git', ['push'], { cwd: server.config.root });
            pushed = true;
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ saved: rel, pushed, error }));
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [voiceBooth()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as any);
