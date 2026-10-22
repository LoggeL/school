"""Qualitative grade-nine worksheet; no automatic grading of free text."""
from html import escape

questions = [
    ('Windungszahl vergleichen', 'Zwei Spulen sind gleich lang und haben denselben Durchmesser. Spule A besitzt 100 Windungen, Spule B 200. Durch beide fließt dieselbe Stromstärke. Welche Spule erzeugt das stärkere Magnetfeld? Erkläre, warum.', 'Spule B erzeugt das stärkere Magnetfeld.', 'Die magnetischen Wirkungen der einzelnen Windungen überlagern und verstärken sich. Bei gleicher Stromstärke und gleicher Spulenlänge verstärken mehr Windungen das Feld.'),
    ('Batterieanschlüsse vertauschen', 'Ein Schüler behauptet: „Wenn ich die Batterieanschlüsse einer Spule vertausche, wird ihr Magnetfeld schwächer.“ Beurteile die Aussage. Die Stromstärke bleibt beim Umpolen gleich groß.', 'Die Aussage ist falsch: Die Stärke des Magnetfeldes bleibt gleich; Nord- und Südpol vertauschen sich.', 'Beim Umpolen ändert sich die Stromrichtung und damit die Feldrichtung. Bei gleich großer Stromstärke wird das Feld dadurch nicht schwächer.'),
    ('Eisenkern durch Holz ersetzen', 'Der Eisenkern einer eingeschalteten Spule wird durch einen gleich großen Holzkern ersetzt. Beschreibe und erkläre, wie sich die magnetische Wirkung verändert.', 'Die magnetische Wirkung wird schwächer.', 'Eisen wird selbst magnetisiert und verstärkt das Spulenfeld. Holz bewirkt diese Verstärkung nicht.'),
    ('Magnetisch trotz ausgeschaltetem Strom?', 'Nach dem Ausschalten einer Spule zieht ihr Eisenkern noch einige Büroklammern an. Eine Schülerin folgert: „Dann muss noch Strom fließen.“ Erkläre, warum ihre Schlussfolgerung nicht zwingend richtig ist.', 'Die Anziehung beweist nicht, dass noch Strom fließt.', 'Der Eisenkern kann eine Restmagnetisierung behalten. Dafür muss kein Strom mehr durch die Spule fließen.'),
    ('Alle Metalle am Schrottkran?', 'Ein Schrottkran hebt Eisenteile zuverlässig an, Aluminiumteile dagegen praktisch nicht. Ein Schüler schlägt vor: „Wir müssen nur die Stromstärke etwas erhöhen, dann zieht er alle Metalle an.“ Beurteile seinen Vorschlag.', 'Der Vorschlag funktioniert so nicht: Etwas mehr Strom lässt den Kran nicht alle Metalle wie Eisen anheben.', 'Eisen ist ferromagnetisch, Aluminium nicht. Eine etwas höhere Stromstärke macht aus Aluminium keinen ferromagnetischen Stoff.'),
]

cards = []
solutions = []
for i, (title, prompt, result, reason) in enumerate(questions, 1):
    cards.append(f'''<article class="panel worksheet-question" data-worksheet-question="{i}">
<span class="section-number">Aufgabe {i} · 2 Punkte</span><h3>{escape(title)}</h3><p>{escape(prompt)}</p>
<label for="worksheet-answer-{i}">Deine Antwort in ganzen Sätzen</label>
<textarea id="worksheet-answer-{i}" rows="4" aria-describedby="worksheet-privacy"></textarea></article>''')
    solutions.append(f'''<article class="panel" data-worksheet-solution="{i}"><h4>{i}. {escape(title)}</h4>
<p><strong>Ergebnis · 1 Punkt:</strong> {escape(result)}</p><p><strong>Begründung · 1 Punkt:</strong> {escape(reason)}</p>
<label class="check-control"><input type="checkbox" data-worksheet-point> Ergebnis richtig (1 Punkt)</label>
<label class="check-control"><input type="checkbox" data-worksheet-point> Begründung richtig (1 Punkt)</label></article>''')

worksheet_html = f'''<section class="lesson-section" id="hausuebung" aria-labelledby="worksheet-heading">
<span class="section-number">06 · Begründen statt rechnen</span><h2 id="worksheet-heading">HÜ: Spule und Elektromagnet – Klasse 9</h2>
<p class="section-intro">Arbeitszeit: ca. 15 Minuten · 10 Punkte. Begründe deine Antworten in ganzen Sätzen.</p>
<p id="worksheet-privacy" class="small">Deine Antworten bleiben in diesem Browser und werden nicht gesendet oder dauerhaft gespeichert. Vergleiche sie anschließend selbst mit dem Erwartungshorizont; es gibt keine automatische Textbewertung.</p>
<div class="exercise-grid">{''.join(cards)}</div>
<details class="solution worksheet-solutions" id="worksheet-solutions"><summary>Erwartungshorizont & Selbstbewertung öffnen</summary>
<p>Je ein Punkt für Ergebnis und Begründung, also 2 Punkte pro Aufgabe. Sinngemäß richtige Formulierungen zählen ebenfalls. Setze die Häkchen nach dem Vergleich selbst.</p>
<div class="exercise-grid">{''.join(solutions)}</div>
<p class="small">Zur Einordnung: Aluminium ist nicht ferromagnetisch. Das bedeutet nicht, dass es überhaupt keine magnetischen Eigenschaften hat; die schwache Reaktion reicht beim hier betrachteten ruhenden Schrottkran nicht wie bei Eisen zum Anheben.</p>
<p class="progress-label" aria-live="polite">Selbstbewertung: <output id="worksheet-score">0</output> von 10 Punkten · nur für diesen Seitenbesuch</p>
</details></section>'''
