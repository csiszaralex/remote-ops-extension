import {
  ActionConfig,
  CommandTemplates,
  EnvMonitorConfig,
  ServerConfig,
  ServerGroupConfig,
} from './configSchema';

export { ActionConfig, CommandTemplates, EnvMonitorConfig, ServerConfig, ServerGroupConfig };

// --- 2. Belső Modell Típusok (Runtime) ---

export interface ResolvedAction {
  id: string;
  label: string;
  command: string | string[];
  scope: 'server' | 'group';
}

export interface ResolvedServer {
  label: string;
  sshHost: string;
  actions: ResolvedAction[];
  envMonitors: EnvMonitorConfig[];
  groupName: string;
}
