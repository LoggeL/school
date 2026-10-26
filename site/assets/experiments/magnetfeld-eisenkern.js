// Coil with a removable soft-iron core.
// The air-coil reference is quantitative (long solenoid, N = 400, ℓ = 0,2 m).
// Domain alignment and the iron field picture are qualitative only: no permeability,
// saturation field or universal iron amplification is invented.
export function calculate(state, time = 0) {
  const current = Number(state.current ?? .5);
  return {
    current,
    airField: 4 * Math.PI * 1e-7 * 400 * current / .2,
    alignment: Math.tanh(3 * Math.abs(current)),
    sign: Math.sign(current),
    core: Boolean(state.core),
  };
}

// Small deterministic PRNG so the domain pattern never flickers between reloads.
function random(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function createExperiment({ THREE, group, kit }) {
  const { mats } = kit;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const fmt = (value, decimals = 2) => (Math.abs(value) < 1e-9 ? 0 : value).toLocaleString('de-DE', { maximumFractionDigits: decimals });
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- geometry constants (scene units) ----------
  const COIL_R = 0.78, COIL_L = 3.6, CORE_R = 0.5, CORE_L = 4.0;
  const BASE_TOP = -1.2;
  const CORE_OUT_X = -4.05; // centre of the core when pulled out to the left

  // ---------- base, supports, bobbin ----------
  kit.roundedBox([9.7, 0.22, 3.4], 0.1, mats.base, [-1.35, BASE_TOP - 0.11, 0]);
  // thin cream inlay strip like a lab board
  kit.roundedBox([9.3, 0.02, 3.0], 0.05, kit.mat(0x3a5850, 0.05, 0.7), [-1.35, BASE_TOP + 0.005, 0]);

  const lathe = (profile, segments = 64) => {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
    g.rotateZ(-Math.PI / 2); // lathe axis y -> x
    return g;
  };
  const bobbinMat = kit.mat(0x2b3936, 0.05, 0.42, { transparent: true });
  const bobbin = kit.mesh(lathe([[0.56, -1.86], [0.72, -1.86], [0.72, 1.86], [0.56, 1.86], [0.56, -1.86]]), bobbinMat);
  const flanges = [-1.88, 1.88].map(x => {
    const f = kit.mesh(lathe([[0.56, -0.05], [1.02, -0.05], [1.02, 0.05], [0.56, 0.05], [0.56, -0.05]]), bobbinMat);
    f.position.x = x; return f;
  });
  for (const x of [-1.88, 1.88]) {
    kit.roundedBox([0.36, 0.42, 1.25], 0.06, mats.ceramic, [x, BASE_TOP + 0.21, 0]);
  }

  // ---------- winding (symbolic 34 turns, labelled as 400) ----------
  const TURNS = 34;
  const copper = mats.copper.clone(); copper.transparent = true;
  const coil = kit.coil({ radius: COIL_R, length: COIL_L, turns: TURNS, wireRadius: 0.048, material: copper, segmentsPerTurn: 28 });
  const helix = coil.userData.curve;
  // leads: both helix ends sit at (±L/2, R, 0)
  const supplyPos = V(0, BASE_TOP, -1.38);
  kit.roundedBox([1.25, 0.62, 0.55], 0.08, mats.plastic, [supplyPos.x, BASE_TOP + 0.31, supplyPos.z]);
  kit.roundedBox([0.62, 0.22, 0.02], 0.03, kit.mat(0x9fb5a7, 0, 0.35), [supplyPos.x, BASE_TOP + 0.4, supplyPos.z + 0.28]);
  const plusPos = V(-0.38, BASE_TOP + 0.14, supplyPos.z + 0.3);
  const minusPos = V(0.38, BASE_TOP + 0.14, supplyPos.z + 0.3);
  kit.cylinder(0.065, 0.12, mats.cableRed, [plusPos.x, plusPos.y, plusPos.z + 0.03]).rotation.x = Math.PI / 2;
  kit.cylinder(0.065, 0.12, mats.cableBlack, [minusPos.x, minusPos.y, minusPos.z + 0.03]).rotation.x = Math.PI / 2;
  const leadIn = kit.wire([[-COIL_L / 2, COIL_R, 0], [-COIL_L / 2 - 0.05, COIL_R + 0.12, -0.25], [-1.55, 1.05, -0.9], [-0.9, 0.25, -1.35], [plusPos.x, plusPos.y + 0.02, plusPos.z + 0.12]], 0.032, mats.cableRed);
  const leadOut = kit.wire([[COIL_L / 2, COIL_R, 0], [COIL_L / 2 + 0.05, COIL_R + 0.12, -0.25], [1.55, 1.05, -0.9], [0.9, 0.25, -1.35], [minusPos.x, minusPos.y + 0.02, minusPos.z + 0.12]], 0.032, mats.cableBlack);

  // Conventional current: + terminal -> red lead -> helix (t: 0 -> 1) -> black lead -> − terminal.
  // The helix turns positively about +x, so I > 0 makes the field point to +x inside: north pole on the right.
  const currentDots = kit.dots(helix, { count: 120, radius: 0.026, color: 0xffcf6e, emissive: 0.9 });
  const leadDotsIn = kit.dots(new THREE.CatmullRomCurve3(leadIn.userData.curve.points.slice().reverse(), false, 'centripetal'), { count: 8, radius: 0.034, color: 0xffcf6e, emissive: 0.9 });
  const leadDotsOut = kit.dots(leadOut.userData.curve, { count: 8, radius: 0.034, color: 0xffcf6e, emissive: 0.9 });

  // ---------- iron core (slides along the axis) ----------
  const coreGroup = new THREE.Group(); group.add(coreGroup);
  const ironMat = kit.mat(0x6a7174, 0.78, 0.42, { transparent: true });
  const coreMesh = kit.mesh(new THREE.CylinderGeometry(CORE_R, CORE_R, CORE_L, 64, 1), ironMat, [0, 0, 0], coreGroup);
  coreMesh.rotation.z = Math.PI / 2;
  const capMat = kit.mat(0x8c9496, 0.85, 0.3, { transparent: true });
  for (const x of [-CORE_L / 2, CORE_L / 2]) {
    const cap = kit.mesh(new THREE.CylinderGeometry(CORE_R * 0.995, CORE_R * 0.995, 0.012, 64), capMat, [x, 0, 0], coreGroup);
    cap.rotation.z = Math.PI / 2;
  }
  // wooden cradle that receives the core when it is pulled out
  for (const x of [-5.4, -2.75]) {
    const cradle = kit.roundedBox([0.32, 0.5, 0.9], 0.05, mats.wood, [x, BASE_TOP + 0.25, 0]);
    cradle.scale.y = 1;
  }
  const coreLabel = kit.label('Eisenkern', [-CORE_L / 2 + 0.25, CORE_R + 0.38, 0.3], { parent: coreGroup, tone: 'dark', size: 's' });

  // ---------- Weiss domains: instanced arrows inside the core ----------
  const arrowGeom = new THREE.LatheGeometry([
    [0, -0.12], [0.022, -0.12], [0.022, 0.025], [0.052, 0.025], [0, 0.125],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const domainMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05, emissive: 0x0c2a1d, emissiveIntensity: 0.25 });
  const rand = random(7);
  const domainData = [];
  for (let x = -CORE_L / 2 + 0.2; x <= CORE_L / 2 - 0.19; x += 0.27) {
    for (let y = -0.33; y <= 0.34; y += 0.22) {
      for (let z = -0.33; z <= 0.34; z += 0.22) {
        if (y * y + z * z > 0.37 * 0.37) continue;
        const jitter = V((rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06);
        // isotropic random start direction
        const u = rand() * 2 - 1, phi = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        domainData.push({ pos: V(x, y, z).add(jitter), dir: V(u, s * Math.cos(phi), s * Math.sin(phi)), phase: rand() * 6.28, threshold: rand() });
      }
    }
  }
  const domains = new THREE.InstancedMesh(arrowGeom, domainMat, domainData.length);
  domains.renderOrder = 3;
  coreGroup.add(domains);
  const domainLabel = kit.label('Weiss-Bezirke', [0.2, -CORE_R - 0.35, 0.55], { parent: coreGroup, tone: 'accent', size: 's' });
  const colA = new THREE.Color(0x8fa69a), colB = new THREE.Color(0x2c8a5e), tmpCol = new THREE.Color();
  const tmpObj = new THREE.Object3D(), yUp = V(0, 1, 0), tmpDir = V(0, 0, 0), targetDir = V(1, 0, 0);

  // ---------- magnetic field: exact off-axis field of circular current loops ----------
  // (complete elliptic integrals via AGM; constants dropped because only the shape matters)
  function ellipticKE(m) {
    let a = 1, b = Math.sqrt(1 - m), c2sum = m / 2, pow = 0.5;
    for (let i = 0; i < 12; i++) {
      const an = (a + b) / 2, bn = Math.sqrt(a * b), cn = (a - b) / 2;
      pow *= 2; c2sum += pow * cn * cn;
      a = an; b = bn;
      if (cn < 1e-12) break;
    }
    const K = Math.PI / (2 * a);
    return [K, K * (1 - c2sum)];
  }
  function loopField(radius, x0, rho, x, current, out) {
    const z = x - x0;
    const r2 = radius * radius + rho * rho + z * z;
    const alpha2 = Math.max(r2 - 2 * radius * rho, 1e-4);
    const beta2 = r2 + 2 * radius * rho, beta = Math.sqrt(beta2);
    const m = Math.min(1 - alpha2 / beta2, 0.999999);
    const [K, E] = ellipticKE(m);
    out[0] += current * ((radius * radius - rho * rho - z * z) * E + alpha2 * K) / (2 * alpha2 * beta);
    if (rho > 1e-6) out[1] += current * z * (r2 * E - alpha2 * K) / (2 * alpha2 * beta * rho);
  }
  const loops = (radius, x0, x1, n, current) => Array.from({ length: n }, (_, j) => [radius, x0 + (x1 - x0) * j / (n - 1), current]);
  const coilLoops = loops(COIL_R, -COIL_L / 2, COIL_L / 2, 24, 1);
  // A magnetised iron rod acts like a surface current on its mantle (Amperian model).
  const coreLoops = loops(CORE_R, -CORE_L / 2, CORE_L / 2, 22, 5);
  const makeField = (set) => (p) => {
    const rho = Math.hypot(p.y, p.z), out = [0, 0];
    for (const [r, x0, c] of set) loopField(r, x0, rho, p.x, c, out);
    const k = rho > 1e-9 ? out[1] / rho : 0;
    return V(out[0], p.y * k, p.z * k);
  };
  const fieldAir = makeField(coilLoops);
  const fieldCore = makeField([...coilLoops, ...coreLoops]);

  function traceClosed(fieldFn, r) {
    const start = V(0, r, 0);
    const pts = kit.traceField(fieldFn, start, {
      step: 0.045, maxSteps: 900, bounds: 7.5,
      stop: (p, i) => i > 40 && p.distanceTo(start) < 0.07,
    });
    const last = pts[pts.length - 1];
    if (last.distanceTo(start) > 0.12) return null; // did not close inside the bounds
    pts.pop();
    return pts;
  }
  const rotate = (pts, phi) => pts.map(p => V(p.x, p.y * Math.cos(phi), p.y * Math.sin(phi)));
  // Keep lines that run through the board from hiding below it: only use planes above the horizon.
  function buildSet(fieldFn, radii, angles, color, radius) {
    const lines = [];
    for (const r of radii) {
      const pts = traceClosed(fieldFn, r);
      if (!pts) continue;
      for (const phi of angles) {
        const rotated = rotate(pts, phi);
        if (rotated.some(p => p.y < BASE_TOP + 0.02)) continue;
        lines.push(kit.flowLine(rotated, { closed: true, color, radius, opacity: 0.9, speed: 0.3, width: 0.32 }));
      }
    }
    return lines;
  }
  const airAngles = [0, Math.PI * 0.5, Math.PI * 0.82, Math.PI * 0.18];
  const coreAngles = [0, Math.PI * 0.5, Math.PI * 0.18, Math.PI * 0.82, Math.PI * 0.34, Math.PI * 0.66];
  const airLines = buildSet(fieldAir, [0.18, 0.4, 0.62], airAngles, 0x3a9a6c, 0.017);
  const coreLines = buildSet(fieldCore, [0.08, 0.19, 0.3, 0.42], coreAngles, 0x23855a, 0.019);

  // ---------- paper clips at the right pole ----------
  function clipCurve() {
    // classic paper clip: nested loops, 0.34 long, 0.11 wide
    const w = 0.055, l = 0.17;
    const pts = [[-w * 0.4, -l * 0.55], [-w * 0.4, l * 0.7], [0, l], [w, l * 0.82], [w, -l * 0.82], [0, -l], [-w, -l * 0.82], [-w, l * 0.55], [-w * 0.6, l * 0.75], [-w * 0.2, l * 0.55], [-w * 0.2, -l * 0.35]];
    return pts.map(([a, b]) => [a, b, 0]);
  }
  const clipMat = kit.mat(0xc9cfd1, 0.95, 0.22);
  const clips = [];
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group(); group.add(holder);
    kit.wire(clipCurve(), 0.011, clipMat, holder);
    const hang = { pos: V(CORE_L / 2 + 0.08 + (i % 2) * 0.012, -CORE_R + 0.06 - 0.3 * i, 0.02 * (i % 2)), rot: new THREE.Euler(0, (i % 2) * Math.PI / 2, 0.06 * (i % 2 ? 1 : -1)) };
    const rest = { pos: V(2.45 + i * 0.22 + (i % 2) * 0.05, BASE_TOP + 0.03, 0.55 - i * 0.28), rot: new THREE.Euler(-Math.PI / 2, 0, 0.4 + i * 1.1) };
    clips.push({ holder, hang, rest, threshold: 0.25 + i * 0.12 });
  }
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();

  // ---------- labels ----------
  const north = kit.label('N', [2.75, 0.05, 0], { tone: 'n' });
  const south = kit.label('S', [-2.75, 0.05, 0], { tone: 'south' });
  const turnsLabel = kit.label('400 Windungen · ℓ = 20 cm', [0, -COIL_R - 0.15, 1.2], { tone: 'ghost', size: 's' });
  const currentLabel = kit.label('Strom I', [-0.95, COIL_R + 0.32, 0.45], { tone: 'copper', size: 's' });

  // ---------- camera-dependent see-through (zoom in to look inside) ----------
  const centre = V(0, 0, 0);
  let closeness = 0;
  coil.onBeforeRender = (renderer, scene, camera) => {
    const d = camera.position.distanceTo(centre);
    closeness = smooth(8.2, 5.2, d);
  };

  // ---------- state ----------
  let coreProgress = null; // 1 = inserted, 0 = pulled out
  let lastTime = null, lastWall = performance.now(), dotOffset = 0;

  return {
    camera: { target: [-1.1, -0.05, 0], distance: 11.2, yaw: 0.42, pitch: 0.36, floor: BASE_TOP - 0.22, shadowSize: 7.5, fitAspect: 1.7 },
    views: {
      overview: { target: [-1.1, -0.05, 0], yaw: 0.42, pitch: 0.36, zoom: 1 },
      inside: { target: [0.35, 0, 0], yaw: 0.62, pitch: 0.2, zoom: 0.4 },
      field: { target: [0, 0.45, 0], yaw: 0.0, pitch: 0.1, zoom: 0.92 },
    },
    update(state, time) {
      const result = calculate(state, time);
      const wantCore = result.core;
      const showDomains = Boolean(state.domains);
      const I = result.current, absI = Math.abs(I), sign = result.sign;

      // core slide: animate while the clock runs, snap when the model is paused
      const now = performance.now();
      const wallDt = Math.min(0.1, (now - lastWall) / 1000); lastWall = now;
      const paused = lastTime !== null && time === lastTime;
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(0.1, time - lastTime));
      lastTime = time;
      const goal = wantCore ? 1 : 0;
      if (coreProgress === null || paused) coreProgress = goal;
      else {
        const stepSize = Math.max(dt, wallDt) * 0.9;
        coreProgress += Math.sign(goal - coreProgress) * Math.min(Math.abs(goal - coreProgress), stepSize);
      }
      const p = coreProgress * coreProgress * (3 - 2 * coreProgress);
      coreGroup.position.x = (1 - p) * CORE_OUT_X;
      const inserted = p; // fraction of the iron inside the coil (visual)

      // see-through when zoomed in (or when domains should be visible)
      const reveal = showDomains ? Math.max(closeness, 0.35) : 0;
      ironMat.opacity = showDomains ? 1 - 0.78 * reveal : 1;
      ironMat.depthWrite = ironMat.opacity > 0.98;
      capMat.opacity = ironMat.opacity;
      copper.opacity = 1 - 0.72 * closeness; copper.depthWrite = copper.opacity > 0.98;
      bobbinMat.opacity = 1 - 0.85 * closeness; bobbinMat.depthWrite = bobbinMat.opacity > 0.98;

      // domains: random at I = 0, aligned with saturation (tanh) as |I| grows — only where iron sits in the field
      domains.visible = showDomains;
      const align = result.alignment;
      targetDir.set(sign || 1, 0, 0);
      domainData.forEach((d, i) => {
        // iron outside the coil feels much less field
        const worldX = d.pos.x + coreGroup.position.x;
        const inField = smooth(COIL_L / 2 + 0.9, COIL_L / 2 - 0.2, Math.abs(worldX));
        const a = Math.min(1, align * (0.15 + 0.85 * inField) * (0.75 + 0.5 * d.threshold));
        const wobble = (1 - a) * 0.22;
        tmpDir.copy(d.dir);
        tmpDir.x += Math.sin(time * 1.7 + d.phase) * wobble; tmpDir.y += Math.cos(time * 1.3 + d.phase) * wobble;
        tmpDir.normalize().lerp(targetDir, a * a * (3 - 2 * a)).normalize();
        if (tmpDir.lengthSq() < 1e-6) tmpDir.copy(targetDir);
        tmpObj.position.copy(d.pos);
        tmpObj.quaternion.setFromUnitVectors(yUp, tmpDir);
        tmpObj.scale.setScalar(1.0);
        tmpObj.updateMatrix();
        domains.setMatrixAt(i, tmpObj.matrix);
        domains.setColorAt(i, tmpCol.copy(colA).lerp(colB, a));
      });
      domains.instanceMatrix.needsUpdate = true;
      if (domains.instanceColor) domains.instanceColor.needsUpdate = true;
      domainLabel.show(showDomains && closeness > 0.35);

      // field lines: air-coil picture fades into the iron-core picture
      const active = absI > 0.001;
      const level = 0.35 + 0.65 * absI;
      const speed = active ? sign * (0.18 + 0.32 * absI) : 0;
      airLines.forEach(l => l.set({ visible: active && (1 - p) > 0.02, strength: (1 - p) * (0.25 + 0.55 * absI), speed }));
      coreLines.forEach(l => l.set({ visible: active && p > 0.02, strength: p * (0.3 + 0.7 * align) * level, speed: speed * 1.15 }));

      // current dots in winding and leads
      dotOffset += dt * sign * (0.012 + 0.03 * absI);
      currentDots.place(dotOffset);
      leadDotsIn.place(dotOffset * 9);
      leadDotsOut.place(dotOffset * 9);
      for (const d of [currentDots, leadDotsIn, leadDotsOut]) d.mesh.visible = active;
      currentLabel.show(active);

      // poles follow the current direction (right-hand rule)
      north.show(active); south.show(active);
      const poleX = 2.05 + 0.65;
      north.object.position.x = sign < 0 ? -poleX : poleX;
      south.object.position.x = -north.object.position.x;

      // paper clips: only a strong field (iron core and enough current) can hold them
      const holdField = absI * (0.12 + 0.88 * inserted) * (0.6 + 0.4 * align);
      clips.forEach((c, i) => {
        const k = smooth(c.threshold, c.threshold + 0.12, holdField);
        c.holder.position.lerpVectors(c.rest.pos, c.hang.pos, k);
        qa.setFromEuler(c.rest.rot); qb.setFromEuler(c.hang.rot);
        c.holder.quaternion.slerpQuaternions(qa, qb, k);
      });
      const clipsHeld = clips.filter((c, i) => holdField > c.threshold + 0.06).length;

      let note;
      if (!active) note = wantCore
        ? 'Kein Strom: Die Spule erzeugt kein Feld. Die Weiss-Bezirke im Eisen zeigen kreuz und quer – ihre Wirkungen heben sich nach außen auf. (Ein echter Kern kann einen kleinen Rest behalten; das Modell zeigt ihn nicht.)'
        : 'Kein Strom, kein Spulenfeld. Stell die Stromstärke hoch, um das Feld der Luftspule zu sehen.';
      else if (p < 0.5) note = `Luftspule: Der Strom allein erzeugt das Feld (rund ${fmt(Math.abs(result.airField) * 1000)} mT im Inneren). Innen laufen die Feldlinien fast parallel, außen kehren sie von N nach S zurück. Das reicht nicht, um die Büroklammern zu halten.`;
      else if (align < 0.85) note = `Mit Eisenkern: Das Spulenfeld richtet die Weiss-Bezirke teilweise aus. Ihre Felder addieren sich zu dem der Spule – die Feldlinien werden dichter, der Kern hält ${clipsHeld === 1 ? 'eine Büroklammer' : `${clipsHeld} Büroklammern`}.`;
      else note = `Fast alle Bezirke zeigen in Feldrichtung – das Eisen ist nahezu gesättigt. Mehr Strom verstärkt den Beitrag des Eisens jetzt kaum noch. Umpolen dreht Bezirke, Feldlinien und Pole gemeinsam um.`;

      return {
        metrics: [
          { label: 'Stromstärke', value: `${fmt(I, 1)} A` },
          { label: 'Luftspule zum Vergleich', value: `${fmt(result.airField * 1000)} mT` },
          { label: 'Bezirke ausgerichtet (Modell)', value: p > 0.5 ? `${fmt(Math.round(align * 100), 0)} %` : 'kein Eisen' },
        ],
        note,
      };
    },
  };
}
