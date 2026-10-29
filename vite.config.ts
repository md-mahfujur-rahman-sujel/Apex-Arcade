import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const {version: packageVersion} = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function buildInfoPlugin(): Plugin {
  let buildInfo = {version: packageVersion, buildId: 'development', builtAt: ''};
  return {
    name: 'apex-build-info',
    apply: 'build' as const,
    buildStart() {
      const builtAt = new Date();
      const timestamp = builtAt.toISOString().replace(/[-:.]/g, '').replace('T', '-');
      let revision = '';
      try {
        revision = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {stdio: 'ignore'}).toString().trim();
      } catch {
        // The build remains available from source archives without Git metadata.
      }
      buildInfo = {version: packageVersion, buildId: revision ? `${revision}-${timestamp}` : timestamp, builtAt: builtAt.toISOString()};
    },
    generateBundle() {
      this.emitFile({type: 'asset', fileName: 'build-info.json', source: `${JSON.stringify(buildInfo, null, 2)}\n`});
    },
  };
}

export default defineConfig(() => {
  return {
    // This repository is served from a GitHub Pages project path, not the domain root.
    base: '/Apex-Arcade/',
    plugins: [react(), tailwindcss(), buildInfoPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
