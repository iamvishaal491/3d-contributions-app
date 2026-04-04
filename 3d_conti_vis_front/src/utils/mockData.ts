export function generateMockContributions(): number[][] {
  const weeks = 52;
  const daysPerWeek = 7;
  const data: number[][] = [];

  for (let week = 0; week < weeks; week++) {
    const weekData: number[] = [];
    for (let day = 0; day < daysPerWeek; day++) {
      // Create realistic patterns: more activity on weekdays, occasional bursts
      const isWeekend = day === 0 || day === 6;
      const baseActivity = isWeekend ? 0.3 : 0.7;

      // Add some randomness and occasional high-activity days
      const random = Math.random();
      let contributions = 0;

      if (random < 0.2) {
        contributions = 0; // 20% chance of no contributions
      } else if (random < 0.5) {
        contributions = Math.floor(Math.random() * 3 * baseActivity); // Low activity
      } else if (random < 0.8) {
        contributions = Math.floor(Math.random() * 6 * baseActivity) + 3; // Medium activity
      } else if (random < 0.95) {
        contributions = Math.floor(Math.random() * 5 * baseActivity) + 6; // High activity
      } else {
        contributions = Math.floor(Math.random() * 8) + 10; // Very high activity (burst days)
      }

      weekData.push(contributions);
    }
    data.push(weekData);
  }

  return data;
}

export function calculateStats(data: number[][]) {
  let total = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let highestDay = 0;

  const flatData: number[] = [];

  data.forEach((week) => {
    week.forEach((count) => {
      flatData.push(count);
      total += count;
      highestDay = Math.max(highestDay, count);

      if (count > 0) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
  });

  const average = total / flatData.length;

  return {
    total,
    bestStreak,
    highestDay,
    average
  };
}