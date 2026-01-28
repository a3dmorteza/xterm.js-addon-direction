import { Terminal } from '@xterm/xterm';
import { DirectionAddon } from '@a3dmorteza/xterm.js-addon-direction';
import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';

class DirectionDemo {
  private terminal!: Terminal;
  private directionAddon!: DirectionAddon;
  private attachAddon!: AttachAddon;
  private fitAddon!: FitAddon;
  private currentDirection: 'ltr' | 'rtl' = 'ltr';
  private socket: WebSocket | null = null;
  private pid: number | null = null;
  private useRealTerminal: boolean = true;
  private resizeObserver: ResizeObserver | null = null;
  private examples = {
    ltr: [
      "This is Left-to-Right (LTR) text.",
      "Most Western languages use LTR direction.",
      "Example: English, Spanish, French, German",
      "Hello, World! This is a test of LTR rendering.",
      "Terminal output should flow from left to right."
    ],
    rtl: [
      "هذا نص من اليمين إلى اليسار (RTL).",
      "اللغة العربية والعبرية والفارسية تستخدم اتجاه RTL.",
      "مثال: مرحباً بالعالم! این یک تست برای نمایش راست به چپ است.",
      "يجب أن يتدفق إخراج الطرفية من اليمين إلى اليسار.",
      "اختبار الأرقام مع النص العربي: 12345"
    ],
    mixed: [
      "Mixed: English English متن فارسی Persian text",
      "Hello سلام World دنیا",
      "LTR: Left to Right | RTL: از راست به چپ",
      "Numbers work in both: ١٢٣ (Arabic) vs 123 (English)",
      "Bidirectional text: Start [پایان] End"
    ]
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.initializeTerminal();
    this.initializeAddons();
    
    if (this.useRealTerminal) {
      await this.connectToServer();
    } else {
      this.setupEventListeners();
      this.showWelcomeMessage();
    }

    this.setupResizeObserver();
    this.terminal.focus();
  }

  private initializeTerminal(): void {
    const isWindows = ['Windows', 'Win16', 'Win32', 'WinCE'].indexOf(navigator.platform) >= 0;
    this.terminal = new Terminal({
      allowProposedApi: true,
      windowsPty: isWindows ? {
        backend: 'conpty',
        buildNumber: 22621
      } : undefined,
      fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
      fontSize: 14,
      allowTransparency: true,
      cursorBlink: true,
      scrollback: 1000,
      disableStdin: false,
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });

    const terminalElement = document.getElementById('terminal');
    if (!terminalElement) {
      throw new Error('Terminal element not found');
    }
    this.terminal.open(terminalElement);
  }

  private initializeAddons(): void {
    // Initialize DirectionAddon
    this.directionAddon = new DirectionAddon();
    this.terminal.loadAddon(this.directionAddon);
    
    // Initialize FitAddon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    
    // Fit terminal to container initially
    setTimeout(() => {
      try {
        this.fitAddon.fit();
      } catch (error) {
        console.warn('Failed to fit terminal on init:', error);
      }
    }, 100);
  }

