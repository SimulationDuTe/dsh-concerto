---
name: concerto-engineering
description: Engineering, architecture and learning guidance for Concerto, a DSH Cordis plugin that coordinates heterogeneous native Agents. Use for design reviews, implementation, debugging, tests, UI integration, host/ACP spikes, and evidence-driven delivery.
---

# Concerto Engineering Skill — v0.3.2（含增补）

> **唯一权威设计基线**：`docs/Concerto-Design-v0.3.2.md`（原地增补，不另立版本）。本文件是**唯一被宿主自动加载的 Skill**；`docs/Concerto-SKILL.md` 只是指向本文件的短指针，不维护第二份正文。修改指令先改本文件，再更新指针。**不再引用 v0.1 章节/Gate。**
>
> **2026-11-08 实测增补**：Codex 通道 = `codex app-server` JSON-RPC（本机**无 ACP**）；DSH 插件与 Agent Preset 的安装契约按宿主内置手册确认（bundle + `install_bundle`）。详见设计 §17。
>
> **2026-11-16 用户与 Lead 确认升级契约**：职责与数量分离——团队事实由 Runtime 自动提供，必需视图由用户/模板约定（仅显式声明 `requiredViews[].requiredForAcceptance: true` 时阻塞完成），自由产物由模型自主决定数量/类型/兼容渲染器，公共简报（进展/问题/下一步）与分组由指挥者维护，查看/置顶（`userPinnedRefs`）由用户控制且刷新保留；页面采用「常驻顶部 + 概览/任务（列表·看板切换）/成果 + 成员抽屉」，全部表面消费 DSH `ui-theme` 主题与字体规范（无 `.concerto-surface` 颜色覆写或独立深浅色开关）。详见设计 §9.2/§9.7/§17.11。

## 1. 使命与角色

作为工程协作者、技术导师和严格的架构审查者，同时服务三个目标：

1. 做出能验证**跨原生 Harness 协作价值**的 DSH Cordis 插件，而不是另造 Electron 工作台、模型目录伪装团队或第二套通用 Agent Harness。
2. 通过源码、实测和失败案例理解 DSH/Cordis 的 Context、Service、Typed Event、Agent Loop、Tool、Session、权限、Client Slot/Definition、ACP 与异构交接。
3. 沉淀可信的开源工程证据：真实 Codex 轨迹、失败恢复、能力矩阵、对照数据与可回退的 Git 记录。

开发者以 C/C++ 为主，具备 Lua/Python 基础；讲 TypeScript/Node/ACP 时从真实代码路径和可运行实验入手，不堆概念。

## 2. 开工前检查（事实优先级）

- 先找 `docs/Concerto-Design-v0.3.2.md` 与现有代码；检查 `git status`、分支与未提交改动。仓库尚无 Git 时，提出并（经授权）执行最小 `git init` 与基线提交，不在临时目录假装已初始化。
- 检查本文件与 `docs/Concerto-SKILL.md` 是否一致；如出现旧 v0.1、独立 Electron、Native Loop MVP、旧章节号或第二份 Skill 正文，先修复再开工。
- 结论分为四类：用户确认的设计决策、真实运行证据、版本特定上游报告、未验证接口/能力。**宿主 README 里存在某 API，不等于第三方插件有权调用。**
- 固定本轮 DSH/ACP/Codex 版本、源码路径与权限范围；能力逐项记 `supported / unsupported / unknown`，不伪造可用性。

## 3. 产品边界（必须守住）

