// "use server" ファイルは async 関数以外を export できないため、
// フォーム状態の型と定数はこちらに置く。

export type ActionState = { error?: string; ok?: string };

/** 葬儀の写真・アルバムそれぞれの登録上限 */
export const MAX_PHOTOS = 30;
