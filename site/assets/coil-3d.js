import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { CSS2DRenderer } from './vendor/CSS2DRenderer.js';
import { createKit } from './em-kit.js?v=20261026-v3';

// Scene contract shared with the other chapters; the legacy coilchange UI
// below remains the entry point for the original coil article.
export function createExperiment({THREE, group, kit, loadApparatus = true, onGeometry}) {
  const assembly = group;
  // ---------- winding (procedural so the visible count follows N) ----------
  const COIL_R = .73, COIL_L = 4.2, WIRE_R = .055;
  const dynamicCoil = new THREE.Mesh(new THREE.BufferGeometry(), kit.mats.copper);
  dynamicCoil.castShadow = true; dynamicCoil.receiveShadow = true; assembly.add(dynamicCoil);
  const fallbackCore = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 5.1, 48), kit.mats.iron);
  fallbackCore.rotation.z = Math.PI / 2; fallbackCore.castShadow = true; assembly.add(fallbackCore);
  const fallbackBase = kit.roundedBox([5.9, .3, 1.65], .08, kit.mats.ceramic, [0, -1.2, 0]);

  // Dots ride on the outside of the wire. Angle increasing along the helix is
  // counter-clockwise seen from +x, so with forward motion the field inside
  // points to +x (right-hand rule): the north pole is on the right.
  let currentDots = null, dotOffset = 0;
  function buildWinding(turns) {
    const count = Math.max(4, Math.round(turns * .03));
    const curve = kit.helixCurve({radius: COIL_R, length: COIL_L, turns: count});
    dynamicCoil.geometry.dispose();
    dynamicCoil.geometry = new THREE.TubeGeometry(curve, count * 64, WIRE_R, 10, false);
    if (currentDots) { assembly.remove(currentDots.mesh); currentDots.mesh.geometry.dispose(); currentDots.material.dispose(); }
    const outer = kit.helixCurve({radius: COIL_R + WIRE_R * .7, length: COIL_L, turns: count});
    currentDots = kit.dots(outer, {count: count * 4, radius: .05, color: 0xffd36b, emissive: 1.4});
  }

  // ---------- field lines: traced solenoid field (Biot–Savart over rings) ----------
  const RINGS = 28, SEGMENTS = 28;
  const ringX = Array.from({length: RINGS}, (_, k) => -COIL_L / 2 + (k + .5) * COIL_L / RINGS);
  const segs = [];
  for (const x of ringX) for (let s = 0; s < SEGMENTS; s++) {
    const a0 = s / SEGMENTS * Math.PI * 2, a1 = (s + 1) / SEGMENTS * Math.PI * 2, am = (a0 + a1) / 2;
    segs.push({
      p: new THREE.Vector3(x, COIL_R * Math.cos(am), COIL_R * Math.sin(am)),
      dl: new THREE.Vector3(0, COIL_R * (Math.cos(a1) - Math.cos(a0)), COIL_R * (Math.sin(a1) - Math.sin(a0))),
    });
  }
  const r = new THREE.Vector3(), c = new THREE.Vector3();
  function solenoidField(p) {
    const B = new THREE.Vector3();
    for (const {p: q, dl} of segs) {
      r.subVectors(p, q);
      const d2 = Math.max(r.lengthSq(), .004);
      c.crossVectors(dl, r).multiplyScalar(1 / (d2 * Math.sqrt(d2)));
      B.add(c);
    }
    return B;
  }
  // Lines stay in meridian planes (axial symmetry): trace once, rotate copies.
  const startRadii = [.58, .64, .69];
  const traced = startRadii.map(rho => {
    const start = new THREE.Vector3(0, rho, 0);
    return kit.traceField(solenoidField, start, {step: .04, maxSteps: 1400, bounds: 6, stop: (p, i) => i > 30 && p.distanceTo(start) < .07});
  });
  const fieldLines = [];
  const azimuths = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
  for (const az of azimuths) for (const side of [1, -1]) traced.forEach((points, i) => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), az + (side < 0 ? Math.PI : 0));
    const rotated = points.map(p => p.clone().applyQuaternion(q));
    const closed = rotated.at(-1).distanceTo(rotated[0]) < .12;
    const line = kit.flowLine(rotated, {color: 0x1f7a52, radius: .019, closed, speed: .3, opacity: 2.1, width: .35});
    line.mesh.userData.inner = i === 0;
    line.radiusIndex = i; line.azIndex = azimuths.indexOf(az);
    fieldLines.push(line);
  });

  const north = kit.label('N', [3.25, -.05, 0], {tone: 'n'});
  const south = kit.label('S', [-3.25, -.05, 0], {tone: 'south'});
  const coreLabel = kit.label('Eisenkern', [0, .95, .5], {tone: 'dark', size: 's'});
  const currentLabel = kit.label('technische Stromrichtung', [1.4, -.95, .95], {tone: 'copper', size: 's'});

  // ---------- GLB apparatus ----------
  const bobbinGlass = new THREE.MeshPhysicalMaterial({color: 0xf3efe4, roughness: .35, metalness: 0, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide});
  let state = {current: .5, turns: 400, core: false, reverse: false, paused: false};
  let lastTime = null;
  let previousTurns = 0;
  let coreAssembly, mixer, insertion, insertionDuration = 0;
  let modelLoaded = false, coreTarget = false, coreTransitioning = false;
  const terminals = {};

  function syncCore(force = false) {
    if (!coreAssembly || !insertion) return;
    const changed = coreTarget !== state.core;
    coreTarget = state.core;
    if (force || (changed && state.paused)) {
      coreTransitioning = false;
      coreAssembly.visible = state.core;
      insertion.paused = true;
      insertion.time = state.core ? insertionDuration : 0;
      mixer.update(0);
    } else if (changed) {
      coreTransitioning = true;
      coreAssembly.visible = true;
      insertion.enabled = true;
      insertion.paused = false;
      insertion.timeScale = state.core ? 1 : -1;
      insertion.play();
    } else if (coreTransitioning) {
      insertion.paused = state.paused;
    }
  }

  if (loadApparatus) new GLTFLoader().load('/assets/models/solenoid-v2.glb', gltf => {
    const model = gltf.scene;
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      const name = (node.name + ' ' + (node.parent?.name || '')).toLowerCase();
      if (node.name === 'TerminalCapLeft') terminals.left = node;
      if (node.name === 'TerminalCapRight') terminals.right = node;
      if (name.includes('ironcore') || name.includes('coreedge')) node.material = kit.mats.iron;
      else if (name.includes('bobbin') || name.includes('flange')) node.material = bobbinGlass; // see the field inside
      else if (name.includes('support')) node.material = kit.mats.ceramic;
      else if (name.includes('base')) node.material = kit.mats.base;
      else if (name.includes('lead')) node.material = kit.mats.copper;
      else if (node.material) node.material.envMapIntensity = 1;
    });
    const blenderCoil = model.getObjectByName('Coil');
    if (blenderCoil) blenderCoil.visible = false; // replaced by the procedural winding that follows N
    coreAssembly = model.getObjectByName('IronCoreAssembly');
    assembly.add(model);
    modelLoaded = true;
    fallbackBase.visible = false; fallbackCore.visible = false;
    const clip = THREE.AnimationClip.findByName(gltf.animations, 'InsertCore');
    if (coreAssembly && clip) {
      mixer = new THREE.AnimationMixer(model);
      insertion = mixer.clipAction(clip);
      insertionDuration = clip.duration;
      insertion.setLoop(THREE.LoopOnce, 1);
      insertion.clampWhenFinished = true;
      insertion.play();
      syncCore(true);
      mixer.addEventListener('finished', () => { coreTransitioning = false; if (!coreTarget) coreAssembly.visible = false; });
    } else if (coreAssembly) {
      coreAssembly.position.x = 0;
      coreAssembly.visible = state.core;
    }
    update(state, lastTime ?? 0);
    onGeometry?.('blender');
  }, undefined, () => { onGeometry?.('fallback'); });

  // ---------- state → scene ----------
  function update(next, time = 0) {
    const dt = lastTime === null ? 0 : Math.max(0, Math.min(.05, time - lastTime));
    const stopped = next.paused ?? (lastTime !== null && time === lastTime);
    lastTime = time;
    state = {...next, paused: stopped};
    fallbackCore.visible = !modelLoaded && state.core;
    if (coreAssembly && !insertion) coreAssembly.visible = state.core;
    syncCore();
    if (previousTurns !== state.turns) { buildWinding(state.turns); previousTurns = state.turns; }
    const on = state.current > 0;
    const dir = state.reverse ? -1 : 1;
    if (terminals.left) terminals.left.material = state.reverse ? kit.mats.cableBlack : kit.mats.cableRed;
    if (terminals.right) terminals.right.material = state.reverse ? kit.mats.cableRed : kit.mats.cableBlack;
    // Relative strength: B ∝ N · I (air coil), qualitative boost with the core.
    const s = state.current * state.turns / 400;
    const strength = Math.min(1, .3 + .45 * s) * (state.core ? 1 : .8);
    fieldLines.forEach(line => {
      // Air coil: fewer drawn lines (lower field-line density); core: all of them.
      const shown = on && (state.core || line.radiusIndex !== 0) && (state.core || line.azIndex % 2 === 0);
      line.set({visible: shown, strength, speed: dir * (.15 + .35 * Math.min(1.5, s)) * (state.core ? 1.3 : 1)});
    });
    north.object.position.x = 3.25 * dir; south.object.position.x = -3.25 * dir;
    north.show(on); south.show(on);
    coreLabel.show(state.core);
    currentLabel.show(on);
    if (currentDots) currentDots.mesh.visible = on;
    if (!state.paused && dt > 0) {
      if (mixer) mixer.update(dt);
      if (currentDots && on) {
        dotOffset += dir * dt * (.006 + .012 * state.current) * 12 / Math.max(6, state.turns * .03);
        currentDots.place(dotOffset);
      }
    }
    const note = on
      ? `Innen zeigt das Feld nach ${state.reverse ? 'links' : 'rechts'}, dort ist N. Außen läuft es von N nach S zurück. Goldene Punkte zeigen die technische Stromrichtung. Die dargestellte Windungszahl ist symbolisch.${state.core ? ' Die Verstärkung durch den Eisenkern wird qualitativ gezeigt.' : ''}`
      : 'Kein Strom: Im Modell verschwindet das Spulenfeld.';
    return {metrics: [
      {label: 'Stromstärke', value: `${Number(state.current).toLocaleString('de-DE')} A`},
      {label: 'Windungen', value: String(state.turns)},
      {label: 'Feldvergleich', value: !on ? 'kein Spulenfeld' : state.core ? 'stärker mit Kern' : `${(state.current * state.turns / 200).toLocaleString('de-DE')}‐fach`},
    ], note, graph: null};
  }
  update(state, 0);
  return {
    update,
    camera: {target: [0, -.15, 0], distance: 11.8, yaw: .32, pitch: .3, floor: -1.35, fitAspect: 1.6},
    views: {
      overview: {target: [0, -.15, 0], yaw: .32, pitch: .3, zoom: 1},
      coil: {target: [0, 0, 0], yaw: .5, pitch: .25, zoom: .7},
      field: {target: [0, .35, 0], yaw: 0, pitch: .12, zoom: 1},
    },
  };
}

