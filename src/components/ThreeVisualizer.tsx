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
    colorEmpty: 0xffffff,
    lineColor: 0x000000,
  },
  skyline: {
    bg: 0x010103,
    fog: 30,
    fogFar: 200,
    gridColor: 0x0a0a1a,
    useBloom: true,
    colorLow: new THREE.Color('#002244'),
    colorHigh: new THREE.Color('#00ffff'),
    colorEmpty: 0x0a0a1a,
    lineColor: 0x00ffff,
  }
};

const buildingShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uRatio;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Window grid logic
      float horizonGrid = step(0.9, fract(vUv.x * 3.0));
      float verticalGrid = step(0.8, fract(vUv.y * 15.0 * uRatio));
      float window = horizonGrid + verticalGrid;
      
      // Top down glow
      float topGlow = pow(vUv.y, 4.0) * 0.5;
      
      // Building base color - dark glassy look
      vec3 baseColor = mix(vec3(0.01), uColor * 0.1, vUv.y);
      
      // Emissive windows - pulse effect
      vec3 emissive = uColor * window * (0.6 + 0.4 * sin(uTime * 3.0 + vPosition.x));
      
      // Final color
      vec3 finalColor = baseColor + emissive + (uColor * topGlow);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
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
  const extraMeshesRef = useRef<THREE.Object3D[]>([]);
  const shipsRef = useRef<any[]>([]);
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
      (cube.material as any).dispose?.();
      sceneRef.current.remove(cube);
    });
    cubesRef.current = [];

    extraMeshesRef.current.forEach(mesh => {
      if ((mesh as any).geometry) (mesh as any).geometry.dispose();
      if ((mesh as any).material) (mesh as any).material.dispose();
      sceneRef.current.remove(mesh);
    });
    extraMeshesRef.current = [];
    
    shipsRef.current.forEach(ship => {
      sceneRef.current.remove(ship.mesh);
      sceneRef.current.remove(ship.trail);
      ship.mesh.geometry.dispose();
      ship.mesh.material.dispose();
      ship.trail.geometry.dispose();
      ship.trail.material.dispose();
    });
    shipsRef.current = [];
  };

  const createDrone = (color: number) => {
    const droneGroup = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const wingGeom = new THREE.BoxGeometry(0.2, 0.1, 1.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: 4 });
    const body = new THREE.Mesh(bodyGeom, mat);
    const wings = new THREE.Mesh(wingGeom, mat);
    droneGroup.add(body);
    droneGroup.add(wings);
    return droneGroup;
  };

  const createSpaceships = () => {
    if (currentThemeModeRef.current !== 'skyline') return;
    const colors = [0x00ffff, 0xff00ff, 0x00ff88];
    for (let i = 0; i < 3; i++) {
      const drone = createDrone(colors[i]);
      const trailGeom = new THREE.BufferGeometry();
      const trailMat = new THREE.LineBasicMaterial({ color: colors[i], transparent: true, opacity: 0.6 });
      const positions = new Float32Array(30 * 3); // 30 history points
      trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const trail = new THREE.Line(trailGeom, trailMat);
      
      const ship = {
        mesh: drone,
        trail,
        history: [] as THREE.Vector3[],
        angle: Math.random() * Math.PI * 2,
        radius: 35 + Math.random() * 20,
        speed: 0.2 + Math.random() * 0.3,
        height: 15 + Math.random() * 10,
        oscillationSpeed: 0.5 + Math.random(),
        oscillationAmplitude: 2 + Math.random() * 3,
      };
      sceneRef.current.add(drone);
      sceneRef.current.add(trail);
      shipsRef.current.push(ship);
    }
  };

  const updateThemeSync = (mode: string) => {
    const t = THEMES[mode as keyof typeof THEMES] || THEMES.isometric;
    const scene = sceneRef.current;
    currentThemeModeRef.current = mode;
    scene.background = new THREE.Color(t.bg);
    scene.fog = new THREE.Fog(t.bg, t.fog, t.fogFar);
    
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    if (mode === 'isometric') {
      cameraRef.current = orthographicCameraRef.current;
      orthographicCameraRef.current?.position.set(50, 50, 50);
    } else {
      cameraRef.current = perspectiveCameraRef.current;
      perspectiveCameraRef.current?.position.set(-80, 60, 150);
      gridHelperRef.current = new THREE.GridHelper(500, 100, t.gridColor, t.gridColor);
      scene.add(gridHelperRef.current);
      createSpaceships();
    }

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
      if (currentThemeModeRef.current === 'skyline') createSpaceships();

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
          let rawHeight = day.contributionCount > 0 ? (BASE_HEIGHT + ratio * MAX_HEIGHT_SCALE * 8) : BASE_HEIGHT;
          const isSkyline = currentThemeModeRef.current === 'skyline';
          const isZero = day.contributionCount === 0;
          const activeColor = currentTheme.colorLow.clone().lerp(currentTheme.colorHigh, ratio);

          let material;
          if (isSkyline && !isZero) {
            material = new THREE.ShaderMaterial({
              uniforms: {
                uColor: { value: activeColor },
                uRatio: { value: ratio },
                uTime: { value: 0 }
              },
              vertexShader: buildingShader.vertexShader,
              fragmentShader: buildingShader.fragmentShader,
            });
          } else {
            material = new THREE.MeshStandardMaterial({
              color: isZero ? currentTheme.colorEmpty : activeColor,
              emissive: isZero ? 0x000000 : activeColor,
              emissiveIntensity: 0,
            });
          }

          const cube = new THREE.Mesh(geometry, material);
          cube.scale.set(isSkyline ? 0.9 : 1.0, 0.01, isSkyline ? 0.9 : 1.0);
          cube.position.set(getPositionX(wIndex), 0, getPositionZ(dIndex));
          cube.userData = { date: day.date, count: day.contributionCount, targetHeight: rawHeight };
          sceneRef.current.add(cube);
          cubesRef.current.push(cube);

          if (isSkyline && ratio > 0.5) {
            const antGeom = new THREE.CylinderGeometry(0.02, 0.02, 2);
            const antMat = new THREE.MeshBasicMaterial({ color: activeColor });
            const antenna = new THREE.Mesh(antGeom, antMat);
            antenna.position.set(cube.position.x, rawHeight, cube.position.z);
            sceneRef.current.add(antenna);
            extraMeshesRef.current.push(antenna);
          }

          if (currentThemeModeRef.current === 'isometric') {
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 }));
            line.position.copy(cube.position);
            line.scale.copy(cube.scale);
            sceneRef.current.add(line);
            extraMeshesRef.current.push(line);
          }
        });
      });

      if (cameraRef.current) {
        controlsRef.current?.target.set(0, 0, 0);
        if (currentThemeModeRef.current === 'isometric') {
          const cam = cameraRef.current as THREE.OrthographicCamera;
          cam.zoom = 0.1;
          cam.updateProjectionMatrix();
          gsap.to(cam, { zoom: 4.5, duration: 1.5, ease: "power3.out", onUpdate: () => cam.updateProjectionMatrix() });
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const perspectiveCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    const orthographicCamera = new THREE.OrthographicCamera(-35 * (window.innerWidth / window.innerHeight), 35 * (window.innerWidth / window.innerHeight), 35, -35, -100, 1000);
    perspectiveCameraRef.current = perspectiveCamera;
    orthographicCameraRef.current = orthographicCamera;

    const controls = new OrbitControls(orthographicCamera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, orthographicCamera);
    composer.addPass(renderPass);
    renderPassRef.current = renderPass;
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 0.4, 0.85);
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 100, 30);
    scene.add(dirLight);

    updateThemeSync(theme);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();
      const st = clockRef.current.getElapsedTime();
      if (controlsRef.current) controlsRef.current.update();

      cubesRef.current.forEach((cube) => {
        const target = cube.userData.targetHeight || BASE_HEIGHT;
        if (cube.scale.y < target) cube.scale.y += (target - cube.scale.y) * 6 * dt;
        if (cube.material instanceof THREE.ShaderMaterial) cube.material.uniforms.uTime.value = st;
      });

      shipsRef.current.forEach(ship => {
        ship.angle += ship.speed * dt;
        const x = Math.cos(ship.angle) * ship.radius;
        const z = Math.sin(ship.angle) * ship.radius;
        const y = ship.height + Math.sin(st * ship.oscillationSpeed) * ship.oscillationAmplitude;
        ship.mesh.position.set(x, y, z);
        ship.mesh.lookAt(new THREE.Vector3(Math.cos(ship.angle + 0.1) * ship.radius, y, Math.sin(ship.angle + 0.1) * ship.radius));
        
        // Trail logic
        ship.history.push(ship.mesh.position.clone());
        if (ship.history.length > 30) ship.history.shift();
        const posAttr = ship.trail.geometry.attributes.position;
        for (let i = 0; i < ship.history.length; i++) {
          posAttr.setXYZ(i, ship.history[i].x, ship.history[i].y, ship.history[i].z);
        }
        posAttr.needsUpdate = true;
      });

      const currentCam = cameraRef.current || orthographicCamera;
      if (bloomPass.enabled) composer.render();
      else renderer.render(scene, currentCam);
    };

    const handleResize = () => {
      const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
      perspectiveCamera.aspect = aspect;
      perspectiveCamera.updateProjectionMatrix();
      orthographicCamera.left = -35 * aspect;
      orthographicCamera.right = 35 * aspect;
      orthographicCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
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
