export function FieldSkeleton() {
  const VB_W = 340;
  const VB_H = 520;
  const pulseClasses = 'animate-pulse';

  return (
    <div className="rounded-lg overflow-hidden border border-green-900/30">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full">
        <rect width={VB_W} height={VB_H} rx="6" fill="#2a5a15" />
        <rect x="10" y="10" width={VB_W - 20} height={VB_H - 20} rx="2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={VB_W / 2} y1="10" x2={VB_W / 2} y2={VB_H - 10} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx={VB_W / 2} cy={VB_H / 2} r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {[170, 90, 250, 110, 230].map((x, i) => (
          <g key={`a-${i}`}>
            <circle cx={x} cy={520 - [35, 115, 115, 200, 200][i]} r={18} className={pulseClasses} fill="rgba(59,130,246,0.4)" />
          </g>
        ))}
        {[170, 90, 250, 110, 230].map((x, i) => (
          <g key={`b-${i}`}>
            <circle cx={x} cy={[35, 115, 115, 200, 200][i]} r={18} className={pulseClasses} fill="rgba(239,68,68,0.4)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-gray-300 animate-pulse flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