- **形态**：DSH Cordis 插件，复用宿主 Agent Loop/Session/可用服务。Concerto 负责 Collaboration Runtime、Task/Execution/Artifact/Review、三级上下文与异构交接。
- **双入口并行**：侧栏图形化 Team 配置是 **MVP 必需**（CRUD、成员绑定、连接检测、策略、启动、Unknown 裁决）；Agent Preset 是**优先的原生会话启动方式**，不是配置源。Preset 不可用时侧栏提供受支持的 Session 启动。同一 Team 配置只由版本化存储权威管理。
- **原生能力优先**：Commander 为 **Hosted**（任意模型 API + DSH Agent Loop，provider 可换）；**External**（Codex 等完整 Agent）登记为未来模式，MVP 不实现。Codex Worker 保留自身 Loop、工具/Skill/MCP、权限。`MemberConnector` 是领域接口；**Codex 通道为 `codex app-server` JSON-RPC（本机无 ACP，勿再按 ACP 设计）**，网页服务不必伪装 ACP。DSH 的一次性 `dsh-subagent` 不等于中途问答。
- **Commander 品牌无关**：配置只存 `{ source, providerId?, model?, reasoning? }` 引用，不存 Key；DeepSeek 只是 provider 之一。MVP 准入看 Hosted 能否稳定调用原生 Team Tools；只会自由文本的模型只能当聊天成员。
- **三级上下文**：Project / Task / Private Agent Session。只注入必要且授权的事实，不复制隐藏推理，不把成员私有历史合并为公共真相。
- **身份分离**：Task ≠ Execution ≠ 后端 Session；写入前落库 Execution 身份；Result/Review 固定执行版本；Cancel Request 不代表停止确认；用户裁决与后端观测事实分开。
- **团队呈现（2026-11-16 升级）**：团队会话采用「常驻顶部 + 概览 / 任务（列表·看板切换，少量任务默认紧凑列表）/ 成果（按任务·成员·类型筛选） + 右侧成员抽屉」的渐进式结构；全部组件与渲染器直接消费宿主 `--dsw-*` / `--dsh-*` 主题与字体，禁止覆写 `.concerto-surface` 颜色或另设深浅色开关。主验收以“能否理解团队状态、定位成员、读取产物”为准，六种图表覆盖测试另行保留。0.0.4 的头像、dock、turnTail 和 toolview 仅作辅助呈现。
- **指挥者与分工契约**：产物数量、公共展示数量、默认展开数量分别管理。Runtime 提供团队客观事实（含 `requiredViews` 缺失检测与 `live_execution` 实时状态联动）；必需视图由模板/任务契约约定（仅显式声明 `requiredViews[].requiredForAcceptance: true` 时阻塞完成，`acceptance` 自然语言提及仅作提示）；自由产物由模型自主决定；指挥者维护简报（当前进展/关键问题/下一步）与分组推荐；用户置顶（`userPinnedRefs`）与视图查看态（页签/滚动/展开/画布视角）独立保存，不被模型更新覆盖。
- **结构化渲染**：首批支持命名表格、清单、基础思维导图；`table:data` 等是用户要求的引用意图，具体语法/Schema/发布命令尚未冻结。对象带作用域、作者和执行来源，团队/任务/成员视图引用同一产物；HTML/CSS 由渲染器生成。不能让界面勾选绕过真实任务的状态机或审查。
- **结构化读写与多 Renderer（2026-11-15 增补）**：提供写入/局部更新（`publish_view_object`、`patch_view_object`、`update_team_view`）与按需读取（`list_view_objects`、`read_view_object`）两类能力；通过引用、摘要/分页/子树读取和局部编辑减少重复上下文，不承诺 JSON 天然省 token。内容 `type` 与 `renderer` 分离：HTML/CSS 用于表格/清单，Markmap 用于层级图，原生 SVG 用于定制分层/泳道图，Rough.js + SVG 交互白板（支持 `.excalidraw` v2 导出与 `userLayout` 保存，如实标注未嵌入官方 `@excalidraw`）用于手绘白板，无脚本沙箱 iframe 用于受控 `html` 片段。模型主要提供内容与关系，程序负责布局、样式及格式转换；对象所有者、编辑权限、任务/执行来源、预期内容版本（CAS）、幂等与固定证据版本均由 Domain/Runtime 强制校验。本地 148 单测、Chromium fixture（`team-view.mjs` 等）以及真实 DSH `0.2.2-rc.1` 宿主的 V0–V8（Hosted Commander `c1` 端到端工具链、多 Renderer、抽屉、断连恢复与重启持久化，证据位于 `.test-data/dsh-gate-d-20261115/`）均已 PASS；外部 Codex `w2` 动态工具在真实 DSH 会话中的外派往返与多轮省 token 定量对照仍待 Gate E 测量。保持用户编辑与业务状态分离；统一字体/配色/间距，主页摘要、任务细节、成员过程分层。
- **事实传输**：成员中途 update 由 Connector 写入 Runtime，Client 经**受管 RPC + 限频轮询**（或经验证订阅）读取，显示最后同步时间。DSH 工具调用只是可选锚点，不是外部成员输出可见的前提；禁止 `appendPluginRecord`、伪造工具事件、把 Renderer 当事实源。
- **Domain**：状态机、前置条件、幂等、计划版本校验是零 DSH import 的纯 TS；可独立测试，不强制独立 npm 包。
- **MVP 范围**：一个编码团队；Hosted Commander（任意 provider）+ 原生 Codex Worker + 按需 Reviewer；顺序派发；侧栏图形配置 + 至少一个合法会话入口；External 为未来项；无 DAG、模型 Adapter 假团队、Connector Marketplace、高级语义图。

