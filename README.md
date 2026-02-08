# Remote Ops

Pragmatic server management for engineers. Remote Ops adds a sidebar view that groups servers, runs pre-defined actions over SSH, and can read environment values from remote files.

## Features

- Organize servers into groups in a dedicated activity bar container.
- Run server actions with one click (single command or multi-step script).
- Monitor env values by reading remote files over SSH and show them inline.

## Requirements

- An SSH client available on your PATH.
- SSH host entries configured in your local `~/.ssh/config`.

## Configuration

Remote Ops reads configuration from your VS Code `settings.json` under the `remoteOps` section.

### Schema overview

- `remoteOps.commandTemplates`: Map of template name to command string.
- `remoteOps.groups`: Array of server groups.
  - `name`: Group name (e.g., "Production").
  - `actions`: Optional group-level actions.
  - `servers`: Array of servers in the group.

Server definition:

- `sshHost`: Host name from `~/.ssh/config`.
- `label`: Optional display name.
- `actions`: Optional server-level actions (override group actions by `id` or `label`).
- `envMonitors`: Optional list of env file monitors.

Env monitor definition:

- `path`: Remote file path (e.g., `/etc/app/env`).
- `variables`: Array of env keys. Each item can be a string or an object with `key` and `label`.

Action definition:

- String: reference to a `commandTemplates` key.
- Object: `{ id?, label, command }` where `command` can be a string or an array of strings.

### Example

```json
{
  "remoteOps": {
    "commandTemplates": {
      "restartApp": "docker restart app",
      "tailLogs": "docker logs -f --tail 200 app"
    },
    "groups": [
      {
        "name": "Production",
        "actions": ["restartApp"],
        "servers": [
          {
            "sshHost": "prod-app-01",
            "label": "Prod App 01",
            "actions": [
              {
                "id": "deploy",
                "label": "Deploy",
                "command": ["cd /srv/app", "git pull", "./deploy.sh"]
              }
            ],
            "envMonitors": [
              {
                "path": "/etc/app/env",
                "variables": ["APP_ENV", { "key": "APP_VERSION", "label": "Version" }]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Usage

1. Open the Remote Ops view from the activity bar.
2. Expand a group to see servers.
3. Expand a server to see actions and env monitors.
4. Click an action to run it in a dedicated terminal.
5. Click the refresh icon next to an env value to re-fetch it.

## Commands

- `remoteOps.refreshEntry`: Refreshes the tree view.
- `remoteOps.runCommand`: Runs the selected action.
- `remoteOps.refreshEnv`: Refreshes a single env value.

## Development

```bash
pnpm install
pnpm run compile
```

To watch for changes:

```bash
pnpm run watch
```

## Notes

- Env values are read via `ssh <host> "grep ^KEY= <path>"`.
- Group actions are merged with server actions; server actions override by matching `id` (or `label` when `id` is not provided).
