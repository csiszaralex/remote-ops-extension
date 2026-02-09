import { z } from 'zod';

// --- Alap típusok ---

// Parancs templatek: kulcs -> parancs string
export const CommandTemplatesSchema = z
  .record(z.string(), z.string())
  .describe('Reusable command templates (key: command).');

// Környezeti változó definíció (string vagy objektum)
const EnvVarDefinitionSchema = z.union([
  z.string(),
  z.object({
    key: z.string(),
    label: z.string(),
  }),
]);

// Env Monitor konfiguráció
const EnvMonitorConfigSchema = z.object({
  path: z.string().describe('Path to the .env file on the server.'),
  variables: z.array(EnvVarDefinitionSchema).describe('List of variables to monitor.'),
});

// Action (Parancs) definíció
const ActionConfigSchema = z.union([
  z.string().describe('Reference to a command template ID.'),
  z.object({
    id: z.string().optional(),
    label: z.string().describe('Display name for the action.'),
    command: z
      .union([z.string(), z.array(z.string())])
      .describe('The command to execute (string or array of strings).'),
  }),
]);

// Szerver definíció
const ServerConfigSchema = z.object({
  sshHost: z.string().describe('Host alias from your ~/.ssh/config.'),
  label: z.string().optional().describe('Friendly name for the tree view.'),
  actions: z.array(ActionConfigSchema).optional().describe('Server-specific actions.'),
  envMonitors: z
    .array(EnvMonitorConfigSchema)
    .optional()
    .describe('Environment variables to watch.'),
});

// Csoport definíció
const ServerGroupConfigSchema = z.object({
  name: z.string().describe("Name of the group (e.g. 'Production')."),
  actions: z.array(ActionConfigSchema).optional().describe('Group-level actions.'),
  servers: z.array(ServerConfigSchema).describe('List of servers in this group.'),
});

// A teljes Config struktúra (Amit a user a settings.json-be ír)
// Itt szétbontjuk a kulcsokat, ahogy a VS Code várja
export const RemoteOpsSettingsSchema = z.object({
  'remoteOps.commandTemplates': CommandTemplatesSchema,
  'remoteOps.groups': z.array(ServerGroupConfigSchema).describe('Server groups configuration.'),
});

// --- TypeScript Típusok Exportálása (Inferencia) ---
// Így nem kell kézzel karbantartani a típusokat!
export type CommandTemplates = z.infer<typeof CommandTemplatesSchema>;
export type ServerGroupConfig = z.infer<typeof ServerGroupConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type ActionConfig = z.infer<typeof ActionConfigSchema>;
export type EnvMonitorConfig = z.infer<typeof EnvMonitorConfigSchema>;
