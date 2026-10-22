// The catalogue is grouped by subject in the HTML and works without JavaScript.
// The active subject follows the URL hash; overview hashes clear the selection.
const links = [...document.querySelectorAll('.subject-jump')];
function markSubject(id) {
  links.forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
links.forEach(link => link.addEventListener('click', () => markSubject(link.hash.slice(1))));
markSubject(location.hash.slice(1));
addEventListener('hashchange', () => markSubject(location.hash.slice(1)));
