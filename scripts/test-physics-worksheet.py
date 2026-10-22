"""Deterministic worksheet and preservation checks; run after build-physics.py."""
from pathlib import Path
from html.parser import HTMLParser
import subprocess
import runpy

root = Path(__file__).resolve().parents[1]
html = (root / 'site/physik/spule-elektromagnet/index.html').read_text()
worksheet = runpy.run_path(str(root / 'scripts/physics-worksheet.py'))
assert len(worksheet['questions']) == 5
assert html.count('data-worksheet-question=') == 5
assert html.count('data-worksheet-solution=') == 5
assert html.count('data-worksheet-point') == 10
assert html.count('class="exercise"') == 8
assert '<details class="solution worksheet-solutions" id="worksheet-solutions">' in html
for term in ['100 Windungen', '200', 'Restmagnetisierung', 'Holzkern', 'nicht ferromagnetisch', 'ca. 15 Minuten · 10 Punkte']:
    assert term in html, term

class IDs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
    def handle_starttag(self, tag, attrs):
        self.ids.extend(v for k, v in attrs if k == 'id')
parser = IDs()
parser.feed(html)
assert len(parser.ids) == len(set(parser.ids)), 'duplicate IDs'
for section in ['grundidee', 'spulenlabor', 'eisenkern', 'rechnen', 'uebungen', 'hausuebung']:
    assert section in parser.ids
print('PASS: 5 questions, 5 solutions, 10 rubric points, 8 retained numeric exercises, unique IDs, all six sections.')
