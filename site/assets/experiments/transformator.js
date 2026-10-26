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

export function createExperiment({ THREE, group }) {
  const fmt = (value, digits = 1) => value.toLocaleString('de-DE', { maximumFractionDigits: digits });
  const material = (color, metalness = 0, roughness = .45) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const copper = material(0xd28a4e, .78, .26);
  const secondaryCopper = material(0xb56d3c, .78, .25);
  const steel = material(0x71847f, .82, .32);
  const dark = material(0x263c37, .35, .4);
  const ceramic = material(0xe4ded0, .08, .6);
  const wireRed = material(0xa85d4b, .05, .58);
  const wireBlue = material(0x79a8b8, .05, .58);

  function mesh(geometry, surface, x, y, z, parent = group) {
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(x, y, z);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, surface, x, y, z) {
    return mesh(new THREE.BoxGeometry(w, h, d), surface, x, y, z);
  }
  function tube(points, radius, surface) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, Math.max(48, points.length * 14), radius, 8, false), surface, 0, 0, 0);
  }
  function label(text, x, y, z, width = 2.1, color = '#e7ecdf') {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 104;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.position.set(x, y, z);
    group.add(sprite);
    const set = value => {
      context.font = '500 49px system-ui, sans-serif';
      canvas.width = Math.ceil(context.measureText(value).width + 48);
      context.clearRect(0, 0, canvas.width, 104);
      context.fillStyle = '#183129df';
      context.beginPath(); context.roundRect(2, 6, canvas.width - 4, 92, 20); context.fill();
      context.fillStyle = color; context.font = '500 49px system-ui, sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(value, canvas.width / 2, 54);
      const displayWidth = Math.min(width, .42 * canvas.width / 104);
      sprite.scale.set(displayWidth, displayWidth * 104 / canvas.width, 1);
      texture.needsUpdate = true;
    };
    set(text);
    return { sprite, set };
  }

  box(4.15, .18, 1.9, dark, 0, -1.17, 0);
  for (const x of [-1.55, 1.55]) {
    box(.4, .13, 1.3, steel, x, -1.02, 0);
    for (const z of [-.48, .48]) mesh(new THREE.CylinderGeometry(.07, .07, .07, 12), steel, x, -.92, z);
  }

  // Separate laminated rings make the closed magnetic path visible.
  const ring = new THREE.Shape();
  ring.moveTo(-1.62, -1.0); ring.lineTo(1.62, -1.0); ring.lineTo(1.62, 1.78); ring.lineTo(-1.62, 1.78); ring.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-.87, -.48); hole.lineTo(-.87, 1.26); hole.lineTo(.87, 1.26); hole.lineTo(.87, -.48); hole.closePath();
  ring.holes.push(hole);
  const laminate = new THREE.ExtrudeGeometry(ring, { depth: .052, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .008, bevelThickness: .006 });
  for (let i = 0; i < 10; i++) mesh(laminate, steel, 0, 0, -.31 + i * .063);

  // Winding counts are reduced for legibility, while the labels show the actual N.
  let primaryWinding = null, secondaryWinding = null, lastTurns = '';
  const leftLabel = label('N₁ = 400', -1.34, 2.04, .15, 1.75, '#f3c392');
  const rightLabel = label('N₂ = 200', 1.34, 2.04, .15, 1.75, '#f3c392');
  label('Primärspule', -1.43, 2.43, .15, 2);
  label('Sekundärspule', 1.43, 2.43, .15, 2);
  label('Geschlossener Eisenkern', 0, -.28, .52, 1.55, '#bdcdc0');

  function winding(x, count, phase, surface) {
    const turns = Math.max(3, Math.round(count / 40));
    const segments = turns * 52;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, angle = phase + t * turns * Math.PI * 2;
      points.push(new THREE.Vector3(x + .59 * Math.cos(angle), -.35 + 1.47 * t, .54 * Math.sin(angle)));
    }
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, .047, 8, false), surface, 0, 0, 0);
  }
  function rebuild(primary, secondary) {
    const key = `${primary}:${secondary}`;
    if (key === lastTurns) return;
    lastTurns = key;
    for (const old of [primaryWinding, secondaryWinding]) {
      if (old) { group.remove(old); old.geometry.dispose(); }
    }
    primaryWinding = winding(-1.25, primary, Math.PI, copper);
    secondaryWinding = winding(1.25, secondary, 0, secondaryCopper);
    leftLabel.set(`N₁ = ${primary}`); rightLabel.set(`N₂ = ${secondary}`);
  }

  // Each electric circuit is separate. Only the iron core links their magnetic flux.
  box(1.02, .66, .8, dark, -3.06, -.72, .28);
  box(.83, .42, .025, ceramic, -3.06, -.64, .695);
  const supplyLabel = label('~ 12 V', -3.06, -.6, .73, .84, '#f2d3a1');
  label('Spannungsquelle', -3.05, .23, .3, 1.8);
  for (const x of [-3.32, -2.8]) mesh(new THREE.CylinderGeometry(.075, .075, .12, 12), copper, x, -.33, .3);
  tube([[-1.84, -.35, 0], [-2.1, -.45, .55], [-2.35, -.68, .85], [-2.8, -.28, .3]], .034, wireBlue);
  tube([[-1.84, 1.12, 0], [-2.13, 1.12, .38], [-2.45, .84, .7], [-3.32, -.28, .3]], .034, wireRed);

  mesh(new THREE.CylinderGeometry(.4, .45, .18, 32), ceramic, 3.05, -1.0, .3);
  mesh(new THREE.CylinderGeometry(.2, .23, .3, 28), steel, 3.05, -.76, .3);
  for (let i = 0; i < 4; i++) {
    const thread = mesh(new THREE.TorusGeometry(.213, .018, 6, 24), dark, 3.05, -.86 + .065 * i, .3);
    thread.rotation.x = Math.PI / 2;
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffe8ab, roughness: .16, metalness: 0, transparent: true, opacity: .24, emissive: 0xffb54f, emissiveIntensity: .05, depthWrite: false });
  mesh(new THREE.SphereGeometry(.42, 32, 20), glass, 3.05, -.26, .3);
  const filamentMaterial = new THREE.MeshStandardMaterial({ color: 0xffd58b, emissive: 0xffb648, emissiveIntensity: 0, roughness: .5 });
  tube([[2.91, -.57, .3], [2.92, -.22, .3], [2.98, -.12, .3], [3.04, -.27, .3], [3.1, -.12, .3], [3.17, -.22, .3], [3.18, -.57, .3]], .018, filamentMaterial);
  const loadLabel = label('Last: 20 Ω', 3.05, .45, .3, 1.6, '#f0d2a0');
  const lampLight = new THREE.PointLight(0xffc36a, 0, 2.5);
  lampLight.position.set(3.05, -.1, .5); group.add(lampLight);
  tube([[1.84, -.35, 0], [2.03, -.56, .52], [2.28, -.91, .75], [2.82, -.76, .3]], .034, wireBlue);
  tube([[1.84, 1.12, 0], [2.13, 1.05, .4], [2.5, .74, .65], [3.28, -.76, .3]], .034, wireRed);

  const fluxArrows = [];
  const arrowPositions = [
    [-.58, 1.52, 1, 0], [.29, 1.52, 1, 0],
    [1.25, .82, 0, -1], [1.25, .05, 0, -1],
    [.58, -.75, -1, 0], [-.29, -.75, -1, 0],
    [-1.25, .0, 0, 1], [-1.25, .77, 0, 1],
  ];
  for (const [x, y, dx, dy] of arrowPositions) {
    const direction = new THREE.Vector3(dx, dy, 0);
    const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(x, y, .67), .48, 0xc7e3ad, .16, .11);
    arrow.line.material.transparent = true; arrow.cone.material.transparent = true;
    group.add(arrow); fluxArrows.push({ arrow, direction });
  }
  const fluxLabel = label('Wechselfluss Φ', 0, .68, .66, 1.48, '#c7e3ad');
  let lastLabelKey = '';

  return {
    update(state, time) {
      const values = calculate(state, time);
      const primary = Number(state.primary ?? 400), secondary = Number(state.secondary ?? 200);
      rebuild(primary, secondary);
      const labelKey = `${state.dc}:${state.voltage}:${state.load}`;
      if (labelKey !== lastLabelKey) {
        lastLabelKey = labelKey;
        supplyLabel.set(`${state.dc ? '⎓' : '~'} ${fmt(Number(state.voltage ?? 12))} V`);
        loadLabel.set(`Last: ${fmt(Number(state.load ?? 20))} Ω`);
        fluxLabel.set(state.dc ? 'Feld konstant' : 'Wechselfluss Φ');
      }
      const direction = values.flux < 0 ? -1 : 1;
      for (const item of fluxArrows) {
        item.arrow.setDirection(item.direction.clone().multiplyScalar(direction));
        const opacity = state.dc ? .55 : Math.min(1, Math.abs(values.flux));
        item.arrow.line.material.opacity = opacity;
        item.arrow.cone.material.opacity = opacity;
        item.arrow.visible = state.dc || Math.abs(values.flux) > .06;
      }
      const glow = state.dc ? 0 : Math.min(1, Math.log1p(values.power) / Math.log(65));
      glass.emissiveIntensity = .04 + glow * .45;
      filamentMaterial.emissiveIntensity = glow * 3;
      lampLight.intensity = glow * 1.6;
      return {
        metrics: [
          { label: 'Sekundärspannung U₂ (effektiv)', value: `${fmt(values.voltage, 2)} V` },
          { label: 'Sekundärstrom I₂ (effektiv)', value: `${fmt(values.current, 3)} A` },
          { label: 'Leistung an der Last P₂', value: `${fmt(values.power, 2)} W` },
        ],
        note: state.dc
          ? 'Konstanter Gleichstrom erzeugt keinen wechselnden Fluss: U₂ = 0 V. Einschaltvorgang und Primärstrom im Gleichstrombetrieb werden hier nicht berechnet.'
          : `N₂/N₁ = ${fmt(values.ratio, 2)}. Im idealen Trafo gilt P₁ = P₂; der Primärstrom beträgt ${fmt(values.primaryCurrent, 3)} A. Wärmeverluste fehlen im Modell. Die Feldpfeile zeigen den Fluss in Zeitlupe; die Lampenhelligkeit ist schematisch.`,
        graph: { value: values.instantaneousVoltage, max: Math.max(1, values.voltage * Math.SQRT2), label: 'Momentanspannung U₂ in V · Zeitlupe' },
      };
    },
  };
}
