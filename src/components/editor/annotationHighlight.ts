import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { buildIndex, flatToPm } from "./search";
import { locateQuote } from "./locateText";
import { useAnnotationStore } from "../../stores/annotationStore";

export const ANNOTATION_HIGHLIGHT_KEY = new PluginKey("omniAnnotationHighlight");
/** 点击正文中的批注高亮 → 通知上层滚动到侧栏卡片 */
export const ANNOTATION_CLICK_EVENT = "omni:annotation-click";

interface RangeSpec {
  id: string;
  quote: string;
  textFrom: number | null;
  active: boolean;
  resolved: boolean;
}

function buildDecorations(doc: PMNode, chapterId: string | null): DecorationSet {
  if (!chapterId) return DecorationSet.empty;
  const { annotations, activeId } = useAnnotationStore.getState();
  const specs = annotations
    .filter((a) => a.chapterId === chapterId && a.scope === "text" && a.quote)
    .map<RangeSpec>((a) => ({
      id: a.id,
      quote: a.quote,
      textFrom: a.textFrom,
      active: a.id === activeId,
      resolved: a.status === "resolved",
    }));
  if (specs.length === 0) return DecorationSet.empty;

  const index = buildIndex(doc);
  const decos: Decoration[] = [];
  for (const r of specs) {
    const range = locateQuote(index, r.quote, r.textFrom);
    if (!range) continue;
    const from = flatToPm(index.segs, range[0]);
    const to = flatToPm(index.segs, range[1]);
    if (to <= from) continue;
    const cls = [
      "annotation-hl",
      r.active ? "annotation-hl-active" : "",
      r.resolved ? "annotation-hl-resolved" : "",
    ]
      .filter(Boolean)
      .join(" ");
    decos.push(Decoration.inline(from, to, { class: cls, "data-annotation-id": r.id }));
  }
  return DecorationSet.create(doc, decos);
}

/** 按当前章创建批注高亮插件（Editor key=chapterId 重建，闭包捕获章 id） */
export function createAnnotationHighlight(chapterId: string | null): Extension {
  return Extension.create({
    name: "annotationHighlight",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: ANNOTATION_HIGHLIGHT_KEY,
          state: {
            init: (_config, state) => ({
              decos: buildDecorations(state.doc, chapterId),
            }),
            apply: (tr, old, _oldState, newState) => {
              if (tr.docChanged || tr.getMeta(ANNOTATION_HIGHLIGHT_KEY)) {
                return { decos: buildDecorations(newState.doc, chapterId) };
              }
              return { decos: old.decos.map(tr.mapping, tr.doc) };
            },
          },
          props: {
            decorations: (state) =>
              (ANNOTATION_HIGHLIGHT_KEY.getState(state) as { decos: DecorationSet } | undefined)
                ?.decos,
            handleClickOn: (_view, _pos, node, _nodePos, event) => {
              if (!node) return false;
              const target = (event as MouseEvent).target as HTMLElement;
              const id = target.closest?.("[data-annotation-id]")?.getAttribute(
                "data-annotation-id",
              );
              if (!id) return false;
              useAnnotationStore.getState().setActiveId(id);
              window.dispatchEvent(
                new CustomEvent(ANNOTATION_CLICK_EVENT, { detail: { annotationId: id } }),
              );
              return true;
            },
          },
        }),
      ];
    },
  });
}
