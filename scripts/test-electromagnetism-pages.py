"""Explanation comes first; the self-test follows the explanation; answers stay hidden."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]/'site/physik'
class Lesson(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.questions=0;self.answers=0;self.controls=0;self.formulas=0;self.steps=0;self.step_buttons=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);cls=a.get('class','').split()
        if tag=='input':
            assert a.get('type') in ('range','checkbox'), 'No typed answers in self-tests'
            self.controls+=1
        if 'em-theory-question' in cls: self.questions+=1
        if 'em-step' in cls: self.steps+=1
        if 'em-step-show' in cls: self.step_buttons+=1
        if tag=='details':
            assert 'open' not in a, 'Answers start hidden'
            if any('em-theory-question' in x.get('class','').split() for _,x in self.stack): self.answers+=1
        if 'em-formula' in cls: self.formulas+=1
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.stack.append((tag,a))
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag: self.stack=self.stack[:i];break
for topic in ('generator','induktion','magnetfeld-eisenkern','transformator','hochspannungsleitungen'):
    text=(ROOT/topic/'index.html').read_text()
    page=Lesson();page.feed(text)
    assert page.questions==page.answers==5,topic
    assert page.controls>=3 and page.formulas>=2,topic
    assert page.steps>=4 and page.step_buttons>=3,topic
    order=[text.index(f'id="{i}"') for i in ('erklaerung','experiment','formel','denkfehler','selbsttest','merke')]
    assert order==sorted(order),topic
    assert 'id="em-static"' in text and '<noscript>' in text,topic
print('PASS: five chapters explanation-first, step buttons drive the model, 25 hidden answers, static fallbacks present.')
