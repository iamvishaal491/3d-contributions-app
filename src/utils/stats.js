export function calculateStats(data) {
  if (!data || !data.weeks) return { total: 0, bestStreak: 0, highestDay: 0, average: 0 };

  let totalCount = 0;
  let maxCount = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let dayCount = 0;

  data.weeks.forEach(week => {
    week.contributionDays?.forEach(day => {
      const count = day.contributionCount;
      totalCount += count;
      dayCount++;
      if (count > maxCount) maxCount = count;

      if (count > 0) {
        currentStreak++;
        if (currentStreak > bestStreak) bestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });
  });

  const average = totalCount / (dayCount || 1);

  return {
    total: totalCount,
    bestStreak: bestStreak,
    highestDay: maxCount,
    average: average
  };
}