  private setupResizeObserver(): void {
    const container = document.getElementById('terminal-container');
    if (container && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        try {
          this.fitAddon.fit();
        } catch (error) {
          console.warn('Failed to fit terminal on resize:', error);
        }
      });
      this.resizeObserver.observe(container);
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener('resize', () => {
        try {
          this.fitAddon.fit();
        } catch (error) {
          console.warn('Failed to fit terminal on window resize:', error);
        }
      });
    }
  }

  private async connectToServer(): Promise<void> {
    try {
      // Fit terminal before getting dimensions
      try {
        this.fitAddon.fit();
      } catch (error) {
        console.warn('Could not fit terminal before connecting:', error);
      }
      
      // 1. Create a new terminal on the server
      const cols = this.terminal.cols;
      const rows = this.terminal.rows;
      
      const response = await fetch(`/terminals?cols=${cols}&rows=${rows}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create terminal: ${response.status}`);
      }
      
      this.pid = parseInt(await response.text());
      console.log(`Terminal created with PID: ${this.pid}`);
      
      // 2. Connect via WebSocket
      this.socket = new WebSocket(`ws://${window.location.host}/terminals/${this.pid}`);
      
      // AttachAddon ایجاد و استفاده
      this.attachAddon = new AttachAddon(this.socket);
      this.terminal.loadAddon(this.attachAddon);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.setupEventListeners();
        this.terminal.focus();
        
        // After connecting, show a welcome message
        this.terminal.writeln('\x1b[1;32m✓ Connected to terminal server\x1b[0m');
        this.terminal.writeln('\x1b[33mType commands to interact with the shell\x1b[0m\n');
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.terminal.writeln('\x1b[1;31m✗ Disconnected from terminal server\x1b[0m');
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.terminal.writeln('\x1b[1;31m✗ WebSocket error\x1b[0m');
      };
      
      // Handle terminal resize
      this.terminal.onResize((size) => {
        if (this.pid) {
          fetch(`/terminals/${this.pid}/size?cols=${size.cols}&rows=${size.rows}`, {
            method: 'POST'
          });
        }
      });
      
      // Fit terminal after connection
      setTimeout(() => {
        try {
          this.fitAddon.fit();
        } catch (error) {
          console.warn('Failed to fit terminal after connection:', error);
        }
      }, 200);
      
    } catch (error) {
      console.error('Failed to connect to terminal server:', error);
      this.terminal.writeln(`\x1b[1;31mFailed to connect: ${error}\x1b[0m`);
      this.terminal.writeln('\x1b[33mRunning in demo mode only\x1b[0m\n');
      
      // Fallback to demo mode
      this.setupEventListeners();
      this.showWelcomeMessage();
    }
  }

  private setupEventListeners(): void {
    // Set direction buttons
    const setLtrBtn = document.getElementById('set-ltr');
    const setRtlBtn = document.getElementById('set-rtl');
    const writeLtrBtn = document.getElementById('write-ltr');
    const writeRtlBtn = document.getElementById('write-rtl');
    const writeMixedBtn = document.getElementById('write-mixed');
    const clearBtn = document.getElementById('clear');
    const resetBtn = document.getElementById('reset');
    const fitBtn = document.getElementById('fit-terminal'); // دکمه جدید

    if (setLtrBtn) setLtrBtn.addEventListener('click', () => this.setDirection('ltr'));
    if (setRtlBtn) setRtlBtn.addEventListener('click', () => this.setDirection('rtl'));
    if (writeLtrBtn) writeLtrBtn.addEventListener('click', () => this.writeExamples('ltr'));
    if (writeRtlBtn) writeRtlBtn.addEventListener('click', () => this.writeExamples('rtl'));
    if (writeMixedBtn) writeMixedBtn.addEventListener('click', () => this.writeExamples('mixed'));
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearTerminal());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTerminal());
    if (fitBtn) fitBtn.addEventListener('click', () => this.fitTerminal());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'l':
            e.preventDefault();
            this.clearTerminal();
            break;
          case 'r':
            e.preventDefault();
            this.resetTerminal();
            break;
          case 'f':
            e.preventDefault();
            this.fitTerminal();
            break;
        }
      }
    });
  }

  private fitTerminal(): void {
    try {
      this.fitAddon.fit();
      console.log('Terminal fitted to container');
    } catch (error) {
      console.error('Failed to fit terminal:', error);
    }
  }

  private setDirection(direction: 'ltr' | 'rtl'): void {
    if (this.currentDirection !== direction) {
      this.currentDirection = direction;
      
      // استفاده از API واقعی افزونه وقتی پیاده‌سازی شد
      if (typeof (this.directionAddon as any).setDirection === 'function') {
        (this.directionAddon as any).setDirection(direction);
      }
      
      this.writeColored(`✓ Switched to ${direction.toUpperCase()} mode`, '32');
      const directionText = direction === 'ltr' 
        ? 'Text will now flow from Left to Right' 
        : 'Text will now flow from Right to Left';
      this.terminal.writeln(`\x1b[33m${directionText}\x1b[0m\n`);
      
      // Update UI
      this.updateDirectionIndicator(direction);
    } else {
      this.writeColored(`Already in ${direction.toUpperCase()} mode`, '33');
    }
  }

  private updateDirectionIndicator(direction: 'ltr' | 'rtl'): void {
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
      (indicator as HTMLElement).textContent = direction.toUpperCase();
      (indicator as HTMLElement).style.backgroundColor = direction === 'ltr' ? '#2d7d46' : '#c42e2e';
    }
  }

  private writeExamples(type: 'ltr' | 'rtl' | 'mixed'): void {
    const title = type === 'ltr' ? 'LTR Text Examples' :
                 type === 'rtl' ? 'RTL Text Examples' : 'Mixed Direction Text';
    
    this.writeColored(`\n--- ${title} ---`, '36');
    this.examples[type].forEach(text => {
      this.terminal.writeln(text);
    });
    this.terminal.writeln('');
  }

  private writeColored(text: string, colorCode: string): void {
    this.terminal.write(`\x1b[${colorCode}m${text}\x1b[0m\n`);
  }

  private clearTerminal(): void {
    this.terminal.clear();
    this.writeColored('Terminal cleared', '33');
    this.terminal.writeln('');
  }

  private resetTerminal(): void {
    this.terminal.reset();
    this.writeColored('Terminal reset to initial state', '33');
    this.terminal.writeln('');
    this.currentDirection = 'ltr';
    this.updateDirectionIndicator('ltr');
    this.showWelcomeMessage();
    
    // Refit after reset
    setTimeout(() => this.fitTerminal(), 100);
  }

  private showWelcomeMessage(): void {
    this.terminal.writeln('\x1b[1;36m@xterm/addon-direction Demo\x1b[0m');
    this.terminal.writeln('\x1b[33m========================================\x1b[0m');
    this.terminal.writeln('');
    this.terminal.writeln('This demo shows how to use the Direction addon to switch');
    this.terminal.writeln('between RTL (Right-to-Left) and LTR (Left-to-Right) modes.');
    this.terminal.writeln('');
    this.terminal.writeln('\x1b[32mCurrent mode: LTR (Left-to-Right)\x1b[0m');
    this.terminal.writeln('');
    this.terminal.writeln('Use the buttons on the right to:');
    this.terminal.writeln('  • Switch between LTR and RTL modes');
    this.terminal.writeln('  • Test different text directions');
    this.terminal.writeln('  • Clear or reset the terminal');
    this.terminal.writeln('  • Fit terminal to container (Ctrl+F)');
    this.terminal.writeln('');
    this.terminal.writeln('\x1b[33m========================================\x1b[0m');
    this.terminal.writeln('');
  }

  // Cleanup
  public dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.socket) {
      this.socket.close();
    }
    this.terminal.dispose();
  }
}

// Initialize demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const demo = new DirectionDemo();
    
    // Expose for debugging
    (window as any).demo = demo;
    
    console.log('Direction Addon Demo initialized');
    console.log('Demo instance:', demo);
  } catch (error) {
    console.error('Failed to initialize demo:', error);
    
    // Show error in terminal if possible
    const terminalElement = document.getElementById('terminal');
    if (terminalElement) {
      terminalElement.innerHTML = `
        <div style="color: red; padding: 20px; font-family: monospace;">
          <h3>Error initializing demo:</h3>
          <pre>${error}</pre>
          <p>Make sure to run <code>npm run package</code> first to build the addon.</p>
        </div>
      `;
    }
  }
});

export default DirectionDemo;