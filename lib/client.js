window.__ModuleLoader__.load({
	id: "dsh-plugin-recent-files",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const runtime = require("react/jsx-runtime");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const jsx = runtime.jsx;
		const jsxs = runtime.jsxs;

		//#region lib/types/client/contract.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "recentFiles";
		/** Panel id shared by the sidebar entry and the main panel page. */
		const PANEL_ID = "recent-files";
		/** Sidebar order: 0 is Plugins, 10 is Automation tasks, so this row sits below it. */
		const PANEL_ORDER = 20;
		/** localStorage key holding the retained list. */
		const STORAGE_KEY = "dsh.recent-files.v1";
		/** Maximum retained entries; older ones fall off the end. */
		const MAX_ENTRIES = 50;
		/** Every file address opens with this scheme, type, and session segment. */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/session/";
		//#endregion

		//#region lib/types/client/locales.js
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"panel.label": "最近浏览",
			"page.title": "最近浏览",
			"page.intro": "在右侧栏打开过的文件产物，最多保留 {max} 条。",
			"page.empty": "还没有打开过文件。在对话里点击文件产物或路径后，它会出现在这里。",
			"page.clear": "清空",
			"row.open": "打开 {name}",
			"row.remove": "从最近浏览中移除",
			"time.now": "刚刚",
			"time.minutes": "{n} 分钟前",
			"time.hours": "{n} 小时前",
			"time.days": "{n} 天前",
			"time.months": "{n} 个月前",
			"time.years": "{n} 年前"
		};
		/** English dictionary, complete against the zh key set. */
		const en = {
			"panel.label": "Recent files",
			"page.title": "Recent files",
			"page.intro": "File artifacts opened in the right sidebar, most recent first; at most {max} are kept.",
			"page.empty": "No file opened yet. Open a produced file or path from the conversation and it lands here.",
			"page.clear": "Clear",
			"row.open": "Open {name}",
			"row.remove": "Remove from recent files",
			"time.now": "just now",
			"time.minutes": "{n} min ago",
			"time.hours": "{n} h ago",
			"time.days": "{n} d ago",
			"time.months": "{n} mo ago",
			"time.years": "{n} y ago"
		};
		//#endregion

		//#region lib/types/client/styles.js
		/** Hashed-free class names; the prefix keeps them unique in the shared document. */
		const styles = {
			page: "dshrf-page",
			inner: "dshrf-inner",
			head: "dshrf-head",
			title: "dshrf-title",
			intro: "dshrf-intro",
			clear: "dshrf-clear",
			empty: "dshrf-empty",
			list: "dshrf-list",
			rowWrap: "dshrf-rowWrap",
			row: "dshrf-row",
			glyph: "dshrf-glyph",
			body: "dshrf-body",
			name: "dshrf-name",
			dir: "dshrf-dir",
			time: "dshrf-time",
			remove: "dshrf-remove"
		};
		const css = [
			`.${styles.page}{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary);overflow:auto;padding:0 clamp(24px,4vw,48px) 48px}`,
			`.${styles.inner}{width:100%;max-width:760px;margin:0 auto}`,
			`.${styles.head}{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px}`,
			`[data-platform=darwin] .${styles.head}{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}`,
			`.${styles.title}{margin:0;font-size:20px;font-weight:500;line-height:28px}`,
			`.${styles.intro}{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}`,
			`.${styles.clear}{flex:none;height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;cursor:pointer}`,
			`.${styles.clear}:hover{background:var(--dsw-alias-button-floating-hover)}`,
			`.${styles.empty}{margin:20px 0 0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}`,
			`.${styles.list}{list-style:none;display:flex;flex-direction:column;gap:2px;margin:20px 0 0;padding:0}`,
			`.${styles.rowWrap}{display:flex;align-items:center;border-radius:10px}`,
			`.${styles.rowWrap}:hover{background:var(--dsw-alias-interactive-bg-hover)}`,
			`.${styles.row}{display:flex;flex:1;align-items:center;gap:10px;min-width:0;padding:8px 4px 8px 10px;border:0;background:0 0;color:inherit;font:inherit;text-align:left;cursor:pointer}`,
			`.${styles.glyph}{display:inline-flex;flex:none;align-items:center;width:16px}`,
			`.${styles.body}{display:flex;flex:1;flex-direction:column;gap:1px;min-width:0}`,
			`.${styles.name}{font-size:14px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
			`.${styles.dir}{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
			`.${styles.time}{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}`,
			`.${styles.remove}{display:inline-flex;flex:none;align-items:center;justify-content:center;width:26px;height:26px;margin-right:6px;border:0;border-radius:8px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0}`,
			`.${styles.rowWrap}:hover .${styles.remove},.${styles.remove}:focus-visible{opacity:1}`,
			`.${styles.remove}:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}`
		].join("");
		/** Inject the panel stylesheet once per document. */
		function installStyles() {
			if (typeof document === "undefined") return;
			const tagId = `${PANEL_ID}/RecentFiles.module.css`;
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = PANEL_ID;
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region lib/types/client/file-address.js
		/** Decode one `/`-separated address path, segment by segment. */
		function decodeAddressPath(encoded) {
			return encoded.split("/").map((segment) => decodeURIComponent(segment)).join("/");
		}
		/**
		* Parse a `dsh-resource://file/session/<sessionId>/<path>` address.
		* @param address - the resource address a caller asked to open.
		* @returns its Session id and path, or undefined for anything else.
		*/
		function parseFileAddress(address) {
			if (typeof address !== "string" || !address.startsWith(FILE_ADDRESS_PREFIX)) return undefined;
			const rest = address.slice(FILE_ADDRESS_PREFIX.length);
			const separator = rest.indexOf("/");
			if (separator <= 0) return undefined;
			try {
				const sessionId = decodeURIComponent(rest.slice(0, separator));
				const path = decodeAddressPath(rest.slice(separator + 1));
				if (sessionId === "" || path === "") return undefined;
				return { sessionId, path };
			} catch (_malformed) {
				return undefined;
			}
		}
		/** The last path segment of a workspace or absolute path. */
		function basename(path) {
			const parts = path.split("/").filter((part) => part !== "");
			return parts.length === 0 ? path : parts[parts.length - 1];
		}
		/** Everything before the last segment, or the empty string at the root. */
		function dirnameOf(path) {
			const trimmed = path.replace(/\/+$/, "");
			const cut = trimmed.lastIndexOf("/");
			return cut <= 0 ? "" : trimmed.slice(0, cut);
		}
		//#endregion

		//#region lib/types/client/store.js
		/** Keep only well-formed entries read back from storage. */
		function sanitize(raw) {
			if (!Array.isArray(raw)) return [];
			const items = [];
			for (const value of raw) {
				if (value === null || typeof value !== "object") continue;
				const { address, sessionId, path, at } = value;
				if (typeof address !== "string" || typeof sessionId !== "string") continue;
				if (typeof path !== "string" || typeof at !== "number") continue;
				if (items.some((item) => item.address === address)) continue;
				items.push({ address, sessionId, path, at });
			}
			return items.slice(0, MAX_ENTRIES);
		}
		/** Read the retained list; a disabled or corrupt store reads as empty. */
		function readItems() {
			try {
				if (typeof localStorage === "undefined") return [];
				const text = localStorage.getItem(STORAGE_KEY);
				return text === null ? [] : sanitize(JSON.parse(text));
			} catch (_unavailable) {
				return [];
			}
		}
		/** Persist the retained list; a full or disabled store drops the write. */
		function writeItems(items) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
			} catch (_unavailable) {
				/* the in-memory list stays authoritative for this page */
			}
		}
		/**
		* The retained list: most recently opened first, one entry per address.
		* @returns the store the page reads and the capture writes.
		*/
		function createStore() {
			let items = readItems();
			const listeners = new Set();
			const getSnapshot = () => items;
			const commit = (next) => {
				items = next;
				writeItems(items);
				for (const listener of [...listeners]) listener();
			};
			return {
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				getSnapshot,
				record: (entry) => {
					const head = items[0];
					if (head !== undefined && head.address === entry.address && head.at === entry.at) return;
					commit([entry, ...items.filter((item) => item.address !== entry.address)].slice(0, MAX_ENTRIES));
				},
				remove: (address) => {
					const next = items.filter((item) => item.address !== address);
					if (next.length !== items.length) commit(next);
				},
				clear: () => {
					if (items.length > 0) commit([]);
				}
			};
		}
		//#endregion

		//#region lib/types/client/capture.js
		/**
		* Record every file address the right Sidebar is asked to open.
		*
		* Two entry points reach the column: `openResource` (the conversation's
		* file links and a tool row's line reference) and `openResourceIn` (a tab's
		* own action, such as a file-tree row). Wrapping both — rather than watching
		* the open-tab inventory — also counts a file that was already open and is
		* merely focused again, which is what "recently viewed" means here.
		*
		* @param ctx - client root context.
		* @param store - the retained list.
		* @returns the effect-scoped disposer.
		*/
		function captureOpens(ctx, store) {
			const face = ctx.sidebarRight;
			const patched = [];
			for (const method of ["openResource", "openResourceIn"]) {
				const original = face[method];
				if (typeof original !== "function") continue;
				const own = Object.prototype.hasOwnProperty.call(face, method);
				const addressIndex = method === "openResource" ? 0 : 1;
				face[method] = function (...args) {
					const parsed = parseFileAddress(args[addressIndex]);
					if (parsed !== undefined) {
						store.record({
							address: args[addressIndex],
							sessionId: parsed.sessionId,
							path: parsed.path,
							at: Date.now()
						});
					}
					return original.apply(this, args);
				};
				patched.push({ method, original, own });
			}
			return () => {
				for (const { method, original, own } of patched) {
					if (own) face[method] = original;
					else delete face[method];
				}
			};
		}
		//#endregion

		//#region lib/types/client/RecentFilesPage.js
		/** The relative-time phrase for one entry. */
		function timeText(at, now, t) {
			const relative = primitives.relativeTime(at, now);
			return relative.unit === "now" ? t("time.now") : t(`time.${relative.unit}`, { n: relative.n });
		}
		/** Icon shown at the start of the sidebar entry and each row. */
		function RecentFilesGlyph({ size }) {
			return jsx(primitives.IconDeliverDocRegular, { size });
		}
		/** One retained file: name, directory, when it was opened, and its removal. */
		function RecentFilesRow({ item, now, t, onOpen, onRemove }) {
			const name = basename(item.path);
			const directory = dirnameOf(item.path);
			return jsxs("li", {
				className: styles.rowWrap,
				children: [
					jsxs("button", {
						type: "button",
						className: styles.row,
						title: item.path,
						"aria-label": t("row.open", { name }),
						onClick: () => {
							onOpen(item);
						},
						children: [
							jsx("span", {
								className: styles.glyph,
								children: jsx(primitives.FileTypeIcon, { path: item.path, size: 16 })
							}),
							jsxs("span", {
								className: styles.body,
								children: [
									jsx("span", { className: styles.name, children: name }),
									directory === "" ? null : jsx("span", { className: styles.dir, children: directory })
								]
							}),
							jsx("span", { className: styles.time, children: timeText(item.at, now, t) })
						]
					}),
					jsx("button", {
						type: "button",
						className: styles.remove,
						title: t("row.remove"),
						"aria-label": t("row.remove"),
						onClick: () => {
							onRemove(item.address);
						},
						children: jsx(primitives.IconTrashOutlineRegular, { size: 14 })
					})
				]
			});
		}
		/**
		* The global panel: every retained file, newest first.
		* @param props - registration-injected store, opener, and locale seat.
		* @returns the panel element tree.
		*/
		function RecentFilesPage({ store, openEntry, t }) {
			const items = react.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
			const [now, setNow] = react.useState(() => Date.now());
			react.useEffect(() => {
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, 60000);
				return () => {
					window.clearInterval(timer);
				};
			}, []);
			return jsx("section", {
				className: styles.page,
				"aria-label": t("page.title"),
				children: jsxs("div", {
					className: styles.inner,
					children: [
						jsxs("div", {
							className: styles.head,
							children: [
								jsxs("div", {
									children: [
										jsx("h1", { className: styles.title, children: t("page.title") }),
										jsx("p", { className: styles.intro, children: t("page.intro", { max: MAX_ENTRIES }) })
									]
								}),
								items.length === 0 ? null : jsx("button", {
									type: "button",
									className: styles.clear,
									onClick: () => {
										store.clear();
									},
									children: t("page.clear")
								})
							]
						}),
						items.length === 0 ? jsx("p", { className: styles.empty, children: t("page.empty") }) : jsx("ul", {
							className: styles.list,
							children: items.map((item) => jsx(RecentFilesRow, {
								item,
								now,
								t,
								onOpen: openEntry,
								onRemove: (address) => {
									store.remove(address);
								}
							}, item.address))
						})
					]
				})
			});
		}
		//#endregion

		//#region lib/types/client/index.js
		/** Services required by this plugin. */
		const inject = [
			"slots",
			"locale",
			"sidebarRight",
			"uiWorkspace"
		];
		/**
		* Register the sidebar entry and the panel over the retained list.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			installStyles();
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "recent-files: dictionaries");
			const t = ctx.locale.bind(NS);
			const store = createStore();
			ctx.effect(() => captureOpens(ctx, store), "recent-files: file-open capture");
			const openEntry = (item) => {
				try {
					ctx.uiWorkspace.openSession(item.sessionId);
				} catch (_unavailable) {
					/* the file's Session may be archived; the address still resolves */
				}
				ctx.sidebarRight.openResource(item.address);
			};
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => ({ store, openEntry })
			}, RecentFilesPage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: PANEL_ORDER,
				locale: NS,
				label: () => t("panel.label")
			}, RecentFilesGlyph));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
