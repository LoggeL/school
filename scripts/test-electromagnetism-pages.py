"""Keep the learning route useful without JavaScript and calculations optional."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]/'site/physik'
class Lesson(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.questions=0;self.answers=0;self.controls=0;self.formulas=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='input':
            assert a.get('type') in ('range','checkbox'), 'No typed answers in self-tests'
            self.controls+=1
        if 'em-theory-question' in a.get('class','').split(): self.questions+=1
        if tag=='details':
            assert 'open' not in a, 'Answers and calculations start hidden'
            if any('em-theory-question' in x.get('class','').split() for _,x in self.stack): self.answers+=1
        if 'em-formula' in a.get('class','').split():
            self.formulas+=1
            assert any(x.get('id')=='vertiefung' for _,x in self.stack), 'Formula outside optional deepening'
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.stack.append((tag,a))
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag: self.stack=self.stack[:i];break
for topic in ('generator','induktion','magnetfeld-eisenkern','transformator','hochspannungsleitungen'):
    text=(ROOT/topic/'index.html').read_text()
    page=Lesson();page.feed(text)
    assert page.questions==page.answers==5,topic
    assert page.controls>=3 and page.formulas>=1,topic
    assert text.index('id="selbsttest"')<text.index('id="vertiefung"'),topic
    assert 'id="em-static"' in text and '<noscript>' in text,topic
print('PASS: five chapters, 25 individually hidden answers, formulas optional, no typed answers, static fallbacks present.')
