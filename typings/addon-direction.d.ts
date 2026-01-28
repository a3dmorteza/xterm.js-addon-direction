/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from '@xterm/xterm';

declare module '@a3dmorteza/xterm.js-addon-direction' {
  /**
   * An xterm.js addon that enable switching direction.
   */
  export class DirectionAddon implements ITerminalAddon {
    /**
     * Creates a new fit addon.
     */
    constructor();

    /**
     * Activates the addon
     * @param terminal The terminal the addon is being loaded in.
     */
    public activate(terminal: Terminal): void;

    /**
     * Disposes the addon.
     */
    public dispose(): void;

    public setDirection?(direction: 'ltr' | 'rtl'): void;
    public getDirection?(): 'ltr' | 'rtl';
  }
}
