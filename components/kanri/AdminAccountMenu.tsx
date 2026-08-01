import { LogOut } from "lucide-react";
import { signOut } from "@/app/account/sign-in/actions";

/**
 * トップバー右端のログイン中ユーザー表示とログアウト。
 * 以前はここに「松澤 覚」が直書きされていた（全社員が同じBasic認証で入っていたため）。
 */
export function AdminAccountMenu({ displayName }: { displayName: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-sm text-white sm:inline">
        {displayName}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          title="ログアウト"
          className="flex items-center gap-1 rounded-[4px] border border-white/40 px-2.5 py-1.5 text-sm text-white/90 hover:bg-white/10"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </form>
    </div>
  );
}
