// eslint-config-next@16 は ESLint 9 のフラット設定をそのままエクスポートするため、
// FlatCompat（eslintrc 互換レイヤー）を通す必要がない。
// 互換レイヤー経由だと eslint-plugin-react の循環参照を JSON.stringify できず、
// 設定の検証段階で "Converting circular structure to JSON" になり lint が起動しない。
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "supabase/**",
      "tmp/**",
      "scripts/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Pages Router 用のルール。本リポジトリに pages/ は無く、
      // Excel出力などの Route Handler へのダウンロードリンクを誤検出する。
      // それらは <Link> にすると遷移扱いになりダウンロードが壊れるため、素の <a> が正しい。
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
