// A deliberately smooth, illustrative flux profile. Positions are model units,
// not measured metres; the derivative and Faraday's law are internally exact.
const COIL_X = 1.6;
const PROFILE_WIDTH = 1.8;
const FLUX_SCALE = 0.001;
const format = (value, digits = 2) => (Math.abs(value) < 1e-10 ? 0 : value).toLocaleString('de-DE', {maximumFractionDigits: digits});

export function calculate(state, time) {
  const speed = Number(state.speed ?? 1);
  const turns = Number(state.turns ?? 200);
  const strength = Number(state.strength ?? 1);
  const sign = state.reverse ? -1 : 1;
  const angle = time * speed;
  const position = -1.2 + 1.4 * Math.cos(angle);
  const velocity = -1.4 * speed * Math.sin(angle);
  const distance = position - COIL_X;
  const flux = sign * FLUX_SCALE * strength * Math.exp(-((distance / PROFILE_WIDTH) ** 2));
  const fluxRate = flux * (-2 * distance / PROFILE_WIDTH ** 2) * velocity;
  const voltage = -turns * fluxRate || 0;
  // Upper bound from the maximum spatial derivative of a Gaussian, multiplied
  // by maximum speed. It is used only for the schematic dial/graph scale.
  const scale = Math.max(0.05, turns * FLUX_SCALE * strength * speed * 1.4 / PROFILE_WIDTH * Math.sqrt(2 / Math.E));
  return {position, velocity, flux, fluxRate, voltage, scale, turns, sign};
}

