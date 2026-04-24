export function normalizeDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  date.setHours(0, 0, 0, 0);

  return date;
}
