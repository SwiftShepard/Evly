import { test, expect } from "@playwright/test";

test.describe("Rapport TCO détaillé (bêta gratuite)", () => {
  test("Accès au rapport depuis le simulateur TCO", async ({ page }) => {
    // 1. Ouvrir le simulateur TCO
    await page.goto("/simulateur/");
    await page.waitForLoadState("networkidle");

    // 2. Le CTA ne propose aucun paiement
    const cta = page.locator(".tco-premium-cta");
    await expect(cta).toContainText("Gratuit pendant la bêta");
    await expect(cta).not.toContainText("€");
    await expect(page.locator('input[placeholder="4242 4242 4242 4242"]')).toHaveCount(0);

    // 3. Le lien mène directement au rapport
    await cta.locator("a").click();
    await page.waitForURL(/\/simulateur\/rapport-premium\//, { timeout: 10000 });

    // 4. Vérifier les sections du rapport
    await expect(page.locator(".premium-report-container h1")).toContainText(/Analyse complète/i);
    await expect(page.locator("text=Total Cost of Ownership (TCO)")).toBeVisible();
    await expect(page.locator("text=Autonomie Météo & Plan de Charge")).toBeVisible();
    await expect(page.locator("text=Plan d'action Borne & Aides 2026")).toBeVisible();
  });

  test("Le matcher affiche tout le podium sans paywall", async ({ page }) => {
    // 1. Ouvrir le Matcher avec des réponses pré-remplies dans l'URL
    await page.goto("/recommandation/?usage=mixed&mileage=15000&charging=home&role=primary&household=family&trunkNeed=any&bodyType=any&chargingSpeed=any&budgetType=buy&budgetMax=40000");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Votre sélection sur-mesure.")).toBeVisible({ timeout: 7000 });

    // 2. Podium complet, aucun blocage ni paiement
    await expect(page.locator('span:has-text("#1")')).toBeVisible();
    await expect(page.locator('span:has-text("#2")')).toBeVisible();
    await expect(page.locator("text=Podium Bloqué")).toHaveCount(0);
    await expect(page.locator('button:has-text("Autres alternatives compatibles")')).not.toContainText("🔒");

    // 3. Le lien vers le rapport détaillé fonctionne
    const reportLink = page.locator('a:has-text("Rapport TCO détaillé")').first();
    await expect(reportLink).toBeVisible();
    await reportLink.click();
    await page.waitForURL(/\/simulateur\/rapport-premium\//, { timeout: 10000 });
    await expect(page.locator(".premium-report-container h1")).toContainText(/Analyse complète/i);
  });
});
