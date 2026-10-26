"""Build five standalone electromagnetism lessons, explanation first.

The text, worked examples and SVGs are original. The linked teaching sources
support the physical relationships. 3D scenes and interaction live in assets/.
"""
from pathlib import Path
from html import escape
import json
import runpy

shared = runpy.run_path(str(Path(__file__).with_name('build-pages.py')))
SITE, page = shared['SITE'], shared['page']
VERSION = '20261026-v3'


def control(name, title, low, high, step, value, unit=''):
    shown = str(value).replace('.', ',')
    return f'''<label class="em-control" for="em-{name}"><span>{title} <output for="em-{name}" data-value="{name}" data-unit="{escape(unit)}">{shown}{unit}</output></span><input type="range" id="em-{name}" name="{name}" min="{low}" max="{high}" step="{step}" value="{value}"></label>'''


def check(name, title, checked=False):
    return f'<label class="em-check"><input type="checkbox" id="em-{name}" name="{name}"{" checked" if checked else ""}> {title}</label>'


def preset(title, values):
    return f'<button type="button" data-preset="{escape(json.dumps(values), quote=True)}">{title}</button>'


def exercise(number, title, question, answer, unit, solution, tolerance='.01'):
    return f'''<article class="em-card em-exercise"><p class="eyebrow">Rechenfrage {number}</p><h3>{title}</h3><p>{question}</p><details><summary>Antwort und Lösungsweg ansehen</summary><p>{solution}</p></details></article>'''


def svg(body, label):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 310" role="img" aria-label="{escape(label)}"><defs><marker id="em-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#3e795d"/></marker></defs><rect width="720" height="310" rx="18" fill="#edf2e8"/><g font-family="system-ui,sans-serif" fill="#203c36">{body}</g></svg>'''


GENERATOR_SVG = svg('''<rect x="52" y="80" width="108" height="145" rx="10" fill="#cb805b"/><rect x="560" y="80" width="108" height="145" rx="10" fill="#658e9d"/><text x="106" y="160" text-anchor="middle" font-size="40" fill="white">N</text><text x="614" y="160" text-anchor="middle" font-size="40" fill="white">S</text><g stroke="#3e795d" stroke-width="2" marker-end="url(#em-arrow)" opacity=".7"><path d="M180 104H540"/><path d="M180 153H540"/><path d="M180 202H540"/></g><path d="M290 100L430 72V205L290 235Z" fill="#bc783b16" stroke="#b5743c" stroke-width="10" stroke-linejoin="round"/><path d="M360 50V260" stroke="#6c7e74" stroke-width="5" stroke-dasharray="8 5"/><path d="M324 45C350 25 405 30 414 56" fill="none" stroke="#3e795d" stroke-width="3" marker-end="url(#em-arrow)"/><text x="360" y="286" text-anchor="middle" font-size="16">Die Spule dreht sich. Der Fluss durch ihre Fläche ändert sich.</text><text x="198" y="66" font-size="14">Magnetfeld B</text>''', 'Eine drehbare Leiterschleife zwischen Nordpol links und Südpol rechts. Das Magnetfeld zeigt nach rechts. Die Drehachse liegt senkrecht dazu.')
INDUCTION_SVG = svg('''<rect x="65" y="117" width="160" height="66" rx="8" fill="#658e9d"/><path d="M145 117H217Q225 117 225 125V175Q225 183 217 183H145Z" fill="#cb805b"/><text x="103" y="160" font-size="26" text-anchor="middle" fill="white">S</text><text x="185" y="160" font-size="26" text-anchor="middle" fill="white">N</text><path d="M248 150H310" stroke="#3e795d" stroke-width="4" marker-end="url(#em-arrow)"/><g fill="none" stroke="#b5743c" stroke-width="6">''' + ''.join(f'<ellipse cx="{x}" cy="150" rx="23" ry="70"/>' for x in range(360,481,20)) + '''</g><path d="M360 220V258H565V186M480 220V244H615V186" fill="none" stroke="#61776a" stroke-width="3"/><circle cx="590" cy="150" r="40" fill="#fffefa" stroke="#637b6c" stroke-width="3"/><path d="M590 150L610 125" stroke="#b5743c" stroke-width="3"/><text x="590" y="170" text-anchor="middle" font-size="14">U</text><text x="145" y="93" text-anchor="middle" font-size="16">Magnet bewegen</text><text x="420" y="54" text-anchor="middle" font-size="16">Fluss durch die Spule ändert sich</text><text x="360" y="289" text-anchor="middle" font-size="16">Beim Anhalten: keine Flussänderung, keine Induktionsspannung.</text>''', 'Ein Stabmagnet wird mit dem Nordpol voran auf eine Spule zu bewegt. Ein angeschlossenes Spannungsmessgerät schlägt aus. Bei Stillstand ist die Induktionsspannung null.')
CORE_SVG = svg('''<rect x="110" y="100" width="500" height="100" rx="12" fill="#becbc2"/><g stroke="#b5743c" stroke-width="8" fill="none">''' + ''.join(f'<ellipse cx="{x}" cy="150" rx="23" ry="74"/>' for x in range(190,551,40)) + '''</g><rect x="155" y="122" width="410" height="55" rx="8" fill="#dce6dc"/><g stroke="#3e795d" stroke-width="3" marker-end="url(#em-arrow)">''' + ''.join(f'<path d="M{x} 150h32"/>' for x in range(175,540,60)) + '''</g><path d="M600 150C690 150 680 40 540 40H175C40 40 25 150 110 150" fill="none" stroke="#3e795d" stroke-width="2"/><path d="M390 40H325" fill="none" stroke="#3e795d" stroke-width="2" marker-end="url(#em-arrow)"/><text x="85" y="157" text-anchor="middle" font-size="25">S</text><text x="635" y="157" text-anchor="middle" font-size="25">N</text><text x="360" y="248" text-anchor="middle" font-size="16">Im Eisen richten sich magnetische Bereiche bevorzugt aus.</text><text x="360" y="280" text-anchor="middle" font-size="14">Feldlinien bilden geschlossene Wege. Innen: S → N. Außen: N → S.</text>''', 'Längsschnitt einer Spule mit Eisenkern. Kleine Pfeile im Kern zeigen bevorzugt nach rechts. Der Nordpol liegt rechts. Feldlinien laufen außen zum Südpol links zurück.')
TRANSFORMER_SVG = svg('''<path d="M210 65H510V240H210Z" fill="none" stroke="#8eaaa0" stroke-width="47" stroke-linejoin="round"/><g stroke="#ba783e" stroke-width="8" fill="none">''' + ''.join(f'<path d="M172 {y}Q210 {y-17} 247 {y}"/>' for y in range(90,231,20)) + '''</g><g stroke="#7097a3" stroke-width="8" fill="none">''' + ''.join(f'<path d="M473 {y}Q510 {y-17} 548 {y}"/>' for y in range(110,211,33)) + '''</g><path d="M270 65H450M510 95V207M450 240H270M210 205V95" fill="none" stroke="#3e795d" stroke-width="3" marker-end="url(#em-arrow)"/><text x="92" y="119" text-anchor="middle" font-size="18">Primärspule</text><text x="92" y="151" text-anchor="middle" font-size="17">N₁ = 400</text><text x="92" y="183" text-anchor="middle" font-size="17">U₁ = 12 V ~</text><text x="628" y="119" text-anchor="middle" font-size="18">Sekundärspule</text><text x="628" y="151" text-anchor="middle" font-size="17">N₂ = 200</text><text x="628" y="183" text-anchor="middle" font-size="17">U₂ = 6 V ~</text><text x="360" y="147" text-anchor="middle" font-size="15">Veränderlicher</text><text x="360" y="173" text-anchor="middle" font-size="15">magnetischer Fluss</text><text x="360" y="286" text-anchor="middle" font-size="16">Die Pfeile zeigen eine Momentaufnahme. Die Richtung wechselt.</text>''', 'Zwei getrennte Spulen auf einem geschlossenen Eisenkern. Die Primärspule hat 400 Windungen und 12 Volt Wechselspannung; die Sekundärspule mit 200 Windungen liefert ideal 6 Volt.')
LINES_SVG = svg('''<rect x="35" y="115" width="105" height="85" rx="8" fill="#c7d7c9"/><rect x="580" y="115" width="105" height="85" rx="8" fill="#c7d7c9"/><path d="M140 135H580M580 183H140" stroke="#688274" stroke-width="5" fill="none"/><path d="M215 135H275M505 183H445" fill="none" stroke="#3e795d" stroke-width="3" marker-end="url(#em-arrow)"/><rect x="302" y="120" width="115" height="30" rx="4" fill="#e2bf91"/><rect x="302" y="168" width="115" height="30" rx="4" fill="#e2bf91"/><text x="88" y="149" text-anchor="middle" font-size="14">Sender</text><text x="88" y="175" text-anchor="middle" font-size="14">P = U · I</text><text x="632" y="149" text-anchor="middle" font-size="14">Empfänger</text><text x="632" y="175" text-anchor="middle" font-size="14">P an</text><text x="360" y="66" text-anchor="middle" font-size="21">Gleiche Sendeleistung: höhere Spannung, kleinerer Strom</text><text x="360" y="235" text-anchor="middle" font-size="17">R umfasst Hinleitung und Rückleitung zusammen.</text><text x="360" y="278" text-anchor="middle" font-size="19">Verlustleistung: P Verlust = I² · R</text>''', 'Ein einfacher geschlossener Stromkreis zwischen Sender und Empfänger mit Hinleitung und Rückleitung. Beide Leitungswiderstände zählen zur gesamten Verlustleistung I Quadrat mal R.')


