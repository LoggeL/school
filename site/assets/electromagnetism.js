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
let camera, scene, resize, draw, resetView;

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
  draw?.();
}

function clearGraph() { samples = []; lastSample = lastReadout = -1; }
controls.addEventListener('submit', event => event.preventDefault());
controls.addEventListener('input', () => {
  const previous = state; state = readState();
  if (previous.speed !== state.speed) elapsed = 0;
  clearGraph(); syncControls(); refresh();
});
controls.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  for (const [key, value] of Object.entries(JSON.parse(button.dataset.preset))) {
    const input = controls.elements.namedItem(key);
    if (input) { if (input.type === 'checkbox') input.checked = value; else input.value = value; }
  }
  state = readState(); elapsed = 0; clearGraph(); syncControls(); refresh();
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
  const module = await import(`./experiments/${page.dataset.experiment}.js?v=20261026-1`);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x142b28);
  scene.fog = new THREE.Fog(0x142b28, 22, 45);
  const group = new THREE.Group(); scene.add(group);
  experiment = module.createExperiment({THREE, group});
  camera = new THREE.PerspectiveCamera(38, 1, .1, 70);
  scene.add(new THREE.HemisphereLight(0xddece7, 0x172a22, 2.8));
  const key = new THREE.DirectionalLight(0xffe0b4, 4.5);
  key.position.set(-4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb1e8ec, 3);
  rim.position.set(3, 4, -4); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({color: 0x1a3630, roughness: .95}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.5; scene.add(floor);
  const grid = new THREE.GridHelper(20, 40, 0x34554c, 0x25473e);
  grid.position.y = -1.49; scene.add(grid);

  let yaw = .30, pitch = .32, distance = 13, zoom = 1;
  function orient() {
    const radius = distance * zoom;
    camera.position.set(radius * Math.sin(yaw) * Math.cos(pitch), .3 + radius * Math.sin(pitch), radius * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, .3, 0);
  }
  resetView = () => { yaw = .30; pitch = .32; zoom = 1; orient(); };
  orient();

  try {
    renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {left: -7, right: 7, top: 6, bottom: -6, near: .5, far: 25});
    key.shadow.normalBias = .035;
    floor.receiveShadow = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interaktives 3D-Modell. Ziehen oder Pfeiltasten: drehen. Plus und Minus: zoomen. Pos1: Ansicht zurücksetzen.');
    canvas.setAttribute('aria-describedby', 'em-note');
    host.querySelector('.em-loading')?.remove();
    host.prepend(canvas); host.dataset.status = 'ready';

    // A locally generated studio reflection brings out the copper and steel.
    const bitmap = document.createElement('canvas'); bitmap.width = 512; bitmap.height = 256;
    const ctx = bitmap.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#d9e5dc'); gradient.addColorStop(.5, '#657e72'); gradient.addColorStop(1, '#20372e');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#fff0db'; ctx.fillRect(60, 25, 85, 100);
    ctx.fillStyle = '#dbf4ee'; ctx.fillRect(340, 30, 45, 125);
    const texture = new THREE.CanvasTexture(bitmap);
    texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    texture.dispose(); pmrem.dispose();

    const hint = document.createElement('p'); hint.className = 'em-canvas-hint';
    hint.textContent = 'Ziehen zum Drehen · + / − zum Zoomen'; host.append(hint);
    const zoomTools = document.createElement('div'); zoomTools.className = 'em-zoom';
    for (const [title, text, amount] of [['Vergrößern', '+', -.12], ['Verkleinern', '−', .12]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.setAttribute('aria-label', title);
      button.addEventListener('click', () => { zoom = Math.max(.65, Math.min(1.7, zoom + amount)); orient(); refresh(); });
      zoomTools.append(button);
    }
    host.append(zoomTools);
    let drag = null;
    canvas.addEventListener('pointerdown', event => { drag = {x: event.clientX, y: event.clientY}; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', event => {
      if (!drag) return;
      yaw -= (event.clientX - drag.x) * .008;
      pitch = Math.max(-.1, Math.min(1.2, pitch + (event.clientY - drag.y) * .006));
      drag = {x: event.clientX, y: event.clientY}; orient(); refresh();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { drag = null; });
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '=', '-'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') yaw -= .12;
      if (event.key === 'ArrowRight') yaw += .12;
      if (event.key === 'ArrowUp') pitch = Math.min(1.2, pitch + .12);
      if (event.key === 'ArrowDown') pitch = Math.max(-.1, pitch - .12);
      if (event.key === '+' || event.key === '=') zoom = Math.max(.65, zoom - .12);
      if (event.key === '-') zoom = Math.min(1.7, zoom + .12);
      if (event.key === 'Home') resetView();
      orient(); refresh();
    });
    resize = () => {
      const {width, height} = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false); camera.aspect = width / height;
      distance = Math.max(11.8, 4.5 / (Math.tan(19 * Math.PI / 180) * camera.aspect));
      camera.updateProjectionMatrix(); orient(); draw?.();
    };
    draw = () => { if (host.dataset.status === 'ready') renderer.render(scene, camera); };
    new ResizeObserver(resize).observe(host); resize();
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback('Die 3D-Ansicht wurde unterbrochen. Regler, Messwerte und Schaubild bleiben nutzbar. Lade die Seite neu, um 3D erneut zu starten.'); });
  } catch {
    fallback('3D ist in diesem Browser nicht verfügbar. Probiere die Regler mit den Messwerten aus und nutze das Schaubild darunter.');
  }
  syncControls(); refresh();
  let last = performance.now(), lastPaint = last;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1); last = now;
    if (document.hidden || !visible || paused) return;
    elapsed += dt;
    if (now - lastPaint < 32) return;
    lastPaint = now; refresh(false);
  }
  requestAnimationFrame(frame);
} catch (error) {
  fallback('Das interaktive Modell konnte nicht geladen werden. Das Schaubild, die Erklärungen und die Aufgaben stehen dir weiter zur Verfügung.');
  console.error('Experiment konnte nicht gestartet werden:', error);
  for (const button of document.querySelectorAll('.em-toolbar button')) button.disabled = true;
}
