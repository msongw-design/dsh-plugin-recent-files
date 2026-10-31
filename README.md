# 最近浏览 · DSH 插件

在 DeepSeek Harness 左侧栏「自动化任务」下方加一个「最近浏览」，把你在右侧栏打开过的文件产物按时间排下来，点一下就能回到那个文件。

## 为什么有它

一轮对话产出五六个文件是常态：`out/report.html`、`docs/方案.md`、根目录的截图……再想看一眼时，要么回滚聊天记录翻产物卡片，要么在右侧栏文件树里逐层找。这个插件只做一件事——记住你打开过什么，按最近顺序列出来。

## 效果

- 侧栏顺序固定为 Plugins（`order: 0`）→ 自动化任务（`10`）→ **最近浏览（`20`）**
- 面板每行：文件类型图标、文件名、所在目录、相对时间（「3 分钟前」）；右上角「清空」；悬停单条可移除
- 点击条目：先切到该文件所属会话，再在右侧栏打开；这次打开会把它重新置顶
- 最多保留 50 条，最新在前，按文件地址去重

## 安装

### 方式一：Plugins 页（推荐）

1. 左侧栏点 **Plugins**
2. 点 **Add plugin**
3. 填 Git 地址 `https://github.com/msongw-design/dsh-plugin-recent-files`，或本仓库克隆后的本地绝对路径
4. 安装完成后在 **Installed** 组里启用

### 方式二：写进 profile

```bash
# 在 profile 目录（~/.dsh/profiles/desktop）里
pnpm add /path/to/dsh-plugin-recent-files
```

然后把包名加进 `package.json` 的 `dsh.profile.bundles`：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-plugin-recent-files"]
    }
  }
}
```

重启应用。profile 带 HMR 时通常刷新页面即可。

## 工作原理

包裹右侧栏控制器的两个入口方法，命中 `dsh-resource://file/session/...` 地址时记一条：

| 方法 | 覆盖的入口 |
|---|---|
| `openResource` | 对话里的文件产物卡片、文件路径链接、工具行的行号引用 |
| `openResourceIn` | 标签页自身的动作，例如右侧栏文件树的某一行 |

之所以包裹方法而不是监听已打开的标签清单（`ctx.sidebarRight.openTabs`）：已经打开的标签再次点击只是聚焦，不会产生新的标签记录，而「最近浏览」应该把它重新置顶。

存储走 `localStorage` 的 `dsh.recent-files.v1`，条目字段 `address`、`sessionId`、`path`、`at`。同一路径在不同会话下是两条，与右侧栏标签的地址模型一致。

## 兼容性

| DSH 版本 | 状态 |
|---|---|
| 0.2.0-rc.2 | 开发与首次验证 |
| 0.2.1-rc.3 | 已确认：`sidebar.panellist`、`main` 两个槽位仍在，`@deepseek-ai/dsh-client-ui-primitives` 仍是静态模块表的一员（`FileTypeIcon`、`relativeTime` 等 API 未变） |

插件只注册这两个槽位，不依赖未公开的内部模块；上游改动槽位契约时才需要跟进。

## 开发

```
node test/smoke.mjs
```

无头冒烟测试：假的 `window.__ModuleLoader__`、假的 Cordis ctx、真实的 React / react-dom，34 项断言覆盖注册、打开捕获、存储去重、持久化与重载、页面渲染、注销还原。React 从 DSH 的 `~/.dsh/profiles/node_modules` 取，可用 `DSH_PROFILE_MODULES` 覆盖。

## 已知边界

- 只记右侧栏里的打开动作；用系统默认应用打开文件（Open In…）不计入
- 列表是全局的，不按会话分组；点击时切换会话，不会出现「点了没反应」
- 只存地址，不校验文件是否还在；会话被归档时切换失败会被忽略，地址仍可解析

## License

[MIT](LICENSE)