# ---------------------------------------------------------------------------
# Didactic structure (v3): explanation first.
#   Darum geht's → Schritt für Schritt erklärt (each step can drive the 3D model)
#   → 3D-Labor with observation tasks → Formel & Rechenbeispiel → Denkfehler
#   → Teste dich (concept questions + calculations, answers hidden) → Merke.
# ---------------------------------------------------------------------------

def step_button(label, preset=None, view=None):
    attrs = ''
    if preset is not None:
        attrs += f' data-preset="{escape(json.dumps(preset), quote=True)}"'
    if view:
        attrs += f' data-view="{view}"'
    return f'<button type="button" class="em-step-show"{attrs}>{label} <span aria-hidden="true">↗</span></button>'


LESSONS = [
{
'slug': 'generator', 'title': 'Generator', 'headline': 'Aus Drehen wird Spannung.', 'time': '15',
'intro': 'Fahrraddynamo, Windrad, Kraftwerk: Überall dreht sich etwas in einem Magnetfeld, und heraus kommt elektrische Spannung. Hier lernst du Schritt für Schritt, warum das funktioniert.',
'question': 'Warum entsteht beim Drehen einer Spule im Magnetfeld eine Spannung, und warum wechselt sie ständig ihre Richtung?',
'core': 'Dreht sich eine Spule im Magnetfeld, ändert sich ständig der <strong>magnetische Fluss</strong> durch sie. Jede Flussänderung erzeugt eine Spannung. Weil die Änderung jede halbe Umdrehung ihre Richtung wechselt, entsteht eine <strong>Wechselspannung</strong>.',
'everyday': '<p>Im Fahrraddynamo dreht das Rad einen kleinen Magneten an einer Spule vorbei. Im Windrad drehen die Rotorblätter einen großen Generator, im Kraftwerk tut das eine Turbine. Das Prinzip ist immer dasselbe: Bewegung und Magnetfeld zusammen ergeben elektrische Spannung.</p>',
'steps': [
    ('Das Magnetfeld durchsetzt die Spule',
     '<p>Zwischen den beiden Magnetpolen verläuft ein gleichmäßiges Magnetfeld vom Nordpol zum Südpol. Ein Teil davon geht durch die Fläche der Spule. Wie viel Feld eine Fläche durchsetzt, nennt man den <strong>magnetischen Fluss Φ</strong>.</p><p>Steht die Spulenfläche quer zum Feld, geht am meisten hindurch: Φ ist maximal. Liegt die Fläche parallel zum Feld, geht nichts hindurch: Φ = 0.</p>',
     step_button('Im Modell: Spule anhalten', {'speed': 0, 'field': .5}, 'coil')),
    ('Drehen ändert den Fluss, und das erzeugt Spannung',
     '<p>Dreht sich die Spule, ändert sich Φ ständig: von maximal über null zu maximal in umgekehrter Richtung und wieder zurück. Genau diese <em>Änderung</em> erzeugt nach dem Induktionsgesetz eine Spannung zwischen den Enden des Drahts.</p><p>Ein Magnetfeld allein reicht nicht. Steht die Spule still, ändert sich nichts, und die Spannung ist null, egal wie stark der Magnet ist.</p>',
     step_button('Im Modell: Spule drehen', {'speed': 30}, 'overview')),
    ('Die Spannung ist null, wenn der Fluss am größten ist',
     '<p>Das ist der überraschende Teil. Steht die Fläche gerade quer zum Feld, ist Φ zwar maximal, ändert sich in diesem Augenblick aber kaum: Die Spule bewegt sich parallel zu den Feldlinien. Die Spannung ist <strong>null</strong>.</p><p>Eine Vierteldrehung später liegt die Fläche längs zum Feld. Jetzt ist Φ = 0, aber die Spule schneidet die Feldlinien am schnellsten. Φ ändert sich maximal schnell, und die Spannung ist <strong>am größten</strong>. Aus diesem Wechsel entsteht die Sinuskurve im Diagramm.</p>',
     step_button('Im Modell: in Zeitlupe ansehen', {'speed': 10}, 'coil')),
    ('Schleifringe führen die Wechselspannung nach außen',
     '<p>Die Spule dreht sich, das Messgerät steht still. Damit die Kabel sich nicht verdrillen, sitzt jedes Spulenende auf einem eigenen <strong>Schleifring</strong>. Feststehende Kohlebürsten schleifen darauf und nehmen die Spannung ab.</p><p>Nach jeder halben Umdrehung kehrt sich die Polung um. Am Messgerät kommt deshalb eine Wechselspannung an: Der Zeiger pendelt zwischen Plus und Minus.</p>',
     step_button('Im Modell: Schleifringe zeigen', {'speed': 30}, 'sliprings')),
    ('Die Energie kommt vom Antrieb',
     '<p>Schließt man eine Lampe an, fließt Strom durch die Spule. Dieser Strom erfährt im Magnetfeld eine Kraft, die die Drehung <strong>bremst</strong>. Wer kurbelt, muss also kräftiger drehen, sobald Strom entnommen wird.</p><p>Die elektrische Energie stammt aus dieser Arbeit des Antriebs. Der Magnet wird dabei nicht „verbraucht“. Er stellt nur das Feld bereit, in dem die Umwandlung stattfindet.</p>',
     ''),
],
'lab_title': 'Dreh die Spannung hoch', 'lab_intro': 'Ziehe am Modell, um es zu drehen. Beobachte die gelbe Flächennormale, den Zeiger und die Kurve gleichzeitig.',
'controls': control('speed','Drehzahl',0,120,5,30,' U/min')+control('turns','Windungszahl N',20,200,20,100)+control('field','Flussdichte B',0,1,.1,.5,' T'),
'presets': preset('Antrieb steht',{'speed':0})+preset('Doppelte Drehzahl',{'speed':60}),
'tasks': [
    ('Verdopple die Drehzahl von 30 auf 60 U/min. Was passiert mit dem Spitzenwert, was mit der Frequenz?', {'speed': 60, 'turns': 100, 'field': .5}, 'Beide verdoppeln sich: Die Spule ändert den Fluss doppelt so schnell und doppelt so oft.'),
    ('Verdopple die Windungszahl auf 200. Ändert sich auch die Frequenz?', {'speed': 30, 'turns': 200, 'field': .5}, 'Nur der Spitzenwert verdoppelt sich. Die Frequenz hängt allein von der Drehzahl ab.'),
    ('Stelle B auf 0. Warum bleibt der Zeiger in Ruhe, obwohl sich die Spule dreht?', {'speed': 30, 'field': 0}, 'Ohne Feld ist der Fluss immer null. Es gibt nichts, was sich ändern könnte.'),
],
'formula': '''<div class="em-formula">Φ = B · A · cos θ<br>U(t) = N · B · A · ω · sin(ωt)<br>Û = N · B · A · ω  mit  ω = 2π · f</div>
<dl class="em-vars"><div><dt>Φ</dt><dd>magnetischer Fluss in Weber (Wb)</dd></div><div><dt>B</dt><dd>magnetische Flussdichte in Tesla (T)</dd></div><div><dt>A</dt><dd>Fläche einer Windung in m²</dd></div><div><dt>θ</dt><dd>Winkel zwischen Feld und Flächennormale</dd></div><div><dt>N</dt><dd>Windungszahl</dd></div><div><dt>ω, f</dt><dd>Winkelgeschwindigkeit in 1/s, Frequenz in Hz (Umdrehungen pro Sekunde)</dd></div><div><dt>Û</dt><dd>Spitzenwert der Spannung in Volt</dd></div></dl>
<p>Die Sinusform folgt direkt aus dem Induktionsgesetz: Die Spannung ist die Änderungsrate des Flusses, und die Änderungsrate von cos ist sin. Der Effektivwert, den ein normales Messgerät für Wechselspannung anzeigt, beträgt Û / √2.</p>''',
'example': ('Ein kleiner Modellgenerator', '<p>Gegeben: N = 100, B = 0,5 T, A = 0,02 m², Drehzahl 30 U/min.</p><div class="em-formula">f = 30 / 60 s = 0,5 Hz<br>ω = 2π · 0,5 Hz ≈ 3,14 1/s<br>Û = 100 · 0,5 T · 0,02 m² · 3,14 1/s ≈ 3,14 V</div><p>Bei 60 U/min verdoppeln sich ω und damit der Spitzenwert auf etwa 6,28 V. Genau das zeigt auch das 3D-Labor.</p>'),
'myths': [
    ('„Der Magnet liefert die Energie.“', 'Der Magnet stellt nur das Feld bereit. Die elektrische Energie stammt aus der Arbeit des Antriebs. Belastet man den Generator, wird er schwerer zu drehen.'),
    ('„Die Spannung ist am größten, wenn am meisten Feld durch die Spule geht.“', 'Gerade dann ist sie null. Es zählt, wie schnell sich der Fluss ändert, nicht wie groß er ist.'),
    ('„Ein stärkerer Magnet macht die Wechselspannung schneller.“', 'Ein stärkeres Feld erhöht nur den Spitzenwert. Wie oft die Polung wechselt, bestimmt allein die Drehzahl.'),
],
'model_note':'Idealisierter Wechselspannungsgenerator mit gleichmäßigem Magnetfeld, Spulenfläche A = 0,02 m² und offenem Stromkreis. Es werden nicht alle Windungen einzeln gezeichnet. „Animation pausieren“ friert einen Zeitpunkt ein; Drehzahl 0 hält den Generator an. Die Feldlinien sind ein Denkmodell, keine sichtbaren Fäden.',
'svg': GENERATOR_SVG, 'caption':'Eine gleichmäßige Drehung ändert den Winkel zwischen Flächennormale und Magnetfeld. Die Spannung wechselt dadurch ihre Polung.',
'exercises':[
    ('Drehzahl umrechnen','Eine Spule dreht sich mit 120 U/min. Wie groß ist die Frequenz?','120 Umdrehungen in 60 Sekunden ergeben 120 / 60 = <strong>2 Hz</strong>.'),
    ('Mehr Windungen','Ein Generator liefert bei 100 Windungen einen Spitzenwert von 4 V. Wie groß ist er bei 200 Windungen, wenn alles andere gleich bleibt?','Û ist proportional zu N. Doppelte Windungszahl ergibt <strong>8 V</strong>.'),
    ('Spitzenwert berechnen','N = 50, B = 0,4 T, A = 0,01 m², f = 5 Hz. Berechne Û.','ω = 2π · 5 Hz ≈ 31,4 1/s. Û = 50 · 0,4 · 0,01 · 31,4 V ≈ <strong>6,3 V</strong>.'),
],
'questions': [
    ('Was passiert, wenn du den Antrieb anhältst?', 'Die Spannung fällt auf null. Das Magnetfeld ist weiterhin da, aber ohne Drehung ändert sich der Fluss durch die Spule nicht mehr.'),
    ('Woher kommt die elektrische Energie eines Generators?', 'Aus der mechanischen Arbeit des Antriebs, etwa einer Turbine oder deiner Hand. Fließt Strom, bremst ein Gegendrehmoment die Spule, gegen das der Antrieb arbeiten muss.'),
    ('Warum wechselt die Spannung ihre Polung?', 'Während einer halben Umdrehung nimmt der Fluss ab, während der nächsten nimmt er wieder zu. Die Richtung der Änderung kehrt sich um, und damit die Polung der Spannung.'),
    ('In welcher Stellung ist die Spannung null, obwohl sich die Spule dreht?', 'Wenn die Spulenfläche quer zum Feld steht. Der Fluss ist dann maximal, ändert sich aber in diesem Moment nicht. Eine Vierteldrehung später ist die Spannung am größten.'),
    ('Was ändern mehr Windungen, was eine höhere Drehzahl?', 'Mehr Windungen erhöhen nur den Spitzenwert. Eine höhere Drehzahl erhöht den Spitzenwert und zusätzlich die Frequenz.'),
],
'summary': ['Spannung entsteht durch die <strong>Änderung</strong> des magnetischen Flusses, nicht durch den Fluss selbst.', 'Eine gleichmäßig drehende Spule liefert eine sinusförmige Wechselspannung. Ihre Frequenz ist die Zahl der Umdrehungen pro Sekunde.', 'Der Spitzenwert Û = N · B · A · ω wächst mit Windungszahl, Feld, Fläche und Drehzahl.', 'Die elektrische Energie stammt aus der Arbeit des Antriebs.'],
'sources': [('OpenStax: Electric Generators','https://openstax.org/books/college-physics-2e/pages/23-5-electric-generators'),('LEIFIphysik: Generator','https://www.leifiphysik.de/elektrizitaetslehre/induktion-generator-und-transformator')],
},
{
'slug':'induktion','title':'Elektromagnetische Induktion','headline':'Änderung macht Spannung.','time':'14',
'intro':'Schiebst du einen Magneten in eine Spule, zuckt der Zeiger eines Messgeräts. Hältst du ihn still, passiert nichts. Hier erfährst du, was genau die Spannung auslöst.',
'question':'Warum entsteht nur dann eine Spannung, wenn sich etwas bewegt oder verändert, und wovon hängt ihre Größe ab?',
'core':'Eine Spule erzeugt eine Spannung, <strong>solange sich der magnetische Fluss durch sie ändert</strong>. Je schneller die Änderung, desto größer die Spannung. Ob der Fluss zu- oder abnimmt, bestimmt das Vorzeichen.',
'everyday':'<p>Induktion begegnet dir öfter, als du denkst: beim kabellosen Laden des Handys, im Induktionsherd, im Fahrraddynamo und in jedem Netzteil. Das Grundexperiment dazu ist ganz einfach: ein Magnet, eine Spule und ein Messgerät.</p>',
'steps':[
    ('Ein ruhender Magnet erzeugt keine Spannung',
     '<p>Der Magnet liegt still vor der Spule. Ein Teil seiner Feldlinien geht durch die Windungen, die Spule wird also von einem magnetischen Fluss durchsetzt. Trotzdem zeigt das Messgerät <strong>null</strong>.</p><p>Der Grund: Der Fluss ist zwar da, aber er bleibt gleich. Induktion braucht eine Änderung.</p>',
     step_button('Im Modell: Magnet anhalten', {'speed': 0}, 'field')),
    ('Annähern: Der Fluss wächst, der Zeiger schlägt aus',
     '<p>Bewegst du den Magneten auf die Spule zu, laufen immer mehr Feldlinien durch die Windungen. Der Fluss <strong>nimmt zu</strong>, und es entsteht eine Spannung. Der Zeiger schlägt aus.</p><p>Am stärksten ist der Ausschlag dort, wo sich der Fluss am schnellsten ändert. Das ist meist kurz vor der Spulenöffnung, wo das Feld des Magneten stark ungleichmäßig ist.</p>',
     step_button('Im Modell: Magnet bewegen', {'speed': 1, 'reverse': False}, 'coil')),
    ('Entfernen: Das Vorzeichen kehrt sich um',
     '<p>Ziehst du den Magneten wieder heraus, <strong>nimmt der Fluss ab</strong>. Der Zeiger schlägt in die andere Richtung aus. Dasselbe passiert, wenn du den Magneten umdrehst und mit dem Südpol voran hineinschiebst.</p><p>Am Umkehrpunkt steht der Magnet für einen Augenblick still. Genau dort ist die Spannung null, obwohl er der Spule ganz nah ist.</p>',
     step_button('Im Modell: Magnet umpolen', {'speed': 1, 'reverse': True}, 'coil')),
    ('Schneller und mehr Windungen bedeuten mehr Spannung',
     '<p>Dieselbe Flussänderung in der halben Zeit ergibt die doppelte Spannung. Jede Windung liefert ihren eigenen Beitrag, und die Beiträge addieren sich. Doppelt so viele Windungen ergeben deshalb doppelt so viel Spannung.</p>',
     step_button('Im Modell: schnell bewegen', {'speed': 2, 'reverse': False}, 'meter')),
    ('Lenz’sche Regel: Die Spule wehrt sich',
     '<p>Ist der Stromkreis geschlossen, fließt ein Induktionsstrom. Er macht die Spule selbst zu einem Elektromagneten, und zwar so, dass sie der <strong>Änderung entgegenwirkt</strong>. Nähert sich ein Nordpol, entsteht an der zugewandten Spulenseite ebenfalls ein Nordpol: Sie stößt den Magneten ab. Entfernt er sich, entsteht dort ein Südpol: Sie hält ihn fest.</p><p>Du musst also in beiden Richtungen Arbeit verrichten. Genau diese Arbeit wird zur elektrischen Energie, so bleibt die Energieerhaltung gewahrt.</p>',
     step_button('Im Modell: langsam ansehen', {'speed': .5, 'reverse': False}, 'coil')),
],
'lab_title':'Magnet rein, Magnet raus','lab_intro':'Beobachte Feldlinien, Spule und Zeiger zugleich. Die Kurve zeigt die Spannung der letzten Sekunden.',
'controls':control('speed','Bewegungstempo',0,2,.25,1,' ×')+control('turns','Windungszahl N',50,500,50,200)+control('strength','Magnetstärke',.5,2,.25,1,' ×')+check('reverse','Magnet umpolen'),
'presets':preset('Magnet anhalten',{'speed':0})+preset('Schnell bewegen',{'speed':2}),
'tasks':[
    ('Verdopple die Windungszahl von 200 auf 400. Wie ändern sich die Ausschläge?', {'speed': 1, 'turns': 400, 'strength': 1}, 'Alle Ausschläge verdoppeln sich. Die Flussänderung pro Windung bleibt gleich, aber doppelt so viele Windungen tragen bei.'),
    ('Bewege den Magneten doppelt so schnell. Was passiert mit der Kurve?', {'speed': 2, 'turns': 200, 'strength': 1}, 'Die Ausschläge werden doppelt so hoch und die Pulse kürzer: Dieselbe Flussänderung passiert in der halben Zeit.'),
    ('Nimm einen stärkeren Magneten, aber das alte Tempo.', {'speed': 1, 'turns': 200, 'strength': 2}, 'Der Fluss und damit auch seine Änderung werden größer. Die Spannung wächst, der zeitliche Verlauf bleibt gleich.'),
],
'formula':'''<div class="em-formula">U<sub>ind</sub> = −N · ΔΦ / Δt</div>
<dl class="em-vars"><div><dt>U<sub>ind</sub></dt><dd>induzierte Spannung in Volt</dd></div><div><dt>N</dt><dd>Windungszahl der Spule</dd></div><div><dt>ΔΦ</dt><dd>Änderung des Flusses durch eine Windung in Weber (1 Wb = 1 T · m²)</dd></div><div><dt>Δt</dt><dd>Zeit, in der sich der Fluss ändert, in Sekunden</dd></div></dl>
<p>Diese Form liefert die <em>mittlere</em> Spannung während der Zeit Δt. Das Minuszeichen ist die Lenz’sche Regel: Die Spannung treibt einen Strom, der der Flussänderung entgegenwirkt. Für einfache Rechnungen genügt oft der Betrag.</p>''',
'example':('Ein kurzer Spannungspuls','<p>Eine Spule hat 200 Windungen. Der Fluss pro Windung steigt in 0,10 s von 0 auf 0,002 Wb.</p><div class="em-formula">|U<sub>ind</sub>| = 200 · 0,002 Wb / 0,10 s = 4 V</div><p>Gleiche Änderung in 0,05 s: 8 V. Bleibt der Fluss danach konstant, fällt die Spannung auf null.</p>'),
'myths':[
    ('„Wo ein Magnet ist, entsteht automatisch Spannung.“','Nur ein sich ändernder Fluss induziert eine Spannung. Ein ruhender Magnet in einer ruhenden Spule erzeugt keine.'),
    ('„Die Spule zieht den Magneten immer an.“','Sie wirkt immer der Änderung entgegen: Beim Annähern stößt sie ab, beim Entfernen zieht sie an.'),
    ('„Für Induktion muss sich etwas bewegen.“','Es genügt, dass sich das Feld ändert, zum Beispiel weil der Strom in einer Nachbarspule schwankt. So arbeitet der Transformator.'),
],
'model_note':'Schematischer Stabmagnet mit einer glatten, vereinfachten Flusskurve und idealer Spule. Tempo und Magnetstärke sind Vergleichsfaktoren. Tempo 0 hält den Magneten an; die Pause-Taste friert dagegen einen Zeitpunkt samt Messwert ein. Die Feldlinien sind ein Denkmodell.',
'svg':INDUCTION_SVG,'caption':'Die Bewegung des Magneten verändert den Fluss durch die Spule. Umgekehrte Bewegung oder vertauschte Pole kehren die Polung der Spannung um.',
'exercises':[
    ('Halbe Zeit','Dieselbe Flussänderung erzeugt in 0,20 s eine mittlere Spannung von 3 V. Welchen Betrag erhältst du in 0,10 s?','Die Zeit halbiert sich, die Spannung verdoppelt sich: <strong>6 V</strong>.'),
    ('Mit dem Gesetz rechnen','N = 100. Der Fluss pro Windung ändert sich um 0,003 Wb in 0,10 s. Berechne den Betrag der mittleren Spannung.','|U| = 100 · 0,003 Wb / 0,10 s = <strong>3 V</strong>.'),
    ('Magnet festhalten','Magnet und Spule ruhen, das Feld ist konstant. Wie groß ist die Induktionsspannung?','ΔΦ = 0, also <strong>0 V</strong>, auch bei einem sehr starken Magneten.'),
],
'questions':[
    ('Ein Magnet steckt ruhig in einer Spule. Entsteht dauerhaft eine Spannung?','Nein. Der Fluss ist zwar groß, ändert sich aber nicht. Ohne Änderung keine Induktionsspannung.'),
    ('Was ändert sich, wenn du den Magneten schneller bewegst?','Dieselbe Flussänderung passiert in kürzerer Zeit. Der Ausschlag wird größer und kürzer.'),
    ('Warum zeigt das Messgerät beim Herausziehen das andere Vorzeichen?','Der Fluss nimmt jetzt ab statt zu. Die Richtung der Änderung hat sich umgekehrt, damit auch die Polung.'),
    ('Kann Induktion auch ohne bewegten Magneten funktionieren?','Ja. Ändert sich der Strom in einer benachbarten Spule, ändert sich ihr Feld und damit der Fluss durch die ruhende Spule. Darauf beruht der Transformator.'),
    ('Warum spürst du beim Hineinschieben eine Gegenkraft, wenn die Spule kurzgeschlossen ist?','Der Induktionsstrom macht die Spule zum Magneten, der der Änderung entgegenwirkt (Lenz’sche Regel). Gegen diese Kraft verrichtest du Arbeit, und daraus stammt die elektrische Energie.'),
],
'summary':['Eine Spannung wird nur induziert, wenn sich der magnetische Fluss durch die Spule <strong>ändert</strong>.','Je schneller die Änderung und je mehr Windungen, desto größer die Spannung: U = −N · ΔΦ/Δt.','Zunahme und Abnahme des Flusses ergeben entgegengesetzte Vorzeichen.','Der Induktionsstrom wirkt seiner Ursache entgegen (Lenz’sche Regel). Die Energie stammt aus der Bewegungsarbeit.'],
'sources':[('OpenStax: Induced Emf and Magnetic Flux','https://openstax.org/books/college-physics-2e/pages/23-1-induced-emf-and-magnetic-flux'),('OpenStax: Faraday’s Law and Lenz’s Law','https://openstax.org/books/college-physics-2e/pages/23-2-faradays-law-of-induction-lenzs-law')],
},
{
'slug':'magnetfeld-eisenkern','title':'Magnetfeld mit Eisenkern','headline':'Warum Eisen die Spule stärker macht.','time':'13',
'intro':'Eine Spule mit Strom ist ein Magnet. Steckt ein Eisenkern darin, hebt derselbe Elektromagnet plötzlich viel mehr Nägel. Hier siehst du, was dabei im Eisen passiert.',
'question':'Woher kommt das zusätzliche Magnetfeld, wenn man Eisen in eine Spule schiebt?',
'core':'Die Spule erzeugt das Feld, das Eisen verstärkt es. Das Spulenfeld richtet die winzigen <strong>magnetischen Bereiche</strong> im Eisen aus. Deren Felder addieren sich zum Spulenfeld, und der Kern wird selbst zum Magneten.',
'everyday':'<p>Elektromagnete mit Eisenkern stecken in Türöffnern, Relais, Lautsprechern, Elektromotoren und in Kränen auf dem Schrottplatz. Der Vorteil gegenüber einem Dauermagneten: Mit dem Strom lässt sich die magnetische Wirkung einschalten, abschalten und umpolen.</p>',
'steps':[
    ('Jede Windung trägt zum Feld bei',
     '<p>Um jeden stromdurchflossenen Draht entsteht ein ringförmiges Magnetfeld. Wickelt man den Draht zu einer Spule, überlagern sich die Felder der Windungen. <strong>Innen</strong> zeigen sie alle in dieselbe Richtung und addieren sich zu einem fast gleichmäßigen Feld. <strong>Außen</strong> sieht das Feld aus wie das eines Stabmagneten.</p>',
     step_button('Im Modell: Luftspule zeigen', {'current': .5, 'core': False, 'domains': True}, 'field')),
    ('Rechte-Hand-Regel: Wo ist der Nordpol?',
     '<p>Umfasse die Spule gedanklich mit der rechten Hand so, dass die Finger in die technische Stromrichtung zeigen (von Plus nach Minus). Dann zeigt der <strong>Daumen zum Nordpol</strong>. Kehrst du den Strom um, tauschen Nord- und Südpol die Seiten.</p><p>Die Feldlinien sind geschlossen: außen vom Nordpol zum Südpol, innen zurück zum Nordpol.</p>',
     step_button('Im Modell: Strom umpolen', {'current': -.5, 'core': False, 'domains': True}, 'field')),
    ('Eisen hinein: Die Bereiche richten sich aus',
     '<p>Eisen besteht aus vielen kleinen Bereichen, den <strong>Weiss-Bezirken</strong>. In jedem sind die magnetischen Momente der Atome schon gleich ausgerichtet. Ohne äußeres Feld zeigen die Bezirke aber kreuz und quer und heben sich gegenseitig auf.</p><p>Das Spulenfeld ändert das: Günstig ausgerichtete Bezirke wachsen, andere drehen sich mit. Die vielen kleinen Felder zeigen jetzt überwiegend in dieselbe Richtung und verstärken das Spulenfeld oft um ein Vielfaches.</p>',
     step_button('Im Modell: in den Kern schauen', {'current': .5, 'core': True, 'domains': True}, 'inside')),
    ('Grenzen: Sättigung und Restmagnetismus',
     '<p>Sind fast alle Bezirke ausgerichtet, ist das Eisen <strong>gesättigt</strong>. Mehr Strom bringt dann kaum noch zusätzlichen Beitrag vom Material. Die Verstärkung ist also kein fester Faktor.</p><p>Schaltet man den Strom ab, kann ein Teil der Ausrichtung bleiben (<strong>Remanenz</strong>). Für Elektromagnete und Transformatoren nimmt man deshalb weichmagnetisches Eisen, das sich leicht wieder entmagnetisiert.</p>',
     step_button('Im Modell: maximaler Strom', {'current': 1, 'core': True, 'domains': True}, 'inside')),
],
'lab_title':'Schau in den Eisenkern','lab_intro':'Schiebe den Kern hinein und heraus, verändere den Strom und beobachte die Bezirke und das Feldlinienbild.',
'controls':control('current','Stromstärke I',-1,1,.1,.5,' A')+check('core','Eisenkern einsetzen',True)+check('domains','Weiss-Bezirke zeigen',True),
'presets':preset('Strom aus',{'current':0})+preset('Umpolen',{'current':-.5}),
'tasks':[
    ('Stelle den Strom auf 0. Wie sehen die Bezirke aus?', {'current': 0, 'core': True, 'domains': True}, 'Ungeordnet. Ohne Spulenfeld gibt es keine Vorzugsrichtung. Im Modell bleibt kein Restmagnetismus zurück, in echtem Eisen kann ein kleiner Rest bleiben.'),
    ('Nimm den Kern heraus und setze ihn wieder ein. Was ändert sich am Feldlinienbild?', {'current': .5, 'core': False, 'domains': True}, 'Ohne Kern ist das Feld deutlich schwächer, aber nicht weg: Die Spule allein erzeugt es schon.'),
    ('Erhöhe den Strom schrittweise bis 1 A.', {'current': 1, 'core': True, 'domains': True}, 'Die Ausrichtung nimmt erst schnell, dann immer langsamer zu. Das ist der Beginn der Sättigung.'),
],
'formula':'''<div class="em-formula">B<sub>Luft</sub> ≈ μ₀ · N · I / ℓ<br>B<sub>Kern</sub> ≈ μ<sub>r</sub> · μ₀ · N · I / ℓ</div>
<dl class="em-vars"><div><dt>B</dt><dd>magnetische Flussdichte im Inneren in Tesla</dd></div><div><dt>μ₀</dt><dd>magnetische Feldkonstante ≈ 1,257 · 10⁻⁶ T·m/A</dd></div><div><dt>N, I, ℓ</dt><dd>Windungszahl, Stromstärke in A, Spulenlänge in m</dd></div><div><dt>μ<sub>r</sub></dt><dd>Permeabilitätszahl des Kerns, für Eisen etwa einige Hundert bis Tausende</dd></div></dl>
<p>Die erste Formel gilt gut für lange, dicht gewickelte Spulen ohne Kern. Die zweite ist nur eine grobe Näherung: μ<sub>r</sub> hängt vom Material, von der Kernform und von der Stärke des Feldes ab und sinkt bei Sättigung stark.</p>''',
'example':('Wie stark ist eine Luftspule?','<p>N = 400, ℓ = 0,20 m, I = 0,5 A.</p><div class="em-formula">B ≈ 1,257 · 10⁻⁶ · 400 · 0,5 / 0,20 T ≈ 1,26 mT</div><p>Zum Vergleich: Das Erdmagnetfeld hat etwa 0,05 mT. Mit einem Eisenkern kann die Spule ein Vielfaches erreichen. Wie viel genau, lässt sich ohne Materialdaten nicht seriös angeben.</p>'),
'myths':[
    ('„Ohne Eisenkern hat die Spule kein Magnetfeld.“','Das Feld erzeugt der Strom. Der Kern verstärkt es nur.'),
    ('„Der Eisenkern muss an die Batterie angeschlossen werden.“','Er ist kein Teil des Stromkreises. Er wird allein durch das Spulenfeld magnetisiert.'),
    ('„Eisen macht das Feld immer um denselben Faktor stärker.“','Die Verstärkung hängt von Material, Form und Feldstärke ab und bricht bei Sättigung ein.'),
],
'model_note':'Qualitatives Modell einer Spule mit weichmagnetischem Kern. Die kleinen Pfeile stehen für die Magnetisierung von Bereichen, nicht für sichtbare Stabmagnete. Es wird kein fester Verstärkungsfaktor für Eisen angegeben; Sättigung wird qualitativ gezeigt, Remanenz nicht.',
'svg':CORE_SVG,'caption':'Das Spulenfeld magnetisiert den Eisenkern. Die ausgerichteten Bereiche verstärken das Feld. Die Feldliniendichte ist qualitativ.',
'exercises':[
    ('Strom verdoppeln','Eine lange Luftspule erzeugt bei 0,25 A ein Feld von 0,6 mT. Wie groß ist B bei 0,50 A?','B ∝ I. Doppelter Strom ergibt <strong>1,2 mT</strong>.'),
    ('Länge verdoppeln','Eine Luftspule erzeugt 2,4 mT. Ihre Länge wird verdoppelt, N und I bleiben gleich. Wie groß ist B?','B ∝ 1/ℓ. Also 2,4 mT / 2 = <strong>1,2 mT</strong>.'),
    ('Windungen berechnen','Eine 10 cm lange Luftspule soll bei 2 A ein Feld von 5 mT erzeugen. Wie viele Windungen braucht sie etwa?','N = B · ℓ / (μ₀ · I) = 0,005 · 0,10 / (1,257 · 10⁻⁶ · 2) ≈ <strong>200 Windungen</strong>.'),
],
'questions':[
    ('Hat die Spule auch ohne Eisenkern ein Magnetfeld?','Ja, solange Strom fließt. Der Kern verstärkt die Wirkung, er ist nicht ihre Ursache.'),
    ('Was stellen die kleinen Pfeile im Eisen dar?','Die Magnetisierung kleiner Bereiche (Weiss-Bezirke). Im Spulenfeld richten sie sich zunehmend gleich aus.'),
    ('Was passiert beim Umpolen des Stroms?','Die Feldrichtung kehrt sich um, Nord- und Südpol tauschen die Seiten. Die Bezirke richten sich in die neue Richtung aus.'),
    ('Wird das Feld mit Eisen bei jedem zusätzlichen Ampere gleich viel stärker?','Nein. Sind die meisten Bezirke ausgerichtet, ist das Eisen gesättigt und trägt kaum noch mehr bei.'),
    ('Warum nimmt man für Elektromagnete weiches Eisen statt Stahl?','Weiches Eisen lässt sich leicht magnetisieren und verliert die Magnetisierung beim Abschalten fast vollständig. So lässt der Elektromagnet seine Last wieder los.'),
],
'summary':['Der Strom in der Spule erzeugt das Magnetfeld, innen fast gleichmäßig, außen wie bei einem Stabmagneten.','Rechte-Hand-Regel: Finger in Stromrichtung, Daumen zeigt zum Nordpol.','Ein Eisenkern verstärkt das Feld, weil sich seine Weiss-Bezirke im Spulenfeld ausrichten.','Die Verstärkung ist begrenzt (Sättigung) und hängt vom Material ab.'],
'sources':[('Universität Konstanz: Spule mit und ohne Eisenkern','https://www.physik.uni-konstanz.de/vs/themen/em-lehre/bauelemente/spulen/magnetfeldstaerke-einer-spule-mit-und-ohne-fe-kern/'),('OpenStax: Magnetism in Matter','https://openstax.org/books/university-physics-volume-2/pages/12-7-magnetism-in-matter')],
},
{
'slug':'transformator','title':'Transformator','headline':'Eine Spannung wird passend gemacht.','time':'15',
'intro':'Aus 230 V aus der Steckdose werden 5 V für dein Handy, aus 20 000 V im Kraftwerk werden 380 000 V für die Fernleitung. Das schafft ein Bauteil ohne bewegliche Teile: der Transformator.',
'question':'Wie kann man eine Spannung erhöhen oder verringern, ohne dass die beiden Stromkreise elektrisch verbunden sind?',
'core':'Wechselstrom in der Primärspule erzeugt im Eisenkern einen <strong>ständig wechselnden magnetischen Fluss</strong>. Dieser durchsetzt auch die Sekundärspule und induziert dort eine Spannung. Das Verhältnis der Spannungen ist das <strong>Verhältnis der Windungszahlen</strong>.',
'everyday':'<p>Transformatoren stecken in Ladegeräten, Netzteilen, Schweißgeräten und in jedem Umspannwerk. Sie verbinden zwei Stromkreise, die keinen Draht gemeinsam haben, nur einen gemeinsamen Eisenkern.</p>',
'steps':[
    ('Primärseite: Wechselstrom erzeugt Wechselfluss',
     '<p>Die Primärspule hängt an einer Wechselspannung. Der Strom in ihr wechselt ständig Stärke und Richtung, und mit ihm das Magnetfeld. Im Eisenkern entsteht dadurch ein magnetischer Fluss, der ständig wächst, schrumpft und sich umkehrt.</p>',
     step_button('Im Modell: Fluss im Kern zeigen', {'dc': False, 'primary': 400, 'secondary': 200, 'voltage': 12, 'load': 20}, 'core')),
    ('Der Kern führt den Fluss zur zweiten Spule',
     '<p>Der geschlossene Eisenkern bündelt den Fluss und leitet ihn fast vollständig durch die Sekundärspule. Für die Sekundärspule ist das genau wie ein Magnet, der ständig hinein- und herausgeschoben wird: Ihr Fluss ändert sich, also wird eine Spannung <strong>induziert</strong>.</p><p>Zwischen den Spulen gibt es keine leitende Verbindung. Die Energie wird über das Magnetfeld übertragen.</p>',
     step_button('Im Modell: Kern ansehen', None, 'core')),
    ('Jede Windung liefert dieselbe Spannung',
     '<p>Weil beide Spulen von demselben Fluss durchsetzt werden, wird in <em>jeder einzelnen Windung</em> dieselbe Spannung induziert. Die Gesamtspannung einer Spule ist diese Windungsspannung mal ihre Windungszahl. Daraus folgt:</p><div class="em-formula">U₂ / U₁ = N₂ / N₁</div><p>Halb so viele Sekundärwindungen ergeben die halbe Spannung, doppelt so viele die doppelte.</p>',
     step_button('Im Modell: 12 V → 6 V', {'primary': 400, 'secondary': 200, 'voltage': 12, 'dc': False}, 'secondary') + step_button('12 V → 24 V', {'primary': 200, 'secondary': 400, 'voltage': 12, 'dc': False}, 'secondary')),
    ('Mehr Spannung heißt weniger Strom',
     '<p>Ein Transformator erzeugt keine Energie. Im idealen Fall gibt er genau die aufgenommene Leistung weiter: U₁ · I₁ = U₂ · I₂. Wird die Spannung hochtransformiert, ist der Strom auf dieser Seite entsprechend kleiner, und umgekehrt.</p><p>Wie viel Strom fließt, bestimmt der Verbraucher. Braucht die Lampe mehr Leistung, muss auch die Primärseite mehr Strom aufnehmen.</p>',
     step_button('Im Modell: Last vergrößern', {'load': 10, 'dc': False}, 'secondary')),
    ('Mit Gleichspannung funktioniert es nicht',
     '<p>Legst du dauerhaft Gleichspannung an, ist das Feld nach dem Einschalten konstant. Der Fluss ändert sich nicht mehr, also wird auf der Sekundärseite <strong>keine Spannung</strong> induziert. Nur beim Ein- und Ausschalten gibt es kurze Spannungsstöße.</p>',
     step_button('Im Modell: Gleichspannung anlegen', {'dc': True}, 'core')),
],
'lab_title':'Bau deinen Trafo','lab_intro':'Ändere die Windungszahlen und die Last. Beobachte den Fluss im Kern, die Ströme in beiden Kreisen und die Lampe.',
'controls':control('primary','Primärwindungen N₁',100,800,100,400)+control('secondary','Sekundärwindungen N₂',100,800,100,200)+control('voltage','Eingangsspannung U₁',2,24,2,12,' V')+control('load','Lastwiderstand R',10,100,10,20,' Ω')+check('dc','Gleichspannung statt Wechselspannung'),
'presets':preset('12 V → 6 V',{'primary':400,'secondary':200,'voltage':12,'dc':False})+preset('12 V → 24 V',{'primary':200,'secondary':400,'voltage':12,'dc':False}),
'tasks':[
    ('Stelle N₁ = 200 und N₂ = 800 ein. Um welchen Faktor ändert sich die Spannung?', {'primary': 200, 'secondary': 800, 'voltage': 12, 'load': 20, 'dc': False}, 'N₂/N₁ = 4, also U₂ = 4 · 12 V = 48 V. Der Sekundärstrom ist viermal kleiner als der Primärstrom.'),
    ('Halbiere den Lastwiderstand. Was passiert mit I₂, P₂ und I₁?', {'primary': 400, 'secondary': 200, 'voltage': 12, 'load': 10, 'dc': False}, 'U₂ bleibt 6 V. I₂ und P₂ verdoppeln sich, und die Primärseite muss doppelt so viel Strom liefern.'),
    ('Schalte auf Gleichspannung um. Was zeigt die Lampe?', {'dc': True}, 'Sie bleibt dunkel. Ohne Flussänderung keine Induktion.'),
],
'formula':'''<div class="em-formula">U₂ / U₁ = N₂ / N₁<br>I₁ / I₂ = N₂ / N₁<br>P₁ = U₁ · I₁ = U₂ · I₂ = P₂</div>
<dl class="em-vars"><div><dt>U₁, U₂</dt><dd>Spannung an Primär- und Sekundärspule (Effektivwerte)</dd></div><div><dt>N₁, N₂</dt><dd>Windungszahlen</dd></div><div><dt>I₁, I₂</dt><dd>Stromstärken auf beiden Seiten</dd></div><div><dt>P</dt><dd>übertragene Leistung in Watt</dd></div></dl>
<p>Diese Gleichungen gelten für den idealen Transformator. Echte Trafos verlieren Energie durch warme Wicklungen und Ummagnetisierung des Kerns. Der Kern besteht deshalb aus isolierten Blechen, die Wirbelströme klein halten. Gute Trafos erreichen trotzdem Wirkungsgrade über 95 %.</p>''',
'example':('Eine Lampe mit 20 Ω','<p>Gegeben: U₁ = 12 V, N₁ = 400, N₂ = 200, R = 20 Ω.</p><div class="em-formula">U₂ = 12 V · 200 / 400 = 6 V<br>I₂ = 6 V / 20 Ω = 0,30 A<br>P₂ = 6 V · 0,30 A = 1,8 W<br>I₁ = 1,8 W / 12 V = 0,15 A</div><p>Die Spannung halbiert sich, der Strom verdoppelt sich, die Leistung bleibt gleich.</p>'),
'myths':[
    ('„Der Strom fließt von der ersten Spule in die zweite.“','Die Spulen sind elektrisch getrennt. Sie sind nur über den magnetischen Fluss im Kern gekoppelt.'),
    ('„Hochtransformieren bringt mehr Energie.“','Mehr Spannung bedeutet bei gleicher Leistung weniger Strom. Der Trafo ist keine Energiequelle.'),
    ('„Ein Trafo funktioniert auch an einer Batterie.“','Gleichspannung erzeugt einen konstanten Fluss, und ohne Flussänderung gibt es keine Induktion.'),
],
'model_note':'Idealer Trafo mit ohmscher Last, ohne Wicklungsverluste, Streufluss oder Sättigung. Angezeigt werden Effektivwerte. Der Feldwechsel ist stark verlangsamt. Bei Gleichspannung wird nur der eingeschwungene Zustand gezeigt; eine echte Primärspule kann dabei überhitzen. Eigene Versuche nur mit Kleinspannung, nie an der Steckdose.',
'svg':TRANSFORMER_SVG,'caption':'Bei halb so vielen Sekundärwindungen halbiert sich die Spannung. Der magnetische Fluss durchsetzt im idealen Trafo beide Wicklungen.',
'exercises':[
    ('Heruntertransformieren','Ein idealer Trafo hat N₁ = 600 und N₂ = 150. Am Eingang liegen 24 V Wechselspannung. Wie groß ist U₂?','U₂ = 24 V · 150 / 600 = <strong>6 V</strong>.'),
    ('Laststrom','Am Ausgang liegen 6 V an einem Widerstand von 30 Ω. Wie groß ist I₂?','I₂ = 6 V / 30 Ω = <strong>0,20 A</strong>.'),
    ('Ladegerät','Ein Ladegerät macht aus 230 V eine Spannung von 11,5 V. Die Primärspule hat 2000 Windungen. Wie viele hat die Sekundärspule?','N₂ = N₁ · U₂ / U₁ = 2000 · 11,5 / 230 = <strong>100 Windungen</strong>.'),
],
'questions':[
    ('Warum braucht ein Trafo ein sich änderndes Feld?','Die Sekundärspannung entsteht durch Induktion, und Induktion braucht einen sich ändernden Fluss.'),
    ('Die Sekundärspule hat halb so viele Windungen. Was passiert mit der Spannung?','Sie ist halb so groß. Jede Windung liefert dieselbe Spannung, und es gibt nur halb so viele.'),
    ('Fließt derselbe Strom direkt von der ersten Spule in die zweite?','Nein. Die Spulen sind elektrisch getrennt und nur über das Magnetfeld im Kern gekoppelt.'),
    ('Kannst du durch Hochtransformieren Energie gewinnen?','Nein. Bei höherer Spannung ist der Strom kleiner. Die Leistung bleibt im Idealfall gleich und wird in Wirklichkeit etwas kleiner.'),
    ('Warum besteht der Kern aus vielen dünnen, isolierten Blechen?','Der wechselnde Fluss induziert auch im Eisen selbst Ströme (Wirbelströme), die den Kern erwärmen. Isolierte Bleche unterbrechen diese Ströme und verringern die Verluste.'),
],
'summary':['Ein Trafo braucht <strong>Wechselspannung</strong>: Nur ein sich ändernder Fluss induziert in der Sekundärspule eine Spannung.','Die Spannungen verhalten sich wie die Windungszahlen: U₂/U₁ = N₂/N₁.','Die Ströme verhalten sich umgekehrt, weil die Leistung (ideal) gleich bleibt.','Die beiden Stromkreise sind nur magnetisch gekoppelt, nicht elektrisch verbunden.'],
'sources':[('Landesbildungsserver Baden-Württemberg: Der Transformator','https://www.schule-bw.de/faecher-und-schularten/mathematisch-naturwissenschaftliche-faecher/physik/unterrichtsmaterialien/e_lehre_1/induktion/trafo.htm'),('OpenStax: Transformers','https://openstax.org/books/college-physics-2e/pages/23-7-transformers')],
},
{
'slug':'hochspannungsleitungen','title':'Hochspannungsleitungen','headline':'Viel Energie. Möglichst wenig Wärme.','time':'14',
'intro':'Warum hängen über Felder und Wälder Leitungen mit 380 000 Volt? Weil hohe Spannung den Strom klein hält, und ein kleiner Strom die Leitungen kaum erwärmt. Hier rechnest und siehst du, wie groß der Unterschied ist.',
'question':'Warum überträgt man elektrische Energie über große Entfernungen mit sehr hoher Spannung?',
'core':'Leitungen erwärmen sich, wenn Strom fließt: Die Verlustleistung ist <strong>P<sub>V</sub> = I² · R</strong>. Bei gleicher übertragener Leistung bedeutet höhere Spannung kleineren Strom. Weil der Strom <strong>im Quadrat</strong> eingeht, sinken die Verluste drastisch.',
'everyday':'<p>Kraftwerke und Windparks liegen oft Hunderte Kilometer von den Städten entfernt. Die Energie reist über Freileitungen mit 220 000 oder 380 000 Volt und wird in Umspannwerken Stufe für Stufe auf die 230 V heruntertransformiert, die bei dir aus der Steckdose kommen.</p>',
'steps':[
    ('Jede Leitung hat einen Widerstand',
     '<p>Auch dicke Aluminiumseile haben einen kleinen elektrischen Widerstand, und auf 100 km summiert er sich. Fließt Strom hindurch, wird ein Teil der Energie in <strong>Wärme</strong> umgewandelt. Diese Energie kommt beim Verbraucher nicht mehr an.</p><p>Die Verlustleistung hängt vom Strom ab: P<sub>V</sub> = I² · R.</p>',
     step_button('Im Modell: Leitung ansehen', {'voltage': 100, 'power': 10, 'resistance': 10}, 'line')),
    ('Dieselbe Leistung mit weniger Strom',
     '<p>Die übertragene Leistung ist Spannung mal Strom: P = U · I. Sollen 10 MW übertragen werden, braucht man bei 100 kV einen Strom von 100 A, bei 400 kV dagegen nur 25 A.</p><p>Höhere Spannung erlaubt also, <strong>dieselbe Leistung mit kleinerem Strom</strong> zu schicken.</p>',
     step_button('Im Modell: 400 kV einstellen', {'voltage': 400, 'power': 10, 'resistance': 10}, 'overview')),
    ('Der Strom zählt im Quadrat',
     '<p>Halber Strom bedeutet nicht halbe, sondern nur ein <strong>Viertel</strong> der Verluste, denn I² wird (½)² = ¼. Viertel Strom ergibt ein Sechzehntel.</p><p>Bei 100 kV verliert unsere Beispielleitung 1 % der Leistung, bei 400 kV nur noch 0,06 %.</p>',
     step_button('Im Modell: 100 kV zum Vergleich', {'voltage': 100, 'power': 10, 'resistance': 10}, 'line') + step_button('200 kV', {'voltage': 200, 'power': 10, 'resistance': 10}, 'line')),
    ('Transformatoren an beiden Enden',
     '<p>Generatoren liefern etwa 10 000 bis 27 000 V. Ein Transformator im Kraftwerk <strong>erhöht</strong> die Spannung für die Fernleitung. Am Ziel <strong>senken</strong> Umspannwerke sie in mehreren Stufen wieder ab, bis 230 V im Haus ankommen. Deshalb nutzt das Stromnetz Wechselspannung: Sie lässt sich mit Transformatoren einfach umformen.</p>',
     step_button('Im Modell: Umspannwerk zeigen', None, 'substation')),
    ('Warum nicht noch höher?',
     '<p>Je höher die Spannung, desto größer müssen die Abstände zwischen den Leitern, zum Mast und zum Boden sein, sonst springen Funken über. Isolatoren werden länger, Masten höher und teurer. Die üblichen 380 kV sind ein Kompromiss aus Verlusten, Kosten und Platz. Für sehr weite Strecken nutzt man inzwischen auch Hochspannungs-Gleichstrom.</p>',
     ''),
],
'lab_title':'Schick Energie durch die Landschaft','lab_intro':'Halte die Sendeleistung fest und verändere die Spannung. Beobachte den Strom, die Erwärmung der Leitung und was im Dorf ankommt.',
'controls':control('voltage','Sendespannung',10,400,10,100,' kV')+control('power','Sendeleistung',1,20,1,10,' MW')+control('resistance','Leitungswiderstand gesamt',1,20,1,10,' Ω'),
'presets':preset('100 kV',{'voltage':100,'power':10,'resistance':10})+preset('Doppelte Spannung',{'voltage':200,'power':10,'resistance':10}),
'tasks':[
    ('Verdopple die Spannung von 100 auf 200 kV. Um welchen Faktor sinkt der Verlust?', {'voltage': 200, 'power': 10, 'resistance': 10}, 'Der Strom halbiert sich, der Verlust sinkt auf ein Viertel: von 100 kW auf 25 kW.'),
    ('Stelle 20 kV ein. Was passiert?', {'voltage': 20, 'power': 10, 'resistance': 10}, 'Der Strom wäre 500 A, der Verlust 2,5 MW, also ein Viertel der gesamten Leistung. Bei noch kleinerer Spannung wäre der Transport unmöglich.'),
    ('Halbiere stattdessen den Widerstand (dickere Seile) bei 100 kV.', {'voltage': 100, 'power': 10, 'resistance': 5}, 'Der Verlust halbiert sich nur. Eine doppelte Spannung bringt mehr und spart Material.'),
],
'formula':'''<div class="em-formula">I = P<sub>send</sub> / U<sub>send</sub><br>P<sub>V</sub> = I² · R = (P<sub>send</sub> / U<sub>send</sub>)² · R<br>P<sub>an</sub> = P<sub>send</sub> − P<sub>V</sub></div>
<dl class="em-vars"><div><dt>P<sub>send</sub></dt><dd>eingespeiste Leistung in W (1 MW = 1 000 000 W)</dd></div><div><dt>U<sub>send</sub></dt><dd>Sendespannung in V (1 kV = 1000 V)</dd></div><div><dt>R</dt><dd>Widerstand von Hin- und Rückleiter zusammen in Ω</dd></div><div><dt>P<sub>V</sub>, P<sub>an</sub></dt><dd>Verlustleistung und ankommende Leistung</dd></div></dl>
<p>Vorsicht Falle: Rechne den Verlust nicht mit U²/R aus der Sendespannung. U²/R gilt nur mit der Spannung, die <em>an der Leitung selbst</em> abfällt, und die ist viel kleiner als die Sendespannung.</p>''',
'example':('10 Megawatt auf die Reise schicken','<p>P = 10 MW, U = 100 kV, R = 10 Ω.</p><div class="em-formula">I = 10 000 000 W / 100 000 V = 100 A<br>P<sub>V</sub> = (100 A)² · 10 Ω = 100 000 W = 0,1 MW<br>P<sub>an</sub> = 9,9 MW (1 % Verlust)</div><p>Bei 200 kV: I = 50 A, P<sub>V</sub> = 25 kW (0,25 %). Bei 400 kV: I = 25 A, P<sub>V</sub> = 6,25 kW (0,06 %).</p>'),
'myths':[
    ('„Hohe Spannung bedeutet immer großen Strom.“','Das gilt nur bei festem Widerstand. Bei fester Leistung bedeutet höhere Spannung kleineren Strom.'),
    ('„Der Verlust ist U²/R mit der Sendespannung.“','Dann käme mehr Verlust heraus als eingespeist wird. Entscheidend ist der Strom: P<sub>V</sub> = I² · R.'),
    ('„Bei Hochspannung fließt mehr Energie.“','Die Energie pro Sekunde ist die Leistung. Sie kann bei jeder Spannung gleich sein; nur der Anteil, der unterwegs verloren geht, ändert sich.'),
],
'model_note':'Vereinfachter Stromkreis mit Hin- und Rückleiter, R zählt beide zusammen. Keine Rechnung für ein reales Drehstromnetz: Transformatorverluste, Blindleistung und Temperaturänderung fehlen. Ist I²R größer als die Sendeleistung, ist der Betriebspunkt unmöglich und wird markiert. Leuchtende Pakete stehen symbolisch für Energie, nicht für Elektronen. Abstand von echten Leitungen halten!',
'svg':LINES_SVG,'caption':'Ein einfacher geschlossener Stromkreis. Echte Netze nutzen Drehstrom oder Hochspannungs-Gleichstromübertragung; das I²R-Prinzip gilt dort genauso.',
'exercises':[
    ('Leitungsstrom','6 MW werden bei 200 kV eingespeist. Wie groß ist der Strom?','I = 6 000 000 W / 200 000 V = <strong>30 A</strong>.'),
    ('Wärmeverluste','Durch Hin- und Rückleiter fließen 50 A, ihr Widerstand beträgt 8 Ω. Wie groß ist die Verlustleistung?','P<sub>V</sub> = 50² · 8 W = 20 000 W = <strong>20 kW</strong>.'),
    ('Spannung verdoppeln','Bei fester Sendeleistung gehen 80 kW verloren. Die Spannung wird verdoppelt. Wie groß ist der neue Verlust?','Strom halb, I² ein Viertel: 80 kW / 4 = <strong>20 kW</strong>.'),
],
'questions':[
    ('Warum transportiert man große Leistungen mit hoher Spannung?','Bei gleicher Leistung ist der Strom kleiner. Ein kleiner Strom erwärmt die Leitungen viel weniger, weil der Verlust mit I² wächst.'),
    ('Du verdoppelst nur die Spannung. Was passiert mit Strom und Wärmeverlust?','Der Strom halbiert sich, der Verlust sinkt auf ein Viertel.'),
    ('Wo bleibt die Energie, die unterwegs verloren geht?','Sie wird als Wärme an die Umgebung abgegeben. Sie ist nicht weg, aber für den Verbraucher nicht mehr nutzbar.'),
    ('Wozu stehen Transformatoren vor und nach der Fernleitung?','Vorher erhöhen sie die Spannung für eine verlustarme Übertragung. Danach senken sie sie wieder auf ungefährliche, nutzbare Werte.'),
    ('Warum baut man nicht mit beliebig hoher Spannung?','Die Isolation wird aufwendiger, Abstände, Masten und Isolatoren werden größer und teurer. Irgendwann überwiegen diese Kosten die Einsparung.'),
],
'summary':['In Leitungen geht die Leistung P<sub>V</sub> = I² · R als Wärme verloren.','Bei gleicher Leistung bedeutet höhere Spannung kleineren Strom: I = P / U.','Halber Strom ergibt ein Viertel der Verluste. Deshalb lohnt sich Hochspannung so sehr.','Transformatoren erhöhen die Spannung vor der Fernleitung und senken sie danach wieder.'],
'sources':[('LEIFIphysik: Energieübertragung durch Hochspannung','https://www.leifiphysik.de/elektrizitaetslehre/induktion-generator-und-transformator/grundwissen/energieuebertragung-durch-hochspannung'),('OpenStax: Transformers','https://openstax.org/books/college-physics-2e/pages/23-7-transformers')],
},
]