## 4. 核心正确性契约（v0.3.2 增补）

- **状态机唯一权威**：Task/Execution 的合法转移只在设计 §7.6 表与 Domain 纯函数中；表外事件一律 `invalid_transition`。`waiting_input / waiting_approval` 不映射为 Task `failed`；`unknown` 永不自动重试；`attempt` 只在新 Execution 创建时递增。
- **决策**：`submit_decision` 输入 `decisionId, expectedPlanRevision, action, payload`；版本从 `get_team_status` 读取并由 Commander **回填**，Runtime 数值比较；`actor/teamId/session/time/permission` 由 Runtime 绑定。同一事务内：幂等重放首次结果（`replayed:true`，同 ID 不同内容 `idempotency_conflict`）→ 版本 CAS（`stale`）→ 逐动作前置状态（`precondition_failed`）→ 原子写入。
- **作用域**：`planRevision` 属 Project；`decisionId` 去重键 `projectId + decisionId`；`finish_goal` 作用域 `(teamSessionId, goalId)`，但检查覆盖整个 Project。
- **动作 payload**：按 action 独立 Schema，未知字段拒绝；`create_task` 的 `acceptance` 至少一条且可判定；`modify_task` 仅 `pending`；`finish_goal` 不得遗留 running/unknown/审批阻塞/未确认副作用。
- **读模型**：UI 以服务端快照和服务器时间为准，不做增量/第二修订号协议；只丢弃比当前更旧的响应。命名产物可有内容版本用于修订与审查固定，但不据此另造客户端同步协议。
- **客户端 RPC**：UI 不直连 SQLite；读写只经受管 RPC；Host 从传输上下文解析归属；`saveTeam` 用 `configVersion` CAS；写请求 `requestId` 幂等且限流；错误码固定。
- **Review 下限**：`effectiveRequiresReview = policyRequiresReview || commanderRequiresReview`；Commander 只能上调；下调 Team/Profile 下限须用户显式确认并记录 actor/time/reason/policyVersion；派发时冻结。
- **事实来源**：只用 `source: user | artifact | inferred` + `verified: boolean` + `evidenceRef?`。`verified=true` 只能由确定性校验写入；模型评审不算 verified。自动答疑只认 `source=user` 或 `artifact && verified=true`，`inferred` 永不自动答疑。
- **Unknown**：优先后端 reconcile；无法确认时进 `needs_adjudication`；用户“接受/放弃/重做”是处置意图，**不自动代表后端已停止**；冲突写入须先确认终止或经验证隔离。
- **Worktree**：commit 检出**看不到**源目录未提交/未跟踪/忽略内容，开始前提示 dirty 与缺失风险；纳入 dirty 时必须提交 `baseline snapshot`，以 `snapshotCommit` 作为 Review 基线，记录 `baseCommit + snapshotCommit + manifestHash`；实测 `ctx.worktrees.create` 的 `cwd` 副作用与 Codex 路径注入；不静默复制密钥。
- **能力快照**：廉价检测（配置/握手/版本）与深度能力矩阵分离；结果缓存 `checkedAt + dshVersion + codexVersion + protocolVersion + accountFingerprint`，变化即 `stale`；`unknown` 显示检测条件。
- **haltTeam**：只停新派发，不取消也不假装取消在跑执行；恢复只恢复派发，不复活已终止任务；关窗/退出 DSH 不等于 halt。
- **指标**：Gate E 只用 `run_metric` 采集，缺失记 `unknown` 并披露样本量与 unknown 比例；`success` 绑定验收，不用模型自述。
- **Commander 通道**：MVP 只实现 Hosted 的原生 Team Tools；External 的接入协议不定义，留待未来。
- **DSH 安装契约**：插件以 **bundle** 交付（`package.json` 的 `dsh.bundle.patch` + 顶层数组 patch + 入口模块），**只经** `plugin_manager` `install_bundle`（target = bundle 目录绝对路径）安装；**禁止**手写 profile 的 `package.json` / `cordis.patch.yml`、在 `$DSH_HOME` 下建包、在 profile 目录跑 pnpm。客户端插件：`factory` **返回** `{ inject: ['slots'], apply(ctx) }`；`inject` 填**服务名**，`dsh.client.inject` 填**包名**，不可混用。DSH 安装内的包（如 `@deepseek-ai/dsh-tools`）第三方插件 **import 不到**；工具直接构造 `ToolDefinition` 交给 `ctx.tools.register`。
- **Codex 通道**：`codex app-server` stdio JSON-RPC。服务端→客户端请求含 `item/tool/requestUserInput`（中途提问）、`item/commandExecution/requestApproval`（审批）、`item/tool/call`（动态工具）；取消 `turn/interrupt`；恢复 `thread/resume`。**执行中提问仅 Plan 模式可用**（`collaborationMode.mode = 'plan'`），Default 返回 `unavailable in Default mode`。
- **测量纪律**：Codex 必须用**完整安装**（同目录含 `codex-code-mode-host.exe`）且在 **DSH 沙箱外**测量——`.sandbox-bin` 副本缺 host 会让全部工具调用 fail-closed，沙箱内会破坏状态库与 TLS 凭证，两者都会把环境缺陷伪装成「能力不支持」。DSH 崩溃日志只报 fiber 状态名（`failed`），不含内层异常，定位需进程输出或 DevTools Console。

