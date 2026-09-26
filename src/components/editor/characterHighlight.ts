import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { useSettingsStore } from "../../stores/settingsStore";

export const CHARACTER_HIGHLIGHT_KEY = new PluginKey("characterHighlight");

/** 点击高亮的人名时通过 CustomEvent 通知（EditorPage 监听并弹人物卡） */
export const CHAR_HIGHLIGHT_CLICK_EVENT = "omni:char-highlight-click";

const PALETTE = [
  "#4f6ef7",
  "#22a06b",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#64748b",
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

interface Target {
  id: string;
  text: string;
}

/** 收集当前项目人物的姓名与别名（长度 ≥ 2，按长度降序避免短词抢占） */
function collectTargets(): Target[] {
  const { editor } = useSettingsStore.getState();
  if (!editor.highlightNames) return [];
  const { currentProject } = useProjectStore.getState();
  if (!currentProject) return [];
  const { characters } = useCharacterStore.getState();
  const targets: Target[] = [];
  for (const c of characters) {
    if (c.projectId !== currentProject.id) continue;
    if (c.name.trim().length >= 2) targets.push({ id: c.id, text: c.name.trim() });
    for (const a of c.aliases) {
      const alias = a.trim();
      if (alias.length >= 2) targets.push({ id: c.id, text: alias });
    }
  }
  targets.sort((a, b) => b.text.length - a.text.length);
  return targets;
}

function buildDecorations(doc: PMNode): DecorationSet {
  const targets = collectTargets();
  if (targets.length === 0) return DecorationSet.empty;

  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    const occupied: [number, number][] = [];
    for (const t of targets) {
      let from = 0;
      for (;;) {
        const idx = text.indexOf(t.text, from);
        if (idx === -1) break;
        const start = idx;
        const end = idx + t.text.length;
        from = end;
        if (occupied.some(([s, e]) => start < e && end > s)) continue;
        occupied.push([start, end]);
        decos.push(
          Decoration.inline(pos + start, pos + end, {
            class: "char-hl",
            "data-character-id": t.id,
            style: `--char-hl-color:${hashColor(t.id)}`,
          }),
        );
      }
    }
  });
  return DecorationSet.create(doc, decos);
}

export const CharacterHighlight = Extension.create({
  name: "characterHighlight",

  addProseMirrorPlugins() {
    const key = CHARACTER_HIGHLIGHT_KEY;
    return [
      new Plugin({
        key,
        state: {
          init: (_, state) => buildDecorations(state.doc),
          apply: (tr, old, _oldState, newState) => {
            if (tr.docChanged || tr.getMeta(key)) {
              return buildDecorations(newState.doc);
            }
            return old.map(tr.mapping, newState.doc);
          },
        },
        props: {
          decorations(state) {
            return key.getState(state) as DecorationSet;
          },
          handleClickOn(view, pos, _node, _nodePos, event) {
            const set = key.getState(view.state) as DecorationSet | undefined;
            if (!set) return false;
            const found = set.find(pos, pos);
            const hit = found.find((f) => f.spec.attrs?.["data-character-id"]);
            const characterId = hit?.spec.attrs?.["data-character-id"] as string | undefined;
            if (!characterId) return false;
            const mouse = event as MouseEvent;
            window.dispatchEvent(
              new CustomEvent(CHAR_HIGHLIGHT_CLICK_EVENT, {
                detail: {
                  characterId,
                  clientX: mouse.clientX,
                  clientY: mouse.clientY,
                },
              }),
            );
            return true;
          },
        },
      }),
    ];
  },
});
