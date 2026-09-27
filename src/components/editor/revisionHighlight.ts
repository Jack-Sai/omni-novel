import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { buildIndex, flatToPm } from "./search";
import { locateQuote } from "./locateText";
import { useRevisionStore } from "../../stores/revisionStore";

export const REVISION_HIGHLIGHT_KEY = new PluginKey("omniRevisionHighlight");
/** 点击正文中的 AI 建议高亮 → 通知修订面板展开对应卡片 */
export const REVISION_CLICK_EVENT = "omni:revision-click";

/** pending 修订：suggest 的 quote 高亮 + delete 的删除点锚点 widget */
function buildDecorations(doc: PMNode, chapterId: string | null): DecorationSet {
  if (!chapterId) return DecorationSet.empty;
  const { revisions, activeRevisionId } = useRevisionStore.getState();
  const pending = revisions.filter(
    (r) => r.chapterId === chapterId && r.status === "pending",
  );
  const suggestSpecs = pending.filter((r) => r.kind === "suggest" && r.quoteBefore);
  const deleteSpecs = pending.filter((r) => r.kind === "delete" && r.textFrom != null);
  if (suggestSpecs.length === 0 && deleteSpecs.length === 0) {
    return DecorationSet.empty;
  }

  const index = buildIndex(doc);
  const decos: Decoration[] = [];

  // AI 建议：原文高亮（接受/拒绝后即清除）
  for (const r of suggestSpecs) {
    const range = locateQuote(index, r.quoteBefore, r.textFrom);
    if (!range) continue;
    const from = flatToPm(index.segs, range[0]);
    const to = flatToPm(index.segs, range[1]);
    if (to <= from) continue;
    decos.push(
      Decoration.inline(from, to, {
        class: `rev-suggest${r.id === activeRevisionId ? " rev-suggest-active" : ""}`,
        "data-revision-id": r.id,
      }),
    );
  }

  // 删除修订：在删除点插入锚点标记（指示此处有一条待处理的删除）
  for (const r of deleteSpecs) {
    const offset = Math.min(Math.max(r.textFrom as number, 0), index.full.length);
    const pmPos = flatToPm(index.segs, offset);
    decos.push(
      Decoration.widget(
        pmPos,
        () => {
          const span = document.createElement("span");
          span.className = `rev-del-anchor${r.id === activeRevisionId ? " rev-del-anchor-active" : ""}`;
          span.setAttribute("data-revision-id", r.id);
          span.title = "此处有一条删除修订（面板中处理）";
          span.textContent = "⊘";
          return span;
        },
        { side: -1 },
      ),
    );
  }
  return DecorationSet.create(doc, decos);
}

/** 按当前章创建修订建议高亮插件（Editor key=chapterId 重建时闭包捕获） */
export function createRevisionHighlight(chapterId: string | null): Extension {
  return Extension.create({
    name: "revisionHighlight",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: REVISION_HIGHLIGHT_KEY,
          state: {
            init: (_config, state) => ({
              decos: buildDecorations(state.doc, chapterId),
            }),
            apply: (tr, old, _oldState, newState) => {
              if (tr.docChanged || tr.getMeta(REVISION_HIGHLIGHT_KEY)) {
                return { decos: buildDecorations(newState.doc, chapterId) };
              }
              return { decos: old.decos.map(tr.mapping, tr.doc) };
            },
          },
          props: {
            decorations: (state) =>
              (REVISION_HIGHLIGHT_KEY.getState(state) as { decos: DecorationSet } | undefined)
                ?.decos,
            handleClickOn: (_view, _pos, node, _nodePos, event) => {
              if (!node) return false;
              const target = (event as MouseEvent).target as HTMLElement;
              const id = target.closest?.("[data-revision-id]")?.getAttribute(
                "data-revision-id",
              );
              if (!id) return false;
              useRevisionStore.getState().setActiveRevisionId(id);
              window.dispatchEvent(
                new CustomEvent(REVISION_CLICK_EVENT, { detail: { revisionId: id } }),
              );
              return true;
            },
          },
        }),
      ];
    },
  });
}
