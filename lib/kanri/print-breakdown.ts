// 見積書/請求書の税率別内訳(区分記載)を生成する共通ヘルパ。
// 8専門家の確定仕様に準拠:
//  - 消費税額は率を掛け直さず「Σ税込 − Σ税抜」で税率グループ単位に1回だけ算出。
//  - 表示する税率行は「対象行が1件以上ある率のみ」(10%も条件付き)。降順。
//  - 8%(軽減税率)は ● マーク。0%は「対象外(不課税)」で消費税0。

export interface BdRow { taxRate: number; amount: number; incTax: number }

// 行確定の税込金額。負数の丸め非対称を避けるため符号退避で四捨五入する。
export function lineIncTax(amount: number, rate: number): number {
  return Math.sign(amount) * Math.round(Math.abs(amount) * (1 + rate));
}

export interface RateGroup { rate: number; exTax: number; incTax: number }

export function groupByRate(rows: BdRow[]): RateGroup[] {
  const m = new Map<number, RateGroup>();
  for (const r of rows) {
    const key = Number(r.taxRate) || 0;
    const g = m.get(key) ?? { rate: key, exTax: 0, incTax: 0 };
    g.exTax += r.amount;
    g.incTax += r.incTax;
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => b.rate - a.rate);
}

export function hasReduced(rows: BdRow[]): boolean {
  return rows.some((r) => Math.abs((Number(r.taxRate) || 0) - 0.08) < 0.005);
}

// 内訳テーブルの <tbody> 中身(税率行群)を生成。yen は「n円」書式の関数。
export function breakdownRows(rows: BdRow[], yen: (n: number) => string): string {
  const groups = groupByRate(rows);
  return groups.map((g) => {
    const isReduced = Math.abs(g.rate - 0.08) < 0.005;
    const isZero = g.rate < 0.005;
    const pct = Math.round(g.rate * 100);
    const label = isZero ? "対象外（不課税）" : `${isReduced ? "● " : ""}${pct}%対象計`;
    const tax = isZero ? 0 : g.incTax - g.exTax;
    return `<tr><td class="c">${label}</td><td class="r">${yen(g.incTax)}</td><td class="r">${yen(tax)}</td></tr>`;
  }).join("");
}
