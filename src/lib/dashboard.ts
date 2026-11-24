export function moveDay(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekDays(day: string) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  const monday = moveDay(day, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDay(monday, index));
}