## 5. 当前阶段与 Gate

**前置（不计 Gate）**：同步 Git、唯一权威 Skill 与指针；登记宿主版本证据（设计 §15.2）。

- **A1**：侧栏图形化创建/编辑 Team、绑定成员、连接检测、版本保存、选择启动；用**非 DeepSeek provider** 跑通一次 Hosted Commander 决策；并行验证 Preset 合法安装与团队关联；一个 Team Tool 往返、标准事件可定位、受管 RPC（鉴权/CAS）与 UI 注册/卸载。Preset 失败不影响侧栏验收。
- **A1.5（已完成 2026-11-08）**：本机 Codex **无 ACP 通道**，确定采用 `codex app-server` JSON-RPC。实测 supported：会话创建/一轮执行/事件流/resume/审批往返/取消终态/动态工具/Skill 与 MCP 可见性；**执行中提问仅 Plan 模式 supported**。证据见 `docs/a1.5-codex/CAPABILITY-MATRIX.md`，复跑脚本在同目录 `spike/`。不支持中途提问时的降级（跨轮次问答）保留为兜底而非现状。
- **B**：Hosted Commander（任意 provider）→ 原生 Codex 完成真实工具/文件任务、证据交付；Worktree dirty 内容不可见、`cwd`、路径注入需显式验证。
- **C**：SQLite 身份/幂等/前置条件/Review 下限/事实验证/Unknown 裁决/状态机与读模型测试。
- **D**：先验证独立团队 View 的注册、作用域、默认选择与恢复；再贯通团队看板/可展开任务、命名表格/清单/思维导图、成员消息与输出详情、Commander 更新公共视图。保留快照刷新、离线提示、来源链接和裁决入口。宿主源码有入口不等于默认进入或完整成员历史已接通；见设计 §9/§17.9 与 `docs/Gemini-4-Hydrogen-Handoff-2026-11-15.md`。
- **E**：按 `run_metric` 比较人工交接的操作数、错误、成功率、耗时与额外成本；不预设正收益。

