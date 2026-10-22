"""Check local HTML references without contacting third-party services."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]/'site'
class Links(HTMLParser):
    def __init__(self): super().__init__();self.refs=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        for key in ['src','href']:
            if a.get(key): self.refs.append(a[key])
pages={}
for p in ROOT.rglob('*.html'):
    parser=Links();parser.feed(p.read_text());pages[p]=parser
errors=[];checked=0
for p,parser in pages.items():
    for ref in parser.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc or not url.path: continue
        target=(ROOT/url.path.lstrip('/')) if url.path.startswith('/') else p.parent/url.path
        target=Path(unquote(str(target))).resolve()
        if target.is_dir(): target=target/'index.html'
        checked+=1
        if not target.is_file(): errors.append(f'{p.relative_to(ROOT)}: missing {ref}')
    # New pages own their IDs; imports can have legacy markup quirks.
    if p==ROOT/'index.html' or 'physik' in p.parts:
        duplicates={i for i in parser.ids if parser.ids.count(i)>1}
        if duplicates: errors.append(f'{p.relative_to(ROOT)}: duplicate ids {duplicates}')
print(f'{len(pages)} HTML pages, {checked} local references checked.')
for e in errors: print(e)
raise SystemExit(bool(errors))
