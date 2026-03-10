import * as vscode from 'vscode';

export async function configureMcpServer(port: number): Promise<void> {
  // Register the copilot-mem MCP server in VS Code settings
  // This enables Copilot to discover and use our MCP tools
  const config = vscode.workspace.getConfiguration();

  // The MCP server config path may vary — try the known setting key
  const mcpSettingKey = 'github.copilot.chat.mcpServers';

  try {
    const existing = config.get<Record<string, unknown>>(mcpSettingKey) ?? {};
    if (!('copilot-mem' in existing)) {
      await config.update(
        mcpSettingKey,
        {
          ...existing,
          'copilot-mem': {
            type: 'stdio',
            command: 'npx',
            args: ['copilot-mem-server'],
          },
        },
        vscode.ConfigurationTarget.Global,
      );
    }
  } catch {
    // Setting might not exist yet — Copilot MCP support may not be available
  }
}
