// generate-calendar.js
// Completely Isolated Isometric SVG Graphic Pipeline.
// Run natively with Node.js 18+

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_REPOSITORY_OWNER || 'iamvishaal491';

// Theme Constants
const COLOR_LEVELS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']; // Top faces
const COLOR_LEFT =   ['#d1d5da', '#7dd88f', '#2fb353', '#238a42', '#18592d']; // Shaded left faces
const COLOR_RIGHT =  ['#e1e4e8', '#8ce29d', '#3bc95c', '#299648', '#1c6333']; // Lightly shaded right faces

const CUBE_SIZE = 12;
const MAX_HEIGHT_SCALE = 4;
const DX = CUBE_SIZE * Math.cos(Math.PI / 6); // ~10.392
const DY = CUBE_SIZE * Math.sin(Math.PI / 6); // ~6.0

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'isometric-calendar.svg');

async function fetchContributions() {
  console.log(`[+] Fetching contributions for user: ${USERNAME}`);
  const query = `
    query {
      user(login: "${USERNAME}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No body');
    throw new Error(`GitHub API HTTP error! status: ${response.status} (${response.statusText}). Body: ${errorBody}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GitHub API GraphQL Error: ${data.errors.map(err => err.message).join(', ')}`);
  }

  if (!data.data || !data.data.user) {
    throw new Error(`User "${USERNAME}" not found or data unreachable. Check your GITHUB_TOKEN permissions.`);
  }

  return data.data.user.contributionsCollection.contributionCalendar;
}

function getTier(count, maxCount) {
  if (count === 0) return 0;
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  if (ratio > 0.75) return 4;
  if (ratio > 0.50) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function buildSVG(calendar) {
  const weeks = calendar.weeks;
  
  let maxCount = 0;
  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      if (day.contributionCount > maxCount) maxCount = day.contributionCount;
    });
  });

  const svgElements = [];
  
  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      const tier = getTier(day.contributionCount, maxCount);
      const xOffset = wIndex - weeks.length / 2;
      const yOffset = dIndex - 3.5;
      
      const isoX = parseFloat(((xOffset - yOffset) * DX).toFixed(2));
      const isoY = parseFloat(((xOffset + yOffset) * DY).toFixed(2));
      
      let rawHeight = 2;
      if (day.contributionCount > 0) {
        const ratio = Math.log(day.contributionCount + 1) / Math.log(maxCount + 1);
        rawHeight = parseFloat((2 + (ratio * MAX_HEIGHT_SCALE * 14)).toFixed(2));
      }

      const topPts = [
        `${isoX},${(isoY - rawHeight).toFixed(2)}`,
        `${(isoX + DX).toFixed(2)},${(isoY + DY - rawHeight).toFixed(2)}`,
        `${isoX.toFixed(2)},${(isoY + 2 * DY - rawHeight).toFixed(2)}`,
        `${(isoX - DX).toFixed(2)},${(isoY + DY - rawHeight).toFixed(2)}`
      ].join(' ');

      const leftPts = [
        `${(isoX - DX).toFixed(2)},${(isoY + DY - rawHeight).toFixed(2)}`,
        `${isoX.toFixed(2)},${(isoY + 2 * DY - rawHeight).toFixed(2)}`,
        `${isoX.toFixed(2)},${(isoY + 2 * DY).toFixed(2)}`,
        `${(isoX - DX).toFixed(2)},${(isoY + DY).toFixed(2)}`
      ].join(' ');

      const rightPts = [
        `${isoX.toFixed(2)},${(isoY + 2 * DY - rawHeight).toFixed(2)}`,
        `${(isoX + DX).toFixed(2)},${(isoY + DY - rawHeight).toFixed(2)}`,
        `${(isoX + DX).toFixed(2)},${(isoY + DY).toFixed(2)}`,
        `${isoX.toFixed(2)},${(isoY + 2 * DY).toFixed(2)}`
      ].join(' ');

      svgElements.push(`<g id="day-${day.date}">
<polygon points="${leftPts}" fill="${COLOR_LEFT[tier]}" stroke="${COLOR_LEFT[tier]}" stroke-width="0.1"/>
<polygon points="${rightPts}" fill="${COLOR_RIGHT[tier]}" stroke="${COLOR_RIGHT[tier]}" stroke-width="0.1"/>
<polygon points="${topPts}" fill="${COLOR_LEVELS[tier]}" stroke="${COLOR_LEVELS[tier]}" stroke-width="0.1"/>
</g>`);
    });
  });

  const boundingW = Math.ceil(DX * (weeks.length + 8));
  const boundingH = Math.ceil(DY * (weeks.length + 8) + (MAX_HEIGHT_SCALE * 14) + 50);

  const vBoxX = Math.floor(-boundingW / 2);
  const vBoxY = Math.floor(-boundingH / 2 - 10);

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vBoxX} ${vBoxY} ${boundingW} ${boundingH}" width="${boundingW}" height="${boundingH}">`;
  const bg = `<rect x="${vBoxX}" y="${vBoxY}" width="${boundingW}" height="${boundingH}" fill="transparent"/>`;
  const svgClose = '</svg>';
  
  return [xmlHeader, svgOpen, bg, ...svgElements, svgClose].join('\n');
}

async function main() {
  console.log('[+] Starting 3D Isometric SVG Generation...');
  
  if (!GITHUB_TOKEN || GITHUB_TOKEN.trim() === "") {
    console.error('[-] CRITICAL ERROR: GITHUB_TOKEN environment variable is MISSING or EMPTY.');
    console.error('[!] Ensure you added "VERCEL_TOKEN" to your GitHub Repository Secrets.');
    process.exit(1);
  } else {
    console.log(`[+] Token found (Length: ${GITHUB_TOKEN.length} chars)`);
  }

  try {
    const calendar = await fetchContributions();
    console.log(`[+] Successfully fetched calendar. Total contributions: ${calendar.totalContributions}`);
    
    const svgGrid = buildSVG(calendar);
    
    if (!fs.existsSync(OUTPUT_DIR)){
        console.log(`[+] Creating output directory: ${OUTPUT_DIR}`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, svgGrid);
    console.log(`[+] Successfully wrote SVG graphic to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('[-] ❌ PROCESS FAILED ❌');
    console.error('[-] Error Message:', err.message);
    if (err.stack) {
        console.error('[-] Stack Trace:', err.stack);
    }
    process.exit(1);
  }
}

main();
