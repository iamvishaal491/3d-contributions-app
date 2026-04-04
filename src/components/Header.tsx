import React from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
  username: string;
  setUsername: (value: string) => void;
  theme: string;
  setTheme: (value: string) => void;
  onVisualize: () => void;
}

export function Header({
  username,
  setUsername,
  theme,
  setTheme,
  onVisualize
}: HeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-6xl mx-auto px-6 pt-12 pb-8 pointer-events-auto"
    >
      <h1
        className="text-5xl md:text-6xl font-bold text-white mb-12 tracking-tight"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        3D GitHub Contributions
      </h1>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="GitHub username"
          className="flex-1 bg-black text-white border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        />

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-black text-white border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors cursor-pointer"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <option value="isometric">Isometric</option>
          <option value="classic">Classic 3D</option>
          <option value="skyline">Skyline City</option>
        </select>

        <button
          onClick={onVisualize}
          className="bg-white text-black px-8 py-3 text-sm font-semibold hover:bg-white/90 transition-all active:scale-95"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Visualize
        </button>
      </div>
    </motion.div>
  );
}
