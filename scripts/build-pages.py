"""Build the school shell and subject-first learning catalogue."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'


def svg(body, view='0 0 400 220', label=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" aria-label="{escape(label)}">{body}</svg>'


def illustration(filename, alt, eager=False, class_name=''):
    loading = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<img class="{class_name}" src="/assets/images/{filename}" alt="{escape(alt)}" width="1536" height="1024" {loading} decoding="async">'


# Shared with the physics chapter builder. Technical directions are explained
# by its separate precise diagrams, not inferred from this editorial image.
coil = illustration('physics-coil-v2.webp', 'Räumliche Illustration einer Kupferspule mit Eisenkern.')

header = '''<a class="skip" href="#main">Zum Inhalt</a>
<header class="site-header"><div class="wrap header-inner">
<a href="/" class="brand"><span class="brand-mark">s</span>school<span><small>by logge</small></span></a>
<nav class="site-nav" aria-label="Hauptnavigation"><a href="/#faecher">Fächer entdecken</a><a href="/#unterricht">Für den Unterricht</a></nav>
</div></header>'''
footer = '''<footer class="site-footer"><div class="wrap footer-inner"><span>school.logge.top · Lernen in deinem Tempo.</span><span><a href="/">Alle Lerninhalte</a> · <a href="https://github.com/LoggeL/school">Quellcode</a></span></div></footer>'''


def page(title, body, scripts=''):
    return f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#235849"><title>{title}</title><meta name="description" content="Visuelle Lerninhalte für Mathematik, Physik und Deutsch. Mit interaktiven Erklärungen, Übungen und Unterrichtsmaterial."><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/school.css?v=20261022-visual2"></head><body>{header}{body}{footer}{scripts}</body></html>'''


subjects = [
    {'id': 'mathematik', 'name': 'Mathematik', 'number': '01', 'short': 'Zusammenhänge sehen. Lösungen finden.', 'description': 'Vom Bild einer Parabel zum eigenen Rechenweg.', 'tint': '#edeaf2', 'accent': '#75678d', 'lessons': [
        {'title': 'Quadratische Gleichungen', 'level': 'Klasse 9', 'description': 'Parabeln verstehen, Nullstellen finden und Gleichungen auf drei Wegen lösen.', 'href': '/quadratische-gleichungen/', 'meta': 'Lernpfad · Trainer · Selbsttests', 'image': 'math-studio-v2.webp', 'alt': 'Anschauliche Illustration zum Lernen quadratischer Gleichungen.'},
        {'title': '90 Minuten Nachhilfe', 'level': 'Unterricht', 'description': 'Ein vollständiger Stundenplan zu quadratischen Gleichungen, mit Aufgaben und erklärten Lösungen.', 'href': '/nachhilfe-quadratische-gleichungen/', 'meta': 'Stundenplan · Aufgaben · Lösungen', 'image': 'teaching-plan-v2.webp', 'alt': 'Illustration von Lernmaterialien für eine vorbereitete Unterrichtsstunde.'}
    ]},
    {'id': 'physik', 'name': 'Physik', 'number': '02', 'short': 'Unsichtbares sichtbar machen.', 'description': 'Beobachten, verändern und verstehen, was dahintersteckt.', 'tint': '#e5eade', 'accent': '#4d7359', 'lessons': [
        {'title': 'Spule & Elektromagnet', 'level': 'Der Einstieg', 'description': 'Wie wird aus Strom ein Magnet? Drehe die Spule, ändere die Stromrichtung und teste dein Verständnis.', 'href': '/physik/spule-elektromagnet/', 'meta': '3D-Modell · Theorie · Selbsttest', 'image': 'physics-coil-v2.webp', 'alt': 'Räumliche Illustration einer Kupferspule mit Eisenkern.'},
        {'title': 'Induktion', 'level': 'Bewegung & Spannung', 'description': 'Bewege einen Magneten auf eine Spule zu und wieder zurück. Warum schlägt das Messgerät aus, und wann bleibt es still?', 'href': '/physik/induktion/', 'meta': '3D-Experiment · Selbsttest', 'image': 'induktion.svg', 'alt': 'Ein Stabmagnet bewegt sich auf eine Kupferspule zu.'},
        {'title': 'Der Generator', 'level': 'Energie umwandeln', 'description': 'Eine Spule dreht sich zwischen zwei Magnetpolen. Schau zu, wie daraus eine Wechselspannung entsteht.', 'href': '/physik/generator/', 'meta': '3D-Experiment · Spannungskurve', 'image': 'generator.svg', 'alt': 'Generatorspule mit Drehachse zwischen Nord- und Südpol.'},
        {'title': 'Magnetfeld mit Eisenkern', 'level': 'Ins Innere schauen', 'description': 'Was verändert das Eisen in einer Spule? Entdecke die magnetischen Bereiche und kehre die Pole um.', 'href': '/physik/magnetfeld-eisenkern/', 'meta': '3D-Experiment · Magnetische Bereiche', 'image': 'magnetfeld-eisenkern.svg', 'alt': 'Eine Spule mit Eisenkern und ausgerichteten magnetischen Bereichen.'},
        {'title': 'Der Transformator', 'level': 'Spannung verändern', 'description': 'Zwei Spulen, ein gemeinsamer Kern. Experimentiere mit den Windungen und finde heraus, warum ein Trafo Wechselstrom braucht.', 'href': '/physik/transformator/', 'meta': '3D-Experiment · Selbsttest', 'image': 'transformator.svg', 'alt': 'Zwei Kupferwicklungen an einem geschlossenen Eisenkern.'},
        {'title': 'Hochspannungsleitungen', 'level': 'Energie transportieren', 'description': 'Schicke Energie über die Stromtrasse. Wie lässt sich unterwegs möglichst wenig davon als Wärme verlieren?', 'href': '/physik/hochspannungsleitungen/', 'meta': '3D-Stromtrasse · Verluste vergleichen', 'image': 'hochspannungsleitungen.svg', 'alt': 'Strommasten mit durchhängenden Leitungen zwischen Kraftwerk und Häusern.'}
    ]},
    {'id': 'deutsch', 'name': 'Deutsch', 'number': '03', 'short': 'Genau hinsehen. Klar beschreiben.', 'description': 'Wörter finden für das, was du auf einem Bild entdeckst.', 'tint': '#f0e9db', 'accent': '#947849', 'lessons': [
        {'title': 'Bilder genau beschreiben', 'level': 'Klasse 5', 'description': 'Vom ersten Blick zum geordneten Text. Mit Bildwelten, Wortschatz, Lernspielen und Arbeitsblättern für den Unterricht.', 'href': '/bildbeschreibung-klasse5/', 'meta': 'Lernspiele · Wortschatz · Arbeitsblätter', 'image': 'deutsch-story-v2.webp', 'alt': 'Eine erzählerische Bildwelt als Einstieg in die Bildbeschreibung.'}
    ]},
    {'id': 'paedagogik', 'name': 'Pädagogik', 'number': '04', 'short': 'Lernen braucht Bewegung.', 'description': 'Ideen und Hintergründe für die pädagogische Praxis.', 'tint': '#e4ebe7', 'accent': '#597c71', 'lessons': [
        {'title': 'Bewegungserziehung', 'level': 'Unterricht', 'description': 'Spiel, Bewegung und Haltung: Grundlagen, Beispiele und Impulse für die Praxis.', 'href': '/bewegungserziehung-uw1/', 'meta': 'Fachwissen · Praxisimpulse', 'image': 'movement-studio-v2.webp', 'alt': 'Illustration zu Spiel und Bewegung in der Bewegungserziehung.'}
    ]},
    {'id': 'chemie', 'name': 'Chemie & Technik', 'number': '05', 'short': 'Prozesse selbst erforschen.', 'description': 'Ausprobieren, wie sich Stoffgemische trennen lassen.', 'tint': '#e4ecee', 'accent': '#64818a', 'lessons': [
        {'title': 'Stoffgemische trennen', 'level': 'Vertiefung', 'description': 'Eine Trennkolonne ausprobieren und beobachten, wie sich das Gemisch aufteilt. Für alle, die etwas tiefer einsteigen möchten.', 'href': '/rectify-trennkolonne/', 'meta': 'Simulation · Szenarien', 'image': 'chemistry-lab-v2.webp', 'alt': 'Illustration eines chemischen Versuchsaufbaus zur Stofftrennung.'}
    ]}
]

subject_links = ''
subject_sections = ''
for subject in subjects:
    count = len(subject['lessons'])
    unit = 'Lerneinheit' if count == 1 else 'Lerneinheiten'
    subject_links += f'''<a class="subject-jump" href="#{subject['id']}" style="--subject-accent:{subject['accent']}"><span class="subject-jump-number">{subject['number']}</span><span><strong>{subject['name']}</strong><small>{count} {unit}</small></span><span class="subject-jump-arrow" aria-hidden="true">↓</span></a>'''
    cards = ''
    for lesson in subject['lessons']:
        art = illustration(lesson['image'], lesson['alt'])
        cards += f'''<a class="card" data-subject="{subject['id']}" href="{lesson['href']}" style="--tint:{subject['tint']};--accent:{subject['accent']}">
<div class="card-art">{art}</div><div class="card-content"><div class="card-meta"><span>{lesson['level']}</span></div><h3>{lesson['title']}</h3><p>{lesson['description']}</p><div class="card-footer"><span>{lesson['meta']}</span><span class="card-arrow" aria-hidden="true">↗</span></div></div></a>'''
    subject_sections += f'''<section class="subject-section" id="{subject['id']}" aria-labelledby="heading-{subject['id']}" style="--subject-accent:{subject['accent']}">
<div class="subject-heading"><div class="subject-title"><span class="subject-number">{subject['number']}</span><div><h2 id="heading-{subject['id']}">{subject['name']}</h2><p>{subject['description']}</p></div></div><span class="subject-count">{count} {unit}</span></div><div class="subject-lessons {'subject-lessons-pair' if count > 1 else 'subject-lessons-single'}">{cards}</div></section>'''

hero_image = illustration('physics-coil-v2.webp', 'Eine Kupferspule mit Eisenkern, räumlich und mit feinen Materialdetails dargestellt.', eager=True)
home = f'''<main id="main" class="home"><div class="wrap">
<section class="hero home-hero"><div class="hero-copy"><p class="eyebrow">Dein Lernort für Schule & Unterricht</p><h1>Manches versteht<br>man besser<br><em>mit einem Bild.</em></h1><p class="lead">Entdecke Zusammenhänge in Mathe, Physik und mehr. Schau genau hin, probiere etwas aus und finde deinen eigenen Lösungsweg.</p><div class="hero-actions"><a class="button" href="#faecher">Fächer entdecken <span aria-hidden="true">↓</span></a><a class="text-link" href="/physik/spule-elektromagnet/">Neu: Physik in 3D</a></div><p class="hero-note">Ohne Anmeldung. In deinem Tempo.</p></div>
<a class="hero-feature" href="/physik/spule-elektromagnet/"><div class="hero-image"><span class="hero-image-label">Physik zum Ausprobieren</span>{hero_image}</div><div class="hero-feature-caption"><div><span class="eyebrow">Spule & Elektromagnet</span><h2>Wie wird aus Strom ein Magnetfeld?</h2></div><span class="feature-arrow" aria-hidden="true">↗</span></div></a></section>
<section class="subject-directory" id="faecher" aria-labelledby="directory-heading"><div class="section-heading"><div><p class="eyebrow">Die Fächer im Überblick</p><h2 id="directory-heading">Wähle dein Thema.</h2></div><p>{len(subjects)} Fächer · {sum(len(subject['lessons']) for subject in subjects)} Lerneinheiten</p></div><nav class="subject-index" aria-label="Zu den Fächern">{subject_links}</nav></section>
<div class="subject-catalogue">{subject_sections}</div>
<section class="teaching-section" id="unterricht" aria-labelledby="teaching-heading"><div class="teaching-intro"><p class="eyebrow">Für den Unterricht</p><h2 id="teaching-heading">Gut vorbereitet<br>in die nächste Stunde.</h2><p>Stundenpläne, Arbeitsblätter und Praxisimpulse findest du direkt bei den passenden Fächern.</p></div><div class="teaching-links"><a href="/nachhilfe-quadratische-gleichungen/"><span><small>Mathematik</small><strong>90 Minuten Nachhilfe</strong></span><span aria-hidden="true">↗</span></a><a href="/bildbeschreibung-klasse5/"><span><small>Deutsch · Klasse 5</small><strong>Bildbeschreibung unterrichten</strong></span><span aria-hidden="true">↗</span></a><a href="/bewegungserziehung-uw1/"><span><small>Pädagogik</small><strong>Bewegung in der Praxis</strong></span><span aria-hidden="true">↗</span></a></div></section>
</div></main>'''
(SITE/'index.html').write_text(page('school · Deine Fächer. Anschaulich erklärt.', home, '<script src="/assets/home.js?v=20261022-visual2" defer></script>').replace('</head>', '<link rel="stylesheet" href="/assets/electromagnetism.css?v=20261026-1"></head>'))
(SITE/'assets/favicon.svg').write_text(svg('<rect width="64" height="64" rx="14" fill="#235849"/><text x="22" y="46" fill="#fff" font-size="50" font-family="Georgia" font-style="italic">s</text>', '0 0 64 64', 'school'))
(SITE/'404.html').write_text(page('Seite nicht gefunden · school', '<main id="main" class="wrap lesson-hero"><p class="eyebrow">404</p><h1>Hier fehlt eine Seite.</h1><p class="lead">Über die Fächerübersicht findest du alle Lerninhalte.</p><a class="button" href="/#faecher">Zur Fächerübersicht</a></main>'))

if __name__ == '__main__':
    print('Built subject-first homepage and 404 page.')
