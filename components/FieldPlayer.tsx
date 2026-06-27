'use client';

import { motion } from 'framer-motion';
import { useAvatar } from '@/hooks/use-avatar';
import type { FieldPlayer as FieldPlayerType } from '@/hooks/use-match';

const VB_W = 340;
const VB_H = 520;
const RADIUS = 18;

interface FieldPlayerProps {
  player: FieldPlayerType;
  isMe: boolean;
  onClick: (player: FieldPlayerType) => void;
}

export function FieldPlayerCircle({ player, isMe, onClick }: FieldPlayerProps) {
  const { getAvatarUrl } = useAvatar(undefined);
  const [cx, cy] = player.pos;
  const avatarUrl = getAvatarUrl(player.avatarUrl, 36);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      whileHover={{ scale: isMe ? 1 : 1.08 }}
      whileTap={{ scale: isMe ? 1 : 0.95 }}
      onClick={() => !isMe && onClick(player)}
      style={{ cursor: isMe ? 'not-allowed' : 'pointer' }}
    >
      <defs>
        <radialGradient id={`gradA-${player.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.9)" />
          <stop offset="100%" stopColor="rgba(29,78,216,0.7)" />
        </radialGradient>
        <radialGradient id={`gradB-${player.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(239,68,68,0.9)" />
          <stop offset="100%" stopColor="rgba(185,28,28,0.7)" />
        </radialGradient>
        <radialGradient id={`gradMe-${player.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(156,163,175,0.9)" />
          <stop offset="100%" stopColor="rgba(107,114,128,0.7)" />
        </radialGradient>
      </defs>

      {/* Shadow */}
      <circle cx={cx} cy={cy + 1} r={RADIUS} fill="rgba(0,0,0,0.2)" />

      {/* Main circle with glass effect */}
      <circle
        cx={cx}
        cy={cy}
        r={RADIUS}
        fill={
          isMe
            ? `url(#gradMe-${player.id})`
            : player.team === 'A'
              ? `url(#gradA-${player.id})`
              : `url(#gradB-${player.id})`
        }
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
      />

      {/* Inner glass highlight */}
      <circle cx={cx} cy={cy} r={RADIUS - 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Avatar or initials */}
      {avatarUrl ? (
        <>
          <defs>
            <clipPath id={`clip-${player.id}`}>
              <circle cx={cx} cy={cy} r={RADIUS - 3} />
            </clipPath>
          </defs>
          <image
            href={avatarUrl}
            x={cx - RADIUS + 3}
            y={cy - RADIUS + 3}
            width={(RADIUS - 3) * 2}
            height={(RADIUS - 3) * 2}
            clipPath={`url(#clip-${player.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={11}
          fontWeight="bold"
          style={{ textTransform: 'uppercase' }}
        >
          {player.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </text>
      )}

      {/* MVP star */}
      {player.mvp && (
        <text x={cx + RADIUS - 2} y={cy - RADIUS + 4} textAnchor="middle" dominantBaseline="middle" fontSize={12}>
          ⭐
        </text>
      )}

      {/* Name label */}
      <text x={cx} y={cy + RADIUS + 12} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} fontWeight="500" className="drop-shadow-sm">
        {player.name.split(' ')[0]}
      </text>

      {/* Match goals badge (below name) */}
      {player.goals > 0 && (
        <text x={cx} y={cy + RADIUS + 22} textAnchor="middle" dominantBaseline="middle" fill="#FFD700" fontSize={8} fontWeight="bold" className="drop-shadow">
          ⚽{player.goals}
        </text>
      )}

      {/* Score badge (top) */}
      {player.score !== null && (
        <>
          <rect x={cx - 12} y={cy - RADIUS - 14} width={24} height={14} rx={7} fill="rgba(255,255,255,0.95)" />
          <text x={cx} y={cy - RADIUS - 5} textAnchor="middle" dominantBaseline="middle" fill="#111" fontSize={10} fontWeight="bold">
            {player.score}
          </text>
        </>
      )}
    </motion.g>
  );
}
