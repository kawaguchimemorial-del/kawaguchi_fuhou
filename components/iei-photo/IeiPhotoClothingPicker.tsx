"use client";

import Image from "next/image";
import {
  IEI_PHOTO_CLOTHING_CATEGORY_LABELS,
  IEI_PHOTO_CLOTHING_CATEGORY_ORDER,
  IEI_PHOTO_CLOTHING_GENDER_LABELS,
  clothingItemsByGender,
  clothingSampleUrl,
  type IeiPhotoClothingGender,
} from "@/lib/iei-photo/clothing";

/**
 * 服装の選択。以前は文字のボタンだけで、選んだ結果がどんな服になるか分からなかったため、
 * 実際に着せ替える服の見本写真から選ぶ形にした。
 * 見本は「頭部の無いトルソーに着せた服」で、生成時にこの画像そのものをAIへ渡す。
 */
export function IeiPhotoClothingPicker({
  gender,
  onChangeGender,
  value,
  onChange,
  disabled,
}: {
  gender: IeiPhotoClothingGender;
  onChangeGender: (g: IeiPhotoClothingGender) => void;
  /** 選択中の見本ID。null は「服装はそのまま」。 */
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const items = clothingItemsByGender(gender);

  return (
    <div>
      {/* 男性 / 女性。見本の一覧を切り替えるだけで、生成時の指示には使わない。 */}
      <div className="mb-3 flex gap-2">
        {(["male", "female"] as IeiPhotoClothingGender[]).map((g) => (
          <button
            key={g}
            type="button"
            disabled={disabled}
            onClick={() => onChangeGender(g)}
            aria-pressed={gender === g}
            className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              gender === g
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-stone-300 bg-white text-slate-600 hover:bg-stone-100"
            }`}
          >
            {IEI_PHOTO_CLOTHING_GENDER_LABELS[g]}
          </button>
        ))}
      </div>

      {/* そのまま（着せ替えない） */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`mb-3 w-full rounded-md border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          value === null
            ? "border-amber-600 bg-amber-50 text-amber-800"
            : "border-stone-300 bg-white text-slate-600 hover:bg-stone-100"
        }`}
      >
        服装はそのまま（着せ替えない）
      </button>

      {IEI_PHOTO_CLOTHING_CATEGORY_ORDER.map((category) => {
        const inCategory = items.filter((i) => i.category === category);
        if (!inCategory.length) return null;
        return (
          <div key={category} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
              {IEI_PHOTO_CLOTHING_CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {inCategory.map((item) => {
                const selected = value === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(item.id)}
                    aria-pressed={selected}
                    title={item.label}
                    className={`overflow-hidden rounded-md border bg-white text-left transition disabled:opacity-50 ${
                      selected
                        ? "border-amber-600 ring-2 ring-amber-400"
                        : "border-stone-300 hover:border-stone-400"
                    }`}
                  >
                    <Image
                      src={clothingSampleUrl(item.id)}
                      alt={item.label}
                      width={512}
                      height={512}
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block truncate px-1.5 py-1 text-[10px] text-slate-600">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
