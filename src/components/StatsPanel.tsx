import React from 'react';
import { motion } from 'framer-motion';

interface StatsPanelProps {
  total: number;
  bestStreak: number;
  highestDay: number;
  average: number;
}

export function StatsPanel({
  total,
  bestStreak,
  highestDay,
  average
}: StatsPanelProps) {
  const stats = [
    { label: 'Total', value: total.toLocaleString() },
    { label: 'Best Streak', value: `${bestStreak} days` },
    { label: 'Highest Day', value: highestDay.toLocaleString() },
    { label: 'Average', value: average.toFixed(2) }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-black/80 backdrop-blur-md border border-white/20 p-4 md:p-5 w-full lg:w-52 pointer-events-auto shadow-2xl"
    >
      <h2
        className="text-xs font-bold text-white/50 mb-4 tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        STATS
      </h2>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
            className="flex flex-col border-b border-white/5 pb-2 last:border-0"
          >
            <span
              className="text-[10px] text-white/30 uppercase tracking-widest mb-1"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {stat.label}
            </span>
            <span
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
