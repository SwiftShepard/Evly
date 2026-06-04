import { test, expect } from "@playwright/test";

test.describe("Parcours d'Achat du Rapport Premium B2C", () => {
  test("Simulation d'achat et génération du rapport", async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err));
    // 1. Ouvrir le simulateur TCO
    await page.goto("/simulateur/");
    await page.waitForLoadState("networkidle");

    // 2. Cliquer sur le CTA Premium
    const openCta = page.locator(".tco-premium-cta button");
    await expect(openCta).toBeVisible();
    await openCta.click();

    // 3. Remplir le formulaire de paiement simulé
    const emailInput = page.locator('input[placeholder="votre@email.com"]');
    const cardInput = page.locator('input[placeholder="4242 4242 4242 4242"]');
    const expiryInput = page.locator('input[placeholder="MM/AA"]');
    const cvcInput = page.locator('input[placeholder="123"]');

    await expect(emailInput).toBeVisible();
    await emailInput.fill("test@evly.fr");
    await cardInput.fill("4242 4242 4242 4242");
    await expiryInput.fill("12/28");
    await cvcInput.fill("123");

    // 4. Soumettre le paiement
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 5. Attendre l'état de traitement puis le succès de validation
    await expect(page.locator("text=Traitement en cours")).toBeVisible();
    await expect(page.locator("text=Paiement validé")).toBeVisible({ timeout: 5000 });

    // 6. Attendre la redirection automatique vers la page du rapport
    await page.waitForURL(/\/simulateur\/rapport-premium\//, { timeout: 10000 });

    // 7. Vérifier que les éléments de synthèse et d'aide à la décision s'affichent correctement
    await expect(page.locator(".premium-report-container h1")).toContainText(/Analyse complète/i);
    await expect(page.locator("text=Rapport Premium débloqué")).toBeVisible();
    await expect(page.locator("text=Total Cost of Ownership (TCO)")).toBeVisible();
    await expect(page.locator("text=Autonomie Météo & Plan de Charge")).toBeVisible();
    await expect(page.locator("text=Plan d'action Borne & Aides 2026")).toBeVisible();

    // Vérifier la présence des liens de conversion (mandataire et installateur de borne)
    const eliteAutoLink = page.locator('a:has-text("Demander une offre mandataire")');
    await expect(eliteAutoLink).toBeVisible();
    const chargeguruLink = page.locator('a:has-text("Simuler mon devis borne")');
    await expect(chargeguruLink).toBeVisible();
  });
});
