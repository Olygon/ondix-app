export function parsePageParam(value: string) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}
