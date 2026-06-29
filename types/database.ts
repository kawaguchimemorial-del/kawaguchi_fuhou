// このファイルは後で `npm run db:types`（supabase gen types）で自動生成に置き換える。
// それまでの最小型定義。RPC等は手動で追加。
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      get_public_obituary: {
        Args: { p_slug: string };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
  };
};
