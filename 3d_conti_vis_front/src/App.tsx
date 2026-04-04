import React, { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { ContributionGrid } from './components/ContributionGrid';
import { StatsPanel } from './components/StatsPanel';
import { generateMockContributions, calculateStats } from './utils/mockData';
export function App() {
  const [username, setUsername] = useState('iamvishaal491');
  const [theme, setTheme] = useState('isometric');
  const [visualizing, setVisualizing] = useState(false);
  const contributionData = useMemo(() => generateMockContributions(), []);
  const stats = useMemo(
    () => calculateStats(contributionData),
    [contributionData]
  );
  const handleVisualize = () => {
    setVisualizing(true);
  };
  return (
    <div className="w-full min-h-screen bg-black">
      <Header
        username={username}
        setUsername={setUsername}
        theme={theme}
        setTheme={setTheme}
        onVisualize={handleVisualize} />
      

      {visualizing &&
      <div className="w-full max-w-7xl mx-auto px-6 pb-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 w-full">
              <ContributionGrid data={contributionData} />
            </div>

            <div className="w-full lg:w-80 shrink-0">
              <StatsPanel
              total={stats.total}
              bestStreak={stats.bestStreak}
              highestDay={stats.highestDay}
              average={stats.average} />
            
            </div>
          </div>
        </div>
      }

      {!visualizing &&
      <div className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
          <p
          className="text-white/40 text-lg"
          style={{
            fontFamily: 'var(--font-mono)'
          }}>
          
            Enter a username and click Visualize to see the contribution graph
          </p>
        </div>
      }
    </div>);

}