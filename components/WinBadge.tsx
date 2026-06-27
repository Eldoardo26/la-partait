interface WinBadgeProps {
  percentage: number | null;
  size?: 'sm' | 'md';
}

export function WinBadge({ percentage, size = 'sm' }: WinBadgeProps) {
  if (percentage === null || percentage === undefined) {
    return (
      <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-500 font-medium ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}`}>
        —
      </span>
    );
  }

  const color =
    percentage >= 60
      ? 'bg-emerald-100 text-emerald-700'
      : percentage >= 40
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${color} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}`}>
      <span className="text-[10px]">🏆</span>
      {percentage}%
    </span>
  );
}
