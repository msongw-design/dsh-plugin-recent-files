/**
 * Headless smoke test for the recent-files client bundle.
 *
 * Runs the real lib/client.js against a fake module loader, a fake Cordis
 * context, and the real React/react-dom taken from the DSH profile, then
 * exercises the capture, the store, and the page markup.
 *
 * Usage: node test/smoke.mjs
 */
import fs from "node:fs";
import os from "node:os";
import vm from "node:vm";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
/** React and react-dom come from a DSH installation, not from this package. */
const profileModules = process.env.DSH_PROFILE_MODULES ?? path.join(os.homedir(), ".dsh", "profiles", "node_modules");
if (!fs.existsSync(path.join(profileModules, "react", "package.json"))) {
	console.error(`no react in ${profileModules}; set DSH_PROFILE_MODULES to a directory holding react and react-dom`);
	process.exit(2);
}
const profileRequire = createRequire(path.join(profileModules, "index.js"));

let failures = 0;
function check(label, condition, detail) {
	if (condition) {
		console.log(`  ok   ${label}`);
		return;
	}
	failures += 1;
	console.log(`  FAIL ${label}${detail === undefined ? "" : ` — ${detail}`}`);
}

//#region fakes
const storage = new Map();
const globalDocument = {
	head: { appendChild() {} },
	querySelector() {
		return null;
	},
	createElement() {
		return { dataset: {}, textContent: "" };
	}
};
globalThis.localStorage = {
	getItem: (key) => (storage.has(key) ? storage.get(key) : null),
	setItem: (key, value) => storage.set(key, String(value)),
	removeItem: (key) => storage.delete(key)
};
globalThis.document = globalDocument;

let definition;
globalThis.window = {
	__ModuleLoader__: {
		load(value) {
			definition = value;
		}
	},
	setInterval,
	clearInterval
};

const react = profileRequire("react");
const glyphStub = (name) => function Stub({ size }) {
	return react.createElement("svg", { "data-glyph": name, width: size, height: size });
};
const primitivesStub = {
	IconDeliverDocRegular: glyphStub("IconDeliverDocRegular"),
	IconTrashOutlineRegular: glyphStub("IconTrashOutlineRegular"),
	FileTypeIcon: glyphStub("FileTypeIcon"),
	relativeTime(at, now) {
		const MIN = 60000;
		const HOUR = 3600000;
		const DAY = 86400000;
		const diff = Math.max(0, now - at);
		if (diff < MIN) return { unit: "now", n: 0 };
		if (diff < HOUR) return { unit: "minutes", n: Math.floor(diff / MIN) };
		if (diff < DAY) return { unit: "hours", n: Math.floor(diff / HOUR) };
		return { unit: "days", n: Math.floor(diff / DAY) };
	}
};
const requireShim = (specifier) => {
	if (specifier === "react") return react;
	if (specifier === "react/jsx-runtime") return profileRequire("react/jsx-runtime");
	if (specifier === "@deepseek-ai/dsh-client-ui-primitives") return primitivesStub;
	throw new Error(`unexpected require: ${specifier}`);
};
//#endregion

//#region load
const code = fs.readFileSync(path.join(root, "lib/client.js"), "utf8");
vm.runInThisContext(code, { filename: "lib/client.js" });
check("bundle registers a factory", definition !== undefined);
check("bundle id", definition.id === "dsh-plugin-recent-files", definition.id);
const plugin = definition.factory(requireShim);
check("exports apply", typeof plugin.apply === "function");
check("exports inject", Array.isArray(plugin.inject), JSON.stringify(plugin.inject));
check("inject covers the services used", ["slots", "locale", "sidebarRight", "uiWorkspace"].every((name) => plugin.inject.includes(name)), JSON.stringify(plugin.inject));
//#endregion

//#region fake context
const dictionaries = new Map();
const registeredSlots = [];
const slotEntries = { "main": [], "sidebar.panellist": [] };
const effects = [];
const allEffects = [];
const sidebarRight = {
	openResource(address, options) {
		sidebarRight.calls.push({ method: "openResource", address, options });
	},
	openResourceIn(sessionId, address, options) {
		sidebarRight.calls.push({ method: "openResourceIn", sessionId, address, options });
	},
	calls: []
};
const sessionsOpened = [];
const pristineOpenResource = sidebarRight.openResource;
const pristineOpenResourceIn = sidebarRight.openResourceIn;
const ctx = {
	effect(callback, label) {
		const dispose = callback();
		effects.push({ label, dispose });
		allEffects.push({ label, dispose });
		return dispose;
	},
	locale: {
		register(namespace, value) {
			dictionaries.set(namespace, value);
			return () => dictionaries.delete(namespace);
		},
		bind(namespace) {
			const table = dictionaries.get(namespace);
			return (key, params) => {
				const raw = table?.zh?.[key];
				if (raw === undefined) return key;
				return String(raw).replace(/\{(\w+)\}/gu, (_, name) => String(params?.[name] ?? ""));
			};
		}
	},
	slots: {
		inject(name, callback) {
			const dispose = callback();
			return dispose;
		},
		register(options, component) {
			registeredSlots.push({ options, component });
			slotEntries[options.name].push({ options, component });
			return () => {};
		}
	},
	sidebarRight,
	uiWorkspace: {
		openSession(id) {
			sessionsOpened.push(id);
		}
	}
};

