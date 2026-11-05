# Foaia de parcurs

## Faza 1 — Platforma web ✅ (acest depozit)

- Conturi pentru elevi și profesori, interfață în română și rusă, limba aleasă pentru fiecare test.
- Editorul de teste: 6 tipuri de întrebări, imagini, formule, barem 1–10 sau procente, timp limită, amestecare.
- Securitate personalizabilă: presetări + reguli (ieșire, ecran complet, capturi, copiere, filigran, predare automată).
- Capcana AI (automată sau personalizată), telemetria scrisului, asemănarea între colegi, analiza opțională cu Claude.
- Cod QR + mod proiector, rezultate live, corectarea eseurilor, export CSV.

## Faza 2 — Aplicația mobilă (Android + iOS)

- Blocarea reală: `FLAG_SECURE` și fixarea ecranului pe Android, modul de evaluare Apple pe iOS. Detalii: [APLICATIA-MOBILA.md](APLICATIA-MOBILA.md).
- Scanare QR în aplicație, linkuri care deschid direct aplicația.
- Setarea „doar din aplicație” pentru testele stricte (deja prevăzută pe server).
- **Necesar:** conturile Apple Developer și Google Play, cererea către Apple, telefoane de test.

## Faza 3 — Pregătirea pentru școli

- **MPass**: integrarea SAML este scrisă; se pornește după acordul cu AGE și primirea datelor de integrare.
- **Verificarea profesorilor** de către administratorul școlii (rolul „administrator de școală”).
- Importul listei de elevi pe clase; grupuri/clase la care se trimite testul.
- **Banca de întrebări** (personală și a școlii), reutilizarea și partajarea testelor între profesori.
- Importul întrebărilor dintr-un document Word/PDF.
- Întrebări parametrizate (alte numere pentru fiecare elev).

## Faza 4 — Scară națională și abonamente

- Infrastructura din [ARHITECTURA.md](ARHITECTURA.md): instanțe multiple, PgBouncer, Redis, S3, coadă pentru AI, monitorizare.
- **Abonamente pentru școli**: planul se leagă de școală (`schools.plan`); funcții avansate pentru planurile plătite
  (statistici pe școală și raion, analiza AI nelimitată, administrare centralizată, suport). Profesorii și elevii rămân gratuit.
- Panouri pentru direcțiile de învățământ (rezultate agregate, anonimizate).

## Faza 5 — Pilot și lansare

- Pilot în 2–3 școli (o clasă de gimnaziu, una de liceu, o școală cu predare în rusă), cu teste reale.
- Ajustări după feedback, teste de încărcare, audit de securitate, documente legale, apoi lansarea publică.
