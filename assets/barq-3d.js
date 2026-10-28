/**
 * BARQ FRAGRANCES — Photorealistic 3D Perfume Studio & Natural Mist Spray
 * Authentic BARQ Bottle: Cylindrical Crystal Glass, Authentic Original Oil Colors,
 * Polished Silver Atomizer (No Black), White Spherical Detachable Cap & Fine Aerosol Spray
 */

const BARQ_3D = (function () {
  let scene, camera, renderer, container;
  let bottleGroup, glassMesh, liquidMesh, collarMesh, nozzleMesh, capMesh, labelMesh, shadowMesh;
  let currentPerfume = 'barq_golden';
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let autoRotate = true;
  let autoRotateSpeed = 0.0035;
  let targetRotation = { x: 0, y: 0 };
  let nozzleRestY = 1.42;
  let isSpraying = false;
  let sprayCount = 0;

  // Detachable Cap Animation State
  let isCapOpen = false;
  let initialCapY = 1.42;
  let capTargetPos = { x: 0, y: 1.42, z: 0 };
  let capTargetRot = { x: 0, y: 0, z: 0 };

  // Particle System for Natural Fine Perfume Mist
  const MAX_PARTICLES = 400;
  let particleGeo, particleMat, particleSystem;
  let particleData = [];
  let mistTexture;

  // 6 Authentic Perfume Configurations matching original product colors & vibes
  const PERFUME_CONFIGS = {
    'barq_golden': {
      id: 'barq_golden',
      name_ar: 'عطر جولدن (GOLDEN)',
      name_en: 'GOLDEN',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Jean Paul Gaultier - Le Male Elixir',
      price: 390,
      oldPrice: 450,
      price30: 280,
      notesSummary: 'عسل ذهبي، فانيلا مدخنة، نعناع منعش، أوراق تبغ، حبوب تونكا، لافندر، بنزوين',
      intensity: 'VERY STRONG (مغناطيسي جذاب)',
      longevity: '+12 HOURS (ثبات استثنائي)',
      projection: '+2.5 HOURS (هالة دافئة ساحرة)',
      // Authentic Le Male Elixir: Glowing Honey Amber Gold
      liquidColor: 0xd97706,
      liquidOpacity: 0.82,
      labelAccent: '#b48324',
      mistColor: 0xfef08a,
      mistAlpha: 0.45
    },
    'barq_roma': {
      id: 'barq_roma',
      name_ar: 'عطر روما (ROMA)',
      name_en: 'ROMA',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Valentino Uomo Born In Roma Intense',
      price: 400,
      oldPrice: 450,
      price30: 300,
      notesSummary: 'فانيلا البوربون، أوركيد الفانيلا، لافندر أروماتي، نجيل الهند المدخن',
      intensity: 'STRONG (إصدار مكثف فاخر)',
      longevity: '+10 HOURS (أكثر من 10 ساعات)',
      projection: '+2 HOURS (بصمة أنيقة لا تُنسى)',
      // Authentic Born In Roma Intense: Deep Bourbon Amber Cognac
      liquidColor: 0xb45309,
      liquidOpacity: 0.82,
      labelAccent: '#9a3412',
      mistColor: 0xfde68a,
      mistAlpha: 0.48
    },
    'barq_deep_blue': {
      id: 'barq_deep_blue',
      name_ar: 'عطر ديب بلو (DEEP BLUE)',
      name_en: 'DEEP BLUE',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Emporio Armani - Stronger With You Intensely',
      price: 390,
      oldPrice: 450,
      price30: 280,
      notesSummary: 'قرفة حارة، فلفل وردي، مريمية، عنبر متوهج، تونكا، فانيلا كريمية',
      intensity: 'STRONG (شتوي رومانسي دافئ)',
      longevity: '+10 HOURS (أكثر من 10 ساعات)',
      projection: '+2 HOURS (انتشار جذاب واسع)',
      // Authentic SWY Intensely: Rich Spiced Toffee Cognac Amber
      liquidColor: 0x9a3412,
      liquidOpacity: 0.82,
      labelAccent: '#854d0e',
      mistColor: 0xfed7aa,
      mistAlpha: 0.45
    },
    'barq_volt': {
      id: 'barq_volt',
      name_ar: 'عطر فولت (VOLT)',
      name_en: 'VOLT',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Parfums de Marly - Althaïr',
      price: 390,
      oldPrice: 450,
      price30: 280,
      notesSummary: 'بوربون معتق، خشب الغاياك، زعفران، شوكولاتة وبرالين، لوز محمص، فانيلا مدغشقر',
      intensity: 'STRONG (نيش أرستقراطي ناعم)',
      longevity: '+11 HOURS (ثبات كريمي هادئ)',
      projection: '+2 HOURS (فخامة فرنسية)',
      // Authentic Althaïr: Creamy Bourbon Vanilla Caramel
      liquidColor: 0xc28e3b,
      liquidOpacity: 0.80,
      labelAccent: '#b48228',
      mistColor: 0xfef3c7,
      mistAlpha: 0.46
    },
    'barq_light': {
      id: 'barq_light',
      name_ar: 'عطر لايت (LIGHT)',
      name_en: 'LIGHT',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Paco Rabanne - Invictus Victory Elixir',
      price: 370,
      oldPrice: 450,
      price30: 270,
      notesSummary: 'هيل أخضر، بخور عماني دخاني، فانيلا سوداء، فلفل أسود، تونكا مكثفة، باتشولي',
      intensity: 'VERY STRONG (ناري وطاغي)',
      longevity: '+12 HOURS (ثبات وانتشار خيالي)',
      projection: '+2.5 HOURS (حضور قيادي واثق)',
      // Authentic Victory Elixir: Spiced Dark Obsidian Amber
      liquidColor: 0x854d0e,
      liquidOpacity: 0.82,
      labelAccent: '#78350f',
      mistColor: 0xffedd5,
      mistAlpha: 0.50
    },
    'barq_sauvage': {
      id: 'barq_sauvage',
      name_ar: 'عطر سوفاج (SAUVAGE)',
      name_en: 'SAUVAGE',
      tagline: 'EXTRAIT DE PARFUM · 50 ML',
      inspired: 'مستوحى من: Dior - Sauvage',
      price: 360,
      oldPrice: 450,
      price30: 260,
      notesSummary: 'برغموت كالابريا النضر، فلفل سيتشوان، أمبروكسان فاخر، لافندر، خشب الأرز',
      intensity: 'VERY STRONG (الأيقونة الأسطورية)',
      longevity: '+10 HOURS (أكثر من 10 ساعات)',
      projection: '+3 HOURS (فوحان ساحر عاصف)',
      // Authentic BARQ Sauvage: Luminous Golden Champagne Amber (identical to sauvage.jpg)
      liquidColor: 0xddbe8b,
      liquidOpacity: 0.82,
      labelAccent: '#aa823a',
      mistColor: 0xfef9c3,
      mistAlpha: 0.52
    }
  };

  /**
   * Soft gaussian radial texture for natural micro-mist
   */
  function createMistTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Create dynamic BARQ-style label: white background with lightning bolt lines & branding
   */
  function createLabelTexture(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Clean luxury white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle pearlescent vignette
    const vignette = ctx.createRadialGradient(512, 512, 180, 512, 512, 600);
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, 'rgba(228,230,235,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1024, 1024);

    const accent = config.labelAccent || '#aa823a';

    // Draw authentic BARQ lightning bolt background watermark lines
    ctx.strokeStyle = 'rgba(210, 214, 222, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = 150 + i * 120;
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x - 30, 260);
      ctx.lineTo(x + 15, 290);
      ctx.lineTo(x - 20, 480);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 540);
      ctx.lineTo(x - 30, 730);
      ctx.lineTo(x + 15, 760);
      ctx.lineTo(x - 20, 950);
      ctx.stroke();
    }

    // Outer double border
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(65, 65, 894, 894);

    ctx.lineWidth = 2;
    ctx.strokeRect(85, 85, 854, 854);

    // Top Brand Lightning Emblem
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(512, 150);
    ctx.lineTo(478, 235);
    ctx.lineTo(505, 235);
    ctx.lineTo(488, 305);
    ctx.lineTo(546, 210);
    ctx.lineTo(518, 210);
    ctx.lineTo(540, 150);
    ctx.closePath();
    ctx.fill();

    // Arabic Brand Logo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 80px Alexandria, Cairo, sans-serif';
    ctx.fillText('بَـرْق', 512, 400);

    // Star icon divider
    ctx.font = '28px serif';
    ctx.fillStyle = accent;
    ctx.fillText('✦  PARFUMS  ✦', 512, 455);

    // Main English Brand
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 108px "Bricolage Grotesque", Arial, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('BARQ', 512, 580);

    // Elegant Accent Line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, 620);
    ctx.lineTo(724, 620);
    ctx.stroke();

    // Perfume Name
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 72px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText(config.name_en, 512, 720);

    // Tagline / Concentration
    ctx.font = '500 34px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
    ctx.fillText('EXTRAIT DE PARFUM', 512, 800);

    ctx.font = 'bold 32px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText('50 ML · 1.7 FL.OZ.', 512, 870);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Synthesize realistic perfume spray sound using Web Audio API
   */
  function playSpraySound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const duration = 0.42;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.9;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 3400;
      bandpass.Q.value = 1.4;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 1800;

      const gainNode = ctx.createGain();
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(bandpass);
      bandpass.connect(highpass);
      highpass.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start(now);
    } catch (e) {}
  }

  /**
   * Initialize Three.js Scene, Camera, Procedural Bottle & Particles
   */
  function init() {
    container = document.getElementById('perfume3dCanvas');
    if (!container) return;

    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 5.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Lighting for Glass, Liquid & Chrome Silver
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.7, 10);
    fillLight.position.set(0, 1.5, 3.5);
    scene.add(fillLight);

    buildBottle();
    buildParticleSystem();
    setupEvents();
    animate();

    updateUI(currentPerfume);
  }

  /**
   * Build the 3D Perfume Bottle Mesh — Authentic BARQ cylindrical body + spherical cap
   */
  function buildBottle() {
    bottleGroup = new THREE.Group();
    bottleGroup.scale.set(0.62, 0.62, 0.62);
    bottleGroup.position.set(0, -0.25, 0);

    const config = PERFUME_CONFIGS[currentPerfume];

    // ── 1. MATERIALS ──
    // Ultra-Clear Transparent Crystal Glass
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.04,
      metalness: 0.02,
      reflectivity: 0.96,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide
    });

    // Rich Authentic Perfume Oil inside
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: config.liquidColor,
      transparent: true,
      opacity: config.liquidOpacity,
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 0.85
    });

    // Polished Silver Chrome Collar (No Black)
    const silverCollarMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.10
    });

    // Polished Bright Silver Atomizer Head (No Black)
    const silverNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.08
    });

    // Pure White Porcelain Spherical Cap
    const whiteCapMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.12,
      metalness: 0.05
    });

    // ── 2. OUTER GLASS CYLINDER BODY ──
    const outerRadius = 0.82;
    const bodyHeight = 1.6;
    const glassGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, bodyHeight, 48, 1, false);
    glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.castShadow = true;
    bottleGroup.add(glassMesh);

    // Thick Glass Base
    const baseGeo = new THREE.CylinderGeometry(outerRadius, outerRadius * 0.96, 0.22, 48);
    const baseMesh = new THREE.Mesh(baseGeo, glassMat);
    baseMesh.position.y = -bodyHeight / 2 - 0.11;
    baseMesh.castShadow = true;
    bottleGroup.add(baseMesh);

    // Rounded Glass Shoulder
    const shoulderGeo = new THREE.CylinderGeometry(0.42, outerRadius, 0.25, 48);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, glassMat);
    shoulderMesh.position.y = bodyHeight / 2 + 0.125;
    bottleGroup.add(shoulderMesh);

    // Glass Neck
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.32, 32);
    const neckMesh = new THREE.Mesh(neckGeo, glassMat);
    neckMesh.position.y = bodyHeight / 2 + 0.25 + 0.16;
    bottleGroup.add(neckMesh);

    // ── 3. LIQUID OIL INSIDE ──
    const liqGeo = new THREE.CylinderGeometry(outerRadius * 0.88, outerRadius * 0.88, bodyHeight * 0.88, 32);
    liquidMesh = new THREE.Mesh(liqGeo, liquidMat);
    liquidMesh.position.y = -0.05;
    bottleGroup.add(liquidMesh);

    // Liquid dip tube (straw)
    const strawGeo = new THREE.CylinderGeometry(0.02, 0.02, bodyHeight + 0.3, 16);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 });
    const strawMesh = new THREE.Mesh(strawGeo, strawMat);
    strawMesh.position.y = 0.05;
    bottleGroup.add(strawMesh);

    // ── 4. LABEL — curved cylinder wrap ──
    const labelAngle = Math.PI * 0.65;
    const labelTex = createLabelTexture(config);
    const labelCylMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.35,
      metalness: 0.10,
      side: THREE.FrontSide
    });
    const labelCylGeo = new THREE.CylinderGeometry(
      outerRadius + 0.005, outerRadius + 0.005, 1.05, 32, 1, true,
      -labelAngle / 2 + Math.PI / 2, labelAngle
    );
    labelMesh = new THREE.Mesh(labelCylGeo, labelCylMat);
    bottleGroup.add(labelMesh);

    // ── 5. POLISHED SILVER METALLIC COLLAR ──
    const collarGeo = new THREE.CylinderGeometry(0.38, 0.40, 0.18, 32);
    collarMesh = new THREE.Mesh(collarGeo, silverCollarMat);
    collarMesh.position.y = bodyHeight / 2 + 0.25 + 0.25;
    collarMesh.castShadow = true;
    bottleGroup.add(collarMesh);

    // ── 6. ALL-SILVER SPRAY NOZZLE / ATOMIZER (NO BLACK) ──
    const nozzleGroup = new THREE.Group();
    nozzleRestY = bodyHeight / 2 + 0.25 + 0.35;
    nozzleGroup.position.y = nozzleRestY;

    // Polished Silver Atomizer Button
    const nozzleHeadGeo = new THREE.CylinderGeometry(0.24, 0.25, 0.32, 32);
    const headMesh = new THREE.Mesh(nozzleHeadGeo, silverNozzleMat);
    headMesh.position.y = 0.15;
    nozzleGroup.add(headMesh);

    // Silver metallic spray orifice (NOT BLACK!)
    const orificeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16);
    const orificeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Polished silver-grey pinhole
      metalness: 0.92,
      roughness: 0.15
    });
    const orificeMesh = new THREE.Mesh(orificeGeo, orificeMat);
    orificeMesh.rotation.z = Math.PI / 2;
    orificeMesh.position.set(0.24, 0.18, 0);
    nozzleGroup.add(orificeMesh);

    nozzleMesh = nozzleGroup;
    bottleGroup.add(nozzleMesh);

    // ── 7. DETACHABLE WHITE SPHERICAL CAP ──
    const capGroup = new THREE.Group();
    initialCapY = bodyHeight / 2 + 0.25 + 0.32;
    capGroup.position.set(0, initialCapY, 0);
    capTargetPos = { x: 0, y: initialCapY, z: 0 };
    capTargetRot = { x: 0, y: 0, z: 0 };

    // Silver ring base of cap
    const capRingGeo = new THREE.CylinderGeometry(0.38, 0.39, 0.14, 32);
    const capRingMesh = new THREE.Mesh(capRingGeo, silverCollarMat);
    capRingMesh.position.y = 0.07;
    capGroup.add(capRingMesh);

    // Pure White Spherical Cap
    const sphereRadius = 0.55;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 48, 48);
    const sphereMesh = new THREE.Mesh(sphereGeo, whiteCapMat);
    sphereMesh.position.y = 0.07 + sphereRadius;
    sphereMesh.castShadow = true;
    capGroup.add(sphereMesh);

    capMesh = capGroup;
    capMesh.visible = true; // Fully visible on the bottle
    isCapOpen = false;
    bottleGroup.add(capMesh);

    // ── 8. FLOOR SHADOW (Realistic against grey studio floor) ──
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    sGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
    sGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.12)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMeshMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMeshMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -bodyHeight / 2 - 0.28, 0);
    bottleGroup.add(shadowMesh);

    scene.add(bottleGroup);
  }

  /**
   * Toggle Detachable Cap: Opens/Lifts cap smoothly to reveal the silver atomizer
   */
  function toggleCap() {
    if (!capMesh) return;
    isCapOpen = !isCapOpen;

    if (isCapOpen) {
      // Lift cap smoothly upward and tilt to the side
      capTargetPos = { x: 0.85, y: initialCapY + 1.5, z: 0 };
      capTargetRot = { x: 0.1, y: 0.2, z: -0.32 };
    } else {
      // Put cap back securely on the bottle
      capTargetPos = { x: 0, y: initialCapY, z: 0 };
      capTargetRot = { x: 0, y: 0, z: 0 };
    }

    updateCapUI();
  }

  function updateCapUI() {
    const btnIcon = document.getElementById('capBtnIcon');
    const btnLabel = document.getElementById('capBtnLabel');
    const capBtn = document.getElementById('capToggleBtn');

    if (btnIcon && btnLabel) {
      if (isCapOpen) {
        btnIcon.textContent = '🔒';
        btnLabel.textContent = 'إغلاق الغطاء (Close Cap)';
        if (capBtn) {
          capBtn.classList.add('bg-purple-50', 'border-[#4E3D97]', 'text-[#4E3D97]');
          capBtn.classList.remove('bg-white', 'text-gray-800');
        }
      } else {
        btnIcon.textContent = '🧴';
        btnLabel.textContent = 'فتح الغطاء (Open Cap)';
        if (capBtn) {
          capBtn.classList.remove('bg-purple-50', 'border-[#4E3D97]', 'text-[#4E3D97]');
          capBtn.classList.add('bg-white', 'text-gray-800');
        }
      }
    }
  }

  /**
   * Build Natural Spray Mist Particle System
   */
  function buildParticleSystem() {
    mistTexture = createMistTexture();
    particleGeo = new THREE.BufferGeometry();

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = 0;

      particleData.push({
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        size: 0,
        maxSize: 0,
        growth: 0,
        alpha: 0,
        life: 0,
        maxLife: 0,
        drag: 0.94
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    particleMat = new THREE.PointsMaterial({
      size: 0.25,
      map: mistTexture,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);
  }

  /**
   * Natural Spray Action: Automatically opens cap if closed, then spawns fine mist
   */
  function sprayPerfume() {
    if (!bottleGroup || !nozzleMesh) return;

    // If cap is closed, open it first then trigger spray
    if (!isCapOpen) {
      toggleCap();
      setTimeout(sprayPerfume, 380);
      return;
    }

    sprayCount++;
    const countEl = document.getElementById('sprayCounterBadge');
    if (countEl) countEl.textContent = `${sprayCount} رشة`;

    playSpraySound();

    isSpraying = true;
    nozzleMesh.position.y = nozzleRestY - 0.08;
    setTimeout(() => {
      nozzleMesh.position.y = nozzleRestY;
      isSpraying = false;
    }, 180);

    const nozzleWorldPos = new THREE.Vector3(0, nozzleRestY + 0.04, 0.25);
    nozzleWorldPos.applyMatrix4(bottleGroup.matrixWorld);

    const forwardVec = new THREE.Vector3(0, 0.12, 1);
    forwardVec.applyEuler(bottleGroup.rotation);
    forwardVec.normalize();

    const upVec = new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3();
    rightVec.crossVectors(forwardVec, upVec).normalize();
    const actualUp = new THREE.Vector3();
    actualUp.crossVectors(rightVec, forwardVec).normalize();

    const config = PERFUME_CONFIGS[currentPerfume];
    const mistColor = new THREE.Color(config.mistColor);

    let spawned = 0;
    const targetSpawn = 140;

    for (let i = 0; i < MAX_PARTICLES && spawned < targetSpawn; i++) {
      const p = particleData[i];
      if (!p.active) {
        p.active = true;
        p.x = nozzleWorldPos.x + (Math.random() - 0.5) * 0.03;
        p.y = nozzleWorldPos.y + (Math.random() - 0.5) * 0.03;
        p.z = nozzleWorldPos.z + (Math.random() - 0.5) * 0.03;

        const speed = 3.8 + Math.random() * 4.2;
        const spreadAngle = 0.32;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * spreadAngle;

        p.vx = forwardVec.x * speed + (rightVec.x * Math.cos(angle) + actualUp.x * Math.sin(angle)) * radius * speed;
        p.vy = forwardVec.y * speed + (rightVec.y * Math.cos(angle) + actualUp.y * Math.sin(angle)) * radius * speed + 0.15;
        p.vz = forwardVec.z * speed + (rightVec.z * Math.cos(angle) + actualUp.z * Math.sin(angle)) * radius * speed;

        p.size = 0.04 + Math.random() * 0.03;
        p.maxSize = 0.28 + Math.random() * 0.22;
        p.growth = (p.maxSize - p.size) / 45;
        p.alpha = config.mistAlpha;
        p.life = 0;
        p.maxLife = 40 + Math.random() * 30;
        p.drag = 0.935;
        p.r = mistColor.r;
        p.g = mistColor.g;
        p.b = mistColor.b;

        spawned++;
      }
    }

    const btn = document.getElementById('spray3dBtn');
    if (btn) {
      btn.classList.add('scale-95', 'bg-[#3b2d75]');
      setTimeout(() => btn.classList.remove('scale-95', 'bg-[#3b2d75]'), 150);
    }
  }

  /**
   * Switch the 3D bottle dynamically to any of the 6 perfumes with its unique oil color & label
   */
  function switchPerfume(perfumeId) {
    if (!PERFUME_CONFIGS[perfumeId] || !bottleGroup) return;
    currentPerfume = perfumeId;
    const config = PERFUME_CONFIGS[perfumeId];

    // Liquid oil updates instantly to the authentic product color
    if (liquidMesh) {
      liquidMesh.material.color.setHex(config.liquidColor);
      liquidMesh.material.opacity = config.liquidOpacity;
    }

    // Front label updates with matching brand accent
    if (labelMesh) {
      const newTex = createLabelTexture(config);
      labelMesh.material.map.dispose();
      labelMesh.material.map = newTex;
      labelMesh.material.needsUpdate = true;
    }

    updateUI(perfumeId);

    targetRotation.y += Math.PI * 2;
  }

  /**
   * Update the DOM Information Panel beside the 3D Canvas
   */
  function updateUI(perfumeId) {
    const config = PERFUME_CONFIGS[perfumeId];
    if (!config) return;

    const titleEl = document.getElementById('3dProductTitle');
    if (titleEl) titleEl.textContent = config.name_ar;

    const enEl = document.getElementById('3dProductEn');
    if (enEl) enEl.textContent = `${config.name_en} · ${config.tagline}`;

    const inspiredEl = document.getElementById('3dProductInspired');
    if (inspiredEl) inspiredEl.textContent = config.inspired;

    const priceEl = document.getElementById('3dProductPrice');
    if (priceEl) priceEl.textContent = config.price;

    const oldPriceEl = document.getElementById('3dProductOldPrice');
    if (oldPriceEl) oldPriceEl.textContent = `${config.oldPrice} ج.م`;

    const intEl = document.getElementById('3dIntensityBadge');
    if (intEl) intEl.innerHTML = `⚡ <strong>INTENSITY:</strong> ${config.intensity}`;

    const longEl = document.getElementById('3dLongevityBadge');
    if (longEl) longEl.innerHTML = `🕒 <strong>LONGEVITY:</strong> ${config.longevity}`;

    const projEl = document.getElementById('3dProjectionBadge');
    if (projEl) projEl.innerHTML = `➕ <strong>PROJECTION:</strong> ${config.projection}`;

    const notesEl = document.getElementById('3dNotesSummary');
    if (notesEl) notesEl.textContent = config.notesSummary;

    // Tabs active state for all 6 pills
    document.querySelectorAll('.bottle-tab-btn').forEach(btn => {
      const isTarget = btn.dataset.perfume === perfumeId;
      if (isTarget) {
        btn.className = 'bottle-tab-btn active px-4 py-2 rounded-full text-xs font-bold transition-all bg-[#111111] text-white shadow-md border border-[#111111] flex items-center gap-1.5 whitespace-nowrap';
      } else {
        btn.className = 'bottle-tab-btn px-4 py-2 rounded-full text-xs font-bold transition-all bg-white text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400 flex items-center gap-1.5 whitespace-nowrap';
      }
    });

    if (window.state && window.state.productSizesSelected) {
      window.state.productSizesSelected[perfumeId] = "50";
    }
  }

  function setupEvents() {
    const dom = renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !bottleGroup) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x = Math.max(-0.35, Math.min(0.35, targetRotation.x + deltaY * 0.006));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 2500);
    });

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || !bottleGroup || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.01;
      targetRotation.x = Math.max(-0.35, Math.min(0.35, targetRotation.x + deltaY * 0.008));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
      setTimeout(() => { autoRotate = true; }, 2500);
    });

    dom.addEventListener('click', (e) => {
      if (Math.abs(e.clientX - previousMousePosition.x) < 5 && Math.abs(e.clientY - previousMousePosition.y) < 5) {
        // Direct click on bottle: if cap closed, toggle cap; if already open, spray!
        if (!isCapOpen) {
          toggleCap();
        } else {
          sprayPerfume();
        }
      }
    });

    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate && !isDragging) {
      targetRotation.y += autoRotateSpeed;
    }

    if (bottleGroup) {
      bottleGroup.rotation.y += (targetRotation.y - bottleGroup.rotation.y) * 0.1;
      bottleGroup.rotation.x += (targetRotation.x - bottleGroup.rotation.x) * 0.1;

      const time = Date.now() * 0.0015;
      bottleGroup.position.y = -0.25 + Math.sin(time) * 0.03;
    }

    // Smooth Detachable Cap Interpolation
    if (capMesh) {
      capMesh.position.x += (capTargetPos.x - capMesh.position.x) * 0.12;
      capMesh.position.y += (capTargetPos.y - capMesh.position.y) * 0.12;
      capMesh.rotation.z += (capTargetRot.z - capMesh.rotation.z) * 0.12;
      capMesh.rotation.x += (capTargetRot.x - capMesh.rotation.x) * 0.12;
    }

    // Spray Particle Animation
    if (particleGeo && particleSystem) {
      const positions = particleGeo.attributes.position.array;
      const colors = particleGeo.attributes.color.array;
      const sizes = particleGeo.attributes.size.array;

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particleData[i];
        if (p.active) {
          p.life++;

          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.z += p.vz * 0.016;

          p.vx *= p.drag;
          p.vy *= p.drag;
          p.vz *= p.drag;

          p.vy += 0.012;

          p.size = Math.min(p.maxSize, p.size + p.growth);

          const progress = p.life / p.maxLife;
          const currentAlpha = Math.max(0, p.alpha * (1 - progress));

          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;

          colors[i * 3] = p.r * currentAlpha;
          colors[i * 3 + 1] = p.g * currentAlpha;
          colors[i * 3 + 2] = p.b * currentAlpha;

          sizes[i] = p.size;

          if (p.life >= p.maxLife) {
            p.active = false;
            positions[i * 3 + 1] = -100;
            sizes[i] = 0;
          }
        }
      }

      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.color.needsUpdate = true;
      particleGeo.attributes.size.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  return {
    init: init,
    spray: sprayPerfume,
    toggleCap: toggleCap,
    switchPerfume: switchPerfume,
    getCurrent: () => currentPerfume,
    getConfig: (id) => PERFUME_CONFIGS[id || currentPerfume],
    getAllConfigs: () => PERFUME_CONFIGS
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    BARQ_3D.init();
  }, 200);
});
