"use client";
import { useEffect, useState } from "react";
import { EstimateCreateForm, type FormInitial } from "./EstimateCreateForm";
import type { Product, ProductSet } from "@/lib/kanri/products";
import type { MasterItem } from "@/lib/kanri/master-defs";

const INTAKE_KEY = "estimate_intake_v1";

type Props = {
  products: Product[];
  productSets: ProductSet[];
  osonae: MasterItem[];
  discounts: MasterItem[];
  purposes: MasterItem[];
  templates: MasterItem[];
};

// お客様入力(intake)画面から sessionStorage 経由で渡された内容をプリフィルして見積もり作成フォームを表示する。
// hydration不整合を避けるため、effectでsessionStorageを読み終えてからフォームをマウントする。
export function EstimateCreateWithIntake(props: Props) {
  const [initial, setInitial] = useState<FormInitial | undefined>(undefined);
  const [ready, setReady] = useState(false);
  // sessionStorage の読み出しと「一度使ったら消す」という副作用はレンダー中に行えず、
  // サーバー描画時にも読めない。初期描画後に一度だけ反映するのが正しい。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(INTAKE_KEY);
      if (raw) {
        sessionStorage.removeItem(INTAKE_KEY); // 一度使ったら消す（次の新規作成に持ち越さない）
        setInitial(JSON.parse(raw) as FormInitial);
      }
    } catch {
      /* noop */
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ready) return <div className="py-16 text-center text-sm text-gray-400">読み込み中…</div>;
  return <EstimateCreateForm initial={initial} {...props} />;
}
