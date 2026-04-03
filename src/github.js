export async function fetchGitHubContributions(username) {
  try {
    // During local development, this will call the Vite Dev Server which we'll proxy to Vercel/Node or we can just mock it if needed.
    // In production, this will hit the Vercel serverless function.
    const response = await fetch(`/api/contributions?username=${encodeURIComponent(username)}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch contributions');
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching contributions:", error);
    throw error;
  }
}
