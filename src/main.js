import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fetchGitHubContributions } from './github.js';

// --- Global variables ---
let scene, camera, renderer, controls;
let raycaster, mouse;
let cubes = [];
let targetHeights = []; // Used for animation
let hoveredCube = null;

// UI Elements
const form = document.getElementById('search-form');
const input = document.getElementById('username-input');
const btn = document.getElementById('search-btn');
const statusMsg = document.getElementById('status-message');
const tooltip = document.getElementById('tooltip');
const tooltipDate = document.getElementById('tooltip-date');
const tooltipCount = document.getElementById('tooltip-count');

// Basic settings
const CUBE_SIZE = 1;
const GAP = 0.3;
const BASE_HEIGHT = 0.2;
const MAX_HEIGHT_SCALE = 3;

// Clean minimal dark theme
const COLOR_BG = 0x0b0f19;
const COLOR_LOW = new THREE.Color('#102e1c');
const COLOR_HIGH = new THREE.Color('#4ade80');
const COLOR_ACTIVE = new THREE.Color('#ffffff');

init();
animate();

function init() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR_BG);
  scene.fog = new THREE.Fog(COLOR_BG, 20, 100);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 40, 50);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(20, 50, 20);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const backLight = new THREE.DirectionalLight(0x4ade80, 0.3);
  backLight.position.set(-20, 20, -20);
  scene.add(backLight);

  // Raycaster for hover
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  
  form.addEventListener('submit', handleSearch);
}

function showStatus(text, type = 'info') {
  statusMsg.textContent = text;
  statusMsg.className = 'status visible';
  if (type === 'error') {
    statusMsg.style.color = '#ef4444';
  } else {
    statusMsg.style.color = 'var(--text-muted)';
  }
}

async function handleSearch(e) {
  e.preventDefault();
  const username = input.value.trim();
  if (!username) return;

  // UI state
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;
  showStatus(`Fetching data for @${username}...`);

  try {
    const data = await fetchGitHubContributions(username);
    buildGrid(data);
    showStatus(`Showing contributions for @${username}`);
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    btn.innerHTML = 'Visualize';
    btn.disabled = false;
  }
}

function clearGrid() {
  cubes.forEach(cube => {
    cube.geometry.dispose();
    cube.material.dispose();
    scene.remove(cube);
  });
  cubes = [];
  targetHeights = [];
}

function buildGrid(data) {
  clearGrid();

  const weeks = data.weeks;
  const numWeeks = weeks.length;
  const numDays = 7;
  
  // Find max contribution for scaling
  let maxCount = 0;
  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      if (day.contributionCount > maxCount) maxCount = day.contributionCount;
    });
  });

  const getPositionX = (w) => (w - numWeeks / 2) * (CUBE_SIZE + GAP);
  const getPositionZ = (d) => (d - numDays / 2) * (CUBE_SIZE + GAP);

  // Common geometry
  const geometry = new THREE.BoxGeometry(CUBE_SIZE, 1, CUBE_SIZE);
  // Shift pivot to bottom of the box for scaling
  geometry.translate(0, 0.5, 0);

  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      // Calculate target height
      let rawHeight = BASE_HEIGHT;
      let ratio = 0;
      
      if (day.contributionCount > 0) {
        ratio = Math.log(day.contributionCount + 1) / Math.log(maxCount + 1);
        rawHeight = BASE_HEIGHT + (ratio * MAX_HEIGHT_SCALE * 3); // Make it pop more
      }

      // Material
      const material = new THREE.MeshStandardMaterial({
        color: COLOR_LOW.clone().lerp(COLOR_HIGH, ratio),
        roughness: 0.2,
        metalness: 0.1,
      });

      if (day.contributionCount === 0) {
        material.color.setHex(0x1e293b); // Empty day color
      }

      const cube = new THREE.Mesh(geometry, material);
      
      // Initial Position
      cube.position.x = getPositionX(wIndex);
      cube.position.z = getPositionZ(dIndex);
      cube.position.y = 0; // Fixed y base
      
      // Start with scale Y = 0.01 for animation
      cube.scale.y = 0.01;
      
      cube.castShadow = true;
      cube.receiveShadow = true;

      // Attach data
      cube.userData = {
        date: day.date,
        count: day.contributionCount,
        originalColor: material.color.clone()
      };

      scene.add(cube);
      cubes.push(cube);
      targetHeights.push(rawHeight);
    });
  });

  // Adjust camera to fit grid
  const gridWidth = numWeeks * (CUBE_SIZE + GAP);
  camera.position.set(0, gridWidth * 0.4, gridWidth * 0.6);
  controls.target.set(0, 0, 0);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Tooltip positioning
  if (hoveredCube) {
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
  }
}

function checkIntersections() {
  if (cubes.length === 0) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    const object = intersects[0].object;

    if (hoveredCube !== object) {
      if (hoveredCube) {
        // Reset previous
        hoveredCube.material.emissive.setHex(0x000000);
      }
      
      hoveredCube = object;
      hoveredCube.material.emissive.copy(COLOR_ACTIVE).multiplyScalar(0.2);

      // Update tooltip
      const { date, count } = hoveredCube.userData;
      tooltipDate.textContent = new Date(date).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
      tooltipCount.textContent = `${count} contribution${count === 1 ? '' : 's'}`;
      tooltip.classList.remove('hidden');
    }
  } else {
    if (hoveredCube) {
      hoveredCube.material.emissive.setHex(0x000000);
      hoveredCube = null;
      tooltip.classList.add('hidden');
    }
  }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  controls.update();

  // Grow animation
  for (let i = 0; i < cubes.length; i++) {
    const cube = cubes[i];
    const target = targetHeights[i];
    
    if (cube.scale.y < target) {
      // Lerp for smooth growth
      cube.scale.y += (target - cube.scale.y) * 10 * dt;
      if (target - cube.scale.y < 0.01) {
        cube.scale.y = target;
      }
    }
    
    // Subtle floating whole grid effect based on week index
    // cube.position.y = Math.sin(elapsedTime * 2 + cube.position.x * 0.1) * 0.2;
  }

  checkIntersections();
  renderer.render(scene, camera);
}
