# Zece — platformă de evaluare online pentru școlile din Moldova

Platformă pentru profesorii din gimnaziile, liceele și școlile din Republica Moldova: profesorul creează un test
în câteva minute, elevii intră scanând un cod QR, iar platforma veghează la corectitudine — ieșiri din test,
copiere, capturi de ecran și răspunsuri scrise cu inteligența artificială.

> „Zece” este un nume de lucru. Se schimbă dintr-un singur loc: `apps/web/src/config/site.ts`.

## Ce face acum (faza 1 — platforma web)

**Profesorul**
- creează teste cu 6 tipuri de întrebări: un răspuns corect, mai multe răspunsuri corecte, adevărat/fals,
  răspuns scurt (un cuvânt, cu toleranță la diacritice și la „ş/ș”), răspuns numeric (acceptă virgula) și răspuns deschis (eseu);
- adaugă imagini și formule matematice (`$x^2$`, butoane pentru fracții, radicali, puteri…), cu previzualizare;
- alege notarea: **notă de la 1 la 10** cu barem editabil sau **procente**; timp limită; amestecarea întrebărilor și a variantelor;
- personalizează **securitatea** fiecărui test (presetări + reguli individuale):
  elevul poate / nu poate ieși din test, câte ieșiri se tolerează, ce se întâmplă la limită (predare automată sau doar semnalare),
  ecran complet, capturi de ecran permise sau nu, copiere permisă sau nu, filigran cu numele elevului;
- folosește instrumentele de **verificare a lucrărilor scrise cu AI** (metodele sunt descrise doar pentru profesori,
  în aplicație, și pentru dezvoltatori, în `docs/DETECTARE-AI.md` — elevii nu trebuie să le cunoască);
- creează **clase** (ex. „8A · Matematică”): elevii se înregistrează direct în clasă cu un cod sau QR, testele se atribuie
  clasei, iar platforma calculează **media clasei**, media fiecărui elev și evoluția mediei de la un test la altul;
- publică testul și primește **cod QR + cod scurt**, cu „mod proiector” pentru tablă și contor live;
- vede **rezultatele în timp real**: cine lucrează, cine a ieșit din test, distribuția notelor, semnalele AI;
- corectează eseurile (cu sugestie de punctaj AI, opțional) și descarcă tabelul în **CSV pentru Excel**.

**Elevul**
- își creează cont (nume, școală, clasă), scanează codul QR sau scrie codul;
- susține testul pe telefon sau calculator: o întrebare pe ecran, cronometru, salvare automată (și fără internet, pe dispozitiv);
- își vede nota imediat (dacă profesorul permite), cu animație; nota nu apare cât timp eseurile nu sunt corectate;
- are un **cont personal** cu media generală, cea mai bună notă, evoluția notelor în timp (grafic), mediile pe discipline,
  toate notele obținute și, pentru fiecare clasă, media lui alături de media clasei.

**Limbi:** interfața în română și rusă; fiecare test are limba lui (RO sau RU), aleasă de profesor.

**Design:** motive tradiționale de cusătură (steaua în opt colțuri, pomul vieții, rombul cu coarne, spicul, altița),
culorile iei basarabene (roșu și negru pe pânză de in, cu ocru), secțiuni întunecate inspirate din covoarele basarabene.

> **Important:** documentația descrie metodele de detectare a AI. Păstrați depozitul **privat**, ca elevii să nu le găsească.

## Ce NU face încă (și de ce)

| Cerință | Starea | Ce lipsește |
|---|---|---|
| Blocarea reală a capturilor de ecran și a ieșirii din test | În browser: **detectare și raportare** | Aplicația mobilă (Android + iOS) — [docs/APLICATIA-MOBILA.md](docs/APLICATIA-MOBILA.md) |
| Autentificare prin MPass | Integrarea SAML este scrisă, dar **oprită** | Acordul și datele de integrare de la AGE (certificate, adrese) |
| Abonamente pentru școli | Modelul de date are planul școlii | Facturarea și panoul școlii (faza 4) |
| Analiza AI a eseurilor | Funcționează când există `ANTHROPIC_API_KEY` | Cheia API (fără ea rămân semnalele proprii ale platformei) |

Planul complet: [docs/FOAIE-DE-PARCURS.md](docs/FOAIE-DE-PARCURS.md). Arhitectura și scalarea la nivel național: [docs/ARHITECTURA.md](docs/ARHITECTURA.md).

