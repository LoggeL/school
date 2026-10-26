// A two-conductor, purely resistive equivalent circuit. These are sending-end
// quantities, not three-phase grid formulae. All returned electrical units are SI.
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

export function createExperiment({ THREE, group }) {
  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0x9fb0ad, metalness: .7, roughness: .38 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x58726b, metalness: .55, roughness: .5 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc88745, metalness: .75, roughness: .32 }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xa3d4c7, metalness: .05, roughness: .28 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x38594a, roughness: .95 }),
    road: new THREE.MeshStandardMaterial({ color: 0x617368, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xabb7a5, roughness: .85 }),
    house: new THREE.MeshStandardMaterial({ color: 0xe3dbc0, roughness: .85 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xa9664d, roughness: .8 }),
    window: new THREE.MeshStandardMaterial({ color: 0xffdc8c, emissive: 0xffb744, emissiveIntensity: .8, roughness: .35 }),
    wire: new THREE.MeshStandardMaterial({ color: 0xb1c8be, emissive: 0x365c48, emissiveIntensity: .35, metalness: .6, roughness: .35 }),
    energy: new THREE.MeshBasicMaterial({ color: 0xffe4a1 }),
  };

  function box(x, y, z, w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  }
  function textLabel(text, x, y, z, width = 1.65, color = '#e2eddf') {
    const bitmap = document.createElement('canvas');
    bitmap.width = 512; bitmap.height = 112;
    const context = bitmap.getContext('2d');
    context.fillStyle = 'rgba(21,43,35,.88)';
    context.beginPath(); context.roundRect(4, 10, 504, 92, 18); context.fill();
    context.strokeStyle = 'rgba(183,210,183,.25)'; context.lineWidth = 2; context.stroke();
    context.font = '500 38px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = color; context.fillText(text, 256, 58);
    const texture = new THREE.CanvasTexture(bitmap); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.scale.set(width, width * 112 / 512, 1); sprite.position.set(x, y, z);
    group.add(sprite); return sprite;
  }

  // Spatial lattice beams share a single instanced draw call.
  const beams = [];
  function beam(a, b, radius = .023) { beams.push({ a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), radius }); }
  const towerXs = [-1.65, 0, 1.65];
  const baseY = -1.28;
  const towerTop = 1.75;
  towerXs.forEach(x => {
    box(x, baseY - .04, 0, .78, .12, .84, materials.stone);
    const levels = [-1.25, -.64, -.03, .58, 1.19, towerTop];
    function corners(y) {
      const t = (y - baseY) / (towerTop - baseY);
      const half = .32 - .22 * t;
      return [[x - half, y, -half], [x + half, y, -half], [x + half, y, half], [x - half, y, half]];
    }
    const bottom = corners(levels[0]), top = corners(towerTop);
    for (let c = 0; c < 4; c++) beam(bottom[c], top[c], .031);
    for (let level = 0; level < levels.length - 1; level++) {
      const lower = corners(levels[level]), upper = corners(levels[level + 1]);
      for (let face = 0; face < 4; face++) {
        const next = (face + 1) % 4;
        beam(lower[face], lower[next], .018);
        beam(lower[face], upper[next], .016);
        beam(lower[next], upper[face], .016);
      }
    }
    // The two terminals belong to one outgoing and one return conductor.
    beam([x, 1.4, -.8], [x, 1.4, .8], .041);
    beam([x, .97, 0], [x, 1.4, -.75], .024);
    beam([x, .97, 0], [x, 1.4, .75], .024);
    for (const z of [-.65, .65]) {
      beam([x, 1.4, z], [x, towerTop, z], .026);
      for (let ring = 0; ring < 4; ring++) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(.1, .085, .045, 12), materials.porcelain);
        disc.position.set(x, 1.46 + ring * .075, z); group.add(disc);
      }
    }
  });
  const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  const lattice = new THREE.InstancedMesh(beamGeometry, materials.steel, beams.length);
  const transform = new THREE.Object3D(), yAxis = new THREE.Vector3(0, 1, 0);
  beams.forEach(({ a, b, radius }, index) => {
    const direction = b.clone().sub(a);
    transform.position.copy(a).add(b).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(yAxis, direction.clone().normalize());
    transform.scale.set(radius, direction.length(), radius); transform.updateMatrix();
    lattice.setMatrixAt(index, transform.matrix);
  });
  lattice.castShadow = true; lattice.receiveShadow = true; group.add(lattice);

  box(0, -1.4, 0, 8.05, .18, 3.35, materials.ground);
  box(0, -1.297, 1.05, 7.8, .018, .32, materials.road);

  function transformer(x, z, scale = 1) {
    const base = new THREE.Group(); base.position.set(x, -1.29, z); base.scale.setScalar(scale); group.add(base);
    function piece(geometry, material, px, py, pz) {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(px, py, pz);
      mesh.castShadow = true; mesh.receiveShadow = true; base.add(mesh); return mesh;
    }
    piece(new THREE.BoxGeometry(1.15, .12, .92), materials.stone, 0, .06, 0);
    piece(new THREE.BoxGeometry(.78, .65, .64), materials.darkSteel, 0, .43, 0);
    for (let fin = 0; fin < 7; fin++) {
      piece(new THREE.BoxGeometry(.05, .51, .76), materials.steel, -.33 + fin * .11, .42, 0);
    }
    for (const zpos of [-.23, .23]) {
      piece(new THREE.CylinderGeometry(.05, .05, .36, 12), materials.copper, 0, .91, zpos);
      for (let ring = 0; ring < 3; ring++) {
        piece(new THREE.CylinderGeometry(.1, .08, .045, 12), materials.porcelain, 0, .82 + ring * .09, zpos);
      }
    }
    return base;
  }
  transformer(-3.25, 0, .92);
  transformer(2.9, -.92, .55);

  function house(x, z, scale = 1) {
    const building = new THREE.Group(); building.position.set(x, -1.28, z); building.scale.setScalar(scale); group.add(building);
    const add = (geometry, material, px, py, pz) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(px, py, pz);
      mesh.castShadow = true; mesh.receiveShadow = true; building.add(mesh); return mesh;
    };
    add(new THREE.BoxGeometry(.95, .7, .83), materials.house, 0, .35, 0);
    const left = add(new THREE.BoxGeometry(.62, .07, 1.02), materials.roof, -.25, .84, 0);
    const right = add(new THREE.BoxGeometry(.62, .07, 1.02), materials.roof, .25, .84, 0);
    left.rotation.z = .58; right.rotation.z = -.58;
    add(new THREE.BoxGeometry(.16, .28, .16), materials.stone, .24, 1.02, -.18);
    add(new THREE.BoxGeometry(.15, .23, .035), materials.darkSteel, 0, .13, .43);
    for (const xwindow of [-.29, .29]) add(new THREE.BoxGeometry(.17, .22, .035), materials.window, xwindow, .42, .43);
  }
  house(3.25, .42, .9);

  // The same two conductors run through each tower. Their sag is a geometric
  // parabola used for legibility, not a calculation of cable tension.
  const energyDots = [];
  const dotGeometry = new THREE.SphereGeometry(.044, 10, 8);
  class CableCurve extends THREE.Curve {
    constructor(z) { super(); this.z = z; }
    getPoint(t, target = new THREE.Vector3()) {
      const anchors = [-3.25, ...towerXs, 3.15];
      const x = anchors[0] + t * (anchors.at(-1) - anchors[0]);
      let segment = 0;
      while (segment < anchors.length - 2 && x > anchors[segment + 1]) segment++;
      const local = (x - anchors[segment]) / (anchors[segment + 1] - anchors[segment]);
      const leftY = segment === 0 ? -.2 : towerTop;
      const rightY = segment === anchors.length - 2 ? -.1 : towerTop;
      const sag = segment === 0 || segment === anchors.length - 2 ? .13 : .33;
      const y = leftY + (rightY - leftY) * local - 4 * sag * local * (1 - local);
      return target.set(x, y, this.z);
    }
  }
  for (const z of [-.65, .65]) {
    const curve = new CableCurve(z);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 140, .023, 6, false), materials.wire);
    group.add(wire);
    for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(dotGeometry, materials.energy); group.add(dot);
      energyDots.push({ dot, curve, offset: i / 4 });
    }
  }
  textLabel('Kraftwerk · hochtransformieren', -3.05, .55, .1, 2.1);
  textLabel('Umspannwerk · Verbraucher', 3.02, .64, .1, 2.05);
  textLabel('Hin- und Rückleitung', 0, 2.3, 0, 2.0);
  const warningLabel = textLabel('Keine nutzbare Versorgung', 0, -.66, .9, 2.5, '#ffbf8b');
  warningLabel.visible = false;

  const coolColor = new THREE.Color(0x91baab), hotColor = new THREE.Color(0xff7345);
  const darkWindow = new THREE.Color(0x466858), brightWindow = new THREE.Color(0xffdc8c);
  let lastKey = '', lastReadout;
  return {
    update(state, time) {
      const values = calculate(state);
      const ratio = values.loss / values.sending;
      // Emission is only a visual indication of losses, never temperature.
      const lossCue = Math.min(1, Math.sqrt(ratio));
      materials.wire.color.copy(coolColor).lerp(hotColor, lossCue);
      materials.wire.emissive.copy(coolColor).lerp(hotColor, lossCue);
      materials.wire.emissiveIntensity = .12 + lossCue * .8;
      const supply = values.feasible ? Math.max(0, values.efficiency) : 0;
      materials.window.color.copy(darkWindow).lerp(brightWindow, supply);
      materials.window.emissiveIntensity = supply * .9;
      warningLabel.visible = !values.feasible;
      for (const { dot, curve, offset } of energyDots) {
        dot.visible = values.feasible;
        curve.getPoint((time * .1 + offset) % 1, dot.position);
        dot.scale.setScalar(.8 + .35 * Number(state.power) / 20);
      }
      const key = `${state.voltage}/${state.power}/${state.resistance}`;
      if (key !== lastKey) {
        lastKey = key;
        let note;
        if (values.impossible) {
          note = 'Diese Vorgaben passen nicht zu einem passiven Verbraucher: Der berechnete Leitungsverlust wäre größer als die gesendete Leistung. Erhöhe die Spannung oder senke Leistung beziehungsweise Leitungswiderstand.';
        } else if (values.shortCircuit) {
          note = 'Grenzfall Kurzschluss: Die gesamte gesendete Leistung wird in der Leitung umgesetzt. Am Empfangsende bleiben 0 V und keine nutzbare Leistung.';
        } else {
          note = `Von ${watts(values.sending)} gesendeter Leistung kommen ${watts(values.received)} an (${number(values.efficiency * 100, 2)} %). Bei gleicher gesendeter Leistung und gleichem Widerstand bedeutet zehnfache Spannung: ein Zehntel Strom, ein Hundertstel Leitungsverlust. Lichtpunkte zeigen Energieübertragung, keine Elektronen; die Farbe kennzeichnet Verluste, keine Temperatur.`;
        }
        lastReadout = {
          metrics: [
            { label: 'Strom in der Leitung', value: `${number(values.current, 1)} A` },
            { label: 'Leitungsverlust', value: `${watts(values.loss)}` },
            { label: 'Leistung am Verbraucher', value: values.impossible ? 'nicht möglich' : watts(Math.max(0, values.received)) },
          ],
          note,
        };
      }
      return lastReadout;
    },
  };
}
