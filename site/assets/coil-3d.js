import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const host = document.getElementById('model');
try {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x182e28);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.querySelector('.loading-3d').remove();
  host.prepend(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Drehbares 3D-Modell einer Spule. Mit Pfeiltasten oder horizontalem Ziehen drehen.');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x182e28, 16, 28);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  const assembly = new THREE.Group();
  scene.add(assembly);

  // A studio reflection map gives the copper a readable surface, without an external image.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1024; envCanvas.height = 512;
  const envContext = envCanvas.getContext('2d');
  const gradient = envContext.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#aebcb1'); gradient.addColorStop(.4, '#65796d');
  gradient.addColorStop(.6, '#263b30'); gradient.addColorStop(1, '#11231c');
  envContext.fillStyle = gradient; envContext.fillRect(0, 0, 1024, 512);
  envContext.fillStyle = '#fff4de'; envContext.fillRect(160, 48, 125, 155);
  envContext.fillStyle = '#c1d5d1'; envContext.fillRect(720, 75, 75, 190);
  const environment = new THREE.CanvasTexture(envCanvas);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(environment).texture;
  environment.dispose(); pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xe6edd6, 0x163025, 1.8));
  const key = new THREE.DirectionalLight(0xffe2b3, 3.2);
  key.position.set(-3, 6, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -7, right: 7, top: 6, bottom: -6, near: .5, far: 20});
  key.shadow.normalBias = .035; key.shadow.bias = -.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb5d6d1, 2.4);
  rim.position.set(3, 2, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc9d4b9, .75);
  fill.position.set(-5, .5, -1); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({color: 0x21392e, roughness: 1}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.365; ground.receiveShadow = true; scene.add(ground);

  const copper = new THREE.MeshStandardMaterial({color: 0xb87539, metalness: .83, roughness: .25, envMapIntensity: 1.5});
  const dynamicCoil = new THREE.Mesh(new THREE.BufferGeometry(), copper);
  dynamicCoil.castShadow = true; dynamicCoil.receiveShadow = true; assembly.add(dynamicCoil);
  const fallbackCore = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 5.1, 48), new THREE.MeshStandardMaterial({color: 0x718078, metalness: .75, roughness: .3}));
  fallbackCore.rotation.z = Math.PI / 2; fallbackCore.castShadow = true; assembly.add(fallbackCore);
  const fallbackBase = new THREE.Mesh(new THREE.BoxGeometry(5.7, .18, 2), new THREE.MeshStandardMaterial({color: 0x354d3e, roughness: .7}));
  fallbackBase.position.y = -1.15; fallbackBase.receiveShadow = true; fallbackBase.castShadow = true; assembly.add(fallbackBase);

  let state = window.coilState || {current: .5, turns: 400, core: false, reverse: false, paused: false};
  let previousTurns = 0;
  let blenderCoil, coreAssembly, mixer, insertion, insertionDuration = 0;
  let modelLoaded = false, coreTarget = false, coreTransitioning = false;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

  // The Blender-authored InsertCore animation is played in both directions.
  // Pausing or reduced motion resolves a newly selected core state immediately.
  function syncCore(force = false) {
    if (!coreAssembly || !insertion) return;
    const changed = coreTarget !== state.core;
    coreTarget = state.core;
    if (force || motionPreference.matches || (changed && state.paused)) {
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

  new GLTFLoader().load('/assets/models/solenoid-v2.glb', gltf => {
    const physicalModel = gltf.scene;
    physicalModel.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      if (node.material) node.material.envMapIntensity = 1.25;
    });
    blenderCoil = physicalModel.getObjectByName('Coil');
    coreAssembly = physicalModel.getObjectByName('IronCoreAssembly');
    assembly.add(physicalModel);
    modelLoaded = true;
    fallbackBase.visible = false; fallbackCore.visible = false;
    const clip = THREE.AnimationClip.findByName(gltf.animations, 'InsertCore');
    if (coreAssembly && clip) {
      mixer = new THREE.AnimationMixer(physicalModel);
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
    update(state);
    host.dataset.geometry = 'blender';
  }, undefined, () => {
    // The procedural version is still fully usable if the static model cannot load.
    host.dataset.geometry = 'fallback';
  });

  const fieldPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, 0, 0), new THREE.Vector3(-1.4, 0, 0),
    new THREE.Vector3(1.4, 0, 0), new THREE.Vector3(2.6, 0, 0),
    new THREE.Vector3(3.15, .8, 0), new THREE.Vector3(2.1, 1.55, 0),
    new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(-2.1, 1.55, 0),
    new THREE.Vector3(-3.15, .8, 0)
  ], true, 'catmullrom', .3);
  const tracks = [];
  const dotGeometry = new THREE.SphereGeometry(.034, 8, 6);
  const dotMaterial = new THREE.MeshBasicMaterial({color: 0xc5dfac});
  const arrowGeometry = new THREE.ConeGeometry(.038, .13, 7);
  const arrowMaterial = new THREE.MeshBasicMaterial({color: 0xa6c693, transparent: true, opacity: .8});
  for (let j = 0; j < 6; j++) {
    const group = new THREE.Group(); group.rotation.x = j * Math.PI / 3;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(fieldPath.getPoints(220)), new THREE.LineBasicMaterial({color: 0x8aac7c, transparent: true, opacity: .3}));
    group.add(line);
    const dots = [];
    for (let k = 0; k < 4; k++) { const dot = new THREE.Mesh(dotGeometry, dotMaterial); group.add(dot); dots.push(dot); }
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.copy(fieldPath.getPointAt(.65)); group.add(arrow);
    assembly.add(group); tracks.push({group, line, dots, arrow});
  }
  function label(text, color, x) {
    const bitmap = document.createElement('canvas'); bitmap.width = 128; bitmap.height = 128;
    const ctx = bitmap.getContext('2d');
    ctx.fillStyle = '#1e342de6'; ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.globalAlpha = .35; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.font = '500 39px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 64, 65);
    const texture = new THREE.CanvasTexture(bitmap); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, depthTest: false}));
    sprite.scale.set(.85, .85, 1); sprite.position.set(x, .05, 0); assembly.add(sprite); return sprite;
  }
  const north = label('N', '#efbe8c', 3.65), south = label('S', '#a5cfca', -3.65);
  function update(next) {
    state = next;
    fallbackCore.visible = !modelLoaded && state.core;
    if (coreAssembly && !insertion) coreAssembly.visible = state.core;
    syncCore();
    if (previousTurns !== state.turns) {
      const count = Math.round(state.turns * .03), points = [];
      for (let i = 0; i <= count * 60; i++) {
        const t = i / (count * 60), angle = t * count * Math.PI * 2;
        points.push(new THREE.Vector3(-2.1 + t * 4.2, .73 * Math.cos(angle), .73 * Math.sin(angle)));
      }
      dynamicCoil.geometry.dispose();
      dynamicCoil.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), count * 60, .055, 10, false);
      previousTurns = state.turns;
    }
    if (blenderCoil) blenderCoil.visible = state.turns === 400;
    dynamicCoil.visible = !blenderCoil || state.turns !== 400;
    north.position.x = state.reverse ? -3.65 : 3.65; south.position.x = -north.position.x;
    north.visible = south.visible = state.current > 0;
    tracks.forEach(track => {
      track.group.visible = state.current > 0;
      track.line.material.opacity = Math.min(.62, .16 + state.current * state.turns / 1800 + (state.core ? .1 : 0));
      const tangent = fieldPath.getTangentAt(.65).multiplyScalar(state.reverse ? -1 : 1);
      track.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    });
    canvas.setAttribute('aria-label', document.getElementById('model-description').textContent + ' Mit Pfeiltasten oder Ziehen drehen.');
  }
  addEventListener('coilchange', event => update(event.detail)); update(state);
  motionPreference.addEventListener('change', () => syncCore(true));

  let yaw = .24, pitch = .27, drag = null, cameraDistance = 10.8;
  function orient() {
    camera.position.set(cameraDistance * Math.sin(yaw) * Math.cos(pitch), cameraDistance * Math.sin(pitch), cameraDistance * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, -.2, 0);
  }
  orient();
  canvas.addEventListener('pointerdown', event => { drag = {x: event.clientX, y: event.clientY}; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    yaw -= (event.clientX - drag.x) * .008;
    pitch = Math.max(-.25, Math.min(1.1, pitch + (event.clientY - drag.y) * .006));
    drag = {x: event.clientX, y: event.clientY}; orient();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= .12;
    if (event.key === 'ArrowRight') yaw += .12;
    if (event.key === 'ArrowUp') pitch = Math.min(1.1, pitch + .12);
    if (event.key === 'ArrowDown') pitch = Math.max(-.25, pitch - .12);
    if (event.key === 'Home') { yaw = .24; pitch = .27; }
    orient();
  });
  function resize() {
    if (host.hidden) return;
    const {width, height} = host.getBoundingClientRect();
    if (width && height) {
      renderer.setSize(width, height, false); camera.aspect = width / height;
      cameraDistance = Math.max(10.8, 4.55 / (Math.tan(Math.PI / 10) * camera.aspect));
      orient(); camera.updateProjectionMatrix();
    }
  }
  new ResizeObserver(resize).observe(host); addEventListener('coilresize', resize);
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(host);
  let last = 0, phase = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden || host.hidden) return;
    if (!state.paused && !motionPreference.matches) {
      phase += (state.reverse ? -1 : 1) * delta * (.035 + .065 * state.current);
      if (mixer) mixer.update(delta);
    }
    tracks.forEach(track => track.dots.forEach((dot, i) => dot.position.copy(fieldPath.getPointAt(((phase + i / 4) % 1 + 1) % 1))));
    renderer.render(scene, camera);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); dispatchEvent(new Event('coilfailed')); });
  requestAnimationFrame(frame); dispatchEvent(new Event('coilready')); resize();
} catch (error) {
  console.warn('3D-Modell nicht verfügbar. Das Schnittbild bleibt nutzbar.');
  dispatchEvent(new Event('coilfailed'));
}
