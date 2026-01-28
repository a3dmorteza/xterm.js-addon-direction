## @xterm/addon-fit

An addon for [xterm.js](https://github.com/xtermjs/xterm.js) that makes direction optional. This addon requires xterm.js v4+.

### Install

```bash
npm install --save @a3dmorteza/xterm.js-addon-direction
```

### Usage

```ts
import { Terminal } from '@xterm/xterm';
import { DirectionAddon } from '@a3dmorteza/xterm.js-addon-direction';

const terminal = new Terminal();
const directionAddon = new DirectionAddon();
terminal.loadAddon(directionAddon);
terminal.open(containerElement);
```

See the full [API](https://github.com/a3dmorteza/xterm.js-addon-direction/blob/master/typings/addon-direction.d.ts) for more advanced usage.
