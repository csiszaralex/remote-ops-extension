import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { ResolvedServer } from './types';

/**
 * Ez az osztály felel a Side Bar megjelenítéséért.
 * A <RemoteOpsItem> a mi saját típusunk, ami a fa minden egyes elemét reprezentálja.
 */
export class RemoteOpsTreeProvider implements vscode.TreeDataProvider<RemoteOpsItem> {
  // Eseménykezelő: ezzel jelezzük a VS Code-nak, ha változott az adat (pl. config mentés után)
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
          new RemoteOpsItem('group', groupName, vscode.TreeItemCollapsibleState.Collapsed, {
            groupName,
            servers,
          }),
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
              server.label, // Ez jelenik meg
              vscode.TreeItemCollapsibleState.Collapsed,
              server,
              server.sshHost, // Description-nek jó lesz a host
            ),
        ),
      );
    }

    // 3. Szerver szint: Action-ök és Env Monitorok listázása
    if (element.type === 'server') {
      const server = element.data as ResolvedServer;
      const items: RemoteOpsItem[] = [];

      // A) Env Monitorok (Ha vannak)
      if (server.envMonitors && server.envMonitors.length > 0) {
        server.envMonitors.forEach((env) => {
          items.push(
            new RemoteOpsItem(
              'env',
              `${env.key}`, // Label: "NODE_ENV"
              vscode.TreeItemCollapsibleState.None,
              { ...env, serverHost: server.sshHost },
              'Loading...', // Kezdeti érték (Description)
            ),
          );
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
              action.command, // Description: a parancs maga
            ),
          );
        });
      }

      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}

/**
 * A polimorfikus fa elemünk.
 * Tárolja, hogy ő micsoda (type) és a hozzá tartozó nyers adatot (data).
 */
class RemoteOpsItem extends vscode.TreeItem {
  constructor(
    public readonly type: 'group' | 'server' | 'action' | 'env',
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data: any, // Itt tároljuk a kontextust (pl. melyik szerverhez tartozik)
    public readonly description?: string,
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.description = description;

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
        // Ha rákattintasz, rögtön fusson le a parancs (Pragmatikus!)
        this.command = {
          command: 'remoteOps.runCommand',
          title: 'Run Action',
          arguments: [this], // Átadjuk magunkat paraméterként
        };
        break;
      case 'env':
        this.iconPath = new vscode.ThemeIcon('eye');
        this.contextValue = 'env';
        break;
    }
  }
}
