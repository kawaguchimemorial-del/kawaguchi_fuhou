// {{変数}} 記法のテンプレート展開。
// 例: render("故 {{故人名}} 儀", { 故人名: "山田 哲夫" }) → "故 山田 哲夫 儀"
// 未定義の変数は空文字に置換（誤って {{}} が残らないように）。
export function render(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const v = vars[key.trim()];
    return v == null ? "" : v;
  });
}

/** テンプレート内で使われている変数名の一覧を抽出 */
export function extractVars(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) set.add(m[1].trim());
  return [...set];
}
