export const formatYen = (value: number) =>
  `${value.toLocaleString("ja-JP")}円`;

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const toNonNegativeInteger = (value: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
};
