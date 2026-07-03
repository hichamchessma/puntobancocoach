/** Jeton de casino (disque avec liseré). */
export function Chip({ value, color, size = 50 }: { value: number; color: string; size?: number }) {
  const label = value >= 1000 ? `${value / 1000}k` : String(value);
  return (
    <span
      className="chip"
      style={{ ['--chip' as string]: color, width: size, height: size, fontSize: size * 0.3 }}
    >
      <span className="chip-val">{label}</span>
    </span>
  );
}

export const CHIP_PALETTE = ['#2f9e6f', '#3b76d8', '#d8433b', '#8a4fd0', '#d0a53a', '#2b2f3a'];
