// Shared modelling toolkit for the electromagnetism experiments.
// Everything is procedural: no external assets, no network.
import { CSS2DObject } from './vendor/CSS2DRenderer.js';

export function createKit(THREE, group) {
  const flows = [];
  const tickers = [];
  const labels = [];

  // ---------- materials ----------
  const physical = (params) => new THREE.MeshPhysicalMaterial(params);
  const mats = {
    copper: physical({ color: 0xc87a45, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25 }),
    copperDark: physical({ color: 0x9c5a30, metalness: 1, roughness: 0.38 }),
    iron: physical({ color: 0x5d6466, metalness: 0.75, roughness: 0.48 }),
    ironDark: physical({ color: 0x3c4244, metalness: 0.7, roughness: 0.55 }),
    steel: physical({ color: 0xb8c0c2, metalness: 0.95, roughness: 0.22 }),
    ceramic: physical({ color: 0xefe9dc, metalness: 0, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    base: physical({ color: 0x2f4a43, metalness: 0.05, roughness: 0.62 }),
    baseLight: physical({ color: 0xdfe6dc, metalness: 0, roughness: 0.75 }),
    wood: physical({ color: 0xb98a58, metalness: 0, roughness: 0.62 }),
    plastic: physical({ color: 0x24302d, metalness: 0.05, roughness: 0.45 }),
    cableRed: physical({ color: 0xb8483a, metalness: 0, roughness: 0.42 }),
    cableBlack: physical({ color: 0x23282a, metalness: 0, roughness: 0.45 }),
    magnetN: physical({ color: 0xc8664f, metalness: 0.1, roughness: 0.42, clearcoat: 0.5 }),
    magnetS: physical({ color: 0x4f7f95, metalness: 0.1, roughness: 0.42, clearcoat: 0.5 }),
    glass: physical({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.45 }),
    concrete: physical({ color: 0xc9c7bd, metalness: 0, roughness: 0.9 }),
    grass: physical({ color: 0x9db58f, metalness: 0, roughness: 0.95 }),
  };
  const mat = (color, metalness = 0, roughness = 0.5, extra = {}) => physical({ color, metalness, roughness, ...extra });

  // ---------- basic meshes ----------
  function add(object, parent = group) { parent.add(object); return object; }
  function mesh(geometry, material, position = [0, 0, 0], parent = group, { shadow = true } = {}) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = shadow; item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  // Box with softly rounded edges (cheap bevel via RoundedBox-like extrusion).
  function roundedBox(size, radius, material, position = [0, 0, 0], parent = group) {
    const [w, h, d] = size;
    const r = Math.min(radius, w / 2 - 1e-3, h / 2 - 1e-3);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const bevel = Math.min(r, d / 2) * 0.6;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(d - 2 * bevel, 0.001), bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
    geometry.translate(0, 0, -(d - 2 * bevel) / 2);
    return mesh(geometry, material, position, parent);
  }
  const box = (size, material, position, parent = group) => mesh(new THREE.BoxGeometry(...size), material, position, parent);
  const cylinder = (radius, height, material, position, parent = group, segments = 32) => mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material, position, parent);

  // Smooth cable / wire through points.
  function wire(points, radius, material, parent = group, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
    const item = mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), radius, 10, closed), material, [0, 0, 0], parent);
    item.userData.curve = curve;
    return item;
  }

  // Densely wound coil along the x axis (centered), returns mesh plus its helix curve.
  function helixCurve({ radius, length, turns, axis = 'x' }) {
    return new (class extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const a = t * turns * Math.PI * 2;
        const along = -length / 2 + t * length;
        const c = Math.cos(a) * radius, s = Math.sin(a) * radius;
        if (axis === 'x') return target.set(along, c, s);
        if (axis === 'y') return target.set(c, along, s);
        return target.set(c, s, along);
      }
    })();
  }
  function coil({ radius, length, turns, wireRadius, material = mats.copper, axis = 'x', position = [0, 0, 0], parent = group, segmentsPerTurn = 24 }) {
    const curve = helixCurve({ radius, length, turns, axis });
    const geometry = new THREE.TubeGeometry(curve, Math.min(4000, Math.ceil(turns * segmentsPerTurn)), wireRadius, 7, false);
    const item = mesh(geometry, material, position, parent);
    item.userData.curve = curve;
    return item;
  }

  // Solid 3D arrow (shaft + cone) pointing along +y before orientation.
  function arrow({ from = [0, 0, 0], dir = [1, 0, 0], length = 1, radius = 0.035, color = 0x2f7d5b, parent = group, opacity = 1, emissive = 0 }) {
    const holder = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0, transparent: opacity < 1, opacity, emissive: color, emissiveIntensity: emissive });
    const head = radius * 3.2, headLength = radius * 7;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(head, headLength, 18), material);
    holder.add(shaft, cone);
    holder.position.set(...from);
    parent.add(holder);
    const api = {
      group: holder, material,
      set(newDir = dir, newLength = length) {
        const v = new THREE.Vector3(...newDir);
        const len = Math.max(newLength, headLength * 1.05);
        holder.visible = newLength > 1e-4 && v.lengthSq() > 0;
        if (!holder.visible) return;
        v.normalize();
        holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
        shaft.scale.y = len - headLength; shaft.position.y = (len - headLength) / 2;
        cone.position.y = len - headLength / 2;
      },
    };
    api.set(dir, length);
    return api;
  }

  // ---------- animated flow lines (field lines, energy flow) ----------
  // A thin glowing tube whose bright "comets" travel along the curve and show direction.
  function flowMaterial(color, { opacity = 0.85, repeat = 6, width = 0.28 } = {}) {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uSpeed: { value: 0.4 }, uRepeat: { value: repeat }, uOpacity: { value: opacity }, uStrength: { value: 1 }, uWidth: { value: width } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uSpeed; uniform float uRepeat; uniform float uOpacity; uniform float uStrength; uniform float uWidth; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float rim = 0.55 + 0.45*abs(dot(vN, vV));
          float phase = fract(vUv.x*uRepeat - uTime);
          float ph = uSpeed >= 0.0 ? phase : 1.0 - phase;
          float comet = smoothstep(1.0-uWidth, 1.0, ph);
          float base = 0.28;
          float a = (base + 0.95*comet*step(0.001, abs(uSpeed))) * uOpacity * uStrength;
          vec3 c = mix(uColor, vec3(1.0), comet*0.55);
          gl_FragColor = vec4(c*rim, a);
        }`,
    });
    return material;
  }
  function flowLine(points, { color = 0x2f8f63, radius = 0.018, opacity = 0.85, repeat, speed = 0.4, parent = group, closed = false, width } = {}) {
    const curve = Array.isArray(points) ? new THREE.CatmullRomCurve3(points.map(p => p.isVector3 ? p : new THREE.Vector3(...p)), closed, 'centripetal') : points;
    const length = curve.getLength();
    const material = flowMaterial(color, { opacity, repeat: repeat ?? Math.max(1, Math.round(length / 1.1)), width });
    const item = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(40, Math.round(length * 40)), radius, 6, closed), material);
    item.renderOrder = 2;
    parent.add(item);
    const api = {
      mesh: item, curve, material,
      speed,
      set({ speed: s, strength, visible, color: c } = {}) {
        if (s !== undefined) api.speed = s;
        if (strength !== undefined) material.uniforms.uStrength.value = strength;
        if (visible !== undefined) item.visible = visible;
        if (c !== undefined) material.uniforms.uColor.value.set(c);
      },
    };
    flows.push(api);
    return api;
  }

  // Trace a field line through a vector field (RK4). fieldFn(vec3) -> vec3.
  function traceField(fieldFn, start, { step = 0.04, maxSteps = 600, bounds = 8, stop } = {}) {
    const pts = [start.clone()];
    let p = start.clone();
    const k = (q) => { const f = fieldFn(q); const l = f.length(); return l < 1e-9 ? f.set(0, 0, 0) : f.multiplyScalar(1 / l); };
    for (let i = 0; i < maxSteps; i++) {
      const k1 = k(p.clone());
      const k2 = k(p.clone().addScaledVector(k1, step / 2));
      const k3 = k(p.clone().addScaledVector(k2, step / 2));
      const k4 = k(p.clone().addScaledVector(k3, step));
      const d = k1.add(k2.multiplyScalar(2)).add(k3.multiplyScalar(2)).add(k4).multiplyScalar(step / 6);
      if (d.lengthSq() < 1e-12) break;
      p = p.clone().add(d);
      if (p.length() > bounds) break;
      if (stop && stop(p, i)) { pts.push(p); break; }
      if (i % 3 === 2) pts.push(p.clone());
    }
    return pts;
  }
  // Field of a bar magnet modelled as two magnetic "charges" at the pole faces (good far-field shape).
  function barMagnetField(center, halfLength, axis = new THREE.Vector3(1, 0, 0), strength = 1) {
    const n = new THREE.Vector3().copy(axis).normalize();
    return (p) => {
      const north = center.clone().addScaledVector(n, halfLength);
      const south = center.clone().addScaledVector(n, -halfLength);
      const a = p.clone().sub(north); const b = p.clone().sub(south);
      const la = Math.max(a.length(), 0.05), lb = Math.max(b.length(), 0.05);
      return a.multiplyScalar(strength / la ** 3).addScaledVector(b, -strength / lb ** 3);
    };
  }

  // Moving dots along a curve (e.g. conventional current direction or energy packets).
  function dots(curve, { count = 20, radius = 0.03, color = 0xf2c46b, parent = group, emissive = 0.6 } = {}) {
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.4 });
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), material, count);
    inst.frustumCulled = false;
    parent.add(inst);
    const tmp = new THREE.Object3D();
    const api = {
      mesh: inst, material, offset: 0,
      place(offset) {
        api.offset = offset;
        for (let i = 0; i < count; i++) {
          const t = ((i / count + offset) % 1 + 1) % 1;
          tmp.position.copy(curve.getPointAt(t));
          tmp.updateMatrix(); inst.setMatrixAt(i, tmp.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
      },
    };
    api.place(0);
    return api;
  }

  // ---------- labels ----------
  function label(text, position, { parent = group, tone = 'dark', size = 'm', className = '' } = {}) {
    const element = document.createElement('div');
    element.className = `em-label em-label-${tone} em-label-${size} ${className}`.trim();
    element.textContent = text;
    const object = new CSS2DObject(element);
    object.position.set(...position);
    parent.add(object);
    const priority = ({n: 4, south: 4, 's-pole': 4, accent: 3, copper: 2, ghost: 0})[tone] ?? 1;
    labels.push({element, priority});
    return { object, element, set(t) { if (element.textContent !== t) element.textContent = t; }, show(v) { object.visible = v; element.style.display = v ? '' : 'none'; } };
  }

  // CSS2DRenderer projects anchors but does not keep text inside the viewport
  // or avoid collisions. Prefer poles and live values when space is limited.
  function layoutLabels(host) {
    const bounds = host.getBoundingClientRect(), inset = 8, gap = 4;
    for (const {element} of labels) {
      element.style.marginLeft = element.style.marginTop = '0px';
      element.style.visibility = '';
    }
    const projected = labels.map(label => ({...label, rect: label.element.getBoundingClientRect()}));
    const occupied = [];
    for (const {element, priority, rect} of projected.sort((a, b) => b.priority - a.priority)) {
      if (!rect.width || !rect.height) continue;
      const cx = (rect.left + rect.right) / 2, cy = (rect.top + rect.bottom) / 2;
      if (cx < bounds.left || cx > bounds.right || cy < bounds.top || cy > bounds.bottom) {
        element.style.visibility = 'hidden'; continue;
      }
      const x = Math.max(bounds.left + inset, Math.min(rect.left, bounds.right - inset - rect.width));
      let placed = false;
      for (const dy of [0, -rect.height - gap, rect.height + gap, -2 * (rect.height + gap), 2 * (rect.height + gap)]) {
        const y = rect.top + dy;
        if (y < bounds.top + inset || y + rect.height > bounds.bottom - inset) continue;
        const candidate = {left: x, right: x + rect.width, top: y, bottom: y + rect.height};
        if (occupied.some(other => candidate.left < other.right + gap && candidate.right > other.left - gap && candidate.top < other.bottom + gap && candidate.bottom > other.top - gap)) continue;
        element.style.marginLeft = `${x - rect.left}px`;
        element.style.marginTop = `${dy}px`;
        occupied.push(candidate); placed = true; break;
      }
      if (!placed) element.style.visibility = 'hidden';
    }
  }

  // ---------- canvas texture helper ----------
  function canvasTexture(width, height, paint) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    return texture;
  }

  // ---------- analog meter (galvanometer / voltmeter) ----------
  function meter({ position = [0, 0, 0], rotationY = 0, size = 1, centerZero = true, unit = 'V', parent = group } = {}) {
    const holder = new THREE.Group(); holder.position.set(...position); holder.rotation.y = rotationY; parent.add(holder);
    const w = 1.25 * size, h = 0.95 * size, d = 0.42 * size;
    const housing = roundedBox([w, h, d], 0.09 * size, mats.plastic, [0, h / 2, 0], holder);
    housing.rotation.x = -0.18;
    const face = new THREE.Group(); face.position.set(0, h / 2, 0); face.rotation.x = -0.18; holder.add(face);
    const dial = canvasTexture(512, 360, (ctx, W, H) => {
      ctx.fillStyle = '#f6f3e8'; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * 0.86, R = H * 0.66;
      ctx.lineWidth = 6; ctx.strokeStyle = '#2f3e38';
      ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      ctx.lineWidth = 4;
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI * 1.2 + (i / 20) * Math.PI * 0.6, long = i % 5 === 0;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.lineTo(cx + Math.cos(a) * (R - (long ? 34 : 18)), cy + Math.sin(a) * (R - (long ? 34 : 18))); ctx.stroke();
      }
      ctx.fillStyle = '#2f3e38'; ctx.font = '600 40px system-ui, sans-serif'; ctx.textAlign = 'center';
      if (centerZero) { ctx.fillText('−', cx - R * 0.8, cy - R * 0.62); ctx.fillText('0', cx, cy - R - 16); ctx.fillText('+', cx + R * 0.8, cy - R * 0.62); }
      else { ctx.fillText('0', cx - R * 0.8, cy - R * 0.62); ctx.fillText('max', cx + R * 0.74, cy - R * 0.62); }
      ctx.font = '600 44px system-ui, sans-serif'; ctx.fillStyle = '#3d6b56'; ctx.fillText(unit, cx, cy - 26);
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.84, h * 0.66), new THREE.MeshBasicMaterial({ map: dial, toneMapped: false }));
    plate.position.set(0, 0.06 * size, d / 2 + 0.002); face.add(plate);
    const needle = new THREE.Group(); needle.position.set(0, 0.06 * size - h * 0.66 * 0.36, d / 2 + 0.012); face.add(needle);
    const needleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.018 * size, h * 0.5, 0.006), new THREE.MeshStandardMaterial({ color: 0xb2432f, roughness: 0.4 }));
    needleMesh.position.y = h * 0.25; needle.add(needleMesh);
    needle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035 * size, 0.035 * size, 0.02, 16).rotateX(Math.PI / 2), mats.plastic));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.68), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0 }));
    glass.position.set(0, 0.06 * size, d / 2 + 0.03); face.add(glass);
    // terminals
    for (const [x, m] of [[-w * 0.3, mats.cableRed], [w * 0.3, mats.cableBlack]]) cylinder(0.05 * size, 0.08 * size, m, [x, 0.04 * size, d / 2 + 0.08 * size], holder, 16);
    const terminals = [new THREE.Vector3(-w * 0.3, 0.04 * size, d / 2 + 0.08 * size), new THREE.Vector3(w * 0.3, 0.04 * size, d / 2 + 0.08 * size)].map(v => holder.localToWorld(v.clone()));
    let shown = 0;
    return {
      group: holder, terminals,
      // fraction in [-1, 1] (centerZero) or [0, 1]
      set(fraction, smooth = 0.35) {
        const f = Math.max(-1.08, Math.min(1.08, fraction || 0));
        shown += (f - shown) * smooth;
        needle.rotation.z = centerZero ? -shown * 0.94 : (0.94 - shown * 1.88);
      },
      setNow(fraction) { shown = fraction || 0; this.set(shown, 1); },
    };
  }

  // Wood/graphite lab base plate with rounded edges.
  function plinth(size, position = [0, 0, 0], material = mats.base, parent = group) {
    return roundedBox(size, 0.08, material, position, parent).rotateX(0);
  }

  let lastTime = 0;
  function tick(time) {
    let dt = time - lastTime; lastTime = time;
    if (!(dt > 0 && dt < 0.5)) dt = 0;
    for (const flow of flows) { flow.phase = time === 0 ? 0 : (flow.phase || 0) + dt * flow.speed; flow.material.uniforms.uTime.value = flow.phase; flow.material.uniforms.uSpeed.value = flow.speed; }
    for (const fn of tickers) fn(time);
  }

  return { THREE, group, mats, mat, add, mesh, roundedBox, box, cylinder, wire, coil, helixCurve, arrow, flowLine, flowMaterial, traceField, barMagnetField, dots, label, layoutLabels, canvasTexture, meter, plinth, tick, onTick: fn => tickers.push(fn) };
}
