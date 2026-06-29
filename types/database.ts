// このファイルは後で `npm run db:types`（supabase gen types）で自動生成に置き換える。
// それまでの仮の型定義。
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
