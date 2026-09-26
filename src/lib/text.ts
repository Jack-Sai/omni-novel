/** HTML/纯文本字数统计：中日韩按字、西文按词 */
export function htmlWordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const matches = text.match(
    /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[a-zA-Z0-9]+/g,
  );
  return matches ? matches.length : 0;
}
