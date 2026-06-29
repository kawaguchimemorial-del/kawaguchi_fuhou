"use client";

import { useState } from "react";

// 作成ウィザード（実画面の5ステップ構成を踏襲）
// ① 喪主／故人 → ② 訃報・香典 → ③ 記帳 → ④ 供花・供物 → ⑤ オンライン式場
// TODO(supabase): 最終保存で memorials/deceased/funeral_events/venue 等へINSERT。
//   現状はクライアント状態のみ（保存はalertでダミー）。祭壇画像レイヤーは素材導入後。

const STEPS = ["喪主／故人", "訃報・香典", "記帳", "供花・供物", "オンライン式場"];
const EVENT_TYPES = ["通夜式", "告別式", "葬儀告別式", "一日葬", "お別れの会", "火葬式"];
const FRAMES = ["黒", "黒(リボン)", "白", "白(花)", "グレー", "紫", "ピンク"];
const CENTERS = ["焼香(黒)", "焼香(白)", "線香(1本)", "線香(2本)", "線香(3本)", "花(1)", "花(2)", "非表示"];
const BACKGROUNDS = ["七宝", "菊", "波", "ドレープ(ベージュ)", "ドレープ(ピンク)"];

export function CeremonyWizard({ withVenue, isTest }: { withVenue: boolean; isTest: boolean }) {
  const [step, setStep] = useState(0);
  const last = withVenue ? 4 : 2; // 訃報のみは③まで

  return (
    <div className="mx-auto max-w-3xl">
      {isTest && (
        <p className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">テスト葬儀として作成します（無料）</p>
      )}

      {/* ステッパー */}
      <ol className="mb-8 flex items-center justify-between text-xs">
        {STEPS.slice(0, last + 1).map((s, i) => (
          <li key={s} className="flex flex-1 items-center">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-white " +
                (i <= step ? "bg-[#9b2fae]" : "bg-gray-300")
              }
            >
              {i + 1}
            </span>
            <span className="ml-2 hidden sm:inline">{s}</span>
            {i < last && <span className="mx-2 h-px flex-1 bg-gray-300" />}
          </li>
        ))}
      </ol>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        {step === 0 && <StepMournerDeceased />}
        {step === 1 && <StepObituaryKoden />}
        {step === 2 && <StepGuestbook />}
        {step === 3 && <StepFlowers />}
        {step === 4 && <StepVenue />}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded border px-6 py-2.5 text-sm disabled:opacity-40"
        >
          ← 前に戻る
        </button>
        {step < last ? (
          <button
            onClick={() => setStep((s) => Math.min(last, s + 1))}
            className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white"
          >
            保存して次へ →
          </button>
        ) : (
          <button
            onClick={() => alert("（デモ）保存しました。Supabase接続後に永続化します。")}
            className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white"
          >
            保存して葬儀詳細へ →
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 border-l-4 border-[#9b2fae] pl-2 font-bold">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
function Req() {
  return <span className="ml-1 text-xs text-red-500">必須</span>;
}
function TextField({ label, required, placeholder }: { label: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}{required && <Req />}</span>
      <input placeholder={placeholder} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
    </label>
  );
}
function Choices({ label, options, required }: { label: string; options: string[]; required?: boolean }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}{required && <Req />}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <label key={o} className={"cursor-pointer rounded border px-3 py-1.5 text-sm " + (i === 0 ? "border-[#9b2fae] bg-[#f3e9f6]" : "")}>
            <input type="radio" name={label} defaultChecked={i === 0} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function StepMournerDeceased() {
  return (
    <>
      <Section title="喪主">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="姓" required />
          <TextField label="名" required />
          <TextField label="セイ" required />
          <TextField label="メイ" required />
        </div>
      </Section>
      <Section title="喪主管理画面ログインIDの発行">
        <p className="text-xs text-gray-500">※オンライン香典を受け付ける場合、ここの電話/メール宛に口座情報の連絡を行います。</p>
        <Choices label="発行方法" options={["自動IDで発行（電話番号）", "喪主メールアドレスで発行"]} />
        <TextField label="電話番号（ハイフンなし）/ メールアドレス" />
      </Section>
      <Section title="故人">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="姓" required />
          <TextField label="名" required />
          <TextField label="セイ" required />
          <TextField label="メイ" required />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <TextField label="没年月日" />
          <TextField label="没時間" />
          <TextField label="享年" />
          <TextField label="喪主との続柄" placeholder="父" />
        </div>
      </Section>
    </>
  );
}

function StepObituaryKoden() {
  return (
    <>
      <Section title="訃報案内">
        <TextField label="訃報タイトル" placeholder="訃報" />
        <label className="block">
          <span className="text-sm text-gray-600">訃報文（500字以内）</span>
          <textarea rows={5} className="mt-1 w-full rounded border p-3 focus:border-[#9b2fae] focus:outline-none" />
        </label>
        <TextField label="訃報を案内される喪主名" required />
        <Choices label="喪式形式" options={["仏式", "神式", "キリスト教式", "無宗教"]} />
      </Section>
      <Section title="式1">
        <Choices label="式名" options={EVENT_TYPES} required />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> 日程調整中</label>
        <div className="grid grid-cols-3 gap-4">
          <TextField label="式日" /><TextField label="開始時刻" /><TextField label="終了時刻" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> 場所調整中</label>
        <TextField label="場所（会館・ホール）" />
        <TextField label="住所（郵便番号で検索）" />
      </Section>
      <Section title="式2（任意・最大5式まで）">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> 場所はひとつ前の式情報と同じ</label>
        <Choices label="式名" options={EVENT_TYPES} />
      </Section>
      <Section title="香典決済オプション">
        <p className="text-xs text-gray-500">喪主の口座設定完了後、初回香典受付から30日後に受付終了します。</p>
        <Choices label="香典決済" options={["不要", "必要"]} required />
        <Choices label="返礼品" options={["不要", "必要"]} required />
      </Section>
    </>
  );
}

function StepGuestbook() {
  return (
    <Section title="記帳設定">
      <Choices label="ご記帳（芳名録）" options={["受け付ける", "受け付けない"]} />
      <Choices label="メッセージ・写真の受付" options={["承認後に公開", "受け付けない"]} />
      <p className="text-xs text-gray-500">※ お悔やみメッセージは既定で承認制（公開前にご遺族が確認）。</p>
    </Section>
  );
}

function StepFlowers() {
  return (
    <Section title="供花・供物">
      <Choices label="供花・供物の受付" options={["受け付ける", "受け付けない"]} />
      <TextField label="供花 受付終了日時" />
      <TextField label="供物 受付終了日時" />
      <p className="text-xs text-gray-500">※ 商品マスタは「設定 › 供花・供物の設定・商品登録」で管理します。</p>
    </Section>
  );
}

function StepVenue() {
  return (
    <>
      <Section title="オンライン式名">
        <TextField label="オンライン式名" required placeholder="故 〇〇 儀 葬儀会場" />
      </Section>
      <Section title="オンライン式場挨拶文">
        <TextField label="見出し" required placeholder="喪主挨拶" />
        <label className="block">
          <span className="text-sm text-gray-600">挨拶文<Req /></span>
          <textarea rows={5} className="mt-1 w-full rounded border p-3 focus:border-[#9b2fae] focus:outline-none" />
        </label>
        <TextField label="挨拶文右下の喪主名" required />
      </Section>
      <Section title="公開日時">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> 喪主の同意後、すぐに公開する</label>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="公開開始" /><TextField label="公開期間（1〜60日）" placeholder="60" />
        </div>
      </Section>
      <Section title="入場画面の表示・入力制御">
        <Choices label="管理番号" options={["不要", "必要"]} />
        <Choices label="参列者名" options={["不要", "必要"]} />
        <Choices label="供花供物/贈答品の表示" options={["表示しない", "表示する"]} />
      </Section>
      <Section title="祭壇設定（レイヤー）">
        <p className="text-xs text-gray-500">※ 遺影写真と各レイヤーの画像素材は最後にまとめて差し込みます。</p>
        <Choices label="額縁" options={FRAMES} required />
        <Choices label="花飾り（左右）" options={["黒", "白", "花(1)", "花(2)"]} required />
        <Choices label="祭壇（中央）" options={CENTERS} required />
        <Choices label="天板" options={["黒", "木目"]} required />
        <Choices label="背景" options={BACKGROUNDS} required />
      </Section>
    </>
  );
}
