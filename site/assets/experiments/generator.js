// Hand-cranked AC generator: a rectangular coil turns about a horizontal axis (z)
// in the homogeneous field between two pole shoes. A = 0.02 m²; ideal, open circuit.
// The drawn winding pack is symbolic; its thickness grows with the chosen N.
export function calculate(state, time) {
  const speed = Number(state.speed ?? 30);
  const turns = Number(state.turns ?? 100);
  const field = Number(state.field ?? 0.5);
  const frequency = speed / 60;
  const angularSpeed = 2 * Math.PI * frequency;
  const angle = angularSpeed * time;
  const area = 0.02;
  const peak = turns * area * field * angularSpeed;
  return {
    angle,
    voltage: peak * Math.sin(angle),
    peak,
    flux: area * field * Math.cos(angle),
    frequency,
    angularSpeed,
    area,
  };
}

export function createExperiment({ THREE, group, kit }) {
  const { mats, mesh, roundedBox, cylinder, wire, label, flowLine, arrow, dots, meter, canvasTexture } = kit;
  // Vertical rotation axis (y). Field along +x from the N pole shoe (left) to the S pole shoe (right).
  const baseTop = -1.17;
  const YC = 0.22;              // height of the coil centre
  const HALF = 0.74;            // half side of the square coil
  const SHOE_IN = 1.02;         // inner radius of the concave pole shoes
  const SHOE_OUT = 1.42;
  const SPAN = 0.78;            // half opening angle of a shoe (rad)
  const DEPTH = 1.8;            // magnet depth along z
  const magnetH = 2.15;
  const yokeTop = baseTop + 0.38;
  const magnetTop = yokeTop + magnetH;

  // ---------- base ----------
  roundedBox([7.2, 0.3, 4.5], 0.12, mats.base, [0, -1.35, 0.6]);
  roundedBox([6.9, 0.03, 4.2], 0.02, kit.mat(0x3b5b52, 0.05, 0.72), [0, -1.19, 0.6]);

  // ---------- magnet circuit: iron yoke, block magnets, concave pole shoes ----------
  roundedBox([5.4, 0.38, DEPTH], 0.06, mats.ironDark, [0, baseTop + 0.19, 0]);
  const shoeHeight = 2 * HALF + 0.36;
  for (const side of [-1, 1]) {
    roundedBox([0.9, magnetH, DEPTH], 0.07, side < 0 ? mats.magnetN : mats.magnetS, [side * 2.2, yokeTop + magnetH / 2, 0]);
    const shape = new THREE.Shape();
    const a0 = side < 0 ? Math.PI - SPAN : -SPAN, a1 = side < 0 ? Math.PI + SPAN : SPAN;
    shape.absarc(0, 0, SHOE_OUT, a0, a1, false);
    shape.absarc(0, 0, SHOE_IN, a1, a0, true);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: shoeHeight, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 36 });
    geometry.rotateX(-Math.PI / 2);
    mesh(geometry, mats.iron, [0, YC - shoeHeight / 2, 0]);
    // iron block connecting shoe and magnet
    roundedBox([0.42, shoeHeight * 0.96, DEPTH * 0.62], 0.04, mats.iron, [side * 1.55, YC, 0]);
  }
  label('N', [-2.2, magnetTop + 0.3, 0.3], { tone: 'n' });
  label('S', [2.2, magnetTop + 0.3, 0.3], { tone: 'south' });

  // ---------- homogeneous field: lines from the N shoe to the S shoe ----------
  const fieldLines = [];
  for (const dy of [-0.56, -0.19, 0.19, 0.56]) {
    for (const z of [-0.6, -0.2, 0.2, 0.6]) {
      const x = Math.sqrt(SHOE_IN ** 2 - z ** 2) - 0.01;
      fieldLines.push(flowLine([[-x, YC + dy, z], [0, YC + dy, z], [x, YC + dy, z]], { color: 0x23794f, radius: 0.014, speed: 0.4, repeat: 2, width: 0.34 }));
    }
  }
  const fieldLabel = label('Magnetfeld B', [0.15, YC - HALF - 0.2, 1.05], { tone: 'accent', size: 's' });

  // ---------- rotor: coil, axle, slip rings, crank ----------
  const rotor = new THREE.Group();
  rotor.position.set(0, YC, 0);
  group.add(rotor);

  // Rounded square in the rotor's y-z plane; its normal is the local +x axis.
  function squarePath(h, r) {
    const path = new THREE.CurvePath();
    const v = (y, z) => new THREE.Vector3(0, y, z);
    path.add(new THREE.LineCurve3(v(h - r, h), v(-h + r, h)));
    path.add(new THREE.QuadraticBezierCurve3(v(-h + r, h), v(-h, h), v(-h, h - r)));
    path.add(new THREE.LineCurve3(v(-h, h - r), v(-h, -h + r)));
    path.add(new THREE.QuadraticBezierCurve3(v(-h, -h + r), v(-h, -h), v(-h + r, -h)));
    path.add(new THREE.LineCurve3(v(-h + r, -h), v(h - r, -h)));
    path.add(new THREE.QuadraticBezierCurve3(v(h - r, -h), v(h, -h), v(h, -h + r)));
    path.add(new THREE.LineCurve3(v(h, -h + r), v(h, h - r)));
    path.add(new THREE.QuadraticBezierCurve3(v(h, h - r), v(h, h), v(h - r, h)));
    return path;
  }
  // Lengthwise strands make the bundle read as many parallel turns of enamelled wire.
  const strandTexture = canvasTexture(32, 256, (ctx, W, H) => {
    const rows = 16;
    for (let i = 0; i < rows; i++) {
      const y = (i / rows) * H, g = ctx.createLinearGradient(0, y, 0, y + H / rows);
      g.addColorStop(0, '#6e3517'); g.addColorStop(0.3, '#f0b585'); g.addColorStop(0.55, '#cf8450'); g.addColorStop(1, '#6e3517');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, H / rows);
    }
  });
  strandTexture.wrapS = strandTexture.wrapT = THREE.RepeatWrapping;
  strandTexture.repeat.set(1, 3);
  const bundleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: strandTexture, metalness: 0.85, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const coilPath = squarePath(HALF, 0.13);
  let bundle = null, bundleTurns = -1;
  function buildBundle(turns) {
    if (turns === bundleTurns) return;
    bundleTurns = turns;
    if (bundle) { rotor.remove(bundle); bundle.geometry.dispose(); }
    const radius = 0.03 + 0.06 * Math.sqrt(turns / 200);
    bundle = mesh(new THREE.TubeGeometry(coilPath, 200, radius, 12, true), bundleMaterial, [0, 0, 0], rotor);
    bundle.scale.set(0.7, 1, 1); // flat winding pack instead of a round pipe
  }
  buildBundle(100);

  // Ivory coil former: cross bars from the axle to the winding.
  mesh(new THREE.BoxGeometry(0.05, 0.06, 2 * HALF - 0.04), mats.ceramic, [0, HALF - 0.02, 0], rotor);
  mesh(new THREE.BoxGeometry(0.05, 0.06, 2 * HALF - 0.04), mats.ceramic, [0, -HALF + 0.02, 0], rotor);

  // Flux window: tinted by the momentary flux Φ ∝ cos θ (green / orange = sign).
  const fluxMaterial = new THREE.MeshBasicMaterial({ color: 0x3f9a6c, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const fluxPlane = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF - 0.06, 2 * HALF - 0.06), fluxMaterial);
  fluxPlane.rotation.y = Math.PI / 2; fluxPlane.renderOrder = 1;
  rotor.add(fluxPlane);

  const normalArrow = arrow({ from: [0, 0.32, 0], dir: [1, 0, 0], length: 0.95, radius: 0.026, color: 0xe2a53b, parent: rotor, emissive: 0.3 });
  label('Flächennormale n', [1.02, 0.5, 0], { parent: rotor, tone: 'copper', size: 's' });
  label('Spule', [0, -HALF - 0.05, HALF + 0.12], { parent: rotor, tone: 'copper', size: 's' });

  // Current dots along the winding; direction and pace follow the voltage.
  const currentDots = dots(squarePath(HALF, 0.13), { count: 26, radius: 0.04, color: 0xffd36b, parent: rotor, emissive: 0.9 });

  // Axle, bearings, slip rings, crank.
  const AXLE_TOP = magnetTop + 1.25;
  const axleLength = AXLE_TOP - (yokeTop - 0.02);
  mesh(new THREE.CylinderGeometry(0.055, 0.055, axleLength, 24), mats.steel, [0, (AXLE_TOP + yokeTop) / 2 - YC, 0], rotor);
  const RING_Y = [magnetTop + 0.42 - YC, magnetTop + 0.72 - YC];
  for (const y of RING_Y) mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 40), mats.copper, [0, y, 0], rotor);
  for (const y of [RING_Y[0] - 0.15, RING_Y[1] - 0.15, RING_Y[1] + 0.15]) mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 32), mats.plastic, [0, y, 0], rotor);
  // Leads from both coil ends up along the axle to their own ring.
  wire([[0, HALF, 0.09], [0, HALF + 0.3, 0.075], [0, RING_Y[0] - 0.3, 0.075], [0, RING_Y[0], 0.19]], 0.016, mats.copperDark, rotor);
  wire([[0, HALF, -0.09], [0, HALF + 0.3, -0.075], [0, RING_Y[1] - 0.3, -0.075], [0, RING_Y[1] - 0.08, -0.11], [0, RING_Y[1], -0.19]], 0.016, mats.copperDark, rotor);
  // Crank on top.
  const crankY = AXLE_TOP - YC - 0.05;
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 24), mats.steel, [0, crankY, 0], rotor);
  roundedBox([0.72, 0.08, 0.14], 0.035, mats.steel, [0.33, crankY, 0], rotor);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 20), mats.wood, [0.64, crankY + 0.25, 0], rotor);

  // Stationary: lower bearing on the yoke and an upper bridge resting on both magnets.
  cylinder(0.16, 0.12, mats.ceramic, [0, yokeTop + 0.06, 0]);
  roundedBox([5.2, 0.14, 0.5], 0.05, mats.wood, [0, magnetTop + 0.07, 0]);
  cylinder(0.13, 0.12, mats.ceramic, [0, magnetTop + 0.2, 0]);

  // Brushes on a small post on the S side (+x), pressing on the rings.
  const brushTerminals = [];
  RING_Y.forEach((y, i) => {
    const wy = y + YC;
    roundedBox([0.16, 0.1, 0.1], 0.025, kit.mat(0x2b2c2c, 0.2, 0.8), [0.26, wy, 0]);
    roundedBox([0.36, 0.05, 0.06], 0.02, mats.steel, [0.5, wy, 0]);
    cylinder(0.05, 0.08, i === 0 ? mats.cableRed : mats.cableBlack, [0.7, wy, 0], group, 16).rotation.z = Math.PI / 2;
    brushTerminals.push([0.75, wy, 0]);
  });
  roundedBox([0.12, RING_Y[1] - RING_Y[0] + 0.45, 0.14], 0.03, mats.plastic, [0.78, (RING_Y[0] + RING_Y[1]) / 2 + YC - 0.03, 0]);
  roundedBox([0.3, 0.1, 0.3], 0.03, mats.plastic, [0.78, magnetTop + 0.19, 0]);
  label('Schleifringe', [-0.6, RING_Y[1] + YC + 0.05, 0.1], { tone: 'dark', size: 's' });
  void normalArrow;

  // ---------- meter on the front right, cables from the brush terminals ----------
  const meterPos = [2.2, baseTop, 2.05];
  const meterRot = -0.35;
  const gauge = meter({ position: meterPos, rotationY: meterRot, size: 1.1, centerZero: true, unit: 'V' });
  const local = (x, y, z) => {
    const c = Math.cos(meterRot), s = Math.sin(meterRot);
    return [meterPos[0] + c * x + s * z, meterPos[1] + y, meterPos[2] - s * x + c * z];
  };
  const mw = 1.25 * 1.1, md = 0.42 * 1.1;
  const termA = local(-mw * 0.3, 0.1, md / 2 + 0.088);
  const termB = local(mw * 0.3, 0.1, md / 2 + 0.088);
  const [tA, tB] = brushTerminals;
  wire([tA, [1.0, tA[1] + 0.05, 0.05], [2.0, magnetTop + 0.3, 0.12], [2.78, magnetTop - 0.2, 0.2], [2.85, baseTop + 0.6, 0.55], [2.9, baseTop + 0.04, 1.2], [termA[0] + 0.1, baseTop + 0.04, termA[2] + 0.35], termA], 0.026, mats.cableRed);
  wire([tB, [1.0, tB[1] + 0.05, -0.05], [2.05, magnetTop + 0.4, -0.08], [2.85, magnetTop - 0.25, -0.05], [3.0, baseTop + 0.6, 0.35], [3.2, baseTop + 0.04, 1.3], [termB[0] + 0.3, baseTop + 0.04, termB[2] + 0.4], termB], 0.026, mats.cableBlack);
  const rangeLabel = label('Messbereich ±5 V', [meterPos[0] + 0.2, baseTop + 0.02, meterPos[2] + 0.75], { tone: 'ghost', size: 's' });

  // ---------- update ----------
  const fmt = (value, digits = 2) => (Math.abs(value) < 1e-8 ? 0 : value).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const ranges = [1, 2, 5, 10, 20, 50, 100];
  const positive = new THREE.Color(0x2f9a68), negative = new THREE.Color(0xd9822f);
  let lastTime = null, dotOffset = 0;

  return {
    camera: { target: [0, 0.25, 0.55], distance: 11.5, yaw: 0.5, pitch: 0.36, floor: -1.5, shadowSize: 6, fitAspect: 1.55 },
    views: {
      overview: { target: [0, 0.25, 0.55], yaw: 0.5, pitch: 0.36, zoom: 1 },
      coil: { target: [0, YC, 0], yaw: 0.12, pitch: 0.5, zoom: 0.55 },
      sliprings: { target: [0, magnetTop + 0.6, 0.3], yaw: 0.75, pitch: 0.28, zoom: 0.36 },
      meter: { target: [meterPos[0] - 0.3, baseTop + 0.6, meterPos[2]], yaw: 0.05, pitch: 0.28, zoom: 0.42 },
    },
    update(state, time) {
      const result = calculate(state, time);
      const turns = Number(state.turns ?? 100);
      const field = Number(state.field ?? 0.5);
      buildBundle(turns);
      rotor.rotation.y = result.angle;

      // Field: visible only with B > 0, brightness grows with B.
      for (const line of fieldLines) line.set({ visible: field > 0, strength: 0.3 + 0.7 * field, speed: 0.45 });
      fieldLabel.show(field > 0);

      // Flux window tint and strength.
      const cos = Math.cos(result.angle);
      fluxMaterial.color.copy(cos >= 0 ? positive : negative);
      fluxMaterial.opacity = field > 0 ? 0.06 + 0.42 * Math.abs(cos) * Math.min(1, 0.35 + field) : 0.04;

      // Current dots: pace ∝ voltage (closed circuit through the meter).
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(0.1, time - lastTime));
      lastTime = time;
      const rel = result.peak > 0 ? result.voltage / Math.max(result.peak, 1e-9) : 0;
      const magnitude = Math.min(1, Math.abs(result.voltage) / 6);
      dotOffset += Math.sign(rel) * (0.15 + 0.5 * magnitude) * Math.abs(rel) * dt;
      currentDots.place(dotOffset);
      currentDots.mesh.visible = result.peak > 1e-6;
      currentDots.material.emissiveIntensity = 0.3 + 0.9 * Math.abs(rel);

      // Meter with automatic range.
      const range = ranges.find(r => r >= result.peak * 1.02) ?? 100;
      gauge.set(range ? result.voltage / range : 0);
      rangeLabel.set(`Messbereich ±${range} V`);

      const phase = ((result.angle * 180 / Math.PI) % 360 + 360) % 360;
      const deg = fmt(phase, 0);
      let note;
      if (!result.frequency) note = 'Die Spule steht still. Der Fluss durch ihre Fläche bleibt gleich – deshalb wird keine Spannung induziert.';
      else if (!field) note = 'Die Spule dreht sich, aber ohne Magnetfeld geht kein Fluss durch sie hindurch. Es gibt nichts, was sich ändern könnte: 0 V.';
      else if (Math.abs(Math.sin(result.angle)) < 0.2) note = `θ = ${deg}°: Die Spulenfläche steht quer zum Feld, der Fluss ist ${cos > 0 ? 'maximal' : 'maximal (umgekehrt)'}. Er ändert sich gerade kaum – die Spannung ist fast null.`;
      else if (Math.abs(Math.sin(result.angle)) > 0.94) note = `θ = ${deg}°: Die Fläche liegt parallel zu den Feldlinien, der Fluss ist null. Genau jetzt ändert er sich am schnellsten – die Spannung ist am größten.`;
      else note = `θ = ${deg}°: Der Fluss durch die Spule wird gerade ${(Math.sin(result.angle) > 0) === (cos > 0) ? 'schwächer' : 'stärker'}. Je schneller er sich ändert, desto größer die Spannung.`;
      return {
        metrics: [
          { label: 'Spannung jetzt', value: `${fmt(result.voltage)} V` },
          { label: 'Scheitelwert Û', value: `${fmt(result.peak)} V` },
          { label: 'Frequenz', value: `${fmt(result.frequency)} Hz` },
        ],
        note,
        graph: { value: result.voltage, max: Math.max(result.peak, 0.1), label: 'Induzierte Spannung U in V' },
      };
    },
  };
}
