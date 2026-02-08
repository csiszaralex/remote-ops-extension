import * as cp from 'child_process';
import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { ResolvedServer } from './types';

/**
 * Ez az osztály felel a Side Bar megjelenítéséért.
 * A <RemoteOpsItem> a mi saját típusunk, ami a fa minden egyes elemét reprezentálja.
 */
export class RemoteOpsTreeProvider implements vscode.TreeDataProvider<RemoteOpsItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RemoteOpsItem | undefined | null | void> =
    new vscode.EventEmitter<RemoteOpsItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<RemoteOpsItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor() {}

  /**
   * Ezt hívja a VS Code, ha frissíteni kell a nézetet (pl. Refresh gomb).
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  refreshItem(item: RemoteOpsItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Ez alakítja át a mi adatunkat (RemoteOpsItem) VS Code által érthető TreeItem-mé.
   */
  getTreeItem(element: RemoteOpsItem): vscode.TreeItem {
    return element;
  }

  /**
   * A fa struktúra logika szíve.
   * Ha nincs 'element', akkor a gyökérszintet (Csoportok) kéri.
   * Ha van 'element', akkor annak a gyermekeit.
   */
  getChildren(element?: RemoteOpsItem): Thenable<RemoteOpsItem[]> {
    // 1. Gyökér szint: Csoportok betöltése
    if (!element) {
      const serversByGroup = ConfigManager.getServers(); // Map<string, ResolvedServer[]>
      const groups: RemoteOpsItem[] = [];

      for (const [groupName, servers] of serversByGroup.entries()) {
        groups.push(
          new RemoteOpsItem(
            'group',
            groupName,
            vscode.TreeItemCollapsibleState.Collapsed,
            { groupName, servers },
            `group-${groupName}`,
          ),
        );
      }
      return Promise.resolve(groups);
    }

    // 2. Csoport szint: Szerverek listázása
    if (element.type === 'group') {
      const data = element.data as { servers: ResolvedServer[] };
      return Promise.resolve(
        data.servers.map(
          (server) =>
            new RemoteOpsItem(
              'server',
              server.label,
              vscode.TreeItemCollapsibleState.Collapsed,
              server,
              `server-${server.sshHost}`,
              server.sshHost,
            ),
        ),
      );
    }

    // 3. Szerver szint: Action-ök és Env Monitorok listázása
    if (element.type === 'server') {
      const server = element.data as ResolvedServer;
      const items: RemoteOpsItem[] = [];

      // A) Env Monitorok
      if (server.envMonitors && server.envMonitors.length > 0) {
        server.envMonitors.forEach((envConfig) => {
          if (envConfig.variables && Array.isArray(envConfig.variables)) {
            envConfig.variables.forEach((variable) => {
              let key: string;
              let label: string;

              if (typeof variable === 'string') {
                key = variable;
                label = variable;
              } else {
                key = variable.key;
                label = variable.label;
              }

              const envItem = new RemoteOpsItem(
                'env',
                label,
                vscode.TreeItemCollapsibleState.None,
                { serverHost: server.sshHost, path: envConfig.path, key: key },
                `env-${server.sshHost}-${envConfig.path}-${key}`,
                '...',
              );

              this.fetchEnvValue(envItem);
              items.push(envItem);
            });
          }
        });
      }

      // B) Parancsok (Actions)
      if (server.actions && server.actions.length > 0) {
        server.actions.forEach((action) => {
          items.push(
            new RemoteOpsItem(
              'action',
              action.label,
              vscode.TreeItemCollapsibleState.None,
              { ...action, serverHost: server.sshHost },
              `action-${server.sshHost}-${action.label}`,
              Array.isArray(action.command) ? '(Multi-step script)' : action.command,
            ),
          );
        });
      }

      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }

  public fetchEnvValue(item: RemoteOpsItem) {
    const { serverHost, path, key } = item.data;

    const sshCommand = `ssh ${serverHost} "grep ^${key}= ${path}"`;

    cp.exec(sshCommand, (err, stdout, stderr) => {
      let newValue = 'Not found';
      let tooltip = '';

      // Ha hiba van (pl. timeout vagy nem létező file), ne omoljon össze, csak írja ki.
      if (err) {
        // Ha exit code 1 (grep nem találta), az nem hiba, csak üres
        if (err.code === 1) {
          newValue = 'Not set';
        } else {
          newValue = 'Error';
          tooltip = stderr || err.message;
        }
      } else {
        const parts = stdout.trim().split('=');
        newValue = parts.length > 1 ? parts.slice(1).join('=') : 'Empty';
        tooltip = `Value: ${newValue}\nPath: ${path}\nKey: ${key}`;
      }

      // UI Frissítése
      item.description = newValue;
      item.tooltip = tooltip;
      this.refreshItem(item);
    });
  }
}

/**
 * A polimorfikus fa elemünk.
 * Tárolja, hogy ő micsoda (type) és a hozzá tartozó nyers adatot (data).
 */
export class RemoteOpsItem extends vscode.TreeItem {
  public tooltip: string | vscode.MarkdownString | undefined;

  constructor(
    public readonly type: 'group' | 'server' | 'action' | 'env',
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data: any,
    public readonly id: string,
    public description?: string,
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;

    // Ikonok beállítása típus szerint (Built-in Codicons)
    switch (type) {
      case 'group':
        this.iconPath = new vscode.ThemeIcon('organization');
        this.contextValue = 'group';
        break;
      case 'server':
        this.iconPath = new vscode.ThemeIcon('server-environment');
        this.contextValue = 'server';
        break;
      case 'action':
        this.iconPath = new vscode.ThemeIcon('terminal');
        this.contextValue = 'action';
        // this.command = {
        //   command: 'remoteOps.runCommand',
        //   title: 'Run Action',
        //   arguments: [this],
        // };
        break;
      case 'env':
        this.iconPath = new vscode.ThemeIcon('eye');
        this.contextValue = 'env';
        break;
    }
  }
}