export function createExperiment({THREE, group}) {
  const copper = new THREE.MeshStandardMaterial({color: 0xc8884a, metalness: 0.78, roughness: 0.27});
  const steel = new THREE.MeshStandardMaterial({color: 0x9aaeb0, metalness: 0.65, roughness: 0.3});
  const dark = new THREE.MeshStandardMaterial({color: 0x304a43, metalness: 0.15, roughness: 0.55});
  const red = new THREE.MeshStandardMaterial({color: 0xd96f59, metalness: 0.2, roughness: 0.38});
  const blue = new THREE.MeshStandardMaterial({color: 0x629fc4, metalness: 0.2, roughness: 0.38});
  const ivory = new THREE.MeshStandardMaterial({color: 0xe4e7d5, roughness: 0.6});

  function box(parent, w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function tube(points, radius, material, parent = group) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 8, false), material);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function label(text, x, y, z, color = '#e3e9d9', width = 2.0) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = '500 38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.fillText(text, 256, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, depthTest: false}));
    sprite.position.set(x, y, z); sprite.scale.set(width, width * 96 / 512, 1);
    group.add(sprite); return sprite;
  }

  // Separate experiment components on a lab plinth. The magnet slides along a
  // rail; the open coil is visibly hollow and contains no hidden iron core.
  box(group, 6.7, 0.16, 2.05, -0.1, -1.22, 0, dark);
  box(group, 3.7, 0.07, 0.13, -1.45, -0.74, 0, steel);
  for (const x of [-3.1, 0.2]) box(group, 0.13, 0.44, 0.5, x, -0.99, 0, dark);
  const magnet = new THREE.Group(); group.add(magnet); magnet.position.y = 0.5;
  const leftPole = box(magnet, 0.65, 0.46, 0.48, -0.325, 0, 0, blue);
  const rightPole = box(magnet, 0.65, 0.46, 0.48, 0.325, 0, 0, red);
  box(magnet, 0.68, 0.12, 0.66, 0, -1.18, 0, steel);
  box(magnet, 0.16, 0.94, 0.18, 0, -0.7, 0, dark);
  const north = label('N', 0, 0.56, 0.31, '#ffe2d6', 0.62);
  const south = label('S', 0, 0.56, 0.31, '#e0f2ff', 0.62);
  label('Magnet bewegen', -1.9, 1.46, 0, '#c5d8c7', 2.25);
  label('Spule', COIL_X, 1.57, 0, '#edc599', 1.4);

  const formerMaterial = new THREE.MeshStandardMaterial({color: 0xcddcca, transparent: true, opacity: 0.1, side: THREE.DoubleSide, roughness: 0.25, depthWrite: false});
  const former = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 1.7, 36, 1, true), formerMaterial);
  former.rotation.z = Math.PI / 2; former.position.set(COIL_X, 0.5, 0); group.add(former);
  const ringGeometry = new THREE.TorusGeometry(0.66, 0.048, 8, 48);
  for (const x of [COIL_X - 0.87, COIL_X + 0.87]) {
    const ring = new THREE.Mesh(ringGeometry, ivory); ring.rotation.y = Math.PI / 2;
    ring.position.set(x, 0.5, 0); ring.castShadow = true; group.add(ring);
    box(group, 0.14, 0.98, 0.3, x, -0.65, 0, dark);
  }
  const coil = new THREE.Mesh(new THREE.BufferGeometry(), copper); group.add(coil); coil.castShadow = true;
  let displayedTurns = -1;
  function rebuildCoil(turns) {
    // The visible count deliberately remains schematic, while N is the actual
    // value used in Faraday's law and the numeric readout.
    const count = Math.round(7 + turns / 50);
    const points = [];
    for (let i = 0; i <= count * 32; i++) {
      const fraction = i / (count * 32), angle = fraction * count * Math.PI * 2;
      points.push(new THREE.Vector3(COIL_X - 0.8 + 1.6 * fraction, 0.5 + 0.67 * Math.cos(angle), 0.67 * Math.sin(angle)));
    }
    const previous = coil.geometry;
    coil.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), count * 36, 0.035, 8, false);
    previous.dispose(); displayedTurns = turns;
  }

  // A sparse external field loop and an axial arrow show direction, with no
  // travelling dots that could be mistaken for particles.
  const fieldGroup = new THREE.Group(); magnet.add(fieldGroup);
  const fieldMaterial = new THREE.LineBasicMaterial({color: 0xa5d6b1, transparent: true, opacity: 0.5});
  const fieldLoops = [];
  for (const side of [-1, 1]) {
    const points = [new THREE.Vector3(0.65, 0, 0), new THREE.Vector3(1.0, side * 0.35, 0), new THREE.Vector3(0.6, side * 0.83, 0), new THREE.Vector3(-0.6, side * 0.83, 0), new THREE.Vector3(-1.0, side * 0.35, 0), new THREE.Vector3(-0.65, 0, 0)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(points).getPoints(64)), fieldMaterial);
    fieldGroup.add(line); fieldLoops.push(line);
  }
  const axialArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.8, 0, 0), 0.75, 0xb9dfb4, 0.15, 0.09);
  fieldGroup.add(axialArrow);
  const returnArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0.24, 0.83, 0), 0.48, 0xb9dfb4, 0.12, 0.08);
  fieldGroup.add(returnArrow);

  // Voltmeter with a zero-centred qualitative dial. The precise value is given
  // by the shared accessible numeric readout below the 3D model.
  box(group, 1.42, 0.82, 0.37, 1.56, -0.64, 1.2, dark);
  const dialCanvas = document.createElement('canvas'); dialCanvas.width = 512; dialCanvas.height = 256;
  const ctx = dialCanvas.getContext('2d');
  ctx.fillStyle = '#e9eddf'; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#476453'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(256, 216, 168, Math.PI * 1.17, Math.PI * 1.83); ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1.17 + i / 10 * 0.66);
    ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * 164, 216 + Math.sin(a) * 164);
    ctx.lineTo(256 + Math.cos(a) * (i === 5 ? 143 : 151), 216 + Math.sin(a) * (i === 5 ? 143 : 151)); ctx.stroke();
  }
  ctx.fillStyle = '#2c4c40'; ctx.textAlign = 'center'; ctx.font = '30px system-ui';
  ctx.fillText('−', 70, 180); ctx.fillText('+', 443, 180); ctx.fillText('0', 256, 38);
  ctx.font = '25px system-ui'; ctx.fillText('U ind', 256, 232);
  const dialTexture = new THREE.CanvasTexture(dialCanvas); dialTexture.colorSpace = THREE.SRGBColorSpace;
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.63), new THREE.MeshBasicMaterial({map: dialTexture}));
  dial.position.set(1.56, -0.61, 1.391); group.add(dial);
  const needlePivot = new THREE.Group(); needlePivot.position.set(1.56, -0.82, 1.405); group.add(needlePivot);
  box(needlePivot, 0.018, 0.4, 0.015, 0, 0.2, 0, red);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), copper); needlePivot.add(hub);
  tube([[0.8, 1.17, 0], [0.56, 1.08, 0.25], [0.5, -0.5, 0.9], [1.12, -0.9, 1.17]], 0.022, red);
  tube([[2.4, 1.17, 0], [2.75, 0.9, 0.25], [2.79, -0.6, 0.85], [1.99, -0.9, 1.17]], 0.022, blue);
  label('Spannungsmesser', 1.6, -1.12, 1.45, '#d3dfcd', 2.0);

  return {
    update(state, time) {
      const result = calculate(state, time);
      if (displayedTurns !== result.turns) rebuildCoil(result.turns);
      magnet.position.x = result.position;
      leftPole.material = state.reverse ? red : blue;
      rightPole.material = state.reverse ? blue : red;
      north.position.x = result.position + (state.reverse ? -0.33 : 0.33);
      south.position.x = result.position - (state.reverse ? -0.33 : 0.33);
      axialArrow.setDirection(new THREE.Vector3(result.sign, 0, 0));
      axialArrow.position.x = state.reverse ? 1.55 : 0.8;
      returnArrow.setDirection(new THREE.Vector3(-result.sign, 0, 0));
      returnArrow.position.x = state.reverse ? -0.24 : 0.24;
      fieldMaterial.opacity = 0.27 + 0.12 * Number(state.strength ?? 1);
      needlePivot.rotation.z = -Math.max(-1, Math.min(1, result.voltage / result.scale)) * 0.99;
      const direction = Math.abs(result.velocity) < 1e-9 ? 'Am Umkehrpunkt ist der Magnet einen Moment in Ruhe: U ist null.' : Math.abs(result.velocity) < 0.015 ? 'Nahe am Umkehrpunkt bewegt sich der Magnet kaum: U ist fast null.' : result.velocity > 0 ? 'Der Magnet nähert sich: Der magnetische Fluss durch die Spule nimmt im Betrag zu.' : 'Der Magnet entfernt sich: Der magnetische Fluss durch die Spule nimmt im Betrag ab.';
      return {
        metrics: [
          {label: 'Induktionsspannung', value: `${format(result.voltage * 1000, 0)} mV`},
          {label: 'Fluss je Windung', value: `${format(result.flux * 1000, 3)} mWb`},
          {label: 'Windungen', value: `${result.turns}`}
        ],
        note: Number(state.speed) === 0 ? 'Der Magnet steht. Der magnetische Fluss bleibt konstant und die Induktionsspannung ist null.' : direction + ' Das Vorzeichen bezieht sich auf die feste Anschlussrichtung des Messgeräts.',
        graph: {value: result.voltage * 1000, max: result.scale * 1000, label: 'Induktionsspannung in mV'}
      };
    }
  };
}
