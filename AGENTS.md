# Agent Skills

## Remotion 视频技能

技能位于 `.agents/skills/`，包含 12 个 Remotion 相关技能。
当用户要求创建、修改或渲染视频时，优先加载：
- `.agents/skills/remotion-best-practices/SKILL.md`（核心规则）
- `.agents/skills/remotion-create/SKILL.md`（创建项目）
- `.agents/skills/remotion-render/SKILL.md`（渲染输出）

视频代码位于 `video/` 子包，命令用 `pnpm --filter video` 或在 `video/` 目录下执行。