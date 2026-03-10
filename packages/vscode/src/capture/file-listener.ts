import * as vscode from 'vscode';
import type { BatchSender } from './batch-sender.js';
import { IgnoreMatcher } from '../privacy/ignore-matcher.js';

export class FileListener {
  private disposable: vscode.Disposable | null = null;
  private ignoreMatcher: IgnoreMatcher;

  constructor(
    private sender: BatchSender,
    private outputChannel: vscode.OutputChannel,
  ) {
    this.ignoreMatcher = new IgnoreMatcher();
  }

  start(): void {
    this.disposable = vscode.workspace.onDidSaveTextDocument((doc) => {
      const filePath = doc.uri.fsPath;

      // Skip if file matches ignore patterns
      if (this.ignoreMatcher.isIgnored(filePath)) {
        return;
      }

      this.sender.enqueue({
        type: 'file_edit',
        content: `File saved: ${filePath}`,
        metadata: {
          filePath,
          languageId: doc.languageId,
          lineCount: doc.lineCount,
        },
      });
    });

    this.outputChannel.appendLine('File listener started');
  }

  dispose(): void {
    this.disposable?.dispose();
    this.disposable = null;
  }
}
