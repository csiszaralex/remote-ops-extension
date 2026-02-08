/**
 * Ez a fájl definiálja az adatszerkezeteket.
 * Kettéválasztjuk a "Config" (amit a user ír) és a "Model" (amit a program használ) típusokat.
 */

// --- 1. Konfigurációs Típusok (JSON Schema mapping) ---

/**
 * Egy parancs sablon definíciója.
 * Kulcs-érték párként tároljuk a settings.json-ben.
 * Pl: "restart": "docker restart app"
 */
export type CommandTemplates = {
    [key: string]: string;
};

/**
 * Környezeti változó figyelés definíciója.
 */
export interface EnvMonitorConfig {
    path: string;       // A .env fájl elérési útja a szerveren
    key: string;        // A keresett kulcs (pl. APP_VERSION)
    label?: string;     // Megjelenítési név (ha nem adjuk meg, a kulcs neve lesz)
}

/**
 * Egy akció (parancs) definíciója a configban.
 * Lehet egyszerű string (template hivatkozás) vagy objektum (egyedi parancs).
 */
export type ActionConfig =
    | string // Template ID hivatkozás (pl. "restart-app")
    | {
        id?: string;      // Opcionális ID az öröklődés felülírásához (override)
        label: string;    // Megjelenő név a menüben
        command: string;  // A futtatandó shell parancs
    };

/**
 * Egy szerver definíciója.
 */
export interface ServerConfig {
    sshHost: string;            // A .ssh/config-ban lévő Host név
    label?: string;             // Opcionális olvasható név
    actions?: ActionConfig[];   // Szerver-specifikus parancsok
    envMonitors?: EnvMonitorConfig[];
}

/**
 * Egy szerver csoport definíciója.
 */
export interface ServerGroupConfig {
    name: string;               // Csoport neve (pl. "Production")
    actions?: ActionConfig[];   // Csoport szintű parancsok (minden szerverre érvényes)
    servers: ServerConfig[];    // A csoportban lévő szerverek
}

/**
 * A teljes bővítmény konfiguráció gyökere.
 */
export interface RemoteOpsConfig {
    commandTemplates: CommandTemplates;
    groups: ServerGroupConfig[];
}


// --- 2. Belső Modell Típusok (Runtime) ---

/**
 * Ez az a típus, amivel a kódban már dolgozni fogunk (resolved).
 * Itt már nincsenek template stringek, minden konkrét parancs.
 */
export interface ResolvedAction {
    id: string;        // Egyedi azonosító (fontos az override miatt)
    label: string;     // Amit a UI-n látunk
    command: string;   // Amit a terminálnak küldünk
    scope: 'server' | 'group'; // Honnan jött?
}

/**
 * A feldolgozott szerver objektum.
 */
export interface ResolvedServer {
    label: string;
    sshHost: string;
    actions: ResolvedAction[];
    envMonitors: EnvMonitorConfig[];
    groupName: string; // Hogy tudjuk hova tartozik
}
