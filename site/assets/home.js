const buttons = [...document.querySelectorAll('.filter')];
const cards = [...document.querySelectorAll('.card')];
function filter(subject) {
  if (!buttons.some(button => button.dataset.filter === subject)) subject = 'alle';
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === subject)));
  cards.forEach(card => { card.hidden = subject !== 'alle' && !card.dataset.subject.split(' ').includes(subject); });
  const count = cards.filter(card => !card.hidden).length;
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'Lerneinheit' : 'Lerneinheiten'}`;
}
buttons.forEach(button => button.addEventListener('click', () => { filter(button.dataset.filter); history.replaceState(null, '', button.dataset.filter === 'alle' ? '#faecher' : `#${button.dataset.filter}`); }));
filter(location.hash.slice(1));
addEventListener('hashchange', () => filter(location.hash.slice(1)));
