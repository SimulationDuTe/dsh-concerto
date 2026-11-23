# DSH / Cordis 宿主接入

用于入口、服务注入、Preset、插件安装/重载、Session 启动与宿主 API 探针。

依据：[主设计](../../../../docs/Concerto-Design-v0.3.2.md) §1.2/§10/§15/§17.2–§17.5；实现定位 `packages/dsh-concerto/lib/index.js`、`lib/member.mjs`、`lib/projection/team_preset.mjs`、`lib/team_bundle.mjs`（后三项相对该 package）。先核对当前代码与宿主版本。

## 查接口与验证权限

- 先检查锁定版本的内置手册、源码/类型和已有证据。宿主 README 存在 API 不代表第三方插件有权调用，远程 master 不等于本机版本。
- 核对 Cordis 的 inject、Service 生命周期与作用域，不凭字段相似性访问内部 Context；区分配置存在、服务可访问、一次调用成功与能力完整支持。
- Hosted 程序化启动沿已验证的 `sessionController.create/prompt` 路径；独立成员用独立 Session/Preset 与受管身份绑定。是否挂载文件工具要查实际 preset 与工具 Schema，persona 不能授予能力。
- 客户端 factory 返回插件定义；`inject` 填服务名，客户端 bundle 的 `dsh.client.inject` 填包名。locale 注册与具体 slot 注入分别遵守对应契约，不把服务名当 slot。
- 宿主安装中的 `@deepseek-ai/dsh-tools` 不可假定第三方包可直接 import；沿现有 ToolDefinition 注册路径，使用已验证作用域。角色门控与任务/执行归属鉴权是不同检查。

## 安装与配置

- bundle 沿 `package.json` 的 `dsh.bundle.patch`、顶层数组 patch 和真实入口模块交付；安装只走宿主 `plugin_manager install_bundle`，target 是 bundle 目录绝对路径。
- 保存配置只生成投影，重载才安装；代码 bundle 与团队 preset bundle 分离，避免自重载。沿现有固定 spec、内容哈希核对、未变化不安装及错误回显，不添加 `approvedBuilds` 或旁路安装。
- 不手写 profile 的 `package.json` / `cordis.patch.yml`，不在 `$DSH_HOME` 下建包或在 profile 目录跑 pnpm，不用手工复制替代安装管理器。
- 安装、重启、真实宿主探针按用户当前授权与 DSH/Lead 分工执行；开发文档与产物静态核查不等于已经安装或挂载。

## 当前证据怎么找

宿主版本、源码路径、权限范围与第三方真实调用结果一起记录。§17 保留历史探针；较新实现查[开发日志](../../../../docs/Development-Journal.md)及对应验收报告，不在本文件维护 PASS 清单。Client slot/工具卡/团队页的呈现约束查主设计 §9，需要改呈现时再读取呈现指导。
