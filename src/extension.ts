import * as vscode from 'vscode';
import { RemoteOpsItem, RemoteOpsTreeProvider } from './treeProvider';

let treeProvider: RemoteOpsTreeProvider;

export function activate(context: vscode.ExtensionContext) {
  treeProvider = new RemoteOpsTreeProvider();
  vscode.window.registerTreeDataProvider('remoteOpsServers', treeProvider);

  let refreshCommand = vscode.commands.registerCommand('remoteOps.refreshEntry', () =>
    treeProvider.refresh(),
  );

  let runCommand = vscode.commands.registerCommand(
    'remoteOps.runCommand',
    async (item: RemoteOpsItem) => {
      if (item.type === 'action') {
        executeServerCommand(item.data.serverHost, item.data.command);
      }
    },
  );

  let refreshEnvCommand = vscode.commands.registerCommand(
    'remoteOps.refreshEnv',
    (item: RemoteOpsItem) => {
      if (item.type === 'env') {
        item.description = 'Refreshing...';
        treeProvider.refreshItem(item);
        treeProvider.fetchEnvValue(item);
      }
    },
  );

  context.subscriptions.push(refreshCommand, runCommand, refreshEnvCommand);
}

async function executeServerCommand(host: string, command: string) {
  const terminalName = `Server: ${host}`;
  let terminal = vscode.window.terminals.find((t) => t.name === terminalName);

  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: terminalName,
      iconPath: new vscode.ThemeIcon('server'),
    });
    terminal.show();
    terminal.sendText(`ssh ${host}`);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  } else {
    terminal.show();
  }
  if (Array.isArray(command)) {
    terminal.sendText(command.join('\n'));
  } else {
    terminal.sendText(command);
  }
}

export function deactivate() {}
