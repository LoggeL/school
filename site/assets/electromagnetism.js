import * as THREE from './vendor/three.module.js';

// Self-test answers use native details elements and work without JavaScript.
document.getElementById('em-print')?.addEventListener('click', () => window.print());
const page = document.querySelector('[data-experiment]');
const topics = new Set(['generator', 'induktion', 'magnetfeld-eisenkern', 'transformator', 'hochspannungsleitungen']);
const host = document.getElementById('em-viewport');
const controls = document.getElementById('em-controls');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const number = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 2});
const pause = document.getElementById('em-pause');
const step = document.getElementById('em-step');
let renderer, experiment, elapsed = 0, paused = motion.matches, visible = true;
let camera, scene, resize, draw, resetView, showView, kitTick;
let requestedView = 'overview';
const VERSION = document.querySelector('script[src*="electromagnetism.js"]')?.src.split('v=')[1] || '1';

function readState() {
  return Object.fromEntries([...controls.querySelectorAll('input[name]')].map(input => [input.name, input.type === 'checkbox' ? input.checked : Number(input.value)]));
}

function syncControls() {
  for (const output of controls.querySelectorAll('output[data-value]')) {
    output.value = number.format(state[output.dataset.value]) + (output.dataset.unit || '');
  }
  pause.textContent = paused ? 'Animation starten' : 'Animation pausieren';
  pause.setAttribute('aria-pressed', String(paused));
  step.disabled = !paused;
}

function fallback(message) {
  if (renderer) renderer.domElement.hidden = true;
  host.querySelectorAll('.em-labels, .em-zoom, .em-canvas-hint').forEach(element => { element.hidden = true; });
  let text = host.querySelector('.em-loading');
  if (!text) { text = document.createElement('p'); text.className = 'em-loading'; host.append(text); }
  text.textContent = message;
  document.getElementById('em-static')?.setAttribute('open', '');
  host.dataset.status = 'fallback';
}

let state = readState();
let samples = [], lastSample = -1, lastReadout = -1, graphLabel = '';
const graphHost = document.createElement('div');
graphHost.className = 'em-graph'; graphHost.hidden = true;
graphHost.innerHTML = '<div class="em-graph-title"><span></span><small>Letzte 8 s Modellzeit</small></div><svg viewBox="0 0 720 110" role="img" aria-label="Spannungsverlauf über die Modellzeit"><path class="em-graph-grid" d="M42 15H700M42 55H700M42 95H700M42 15V95"/><text x="3" y="19" class="em-graph-max"></text><text x="15" y="59">0</text><text x="3" y="100" class="em-graph-min"></text><path class="em-graph-line"/><circle class="em-graph-dot" r="4"/></svg>';
host.closest('.em-lab').querySelector('.em-metrics').after(graphHost);

function showReadout(result, force = false) {
  if (result.graph && elapsed !== lastSample && (force || elapsed - lastSample >= .05)) {
    lastSample = elapsed;
    const {value, max, label} = result.graph;
    if (Number.isFinite(value) && Number.isFinite(max)) {
      samples.push({t: elapsed, value});
      samples = samples.filter(sample => elapsed - sample.t <= 8).slice(-240);
      const scale = Math.max(Math.abs(max), ...samples.map(sample => Math.abs(sample.value)), .001);
      const points = samples.map(sample => [700 - (elapsed - sample.t) / 8 * 658, 55 - sample.value / scale * 38]);
      graphHost.hidden = false;
      graphHost.querySelector('.em-graph-line').setAttribute('d', points.map(([x,y],i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(''));
      const last = points.at(-1);
      graphHost.querySelector('circle').setAttribute('cx', last[0]);
      graphHost.querySelector('circle').setAttribute('cy', last[1]);
      graphHost.querySelector('.em-graph-max').textContent = '+' + number.format(scale);
      graphHost.querySelector('.em-graph-min').textContent = '−' + number.format(scale);
      if (graphLabel !== label) { graphLabel = label; graphHost.querySelector('.em-graph-title span').textContent = label; }
    }
  }
  if (!force && elapsed - lastReadout < .1) return;
  lastReadout = elapsed;
  const metrics = document.getElementById('em-metrics');
  if (metrics.children.length !== result.metrics.length) {
    metrics.replaceChildren(...result.metrics.map(() => {
      const item = document.createElement('div'); item.append(document.createElement('span'), document.createElement('strong')); return item;
    }));
  }
  result.metrics.forEach((metric, i) => {
    metrics.children[i].firstChild.textContent = metric.label;
    metrics.children[i].lastChild.textContent = metric.value;
  });
  document.getElementById('em-note').textContent = result.note;
}

function refresh(force = true) {
  if (!experiment) return;
  showReadout(experiment.update(state, elapsed), force);
  kitTick?.(elapsed);
  draw?.();
}

function clearGraph() { samples = []; lastSample = lastReadout = -1; }
controls.addEventListener('submit', event => event.preventDefault());
controls.addEventListener('input', () => {
  const previous = state; state = readState();
  if (previous.speed !== state.speed) elapsed = 0;
  clearGraph(); syncControls(); refresh();
});
document.querySelectorAll('[data-preset], [data-view]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.preset) {
    for (const [key, value] of Object.entries(JSON.parse(button.dataset.preset))) {
      const input = controls.elements.namedItem(key);
      if (input) { if (input.type === 'checkbox') input.checked = value; else input.value = value; }
    }
    state = readState(); elapsed = 0; clearGraph();
  }
  if (button.dataset.view) {
    requestedView = button.dataset.view;
    showView?.(requestedView);
  }
  if (!controls.contains(button)) {
    if (paused && !motion.matches) paused = false;
    document.getElementById('experiment')?.scrollIntoView({behavior: motion.matches ? 'auto' : 'smooth', block: 'start'});
  }
  syncControls(); refresh();
}));
pause.addEventListener('click', () => { paused = !paused; syncControls(); refresh(); });
step.addEventListener('click', () => { paused = true; elapsed += .1; syncControls(); refresh(); });
document.getElementById('em-reset').addEventListener('click', () => {
  controls.reset(); state = readState(); elapsed = 0; paused = motion.matches;
  clearGraph(); resetView?.(); syncControls(); refresh();
});
document.getElementById('em-view').addEventListener('click', () => { resetView?.(); refresh(); });
motion.addEventListener('change', () => { if (motion.matches) paused = true; syncControls(); refresh(); });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(host);

