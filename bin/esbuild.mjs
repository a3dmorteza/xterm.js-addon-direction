#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

const args = process.argv.slice(2);

// Configurations
const configs = {
  // Build addon
  addon: {
    entryPoints: ['src/DirectionAddon.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'lib/addon-direction.js',
    external: ['@xterm/xterm'],
    platform: 'neutral',
    target: 'es2021',
    sourcemap: true,
    minify: false,
  },

  // Build addon for production
  'addon-prod': {
    entryPoints: ['src/DirectionAddon.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'lib/addon-direction.min.js',
    external: ['@xterm/xterm'],
    platform: 'neutral',
    target: 'es2021',
    sourcemap: true,
    minify: true,
  },

  // Build demo client
  'demo-client': {
    entryPoints: ['demo/client/client.ts'],
    bundle: true,
    format: 'iife',
    outfile: 'demo/dist/client.bundle.js',
    platform: 'browser',
    target: 'es2021',
    sourcemap: true,
    loader: {
      '.css': 'text',
      '.html': 'text',
    },
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    alias: {
      '@a3dmorteza/xterm.js-addon-direction': './lib/addon-direction.js'
    }
  },

  // Build demo server
  'demo-server': {
    bundle: true,
    format: 'esm',
    target: 'es2021',
    sourcemap: true,
    treeShaking: true,
    logLevel: 'warning',
    entryPoints: ['demo/server/server.ts'],
    outfile: 'demo/dist/server-bundle.js',
    format: 'cjs',
    platform: 'node',
    external: ['node-pty'],
  },
};

// Parse arguments
const watch = args.includes('--watch');
const prod = args.includes('--prod');

async function build() {
  try {
    // Determine which configs to build
    let builds = [];

    if (args.includes('--demo-client')) {
      builds.push('demo-client');
    }

    if (args.includes('--demo-server')) {
      builds.push('demo-server');
    }

    if (args.includes('--headless')) {
      // Headless build if needed
    }

    // Default: build addon
    if (builds.length === 0) {
      builds.push(prod ? 'addon-prod' : 'addon');
    }

    // Execute builds
    for (const buildName of builds) {
      const config = configs[buildName];

      console.log(`Building ${buildName}...`);

      if (watch) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
        console.log(`Watching ${buildName} for changes...`);
      } else {
        const result = await esbuild.build(config);
        console.log(`✓ Built ${buildName}`);

        if (buildName === 'demo-client') {
          // Generate HTML file for demo
          await generateDemoHtml();
        }
      }
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

async function generateDemoHtml() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>xterm.js Direction Addon Demo</title>
    <link rel="stylesheet" href="../node_modules/@xterm/xterm/css/xterm.css">
    <style>
        /* استایل‌های دمو را اینجا قرار دهید */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { text-align: center; margin-bottom: 30px; }
        h1 { color: #007acc; margin-bottom: 10px; }
        .demo-area { display: grid; grid-template-columns: 1fr 300px; gap: 30px; }
        .terminal-container { background: #000; border-radius: 8px; overflow: hidden; }
        #terminal { width: 100%; height: 500px; }
        .controls { background: #2a2a2a; border-radius: 8px; padding: 25px; }
        .btn { display: block; background: #007acc; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; margin-bottom: 10px; width: 100%; }
        .btn:hover { background: #005d9e; }
        .btn.ltr { background: #2d7d46; }
        .btn.rtl { background: #c42e2e; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>@xterm/addon-direction Demo</h1>
            <p>Switch between RTL and LTR modes</p>
        </header>
        
        <div class="demo-area">
            <div class="terminal-container">
                <div id="terminal"></div>
            </div>
            
            <div class="controls">
                <h2>Direction Controls</h2>
                <button id="set-ltr" class="btn ltr">Set LTR</button>
                <button id="set-rtl" class="btn rtl">Set RTL</button>
                <button id="write-ltr" class="btn">Write LTR Text</button>
                <button id="write-rtl" class="btn">Write RTL Text</button>
                <button id="clear" class="btn">Clear Terminal</button>
                <button id="reset" class="btn">Reset Terminal</button>
            </div>
        </div>
    </div>
    
    <script src="../lib/addon-direction.js"></script>
    <script src="demo.bundle.js"></script>
</body>
</html>`;

  await fs.writeFile('demo/dist/index.html', html);
  console.log('✓ Generated demo HTML');
}

build();