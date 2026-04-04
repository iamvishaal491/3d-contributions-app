import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// Configuration constants
const CUBE_SIZE = 1;
const GAP = 0.2;
const BASE_HEIGHT = 0.15;
const MAX_HEIGHT_SCALE = 4;

const THEMES = {
  isometric: {
    bg: 0x050505,
    fog: 100,
    fogFar: 400,
    gridColor: 0x000000, 
    useBloom: false,
    colorLow: new THREE.Color('#9be9a8'),
    colorHigh: new THREE.Color('#216e39'),
    colorEmpty: 0xffffff, // White solid grid for 0 contributions
    lineColor: 0x000000,  // Black lines
  },
  skyline: {
    bg: 0x0a0310,
    fog: 20,
    fogFar: 150,
    gridColor: 0xff00ff,
    useBloom: true,
    colorLow: new THREE.Color('#002244'),
    colorHigh: new THREE.Color('#00ffff'),
    colorEmpty: 0x110022,
    lineColor: 0xff00ff,
  }
};

export interface ThreeVisualizerRef {
  buildGrid: (data: any) => void;
  setTheme: (mode: string) => Promise<void>;
}

interface ThreeVisualizerProps {
  theme: string;
}

export const ThreeVisualizer = forwardRef<ThreeVisualizerRef, ThreeVisualizerProps>(({ theme }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Three.js State Refs
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const renderPassRef = useRef<RenderPass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthographicCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);
  const linesRef = useRef<THREE.LineSegments[]>([]);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const currentThemeModeRef = useRef<string>(theme);
  
  // Interaction Refs
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const hoveredCubeRef = useRef<THREE.Mesh | null>(null);

  const clearGrid = () => {
    cubesRef.current.forEach(cube => {
      cube.geometry.dispose();
      if (Array.isArray(cube.material)) {
        cube.material.forEach(m => m.dispose());
      } else {
        cube.material.dispose();
      }
      sceneRef.current.remove(cube);
    });
    cubesRef.current = [];

    linesRef.current.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      sceneRef.current.remove(line);
    });
    linesRef.current = [];
  };

  const updateThemeSync = (mode: string) => {
    const t = THEMES[mode as keyof typeof THEMES] || THEMES.isometric;
    const scene = sceneRef.current;
    
    currentThemeModeRef.current = mode;
    scene.background = new THREE.Color(t.bg);
    scene.fog = new THREE.Fog(t.bg, t.fog, t.fogFar);
    
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.geometry.dispose();
      (gridHelperRef.current.material as THREE.Material).dispose();
      gridHelperRef.current = null;
    }

    if (mode === 'isometric') {
      cameraRef.current = orthographicCameraRef.current;
      orthographicCameraRef.current?.position.set(50, 50, 50);
      if (controlsRef.current) {
        controlsRef.current.maxPolarAngle = Math.PI;
        controlsRef.current.minPolarAngle = 0;
      }
    } else {
      cameraRef.current = perspectiveCameraRef.current;
      perspectiveCameraRef.current?.position.set(-80, 60, 150);
      gridHelperRef.current = new THREE.GridHelper(400, 80, t.gridColor, t.gridColor);
      scene.add(gridHelperRef.current);
      if (controlsRef.current) {
        controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.1;
        controlsRef.current.minPolarAngle = 0.1;
      }
    }

    // Sync Camera for Post-Processing & Controls
    if (cameraRef.current) {
      if (renderPassRef.current) renderPassRef.current.camera = cameraRef.current;
      if (controlsRef.current) {
        controlsRef.current.object = cameraRef.current;
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
    
    if (bloomPassRef.current) bloomPassRef.current.enabled = t.useBloom;
  };

  useImperativeHandle(ref, () => ({
    buildGrid(data: any) {
      if (!data || !data.weeks || !sceneRef.current) return;
      clearGrid();

      const currentTheme = THEMES[currentThemeModeRef.current as keyof typeof THEMES] || THEMES.isometric;
      const weeks = data.weeks;
      const numWeeks = weeks.length;
      const numDays = 7;
      
      let maxCount = 0;
      weeks.forEach((week: any) => {
        week.contributionDays?.forEach((day: any) => {
          if (day.contributionCount > maxCount) maxCount = day.contributionCount;
        });
      });

      const getPositionX = (w: number) => (w - numWeeks / 2) * (CUBE_SIZE + GAP);
      const getPositionZ = (d: number) => (d - numDays / 2) * (CUBE_SIZE + GAP);
      const geometry = new THREE.BoxGeometry(CUBE_SIZE, 1, CUBE_SIZE);
      geometry.translate(0, 0.5, 0);

      weeks.forEach((week: any, wIndex: number) => {
        week.contributionDays?.forEach((day: any, dIndex: number) => {
          let ratio = day.contributionCount > 0 ? (Math.log(day.contributionCount + 1) / Math.log(maxCount + 1)) : 0;
          let rawHeight = day.contributionCount > 0 ? (BASE_HEIGHT + ratio * MAX_HEIGHT_SCALE * 6) : BASE_HEIGHT;

          const activeColor = currentTheme.colorLow.clone().lerp(currentTheme.colorHigh, ratio);
          const isZero = day.contributionCount === 0;
          const isIsometric = currentThemeModeRef.current === 'isometric';

          const materialValue = isZero ? currentTheme.colorEmpty : (currentThemeModeRef.current === 'skyline' ? 0x000000 : activeColor);
          const emissiveValue = isZero ? 0x000000 : (currentThemeModeRef.current === 'skyline' ? activeColor : 0x000000);

          const material = new THREE.MeshStandardMaterial({
            color: materialValue,
            emissive: emissiveValue,
            emissiveIntensity: currentThemeModeRef.current === 'skyline' && !isZero ? (0.8 + ratio * 2) : 0,
            roughness: 0.2,
            metalness: 0.1,
          });

          const cube = new THREE.Mesh(geometry, material);
          cube.position.set(getPositionX(wIndex), 0, getPositionZ(dIndex));
          cube.scale.y = 0.01; 
          cube.userData = { date: day.date, count: day.contributionCount, originalEmissive: material.emissive.clone(), targetHeight: rawHeight };
          sceneRef.current.add(cube);
          cubesRef.current.push(cube);

          // Add Edges/Lines for Isometric specifically, but works for Skyline too
          const edges = new THREE.EdgesGeometry(geometry);
          const lineMaterial = new THREE.LineBasicMaterial({ color: currentTheme.lineColor, transparent: true, opacity: isIsometric ? 0.8 : 0.2 });
          const line = new THREE.LineSegments(edges, lineMaterial);
          line.position.copy(cube.position);
          line.scale.copy(cube.scale);
          sceneRef.current.add(line);
          linesRef.current.push(line);
        });
      });

      if (cameraRef.current) {
        controlsRef.current?.target.set(0, 0, 0);
        if (currentThemeModeRef.current === 'isometric') {
          const cam = cameraRef.current as THREE.OrthographicCamera;
          cam.zoom = 0.1;
          cam.updateProjectionMatrix();
          gsap.to(cam, { zoom: 4, duration: 1.5, ease: "power3.out", onUpdate: () => cam.updateProjectionMatrix() });
        } else {
          const cam = cameraRef.current;
          const targetPos = new THREE.Vector3(-80, 60, 150);
          cam.position.set(targetPos.x, targetPos.y + 100, targetPos.z + 100);
          gsap.to(cam.position, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 2, ease: "expo.out" });
        }
      }
    },
    async setTheme(mode: string) {
      updateThemeSync(mode);
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = sceneRef.current;
    const aspect = window.innerWidth / window.innerHeight;
    const perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    const orthographicCamera = new THREE.OrthographicCamera(-35 * aspect, 35 * aspect, 35, -35, -100, 1000);
    perspectiveCameraRef.current = perspectiveCamera;
    orthographicCameraRef.current = orthographicCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(orthographicCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, orthographicCamera);
    composer.addPass(renderPass);
    renderPassRef.current = renderPass;

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 100, 30);
    scene.add(dirLight);

    updateThemeSync(theme);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();
      if (controlsRef.current) controlsRef.current.update();

      cubesRef.current.forEach((cube, i) => {
        const target = cube.userData.targetHeight || BASE_HEIGHT;
        if (Math.abs(cube.scale.y - target) > 0.01) {
          cube.scale.y += (target - cube.scale.y) * 6 * dt;
          if (linesRef.current[i]) linesRef.current[i].scale.y = cube.scale.y;
        }
      });

      const currentCam = cameraRef.current || orthographicCamera;
      raycasterRef.current.setFromCamera(mouseRef.current, currentCam);
      const intersects = raycasterRef.current.intersectObjects(cubesRef.current);
      
      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        if (hoveredCubeRef.current !== object) {
          if (hoveredCubeRef.current) {
            (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissive.copy(hoveredCubeRef.current.userData.originalEmissive);
            (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = currentThemeModeRef.current === 'skyline' ? 1.5 : 0;
          }
          hoveredCubeRef.current = object;
          (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
          (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1;
          if (tooltipRef.current) {
            const { date, count } = object.userData;
            tooltipRef.current.innerHTML = `<div class="text-[10px] text-white/40 mb-1">${new Date(date).toLocaleDateString()}</div><div class="text-sm font-bold text-white">${count} days</div>`;
            tooltipRef.current.style.opacity = '1';
          }
        }
      } else {
        if (hoveredCubeRef.current) {
          (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissive.copy(hoveredCubeRef.current.userData.originalEmissive);
          (hoveredCubeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = currentThemeModeRef.current === 'skyline' ? 1.5 : 0;
          hoveredCubeRef.current = null;
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
        }
      }

      if (bloomPass.enabled) composer.render();
      else renderer.render(scene, currentCam);
    };

    const handleResize = () => {
      const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
      perspectiveCamera.aspect = aspect;
      perspectiveCamera.updateProjectionMatrix();
      const f = 40;
      orthographicCamera.left = -f * aspect / 2;
      orthographicCamera.right = f * aspect / 2;
      orthographicCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `${e.clientX + 15}px`;
        tooltipRef.current.style.top = `${e.clientY + 15}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div id="canvas-container" ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'auto' }} />
      <div ref={tooltipRef} className="fixed pointer-events-none bg-black/80 backdrop-blur-md border border-white/20 p-3 z-[100] opacity-0 transition-opacity duration-200 min-w-[120px] rounded-lg shadow-2xl" style={{ fontFamily: 'var(--font-mono)' }} />
    </>
  );
});
