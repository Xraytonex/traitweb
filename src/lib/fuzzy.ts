export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 100 - t.length;
  const wordStart = t.split(/[\s'.-]+/).some((w) => w.startsWith(q));
  if (wordStart) return 80 - t.length;
  if (t.includes(q)) return 60 - t.indexOf(q);

  let ti = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (ti === -1) return -1;
    ti += 1;
  }
  return 20 - t.length;
}

export function fuzzyFilter<T>(query: string, items: T[], getName: (item: T) => string): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(query.trim(), getName(item)) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
