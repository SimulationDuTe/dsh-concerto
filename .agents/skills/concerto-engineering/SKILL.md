---
name: concerto-engineering
description: Develop, review, or debug Concerto, the DSH Cordis plugin coordinating heterogeneous native Agents. Routes to task-specific architecture, host, connector, runtime, presentation, and evidence guidance.
---

# Concerto 工程协作 — v0.3.2

这是开发 Concerto 的权威 Skill 入口。详细指导在下表所列参考文件中，按当前任务读取；`docs/Concerto-SKILL.md` 仅作指针。本 Skill 不会自动分发给产品运行中的成员。

## 常驻约束

1. 用户当前指令优先。开工先检查受影响代码、未提交变更及[主设计](../../../docs/Concerto-Design-v0.3.2.md)的相关章节；设计原地增补，不另立并行基线。仓库路径以项目根为准。
2. Concerto 是 DSH Cordis 插件；复用宿主与成员原生 Loop、工具和权限。Codex 使用 `codex app-server`，不能沿用已排除的 ACP 路径；自研 Agent Loop 仅作独立学习实验。
3. Runtime 是事实与状态权威；Task、Execution、后端 Session 分开。可信归属由受管上下文绑定；取消请求不等于停止，不盲目重试未确认终止的副作用执行，审批与 Review 下限不能被模型或 UI 绕过。
4. 保留 Project / Task / Private Session 三级上下文，只交付必要且授权的内容。模型自述不是已验证事实，不复制隐藏推理或将成员私有历史合并为公共真相。
5. Commander 维护团队级内容，Worker 维护任务级内容，Reviewer 维护审查内容；Renderer 统一呈现，各视图引用同一产物。模型按需选择图表，不能把公共简报当全部成果。
6. 结论区分用户决策、源码依据、版本特定实测和未知项。功能与宿主验收当前由 DSH/Lead 执行；未经新授权不代跑，文档/Skill 静态检查可做。结果用 PASS / FAIL / NOT RUN / UNKNOWN，历史 PASS 不自动适用于新改动。

## 按任务读取

先根据当前改动选择相关文件，跨领域任务可读取多份；不要默认加载整个目录。需要时沿参考文件定位主设计相关章节，不要求每次通读全套设计。

| 当前任务 | 读取 |
|---|---|
| 架构、范围、团队配置、角色提示、上下文、产品运行时 Skill | [架构与上下文](references/architecture.md) |
| Cordis 服务、Preset、插件入口、安装/重载、宿主 API 探针 | [宿主接入](references/host-integration.md) |
| Codex/其他 Connector、原生会话、事件、审批/提问、取消/恢复 | [Connector](references/connectors.md) |
| 任务状态、决策、RPC、鉴权、CAS/幂等、Review、Unknown、工作区隔离 | [Runtime 与契约](references/runtime.md) |
| 团队页、任务/成员详情、结构化对象、Renderer、主题与交互 | [呈现](references/presentation.md) |
| 验证计划、验收交接、报告/日志、能力结论、教学与出处 | [证据与交付](references/evidence-and-delivery.md) |

参考文件属于本 Skill 的按需指导，不是第二份入口。改指令时同步受影响的参考文件与文档指针；产品运行时 Skill 的设计、实现和加载证据另按主设计 §4.4/§17.12 处理。

## 工作方式

1. **先规划。** 动手前向用户简要说明对应的 DESIGN 条款、这轮范围、实现步骤和验证方式。小改动用一两句话即可。
2. **再执行。** 做最小必要改动，优先复用现有 Service、Slot、Connector 和状态契约，避免无实际风险依据的重复校验和静默兜底。遇到会改变计划的事实，说明原因并调整。
3. **最后静态自检。** 交付前重读实际 diff，沿正常入口核对接线、权限、持久化和版本边界，检查语法与 `git diff --check`。按改动补必要的本地回归或构建，说明实际通过的检查与待验收项。

阶段进度、历史测试数字和宿主版本去[开发日志](../../../docs/Development-Journal.md)及对应验收报告查，不在入口维护副本。


