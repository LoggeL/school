(() => {
  const $ = id => document.getElementById(id);
  const fmt = value => value.toLocaleString('de-DE', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  function update() {
    const current = Number($('current').value), turns = Number($('turns').value);
    const core = $('core').checked, reverse = $('reverse').checked, paused = $('pause').checked;
    $('current-value').textContent = `${fmt(current)} A`;
    $('turns-value').textContent = turns;
    $('field-value').textContent = current === 0 ? 'Kein Spulenfeld' : core ? 'Stärker mit Kern' : `${fmt(current * turns / 200)}-fach`;
    $('field-note').textContent = core ? 'Verstärkung hängt von Material und Form ab.' : 'Luftspule, gleiche Länge.';
    $('ratio-label').textContent = core ? 'Qualitativer Vergleich' : 'Feld im Vergleich zum Start';
    $('model-description').textContent = current === 0 ? 'Kein Strom: Im Modell verschwindet das Spulenfeld.' : `${turns} Windungen, ${fmt(current)} A: Innen zeigt das Feld nach ${reverse ? 'links' : 'rechts'}, ${reverse ? 'links' : 'rechts'} ist der Nordpol.${core ? ' Der Eisenkern verstärkt das Feld.' : ''}`;
    $('field-lines').style.opacity = current === 0 ? 0 : Math.min(.95, .25 + current * turns / 900);
    $('field-lines').setAttribute('transform', reverse ? 'translate(640 0) scale(-1 1)' : '');
    $('svg-core').setAttribute('opacity', core ? '.7' : '0');
    $('pole-left').textContent = current === 0 ? '' : reverse ? 'N' : 'S';
    $('pole-right').textContent = current === 0 ? '' : reverse ? 'S' : 'N';
    for (const [row, outwards] of [['cross-top', !reverse], ['cross-bottom', reverse]]) {
      $(row).querySelectorAll('.current-dot').forEach(node => node.setAttribute('opacity', current > 0 && outwards ? '1' : '0'));
      $(row).querySelectorAll('.current-cross').forEach(node => node.setAttribute('opacity', current > 0 && !outwards ? '1' : '0'));
    }
    $('model').dataset.active = String(current > 0);
    $('cross-section').querySelector('svg').setAttribute('aria-label', $('model-description').textContent);
    window.coilState = {current, turns, core, reverse, paused};
    dispatchEvent(new CustomEvent('coilchange', {detail: window.coilState}));
  }
  ['current', 'turns', 'core', 'reverse', 'pause'].forEach(id => $(id).addEventListener('input', update));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) $('pause').checked = true;
  function view(mode) {
    $('model').hidden = mode !== '3d';
    $('cross-section').hidden = mode === '3d';
    $('view-3d').setAttribute('aria-pressed', String(mode === '3d'));
    $('view-2d').setAttribute('aria-pressed', String(mode !== '3d'));
    dispatchEvent(new Event('coilresize'));
  }
  $('view-2d').addEventListener('click', () => view('2d'));
  $('view-3d').addEventListener('click', () => view('3d'));
  addEventListener('coilready', () => view('3d'));
  addEventListener('coilfailed', () => { view('2d'); $('view-3d').disabled = true; $('view-3d').title = 'WebGL ist auf diesem Gerät nicht verfügbar.'; });
  const solved = new Set();
  document.querySelectorAll('.exercise').forEach((exercise, index) => {
    const input = exercise.querySelector('input');
    const feedback = exercise.querySelector('.feedback');
    input.addEventListener('input', () => { solved.delete(index); $('task-progress').textContent = `${solved.size} von 8`; feedback.textContent = ''; delete feedback.dataset.correct; });
    exercise.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const unit = exercise.dataset.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^\\s*([+-]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+))\\s*(?:${unit})?\\s*$`, 'i');
      const match = input.value.match(pattern);
      if (!match) { feedback.textContent = `Gib eine Zahl in ${exercise.dataset.unit} ein, zum Beispiel 1,5.`; feedback.dataset.correct = 'false'; return; }
      const correct = Math.abs(Number(match[1].replace(',', '.')) - Number(exercise.dataset.answer)) < 0.00001;
      feedback.dataset.correct = String(correct);
      feedback.textContent = correct ? 'Richtig. Dein Ergebnis stimmt.' : 'Noch nicht ganz. Prüfe die Formel und die Einheiten, oder öffne den Tipp.';
      if (correct) solved.add(index); else solved.delete(index);
      $('task-progress').textContent = `${solved.size} von 8`;
    });
  });
  $('print').addEventListener('click', () => window.print());
  update();
})();
