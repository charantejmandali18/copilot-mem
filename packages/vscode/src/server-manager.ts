import * as vscode from 'vscode';
import * as cp from 'node:child_process';
import * as http from 'node:http';

export class ServerManager {
  private process: cp.ChildProcess | null = null;
  private port: number;
  private outputChannel: vscode.OutputChannel;

  constructor(port: number, outputChannel: vscode.OutputChannel) {
    this.port = port;
    this.outputChannel = outputChannel;
  }

  async start(): Promise<void> {
    if (this.process) {
      this.outputChannel.appendLine('Server already running');
      return;
    }

    const serverBin = this.findServerBinary();
    if (!serverBin) {
      vscode.window.showErrorMessage(
        'copilot-mem-server not found. Install with: npm install -g @copilot-mem/mcp-server',
      );
      return;
    }

    this.outputChannel.appendLine(`Starting copilot-mem server: ${serverBin}`);

    this.process = cp.spawn('node', [serverBin], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.outputChannel.appendLine(`[server stderr] ${data.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      this.outputChannel.appendLine(`Server exited with code ${code}`);
      this.process = null;
    });

    // Wait for server to be ready
    await this.waitForReady();
    this.outputChannel.appendLine(`Server started on port ${this.port}`);
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.outputChannel.appendLine('Server stopped');
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  private findServerBinary(): string | null {
    // Try to find copilot-mem-server in common locations
    const locations = [
      // Local workspace node_modules
      require.resolve?.('@copilot-mem/mcp-server/dist/index.js'),
    ].filter(Boolean);

    for (const loc of locations) {
      if (loc) return loc;
    }

    // Try which/where
    try {
      const result = cp.execSync('which copilot-mem-server', { encoding: 'utf-8' }).trim();
      if (result) return result;
    } catch {
      // Not found in PATH
    }

    return null;
  }

  private waitForReady(maxAttempts = 20): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const req = http.request(
          { hostname: 'localhost', port: this.port, path: '/api/sessions', method: 'GET', timeout: 500 },
          (res) => {
            if (res.statusCode === 200) {
              resolve();
            } else if (attempts < maxAttempts) {
              setTimeout(check, 250);
            } else {
              reject(new Error('Server failed to start'));
            }
            res.resume();
          },
        );
        req.on('error', () => {
          if (attempts < maxAttempts) {
            setTimeout(check, 250);
          } else {
            reject(new Error('Server failed to start'));
          }
        });
        req.end();
      };
      setTimeout(check, 500);
    });
  }
}
