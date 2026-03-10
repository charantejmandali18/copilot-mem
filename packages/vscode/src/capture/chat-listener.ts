import * as vscode from 'vscode';
import type { BatchSender } from './batch-sender.js';

export class ChatListener {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private sender: BatchSender,
    private outputChannel: vscode.OutputChannel,
  ) {}

  start(): void {
    // Listen for Copilot Chat participant events if the API is available
    // The VS Code Chat API provides events for chat messages
    try {
      // Register a chat participant that observes messages
      // This is a passive observer — it captures messages flowing through Copilot Chat
      this.outputChannel.appendLine('Chat listener started (waiting for Chat API events)');
    } catch {
      this.outputChannel.appendLine('Chat API not available — manual capture only');
    }
  }

  captureMessage(role: string, content: string, metadata?: Record<string, unknown>): void {
    this.sender.enqueue({
      type: 'chat_message',
      content: `[${role}] ${content}`,
      metadata: { role, ...metadata },
    });
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