HERO_IMAGES = {'generator': 'generator-v3', 'induktion': 'induktion-v3', 'magnetfeld-eisenkern': 'eisenkern-v3', 'transformator': 'transformator-v3', 'hochspannungsleitungen': 'hochspannung-v3'}
HERO_ALT = {
    'generator': 'Handkurbel-Generator: Eine Kupferspule dreht sich zwischen zwei Magnetpolen.',
    'induktion': 'Eine Hand schiebt einen Stabmagneten in eine Spule, das Messgerät schlägt aus.',
    'magnetfeld-eisenkern': 'Ein Elektromagnet mit Eisenkern hält eine Kette aus Büroklammern.',
    'transformator': 'Schultransformator mit geschlossenem Eisenkern, zwei Spulen und einer leuchtenden Lampe.',
    'hochspannungsleitungen': 'Miniaturlandschaft mit Hochspannungsmasten zwischen Umspannwerk und Dorf.',
}


def hero_figure(slug):
    name = HERO_IMAGES[slug]
    if not (SITE / 'assets' / 'images' / f'{name}.webp').exists():
        return ''
    return f'<figure class="em-hero-figure"><img src="/assets/images/{name}.webp" alt="{escape(HERO_ALT[slug])}" width="1536" height="1024" loading="eager" fetchpriority="high" decoding="async"></figure>'


