# Arhitectura și scalarea la nivel național

## Componente

```
Elev (telefon / calculator) ─┐                      ┌─ PostgreSQL (date)
Profesor (calculator)  ──────┼─► Next.js (server) ──┼─ Stocare imagini (disc → S3 în producție)
Aplicația mobilă (faza 2) ───┘   pagini + API        ├─ Claude API (analiza eseurilor, opțional)
                                                     └─ MPass / AGE (autentificare SAML 2.0)
```

- **Next.js 16 (React 19, TypeScript)** — pagini randate pe server, acțiuni de server pentru editor, rute API pentru examen.
- **PostgreSQL + Drizzle ORM** — schema în `apps/web/src/lib/db/schema.ts`, migrațiile în `apps/web/drizzle/`.
- **Motion + Tailwind CSS 4** — animațiile și identitatea vizuală (motive de cusătură, culori inspirate din broderii).

## Modelul de date

| Tabel | Rol |
|---|---|
| `schools` | Instituțiile; aici se leagă planul de abonament (`free` / `school` / `district`). |
| `users` | Elevi, profesori, administratori. Pentru MPass păstrăm doar o amprentă HMAC, **nu IDNP-ul**. |
| `sessions` | Sesiuni; în bază ajunge doar SHA-256 al tokenului din cookie. |
| `tests` | Testul, limba lui, codul de acces și toate setările (notare, securitate, capcana AI) ca JSON validat cu Zod. |
| `questions` | Întrebările; răspunsurile corecte stau aici și **nu se trimit niciodată elevului**. |
| `attempts` | Încercarea unui elev: ordinea amestecată, răspunsurile, telemetria scrisului, notele, raportul AI. O singură încercare per elev și test (index unic). |
| `attempt_events` | Jurnalul: ieșiri din test, încercări de copiere/captură, întoarceri. |
| `uploads` | Imaginile din teste (format verificat după primii octeți; fără SVG/HTML). |

## Fluxul unui test

1. Profesorul editează (salvare automată, pe rând, fără suprascrieri), apoi publică → cod de 6 caractere + QR.
2. Elevul intră pe `/t/COD`, vede regulile, începe → se creează încercarea (ordine amestecată, cuvânt-capcană, termen limită).
3. Pagina de examen salvează automat la fiecare modificare și trimite un „semn de viață” la 15 secunde
   (panoul profesorului arată cine e online). Răspunsurile se păstrează și local, dacă internetul cade.
4. Ieșirile se raportează pe server; serverul numără (cu deduplicare), aplică regula profesorului și poate preda automat.
5. La predare: notare automată în tranzacție (`SELECT … FOR UPDATE`, idempotent), semnalele AI, apoi analiza Claude în fundal.
6. Serverul aplică termenul limită (cu toleranță de 45 s): lucrările nepredate sunt finalizate automat.

## Securitate

- Parole cu **Argon2id** (în afara firului principal), sesiuni de 30 de zile în cookie `httpOnly`, `SameSite=Lax`.
- Limitarea încercărilor de autentificare (per IP și per e-mail).
- Toate datele primite sunt validate (Zod / igienizare per tip de întrebare); limite de mărime pentru texte și evenimente.
- Antete de securitate (`nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS și `X-Frame-Options` în producție).
- Fiecare rută verifică proprietarul: profesorul vede doar testele lui, elevul doar încercările lui.

## Scalarea pentru toată țara

Profilul de trafic: vârfuri scurte și mari (mii de clase care încep testul la aceeași oră), mult mai multe scrieri mici
(salvări) decât citiri grele.

| Etapă | Ce facem |
|---|---|
| Acum | O instanță Next.js + PostgreSQL. Suficient pentru pilot (câteva școli). |
| Mii de elevi simultan | 2–4 instanțe Next.js **fără stare** în spatele unui load balancer; **PgBouncer** (`DATABASE_PGBOUNCER=true`); imaginile în **S3/MinIO** + CDN. |
| Zeci de mii simultan | **Redis** pentru limitarea cererilor, cache-ul întrebărilor și al sesiunilor (azi în memoria fiecărei instanțe); analiza AI într-o **coadă** (BullMQ) în loc de `after()`; replici de citire pentru rapoarte; `attempt_events` partiționat pe lună. |
| Permanent | Teste de încărcare (k6) înainte de fiecare sesiune de evaluări mari; monitorizare (OpenTelemetry), alerte, copii de rezervă zilnice cu restaurare verificată. |

Deja optimizat în cod: întrebările unui test sunt ținute 60 s în memorie la salvări (nu se mai schimbă după ce elevii au
început), salvările sunt grupate la ~1 s, semnul de viață este la 15 s, iar evenimentele duplicate ale aceleiași ieșiri
sunt numărate o singură dată.

## Protecția datelor

Elevii sunt minori. Principii: colectăm doar ce trebuie (nume, școală, clasă, e-mail), nu stocăm IDNP-ul, nu vindem și
nu folosim datele pentru reclame. Înainte de lansarea publică: politică de confidențialitate, termeni, acorduri cu școlile
(operator / persoană împuternicită), politică de păstrare (ex. ștergerea jurnalelor detaliate după un an școlar),
consultarea CNPDCP și a unui jurist. Serverele — în UE sau în Moldova.
