// Magnet rein, Magnet raus: a bar magnet slides towards a hollow coil and back.
// The flux profile is a smooth, illustrative Gaussian in model units (not metres);
// Faraday's law U = −N · dΦ/dt is applied exactly to that profile.
const COIL_X = 1.6;
const PROFILE_WIDTH = 1.8;
const FLUX_SCALE = 0.001;
const format = (value, digits = 2) => (Math.abs(value) < 1e-10 ? 0 : value).toLocaleString('de-DE', {maximumFractionDigits: digits, minimumFractionDigits: digits});

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
  // Upper bound from the maximum spatial derivative of a Gaussian times the
  // maximum speed. Used only for the dial and graph scale.
  const scale = Math.max(0.05, turns * FLUX_SCALE * strength * speed * 1.4 / PROFILE_WIDTH * Math.sqrt(2 / Math.E));
  return {position, velocity, flux, fluxRate, voltage, scale, turns, sign};
}

// Scene layout (model units). The coil axis and the magnet axis share y = AXIS_Y.
const AXIS_Y = 0.35;
const TABLE_Y = -1.1;
const MAGNET_HALF = 0.8;      // half length of the bar magnet
const COIL_R = 0.6;            // winding radius
const COIL_LEN = 1.6;          // winding length

export function createExperiment({THREE, group, kit}) {
  const {mats} = kit;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- lab bench ----------
  kit.plinth([7.4, 0.2, 2.9], [-0.35, TABLE_Y - 0.1, 0.25]);
  // Rail with two steel rods and end stops; the magnet carriage slides along it.
  for (const z of [-0.16, 0.16]) {
    const rod = kit.cylinder(0.035, 4.1, mats.steel, [-1.45, TABLE_Y + 0.13, z], group, 20);
    rod.rotation.z = Math.PI / 2;
  }
  for (const x of [-3.5, 0.6]) kit.roundedBox([0.16, 0.26, 0.56], 0.04, mats.plastic, [x, TABLE_Y + 0.13, 0]);

  // ---------- magnet on its carriage ----------
  const magnet = new THREE.Group(); group.add(magnet);
  magnet.position.y = AXIS_Y;
  const carriage = new THREE.Group(); magnet.add(carriage);
  // Carriage: sled on the rods, a post and a cradle under the magnet (coordinates relative to the axis).
  const plateY = TABLE_Y + 0.21 - AXIS_Y, cradleY = -0.23;
  kit.roundedBox([0.62, 0.1, 0.56], 0.04, mats.ceramic, [0, plateY, 0], carriage);
  kit.roundedBox([0.14, cradleY - plateY - 0.08, 0.14], 0.03, mats.ceramic, [0, (plateY + cradleY) / 2, 0], carriage);
  kit.roundedBox([0.5, 0.06, 0.34], 0.025, mats.ceramic, [0, cradleY, 0], carriage);
  // The polarity group flips by 180° when the magnet is turned around ("umpolen").
  const polarity = new THREE.Group(); magnet.add(polarity);
  kit.roundedBox([MAGNET_HALF - 0.01, 0.42, 0.42], 0.05, mats.magnetN, [MAGNET_HALF / 2, 0, 0], polarity);
  kit.roundedBox([MAGNET_HALF - 0.01, 0.42, 0.42], 0.05, mats.magnetS, [-MAGNET_HALF / 2, 0, 0], polarity);
  kit.label('N', [MAGNET_HALF * 0.5, 0.4, 0], {parent: polarity, tone: 'n'});
  kit.label('S', [-MAGNET_HALF * 0.5, 0.4, 0], {parent: polarity, tone: 'south'});

  // Real dipole field lines (two-pole model), traced once in the magnet frame.
  const field = kit.barMagnetField(V(0, 0, 0), MAGNET_HALF * 0.82, V(1, 0, 0), 1);
  const southPole = V(-MAGNET_HALF * 0.82, 0, 0);
  const lines = [];
  const fieldGroup = new THREE.Group(); polarity.add(fieldGroup);
  // Emission angles from the north pole (relative to +x); fewer lines = weaker magnet.
  // rank decides from which magnet strength on a line is drawn (line density ~ field strength).
  // Closed loops leave the north pole sideways and return to the south pole. Lines that leave
  // almost along the axis reach far (through the coil) and are clipped at the edge of the scene;
  // their mirror images arrive at the south pole.
  const recipe = [
    {alpha: 22, az: [0, 180], rank: 0, open: true},
    {alpha: 110, az: [0, 180], rank: 0},
    {alpha: 70, az: [0, 180], rank: 1},
    {alpha: 45, az: [90, 270], rank: 1, open: true},
    {alpha: 140, az: [90, 270], rank: 1},
    {alpha: 12, az: [90, 270], rank: 2, open: true},
    {alpha: 90, az: [90, 270], rank: 2},
    {alpha: 38, az: [0, 180], rank: 3, open: true},
    {alpha: 125, az: [0, 180], rank: 3},
  ];
  const BOX = {x: 2.75, y: 1.45, z: 1.25};
  const outOfBox = p => Math.abs(p.x) > BOX.x || Math.abs(p.y) > BOX.y || Math.abs(p.z) > BOX.z;
  const outsideBar = p => Math.abs(p.x) > MAGNET_HALF + 0.01 || Math.hypot(p.y, p.z) > 0.24;
  const POLE = MAGNET_HALF * 0.82;
  const northPole = V(POLE, 0, 0);
  function addLine(points, rank) {
    const visible = points.filter(outsideBar);
    if (visible.length < 6) return;
    const line = kit.flowLine(visible, {parent: fieldGroup, color: 0x23865a, radius: 0.019, opacity: 1, speed: 0.22});
    line.rank = rank; lines.push(line);
  }
  const reversedField = p => field(p).negate();
  for (const {alpha, az, rank, open} of recipe) {
    for (const azimuth of az) {
      const a = alpha * Math.PI / 180, b = azimuth * Math.PI / 180;
      const offset = V(0.06 * Math.cos(a), 0.06 * Math.sin(a) * Math.cos(b), 0.06 * Math.sin(a) * Math.sin(b));
      if (!open) {
        const points = kit.traceField(field, northPole.clone().add(offset), {step: 0.03, maxSteps: 1200, bounds: 9, stop: p => p.distanceTo(southPole) < 0.07 || outOfBox(p)});
        if (points.at(-1).distanceTo(southPole) > 0.12) continue; // must close inside the scene
        addLine(points, rank);
      } else {
        const out = kit.traceField(field, northPole.clone().add(offset), {step: 0.03, maxSteps: 1200, bounds: 9, stop: outOfBox});
        addLine(out, rank);
        // Mirror: the same line arriving at the south pole (traced backwards, then reversed).
        const mirrored = offset.clone(); mirrored.x *= -1;
        const back = kit.traceField(reversedField, southPole.clone().add(mirrored), {step: 0.03, maxSteps: 1200, bounds: 9, stop: outOfBox});
        addLine(back.reverse(), rank);
      }
    }
  }

  // ---------- coil ----------
  const coilHolder = new THREE.Group(); coilHolder.position.set(COIL_X, AXIS_Y, 0); group.add(coilHolder);
  const former = new THREE.Mesh(new THREE.CylinderGeometry(COIL_R - 0.045, COIL_R - 0.045, COIL_LEN + 0.12, 48, 1, true),
    new THREE.MeshPhysicalMaterial({color: 0xe9efe4, roughness: 0.35, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false}));
  former.rotation.z = Math.PI / 2; coilHolder.add(former);
  for (const x of [-(COIL_LEN / 2 + 0.08), COIL_LEN / 2 + 0.08]) {
    const flange = new THREE.Mesh(new THREE.TorusGeometry(COIL_R + 0.02, 0.06, 12, 56), mats.ceramic);
    flange.rotation.y = Math.PI / 2; flange.position.x = x; flange.castShadow = true; coilHolder.add(flange);
    // stands
    kit.roundedBox([0.16, AXIS_Y - TABLE_Y - COIL_R - 0.02, 0.5], 0.04, mats.ceramic, [x, -(AXIS_Y - TABLE_Y + COIL_R) / 2 - 0.02, 0], coilHolder);
    kit.roundedBox([0.4, 0.06, 0.7], 0.03, mats.ceramic, [x, TABLE_Y - AXIS_Y + 0.03, 0], coilHolder);
  }
  let coilMesh = null, current = null, shownTurns = -1;
  function rebuildCoil(turns) {
    if (coilMesh) { coilHolder.remove(coilMesh); coilMesh.geometry.dispose(); }
    if (current) {
      coilHolder.remove(current.mesh);
      current.mesh.geometry.dispose(); current.material.dispose();
    }
    // One continuous, symbolic winding connects both terminals. More N makes it
    // denser; the wire radius stays below half the pitch so turns never intersect.
    const visibleTurns = Math.round(10 + turns / 22);
    const wireRadius = Math.min(0.027, COIL_LEN / visibleTurns * 0.42);
    coilMesh = kit.coil({radius: COIL_R, length: COIL_LEN, turns: visibleTurns, wireRadius, parent: coilHolder});
    current = kit.dots(coilMesh.userData.curve, {count: visibleTurns * 3 + 1, radius: 0.034, color: 0xf6c35a, parent: coilHolder, emissive: 0.9});
    shownTurns = turns;
  }
  // Flux indicator inside the coil: a disc whose tint shows |Φ|.
  const fluxDisc = new THREE.Mesh(new THREE.CircleGeometry(COIL_R - 0.07, 48), new THREE.MeshBasicMaterial({color: 0x2f8f63, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false}));
  fluxDisc.rotation.y = Math.PI / 2; coilHolder.add(fluxDisc);
  // Two explanatory arrows above the coil: the magnet's flux through the coil (green)
  // and the field of the induced current (orange), which opposes the change (Lenz).
  const ARROW_Y = COIL_R + 0.42, ARROW_Z = 0.15;
  const magnetArrow = kit.arrow({from: [0, ARROW_Y + 0.17, ARROW_Z], dir: [1, 0, 0], length: 0.6, radius: 0.028, color: 0x23865a, parent: coilHolder});
  const inducedArrow = kit.arrow({from: [0, ARROW_Y - 0.05, ARROW_Z], dir: [-1, 0, 0], length: 0.6, radius: 0.028, color: 0xd9822b, parent: coilHolder, emissive: 0.25});
  const fluxLabel = kit.label('Fluss Φ', [COIL_LEN / 2 + 0.35, ARROW_Y + 0.17, ARROW_Z], {parent: coilHolder, tone: 'ghost', size: 's'});
  const inducedLabel = kit.label('', [COIL_LEN / 2 + 0.35, ARROW_Y - 0.08, ARROW_Z], {parent: coilHolder, tone: 'warn', size: 's'});
  fluxLabel.element.style.color = '#23865a';
  // Induced pole at the opening that faces the magnet (Lenz).
  const inducedPole = kit.label('', [-(COIL_LEN / 2 + 0.1), COIL_R + 0.2, 0.2], {parent: coilHolder, tone: 'n'});

  // ---------- meter and cables ----------
  const meter = kit.meter({position: [1.65, TABLE_Y, 1.25], rotationY: -0.18, size: 1.05, centerZero: true, unit: 'V'});
  meter.group.updateMatrixWorld(true);
  const size = 1.05, w = 1.25 * size, d = 0.42 * size;
  const terminal = (x) => meter.group.localToWorld(V(x, 0.04 * size, d / 2 + 0.08 * size));
  const tLeft = terminal(-w * 0.3), tRight = terminal(w * 0.3);
  const leadStart = V(COIL_X - COIL_LEN / 2, AXIS_Y + COIL_R, 0);
  const leadEnd = V(COIL_X + COIL_LEN / 2, AXIS_Y + COIL_R, 0);
  // Positive induced voltage drives conventional current from the left end
  // through the helix to the right end. The right end therefore connects to
  // the red (+) meter terminal; the return lead connects to black (−).
  kit.wire([[leadStart.x, leadStart.y, 0], [leadStart.x - 0.15, leadStart.y + 0.18, 0.3], [leadStart.x - 0.35, TABLE_Y + 0.35, 0.85], [tRight.x + 0.15, TABLE_Y + 0.09, tRight.z + 0.35], tRight.toArray()], 0.022, mats.cableBlack);
  kit.wire([[leadEnd.x, leadEnd.y, 0], [leadEnd.x + 0.15, leadEnd.y + 0.18, 0.3], [leadEnd.x + 0.4, TABLE_Y + 0.35, 0.85], [tLeft.x - 0.15, TABLE_Y + 0.05, tLeft.z + 0.2], tLeft.toArray()], 0.022, mats.cableRed);

  let lastTime = 0, offset = 0;
  return {
    camera: {target: [-0.25, -0.05, 0.3], distance: 9.4, yaw: 0.42, pitch: 0.36, floor: TABLE_Y - 0.2, shadowSize: 6, fitAspect: 1.7},
    views: {
      overview: {target: [-0.25, -0.05, 0.3], yaw: 0.42, pitch: 0.36, zoom: 1},
      field: {target: [-0.4, AXIS_Y, 0], yaw: 0.05, pitch: 1.2, zoom: 0.82},
      coil: {target: [COIL_X - 0.3, AXIS_Y, 0], yaw: -0.55, pitch: 0.28, zoom: 0.5},
      meter: {target: [1.65, TABLE_Y + 0.5, 1.25], yaw: 0.05, pitch: 0.3, zoom: 0.36},
    },
    update(state, time) {
      const result = calculate(state, time);
      const strength = Number(state.strength ?? 1);
      const speed = Number(state.speed ?? 1);
      if (shownTurns !== result.turns) rebuildCoil(result.turns);
      const dt = Math.max(0, Math.min(0.2, time - lastTime)); lastTime = time;

      magnet.position.x = result.position;
      polarity.rotation.y = state.reverse ? Math.PI : 0;
      // More field lines for a stronger magnet (density ~ field strength).
      const ranks = strength <= 0.5 ? 0 : strength <= 0.75 ? 1 : strength <= 1.25 ? 2 : 3;
      for (const line of lines) line.set({visible: strength > 0 && line.rank <= ranks, strength: 0.75 + 0.15 * Math.min(strength, 2)});

      const u = result.scale ? result.voltage / result.scale : 0;
      meter.setNow(u);

      // Conventional current along the winding. Positive U ⇒ current runs along the helix
      // direction, which by the right-hand rule makes a field along +x inside the coil.
      offset += dt * u * 0.35;
      current.place(offset);
      current.mesh.visible = Math.abs(u) > 0.02;

      const fluxMax = FLUX_SCALE * 2 * 0.6;
      const fluxFill = Math.min(1, Math.abs(result.flux) / fluxMax);
      fluxDisc.material.opacity = strength > 0 ? 0.06 + 0.45 * fluxFill : 0;
      const fluxLen = 0.32 + 0.95 * fluxFill, fluxDir = Math.sign(result.flux) || 1;
      magnetArrow.set([fluxDir, 0, 0], fluxLen);
      magnetArrow.group.position.x = -fluxDir * fluxLen / 2;
      magnetArrow.group.visible = strength > 0;
      fluxLabel.show(strength > 0);
      const induced = Math.min(1, Math.abs(u));
      const inducedDir = -Math.sign(result.fluxRate);
      const active = induced > 0.06;
      inducedArrow.group.visible = active;
      if (active) {
        const len = 0.32 + 0.95 * induced;
        inducedArrow.set([inducedDir, 0, 0], len);
        inducedArrow.group.position.x = -inducedDir * len / 2;
      }
      // The induced field leaves the coil at the end it points to: pointing to −x makes
      // the opening that faces the magnet a north pole.
      const showPole = induced > 0.12;
      inducedPole.show(showPole);
      inducedLabel.show(active);
      if (showPole) {
        const pole = inducedDir < 0 ? 'N' : 'S';
        inducedPole.set(pole);
        inducedPole.element.className = `em-label em-label-${pole === 'N' ? 'n' : 'south'} em-label-m`;
      }
      if (active) inducedLabel.set(result.velocity > 0 ? 'Induziertes Feld: stößt ab' : 'Induziertes Feld: zieht zurück');

      const facing = state.reverse ? 'Südpol' : 'Nordpol';
      let note;
      if (strength === 0) note = 'Ohne Magnetfeld gibt es keinen magnetischen Fluss durch die Spule. Auch bei Bewegung bleibt U = 0.';
      else if (speed === 0) note = `Der Magnet steht still vor der Spule. Sein Feld durchsetzt die Spule, aber der Fluss ändert sich nicht. Deshalb ist U = 0.`;
      else if (Math.abs(result.velocity) < 0.06 * speed * 1.4) note = 'Umkehrpunkt: Der Magnet ist kurz in Ruhe. Der Fluss ändert sich in diesem Moment nicht, also ist U fast null.';
      else if (result.velocity > 0) note = `Der ${facing} nähert sich: Der Betrag des Flusses durch die Spule wächst. Die Spule baut an ihrer Öffnung einen gleichnamigen Pol auf (${state.reverse ? 'S' : 'N'}) und bremst damit die Annäherung (Lenz).`;
      else note = `Der ${facing} entfernt sich: Der Betrag des Flusses nimmt ab. Jetzt entsteht an der Öffnung der ungleichnamige Pol (${state.reverse ? 'N' : 'S'}). Er zieht den Magneten zurück, die Spannung wechselt ihr Vorzeichen.`;
      return {
        metrics: [
          {label: 'Induktionsspannung', value: `${format(result.voltage * 1000, 0)} mV`},
          {label: 'Fluss je Windung', value: `${format(result.flux * 1000, 3)} mWb`},
          {label: 'Flussänderung', value: `${format(result.fluxRate * 1000, 2)} mWb/s`},
        ],
        note,
        graph: {value: result.voltage * 1000, max: result.scale * 1000, label: 'Induktionsspannung in mV'},
      };
    },
  };
}
