(() => {
  const points = [...document.querySelectorAll('#hausuebung [data-worksheet-point]')];
  const score = document.getElementById('worksheet-score');
  const update = () => { score.textContent = String(points.filter(point => point.checked).length); };
  points.forEach(point => point.addEventListener('change', update));
  update();
})();
