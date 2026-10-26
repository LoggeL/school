// Ideal transformer values are RMS quantities. The slow flux animation is illustrative.
export function calculate(state, time = 0) {
  const primary = Math.max(1, Number(state.primary ?? 400));
  const secondary = Math.max(1, Number(state.secondary ?? 200));
  const input = Math.max(0, Number(state.voltage ?? 12));
  const resistance = Math.max(.001, Number(state.load ?? 20));
  const ratio = secondary / primary;
  const voltage = state.dc ? 0 : input * ratio;
  const current = voltage / resistance;
  const power = voltage * current;
  const phase = 2 * Math.PI * .35 * time;
  return {
    ratio, voltage, current, power,
    primaryCurrent: state.dc ? null : (input > 0 ? power / input : 0),
    flux: state.dc ? 1 : Math.cos(phase),
    instantaneousVoltage: voltage * Math.SQRT2 * Math.sin(phase),
  };
}

// Scene layout (units ≈ dm): floor at y = -1.5, core in the xy plane, front faces +z.
const CORE = { outer: 1.7, leg: 0.5, bottom: -1.15, window: [-0.65, 1.35], top: 1.85, depth: 0.6 };
const COIL = { length: 1.8, center: 0.35, wire: 0.03, r0: 0.47, layerStep: 0.066 };

