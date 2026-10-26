// The air-coil reference is quantitative. Domain alignment is qualitative only:
// no permeability, saturation field or universal iron amplification is invented.
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

export function createExperiment({ THREE, group }) {
  const copper = new THREE.MeshStandardMaterial({color: 0xc8864b, metalness: .72, roughness: .24});
  const steel = new THREE.MeshStandardMaterial({color: 0xa6b7b5, metalness: .68, roughness: .3, transparent: true});
  const dark = new THREE.MeshStandardMaterial({color: 0x29453f, metalness: .24, roughness: .55});
  const cream = new THREE.MeshStandardMaterial({color: 0xdacbb3, roughness: .64});
  const mint = 0x9ee2bd;
  const yAxis = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3(1, 0, 0);
  const fmt = (value, decimals = 2) => value.toLocaleString('de-DE', {maximumFractionDigits: decimals});

  function mesh(geometry, material, x, y, z, parent = group) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function textSprite(text, color = '#dcebe3', scale = 1) {
    const bitmap = document.createElement('canvas');
    const ctx = bitmap.getContext('2d');
    ctx.font = '600 36px system-ui, sans-serif';
    bitmap.width = Math.ceil(ctx.measureText(text).width + 36); bitmap.height = 80;
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 36px system-ui, sans-serif'; ctx.fillText(text, bitmap.width / 2, 40);
    const texture = new THREE.CanvasTexture(bitmap); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, depthTest: false}));
    sprite.scale.set(bitmap.width / 80 * .5 * scale, .5 * scale, 1); return sprite;
  }
  function label(text, x, y, z, color, scale = 1) {
    const sprite = textSprite(text, color, scale); sprite.position.set(x, y, z); group.add(sprite); return sprite;
  }
  function cylinder(radius, length, material, x, y, z) {
    const object = mesh(new THREE.CylinderGeometry(radius, radius, length, 48), material, x, y, z);
    object.rotation.z = Math.PI / 2; return object;
  }
  function tube(points, radius, material, parent = group) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const object = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(40, points.length * 3), radius, 8, false), material);
    parent.add(object); return object;
  }

  mesh(new THREE.BoxGeometry(6.35, .16, 1.75), dark, 0, -1.31, 0);
  for (const x of [-1.85, 1.85]) {
    mesh(new THREE.BoxGeometry(.3, .36, 1.1), cream, x, -1.05, 0);
    const flange = cylinder(.91, .1, dark, x, 0, 0);
    flange.material = dark;
  }
  const winding = [];
  for (let index = 0; index <= 18 * 48; index++) {
    const t = index / (18 * 48), angle = t * 18 * 2 * Math.PI;
    winding.push([-1.8 + 3.6 * t, .76 * Math.cos(angle), .76 * Math.sin(angle)]);
  }
  tube(winding, .046, copper);
  const leadMaterial = new THREE.MeshStandardMaterial({color: 0x4e8274, roughness: .45});
  tube([[-1.8, .76, 0], [-2.2, .8, .15], [-2.6, -.8, .85], [-2.5, -1.2, .85]], .038, leadMaterial);
  tube([[1.8, .76, 0], [2.15, .8, -.15], [2.55, -.8, .85], [2.45, -1.2, .85]], .038, leadMaterial);
  for (const x of [-2.5, 2.45]) {
    mesh(new THREE.CylinderGeometry(.11, .11, .13, 16), copper, x, -1.16, .85);
  }
  const core = cylinder(.49, 5.15, steel, 0, 0, 0);
  const coreEnd = new THREE.MeshStandardMaterial({color: 0x759590, metalness: .68, roughness: .4, transparent: true});
  const endCaps = [-2.58, 2.58].map(x => cylinder(.495, .035, coreEnd, x, 0, 0));
  label('400 Windungen · Länge 20 cm', 0, -1.13, 1.15, '#afc9bc', .85);
  const materialLabel = label('EISENKERN', 0, 2.17, 0, '#c8dcd3', .85);
  const airLabel = label('LUFTSPULE', 0, 2.17, 0, '#c8dcd3', .85);
  const domainLabel = label('Magnetische Bezirke · schematisch', 0, 1.82, 0, '#add3c1', .8);

  // Each path passes through the core from left to right and returns outside.
  // Field arrows are stationary direction symbols, not moving particles.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.65, 0, 0), new THREE.Vector3(-1.5, 0, 0),
    new THREE.Vector3(1.5, 0, 0), new THREE.Vector3(2.65, 0, 0),
    new THREE.Vector3(3.15, .45, 0), new THREE.Vector3(2.3, 1.27, 0),
    new THREE.Vector3(0, 1.47, 0), new THREE.Vector3(-2.3, 1.27, 0),
    new THREE.Vector3(-3.15, .45, 0),
  ], true, 'catmullrom', .3);
  const paths = [];
  for (let index = 0; index < 5; index++) {
    const container = new THREE.Group(); container.rotation.x = index * Math.PI * 2 / 5;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(140)), new THREE.LineBasicMaterial({color: mint, transparent: true, opacity: .4}));
    container.add(line);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.065, .23, 10), new THREE.MeshBasicMaterial({color: mint}));
    arrow.position.copy(path.getPointAt(.67)); container.add(arrow);
    group.add(container); paths.push({container, line, arrow});
  }
  const centerArrow = new THREE.ArrowHelper(xAxis, new THREE.Vector3(-.55, .01, .62), 1.1, mint, .18, .12);
  centerArrow.line.material.depthTest = false; centerArrow.cone.material.depthTest = false;
  group.add(centerArrow);
  const north = label('N', 3.55, .2, 0, '#f4ae91', 1.6);
  const south = label('S', -3.55, .2, 0, '#9bcce7', 1.6);

  // A fixed distribution avoids flicker when the current is adjusted.
  const domains = new THREE.Group(); group.add(domains);
  const domainArrows = [];
  for (let i = 0; i < 18; i++) {
    const layer = Math.floor(i / 6), x = -.96 + (i % 6) * .385;
    const initial = new THREE.Vector3(Math.cos(i * 2.4), Math.sin(i * 2.4), .3 * Math.sin(i * 1.7)).normalize();
    const arrow = new THREE.ArrowHelper(initial, new THREE.Vector3(x, (layer - 1) * .24, .26), .3, 0xd8f4ce, .09, .065);
    arrow.line.material.depthTest = false; arrow.cone.material.depthTest = false;
    domains.add(arrow); domainArrows.push({arrow, initial});
  }
  const target = new THREE.Vector3(), direction = new THREE.Vector3();

  return {
    update(state, time) {
      const result = calculate(state, time);
      const hasCore = result.core;
      const showDomains = hasCore && Boolean(state.domains);
      core.visible = hasCore; endCaps.forEach(cap => {cap.visible = hasCore;});
      steel.opacity = showDomains ? .25 : 1;
      coreEnd.opacity = showDomains ? .3 : 1;
      domains.visible = domainLabel.visible = showDomains;
      materialLabel.visible = hasCore; airLabel.visible = !hasCore;
      const active = result.sign !== 0;
      north.visible = south.visible = centerArrow.visible = active;
      north.position.x = result.sign < 0 ? -3.55 : 3.55;
      south.position.x = -north.position.x;
      centerArrow.position.x = result.sign < 0 ? .55 : -.55;
      centerArrow.setDirection(target.set(result.sign || 1, 0, 0));
      paths.forEach(({container, line, arrow}, index) => {
        container.visible = active && (hasCore || index < 3);
        line.material.opacity = .14 + .28 * Math.abs(result.current) + (hasCore ? .12 : 0);
        arrow.quaternion.setFromUnitVectors(yAxis, path.getTangentAt(.67).multiplyScalar(result.sign || 1));
      });
      target.set(result.sign || 1, 0, 0);
      domainArrows.forEach(({arrow, initial}) => {
        direction.copy(initial).lerp(target, result.alignment).normalize();
        arrow.setDirection(direction);
      });
      const note = !active
        ? 'Kein Spulenstrom: Im vereinfachten Modell sind die Bezirke ungeordnet. Eine mögliche Restmagnetisierung des echten Eisenkerns ist hier nicht dargestellt.'
        : hasCore
          ? 'Der Eisenkern verstärkt und bündelt das Feld. Die Ausrichtung der Bezirke ist schematisch; eine feste Verstärkung oder einen Tesla-Wert für Eisen gibt dieses Modell nicht vor.'
          : 'Auch ohne Eisenkern erzeugt die stromdurchflossene Spule ein Magnetfeld. Der Vergleichswert gilt näherungsweise für eine lange Luftspule.';
      return {
        metrics: [
          {label: 'Stromstärke', value: `${fmt(result.current, 1)} A`},
          {label: 'Luftspule zum Vergleich', value: `${fmt(result.airField * 1000)} mT`},
          {label: 'Material im Inneren', value: hasCore ? 'Eisenkern' : 'Luft'},
        ],
        note,
      };
    },
  };
}
