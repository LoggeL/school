"""Five qualitative self-test questions with answers revealed individually."""
from html import escape

questions = [
    ('Windungszahl vergleichen', 'Zwei Spulen sind gleich lang und haben denselben Durchmesser. Spule A besitzt 100 Windungen, Spule B 200. Durch beide fließt dieselbe Stromstärke. Welche Spule erzeugt das stärkere Magnetfeld? Erkläre, warum.', 'Spule B erzeugt das stärkere Magnetfeld.', 'Die magnetischen Wirkungen der einzelnen Windungen überlagern und verstärken sich. Bei gleicher Stromstärke und gleicher Spulenlänge verstärken mehr Windungen das Feld.'),
    ('Batterieanschlüsse vertauschen', 'Ein Schüler behauptet: "Wenn ich die Batterieanschlüsse einer Spule vertausche, wird ihr Magnetfeld schwächer." Beurteile die Aussage. Die Stromstärke bleibt beim Umpolen gleich groß.', 'Die Aussage ist falsch: Die Stärke des Magnetfeldes bleibt gleich; Nord- und Südpol vertauschen sich.', 'Beim Umpolen ändert sich die Stromrichtung und damit die Feldrichtung. Bei gleich großer Stromstärke wird das Feld dadurch nicht schwächer.'),
    ('Eisenkern durch Holz ersetzen', 'Der Eisenkern einer eingeschalteten Spule wird durch einen gleich großen Holzkern ersetzt. Beschreibe und erkläre, wie sich die magnetische Wirkung verändert.', 'Die magnetische Wirkung wird schwächer.', 'Eisen wird selbst magnetisiert und verstärkt das Spulenfeld. Holz bewirkt diese Verstärkung nicht.'),
    ('Magnetisch trotz ausgeschaltetem Strom?', 'Nach dem Ausschalten einer Spule zieht ihr Eisenkern noch einige Büroklammern an. Eine Schülerin folgert: "Dann muss noch Strom fließen." Erkläre, warum ihre Schlussfolgerung nicht zwingend richtig ist.', 'Die Anziehung beweist nicht, dass noch Strom fließt.', 'Der Eisenkern kann eine Restmagnetisierung behalten. Dafür muss kein Strom mehr durch die Spule fließen.'),
    ('Alle Metalle am Schrottkran?', 'Ein Schrottkran hebt Eisenteile zuverlässig an, Aluminiumteile dagegen praktisch nicht. Ein Schüler schlägt vor: "Wir müssen nur die Stromstärke etwas erhöhen, dann zieht er alle Metalle an." Beurteile seinen Vorschlag.', 'Der Vorschlag funktioniert so nicht: Etwas mehr Strom lässt den Kran nicht alle Metalle wie Eisen anheben.', 'Eisen ist ferromagnetisch. Aluminium ist nicht ferromagnetisch. Eine etwas höhere Stromstärke macht aus Aluminium keinen ferromagnetischen Stoff.'),
]

cards = []
for i, (title, prompt, result, reason) in enumerate(questions, 1):
    nuance = '<p class="small">Aluminium hat zwar schwache magnetische Eigenschaften, wird vom ruhenden Schrottkran aber nicht wie Eisen angehoben.</p>' if i == 5 else ''
    cards.append(f'''<article class="panel worksheet-question" data-worksheet-question="{i}">
<span class="section-number">Frage {i:02}</span><h3>{escape(title)}</h3><p>{escape(prompt)}</p>
<details class="solution" data-worksheet-solution="{i}"><summary>Antwort ansehen</summary>
<div class="worksheet-answer"><p><strong>{escape(result)}</strong></p><p>{escape(reason)}</p>{nuance}</div>
</details></article>''')

worksheet_html = f'''<section class="lesson-section" id="hausuebung" aria-labelledby="worksheet-heading">
<span class="section-number">Selbsttest · Ohne Rechnen</span><h2 id="worksheet-heading">Erst überlegen. Dann nachsehen.</h2>
<p class="section-intro">Erkläre dir die Antwort zuerst in eigenen Worten. Öffne danach die Lösung direkt unter der Frage und vergleiche deine Begründung.</p>
<div class="exercise-grid">{''.join(cards)}</div>
</section>'''
