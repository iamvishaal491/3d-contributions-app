# Interactive 3D GitHub Contribution Visualizer

A stunning 3D visualization of your GitHub contributions, rendered using Three.js and powered by the GitHub GraphQL API. Built with Vite and deeply compatible with Vercel deployment constraints.

## Features
- **True 3D Representation:** Contributions turned into beautiful stylized 3D cubes.
- **Glassmorphism UI:** Clean dark mode UI overlays.
- **Interactive:** Draggable camera (OrbitControls), interactive tooltips to view each day's exact contribution count.
- **Secure Backend:** Implements a Vercel Serverless function to proxy requests, securely keeping your Personal Access Token away from the client browser.

## Running Locally

To run this application locally, you will need a GitHub Personal Access Token (PAT). 
You only need `read:user` permissions.

1. **Install Vercel CLI**
   We use `vercel dev` so that our `/api` Serverless Functions work in tandem with the Vite frontend.
   ```bash
   npm install -g vercel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set Environment Variables**
   Create a `.env` file in the root directory:
   ```bash
   GITHUB_TOKEN=your_personal_access_token_here
   ```

4. **Launch Dev Server**
   ```bash
   vercel dev
   ```

## Deploying to Vercel

1. Create a GitHub repository and push your code.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your GitHub repository.
4. **Environment Variables:** In the Vercel project configuration, add your token:
   - Name: `GITHUB_TOKEN`
   - Value: `ghp_xxxxxx...`
5. Click **Deploy**. Vercel will automatically detect the Vite setup and build the frontend, and it will deploy `/api/contributions.js` as an edge function.

## Embedding in GitHub Profile README

Once deployed, you can add a link to this visualizer in your GitHub Profile (`username/username`) repository's `README.md`.

```markdown
## 📫 Check out my 3D Contributions
[![View 3D Contributions](https://img.shields.io/badge/View_3D-GitHub_Contributions-4ade80?style=for-the-badge&logo=threedotjs&logoColor=white)](https://your-vercel-deployment-url.vercel.app/)
```

### Note on Previews
Because this application relies on WebGL (Three.js), it requires an interactive browser session and cannot be embedded purely as an image in Markdown without an iframe (which GitHub does not allow). Thus, using a polished link button is the best method to drive traffic.
