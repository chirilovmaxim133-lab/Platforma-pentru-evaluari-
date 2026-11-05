# Detectarea folosirii AI

Principiul: **niciun detector nu este infailibil**. Platforma adună mai multe semnale independente, explică fiecare
semnal și lasă decizia profesorului — de regulă printr-o scurtă întrebare orală (pe care platforma o propune).

## 1. Capcana AI (ideea profesorului)

În enunțul fiecărei întrebări se ascunde un text **de aceeași culoare cu fundalul**, minuscul, invizibil chiar și când e
selectat, ignorat de cititoarele de ecran (`aria-hidden`). Dacă elevul copiază întrebarea și o lipește într-un chatbot,
chatbotul primește și instrucțiunea ascunsă.

Pentru siguranță dublă, **la orice copiere** din test platforma adaugă instrucțiunea în textul copiat (evenimentul `copy`),
deci capcana funcționează chiar dacă elevul a selectat doar o parte din enunț.

Două moduri:
- **Automat** — fiecare elev primește un **cuvânt-capcană diferit** (ex. „clepsidră”, „astrolab”, „калейдоскоп”).
  Dacă cuvântul apare în răspuns, semnalul e foarte puternic; dacă apare cuvântul altui elev, se vede și că răspunsul a circulat.
- **Personalizat** — profesorul scrie instrucțiunea ascunsă și cuvintele pe care le caută.

Căutarea recunoaște și formele flexionate („clepsidrei”, „пеликаном”). Cuvintele sub 5 litere se caută întocmai.

Limite, spuse cinstit: capcana funcționează doar dacă **copierea este permisă** (presetarea „Capcană AI”) și dacă elevul
copiază textul. Nu prinde elevul care rescrie întrebarea de mână sau o fotografiază (textul ascuns nu se vede în poză).
Unele chatboturi pot ignora instrucțiunea. De aceea există și semnalele de mai jos.

## 2. Cum a fost scris răspunsul (telemetrie)

Pentru fiecare răspuns text, pagina de examen măsoară: caractere tastate, caractere lipite, numărul și mărimea lipirilor,
blocuri mari apărute dintr-odată (ex. sugestia de clipboard a tastaturii pe telefon), timpul activ de scriere.

Semnale:
- **Text lipit după ieșirea din test** — elevul a ieșit (alt tab / altă aplicație) și, în cel mult 2 minute de la întoarcere,
  a lipit un paragraf. Tiparul clasic „am întrebat AI-ul și am lipit”.
- **Mare parte lipită** — peste 60% din răspuns a fost lipit.
- **Viteză imposibilă** — sute de caractere tastate cu peste 12 caractere pe secundă.
- **Încercări repetate de lipire** când lipirea era oprită.

## 3. Asemănarea dintre colegi

Răspunsurile deschise ale elevilor la aceeași întrebare sunt comparate (fragmente de câte 4 cuvinte). Două lucrări aproape
identice sunt semnalate — util și când doi elevi au primit același text de la un chatbot.

## 4. Analiza AI a eseului (opțional)

Cu `ANTHROPIC_API_KEY` configurat, după predare fiecare eseu este trimis la Claude, care întoarce:
- o **probabilitate estimată** că textul a fost generat cu AI, cu motive concrete;
- o **sugestie de punctaj** după baremul profesorului (profesorul o aplică cu un clic sau o ignoră);
- o **întrebare orală de verificare** — cea mai sigură metodă: elevul care a scris singur poate explica.

Instrucțiunile modelului cer estimări calibrate și avertizează explicit asupra greșelilor frecvente ale detectoarelor
(elevi buni, vorbitori non-nativi). Textul elevului este tratat ca date, nu ca instrucțiuni.

Modelul se alege din `AI_MODEL` (implicit `claude-opus-5-5`). La scară națională costul contează: `claude-haiku-5-5`
este mult mai ieftin, iar decizia de compromis calitate/cost aparține proprietarului platformei.

## 5. Scorul combinat

Semnalele se combină ca probabilități independente (`1 − Π(1 − wᵢ)`), rezultând nivelurile „slab / mediu / puternic”.
Profesorul vede fiecare semnal cu explicația lui, nu doar un număr.

## Idei pentru etapele următoare

- **Întrebări parametrizate** — la matematică/fizică, fiecare elev primește alte numere în aceeași problemă;
  o poză de la coleg sau un răspuns copiat nu mai ajută.
- **Reluarea scrisului** — profesorul vede cum a apărut textul în timp (ca o înregistrare).
- **Comparația cu lucrările anterioare** ale aceluiași elev (stil, vocabular, lungime).
- **Mod „scriere în clasă”** — eseul se scrie doar în aplicația mobilă blocată, fără acces la alte aplicații.
