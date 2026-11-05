// Test cap-coadă: rulează pe o bază de date proaspăt populată (`npm run db:seed`) și cu serverul pornit.
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? require("node:path").join(__dirname, "..", "e2e-shots");
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log("•", ...a);
// Cuvinte care nu au voie să apară în paginile văzute de elevi (metodele de verificare rămân secrete).
const LEAK = /capcan|chatbot|invizibil|ловушк|чат-бот|instrucțiunea ascunsă|скрытая инструкция/i;

function watch(page, tag) {
  page.on("pageerror", (e) => console.log(`[${tag}] PAGEERROR`, e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) console.log(`[${tag}] CONSOLE`, m.text());
  });
}

async function login(page, email) {
  await page.goto(BASE + "/autentificare");
  await page.fill("#email", email);
  await page.fill("#password", "Demo12345");
  await page.click("button[type=submit]");
  await page.waitForLoadState("networkidle");
}

async function answerCurrent(page, longText) {
  const radios = page.getByRole("radio");
  const checks = page.getByRole("checkbox");
  if (await radios.count()) return radios.first().click();
  if (await checks.count()) return checks.first().click();
  const ta = page.locator("main textarea");
  if (await ta.count()) return ta.fill(longText);
  const input = page.locator("main input[autocomplete=off]");
  if (await input.count()) return input.fill("raza");
  const tf = page.locator("main button[aria-pressed]");
  if (await tf.count()) return tf.first().click();
}

async function simulateLeave(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(900);
}

