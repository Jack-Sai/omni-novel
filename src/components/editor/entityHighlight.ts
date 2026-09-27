import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useWorldviewStore } from "../../stores/worldviewStore";
import { useForeshadowingStore } from "../../stores/foreshadowingStore";
import { useProjectStore } from "../../stores/projectStore";
import { useSettingsStore } from "../../stores/settingsStore";

export const ENTITY_HIGHLIGHT_KEY = new PluginKey("entityHighlight");

type EntityKind = "location" | "foreshadow";

interface Target {
  text: string;
  kind: EntityKind;
}

const KIND_CLASS: Record<EntityKind, string> = {
  location: "entity-hl entity-hl-location",
  foreshadow: "entity-hl entity-hl-foreshadow",
};

/** 收集地点名与伏笔名（长度 ≥ 2，按长度降序避免短词抢占） */
function collectTargets(): Target[] {
  const { editor } = useSettingsStore.getState();
  const { currentProject } = useProjectStore.getState();
  if (!currentProject) return [];
  const targets: Target[] = [];

  if (editor.highlightLocations) {
    const { items } = useWorldviewStore.getState();
    for (const it of items) {
      if (it.projectId !== currentProject.id || it.type !== "location") continue;
      if (it.name.trim().length >= 2) targets.push({ text: it.name.trim(), kind: "location" });
    }
  }
  if (editor.highlightForeshadowing) {
    const { items } = useForeshadowingStore.getState();
    for (const f of items) {
      if (f.projectId !== currentProject.id) continue;
      if (f.name.trim().length >= 2) targets.push({ text: f.name.trim(), kind: "foreshadow" });
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
            class: KIND_CLASS[t.kind],
          }),
        );
      }
    }
  });
  return DecorationSet.create(doc, decos);
}

/** 地点 / 伏笔高亮（开关在设置-外观，人物、地点、伏笔三类实体高亮共存） */
export const EntityHighlight = Extension.create({
  name: "entityHighlight",

  addProseMirrorPlugins() {
    const key = ENTITY_HIGHLIGHT_KEY;
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
        },
      }),
    ];
  },
});
