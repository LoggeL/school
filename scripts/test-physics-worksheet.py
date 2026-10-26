"""Check the original article's theory-first, reveal-to-self-test interaction."""
from pathlib import Path
from html.parser import HTMLParser
import runpy

root = Path(__file__).resolve().parents[1]
html = (root / 'site/physik/spule-elektromagnet/index.html').read_text()
worksheet = runpy.run_path(str(root / 'scripts/physics-worksheet.py'))
assert len(worksheet['questions']) == 5


class Elements(HTMLParser):
    void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__()
        self.nodes = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'parent': self.stack[-1] if self.stack else None, 'children': []}
        self.nodes.append(node)
        if node['parent'] is not None:
            node['parent']['children'].append(node)
        if tag not in self.void:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                self.stack = self.stack[:i]
                break


def has_class(node, name):
    return name in node['attrs'].get('class', '').split()


def ancestors(node):
    parent = node['parent']
    while parent is not None:
        yield parent
        parent = parent['parent']


parser = Elements()
parser.feed(html)
nodes = parser.nodes
ids = [node['attrs']['id'] for node in nodes if 'id' in node['attrs']]
assert len(ids) == len(set(ids)), 'Duplicate IDs'
for section in ['grundidee', 'spulenlabor', 'eisenkern', 'rechnen', 'uebungen', 'hausuebung']:
    assert section in ids, section
assert html.index('id="hausuebung"') < html.index('id="spulenlabor"') < html.index('id="rechnen"'), 'Theory self-test must precede lab and calculations'
assert not any(node['tag'] in {'form', 'textarea'} for node in nodes), 'Self-tests must not require typed answers'
for node in nodes:
    if node['tag'] == 'input':
        assert node['attrs'].get('type') in {'range', 'checkbox'}, 'Only experiment sliders and toggles remain'
assert 'data-worksheet-point' not in html and 'worksheet-score' not in html and 'task-progress' not in html

questions = [node for node in nodes if 'data-worksheet-question' in node['attrs']]
solutions = [node for node in nodes if 'data-worksheet-solution' in node['attrs']]
assert len(questions) == len(solutions) == 5
for question in questions:
    answer = question['children'][-1]
    assert answer['tag'] == 'details' and 'open' not in answer['attrs'], 'Each theory answer starts closed'
    assert answer['attrs'].get('data-worksheet-solution') == question['attrs']['data-worksheet-question'], 'Answer must be paired with its own question'
    assert question['children'][-2]['tag'] == 'p', 'Answer follows the question text'
    assert answer['children'][0]['tag'] == 'summary'

exercises = [node for node in nodes if has_class(node, 'exercise')]
assert len(exercises) == 8, 'Retain all eight optional calculation exercises'
for exercise in exercises:
    solutions = [node for node in nodes if node['tag'] == 'details' and has_class(node, 'solution') and any(parent is exercise for parent in ancestors(node))]
    assert len(solutions) == 1 and 'open' not in solutions[0]['attrs']
    assert any(has_class(parent, 'calculation-depth') for parent in ancestors(exercise)), 'Calculation exercise is optional'

wrappers = [node for node in nodes if has_class(node, 'calculation-depth')]
assert len(wrappers) == 2 and all(node['tag'] == 'details' and 'open' not in node['attrs'] for node in wrappers)
for formula in [node for node in nodes if has_class(node, 'formula')]:
    assert any(has_class(parent, 'calculation-depth') for parent in ancestors(formula)), 'Formula belongs in optional depth'
for term in ['100 Windungen', '200', 'Restmagnetisierung', 'Holzkern', 'nicht ferromagnetisch']:
    assert term in html, term
for required_control in ['current', 'turns', 'core', 'reverse', 'pause', 'model', 'cross-section']:
    assert required_control in ids, required_control
print('PASS: theory first, five individually hidden answers, no typed inputs, eight optional calculation questions, two closed formula sections, 3D controls retained.')