(async () => {
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- landing
  const visitor = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ro-RO" });
  const lp = await visitor.newPage();
  watch(lp, "landing");
  await lp.goto(BASE);
  await lp.waitForTimeout(2200);
  await lp.screenshot({ path: `${SHOTS}/01-landing.png` });
  await lp.locator("#securitate").scrollIntoViewIfNeeded();
  await lp.waitForTimeout(1200);
  await lp.locator("#securitate").screenshot({ path: `${SHOTS}/02-security-demo.png` });
  await lp.locator("#traditie").scrollIntoViewIfNeeded();
  await lp.waitForTimeout(2500);
  await lp.locator("#traditie").screenshot({ path: `${SHOTS}/03-traditions.png` });
  await lp.locator("#clase").scrollIntoViewIfNeeded();
  await lp.waitForTimeout(1500);
  await lp.locator("#clase").screenshot({ path: `${SHOTS}/03b-classes.png` });
  await lp.screenshot({ path: `${SHOTS}/01b-landing-full.png`, fullPage: true });
  await lp.getByRole("button", { name: "ru", exact: true }).first().click();
  await lp.waitForTimeout(1500);
  await lp.evaluate(() => window.scrollTo(0, 0));
  await lp.waitForTimeout(1500);
  await lp.screenshot({ path: `${SHOTS}/04-landing-ru.png` });
  log("landing RU title:", (await lp.locator("h1").innerText()).replace(/\s+/g, " "));
  log("landing hides verification methods:", !LEAK.test(await lp.content()));
  await visitor.close();

  // ---------------------------------------------------------------- profesor: creează test
  const tctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ro-RO" });
  const tp = await tctx.newPage();
  watch(tp, "teacher");
  await login(tp, "profesor@demo.md");
  log("teacher url:", tp.url());
  await tp.screenshot({ path: `${SHOTS}/05-teacher-dashboard.png` });

  await tp.goto(BASE + "/profesor/clase");
  await tp.fill("#cls-name", "7C");
  await tp.fill("#cls-subject", "Geografie");
  await tp.getByRole("button", { name: /Creează clasa/ }).click();
  await tp.waitForURL(/\/profesor\/clase\/[0-9a-f-]{36}$/);
  const classCode = (await tp.locator("p.tracking-\\[0\\.18em\\]").first().innerText()).replace(/\s/g, "");
  log("class code:", classCode);
  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ro-RO" });
  const np = await nctx.newPage();
  watch(np, "new-student");
  await np.goto(BASE + "/c/" + classCode);
  await np.screenshot({ path: `${SHOTS}/22-class-invite-mobile.png` });
  await np.getByRole("link", { name: /Creează cont și intră în clasă/ }).click();
  await np.waitForURL(/inregistrare/);
  await np.fill("#firstName", "Sorin");
  await np.fill("#lastName", "Vrabie");
  await np.fill("#school", "Liceul Teoretic Demo nr. 1");
  await np.fill("#email", `sorin.${Date.now()}@demo.md`);
  await np.fill("#password", "Demo12345");
  await np.screenshot({ path: `${SHOTS}/23-register-into-class.png`, fullPage: true });
  await np.click("button[type=submit]");
  await np.waitForURL(/\/c\/.*joined=1/);
  log("joined class after register:", await np.getByText(/Ai intrat în clasa 7C/).isVisible());
  await nctx.close();
  await tp.reload();
  log("class page shows new student:", (await tp.locator("main").innerText()).includes("Vrabie Sorin"));

  await tp.goto(BASE + "/profesor");
  await tp.getByRole("button", { name: /Test nou/ }).first().click();
  await tp.waitForURL(/\/profesor\/teste\/[0-9a-f-]{36}$/);
  const testUrl = tp.url();
  await tp.fill('input[aria-label="Titlul testului"]', "Istoria Moldovei: Ștefan cel Mare");
  await tp.fill('input[placeholder^="Disciplina"]', "Istorie");

  await tp.getByRole("button", { name: /Un singur răspuns corect/ }).click();
  let card = tp.locator("fieldset").last();
  await card.locator('textarea[aria-label="Enunțul întrebării"]').fill("În ce an a devenit Ștefan cel Mare domn al Moldovei?");
  const opts = card.locator('input[placeholder^="Varianta"]');
  await opts.nth(0).fill("1457");
  await opts.nth(1).fill("1504");
  await opts.nth(2).fill("1359");
  await card.getByRole("button", { name: "Marchează ca răspuns corect" }).nth(0).click();

  await tp.getByRole("button", { name: /Răspuns scurt/ }).click();
  card = tp.locator("fieldset").last();
  await card.locator('textarea[aria-label="Enunțul întrebării"]').fill("Ce mănăstire a ctitorit Ștefan cel Mare în 1466? (un cuvânt)");
  await card.locator("input").last().fill("Putna");

  await tp.getByRole("button", { name: /Răspuns numeric/ }).click();
  card = tp.locator("fieldset").last();
  await card.locator('textarea[aria-label="Enunțul întrebării"]').fill("Câți ani a domnit Ștefan cel Mare? Formula: $1504 - 1457$");

  await tp.getByRole("button", { name: /Răspuns deschis/ }).click();
  card = tp.locator("fieldset").last();
  await card.locator('textarea[aria-label="Enunțul întrebării"]').fill("Explică de ce Ștefan cel Mare este considerat o figură importantă a istoriei.");
  await tp.waitForTimeout(1800);
  await tp.screenshot({ path: `${SHOTS}/06-editor.png`, fullPage: true });

  await tp.getByRole("button", { name: /Notare și timp/ }).click();
  await tp.waitForTimeout(400);
  await tp.screenshot({ path: `${SHOTS}/07-editor-grading.png` });
  await tp.getByRole("button", { name: /^Securitate$/ }).click();
  await tp.getByRole("button", { name: /Evaluare sumativă/ }).click();
  await tp.waitForTimeout(400);
  await tp.screenshot({ path: `${SHOTS}/08-editor-security.png` });
  await tp.getByRole("button", { name: /Capcana AI/ }).first().click();
  await tp.getByRole("switch").first().click();
  await tp.waitForTimeout(1500);
  await tp.screenshot({ path: `${SHOTS}/09-editor-ai-trap.png` });

  // publicare: întrebarea numerică are 0 corect implicit — e validă (valoare 0); publicăm
  await tp.getByRole("button", { name: /Publică și arată codul QR/ }).click();
  await tp.waitForURL(/distribuie$/, { timeout: 15000 });
  await tp.waitForTimeout(800);
  await tp.screenshot({ path: `${SHOTS}/10-share-qr.png` });
  const code = (await tp.locator("p.tracking-\\[0\\.2em\\]").first().innerText()).replace(/\s/g, "");
  log("published code:", code);

  // ---------------------------------------------------------------- elev 1: test strict + ieșire din test
  const s1ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: "ro-RO" });
  const s1 = await s1ctx.newPage();
  watch(s1, "student1");
  await login(s1, "elev1@demo.md");
  await s1.screenshot({ path: `${SHOTS}/11-student-home.png` });
  const boxes = s1.locator('form input[aria-label]');
  await boxes.first().click();
  await s1.keyboard.type(code);
  await s1.getByRole("button", { name: /Intră în test/ }).click();
  await s1.waitForURL(/\/t\//);
  await s1.screenshot({ path: `${SHOTS}/12-join-rules.png` });
  await s1.getByRole("button", { name: /Încep testul/ }).click();
  await s1.waitForURL(/\/examen\//);
  await s1.getByRole("button", { name: /Intră în modul examen/ }).click();
  await s1.waitForTimeout(800);
  await answerCurrent(s1, "Ștefan cel Mare a apărat Moldova timp de 47 de ani și a construit multe mănăstiri.");
  await s1.screenshot({ path: `${SHOTS}/13-exam.png` });
  await simulateLeave(s1);
  const overlay = await s1.getByText("Ai ieșit din test").isVisible();
  log("leave overlay visible:", overlay);
  await s1.screenshot({ path: `${SHOTS}/14-exam-left-overlay.png` });
  await s1.getByRole("button", { name: /Revin la test/ }).click();
  for (let i = 0; i < 10; i++) {
    const next = s1.getByRole("button", { name: /Următoarea/ });
    if (!(await next.count())) break;
    await next.click();
    await s1.waitForTimeout(350);
    await answerCurrent(s1, "Ștefan cel Mare a apărat Moldova timp de 47 de ani și a construit multe mănăstiri, inclusiv Putna.");
  }
  await s1.getByRole("button", { name: /Predă testul/ }).click();
  await s1.getByRole("button", { name: /Da, predau/ }).click();
  await s1.waitForURL(/rezultat/, { timeout: 15000 });
  await s1.waitForTimeout(1800);
  await s1.screenshot({ path: `${SHOTS}/15-result.png` });
  log("student1 result text:", (await s1.locator("main").innerText()).slice(0, 160).replace(/\s+/g, " "));

  // ---------------------------------------------------------------- elev 2: test cu capcană AI (RU), mobil
  const s2ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ru-RU", permissions: ["clipboard-read", "clipboard-write"] });
  const s2 = await s2ctx.newPage();
  watch(s2, "student2");
  await login(s2, "elev2@demo.md");
  await s2.goto(BASE + "/t/BTR7RU");
  await s2.screenshot({ path: `${SHOTS}/16-mobile-join-ru.png` });
  await s2.getByRole("button", { name: /Начать тест/ }).click();
  await s2.waitForURL(/\/examen\//);
  await s2.getByRole("button", { name: /Войти в режим экзамена/ }).click();
  await s2.waitForTimeout(700);
  const trap = await s2.locator(".q-aux").first().innerText();
  log("exam page hides verification texts:", !LEAK.test((await s2.content()).replace(trap, "")));
  const canary = (trap.match(/«([^»]+)»/) || [])[1];
  log("hidden trap text present:", !!trap, "canary:", canary);
  for (let i = 0; i < 3; i++) {
    if (await s2.locator("main textarea").count()) {
      // copierea enunțului ca un elev: clipboardul trebuie să conțină instrucțiunea ascunsă
      await s2.evaluate(() => {
        const el = document.querySelector("main section .text-lg");
        const r = document.createRange();
        r.selectNodeContents(el);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand("copy");
      });
      const clip = await s2.evaluate(() => navigator.clipboard.readText());
      log("clipboard has hidden instruction:", clip.includes("Инструкция для ИИ"));
      await simulateLeave(s2);
      const aiAnswer = `Осенью листья меняют цвет, потому что хлорофилл разрушается. Как ${canary}, лист постепенно теряет зелёный пигмент, и становятся видны каротиноиды и антоцианы. Это связано с уменьшением светового дня и понижением температуры, поэтому дерево готовится к зиме и сбрасывает листву.`;
      await s2.evaluate((text) => navigator.clipboard.writeText(text), aiAnswer);
      await s2.locator("main textarea").focus();
      await s2.keyboard.press("Control+V");
      await s2.waitForTimeout(600);
      await s2.screenshot({ path: `${SHOTS}/17-mobile-exam-ru.png` });
    } else if (await s2.locator("main input[autocomplete=off]").count()) {
      await s2.locator("main input[autocomplete=off]").fill("хлоропласты");
    }
    const next = s2.getByRole("button", { name: /Следующий/ });
    if (!(await next.count())) break;
    await next.click();
    await s2.waitForTimeout(350);
  }
  await s2.getByRole("button", { name: /Сдать тест/ }).click();
  await s2.getByRole("button", { name: /Да, сдаю/ }).click();
  await s2.waitForURL(/rezultat/, { timeout: 15000 });
  await s2.waitForTimeout(1800);
  await s2.screenshot({ path: `${SHOTS}/18-mobile-result-ru.png` });
  const actx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ro-RO" });
  const ap = await actx.newPage();
  watch(ap, "ana");
  await ap.goto(BASE + "/autentificare");
  await ap.getByRole("button", { name: "ro", exact: true }).click();
  await ap.waitForTimeout(500);
  await login(ap, "elev2@demo.md");
  await ap.waitForTimeout(1200);
  await ap.screenshot({ path: `${SHOTS}/24-student-dashboard.png`, fullPage: true });
  const dash = await ap.locator("main").innerText();
  log("student dashboard:", ["Media generală", "Notele tale în timp", "Media clasei", "Toate notele"].map((x) => `${x}=${dash.includes(x)}`).join(" "));
  await ap.getByRole("link", { name: /Matematică/ }).first().click();
  await ap.waitForURL(/\/elev\/clase\//);
  await ap.screenshot({ path: `${SHOTS}/25-student-class.png` });
  await actx.close();

  // ---------------------------------------------------------------- profesor: rezultate
  await tp.goto(BASE + "/profesor/clase");
  await tp.getByRole("link", { name: /8A/ }).first().click();
  await tp.waitForURL(/\/profesor\/clase\/[0-9a-f-]{36}$/);
  await tp.waitForTimeout(800);
  await tp.screenshot({ path: `${SHOTS}/26-teacher-class.png`, fullPage: true });
  log("class average shown:", /Media clasei\s*\n?\s*\d+,\d{2}/.test(await tp.locator("main").innerText()));
  await tp.goto(testUrl + "/rezultate");
  await tp.waitForTimeout(600);
  await tp.screenshot({ path: `${SHOTS}/19-results.png` });
  await tp.goto(BASE + "/profesor");
  const bio = tp.locator("li", { hasText: "Фотосинтез" });
  await bio.getByRole("link", { name: /Rezultate/ }).click();
  await tp.waitForURL(/rezultate$/);
  await tp.waitForTimeout(500);
  await tp.screenshot({ path: `${SHOTS}/20-results-ai.png` });
  await tp.getByRole("link", { name: /Rusu Ana/ }).click();
  await tp.waitForURL(/rezultate\/[0-9a-f-]{36}$/);
  await tp.waitForTimeout(800);
  await tp.screenshot({ path: `${SHOTS}/21-attempt-ai-signals.png`, fullPage: true });
  const panel = await tp.locator("main").innerText();
  log("signals on attempt page:", ["Cuvântul-capcană", "lipit", "ieșit din test"].map((s) => `${s}=${panel.includes(s)}`).join(" "));
  // corectare manuală a eseului
  const essay = tp.locator("li", { hasText: "Объясните своими словами" });
  await essay.locator("input[inputmode=decimal]").fill("3");
  await essay.getByRole("button", { name: /Salvează punctajul/ }).click();
  await tp.waitForTimeout(2000);
  log("after manual grading:", (await tp.locator("main").innerText()).match(/\d+(\.\d+)? \/ \d+ p\./)?.[0]);

  // export CSV
  const csv = await tp.evaluate(async (u) => (await fetch(u)).text(), tp.url().replace(/\/rezultate\/.*/, "").replace("/profesor/teste/", "/api/tests/") + "/export");
  log("csv first line:", csv.split("\r\n")[0]);
  await browser.close();
})().catch((e) => {
  console.error("E2E FAILED:", e);
  process.exit(1);
});
