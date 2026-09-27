import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * 修订标记：pending 的 insert / replace 新文本打此 mark（蓝色下划线高亮）。
 * 接受时 removeMark 转为正文；拒绝时删除文本，mark 随之消失。
 * HTML 存储为 <span data-revision-id="..." data-rev-kind="insert">，重开可恢复。
 */
export const RevisionMark = Mark.create({
  name: "revision",

  addAttributes() {
    return {
      revisionId: { default: null },
      revKind: { default: "insert" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-revision-id]",
        getAttrs: (el) => {
          const id = (el as HTMLElement).getAttribute("data-revision-id");
          if (!id) return false;
          return {
            revisionId: id,
            revKind: (el as HTMLElement).getAttribute("data-rev-kind") ?? "insert",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "rev-hl",
        "data-revision-id": HTMLAttributes.revisionId ?? "",
      }),
      0,
    ];
  },
});