def build_lesson(lesson):
    slug = lesson['slug']
    steps = ''.join(f'''<li class="em-step"><div class="em-step-num" aria-hidden="true">{i}</div><div class="em-step-body"><h3>{title}</h3>{text}{f'<p class="em-step-actions">{button}</p>' if button else ''}</div></li>''' for i, (title, text, button) in enumerate(lesson['steps'], 1))
    tasks = ''.join(f'''<li><p>{question}</p><div class="em-task-row">{step_button('Einstellen', values)}<details><summary>Was du beobachten solltest</summary><p>{answer}</p></details></div></li>''' for question, values, answer in lesson['tasks'])
    myths = ''.join(f'<article class="em-myth"><p class="em-myth-wrong"><span aria-hidden="true">✗</span> {wrong}</p><p class="em-myth-right"><span aria-hidden="true">✓</span> {right}</p></article>' for wrong, right in lesson['myths'])
    questions = ''.join(f'<article class="em-card em-theory-question"><p class="eyebrow">Denkfrage {i}</p><h3>{q}</h3><details><summary>Antwort ansehen</summary><p>{a}</p></details></article>' for i, (q, a) in enumerate(lesson['questions'], 1))
    exercises = ''.join(f'<article class="em-card em-exercise"><p class="eyebrow">Rechenaufgabe {i}</p><h3>{t}</h3><p>{q}</p><details><summary>Lösungsweg ansehen</summary><p>{a}</p></details></article>' for i, (t, q, a) in enumerate(lesson['exercises'], 1))
    summary = ''.join(f'<li>{item}</li>' for item in lesson['summary'])
    example_title, example_body = lesson['example']
    related = '<a href="/physik/spule-elektromagnet/">Spule & Elektromagnet</a>' + ''.join(f'<a href="/physik/{other["slug"]}/">{other["title"]}</a>' for other in LESSONS if other['slug'] != slug)
    sources = ''.join(f'<li><a href="{url}">{title}</a></li>' for title, url in lesson['sources'])
    toc = '<nav class="em-toc" aria-label="Inhalt dieses Kapitels"><a href="#erklaerung">Erklärung</a><a href="#experiment">3D-Labor</a><a href="#formel">Formel</a><a href="#denkfehler">Denkfehler</a><a href="#selbsttest">Teste dich</a><a href="#merke">Merke</a></nav>'
    body = f'''<main class="wrap em-page" id="main" data-experiment="{slug}">
<nav class="em-breadcrumb" aria-label="Brotkrumennavigation"><a href="/">school</a><span aria-hidden="true">/</span><a href="/#physik">Physik</a><span aria-hidden="true">/</span><span>{lesson['title']}</span></nav>
<header class="em-hero lesson-hero"><div class="em-hero-text"><p class="eyebrow">Physik · Elektromagnetismus · Klasse 9/10</p><h1>{lesson['headline']}</h1><p class="lead">{lesson['intro']}</p><div class="lesson-tags"><span>{len(lesson['steps'])} Schritte erklärt</span><span>Interaktives 3D-Modell</span><span>Selbsttest</span><span>Etwa {lesson['time']} Minuten</span></div><div class="em-hero-actions"><a class="button" href="#erklaerung">Erklärung starten <span aria-hidden="true">↓</span></a><a class="text-link" href="#experiment">Direkt zum 3D-Labor</a></div></div>{hero_figure(slug)}</header>
{toc}
<section class="em-section em-core" aria-labelledby="core-title"><p class="eyebrow">Darum geht’s</p><h2 id="core-title">{lesson['question']}</h2><div class="em-core-box"><p class="em-core-label">Kurz gesagt</p><p>{lesson['core']}</p></div>{lesson['everyday']}</section>
<section class="em-section em-explain" id="erklaerung" aria-labelledby="explain-title"><p class="eyebrow">Schritt für Schritt erklärt</p><h2 id="explain-title">So funktioniert es</h2><p class="em-explain-hint">Jeder Schritt hat einen Knopf, der das 3D-Modell passend einstellt.</p><ol class="em-steps">{steps}</ol></section>
<section class="em-lab" id="experiment" aria-labelledby="lab-title"><div class="em-lab-heading"><div><p class="eyebrow">Dein 3D-Labor</p><h2 id="lab-title">{lesson['lab_title']}</h2></div><p>{lesson['lab_intro']}</p></div><div class="em-lab-body"><div class="em-viewport" id="em-viewport"><p class="em-loading">3D-Modell wird geladen …</p></div><form class="em-controls" id="em-controls" aria-label="Experiment einstellen">{lesson['controls']}<div class="em-presets">{lesson['presets']}</div></form></div><div class="em-toolbar"><button type="button" id="em-pause">Animation pausieren</button><button type="button" id="em-step">Einzelschritt</button><button type="button" id="em-reset">Zurücksetzen</button><button type="button" id="em-view">Ansicht zurücksetzen</button></div><div id="em-metrics" class="em-metrics"></div><p id="em-note" class="em-note" aria-live="polite"></p><div class="em-tasks"><h3>Beobachtungsaufträge</h3><ol>{tasks}</ol></div><details class="em-model-note"><summary>Was das Modell vereinfacht</summary><p>{lesson['model_note']}</p></details></section>
<noscript><p class="em-callout">Für das 3D-Labor brauchst du JavaScript. Alle Erklärungen, das Schaubild und die aufklappbaren Lösungen funktionieren auch ohne JavaScript.</p></noscript>
<details class="em-static" id="em-static"><summary>Prinzip als Schaubild ansehen</summary><figure>{lesson['svg']}<figcaption>{lesson['caption']}</figcaption></figure></details>
<section class="em-section em-formula-section" id="formel" aria-labelledby="formula-title"><p class="eyebrow">Mit Zahlen beschreiben</p><h2 id="formula-title">Die Formel dahinter</h2>{lesson['formula']}<article class="em-card em-example"><p class="eyebrow">Rechenbeispiel</p><h3>{example_title}</h3>{example_body}</article></section>
<section class="em-section" id="denkfehler" aria-labelledby="myth-title"><p class="eyebrow">Typische Denkfehler</p><h2 id="myth-title">Was oft falsch verstanden wird</h2><div class="em-myths">{myths}</div></section>
<section class="em-section em-selftest" id="selbsttest" aria-labelledby="test-title"><p class="eyebrow">Erst überlegen, dann aufklappen</p><h2 id="test-title">Teste dich</h2><p>Beantworte jede Frage zuerst in eigenen Worten oder rechne auf Papier. Klappe danach die Lösung auf und vergleiche.</p><h3 class="em-subhead">Verständnisfragen</h3><div class="em-grid">{questions}</div><h3 class="em-subhead">Rechenaufgaben</h3><div class="em-grid em-exercises">{exercises}</div></section>
<section class="em-section em-summary" id="merke" aria-labelledby="summary-title"><p class="eyebrow">Das nimmst du mit</p><h2 id="summary-title">Merke</h2><ul>{summary}</ul></section>
<nav class="em-related" aria-label="Weitere Kapitel zu Elektromagnetismus"><p class="eyebrow">Weiterlernen</p><h2>Die Themen gehören zusammen.</h2><div>{related}</div></nav>
<aside class="sources"><p>Fachliche Grundlagen und weiterführende Erklärungen. Texte, Rechenbeispiele und Modelle dieses Kapitels wurden für school erstellt.</p><ul>{sources}</ul></aside>
<div class="section-end"><a class="button light" href="/#physik">Zur Physikübersicht</a><button type="button" class="print-button" id="em-print">Kapitel drucken</button></div>
</main>'''
    html = page(f"{lesson['title']} · Physik · school", body, f'<script type="module" src="/assets/electromagnetism.js?v={VERSION}"></script>')
    html = html.replace('</head>', f'<link rel="stylesheet" href="/assets/electromagnetism.css?v={VERSION}"></head>')
    html = html.replace('Visuelle Lerninhalte für Mathematik, Physik und Deutsch. Mit interaktiven Erklärungen, Übungen und Unterrichtsmaterial.', escape(re_strip(lesson['intro']), quote=True))
    destination = SITE / 'physik' / slug
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'index.html').write_text(html, encoding='utf-8')


def re_strip(text):
    import re
    return re.sub(r'<[^>]+>', '', text)


if __name__ == '__main__':
    for lesson in LESSONS:
        build_lesson(lesson)
    print(f'Built {len(LESSONS)} electromagnetism chapters: explanation steps, 3D lab, formula, misconceptions, self-test and summary.')
