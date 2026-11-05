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
- pornește **capcana AI**: text invizibil (de culoarea fundalului) ascuns în enunț și adăugat la orice text copiat —
  automat (un cuvânt-capcană diferit pentru fiecare elev) sau cu textul și cuvintele alese de profesor;
- publică testul și primește **cod QR + cod scurt**, cu „mod proiector” pentru tablă și contor live;
- vede **rezultatele în timp real**: cine lucrează, cine a ieșit din test, distribuția notelor, semnalele AI;
- corectează eseurile (cu sugestie de punctaj AI, opțional) și descarcă tabelul în **CSV pentru Excel**.

**Elevul**
- își creează cont (nume, școală, clasă), scanează codul QR sau scrie codul;
- susține testul pe telefon sau calculator: o întrebare pe ecran, cronometru, salvare automată (și fără internet, pe dispozitiv);
- își vede nota imediat (dacă profesorul permite), cu animație; nota nu apare cât timp eseurile nu sunt corectate.

**Limbi:** interfața în română și rusă; fiecare test are limba lui (RO sau RU), aleasă de profesor.

**Detectarea AI** — vezi [docs/DETECTARE-AI.md](docs/DETECTARE-AI.md).

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
cp apps/web/.env.example apps/web/.env   # completează AUTH_SECRET cu un șir lung, aleator
npm run db:migrate
npm run db:seed                           # date demo (doar pentru dezvoltare)
npm run dev                               # http://localhost:3000
```

Conturi demo (după `db:seed`), parola `Demo12345`:
- profesor: `profesor@demo.md`
- elevi: `elev1@demo.md`, `elev2@demo.md`, `elev3@demo.md`
- coduri de test: `GEM8AB` (română, securitate standard), `BTR7RU` (rusă, capcană AI)

## Verificări

```bash
npm test             # teste unitare: notare, diacritice, capcana AI, similaritate, semnale
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
