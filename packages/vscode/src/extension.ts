import * as vscode from 'vscode';
import { ServerManager } from './server-manager.js';
import { BatchSender } from './capture/batch-sender.js';
import { ChatListener } from './capture/chat-listener.js';
import { FileListener } from './capture/file-listener.js';
import { ContextInjector } from './injection/context-injector.js';
import { configureMcpServer } from './config/auto-config.js';

let serverManager: ServerManager;
let batchSender: BatchSender;
let chatListener: ChatListener;
let fileListener: FileListener;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Copilot Mem');
  const config = vscode.workspace.getConfiguration('copilot-mem');
  const port = config.get<number>('port', 37888);
  const autoCapture = config.get<boolean>('autoCapture', true);
  const contextInjection = config.get<boolean>('contextInjection', true);

  // Server manager
  serverManager = new ServerManager(port, outputChannel);

  // Batch sender for auto-capture
  batchSender = new BatchSender(port);

  // Chat and file listeners
  chatListener = new ChatListener(batchSender, outputChannel);
  fileListener = new FileListener(batchSender, outputChannel);

  // Context injector
  const contextInjector = new ContextInjector(port, outputChannel);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('copilot-mem.startServer', async () => {
      await serverManager.start();
      vscode.window.showInformationMessage('Copilot Mem server started');
    }),

    vscode.commands.registerCommand('copilot-mem.stopServer', () => {
      serverManager.stop();
      vscode.window.showInformationMessage('Copilot Mem server stopped');
    }),

    vscode.commands.registerCommand('copilot-mem.openViewer', () => {
      vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}/ui`));
    }),

    vscode.commands.registerCommand('copilot-mem.saveMemory', async () => {
      const content = await vscode.window.showInputBox({
        prompt: 'What would you like to remember?',
        placeHolder: 'Enter a memory to save...',
      });
      if (content) {
        batchSender.enqueue({
          type: 'manual',
          content,
          metadata: {
            workspaceFolders: vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath),
          },
        });
        await batchSender.flush();
        vscode.window.showInformationMessage('Memory saved!');
      }
    }),
  );

  // Auto-start server
  try {
    await serverManager.start();
    outputChannel.appendLine('Server auto-started');
  } catch (err) {
    outputChannel.appendLine(`Server auto-start failed: ${err}`);
  }

  // Start auto-capture if enabled
  if (autoCapture) {
    chatListener.start();
    fileListener.start();
  }

  // Configure MCP server in VS Code settings
  await configureMcpServer(port);

  // Inject context on workspace open if enabled
  if (contextInjection && vscode.workspace.workspaceFolders) {
    const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const ctx = await contextInjector.getRelevantContext(projectPath);
    if (ctx) {
      outputChannel.appendLine(`Context available for injection (${ctx.length} chars)`);
    }
  }

  outputChannel.appendLine('Copilot Mem extension activated');
}

export function deactivate(): void {
  chatListener?.dispose();
  fileListener?.dispose();
  batchSender?.dispose();
  serverManager?.stop();
}
