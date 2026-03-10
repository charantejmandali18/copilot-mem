import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class IgnoreMatcher {
  private patterns: string[] = [];

  constructor() {
    this.loadPatterns();
  }

  private loadPatterns(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    for (const folder of workspaceFolders) {
      const ignorePath = path.join(folder.uri.fsPath, '.copilot-mem-ignore');
      if (fs.existsSync(ignorePath)) {
        const content = fs.readFileSync(ignorePath, 'utf-8');
        const lines = content
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        this.patterns.push(...lines);
      }
    }
  }

  isIgnored(filePath: string): boolean {
    if (this.patterns.length === 0) return false;

    const relativePath = this.getRelativePath(filePath);
    return this.patterns.some((pattern) => this.matchesGlob(relativePath, pattern));
  }

  private getRelativePath(filePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return filePath;

    for (const folder of workspaceFolders) {
      if (filePath.startsWith(folder.uri.fsPath)) {
        return path.relative(folder.uri.fsPath, filePath);
      }
    }
    return filePath;
  }

  private matchesGlob(filePath: string, pattern: string): boolean {
    // Simple glob matching — supports * and ** patterns
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*');
    return new RegExp(`^${regex}$`).test(filePath);
  }

  static stripPrivateTags(content: string): string {
    return content.replace(/<private>[\s\S]*?<\/private>/g, '[REDACTED]');
  }
}
