import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  Wind, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCw,
  Play
} from 'lucide-react';

export default function Naruto3DCanvas({
  activeJutsu = 'RASENGAN', // 'RASENGAN', 'RASENSHURIKEN', 'KURAMA', 'CHIDORI'
  onJutsuChange,
  compact = false
}) {
  const mountRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [rpm, setRpm] = useState(850000);
  const audioCtxRef = useRef(null);
  const humOscRef = useRef(null);
  const humGainRef = useRef(null);

  // Web Audio Synthesizer for Jutsu sounds
  const playJutsuSound = (type) => {
    if (!soundEnabled) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      if (type === 'CHARGE') {
        // High frequency turbine spin-up
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.8);

        // Filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.8);
        filter.Q.value = 8;

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'BURST') {
        // Energy blast explosion shockwave
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch {
      // Audio not permitted or supported
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 4, 20);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(0xf59e0b, 2, 20);
    backLight.position.set(0, 0, -3);
    scene.add(backLight);

    // 3. 3D CORE SPHERE
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner glowing sphere
    const coreGeo = new THREE.SphereGeometry(1.2, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Solid inner core for density
    const innerCoreGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    // 4. 3D SWIRLING CHAKRA PARTICLES (VORTEX)
    const particleCount = 2400;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    const colArray = new Float32Array(particleCount * 3);
    const speedArray = new Float32Array(particleCount);
    const radiusArray = new Float32Array(particleCount);
    const angleArray = new Float32Array(particleCount);
    const heightArray = new Float32Array(particleCount);

    const chakraColor = new THREE.Color(0x38bdf8);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const r = 1.0 + Math.random() * 1.6;
      const angle = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 2.2;

      radiusArray[i] = r;
      angleArray[i] = angle;
      heightArray[i] = h;
      speedArray[i] = 1.5 + Math.random() * 3.5;

      posArray[i3] = Math.cos(angle) * r;
      posArray[i3 + 1] = h;
      posArray[i3 + 2] = Math.sin(angle) * r;

      // Color variation
      const mixedColor = chakraColor.clone().lerp(whiteColor, Math.random() * 0.7);
      colArray[i3] = mixedColor.r;
      colArray[i3 + 1] = mixedColor.g;
      colArray[i3 + 2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));

    // Particle sprite using canvas texture for soft glow
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(56,189,248,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(canvas);
    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particleSystem);

    // 5. 3D CHAKRA ORBIT RINGS
    const ringCount = 3;
    const rings = [];
    for (let r = 0; r < ringCount; r++) {
      const ringGeo = new THREE.TorusGeometry(1.8 + r * 0.35, 0.025, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = (Math.PI / 3) * (r + 1);
      ring.rotation.y = (Math.PI / 4) * (r + 1);
      coreGroup.add(ring);
      rings.push(ring);
    }

    // 6. 3D RASENSHURIKEN BLADES (4 blades)
    const bladeGroup = new THREE.Group();
    coreGroup.add(bladeGroup);
    const bladeMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    for (let b = 0; b < 4; b++) {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.quadraticCurveTo(1.5, 0.5, 3.2, 0);
      bladeShape.quadraticCurveTo(2.0, 1.4, 0, 0);

      const bladeGeo = new THREE.ShapeGeometry(bladeShape);
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.rotation.z = (Math.PI / 2) * b;
      bladeGroup.add(bladeMesh);
    }
    bladeGroup.visible = activeJutsu === 'RASENSHURIKEN';

    // 7. 3D EXPANDING SHOCKWAVE TORUS (on surge)
    const shockwaveGeo = new THREE.TorusGeometry(1.2, 0.06, 16, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    coreGroup.add(shockwaveMesh);

    // 8. INTERACTIVE MOUSE ROTATION
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.01;
        targetRotationX += deltaY * 0.01;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth || 600;
      const newH = container.clientHeight || 400;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // 9. ANIMATION LOOP
    let animationFrameId;
    let clock = new THREE.Clock();
    let shockwaveScale = 1;
    let shockwaveActive = false;

    // Expose surge trigger to ref/parent
    window.__trigger3DChakraSurge = () => {
      shockwaveScale = 1;
      shockwaveActive = true;
      shockwaveMesh.scale.set(1, 1, 1);
      shockwaveMat.opacity = 1;
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Dynamic rotation
      coreGroup.rotation.y += 0.035 * rotationSpeed;
      coreGroup.rotation.x += 0.012 * rotationSpeed;
      coreGroup.rotation.z += 0.008 * rotationSpeed;

      // Mouse drag damping
      coreGroup.rotation.x += (targetRotationX - coreGroup.rotation.x) * 0.05;
      coreGroup.rotation.y += (targetRotationY - coreGroup.rotation.y) * 0.05;

      // Inner Core Pulse
      const scale = 1 + Math.sin(time * 8) * 0.04;
      coreMesh.scale.set(scale, scale, scale);
      innerCoreMesh.scale.set(scale * 0.95, scale * 0.95, scale * 0.95);

      // Rotate Rings in counter directions
      rings.forEach((ring, idx) => {
        ring.rotation.z += (idx % 2 === 0 ? 0.05 : -0.06) * rotationSpeed;
        ring.rotation.x += 0.02 * rotationSpeed;
      });

      // Rotate Rasenshuriken blades rapidly
      if (bladeGroup.visible) {
        bladeGroup.rotation.z += 0.22 * rotationSpeed;
        bladeGroup.rotation.y = Math.sin(time * 4) * 0.2;
      }

      // Swirl particles in a tight 3D logarithmic vortex
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        angleArray[i] += speedArray[i] * 0.03 * rotationSpeed;

        // Radius breathing
        const curR = radiusArray[i] + Math.sin(time * 5 + i) * 0.12;
        positions[i3] = Math.cos(angleArray[i]) * curR;
        positions[i3 + 2] = Math.sin(angleArray[i]) * curR;

        // Vertical helical drift
        heightArray[i] += Math.sin(time * 3 + i) * 0.01;
        if (heightArray[i] > 1.8) heightArray[i] = -1.8;
        if (heightArray[i] < -1.8) heightArray[i] = 1.8;
        positions[i3 + 1] = heightArray[i];
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Shockwave expansion animation
      if (shockwaveActive) {
        shockwaveScale += delta * 12;
        shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        shockwaveMat.opacity -= delta * 1.5;
        if (shockwaveMat.opacity <= 0) {
          shockwaveActive = false;
          shockwaveMat.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Jutsu Color Adaptation
    const updateJutsuTheme = (jutsu) => {
      let mainHex = 0x38bdf8;
      let pointHex = 0x38bdf8;
      bladeGroup.visible = false;

      if (jutsu === 'RASENGAN') {
        mainHex = 0x38bdf8;
        pointHex = 0x0284c7;
      } else if (jutsu === 'RASENSHURIKEN') {
        mainHex = 0xe0f2fe;
        pointHex = 0x38bdf8;
        bladeGroup.visible = true;
      } else if (jutsu === 'KURAMA') {
        mainHex = 0xf97316; // Fiery Kurama Orange
        pointHex = 0xef4444; // Crimson Red
      } else if (jutsu === 'CHIDORI') {
        mainHex = 0xa855f7; // Violet-Blue Sage Lightning
        pointHex = 0x60a5fa;
      }

      coreMat.color.setHex(mainHex);
      innerCoreMat.color.setHex(0xffffff);
      pointLight.color.setHex(pointHex);
      shockwaveMat.color.setHex(mainHex);

      // Re-tint particles
      const colors = particleGeo.attributes.color.array;
      const newBaseColor = new THREE.Color(mainHex);
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const c = newBaseColor.clone().lerp(whiteColor, Math.random() * 0.6);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      particleGeo.attributes.color.needsUpdate = true;
    };

    updateJutsuTheme(activeJutsu);
    mountRef.current.__updateJutsu = updateJutsuTheme;

    // CLEANUP
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      rings.forEach(r => {
        r.geometry.dispose();
        r.material.dispose();
      });
      bladeGroup.children.forEach(b => {
        b.geometry.dispose();
        b.material.dispose();
      });
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update theme when activeJutsu prop changes
  useEffect(() => {
    if (mountRef.current && mountRef.current.__updateJutsu) {
      mountRef.current.__updateJutsu(activeJutsu);
    }
  }, [activeJutsu]);

  // Interactive 3D Chakra Surge Blast
  const triggerChakraSurge = () => {
    setIsCharging(true);
    setRotationSpeed(3.5);
    setRpm(1450000);
    playJutsuSound('CHARGE');

    setTimeout(() => {
      if (window.__trigger3DChakraSurge) {
        window.__trigger3DChakraSurge();
      }
      playJutsuSound('BURST');
      setRotationSpeed(1);
      setRpm(850000);
      setIsCharging(false);
    }, 800);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] flex flex-col items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950/80 via-[#030712] to-slate-950/90 border border-amber-500/30">
      
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
        title="Click and drag to rotate 3D Rasengan in real-time"
      />

      {/* Floating 3D Telemetry HUD Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            3D WebGL CHAKRA VORTEX
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 px-1">
          RPM: <span className="text-amber-400 font-bold">{rpm.toLocaleString()}</span> | DRAG TO ROTATE 3D
        </div>
      </div>

      {/* Top Right Sound & Status */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) playJutsuSound('CHARGE');
          }}
          className={`p-2 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
            soundEnabled
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:text-white'
          }`}
          title={soundEnabled ? 'Jutsu Sound ON' : 'Turn Sound ON'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Center 3D Jutsu Mode Selector */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        
        {/* Jutsu Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800">
          <button
            onClick={() => onJutsuChange ? onJutsuChange('RASENGAN') : null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeJutsu === 'RASENGAN'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rasengan</span>
          </button>

          <button
            onClick={() => onJutsuChange ? onJutsuChange('RASENSHURIKEN') : null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeJutsu === 'RASENSHURIKEN'
                ? 'bg-gradient-to-r from-sky-400 to-cyan-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Rasenshuriken</span>
          </button>

          <button
            onClick={() => onJutsuChange ? onJutsuChange('KURAMA') : null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeJutsu === 'KURAMA'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Kurama 9-Tails</span>
          </button>

          <button
            onClick={() => onJutsuChange ? onJutsuChange('CHIDORI') : null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeJutsu === 'CHIDORI'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sage Lightning</span>
          </button>
        </div>

        {/* 3D Charge & Surge Trigger */}
        <button
          onClick={triggerChakraSurge}
          disabled={isCharging}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
            isCharging
              ? 'bg-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-pulse'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${isCharging ? 'animate-spin' : ''}`} />
          <span>{isCharging ? 'Surging Chakra...' : '⚡ Release 3D Chakra Burst'}</span>
        </button>

      </div>
    </div>
  );
}
