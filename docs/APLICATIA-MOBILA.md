# Aplicația mobilă (faza 2): blocarea reală a testului

Un site web nu poate bloca, din motive de securitate ale browserului, capturile de ecran sau ieșirea din pagină —
poate doar să le **detecteze** (ceea ce platforma face deja). Blocarea reală o face **sistemul de operare**, la cererea
unei aplicații instalate. De aceea, pentru testele cu reguli stricte, elevii vor folosi aplicația.

## Cum funcționează pentru elev

1. Scanează codul QR de pe tablă (cu camera telefonului sau din aplicație).
2. Linkul `https://<domeniu>/t/<COD>` deschide **direct aplicația** (Android App Links / iOS Universal Links);
   dacă aplicația nu e instalată, linkul duce la Google Play / App Store.
3. Aplicația intră în modul examen; la final iese singură din el.

## Android

| Ce | Cum |
|---|---|
| Blocarea capturilor și a înregistrării ecranului | `WindowManager.LayoutParams.FLAG_SECURE` pe fereastra examenului (ecranul apare negru și în lista de aplicații recente). |
| Blocarea ieșirii din test | **Fixarea ecranului** (`Activity.startLockTask()`): elevul confirmă o dată; butoanele Acasă/Recente nu mai funcționează. |
| Dacă elevul iese totuși | Ieșirea din fixare se detectează (`ActivityManager.getLockTaskModeState`, `onPause`) → eveniment `app_background` → raport sau predare automată, după regula profesorului. |
| Ecran împărțit / ferestre plutitoare | `onMultiWindowModeChanged` → eveniment raportat; examenul se ascunde cât timp e împărțit. |
| Telefoane administrate de școală | Mod chioșc complet (aplicația ca *device owner*), fără confirmare. |

## iOS / iPadOS

| Ce | Cum |
|---|---|
| Modul de evaluare oficial Apple | **Automatic Assessment Configuration** (`AEAssessmentSession`): sistemul dezactivează schimbarea aplicațiilor, notificările, capturile de ecran și înregistrarea ecranului pe durata testului. |
| Condiție | Apple trebuie să aprobe permisiunea `com.apple.developer.automatic-assessment-configuration` (formular de cerere pentru aplicațiile educaționale de evaluare). |
| Până la aprobare | Detectare: `UIApplication.userDidTakeScreenshotNotification` (captură făcută → `screenshot_taken`), `UIScreen.isCaptured` (înregistrare), ieșirea în fundal → `app_background`. |

## Ce rămâne imposibil de blocat — și cum compensăm

Nicio aplicație nu poate opri **un alt telefon** care fotografiază ecranul. Compensăm prin: filigran cu numele elevului,
întrebări și variante amestecate pentru fiecare elev, timp limitat, capcana AI și (în viitor) întrebări parametrizate.

## Arhitectura propusă

- **React Native (Expo)** — o singură bază de cod pentru Android și iOS, cu **module native** (Expo Modules API) pentru
  `FLAG_SECURE`, `startLockTask` și `AEAssessmentSession`.
- Aceleași conturi și același server: aplicația folosește API-ul existent (`/api/attempts/:id/save`, `/events`, `/submit`).
- Serverul este deja pregătit: câmpul `client` („web” / „app”) pe fiecare încercare, evenimentele `app_background`
  și `screenshot_taken`, și setarea testului „poate fi susținut și din browser” (pentru testele doar-în-aplicație).

## Ce trebuie de la proprietarul platformei

- cont **Apple Developer Program** (99 $/an) și cererea pentru permisiunea de evaluare;
- cont **Google Play Console** (25 $, o singură dată);
- un telefon Android și un iPhone/iPad pentru testare (aplicația nu se poate testa complet într-un emulator);
- domeniul definitiv (pentru App Links / Universal Links).