// Coil chapter 3D model: Blender apparatus (GLB) + procedural winding, traced
// solenoid field lines and moving dots for the technical current direction.
const host = typeof document !== 'undefined' ? document.getElementById('model') : null;
if (host) try {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.querySelector('.loading-3d')?.remove();
  host.prepend(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Drehbares 3D-Modell einer Spule. Ziehen oder Pfeiltasten: drehen. Mausrad oder Pinch: zoomen.');

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'em-labels';
  host.append(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 80);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const kit = createKit(THREE, assembly);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .9;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd9cf, .55));
  const key = new THREE.DirectionalLight(0xfff1de, 2.4);
  key.position.set(-4, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 30});
  key.shadow.radius = 4; key.shadow.normalBias = .02; key.shadow.bias = -.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdcefff, .7);
  fill.position.set(6, 3, -5); scene.add(fill);

  // Cream studio floor fading into the CSS background, plus a soft shadow catcher.
  const FLOOR = -1.35;
  const floorTexture = kit.canvasTexture(512, 512, (g) => {
    const r = g.createRadialGradient(256, 256, 30, 256, 256, 256);
    r.addColorStop(0, 'rgba(236,240,230,1)'); r.addColorStop(.55, 'rgba(232,237,226,.85)'); r.addColorStop(1, 'rgba(232,237,226,0)');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshBasicMaterial({map: floorTexture, transparent: true, depthWrite: false}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR - .003; scene.add(floor);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.ShadowMaterial({opacity: .16}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = FLOOR; shadow.receiveShadow = true; scene.add(shadow);

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let state = window.coilState || {current: .5, turns: 400, core: false, reverse: false, paused: motionPreference.matches};
  let modelTime = 0;
  const experiment = createExperiment({THREE, group: assembly, kit, onGeometry: value => { host.dataset.geometry = value; }});
  const update = () => {
    const result = experiment.update(state, modelTime);
    const description = result.note + ' Ziehen oder Pfeiltasten: drehen.';
    if (canvas.getAttribute('aria-label') !== description) canvas.setAttribute('aria-label', description);
  };
  addEventListener('coilchange', event => { state = event.detail; update(); });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      const pause = document.getElementById('pause');
      pause.checked = true; pause.dispatchEvent(new Event('input', {bubbles: true}));
    }
  });
  update();

  // ---------- camera ----------
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .09;
  controls.enablePan = false;
  controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI / 2 - .04;
  controls.rotateSpeed = .7; controls.zoomSpeed = .8;

  const TARGET = new THREE.Vector3(0, -.15, 0);
  let baseDistance = experiment.camera.distance;
  function place(yaw = .32, pitch = .3) {
    camera.position.set(TARGET.x + baseDistance * Math.sin(yaw) * Math.cos(pitch), TARGET.y + baseDistance * Math.sin(pitch), TARGET.z + baseDistance * Math.cos(yaw) * Math.cos(pitch));
    controls.target.copy(TARGET); controls.update();
  }
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Home') { event.preventDefault(); place(); return; }
    const turn = {ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.08], ArrowDown: [0, .08]}[event.key];
    if (!turn) return;
    event.preventDefault();
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += turn[0];
    spherical.phi = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, spherical.phi + turn[1]));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  });

  function resize() {
    if (host.hidden) return;
    const {width, height} = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); labels.setSize(width, height);
    camera.aspect = width / height;
    baseDistance = experiment.camera.distance * Math.max(1, 1.6 / camera.aspect);
    controls.minDistance = baseDistance * .45; controls.maxDistance = baseDistance * 1.7;
    camera.updateProjectionMatrix(); place();
  }
  new ResizeObserver(resize).observe(host); addEventListener('coilresize', resize);
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(host);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden || host.hidden) return;
    if (!state.paused) {
      modelTime += delta;
    }
    update();
    kit.tick(modelTime);
    controls.update();
    renderer.render(scene, camera); labels.render(scene, camera); kit.layoutLabels(host);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); dispatchEvent(new Event('coilfailed')); });
  requestAnimationFrame(frame); dispatchEvent(new Event('coilready')); resize();
} catch (error) {
  console.warn('3D-Modell nicht verfügbar. Das Schnittbild bleibt nutzbar.', error);
  dispatchEvent(new Event('coilfailed'));
}
