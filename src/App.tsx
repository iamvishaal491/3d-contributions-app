import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { StatsPanel } from './components/StatsPanel';
import { ThreeVisualizer, ThreeVisualizerRef } from './components/ThreeVisualizer';
import { fetchGitHubContributions } from './github';
import { calculateStats } from './utils/stats';

function App() {
  const [username, setUsername] = useState('iamvishaal491');
  const [theme, setTheme] = useState('isometric');
  const [visualizing, setVisualizing] = useState(false);
  const [stats, setStats] = useState({ total: 0, bestStreak: 0, highestDay: 0, average: 0 });
  const [loading, setLoading] = useState(false);
  
  const visualizerRef = useRef<ThreeVisualizerRef>(null);

  const handleVisualize = async () => {
    if (!username.trim()) return;
    
    setLoading(true);
    try {
      const data = await fetchGitHubContributions(username);
      
      // Update Stats
      const computedStats = calculateStats(data);
      setStats(computedStats);
      
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('username', username);
      url.searchParams.set('theme', theme);
      window.history.replaceState({}, '', url);

      // Trigger 3D Build
      if (visualizerRef.current) {
        await visualizerRef.current.setTheme(theme);
        visualizerRef.current.buildGrid(data);
      }
      
      setVisualizing(true);
    } catch (err) {
      console.error('Fetch failed:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to fetch'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (visualizerRef.current) {
      visualizerRef.current.setTheme(newTheme);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-hidden relative">
      {/* 3D Scene Layer */}
      <ThreeVisualizer ref={visualizerRef} theme={theme} />

      {/* UI Overlay Layer - Use fixed inset-0 to guarantee it covers the screen and is on top */}
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col overflow-y-auto">
        <Header
          username={username}
          setUsername={setUsername}
          theme={theme}
          setTheme={handleThemeChange}
          onVisualize={handleVisualize}
        />

        {visualizing && (
          <div className="w-full max-w-6xl mx-auto px-6 pb-12 flex justify-end transition-all duration-700">
            <StatsPanel
              total={stats.total}
              bestStreak={stats.bestStreak}
              highestDay={stats.highestDay}
              average={stats.average}
            />
          </div>
        )}

        {!visualizing && !loading && (
          <div className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
            <p
              className="text-white/40 text-lg"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Enter a username and click Visualize to see the contribution graph
            </p>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white font-mono text-sm tracking-widest uppercase">Fetching Data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
