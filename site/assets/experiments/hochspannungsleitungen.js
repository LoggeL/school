// A two-conductor, purely resistive equivalent circuit. These are sending-end
// quantities, not three-phase grid formulae. All returned electrical units are SI.
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export function calculate(state) {
  const voltage = Number(state.voltage) * 1000;
  const sending = Number(state.power) * 1e6;
  const resistance = Number(state.resistance);
  const current = sending / voltage;
  const voltageDrop = current * resistance;
  const loss = current * current * resistance;
  const received = sending - loss;
  const tolerance = sending * 1e-10;
  const shortCircuit = Math.abs(received) <= tolerance;
  const impossible = received < -tolerance;
  return {
    voltage, sending, resistance, current, voltageDrop, loss,
    received: shortCircuit ? 0 : received,
    receivingVoltage: shortCircuit ? 0 : voltage - voltageDrop,
    efficiency: shortCircuit ? 0 : received / sending,
    feasible: received > tolerance,
    shortCircuit, impossible,
  };
}

const number = (value, digits = 1) => value.toLocaleString('de-DE', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});
const watts = value => value >= 1e6 ? `${number(value / 1e6, 2)} MW` : `${number(value / 1000, 1)} kW`;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function createExperiment({ THREE, group, kit }) {
  const { mats } = kit;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- diorama base with gentle hills ----------
  const TOP = -1.18;
  const hill = (x, z) => {
    const edge = clamp((6.45 - Math.abs(x)) / 0.9) * clamp((2.2 - Math.abs(z)) / 0.6);
    const h = 0.16 + 0.13 * Math.sin(x * 0.62 + 0.9) * Math.cos(z * 0.8 - 0.3)
      + 0.2 * Math.exp(-((x + 1.6) ** 2) / 2.2 - ((z + 1.2) ** 2) / 1.4)
      + 0.16 * Math.exp(-((x - 2.4) ** 2) / 1.8 - ((z - 1.4) ** 2) / 1.0);
    // flatten building plots and pylon feet
    const flat = Math.max(Math.exp(-((x + 5.1) ** 2) / 0.9), Math.exp(-((x - 5.3) ** 2) / 1.1));
    return TOP + edge * (h * (1 - flat) + 0.1 * flat);
  };
  kit.roundedBox([13.2, 0.34, 4.8], 0.14, kit.mat(0x6f8a73, 0, 0.8), [0, TOP - 0.17, 0]);
  kit.roundedBox([13.3, 0.06, 4.9], 0.03, kit.mat(0xe8e2d2, 0, 0.7), [0, TOP - 0.36, 0]);
  {
    const geo = new THREE.PlaneGeometry(12.9, 4.5, 140, 50);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = hill(x, z);
      pos.setY(i, y);
      const shade = clamp((y - TOP) / 0.45);
      c.setHSL(0.26 + 0.025 * Math.sin(x * 2.1 + z), 0.3, 0.4 + shade * 0.1 + 0.02 * Math.sin(x * 7.3) * Math.cos(z * 5.1));
      // a small sandy road along the front edge
      const road = Math.abs(z - (1.72 + 0.12 * Math.sin(x * 0.7))) < 0.11;
      if (road) c.setRGB(0.78, 0.74, 0.63);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    terrain.receiveShadow = true;
    group.add(terrain);
  }

  // ---------- trees (instanced) ----------
  {
    const spots = [[-3.9, -1.7], [-3.4, -1.9], [-2.2, -1.75], [-1.7, 1.25], [-0.3, -1.85], [0.4, 1.3], [0.9, -1.6], [2.0, -1.9], [2.6, 1.15], [2.9, -1.4], [-2.6, 1.3], [-4.0, 1.25], [3.8, -1.85], [3.9, 1.3], [-0.9, -1.4], [1.6, 1.85], [-5.9, -1.6], [-6.1, 1.4], [4.3, -1.95], [-1.4, -2.0]];
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 9), kit.mat(0x5d8a5e, 0, 0.8), spots.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 6), kit.mat(0x7a5b40, 0, 0.9), spots.length);
    const o = new THREE.Object3D();
    spots.forEach(([x, z], i) => {
      const s = 0.8 + ((i * 37) % 10) / 22;
      const y = hill(x, z);
      o.position.set(x, y + 0.08 * s, z); o.scale.setScalar(s); o.rotation.set(0, i, 0); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
      o.position.set(x, y + 0.38 * s, z); o.updateMatrix(); crown.setMatrixAt(i, o.matrix);
    });
    crown.castShadow = trunk.castShadow = true;
    group.add(crown, trunk);
  }

  // ---------- geometry helpers ----------
  const up = V(0, 1, 0);
  function strut(a, b, r) {
    const d = b.clone().sub(a); const len = d.length();
    const g = new THREE.CylinderGeometry(r, r, len, 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  }

  // ---------- lattice pylon (one merged geometry, reused) ----------
  const ARM_Y = 2.0, ARM_Z = 0.74, HANG = 0.34, PYLON_TOP = 2.55;
  const pylonGeometry = (() => {
    const parts = [];
    const H = 2.25, levels = 7;
    const half = t => 0.3 * (1 - t) + 0.075 * t;
    const corner = (t, sx, sz) => V(sx * half(t), t * H, sz * half(t));
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (const [sx, sz] of corners) parts.push(strut(corner(0, sx, sz), corner(1, sx, sz), 0.022));
    for (let l = 0; l < levels; l++) {
      const t0 = l / levels, t1 = (l + 1) / levels;
      for (let k = 0; k < 4; k++) {
        const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
        parts.push(strut(corner(t0, ax, az), corner(t1, bx, bz), 0.009));
        parts.push(strut(corner(t0, bx, bz), corner(t1, ax, az), 0.009));
        parts.push(strut(corner(t1, ax, az), corner(t1, bx, bz), 0.011));
      }
    }
    // crossarm truss towards both conductor sides
    for (const sz of [1, -1]) {
      const tip = V(0, ARM_Y, sz * ARM_Z);
      for (const sx of [1, -1]) {
        parts.push(strut(V(sx * 0.1, ARM_Y, sz * 0.1), tip, 0.014));
        parts.push(strut(V(sx * 0.09, ARM_Y + 0.22, sz * 0.09), tip, 0.011));
        for (let i = 1; i < 4; i++) {
          const f = i / 4;
          const bottom = V(sx * 0.1 * (1 - f), ARM_Y, sz * (0.1 + (ARM_Z - 0.1) * f));
          const top = V(sx * 0.09 * (1 - f), ARM_Y + 0.22 * (1 - f), sz * (0.09 + (ARM_Z - 0.09) * f));
          parts.push(strut(bottom, top, 0.007));
        }
      }
      parts.push(strut(V(0.1, ARM_Y, sz * 0.1), V(-0.1, ARM_Y, sz * 0.1), 0.01));
    }
    // peak for the earth wire
    for (const [sx, sz] of corners) parts.push(strut(corner(1, sx, sz), V(0, PYLON_TOP, 0), 0.012));
    // footings
    for (const [sx, sz] of corners) {
      const f = new THREE.BoxGeometry(0.11, 0.08, 0.11); f.translate(sx * 0.3, 0.0, sz * 0.3); parts.push(f);
    }
    return mergeGeometries(parts.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { g.deleteAttribute('uv'); return g; }));
  })();
  const insulatorGeometry = (() => {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.CylinderGeometry(0.048, 0.048, 0.016, 14); g.translate(0, -0.04 - i * 0.034, 0); parts.push(g);
    }
    const rod = new THREE.CylinderGeometry(0.008, 0.008, HANG, 6); rod.translate(0, -HANG / 2, 0); parts.push(rod);
    return mergeGeometries(parts.map(g => g.toNonIndexed()).map(g => { g.deleteAttribute('uv'); return g; }));
  })();
  const pylonMaterial = kit.mat(0x8f9a99, 0.75, 0.4);
  const insulatorMaterial = kit.mat(0x9fc6c0, 0.05, 0.25, { clearcoat: 0.8 });

  const pylonXs = [-3.3, -1.1, 1.1, 3.3];
  const attach = { front: [], back: [] }; // conductor suspension points
  const peaks = [];
  for (const x of pylonXs) {
    const base = hill(x, 0) - 0.02;
    const p = new THREE.Mesh(pylonGeometry, pylonMaterial);
    p.position.set(x, base, 0); p.castShadow = true; p.receiveShadow = true;
    group.add(p);
    for (const sz of [1, -1]) {
      const ins = new THREE.Mesh(insulatorGeometry, insulatorMaterial);
      ins.position.set(x, base + ARM_Y, sz * ARM_Z); ins.castShadow = true; group.add(ins);
      attach[sz > 0 ? 'front' : 'back'].push(V(x, base + ARM_Y - HANG, sz * ARM_Z));
    }
    peaks.push(V(x, base + PYLON_TOP, 0));
  }

  // ---------- portal gantries at both ends ----------
  function gantry(x) {
    const base = hill(x, 0);
    const parts = [];
    const H = 1.32;
    for (const sz of [1, -1]) {
      for (const sx of [1, -1]) parts.push(strut(V(x + sx * 0.08, base, sz * ARM_Z + sz * 0.1), V(x + sx * 0.05, base + H, sz * ARM_Z + sz * 0.08), 0.016));
      for (let i = 0; i < 4; i++) {
        const y0 = base + i * H / 4, y1 = base + (i + 1) * H / 4;
        parts.push(strut(V(x - 0.075, y0, sz * (ARM_Z + 0.1)), V(x + 0.075, y1, sz * (ARM_Z + 0.1)), 0.007));
      }
    }
    parts.push(strut(V(x, base + H, -ARM_Z - 0.2), V(x, base + H, ARM_Z + 0.2), 0.026));
    const m = new THREE.Mesh(mergeGeometries(parts.map(g => g.toNonIndexed()).map(g => { g.deleteAttribute('uv'); return g; })), pylonMaterial);
    m.castShadow = true; group.add(m);
    const points = {};
    for (const sz of [1, -1]) {
      const ins = new THREE.Mesh(insulatorGeometry, insulatorMaterial);
      ins.position.set(x, base + H, sz * ARM_Z); ins.scale.setScalar(0.8); group.add(ins);
      points[sz > 0 ? 'front' : 'back'] = V(x, base + H - HANG * 0.8, sz * ARM_Z);
    }
    return points;
  }

  // transformer with radiator fins and bushings
  function transformer(x, z, scale = 1, rotation = 0) {
    const holder = new THREE.Group(); holder.position.set(x, hill(x, z), z); holder.rotation.y = rotation; holder.scale.setScalar(scale); group.add(holder);
    kit.box([0.62, 0.05, 0.62], mats.concrete, [0, 0.025, 0], holder);
    const tank = kit.roundedBox([0.36, 0.38, 0.46], 0.03, kit.mat(0x5d7268, 0.3, 0.5), [0, 0.24, 0], holder);
    tank.castShadow = true;
    for (let i = 0; i < 6; i++) kit.box([0.012, 0.3, 0.12], kit.mat(0x546a60, 0.3, 0.55), [-0.2 - 0.005, 0.23, -0.17 + i * 0.068], holder);
    for (let i = 0; i < 6; i++) kit.box([0.012, 0.3, 0.12], kit.mat(0x546a60, 0.3, 0.55), [0.205, 0.23, -0.17 + i * 0.068], holder);
    const bushings = [];
    for (const bz of [-0.14, 0.14]) {
      const b = kit.cylinder(0.028, 0.2, insulatorMaterial, [0.05, 0.53, bz], holder, 12);
      for (let r = 0; r < 4; r++) kit.cylinder(0.044, 0.012, insulatorMaterial, [0.05, 0.46 + r * 0.04, bz], holder, 12);
      bushings.push(b);
    }
    kit.cylinder(0.05, 0.06, kit.mat(0x6b7f76, 0.3, 0.5), [-0.1, 0.46, 0], holder, 14).rotation.z = Math.PI / 2;
    holder.updateMatrixWorld(true);
    return bushings.map(b => b.localToWorld(V(0, 0.1, 0)));
  }

  // ---------- power station (left) ----------
  {
    const x = -5.7, z = -0.2, g = hill(x, z);
    kit.roundedBox([1.05, 0.62, 1.35], 0.04, kit.mat(0xe7e2d6, 0, 0.7), [x, g + 0.31, z]);
    kit.roundedBox([1.12, 0.06, 1.42], 0.02, kit.mat(0x7f8f87, 0.2, 0.6), [x, g + 0.64, z]);
    kit.roundedBox([0.55, 0.36, 0.9], 0.03, kit.mat(0xd8d3c6, 0, 0.7), [x - 0.1, g + 0.85, z]);
    for (let i = 0; i < 4; i++) kit.box([0.012, 0.18, 0.22], kit.mat(0x9fb9c4, 0.2, 0.2), [x + 0.53, g + 0.3, z - 0.45 + i * 0.3]);
    const stack = kit.cylinder(0.09, 1.6, kit.mat(0xd9d4c8, 0, 0.6), [x - 0.32, g + 0.8, z + 0.42], group, 20);
    kit.cylinder(0.1, 0.08, kit.mat(0xb04b3a, 0, 0.5), [x - 0.32, g + 1.52, z + 0.42], group, 20);
    stack.castShadow = true;
    // a wisp of steam, very soft
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 1 }));
    steam.position.set(x - 0.32, g + 1.78, z + 0.42); steam.scale.set(1.2, 0.8, 1); group.add(steam);
    kit.onTick(t => { steam.position.y = g + 1.78 + 0.04 * Math.sin(t * 1.3); steam.scale.x = 1.2 + 0.08 * Math.sin(t * 0.9); });
  }
  const plantBushings = transformer(-4.95, 0, 1.15);
  const plantGantry = gantry(-4.45);
  const subGantry = gantry(4.5);
  const subBushings = transformer(4.98, 0, 1.0, Math.PI);
  // substation fence
  {
    const parts = [];
    const x0 = 4.2, x1 = 5.32, z0 = -1.05, z1 = 1.05;
    const edge = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = edge[e], [bx, bz] = edge[e + 1];
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.18);
      for (let i = 0; i <= n; i++) {
        const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n, y = hill(px, pz);
        parts.push(strut(V(px, y, pz), V(px, y + 0.16, pz), 0.006));
      }
      for (const h of [0.07, 0.15]) parts.push(strut(V(ax, hill(ax, az) + h, az), V(bx, hill(bx, bz) + h, bz), 0.003));
    }
    const fence = new THREE.Mesh(mergeGeometries(parts.map(g => g.toNonIndexed()).map(g => { g.deleteAttribute('uv'); return g; })), kit.mat(0x9aa5a2, 0.6, 0.45));
    group.add(fence);
  }

  // short droppers from transformer bushings to the gantry insulators
  const dropper = kit.mat(0xaeb7b8, 0.8, 0.3);
  const plantEnds = [plantGantry.front, plantGantry.back];
  const subEnds = [subGantry.front, subGantry.back];
  plantBushings.slice().sort((a, b) => b.z - a.z).forEach((b, i) => {
    const e = plantEnds[i];
    kit.wire([[b.x, b.y, b.z], [(b.x + e.x) / 2, Math.max(b.y, e.y) - 0.12, (b.z + e.z) / 2], [e.x, e.y, e.z]], 0.009, dropper);
  });
  subBushings.slice().sort((a, b) => b.z - a.z).forEach((b, i) => {
    const e = subEnds[i];
    kit.wire([[e.x, e.y, e.z], [(b.x + e.x) / 2, Math.max(b.y, e.y) - 0.12, (b.z + e.z) / 2], [b.x, b.y, b.z]], 0.009, dropper);
  });

  // ---------- conductors as catenaries (Kettenlinie) ----------
  const catenary = (a, b, sag, steps = 26) => {
    const k = 1.25, ck = Math.cosh(k);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const p = a.clone().lerp(b, u);
      p.y -= sag * (ck - Math.cosh(k * (2 * u - 1))) / (ck - 1);
      pts.push(p);
    }
    return pts;
  };
  function routePoints(start, mids, end, sag) {
    const stops = [start, ...mids, end];
    const pts = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const s = stops[i], e = stops[i + 1];
      const span = Math.abs(e.x - s.x);
      const seg = catenary(s, e, sag * span / 2.2, Math.max(10, Math.round(span * 12)));
      pts.push(...(i ? seg.slice(1) : seg));
    }
    return pts;
  }
  const conductorMaterial = new THREE.MeshStandardMaterial({ color: 0xb7c0c1, metalness: 0.75, roughness: 0.32, emissive: 0xff5a1f, emissiveIntensity: 0 });
  const routes = {
    front: routePoints(plantGantry.front, attach.front, subGantry.front, 0.28),
    back: routePoints(plantGantry.back, attach.back, subGantry.back, 0.28),
  };
  const curves = {};
  for (const side of ['front', 'back']) {
    const curve = new THREE.CatmullRomCurve3(routes[side], false, 'centripetal');
    curves[side] = curve;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 420, 0.02, 8, false), conductorMaterial);
    tube.castShadow = true; group.add(tube);
  }
  // earth wire on the peaks (thin, not part of the circuit)
  kit.wire(routePoints(peaks[0], peaks.slice(1, -1), peaks.at(-1), 0.16).filter((_, i) => i % 2 === 0).map(p => [p.x, p.y, p.z]), 0.007, kit.mat(0x9aa3a4, 0.7, 0.4));

  // Slowed alternating conventional current. At every instant the two
  // conductors carry opposite currents; their direction reverses together.
  const currentFront = kit.flowLine(curves.front, { color: 0xfff1c4, radius: 0.027, opacity: 0.42, repeat: 16, speed: 0.4, width: 0.3 });
  const currentBack = kit.flowLine(curves.back, { color: 0xfff1c4, radius: 0.027, opacity: 0.42, repeat: 16, speed: -0.4, width: 0.3 });

  // ---------- energy packets travelling between the two conductors ----------
  const energyCurve = new THREE.CatmullRomCurve3(routes.front.map((p, i) => p.clone().lerp(routes.back[i], 0.5).add(V(0, 0.06, 0))), false, 'centripetal');
  const PACKETS = 22;
  const packetMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), PACKETS);
  packetMesh.frustumCulled = false; packetMesh.renderOrder = 3;
  for (let i = 0; i < PACKETS; i++) packetMesh.setColorAt(i, new THREE.Color(0xffd36b));
  group.add(packetMesh);

  // ---------- heat shimmer particles above warm conductors ----------
  const HEAT = 70;
  const heatMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), HEAT);
  heatMesh.frustumCulled = false;
  group.add(heatMesh);
  const heatSeeds = Array.from({ length: HEAT }, (_, i) => ({ side: i % 2 ? 'front' : 'back', u: ((i * 0.6180339) % 1) * 0.9 + 0.05, phase: (i * 0.377) % 1 }));

  // ---------- village (right) ----------
  const windowOn = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb84a, emissiveIntensity: 1.4, roughness: 0.4 });
  const windowOff = new THREE.MeshStandardMaterial({ color: 0x4d5b5c, roughness: 0.3, metalness: 0.2 });
  const windows = [];
  const houses = [[5.7, 1.5, 0.3], [6.25, 0.95, -0.2], [5.75, 0.45, 0.1], [6.3, -0.15, 0.4], [5.8, -0.75, -0.1], [6.25, -1.3, 0.25], [5.7, -1.72, 0]];
  const wallColors = [0xf1ebdc, 0xe9e0cb, 0xf4efe4, 0xe6dccb];
  const roofMat = kit.mat(0xb2624a, 0, 0.7);
  houses.forEach(([x, z, rot], i) => {
    const h = new THREE.Group(); h.position.set(x, hill(x, z), z); h.rotation.y = rot; group.add(h);
    kit.box([0.36, 0.26, 0.3], kit.mat(wallColors[i % 4], 0, 0.85), [0, 0.13, 0], h);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-0.21, 0); roofShape.lineTo(0.21, 0); roofShape.lineTo(0, 0.17); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.36, bevelEnabled: false }); roofGeo.translate(0, 0, -0.18); roofGeo.rotateY(Math.PI / 2);
    kit.mesh(roofGeo, roofMat, [0, 0.26, 0], h);
    for (const [wx, wz] of [[-0.08, 0.152], [0.08, 0.152], [-0.08, -0.152], [0.08, -0.152]]) {
      const w = kit.box([0.06, 0.07, 0.006], windowOff, [wx, 0.14, wz], h); w.castShadow = false;
      windows.push(w);
    }
  });
  // street lamps glow too
  const lampHeads = [];
  for (const [x, z] of [[5.45, 1.15], [5.5, -0.3], [5.45, -1.35]]) {
    const y = hill(x, z);
    kit.cylinder(0.01, 0.34, kit.mat(0x4b5552, 0.6, 0.4), [x, y + 0.17, z], group, 6);
    lampHeads.push(kit.mesh(new THREE.SphereGeometry(0.03, 10, 8), windowOff, [x, y + 0.35, z]));
  }
  // an underground-ish distribution cable from the substation to the village (subtle)
  kit.wire([[5.25, hill(5.25, 0) + 0.02, 0], [5.5, hill(5.5, 0.4) + 0.02, 0.4], [5.75, hill(5.75, 0.9) + 0.02, 1.0]], 0.008, kit.mat(0x3d4644, 0, 0.6));

  // ---------- labels ----------
  const plantLabel = kit.label('Kraftwerk · hochtransformieren', [-4.8, 1.3, 0], { tone: 'dark' });
  const lineLabel = kit.label('Leitung: Hin- und Rückleiter', [0, PYLON_TOP + TOP + 0.95, 0], { tone: 'dark' });
  kit.label('Umspannwerk · heruntertransformieren', [4.75, 0.85, 0], { tone: 'dark' });
  const arrivalLabel = kit.label('kommt an: 9,90 MW', [5.35, -0.05, 0.9], { tone: 'accent', size: 's' });
  const midFront = curves.front.getPointAt(0.5);
  const currentLabel = kit.label('I = 100 A', [midFront.x - 0.75, midFront.y + 0.42, midFront.z + 0.1], { tone: 'accent' });
  const lossLabel = kit.label('Wärme: 100 kW', [midFront.x + 0.9, midFront.y - 0.32, midFront.z + 0.15], { tone: 'copper', size: 's' });
  const warnLabel = kit.label('', [0, 0.55, 0.9], { tone: 'warn', size: 'l' });
  warnLabel.show(false);
  kit.label('Hinleiter', [-2.2, curves.front.getPointAt(0.3).y - 0.25, ARM_Z + 0.05], { tone: 'ghost', size: 's' });
  kit.label('Rückleiter', [2.2, curves.back.getPointAt(0.7).y - 0.25, -ARM_Z - 0.05], { tone: 'ghost', size: 's' });

  // ---------- update ----------
  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  const cool = new THREE.Color(0xb7c0c1), hot = new THREE.Color(0xc8603a);
  let current = { lossFraction: 0, efficiency: 1, powerScale: 0.5, flowSpeed: 0.4, received: 0, state: 'ok' };

  function placePackets(time) {
    const { efficiency, powerScale } = current;
    const r = 0.035 + 0.045 * Math.sqrt(powerScale);
    const speed = 0.06;
    for (let i = 0; i < PACKETS; i++) {
      const u = ((i / PACKETS + time * speed) % 1 + 1) % 1;
      const p = energyCurve.getPointAt(u);
      // remaining share of the energy at this point along the line
      const remaining = Math.max(0, 1 - (1 - efficiency) * u);
      // Packet volume represents the remaining share, so zero arriving power
      // does not leave a glowing packet at the receiving end.
      tmp.position.copy(p); tmp.scale.setScalar(r * Math.cbrt(remaining));
      tmp.updateMatrix(); packetMesh.setMatrixAt(i, tmp.matrix);
      color.setRGB(1, 0.83, 0.42).multiplyScalar(0.25 + 0.75 * remaining);
      packetMesh.setColorAt(i, color);
    }
    packetMesh.instanceMatrix.needsUpdate = true;
    if (packetMesh.instanceColor) packetMesh.instanceColor.needsUpdate = true;
  }
  function placeHeat(time) {
    const g = current.heat;
    const active = Math.round(HEAT * g);
    for (let i = 0; i < HEAT; i++) {
      const s = heatSeeds[i];
      if (i >= active) { tmp.position.set(0, -50, 0); tmp.scale.setScalar(0.0001); }
      else {
        const age = ((time * 0.45 + s.phase) % 1);
        const p = curves[s.side].getPointAt(s.u);
        tmp.position.set(p.x + 0.04 * Math.sin(time * 2 + i), p.y + 0.04 + age * 0.55, p.z);
        tmp.scale.setScalar(0.018 * (1 - age) + 0.004);
      }
      tmp.updateMatrix(); heatMesh.setMatrixAt(i, tmp.matrix);
    }
    heatMesh.instanceMatrix.needsUpdate = true;
  }
  kit.onTick(time => { placePackets(time); placeHeat(time); });

  return {
    camera: { target: [0, 0.15, 0], distance: 14.2, yaw: 0.2, pitch: 0.42, fov: 32, floor: TOP - 0.39, shadowSize: 7.4, fitAspect: 1.7 },
    views: {
      overview: { target: [0, 0.15, 0], yaw: 0.2, pitch: 0.42, zoom: 1 },
      line: { target: [0, 0.75, 0.55], yaw: 0.42, pitch: 0.16, zoom: 0.36 },
      substation: { target: [4.85, -0.45, 0], yaw: -0.62, pitch: 0.36, zoom: 0.42 },
      village: { target: [5.45, -0.6, 0], yaw: -0.55, pitch: 0.4, zoom: 0.42 },
    },
    update(state, time) {
      const values = calculate(state);
      const maxPower = 20e6;
      const lossFraction = values.sending ? values.loss / values.sending : 0;
      const status = values.impossible ? 'impossible' : values.shortCircuit ? 'short' : 'ok';
      // Warmth follows absolute I²R loss, not its fraction of sending power.
      // The colour scale is illustrative and saturates at 3 MW.
      const heat = status === 'impossible' ? 0 : clamp(Math.sqrt(values.loss / 3e6));
      const amplitude = 0.12 + 0.55 * clamp(Math.log10(Math.max(values.current, 1) / 2.5) / Math.log10(800));
      const flowSpeed = status === 'impossible' ? 0 : amplitude * Math.sin(time * Math.PI / 2);
      current = { lossFraction, efficiency: Math.max(0, values.efficiency), powerScale: values.sending / maxPower, flowSpeed, received: values.received, state: status, heat };

      conductorMaterial.color.copy(cool).lerp(hot, heat * 0.75);
      conductorMaterial.emissiveIntensity = 1.6 * heat * heat;
      currentFront.set({ speed: flowSpeed, visible: !values.impossible });
      currentBack.set({ speed: -flowSpeed, visible: !values.impossible });
      packetMesh.visible = values.sending > 0 && !values.impossible;
      heatMesh.visible = !values.impossible;

      // village lights ∝ received power
      const lit = status === 'ok' ? Math.round(windows.length * clamp(values.received / maxPower)) : 0;
      const order = [3, 9, 14, 20, 1, 6, 11, 17, 24, 27, 4, 8, 13, 18, 22, 0, 26, 7, 15, 2, 19, 10, 23, 5, 16, 12, 25, 21];
      windows.forEach((w, i) => { w.material = order.indexOf(i) < lit ? windowOn : windowOff; });
      windowOn.emissiveIntensity = 0.7 + 0.9 * current.efficiency;
      lampHeads.forEach(l => { l.material = lit > 2 ? windowOn : windowOff; });

      currentLabel.set(`${values.impossible ? 'rechnerisch ' : ''}I = ${number(values.current, values.current < 100 ? 1 : 0)} A`);
      lossLabel.set(values.impossible ? 'Kein passiver Betriebszustand' : `Wärme: ${watts(values.loss)} (${number(lossFraction * 100, lossFraction < 0.1 ? 2 : 1)} %)`);
      if (status === 'impossible') { warnLabel.set('⚠ Nicht möglich: Verlust wäre größer als die Sendeleistung'); warnLabel.show(true); }
      else if (status === 'short') { warnLabel.set('⚠ Grenzfall: Die ganze Leistung wird zu Wärme'); warnLabel.show(true); }
      else warnLabel.show(false);
      plantLabel.set(`Kraftwerk · hochtransformieren auf ${number(values.voltage / 1000, 0)} kV`);
      arrivalLabel.set(values.impossible ? 'Betrieb nicht möglich' : status === 'short' ? 'kommt an: 0 W' : `kommt an: ${watts(values.received)}`);
      lineLabel.set(`Leitung: Hin- und Rückleiter · R = ${number(values.resistance, 0)} Ω`);


      let note;
      if (status === 'impossible') {
        note = 'Diese Vorgaben passen nicht zu einem passiven Verbraucher: Der berechnete Leitungsverlust I²·R wäre größer als die gesendete Leistung. Erhöhe die Spannung oder senke Leistung beziehungsweise Leitungswiderstand.';
      } else if (status === 'short') {
        note = 'Grenzfall Kurzschluss: Die gesamte gesendete Leistung wird in der Leitung zu Wärme. Am Empfangsende bleiben 0 V und keine nutzbare Leistung.';
      } else {
        const doubled = calculate({ ...state, voltage: Number(state.voltage) * 2 });
        note = `Bei ${number(values.voltage / 1000, 0)} kV fließen ${number(values.current, 1)} A. ${number(lossFraction * 100, lossFraction < 0.1 ? 2 : 1)} % der Leistung (${watts(values.loss)}) werden in den Leitern zu Wärme, ${watts(values.received)} kommen an. Doppelte Spannung hieße: halber Strom und nur ein Viertel Verlust (${watts(doubled.loss)}).`;
      }
      note += ' Spannung und Strom sind Effektivwerte, die Leistungen zeitliche Mittelwerte im Zweileitermodell. Die hellen Strommarkierungen wechseln verlangsamt die Richtung; gelbe Punkte zeigen den Energiefluss zum Dorf. Farbe, Punktgröße und Tempo sind schematisch.';
      return {
        metrics: [
          { label: values.impossible ? 'Strom rechnerisch' : 'Strom in der Leitung (effektiv)', value: `${number(values.current, 1)} A` },
          { label: values.impossible ? 'Leitungsverlust rechnerisch' : 'Leitungsverlust', value: watts(values.loss) },
          { label: 'Leistung am Verbraucher', value: status === 'impossible' ? 'nicht möglich' : watts(Math.max(0, values.received)) },
        ],
        note,
      };
    },
  };
}
