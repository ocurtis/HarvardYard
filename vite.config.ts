import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig, type Plugin } from 'vite';

const run = promisify(execFile);

// Dev-only: the voice booth (tools/booth.html, served at /booth.html?game=<slug>) talks to
// this. Takes live in games/<slug>/art/audio/voice/<name>.wav; save, rename and delete each commit and push, so a
// take goes from the mic to the repo in one tap. Never part of the production build.
function voiceBooth(): Plugin {
  return {
    name: 'voice-booth',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;
      const clean = (v: string | null) => (v ?? '').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
      // One voice folder per game: games/<slug>/art/audio/voice (the booth passes ?game=).
      // Only a real game (a folder with a play.html, not the template) gets a voice folder.
      const dirFor = (slug: string | null) => {
        const g = clean(slug) || 'yard';
        if (g.startsWith('_') || !existsSync(join(root, 'games', g, 'play.html'))) throw new Error(`no such game: ${g}`);
        return join(root, 'games', g, 'art', 'audio', 'voice');
      };
      const git = async (args: string[]) => run('git', args, { cwd: root });
      const describe = (e: unknown) => {
        const err = e as { stderr?: string; message?: string };
        return (err.stderr || err.message || String(e)).trim().split('\n').slice(-3).join(' ');
      };
      const push = async () => {
        // Pull first: the branch is usually behind after Claude pushes, and git refuses
        // a non-fast-forward push. Rebase keeps the takes as their own commits.
        await git(['pull', '--rebase', '--autostash']);
        await git(['push']);
      };
      const commitPush = async (msg: string) => {
        try {
          await git(['add', '-A', 'games/*/art/audio/voice']);
          const status = (await git(['status', '--porcelain', 'games/*/art/audio/voice'])).stdout.trim();
          if (status) await git(['commit', '-m', msg]);
          await push();
          return { pushed: true, error: '' };
        } catch (e) {
          return { pushed: false, error: describe(e) };
        }
      };
      const json = (res: ServerResponse, body: unknown) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(body));
      };
      const body = (req: IncomingMessage) =>
        new Promise<Buffer>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks)));
        });

      // The booth page itself lives outside public/ so it never ships in the build.
      server.middlewares.use('/booth.html', (_req, res) => {
        res.setHeader('content-type', 'text/html');
        res.end(readFileSync(join(root, 'tools', 'booth.html')));
      });
      server.middlewares.use('/__booth', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://x');
        let dir: string;
        try {
          dir = dirFor(url.searchParams.get('game'));
        } catch {
          res.statusCode = 404;
          return res.end();
        }
        mkdirSync(dir, { recursive: true });
        if (url.pathname === '/list') {
          const names = readdirSync(dir).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4)).sort();
          return json(res, { takes: names });
        }
        if (url.pathname === '/file') {
          const name = clean(url.searchParams.get('name'));
          const path = join(dir, `${name}.wav`);
          if (!existsSync(path)) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader('content-type', 'audio/wav');
          return res.end(readFileSync(path));
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        if (url.pathname === '/push') {
          try {
            await push();
            return json(res, { pushed: true, error: '' });
          } catch (e) {
            return json(res, { pushed: false, error: describe(e) });
          }
        }
        if (url.pathname === '/tune') {
          const name = clean(url.searchParams.get('name')) || 'tune';
          writeFileSync(join(dir, `${name}.taps.json`), await body(req));
          return json(res, { saved: name, ...(await commitPush(`Tune taps: ${name}`)) });
        }
        if (url.pathname === '/save') {
          const name = clean(url.searchParams.get('name')) || 'take';
          writeFileSync(join(dir, `${name}.wav`), await body(req));
          return json(res, { saved: name, ...(await commitPush(`Voice take: ${name}`)) });
        }
        if (url.pathname === '/delete') {
          const name = clean(url.searchParams.get('name'));
          const path = join(dir, `${name}.wav`);
          if (existsSync(path)) unlinkSync(path);
          return json(res, { deleted: name, ...(await commitPush(`Voice take removed: ${name}`)) });
        }
        if (url.pathname === '/rename') {
          const from = clean(url.searchParams.get('from'));
          const to = clean(url.searchParams.get('to'));
          const src = join(dir, `${from}.wav`);
          if (!to || !existsSync(src)) {
            res.statusCode = 400;
            return res.end();
          }
          renameSync(src, join(dir, `${to}.wav`));
          return json(res, { renamed: to, ...(await commitPush(`Voice take renamed: ${from} -> ${to}`)) });
        }
        res.statusCode = 404;
        res.end();
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
    rollupOptions: {
      // The collection menu plus every game's play page and manual: games/<slug>/{play,index}.html.
      input: Object.fromEntries([
        ['index', 'index.html'],
        ...readdirSync('games')
          .filter((g) => !g.startsWith('_') && existsSync(join('games', g, 'play.html'))) // _template never ships
          .flatMap((g) => [
            [`${g}-play`, `games/${g}/play.html`],
            [`${g}-manual`, `games/${g}/index.html`],
          ]),
      ]),
    },
  },
  resolve: {
    alias: { '@shared': resolve('shared/src') },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    include: ['games/*/tests/**/*.test.ts', 'shared/tests/**/*.test.ts'],
  },
} as any);
