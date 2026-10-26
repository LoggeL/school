// A rotating coil in a uniform field. A = 0.02 m²; ideal, open-circuit generator.
// The reduced number of drawn copper strands is symbolic, not the physical N.
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

export function createExperiment({ THREE, group }) {
  const mat = (color, metalness = 0, roughness = 0.5) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const copper = mat(0xd9904f, 0.8, 0.27);
  const steel = mat(0x84999b, 0.72, 0.32);
  const graphite = mat(0x273d3c, 0.25, 0.65);
  const ivory = mat(0xe6e3ce, 0.05, 0.56);
  const red = mat(0xbb6256, 0.27, 0.38);
  const blue = mat(0x56879b, 0.28, 0.38);
  const wireMaterial = mat(0x292f2a, 0.05, 0.7);

  function mesh(geometry, material, position, parent = group) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const box = (size, material, position, parent = group) =>
    mesh(new THREE.BoxGeometry(...size), material, position, parent);
  function tube(points, radius, material, parent = group) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return mesh(new THREE.TubeGeometry(curve, 64, radius, 8, false), material, [0, 0, 0], parent);
  }
  function text(content, position, color = '#e6ead6', width = 1.7, parent = group) {
    const bitmap = document.createElement('canvas');
    bitmap.width = 512; bitmap.height = 128;
    const ctx = bitmap.getContext('2d');
    ctx.font = '500 42px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.fillText(content, 256, 64);
    const texture = new THREE.CanvasTexture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.set(...position);
    sprite.scale.set(width, width / 4, 1);
    parent.add(sprite);
    return sprite;
  }

  box([6.6, 0.18, 2.6], graphite, [0, -1.35, 0]);
  box([6.15, 0.055, 2.18], mat(0x4e6459, 0.1, 0.75), [0, -1.23, 0]);
  for (const x of [-2.65, 2.65]) {
    box([1, 2.23, 1.6], x < 0 ? red : blue, [x, -0.06, -0.08]);
    box([0.08, 2.05, 1.4], steel, [x + (x < 0 ? 0.52 : -0.52), -0.06, -0.08]);
    text(x < 0 ? 'N' : 'S', [x, 1.4, 0], x < 0 ? '#ffc8b1' : '#bbdff2', 1.5);
  }
  text('Magnetfeld B', [-1.45, 1.76, -0.9], '#b9d9b9', 1.95);

  const fieldArrows = new THREE.Group();
  group.add(fieldArrows);
  for (const y of [-0.58, 0.63]) {
    for (const z of [-0.83, 0.83]) {
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-2.02, y, z), 4.04, 0xb4d7a4, 0.18, 0.085,
      );
      arrow.line.material.transparent = arrow.cone.material.transparent = true;
      fieldArrows.add(arrow);
    }
  }

  const rotor = new THREE.Group();
  rotor.position.y = 0.16;
  group.add(rotor);
  const coilArea = mesh(new THREE.PlaneGeometry(1.04, 1.48), new THREE.MeshBasicMaterial({ color: 0xf8c97d, side: THREE.DoubleSide, transparent: true, opacity: 0.075, depthWrite: false }), [0, 0, 0], rotor);
  coilArea.rotation.y = Math.PI / 2;
  // At θ = 0 the coil is in the yz plane: its normal and B both point along +x.
  // Rotation about +y therefore produces Φ = BA cos θ exactly as calculated above.
  const strands = [];
  for (let index = 0; index < 10; index++) {
    const y = 0.77 + index * 0.023;
    const z = 0.53 + index * 0.023;
    const r = 0.11;
    const curve = new THREE.CurvePath();
    const v = (a, b) => new THREE.Vector3(0, a, b);
    curve.add(new THREE.LineCurve3(v(y - r, z), v(-y + r, z)));
    curve.add(new THREE.QuadraticBezierCurve3(v(-y + r, z), v(-y, z), v(-y, z - r)));
    curve.add(new THREE.LineCurve3(v(-y, z - r), v(-y, -z + r)));
    curve.add(new THREE.QuadraticBezierCurve3(v(-y, -z + r), v(-y, -z), v(-y + r, -z)));
    curve.add(new THREE.LineCurve3(v(-y + r, -z), v(y - r, -z)));
    curve.add(new THREE.QuadraticBezierCurve3(v(y - r, -z), v(y, -z), v(y, -z + r)));
    curve.add(new THREE.LineCurve3(v(y, -z + r), v(y, z - r)));
    curve.add(new THREE.QuadraticBezierCurve3(v(y, z - r), v(y, z), v(y - r, z)));
    strands.push(mesh(new THREE.TubeGeometry(curve, 100, 0.026, 8, true), copper, [index * 0.012, 0, 0], rotor));
  }
  const axis = mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.9, 20), steel, [0, 0.25, 0], rotor);
  axis.receiveShadow = false;
  box([0.16, 0.13, 1.15], ivory, [0, 0.69, 0], rotor);
  box([0.16, 0.13, 1.15], ivory, [0, -0.69, 0], rotor);
  box([0.95, 0.085, 0.085], steel, [0.42, 1.73, 0], rotor);
  mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.33, 16), graphite, [0.85, 1.89, 0], rotor);
  const normal = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.36, 0xf8c97d, 0.2, 0.11);
  rotor.add(normal);
  text('Flächennormale n', [0.2, 2.52, 0.03], '#f8d79c', 2.1);
  text('Drehbare Spule', [-1.02, -0.98, 1.27], '#f1c89c', 1.85);
  // Two separate slip rings keep each coil terminal connected throughout rotation.
  for (const y of [-0.88, -1.07]) {
    const ring = mesh(new THREE.TorusGeometry(0.235, 0.055, 10, 32), copper, [0, y, 0], rotor);
    ring.rotation.x = Math.PI / 2;
    box([0.22, 0.075, 0.13], graphite, [0.35, y + rotor.position.y, 0]);
  }
  tube([[0, -0.72, 0.54], [0.12, -0.79, 0.34], [0.22, -0.88, 0]], 0.022, copper, rotor);
  tube([[0, -0.72, -0.54], [-0.1, -0.9, -0.33], [-0.22, -1.07, 0]], 0.022, copper, rotor);
  tube([[0.44, -0.72, 0], [0.77, -1.05, 0.42], [1.5, -1.12, 1.36], [2.2, -1.01, 1.45]], 0.024, wireMaterial);
  tube([[0.44, -0.91, 0], [0.72, -1.14, 0.7], [1.66, -1.15, 1.7], [2.65, -1.01, 1.45]], 0.024, red);

  const meterX = 2.45;
  const meterY = -0.65;
  box([1.3, 0.93, 0.38], graphite, [meterX, meterY, 1.35]);
  const dial = document.createElement('canvas');
  dial.width = 512; dial.height = 340;
  const ctx = dial.getContext('2d');
  ctx.fillStyle = '#f0efde'; ctx.fillRect(0, 0, 512, 340);
  ctx.strokeStyle = '#74816c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(256, 265, 205, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  for (let i = -5; i <= 5; i++) {
    const a = i * 0.22;
    ctx.beginPath();
    ctx.moveTo(256 + Math.sin(a) * 184, 265 - Math.cos(a) * 184);
    ctx.lineTo(256 + Math.sin(a) * 206, 265 - Math.cos(a) * 206);
    ctx.stroke();
  }
  ctx.fillStyle = '#334a3e'; ctx.font = '32px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('−', 48, 202); ctx.fillText('0', 256, 44); ctx.fillText('+', 464, 202);
  ctx.font = '500 36px system-ui'; ctx.fillText('V', 256, 327);
  const dialTexture = new THREE.CanvasTexture(dial);
  dialTexture.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.18, 0.79), new THREE.MeshBasicMaterial({ map: dialTexture }), [meterX, meterY, 1.546]);
  const needle = new THREE.Group();
  needle.position.set(meterX, meterY - 0.22, 1.562);
  group.add(needle);
  box([0.018, 0.43, 0.012], mat(0xb5553e), [0, 0.2, 0], needle);
  const pivot = mesh(new THREE.SphereGeometry(0.04, 12, 8), graphite, [0, 0, 0], needle);
  pivot.scale.z = 0.4;
  text('Induzierte Spannung', [2.42, 0.08, 1.49], '#d8e5d5', 1.9);

  const fmt = (value, digits = 2) => (Math.abs(value) < 1e-8 ? 0 : value).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return {
    update(state, time) {
      const result = calculate(state, time);
      const turns = Number(state.turns ?? 100);
      const field = Number(state.field ?? 0.5);
      rotor.rotation.y = result.angle;
      strands.forEach((strand, index) => { strand.visible = index < Math.max(1, Math.round(turns / 20)); });
      fieldArrows.visible = field > 0;
      for (const arrow of fieldArrows.children) {
        arrow.line.material.opacity = arrow.cone.material.opacity = 0.15 + 0.7 * field;
      }
      needle.rotation.z = -1.1 * (result.peak ? result.voltage / result.peak : 0);
      const phase = ((result.angle * 180 / Math.PI) % 360 + 360) % 360;
      let note = `Drehwinkel θ: ${fmt(phase, 0)}°. Die Flussänderung erzeugt eine Spannung mit wechselndem Vorzeichen.`;
      if (!result.frequency) note = 'Die Spule steht. Ihr magnetischer Fluss bleibt konstant, deshalb wird keine Spannung induziert.';
      else if (!field) note = 'Die Spule dreht sich, aber ohne Magnetfeld ist der magnetische Fluss immer null. Die Spannung bleibt bei 0 V.';
      else if (Math.abs(result.voltage) < result.peak * 0.13) note = `Bei ${fmt(phase, 0)}° ist der Fluss nahe einem Extremwert. Er ändert sich gerade kaum: Die Spannung ist nahe null.`;
      else if (Math.abs(result.voltage) > result.peak * 0.95) note = `Bei ${fmt(phase, 0)}° ist der Fluss nahe null, ändert sich aber besonders schnell. Der Betrag der Spannung ist fast maximal.`;
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
