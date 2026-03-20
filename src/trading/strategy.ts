// src/trading/strategy.ts
export function checkSignal(closes: number[]): 'YES' | 'NO' | null {
  if (closes.length < 3) return null;
  
  const last3 = closes.slice(-3);
  
  // 3x UP streak (price > 0.5) -> bet DOWN (NO)
  if (last3.every(p => p > 0.5)) return 'NO';
  
  // 3x DOWN streak (price < 0.5) -> bet UP (YES)
  if (last3.every(p => p < 0.5)) return 'YES';
  
  return null;
}
