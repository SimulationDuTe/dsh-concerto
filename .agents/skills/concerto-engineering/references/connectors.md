# Connector 与原生 Agent

用于 Codex/其他后端会话、事件归一化、动态工具、审批、提问、取消与恢复。

依据：[主设计](../../../../docs/Concerto-Design-v0.3.2.md) §6/§8/§17.1；[Codex 能力矩阵](../../../../docs/a1.5-codex/CAPABILITY-MATRIX.md)及同目录 spike；实现定位 `packages/dsh-concerto/lib/connector/`、`runner.mjs`。矩阵证明记录版本的具体用例，不保证当前环境自动相同。

## 保留原生执行环境

- MemberConnector 是领域接口；Codex 通道为 `codex app-server` JSON-RPC。不要按已排除的 ACP 路径设计，不把一次性 DSH subagent 当原生可续接成员，不将完整 Codex 改成模型 API + DSH Loop。
- 保留成员原生模型配置、工具、MCP/Skill、权限和私有 Session；只补充当前任务需要的输入和已验证可注入的 Team Tools。
- Connector 将统一任务输入投影到原生交互，将原生输出归一化后写入 Runtime；不要把后端私有事件形状泄漏成第二套领域状态。
- `turn/completed` 只证明原生轮次结束，不能直接视为任务验收通过；工具返回、候选结果、完成、Review 与用户接受各自有证据边界。

## 审批、提问与恢复

- 服务端反向请求沿真实协议处理：审批 `item/commandExecution/requestApproval`、提问 `item/tool/requestUserInput`、动态工具 `item/tool/call`；取消 `turn/interrupt`，恢复 `thread/resume`。以锁定后端实际支持为准，不伪造通用能力。
- 请求待处理、用户决定、发送、后端确认分别记录；stdin 写成功不等于业务已执行。不能用自动选首项代替等待用户，审批不是普通任务问题。
- 历史探针显示执行中提问受协作模式限制：Plan 可用，Default 返回不可用；需要当前能力时按对应模式/版本验证，不将跨轮次问答描述成同轮暂停恢复。
- Cancel Request 不代表已停止；失联/重启后的未知执行先 reconcile，不能确认则待裁决。不得仅凭宿主 Session 查不到就认定原进程停止。
- 方法正文交付、原生 Skill 加载与真实工具集合刷新分别验证。`skills/list` 可见或文件存在不证明本次已读取；新增阶段工具路由还需验证刷新时机和在途调用匹配。

## 测量环境

沿现有证据使用完整 Codex 安装，避免缺少 `codex-code-mode-host.exe` 的副本。历史故障表明 DSH 沙箱可能影响子进程、状态库或 TLS；先记录权限和环境，不能把环境失败归为协议不支持。实际测试仍按用户分工执行，不为探针擅自换权限或改配置。

当前版本、已验证与未知项查最新报告；旧版本的动态工具或审批 PASS 不能代替新适配器回归。
