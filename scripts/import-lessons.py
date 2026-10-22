"""Copy the five published teaching units from a static-pages checkout."""
import sys, shutil, re, json, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).resolve()
lessons=['quadratische-gleichungen','nachhilfe-quadratische-gleichungen','bildbeschreibung-klasse5','bewegungserziehung-uw1','rectify-trennkolonne']
back='''<a class="school-home-link" href="/" aria-label="Zur school Lernübersicht" style="position:fixed;right:14px;bottom:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:99999;display:block;padding:8px 15px;border-radius:24px;border:1px solid #d3ddce;background:#fffef6;color:#235849;text-decoration:none;font:600 12px/1.5 system-ui,sans-serif;box-shadow:0 2px 10px #0002">← school</a><style>@media print{.school-home-link{display:none!important}}</style>'''
for lesson in lessons:
    dest=root/'site'/lesson
    shutil.copytree(source/'public'/lesson,dest,dirs_exist_ok=True)
    for html in dest.rglob('*.html'):
        text=html.read_text()
        if 'class="school-home-link"' not in text:
            text=re.sub(r'</body>',back+'</body>',text,flags=re.I)
        # Keep old deep links within the new learning collection.
        text=text.replace('https://loggel.github.io/static-pages/','/')
        html.write_text(text)
commit=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
(root/'imports.json').write_text(json.dumps({'repository':'https://github.com/LoggeL/static-pages','commit':commit,'lessons':lessons},indent=2)+'\n')
print(f'Imported {len(lessons)} units from {commit[:8]}.')
