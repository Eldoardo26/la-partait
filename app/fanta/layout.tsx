'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const tabs = [
  { href: '/fanta/pronostici', label: 'Pronostici' },
  { href: '/fanta/schedina', label: 'Schedina' },
];

export default function FantaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Fanta ⚡</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 text-center py-2 text-sm font-semibold rounded-lg transition ${
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="fantaTab"
                  className="absolute inset-0 bg-white shadow-sm rounded-lg border border-gray-200/50"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
