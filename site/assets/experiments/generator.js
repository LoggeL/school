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
  const AXIS_Y = 0.35;          // height of the rotation axis
  const HALF = 0.78;            // half side of the coil square (y and z extent in rotor space)
  const SHOE_IN = 1.08;         // inner radius of the concave pole shoes
  const SHOE_OUT = 1.5;
  const DEPTH = 1.9;            // pole depth along z

  // ---------- base ----------
  roundedBox([7.4, 0.3, 5.0], 0.12, mats.base, [0, -1.35, 0.45]);
  roundedBox([7.0, 0.04, 4.6], 0.04, kit.mat(0x3a5a51, 0.05, 0.7), [0, -1.19, 0.45]);
  const baseTop = -1.17;

  // ---------- magnet circuit: yoke, two block magnets, concave pole shoes ----------
  roundedBox([5.6, 0.42, DEPTH], 0.06, mats.ironDark, [0, baseTop + 0.21, 0]);
  const magnetH = 2.1;
  for (const side of [-1, 1]) {
    const material = side < 0 ? mats.magnetN : mats.magnetS;
    const mx = side * 2.25;
    roundedBox([0.95, magnetH, DEPTH], 0.06, material, [mx, baseTop + 0.42 + magnetH / 2, 0]);
    // Pole shoe: an arc segment around the rotation axis, extruded along z.
    const span = 0.95; // half-angle in rad
    const shape = new THREE.Shape();
    const a0 = side < 0 ? Math.PI - span : -span;
    const a1 = side < 0 ? Math.PI + span : span;
    shape.absarc(0, 0, SHOE_OUT, a0, a1, false);
    shape.absarc(0, 0, SHOE_IN, a1, a0, true);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 40 });
    geometry.translate(0, 0, -DEPTH / 2);
    mesh(geometry, mats.iron, [0, AXIS_Y, 0]);
    // filler between shoe and magnet block
    roundedBox([0.5, magnetH * 0.82, DEPTH * 0.98], 0.04, mats.iron, [side * 1.55, AXIS_Y, 0]);
  }
  label('N', [-2.25, baseTop + 0.42 + magnetH + 0.28, 0.2], { tone: 'n' });
  label('S', [2.25, baseTop + 0.42 + magnetH + 0.28, 0.2], { tone: 'south' });

  // ---------- homogeneous field lines from N shoe to S shoe ----------
  const fieldLines = [];
  for (const dy of [-0.6, -0.2, 0.2, 0.6]) {
    for (const z of [-0.7, -0.23, 0.23, 0.7]) {
      const x = Math.sqrt(SHOE_IN ** 2 - dy ** 2) - 0.02;
      fieldLines.push(flowLine([[-x, AXIS_Y + dy, z], [0, AXIS_Y + dy, z], [x, AXIS_Y + dy, z]], { color: 0x2f8a5f, radius: 0.013, speed: 0.45, repeat: 2, width: 0.32 }));
    }
  }
  const fieldLabel = label('Magnetfeld B', [0, AXIS_Y + 1.32, -0.95], { tone: 'accent', size: 's' });

  // ---------- rotor (coil, axle, slip rings, crank) ----------
  const rotor = new THREE.Group();
  rotor.position.set(0, AXIS_Y, 0);
  group.add(rotor);

  // Rounded square path in the rotor's y-z plane (normal = local +x).
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
  // Fine lengthwise strands give the bundle the look of many parallel turns.
  const strandTexture = canvasTexture(64, 256, (ctx, W, H) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    ctx.fillStyle = '#d88a52'; ctx.fillRect(0, 0, W, H);
    const rows = 16;
    for (let i = 0; i < rows; i++) {
      const y = (i / rows) * H;
      const g = ctx.createLinearGradient(0, y, 0, y + H / rows);
      g.addColorStop(0, '#7d3f1c'); g.addColorStop(0.35, '#f1b98a'); g.addColorStop(0.6, '#d0864f'); g.addColorStop(1, '#7d3f1c');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, H / rows);
    }
    void grad;
  });
  strandTexture.wrapS = strandTexture.wrapT = THREE.RepeatWrapping;
  strandTexture.repeat.set(40, 1);
  const bundleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: strandTexture, metalness: 0.85, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const coilPath = squarePath(HALF, 0.14);
  let bundle = null, bundleTurns = -1;
  function buildBundle(turns) {
    if (turns === bundleTurns) return;
    bundleTurns = turns;
    if (bundle) { rotor.remove(bundle); bundle.geometry.dispose(); }
    const radius = 0.035 + 0.055 * Math.sqrt(turns / 200);
    bundle = mesh(new THREE.TubeGeometry(coilPath, 220, radius, 14, true), bundleMaterial, [0, 0, 0], rotor);
    // flatten the cross-section along x so it reads as a wound pack, not a pipe
    bundle.scale.set(0.75, 1, 1);
  }
  buildBundle(100);

  // Coil former: ivory frame spokes from the axle to the winding.
  for (const z of [-HALF, HALF]) {
    const spoke = mesh(new THREE.BoxGeometry(0.07, 2 * HALF - 0.1, 0.07), mats.ceramic, [0, 0, z * 0.97], rotor);
    spoke.castShadow = true;
  }
  mesh(new THREE.BoxGeometry(0.06, 0.06, 2 * HALF), mats.ceramic, [0, 0, 0], rotor).rotation.x = 0;

  // Flux window: tinted by the momentary flux Φ ∝ cos θ.
  const fluxMaterial = new THREE.MeshBasicMaterial({ color: 0x3f9a6c, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const fluxPlane = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF - 0.08, 2 * HALF - 0.08), fluxMaterial);
  fluxPlane.rotation.y = Math.PI / 2; fluxPlane.renderOrder = 1;
  rotor.add(fluxPlane);

  const normalArrow = arrow({ from: [0, 0, 0], dir: [1, 0, 0], length: 1.45, radius: 0.03, color: 0xe0a33a, parent: rotor, emissive: 0.25 });
  label('Flächennormale n', [1.62, 0.12, 0], { parent: rotor, tone: 'copper', size: 's' });
  const coilLabel = label('Spule', [0, HALF + 0.32, -HALF], { parent: rotor, tone: 'copper', size: 's' });

  // Current dots run along the winding; direction and pace follow the voltage.
  const currentDots = dots(squarePath(HALF + 0.005, 0.14), { count: 28, radius: 0.042, color: 0xffd36b, parent: rotor, emissive: 0.9 });

  // Axle along z, bearings, slip rings and crank.
  const axle = mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 24), mats.steel, [0, 0, 0.55], rotor);
  axle.rotation.x = Math.PI / 2;
  const RING_Z = [1.62, 1.92];
  for (const z of RING_Z) {
    const ring = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 40), mats.copper, [0, 0, z], rotor);
    ring.rotation.x = Math.PI / 2;
  }
  for (const z of [1.47, 1.77, 2.07]) {
    const insulator = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.13, 32), mats.plastic, [0, 0, z], rotor);
    insulator.rotation.x = Math.PI / 2;
  }
  // Leads from the coil ends to the two rings, close to the axle.
  wire([[0, 0.1, HALF], [0, 0.11, 1.1], [0, 0.17, 1.45], [0, 0.205, RING_Z[0] - 0.04]], 0.018, mats.copperDark, rotor);
  wire([[0, -0.1, HALF], [0, -0.11, 1.1], [0.0, -0.11, 1.5], [0.11, -0.09, 1.7], [0, -0.205, RING_Z[1] - 0.04]], 0.018, mats.copperDark, rotor);
  // Crank
  const CRANK_Z = 2.72;
  roundedBox([0.16, 0.95, 0.1], 0.04, mats.steel, [0, 0.4, CRANK_Z], rotor);
  const hub = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 24), mats.steel, [0, 0, CRANK_Z], rotor);
  hub.rotation.x = Math.PI / 2;
  const handle = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.5, 20), mats.wood, [0, 0.82, CRANK_Z + 0.28], rotor);
  handle.rotation.x = Math.PI / 2;

  // Bearing blocks (stationary)
  for (const z of [-1.3, 1.28, 2.4]) {
    const h = AXIS_Y - baseTop;
    roundedBox([0.38, h + 0.12, 0.2], 0.05, mats.ceramic, [0, baseTop + (h + 0.12) / 2 - 0.06, z]);
  }

  // Brushes pressed against the rings from below, with terminal posts.
  const brushTerminals = [];
  RING_Z.forEach((z, i) => {
    const bx = 0.42;
    roundedBox([0.2, 0.16, 0.1], 0.03, kit.mat(0x2a2b2b, 0.2, 0.75), [0.27, AXIS_Y - 0.14, z]).rotation.z = 0.55;
    roundedBox([0.06, AXIS_Y - baseTop - 0.02, 0.06], 0.02, mats.steel, [bx, (AXIS_Y + baseTop) / 2 - 0.1, z]);
    cylinder(0.06, 0.1, i === 0 ? mats.cableRed : mats.cableBlack, [bx + 0.25, baseTop + 0.05, z], group, 16);
    brushTerminals.push([bx + 0.25, baseTop + 0.1, z]);
  });
  const ringsLabel = label('Schleifringe', [-0.55, AXIS_Y + 0.45, 1.8], { tone: 'dark', size: 's' });

  // ---------- meter ----------
  const meterPos = [2.65, baseTop, 2.0];
  const meterRot = -0.5;
  const gauge = meter({ position: meterPos, rotationY: meterRot, size: 1.1, centerZero: true, unit: 'V' });
  const local = (x, y, z) => {
    const c = Math.cos(meterRot), s = Math.sin(meterRot);
    return [meterPos[0] + c * x + s * z, meterPos[1] + y, meterPos[2] - s * x + c * z];
  };
  const mw = 1.25 * 1.1, md = 0.42 * 1.1;
  const termA = local(-mw * 0.3, 0.09, md / 2 + 0.088);
  const termB = local(mw * 0.3, 0.09, md / 2 + 0.088);
  wire([brushTerminals[0], [1.0, baseTop + 0.05, 1.75], [1.6, baseTop + 0.05, 2.5], [termA[0] - 0.15, baseTop + 0.05, termA[2] + 0.25], termA], 0.028, mats.cableRed);
  wire([brushTerminals[1], [1.0, baseTop + 0.05, 2.25], [1.9, baseTop + 0.05, 2.85], [termB[0], baseTop + 0.05, termB[2] + 0.3], termB], 0.028, mats.cableBlack);
  const rangeLabel = label('Messbereich ±5 V', [meterPos[0] + 0.1, baseTop + 1.35, meterPos[2] - 0.1], { tone: 'ghost', size: 's' });

  // ---------- update ----------
  const fmt = (value, digits = 2) => (Math.abs(value) < 1e-8 ? 0 : value).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const ranges = [1, 2, 5, 10, 20, 50, 100];
  const positive = new THREE.Color(0x2f9a68), negative = new THREE.Color(0xd9822f);
  let lastTime = null, dotOffset = 0;

  return {
    camera: { target: [0, -0.05, 0.75], distance: 11.2, yaw: 0.62, pitch: 0.4, floor: -1.5, shadowSize: 6, fitAspect: 1.55 },
    views: {
      overview: { target: [0, -0.05, 0.75], yaw: 0.62, pitch: 0.4, zoom: 1 },
      coil: { target: [0, AXIS_Y, 0], yaw: 0.18, pitch: 0.42, zoom: 0.58 },
      sliprings: { target: [0.1, AXIS_Y - 0.15, 1.9], yaw: 1.05, pitch: 0.3, zoom: 0.36 },
      meter: { target: [meterPos[0] - 0.3, baseTop + 0.6, meterPos[2]], yaw: 0.05, pitch: 0.28, zoom: 0.42 },
    },
    update(state, time) {
      const result = calculate(state, time);
      const turns = Number(state.turns ?? 100);
      const field = Number(state.field ?? 0.5);
      buildBundle(turns);
      rotor.rotation.z = result.angle;

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
      void coilLabel; void ringsLabel; void normalArrow;
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