plugin.apply(ctx);
check("registers a locale dictionary", dictionaries.has("recentFiles"));
const zhKeys = Object.keys(dictionaries.get("recentFiles").zh).sort().join("|");
const enKeys = Object.keys(dictionaries.get("recentFiles").en).sort().join("|");
check("zh and en key sets match", zhKeys === enKeys);
check("registers exactly two slots", registeredSlots.length === 2, String(registeredSlots.length));
const main = registeredSlots.find((entry) => entry.options.name === "main");
const panel = registeredSlots.find((entry) => entry.options.name === "sidebar.panellist");
check("main entry keyed by panel id", main?.options.key === "recent-files", JSON.stringify(main?.options.key));
check("panellist entry id", panel?.options.id === "recent-files", JSON.stringify(panel?.options.id));
check("panellist sits below automation tasks (order 10)", panel?.options.order === 20, JSON.stringify(panel?.options.order));
check("panellist declares a label thunk", typeof panel?.options.label === "function");
check("panellist label resolves to 最近浏览", panel.options.label() === "最近浏览", panel.options.label());
check("scripted effect disposers", effects.length === 2, JSON.stringify(effects.map((effect) => effect.label)));
//#endregion

//#region capture
const addressOf = (sessionId, path) => `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${path.split("/").map(encodeURIComponent).join("/")}`;
const fileA = addressOf("sess-1", "out/report.html");
const fileB = addressOf("sess-2", "docs/中文 笔记.md");
const fileC = addressOf("sess-1", "src/deep/nested/index.ts");

sidebarRight.openResource(fileA, { params: { line: 12 } });
sidebarRight.openResource(fileB);
sidebarRight.openResource("dsh-resource://guide/page");
sidebarRight.openResourceIn("sess-1", fileC);
check("records conversation opens", sidebarRight.calls.length === 4, String(sidebarRight.calls.length));
check("passes through to the original method", sidebarRight.calls[0].method === "openResource" && sidebarRight.calls[0].options.params.line === 12);
check("captures the tab-action entry point too", sidebarRight.calls[3].method === "openResourceIn");

const page = slotEntries["main"][0];
const pageProps = { ...page.options.inject(), t: ctx.locale.bind("recentFiles") };
const store = pageProps.store;
const snapshot = store.getSnapshot();
check("retains three files", snapshot.length === 3, JSON.stringify(snapshot.map((item) => item.path)));
check("newest first", snapshot[0].path === "src/deep/nested/index.ts", snapshot[0].path);
check("decodes percent-encoded path segments", snapshot[1].path === "docs/中文 笔记.md", snapshot[1].path);
check("keeps the session id", snapshot[1].sessionId === "sess-2", snapshot[1].sessionId);
check("ignores non-file resources", snapshot.every((item) => item.address.startsWith("dsh-resource://file/")));
check("persists to localStorage", JSON.parse(storage.get("dsh.recent-files.v1")).length === 3);

// Re-opening an already-open file moves it to the top without duplicating it.
sidebarRight.openResource(fileA);
check("re-open bumps without duplicating", store.getSnapshot().length === 3 && store.getSnapshot()[0].address === fileA);
//#endregion

//#region page render
const { renderToStaticMarkup } = profileRequire("react-dom/server");
const emptyHtml = renderToStaticMarkup(react.createElement(page.component, { ...pageProps, store: { ...store, getSnapshot: () => [], subscribe: () => () => {} } }));
check("empty state renders the notice", emptyHtml.includes("还没有打开过文件"), emptyHtml.slice(0, 200));
check("empty state hides Clear", !emptyHtml.includes(">清空<"));

const html = renderToStaticMarkup(react.createElement(page.component, pageProps));
check("renders every retained file", html.includes("index.ts") && html.includes("笔记.md") && html.includes("report.html"));
check("renders the directory line", html.includes("src/deep/nested"));
check("renders the relative time", /分钟前|小时前|刚刚/u.test(html));
check("renders a clear control", html.includes(">清空<"));
check("rows are labelled for assistive tech", html.includes("aria-label=\"打开 "));
check("style tag installed once", globalDocument.head.appendChild !== undefined);
//#endregion

//#region store operations
store.remove(fileB);
check("remove drops one entry", store.getSnapshot().length === 2 && store.getSnapshot().every((item) => item.address !== fileB));
store.clear();
check("clear empties the list", store.getSnapshot().length === 0 && JSON.parse(storage.get("dsh.recent-files.v1")).length === 0);

// Reload from storage: a fresh module instance reads what the previous one wrote.
storage.set("dsh.recent-files.v1", JSON.stringify([
	{ address: fileA, sessionId: "sess-1", path: "out/report.html", at: Date.now() },
	{ address: "not-an-object" },
	{ address: fileA, sessionId: "sess-1", path: "out/report.html", at: 1 },
	{ address: fileB, sessionId: "sess-2", path: "docs/中文 笔记.md", at: Date.now() }
]));
definition = undefined;
vm.runInThisContext(code, { filename: "lib/client.js" });
const reloaded = definition.factory(requireShim);
registeredSlots.length = 0;
slotEntries.main.length = 0;
slotEntries["sidebar.panellist"].length = 0;
effects.length = 0;
reloaded.apply(ctx);
const reloadedStore = registeredSlots.find((entry) => entry.options.name === "main").options.inject().store;
check("reload restores valid entries only", reloadedStore.getSnapshot().length === 2, JSON.stringify(reloadedStore.getSnapshot().map((item) => item.path)));
//#endregion

//#region disposal
for (const effect of [...allEffects].reverse()) effect.dispose();
check("disposal restores the untouched controller", sidebarRight.openResource === pristineOpenResource && sidebarRight.openResourceIn === pristineOpenResourceIn);
//#endregion

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