## 6. Native Agent Runtime 的独立学习轨

可在 `experiments/` 独立实现受限 Native Agent Loop（工具调用、会话、权限、上下文）以学习底层机制；**不是 Concerto 产品依赖，不得接入正式 Team Runtime 或阻塞 Gate A1–E**。要产品化须另立 ADR、真实后端比较与验收。

## 7. 工作方式与交付

1. 先看受影响代码、最新设计、测试与未提交变更；优先复用宿主 Service/Slot/Preset，不另造框架。
2. 小改动直接实现；跨插件协议、状态迁移、RPC 或持久化变更先给简短决策：问题、边界、备选、真实失败场景、验证方法。
3. 验证结果用 `PASS / FAIL / NOT RUN / UNKNOWN`，标明命令、版本、日志位置；模型宣称完成不等于测试通过。用户当前分工是开发者实现、DSH/Lead 执行功能与宿主验收，后续明确授权优先。真实截图只证明可见内容，不能替代执行链路验收；独立 fixture 不当作实际 DSH 界面。
4. 关键学习点附简短 Learning Checkpoint：**DSH 怎么做 → Concerto 复用或隔离什么 → 如何亲手验证**；不强制每次教学。
5. 只更新确实受影响的文档与测试；最终说明改动、证据、剩余风险与下一步，不用临时文件覆盖用户历史。
6. **教学必须附出处（用户硬性要求）**：讲 DSH/Cordis/ACP 概念时，**对话回复与 `class/` 文档都要**在末尾给出可查阅地址——① 教学章节（仓库 `docs/subsystems/*.md`、`docs/cordis-tutorial/*`，或内置手册名 `cordis-plugin-development` / `editing-cordis-compositions` / `cordis-composition-reference`）；② API 依据（`<packageDir>/README.md` 或 `lib/types/**/*.d.ts` 绝对路径；`packageDir` 由 `cordis_inspect_query` → `Config.listConfigs` 取得）；③ 实测结论给脚本/日志路径（如 `docs/a1.5-codex/`）。禁止只写「官方文档说」；查不到写 `unknown` 并说明查询方式；远程 master 文档注明可能与锁定版本不符。

## 8. 禁止旧路径回流

宿主内的独立团队 `conversation.view` 是当前待验证方向，不是另造桌面应用；基础思维导图与命名展示对象已纳入近期范围。不要继续用“只做消息尾卡片/只换头像”替代用户的团队主页要求。

不要按 v0.1 的 Electron 工作台、旧 Gate 0、旧 §9 测试章节、`ConversationNodeDefinition`/`conversation.chat.node`、第三方自定义 Conversation Event、通用 Native Loop MVP 或手写 JSON 配置团队来开展产品实现。**也不要按 ACP 设计 Codex 通道**（本机不存在），不要手工拷贝插件到 profile 或手写 profile 配置（只走 `install_bundle`）。团队不是模型：不写模型目录、不做虚拟 LLM Adapter 代理、不偷偷拦截全部用户输入。**不把 Commander 硬编码为 DeepSeek 或 DSH 默认模型**，也不在 External Commander 不可用时静默改用 Hosted 模型。


