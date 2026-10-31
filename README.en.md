# Recent files · DSH plugin

A DeepSeek Harness plugin that adds a **Recent files** entry below **Automation tasks** in the left sidebar, listing the file artifacts you opened in the right sidebar — newest first, one click back to the file.

## Why

A single turn often produces half a dozen files: `out/report.html`, `docs/plan.md`, a screenshot at the workspace root. To look at one again you either scroll the transcript back to its card or walk the file tree. This plugin does one thing: remembers what you opened, in order.

## What you get

- Sidebar order is Plugins (`order: 0`) → Automation tasks (`10`) → **Recent files (`20`)**
- Each row shows a file-type icon, the file name, its directory, and a relative time ("3 min ago"); **Clear** in the header; per-row remove on hover
- Clicking a row switches to the file's session, then opens the file in the right sidebar; that open bumps the row back to the top
- At most 50 entries, de-duplicated by file address

## Install

### From the Plugins page (recommended)

1. Open **Plugins** in the left sidebar
2. Click **Add plugin**
3. Enter the Git URL `https://github.com/msongw-design/dsh-plugin-recent-files`, or the absolute path of a local clone
4. Enable it under **Installed**

### Into a profile

```bash
# inside the profile directory (~/.dsh/profiles/desktop)
pnpm add /path/to/dsh-plugin-recent-files
```

Then add the package name to `dsh.profile.bundles` in that profile's `package.json` and restart.

## How it works

The plugin wraps the two entry points of the right-sidebar controller and records one entry whenever the address is a `dsh-resource://file/session/...` file:

| Method | Covers |
|---|---|
| `openResource` | produced-file cards, file-path links, and tool-row line references in the conversation |
| `openResourceIn` | a tab's own action, such as a row in the right sidebar's file tree |

Wrapping the methods rather than watching the open-tab inventory (`ctx.sidebarRight.openTabs`) is deliberate: re-clicking an already-open file only focuses its tab and produces no new tab record, while "recently viewed" should move it back to the top.

Entries persist in `localStorage` under `dsh.recent-files.v1` as `{ address, sessionId, path, at }`. The same path under two sessions is two entries, matching the right sidebar's address model.

## Compatibility

| DSH version | Status |
|---|---|
| 0.2.0-rc.2 | developed and first verified |
| 0.2.1-rc.3 | confirmed: both slots (`sidebar.panellist`, `main`) and the static `@deepseek-ai/dsh-client-ui-primitives` module table (`FileTypeIcon`, `relativeTime`, icons) are unchanged |

The plugin registers only those two slots and imports no private module internals.

## Development

```
node test/smoke.mjs
```

A headless smoke test runs the real `lib/client.js` against a fake module loader and a fake Cordis context, with real React / react-dom from `~/.dsh/profiles/node_modules` (override with `DSH_PROFILE_MODULES`). 34 assertions cover registration, open capture, de-duplication, persistence and reload, page markup, and disposal.

## Known limits

- Only opens in the right sidebar are recorded; opening a file with the OS default app (Open In…) is not
- The list is global, not grouped by session; a click switches sessions, so it never silently does nothing
- Entries store addresses only. A missing file or an archived session does not break the list

## License

[MIT](LICENSE)