try {
  if (!topics.has(page.dataset.experiment)) throw new Error('Unknown experiment');
  const [module, {OrbitControls}, {RoomEnvironment}, {CSS2DRenderer}, {createKit}] = await Promise.all([
    import(`./experiments/${page.dataset.experiment}.js?v=${VERSION}`),
    import('./vendor/OrbitControls.js'),
    import('./vendor/RoomEnvironment.js'),
    import('./vendor/CSS2DRenderer.js'),
    import(`./em-kit.js?v=${VERSION}`),
  ]);
  scene = new THREE.Scene();
  const group = new THREE.Group(); scene.add(group);
  const kit = createKit(THREE, group);
  experiment = module.createExperiment({THREE, group, kit});
  const view = Object.assign({target: [0, 0.2, 0], distance: 12, yaw: 0.35, pitch: 0.38, fov: 34, floor: -1.5, shadowSize: 8}, experiment.camera || {});
  camera = new THREE.PerspectiveCamera(view.fov, 1, .05, 120);

  // Soft studio light: environment for reflections, one shadow-casting key light, gentle fill.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd9cf, 0.55));
  const key = new THREE.DirectionalLight(0xfff1de, 2.4);
  key.position.set(-5, 9, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdcefff, 0.7);
  fill.position.set(6, 3, -5); scene.add(fill);

  // Shadow catcher on a cream studio floor that fades into the background.
  const floorTexture = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); const r = g.createRadialGradient(256, 256, 30, 256, 256, 256);
    r.addColorStop(0, 'rgba(236,240,230,1)'); r.addColorStop(.55, 'rgba(232,237,226,.85)'); r.addColorStop(1, 'rgba(232,237,226,0)');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(view.shadowSize * 2.2, 64), new THREE.MeshBasicMaterial({map: floorTexture, transparent: true, depthWrite: false}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = view.floor - .002; scene.add(floor);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(view.shadowSize * 1.6, 64), new THREE.ShadowMaterial({opacity: .16}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = view.floor; shadow.receiveShadow = true; scene.add(shadow);

  try {
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = view.shadowSize;
    Object.assign(key.shadow.camera, {left: -s, right: s, top: s, bottom: -s, near: .5, far: 40});
    key.shadow.radius = 4; key.shadow.normalBias = .02; key.shadow.bias = -.0004;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environmentIntensity = .9;
    pmrem.dispose();

    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interaktives 3D-Modell. Ziehen oder Pfeiltasten: drehen. Mausrad, Pinch oder Plus/Minus: zoomen. Pos1: Ansicht zurücksetzen.');
    canvas.setAttribute('aria-describedby', 'em-note');
    host.querySelector('.em-loading')?.remove();
    host.prepend(canvas); host.dataset.status = 'ready';

    const labels = new CSS2DRenderer();
    labels.domElement.className = 'em-labels';
    host.append(labels.domElement);

    const controls3d = new OrbitControls(camera, canvas);
    controls3d.enableDamping = true; controls3d.dampingFactor = .09;
    controls3d.enablePan = false;
    controls3d.minPolarAngle = .15; controls3d.maxPolarAngle = Math.PI / 2 - .04;
    controls3d.rotateSpeed = .7; controls3d.zoomSpeed = .8;
    controls3d.target.set(...view.target);
    let baseDistance = view.distance;
    const placeCamera = (v = view, distance = baseDistance) => {
      // Flush any drag inertia before applying an exact teaching view.
      controls3d.enableDamping = false; controls3d.update();
      const t = new THREE.Vector3(...(v.target || view.target));
      const yaw = v.yaw ?? view.yaw, pitch = v.pitch ?? view.pitch;
      const d = distance * (v.zoom ?? 1);
      camera.position.set(t.x + d * Math.sin(yaw) * Math.cos(pitch), t.y + d * Math.sin(pitch), t.z + d * Math.cos(yaw) * Math.cos(pitch));
      controls3d.target.copy(t); controls3d.update(); controls3d.enableDamping = true;
    };
    resetView = () => { requestedView = 'overview'; host.dataset.view = requestedView; placeCamera(); };
    // Camera presets that the article can trigger ("Im Modell zeigen").
    showView = (name) => {
      const v = experiment.views?.[name];
      if (v) { requestedView = name; host.dataset.view = name; placeCamera({...view, ...v}); }
    };
    canvas.addEventListener('keydown', event => {
      if (event.key === 'Home') { event.preventDefault(); resetView(); }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const offset = camera.position.clone().sub(controls3d.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        if (event.key === 'ArrowLeft') spherical.theta -= .08;
        if (event.key === 'ArrowRight') spherical.theta += .08;
        if (event.key === 'ArrowUp') spherical.phi -= .08;
        if (event.key === 'ArrowDown') spherical.phi += .08;
        spherical.phi = Math.max(controls3d.minPolarAngle, Math.min(controls3d.maxPolarAngle, spherical.phi));
        camera.position.copy(controls3d.target).add(offset.setFromSpherical(spherical));
        controls3d.update();
      }
      if (event.key === '+' || event.key === '=' || event.key === '-') {
        event.preventDefault();
        const dir = camera.position.clone().sub(controls3d.target);
        dir.multiplyScalar(event.key === '-' ? 1.12 : .89);
        const len = Math.min(controls3d.maxDistance, Math.max(controls3d.minDistance, dir.length()));
        camera.position.copy(controls3d.target).add(dir.setLength(len)); controls3d.update();
      }
    });

    const hint = document.createElement('p'); hint.className = 'em-canvas-hint';
    hint.textContent = 'Ziehen: drehen · Mausrad/Pinch: zoomen'; host.append(hint);
    const zoomTools = document.createElement('div'); zoomTools.className = 'em-zoom';
    for (const [title, text, factor] of [['Vergrößern', '+', .86], ['Verkleinern', '−', 1.16]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.setAttribute('aria-label', title);
      button.addEventListener('click', () => {
        const dir = camera.position.clone().sub(controls3d.target).multiplyScalar(factor);
        const len = Math.min(controls3d.maxDistance, Math.max(controls3d.minDistance, dir.length()));
        camera.position.copy(controls3d.target).add(dir.setLength(len)); controls3d.update(); draw?.();
      });
      zoomTools.append(button);
    }
    host.append(zoomTools);

    resize = () => {
      const {width, height} = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false); labels.setSize(width, height);
      camera.aspect = width / height;
      // Keep the whole apparatus in frame on narrow screens.
      const previousDistance = baseDistance;
      baseDistance = view.distance * Math.max(1, (view.fitAspect ?? 1.55) / camera.aspect);
      controls3d.minDistance = baseDistance * .18; controls3d.maxDistance = baseDistance * 1.8;
      camera.updateProjectionMatrix();
      if (!host.dataset.view) showView(requestedView);
      else {
        const offset = camera.position.clone().sub(controls3d.target).multiplyScalar(baseDistance / previousDistance);
        camera.position.copy(controls3d.target).add(offset); controls3d.update();
      }
      draw?.();
    };
    draw = () => {
      if (host.dataset.status !== 'ready') return;
      controls3d.update();
      renderer.render(scene, camera); labels.render(scene, camera); kit.layoutLabels(host);
    };
    kitTick = (t) => kit.tick(t);
    new ResizeObserver(resize).observe(host); resize();
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback('Die 3D-Ansicht wurde unterbrochen. Regler, Messwerte und Schaubild bleiben nutzbar. Lade die Seite neu, um 3D erneut zu starten.'); });
  } catch (error) {
    console.error(error);
    fallback('3D ist in diesem Browser nicht verfügbar. Probiere die Regler mit den Messwerten aus und nutze das Schaubild darunter.');
  }
  syncControls(); refresh();
  let last = performance.now(), lastPaint = last;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1); last = now;
    if (document.hidden || !visible) return;
    if (paused) { if (now - lastPaint > 32) { lastPaint = now; draw?.(); } return; }
    elapsed += dt;
    if (now - lastPaint < 16) return;
    lastPaint = now; refresh(false);
  }
  requestAnimationFrame(frame);
} catch (error) {
  fallback('Das interaktive Modell konnte nicht geladen werden. Das Schaubild, die Erklärungen und die Aufgaben stehen dir weiter zur Verfügung.');
  console.error('Experiment konnte nicht gestartet werden:', error);
  for (const button of document.querySelectorAll('.em-toolbar button')) button.disabled = true;
}