## Pornire locală

Cerințe: Node.js 22+, PostgreSQL 16.

```bash
npm install
cp apps/web/.env.example apps/web/.env   # completează AUTH_SECRET cu un șir lung, aleator (și parola PostgreSQL în DATABASE_URL)
createdb -U postgres evaluari             # sau creează baza „evaluari” din pgAdmin
npm run db:migrate
npm run db:seed                           # date demo (doar pentru dezvoltare)
npm run dev                               # http://localhost:3000
```

Conturi demo (după `db:seed`), parola `Demo12345`:
- profesor: `profesor@demo.md`
- elevi: `elev1@demo.md` … `elev12@demo.md` (toți în clasa 8A, cu istoric de note din septembrie–octombrie)
- coduri de test: `GEM8AB` (română, doar pentru clasa 8A), `BTR7RU` (rusă, deschis oricui are codul)
- cod de clasă: `MAT8AB` (8A · Matematică)

## Cum testez platforma

### Pe calculator
Urmează pașii de la „Pornire locală”, apoi deschide http://localhost:3000. Pentru profesor și elev deodată, folosește
două browsere diferite sau o fereastră privată (fiecare are contul lui).

### Pe telefon (aceeași rețea Wi-Fi ca și calculatorul)
1. Află adresa calculatorului în rețea (Windows: `ipconfig`, macOS: `ipconfig getifaddr en0`), de ex. `192.168.1.20`.
2. În `apps/web/.env` pune `APP_URL=http://192.168.1.20:3000` — codurile QR vor duce la această adresă.
3. Pornește: `npm run build` și apoi `npm run start:lan`.
4. Pe telefon, scanează codul QR afișat de profesor (sau deschide `http://192.168.1.20:3000`).

### Scenariu de test (10–15 minute)
1. **Pagina principală** — comută RO / RU.
2. **Profesor** (`profesor@demo.md`): *Clase → 8A* — media clasei, mediile elevilor, graficul; *Teste → Cod QR → Arată pe tablă*.
3. **Test nou**: câteva întrebări (o formulă, o imagine, un răspuns scurt), *Securitate → Evaluare sumativă*, *Publică*.
4. **Elev** (`elev1@demo.md`, în alt browser): scrie codul, începe testul, ieși din tab (Alt+Tab) — apare avertismentul;
   predă testul și vezi nota.
5. **Profesor → Rezultate**: ieșirile din test, lucrarea elevului, corectarea manuală, exportul CSV.
6. **Verificarea AI** cu un chatbot real: `elev2@demo.md` → codul `BTR7RU` → copiază întrebarea în chatbot și lipește
   răspunsul în test → predă; profesorul vede semnalul în lucrarea elevului.
7. **Contul elevului** (`elev2@demo.md`): media, graficul notelor, clasa 8A cu media clasei.
8. **Înregistrare în clasă**: profesorul creează o clasă; deschide linkul clasei într-o fereastră privată →
   *Creează cont și intră în clasă*.

## Verificări

```bash
npm test             # teste unitare: notare, diacritice, verificarea AI, similaritate, medii și progres
npm run typecheck
npm run build
```

Test cap-coadă în browser (profesor → publicare → elev → ieșire din test → capcană AI → rezultate), cu serverul pornit:

```bash
npm i -D playwright && npx playwright install chromium
npm run db:seed && node apps/web/e2e/smoke.cjs   # pe o bază proaspăt populată
```

## Structura

```
apps/web/                 aplicația web (Next.js 16, React 19, TypeScript, Tailwind CSS 4, Motion)
  src/app/                paginile: landing, autentificare, /profesor, /elev, /t/[cod], /examen
  src/app/api/            salvare automată, evenimente de examen, predare, imagini, export, MPass
  src/lib/tests/          tipuri de întrebări, notare, presetări de securitate, logica încercărilor
  src/lib/ai/             capcana AI, telemetria scrisului, similaritate, analiza cu Claude
  src/lib/auth/           sesiuni, parole (Argon2id), MPass (SAML 2.0)
  src/lib/i18n/           dicționarele română și rusă
  drizzle/                migrațiile bazei de date (PostgreSQL)
docs/                     arhitectură, aplicația mobilă, detectarea AI, foaia de parcurs
```
