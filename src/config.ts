import * as vscode from 'vscode';
import {
  ActionConfig,
  CommandTemplates,
  ResolvedAction,
  ResolvedServer,
  ServerGroupConfig,
} from './types';

/**
 * A konfiguráció betöltéséért és feldolgozásáért felelős modul.
 */
export class ConfigManager {
  // A settings.json kulcsa
  private static CONFIG_SECTION = 'remoteOps';

  /**
   * Betölti a teljes konfigurációt és visszaadja a feldolgozott szerver listát.
   */
  public static getServers(): Map<string, ResolvedServer[]> {
    // Group Name -> Server List mapping
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    // Nyers adatok betöltése
    const templates = config.get<CommandTemplates>('commandTemplates') || {};
    const groups = config.get<ServerGroupConfig[]>('groups') || [];

    const result = new Map<string, ResolvedServer[]>();

    for (const group of groups) {
      const resolvedServers: ResolvedServer[] = group.servers.map((serverConfig) => {
        // 1. Csoport szintű action-ök feloldása
        const groupActions = this.resolveActions(group.actions || [], templates, 'group');

        // 2. Szerver szintű action-ök feloldása
        const serverActions = this.resolveActions(serverConfig.actions || [], templates, 'server');

        // 3. Merge logika (Override implementáció)
        // A szerver action felülírja a csoport action-t, ha azonos az ID/Label.
        const mergedActions = this.mergeActions(groupActions, serverActions);

        return {
          label: serverConfig.label || serverConfig.sshHost,
          sshHost: serverConfig.sshHost,
          envMonitors: serverConfig.envMonitors || [],
          groupName: group.name,
          actions: mergedActions,
        };
      });

      result.set(group.name, resolvedServers);
    }

    return result;
  }

  /**
   * Segédfüggvény: ActionConfig listából ResolvedAction listát csinál.
   */
  private static resolveActions(
    rawActions: ActionConfig[],
    templates: CommandTemplates,
    scope: 'server' | 'group',
  ): ResolvedAction[] {
    return rawActions
      .map((raw) => {
        if (typeof raw === 'string') {
          // Ha string, akkor template hivatkozás
          const command = templates[raw];
          if (!command) {
            console.warn(`Remote Ops: Template '${raw}' not found.`);
            return null;
          }
          return {
            id: raw,
            label: raw, // Template kulcsa lesz a label alapból
            command: command,
            scope,
          };
        } else {
          // Ha objektum, akkor egyedi definíció
          return {
            id: raw.id || raw.label, // Ha nincs ID, a label az azonosító
            label: raw.label,
            command: raw.command,
            scope,
          };
        }
      })
      .filter((action): action is ResolvedAction => action !== null); // Null-ok kiszűrése
  }

  /**
   * Merge logika: A 'source' (server) felülírja a 'target' (group) elemeit azonos ID esetén.
   */
  private static mergeActions(
    groupActions: ResolvedAction[],
    serverActions: ResolvedAction[],
  ): ResolvedAction[] {
    const actionMap = new Map<string, ResolvedAction>();

    // 1. Csoport actionök betöltése
    groupActions.forEach((a) => actionMap.set(a.id, a));

    // 2. Szerver actionök ráhúzása (felülírás)
    serverActions.forEach((a) => actionMap.set(a.id, a));

    // Visszaalakítás listává
    return Array.from(actionMap.values());
  }
}
