import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export const SEARCH_KEY = new PluginKey("omniSearch");

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchState {
  query: string;
  replaceText: string;
  matches: SearchMatch[];
  /** 当前命中下标，-1 = 无命中 */
  current: number;
  decos: DecorationSet;
}

interface TextSeg {
  docStart: number;
  textStart: number;
  length: number;
}

/** 全文 text node 索引：flat 偏移（所有 text node 拼接，无分隔符）↔ PM 位置 */
function buildIndex(doc: PMNode): { full: string; segs: TextSeg[] } {
  const segs: TextSeg[] = [];
  let text = "";
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segs.push({ docStart: pos, textStart: text.length, length: node.text.length });
      text += node.text;
    }
  });
  return { full: text, segs };
}

function flatToPm(segs: TextSeg[], offset: number): number {
  let lo = 0;
  let hi = segs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = segs[mid];
    if (offset < s.textStart) hi = mid - 1;
    else if (offset >= s.textStart + s.length) lo = mid + 1;
    else return s.docStart + (offset - s.textStart);
  }
  // offset 落在段末（如文本末尾）：取最后一段末尾
  if (segs.length === 0) return 0;
  const last = segs[segs.length - 1];
  if (offset >= last.textStart + last.length) return last.docStart + last.length;
  return segs[0].docStart;
}

function computeMatches(doc: PMNode, query: string): { matches: SearchMatch[]; index: ReturnType<typeof buildIndex> } {
  const index = buildIndex(doc);
  if (!query) return { matches: [], index };
  const matches: SearchMatch[] = [];
  const { full, segs } = index;
  let from = 0;
  for (;;) {
    const idx = full.indexOf(query, from);
    if (idx === -1) break;
    matches.push({ from: flatToPm(segs, idx), to: flatToPm(segs, idx + query.length) });
    from = idx + query.length;
  }
  return { matches, index };
}

function decorate(state: Omit<SearchState, "decos">, doc: PMNode): SearchState {
  const decos = state.matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === state.current ? "search-hit search-hit-current" : "search-hit",
    }),
  );
  return { ...state, decos: DecorationSet.create(doc, decos) };
}

const initialState: SearchState = {
  query: "",
  replaceText: "",
  matches: [],
  current: -1,
  decos: DecorationSet.empty,
};

function normalize(
  s: Pick<SearchState, "query" | "replaceText" | "current">,
  doc: PMNode,
): SearchState {
  const { matches } = computeMatches(doc, s.query);
  let current = s.current;
  if (matches.length === 0) current = -1;
  else current = ((current % matches.length) + matches.length) % matches.length;
  return decorate({ ...s, matches, current }, doc);
}

export const SearchExtension = Extension.create({
  name: "omniSearch",

  addCommands() {
    return {
      setSearchQuery:
        (query: string, replaceText = "") =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const next = normalize(
              { query, replaceText, current: query ? 0 : -1 },
              tr.doc,
            );
            tr.setMeta(SEARCH_KEY, next);
            dispatch(tr);
          }
          return true;
        },

      findNextMatch:
        () =>
        ({ tr, dispatch, state }) => {
          const s = SEARCH_KEY.getState(state) ?? initialState;
          if (!s.matches.length) return false;
          if (dispatch) {
            const current = (s.current + 1) % s.matches.length;
            const m = s.matches[current];
            tr.setMeta(SEARCH_KEY, { ...s, current, decos: undefined });
            tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
            tr.scrollIntoView();
            dispatch(tr);
          }
          return true;
        },

      findPrevMatch:
        () =>
        ({ tr, dispatch, state }) => {
          const s = SEARCH_KEY.getState(state) ?? initialState;
          if (!s.matches.length) return false;
          if (dispatch) {
            const current = (s.current - 1 + s.matches.length) % s.matches.length;
            const m = s.matches[current];
            tr.setMeta(SEARCH_KEY, { ...s, current, decos: undefined });
            tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
            tr.scrollIntoView();
            dispatch(tr);
          }
          return true;
        },

      replaceCurrentMatch:
        () =>
        ({ tr, dispatch, state }) => {
          const s = SEARCH_KEY.getState(state) ?? initialState;
          if (s.current < 0 || !s.matches[s.current]) return false;
          if (dispatch) {
            const m = s.matches[s.current];
            tr.insertText(s.replaceText, m.from, m.to);
            // docChanged → apply 重算 matches；保持 current 指向同一位置（clamped）
            dispatch(tr);
          }
          return true;
        },

      replaceAllMatches:
        () =>
        ({ tr, dispatch, state }) => {
          const s = SEARCH_KEY.getState(state) ?? initialState;
          if (!s.matches.length) return false;
          if (dispatch) {
            // 倒序替换保持位置有效；同一事务 = 单步撤销
            for (let i = s.matches.length - 1; i >= 0; i--) {
              const m = s.matches[i];
              tr.insertText(s.replaceText, m.from, m.to);
            }
            dispatch(tr);
          }
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(SEARCH_KEY, { ...initialState });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const key = SEARCH_KEY;
    return [
      new Plugin<SearchState>({
        key,
        state: {
          init: (_, state) => {
            const { matches } = computeMatches(state.doc, "");
            void matches;
            return initialState;
          },
          apply: (tr, old, _oldState, newState) => {
            const meta = tr.getMeta(key) as Partial<SearchState> | undefined;
            if (meta) {
              const base = {
                query: meta.query !== undefined ? meta.query : old.query,
                replaceText:
                  meta.replaceText !== undefined ? meta.replaceText : old.replaceText,
                current: meta.current !== undefined ? meta.current : old.current,
              };
              return normalize(base, newState.doc);
            }
            if (tr.docChanged) {
              return normalize(
                { query: old.query, replaceText: old.replaceText, current: old.current },
                newState.doc,
              );
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return (key.getState(state) as SearchState | undefined)?.decos;
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    omniSearch: {
      setSearchQuery: (query: string, replaceText?: string) => ReturnType;
      findNextMatch: () => ReturnType;
      findPrevMatch: () => ReturnType;
      replaceCurrentMatch: () => ReturnType;
      replaceAllMatches: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}