export function createExperiment({ THREE, group, kit }) {
  const { mats } = kit;
  const fmt = (value, digits = 1) => (Math.abs(value) < 1e-9 ? 0 : value).toLocaleString('de-DE', { maximumFractionDigits: digits });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- base ----------
  kit.roundedBox([9.2, 0.2, 2.7], 0.08, mats.base, [0, -1.4, 0.15]);
  kit.roundedBox([8.9, 0.02, 2.42], 0.01, kit.mat(0x3b5a51, 0.05, 0.7), [0, -1.295, 0.15]);
  for (const x of [-1.45, 1.45]) {
    kit.box([0.62, 0.15, 0.86], mats.steel, [x, -1.215, 0]);
    for (const z of [-0.33, 0.33]) kit.cylinder(0.045, 0.06, mats.steel, [x - 0.2, -1.12, z], group, 12);
  }

  // ---------- laminated core: U-core plus separate yoke ----------
  const { outer, leg, bottom, top, depth } = CORE;
  const [winBottom, winTop] = CORE.window;
  const inner = outer - leg;
  const uShape = new THREE.Shape([
    [-outer, bottom], [outer, bottom], [outer, winTop], [inner, winTop], [inner, winBottom],
    [-inner, winBottom], [-inner, winTop], [-outer, winTop],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const yokeShape = new THREE.Shape([[-outer, winTop + 0.006], [outer, winTop + 0.006], [outer, top], [-outer, top]].map(([x, y]) => new THREE.Vector2(x, y)));
  const sheets = 12, pitch = depth / sheets, thickness = pitch * 0.86;
  const sheetOptions = { depth: thickness - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 1, curveSegments: 1 };
  const uGeometry = new THREE.ExtrudeGeometry(uShape, sheetOptions);
  const yokeGeometry = new THREE.ExtrudeGeometry(yokeShape, sheetOptions);
  const sheetA = kit.mat(0x8e979a, 0.82, 0.34);
  const sheetB = kit.mat(0x737c80, 0.82, 0.4);
  for (let i = 0; i < sheets; i++) {
    const z = -depth / 2 + i * pitch + (pitch - thickness) / 2;
    const surface = i % 2 ? sheetB : sheetA;
    kit.mesh(uGeometry, surface, [0, 0, z]);
    kit.mesh(yokeGeometry, surface, [0, 0, z]);
  }
  // clamping bolts through the yoke
  for (const x of [-1.45, 0, 1.45]) {
    const bolt = kit.cylinder(0.05, depth + 0.12, mats.steel, [x, (winTop + top) / 2, 0], group, 14);
    bolt.rotation.x = Math.PI / 2;
  }

  // ---------- coils on bobbins ----------
  const legX = [-(outer - leg / 2), outer - leg / 2];
  const coilBottom = COIL.center - COIL.length / 2, coilTop = COIL.center + COIL.length / 2;
  for (const x of legX) {
    kit.cylinder(0.43, COIL.length + 0.12, mats.plastic, [x, COIL.center, 0], group, 40);
    for (const y of [coilBottom - 0.07, coilTop + 0.07]) kit.cylinder(0.72, 0.06, mats.plastic, [x, y, 0], group, 48);
  }
  const brass = kit.mat(0xc9a35c, 1, 0.3);
  const posts = legX.map(x => [V(x - 0.17, coilTop + 0.2, 0.52), V(x + 0.17, coilTop + 0.2, 0.52)]);
  for (const pair of posts) for (const p of pair) {
    kit.cylinder(0.05, 0.16, brass, [p.x, p.y - 0.05, p.z], group, 14);
    kit.cylinder(0.075, 0.04, brass, [p.x, p.y + 0.02, p.z], group, 16);
  }

  const windings = [[], []];
  const perLayer = Math.floor(COIL.length / (2 * COIL.wire * 1.08));
  function buildWinding(side, n, surface) {
    for (const old of windings[side]) { group.remove(old); old.geometry.dispose(); }
    windings[side] = [];
    const x = legX[side];
    const visible = Math.max(8, Math.round(n / 10));
    const layers = Math.ceil(visible / perLayer);
    let left = visible, radius = COIL.r0;
    for (let layer = 0; layer < layers; layer++) {
      const turns = Math.min(perLayer, left);
      const length = layers === 1 ? COIL.length : COIL.length * turns / perLayer;
      radius = COIL.r0 + layer * COIL.layerStep;
      const item = kit.coil({ radius, length, turns, wireRadius: COIL.wire, axis: 'y', material: surface, position: [x, coilBottom + length / 2, 0], segmentsPerTurn: 28 });
      item.rotation.y = -Math.PI / 2; // start and end of each layer face the viewer (+z)
      windings[side].push(item);
      left -= turns;
    }
    // leads: last layer end to right post, first layer start brought up the front to left post
    const lastLength = layers === 1 ? COIL.length : COIL.length * (visible - perLayer * (layers - 1)) / perLayer;
    const endY = coilBottom + lastLength;
    const [postA, postB] = posts[side];
    const out = radius + COIL.wire;
    const leadEnd = kit.wire([[x, endY, out - 0.01], [x + 0.06, Math.max(endY + 0.08, coilTop + 0.02), out + 0.03], [postB.x, coilTop + 0.12, postB.z + 0.02], [postB.x, postB.y + 0.02, postB.z]], 0.022, surface);
    const leadStart = kit.wire([[x, coilBottom, COIL.r0], [x - 0.04, coilBottom + 0.02, out + 0.05], [x - 0.1, COIL.center, out + 0.07], [x - 0.15, coilTop + 0.02, out + 0.06], [postA.x, coilTop + 0.12, postA.z + 0.03], [postA.x, postA.y + 0.02, postA.z]], 0.022, surface);
    windings[side].push(leadEnd, leadStart);
  }
  const copperPrimary = mats.copper;
  const copperSecondary = kit.mat(0xb8693a, 1, 0.3, { clearcoat: 0.35, clearcoatRoughness: 0.25 });

  // ---------- AC source ----------
  kit.roundedBox([1.4, 0.95, 1.0], 0.1, mats.plastic, [-3.6, -0.82, 0.25]);
  kit.roundedBox([1.1, 0.42, 0.02], 0.04, kit.mat(0x182320, 0.1, 0.3), [-3.6, -0.78, 0.755]);
  const knob = kit.cylinder(0.09, 0.08, mats.steel, [-3.25, -1.12, 0.78], group, 20); knob.rotation.x = Math.PI / 2;
  const sourceTerminals = [V(-3.95, -0.3, 0.45), V(-3.4, -0.3, 0.45)];
  kit.cylinder(0.06, 0.12, mats.cableRed, [sourceTerminals[0].x, -0.31, 0.45], group, 16);
  kit.cylinder(0.06, 0.12, mats.cableBlack, [sourceTerminals[1].x, -0.31, 0.45], group, 16);

  // ---------- lamp ----------
  const lampX = 3.55, lampZ = 0.3;
  kit.cylinder(0.5, 0.12, mats.ceramic, [lampX, -1.23, lampZ], group, 40);
  kit.cylinder(0.26, 0.32, mats.ceramic, [lampX, -1.02, lampZ], group, 32);
  kit.cylinder(0.19, 0.22, mats.steel, [lampX, -0.77, lampZ], group, 28);
  for (let i = 0; i < 4; i++) {
    const thread = kit.mesh(new THREE.TorusGeometry(0.192, 0.014, 6, 28), mats.steel, [lampX, -0.85 + 0.05 * i, lampZ]);
    thread.rotation.x = Math.PI / 2;
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xfff6dd, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.22, emissive: 0xffb44c, emissiveIntensity: 0, depthWrite: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 28), glass);
  bulb.scale.set(1, 1.12, 1); bulb.position.set(lampX, -0.28, lampZ); bulb.renderOrder = 3; group.add(bulb);
  const filament = new THREE.MeshStandardMaterial({ color: 0x8a7a66, emissive: 0xffa53a, emissiveIntensity: 0, roughness: 0.5 });
  kit.wire([[lampX - 0.1, -0.66, lampZ], [lampX - 0.1, -0.33, lampZ], [lampX - 0.05, -0.22, lampZ], [lampX, -0.3, lampZ], [lampX + 0.05, -0.22, lampZ], [lampX + 0.1, -0.33, lampZ], [lampX + 0.1, -0.66, lampZ]], 0.012, filament);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: kit.canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,214,140,1)'); g.addColorStop(0.35, 'rgba(255,190,100,.45)'); g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  }));
  halo.position.set(lampX, -0.28, lampZ); halo.scale.set(1.8, 1.8, 1); halo.renderOrder = 4; group.add(halo);
  const lampLight = new THREE.PointLight(0xffc06a, 0, 4, 2);
  lampLight.position.set(lampX, -0.25, lampZ + 0.1); group.add(lampLight);
  const lampTerminals = [V(lampX - 0.38, -1.15, lampZ + 0.12), V(lampX + 0.38, -1.15, lampZ + 0.12)];
  for (const t of lampTerminals) kit.cylinder(0.05, 0.08, brass, [t.x, -1.15, t.z], group, 14);

  // ---------- external circuits ----------
  const pA = posts[0][0], pB = posts[0][1], sA = posts[1][0], sB = posts[1][1];
  const primaryOut = kit.wire([[pA.x, pA.y + 0.04, pA.z], [pA.x - 0.25, pA.y + 0.32, pA.z + 0.25], [-2.6, 1.2, 1.05], [-3.7, 0.25, 0.95], [-3.95, -0.05, 0.6], [sourceTerminals[0].x, -0.24, 0.45]], 0.035, mats.cableRed);
  const primaryBack = kit.wire([[-3.4, -0.24, 0.45], [-3.25, 0.05, 0.75], [-2.55, 0.85, 1.2], [-1.75, 1.75, 0.95], [pB.x, pB.y + 0.3, pB.z + 0.1], [pB.x, pB.y + 0.04, pB.z]], 0.035, mats.cableBlack);
  const secondaryOut = kit.wire([[sB.x, sB.y + 0.04, sB.z], [sB.x + 0.25, sB.y + 0.32, sB.z + 0.25], [2.65, 1.1, 1.1], [3.35, -0.35, 1.05], [lampTerminals[1].x, -0.95, lampTerminals[1].z + 0.2], [lampTerminals[1].x, -1.1, lampTerminals[1].z]], 0.035, mats.cableRed);
  const secondaryBack = kit.wire([[lampTerminals[0].x, -1.1, lampTerminals[0].z], [lampTerminals[0].x - 0.1, -0.9, lampTerminals[0].z + 0.35], [2.55, -0.2, 1.2], [2.05, 1.2, 1.0], [sA.x, sA.y + 0.35, sA.z + 0.15], [sA.x, sA.y + 0.04, sA.z]], 0.035, mats.cableBlack);
  // Current dots: conventional current direction, synchronised with the instantaneous current.
  const dotOpts = { count: 9, radius: 0.045, color: 0xffd27a, emissive: 0.9 };
  const primaryDots = [kit.dots(primaryOut.userData.curve, dotOpts), kit.dots(primaryBack.userData.curve, dotOpts)];
  const secondaryDots = [kit.dots(secondaryBack.userData.curve, dotOpts), kit.dots(secondaryOut.userData.curve, dotOpts)];
  // primaryOut runs post→source, so positive current (source + → coil) moves backwards along it.
  const primaryDir = [-1, -1];
  // secondaryBack runs lamp→coil, secondaryOut coil→lamp: positive current leaves the coil at sB.
  const secondaryDir = [-1, -1];

  // ---------- magnetic flux inside the core ----------
  function loop(offset, z) {
    const x = legX[1] + offset, yb = bottom + leg / 2 - offset, yt = winTop + (top - winTop) / 2 + offset, r = 0.16;
    const pts = [];
    const arc = (cx, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 - (k / 4) * Math.PI / 2; pts.push(V(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); } };
    // clockwise as seen from the front: up the left (primary) leg, right along the top, down the right leg
    pts.push(V(-x, yb + r, z), V(-x, (yb + yt) / 2, z));
    arc(-x + r, yt - r, Math.PI); pts.push(V(0, yt, z));
    arc(x - r, yt - r, Math.PI / 2); pts.push(V(x, (yb + yt) / 2, z));
    arc(x - r, yb + r, 0); pts.push(V(0, yb, z));
    arc(-x + r, yb + r, -Math.PI / 2);
    pts.pop(); // closing point coincides with the start
    return pts;
  }
  const fluxLines = [];
  for (const [offset, z] of [[-0.13, depth / 2 + 0.018], [0, depth / 2 + 0.022], [0.13, depth / 2 + 0.018], [0, -depth / 2 - 0.02]]) {
    const points = loop(offset, z);
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.1);
    fluxLines.push(kit.flowLine(curve, { color: 0x2f9a68, radius: 0.022, opacity: 0.95, closed: true, repeat: 5, width: 0.35 }));
  }
  const fluxArrows = [
    { from: [-0.35, (winTop + top) / 2, depth / 2 + 0.03], dir: [1, 0, 0] },
    { from: [0.35, bottom + leg / 2, depth / 2 + 0.03], dir: [-1, 0, 0] },
  ].map(a => ({ ...a, api: kit.arrow({ from: a.from, dir: a.dir, length: 0.7, radius: 0.035, color: 0x1f7a52, emissive: 0.15 }) }));

  // ---------- labels ----------
  const primaryLabel = kit.label('Primärspule N₁ = 400', [legX[0], coilTop + 0.75, 0], { tone: 'copper' });
  const secondaryLabel = kit.label('Sekundärspule N₂ = 200', [legX[1], coilTop + 0.75, 0], { tone: 'copper' });
  kit.label('Eisenkern', [0, top + 0.25, 0], { size: 's' });
  const fluxLabel = kit.label('magnetischer Fluss Φ', [0, bottom - 0.02, depth / 2 + 0.35], { tone: 'accent', size: 's' });
  const sourceLabel = kit.label('~ 12 V', [-3.6, -0.78, 0.8], { tone: 'accent' });
  kit.label('Spannungsquelle', [-3.6, 0.0, 0.25], { size: 's', tone: 'ghost' });
  const lampLabel = kit.label('Lampe · 20 Ω', [lampX, 0.42, lampZ], { size: 's' });

  let built = '', lastTime = 0, labelKey = '';
  let dotOffsetP = 0, dotOffsetS = 0;

  return {
    camera: { target: [0, 0.2, 0.1], distance: 11.6, yaw: 0.32, pitch: 0.3, floor: -1.5, shadowSize: 6.5, fitAspect: 1.6 },
    views: {
      overview: { target: [0, 0.2, 0.1], yaw: 0.32, pitch: 0.3, zoom: 1 },
      core: { target: [0, 0.35, 0], yaw: 0.02, pitch: 0.1, zoom: 0.62 },
      secondary: { target: [2.55, -0.1, 0.3], yaw: 0.55, pitch: 0.26, zoom: 0.5 },
    },
    update(state, time) {
      const values = calculate(state, time);
      const primary = Number(state.primary ?? 400), secondary = Number(state.secondary ?? 200);
      const input = Number(state.voltage ?? 12), load = Number(state.load ?? 20);
      const key = `${primary}:${secondary}`;
      if (key !== built) {
        built = key;
        buildWinding(0, primary, copperPrimary);
        buildWinding(1, secondary, copperSecondary);
      }
      const newLabelKey = `${primary}:${secondary}:${input}:${load}:${state.dc}`;
      if (newLabelKey !== labelKey) {
        labelKey = newLabelKey;
        primaryLabel.set(`Primärspule N₁ = ${primary}`);
        secondaryLabel.set(`Sekundärspule N₂ = ${secondary}`);
        sourceLabel.set(`${state.dc ? '⎓' : '~'} ${fmt(input)} V`);
        lampLabel.set(`Lampe · ${fmt(load)} Ω`);
        fluxLabel.set(state.dc ? 'Fluss Φ konstant' : 'magnetischer Fluss Φ');
      }

      let dt = time - lastTime; lastTime = time;
      if (!(dt > 0 && dt < 0.5)) dt = 0;

      // Flux: direction and strength follow Φ(t); in DC it is constant (no change → no induction).
      const flux = values.flux;
      for (const line of fluxLines) line.set({ speed: state.dc ? 0 : 0.55 * flux, strength: state.dc ? 0.95 : 0.35 + 0.65 * Math.abs(flux) });
      for (const a of fluxArrows) {
        const sign = flux < 0 ? -1 : 1;
        a.api.set(a.dir.map(c => c * sign), 0.25 + 0.45 * Math.abs(flux));
        a.api.material.opacity = 1;
      }

      // Currents (RMS ratio shown by speed, sign by the instantaneous value).
      const phase = 2 * Math.PI * 0.35 * time;
      const i2 = values.current, i1 = values.primaryCurrent ?? 0;
      const imax = Math.max(i1, i2, 1e-6);
      if (state.dc) {
        dotOffsetP += dt * 0.22;
      } else {
        dotOffsetP += dt * 0.4 * Math.sin(phase) * (i1 / imax);
        dotOffsetS += dt * 0.4 * Math.sin(phase) * (i2 / imax);
      }
      primaryDots.forEach((d, k) => d.place(primaryDir[k] * dotOffsetP));
      secondaryDots.forEach((d, k) => { d.place(secondaryDir[k] * dotOffsetS); d.mesh.visible = !state.dc && i2 > 1e-6; });
      primaryDots.forEach(d => { d.mesh.visible = state.dc || i1 > 1e-6; });

      // Lamp: brightness from the (RMS) power, logarithmic so small and large loads both read.
      const glow = state.dc ? 0 : Math.min(1, Math.log10(1 + values.power) / Math.log10(51));
      filament.emissiveIntensity = 0.2 + glow * 6;
      filament.color.setHex(glow > 0.02 ? 0xffd9a0 : 0x8a7a66);
      glass.emissiveIntensity = glow * 0.55;
      glass.opacity = 0.22 + glow * 0.25;
      halo.material.opacity = glow * 0.85;
      halo.scale.setScalar(1.2 + glow * 1.4);
      lampLight.intensity = glow * 6;

      let note;
      if (state.dc) {
        note = 'Gleichspannung: Nach dem Einschalten bleibt der Fluss im Kern konstant. Ohne Flussänderung wird in der Sekundärspule nichts induziert – U₂ = 0 V, die Lampe bleibt dunkel.';
      } else if (input === 0) {
        note = 'Ohne Eingangsspannung gibt es keinen wechselnden Fluss und damit keine Sekundärspannung.';
      } else {
        const moment = Math.abs(flux) > 0.92
          ? 'Gerade ist der Fluss fast maximal, ändert sich aber kaum – U₂ geht durch null.'
          : Math.abs(flux) < 0.3
            ? 'Gerade wechselt der Fluss seine Richtung und ändert sich am schnellsten – U₂ ist fast maximal.'
            : 'Der Fluss im Kern ändert sich ständig. Diese Änderung induziert U₂ in der Sekundärspule.';
        const kind = values.ratio > 1.001 ? 'hochtransformiert' : values.ratio < 0.999 ? 'heruntertransformiert' : 'unverändert übertragen';
        note = `N₂/N₁ = ${secondary}/${primary} = ${fmt(values.ratio, 2)}: Die Spannung wird ${kind} (${fmt(input)} V → ${fmt(values.voltage, 2)} V). Der Strom ändert sich umgekehrt: I₁ = ${fmt(i1, 3)} A, I₂ = ${fmt(i2, 3)} A. ${moment}`;
      }

      return {
        metrics: [
          { label: 'Sekundärspannung U₂ (effektiv)', value: `${fmt(values.voltage, 2)} V` },
          { label: 'Sekundärstrom I₂ (effektiv)', value: `${fmt(values.current, 3)} A` },
          { label: 'Leistung an der Last P₂', value: `${fmt(values.power, 2)} W` },
        ],
        note,
        graph: { value: values.instantaneousVoltage, max: Math.max(1, values.voltage * Math.SQRT2), label: 'Momentanspannung U₂ in V · Zeitlupe' },
      };
    },
  };
}
