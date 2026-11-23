# Runtime、状态与受管契约

用于状态机、决策、RPC、身份权限、CAS/幂等、Review、Unknown 裁决和工作区隔离。

依据：[主设计](../../../../docs/Concerto-Design-v0.3.2.md) §3/§7/§8/§11/§12；实现定位 `packages/dsh-concerto/lib/team_runtime.mjs`、同目录的 `routes.mjs`、`tools.mjs`、`runner.mjs` 及 `domain/`。若设计与代码不一致，明确差异，不在工具层或 UI 偷建第二套规则。

## 身份与写入

- Task、Execution、后端 Session 分开；写入前建立执行身份。Project/TeamSession/成员/执行归属、作者、时间和权限由受管上下文绑定，模型参数不是授权。
- 决策沿 `decisionId + expectedPlanRevision + action + payload` 契约；同 ID 同内容重放首次结果，不同内容冲突；随后做版本 CAS 与动作前置条件校验，在同一事务完成写入。
- 每种 action 独立校验 payload，未知字段拒绝；任务验收至少一条可判定条件，修改任务和结束目标遵守当前状态及遗留副作用限制。作用域和去重键查设计 §7，不凭 cwd 或同名 Team 猜身份。
- 客户端只走受管 RPC，不直连持久层；同源检查不等于归属鉴权。版本、幂等与状态前置条件各有作用，不互相替代。

## 状态与审查

- 合法转移集中在设计 §7.6 及领域函数；表外事件拒绝。等待输入/审批不是任务失败；新 Execution 才增加 attempt，旧结果或 Review 不得覆盖新执行。
- Review 固定 `executionId/resultId` 与成果版本。模型 `checksPassed` 自述不是验证事实；策略要求的 Review 下限只能按用户明确授权调整，Commander 可上调，不能自行降低。
- 事实保留 `source: user | artifact | inferred`、验证标记及必要证据引用。只有确定性检查能写入 verified；模型推断不能用于自动答疑或冒充用户决定。
- `haltTeam` 只停止新派发，不代表取消在跑执行；恢复派发不复活已终止任务。读模型以服务端快照和服务器时间为准，客户端不另建业务修订号协议。

## Unknown 与写入隔离

- unknown 不自动重试；优先后端 reconcile，不能确认则裁决。用户放弃/重做是处置意图，不证明旧执行停止。冲突写入须确认终止或验证隔离，原写入范围不能因 UI 操作假装释放。
- 同一可写范围不并行运行未确认结束的写入执行；独立 worktree 不隔离外部 API、数据库或共享目录。
- Worktree 以设计 §11.1 为准：commit 检出不带源目录未提交/暂存/未跟踪/忽略内容，使用前检测并提示，默认不复制；不复制密钥，不自行加入 dirty 快照管线。宿主创建 API 的 cwd/清理/参数所有权需有证据。
- 廉价配置/握手检查与深度能力探针分开；工具权限查实际配置与已验证挂载。未知显示条件，不能用 Skill 声明或历史矩阵冒充当前可用能力。

结构化对象的作者/编辑权限、内容版本和共享引用遵守同一受管边界；具体呈现与用户编辑分离见主设计 §9。
