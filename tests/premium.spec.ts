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

  test("Parcours d'achat du Podium Premium dans le Matcher", async ({ page }) => {
    // 1. Ouvrir le Matcher directement avec des réponses pré-remplies dans l'URL pour sauter les étapes
    await page.goto("/recommandation/?usage=mixed&mileage=15000&charging=home&role=primary&household=family&trunkNeed=any&bodyType=any&chargingSpeed=any&budgetType=buy&budgetMax=40000&paywall=true");
    await page.waitForLoadState("networkidle");

    // 2. Vérifier que le Matcher s'affiche directement sur les résultats (étape 12)
    // S'assurer d'abord que le titre des résultats est affiché après la phase d'hydratation
    await expect(page.locator("text=Votre sélection sur-mesure.")).toBeVisible({ timeout: 7000 });

    // Le premier véhicule du podium (#1) doit être visible
    await expect(page.locator('span:has-text("#1")')).toBeVisible();

    // 3. Les cartes #2 et #3 du podium doivent être bloquées (floutées avec overlay paywall)
    await expect(page.locator('span:has-text("#2")')).toBeVisible();
    const paywallCard = page.locator("text=Podium Bloqué").first();
    await expect(paywallCard).toBeVisible();

    // 4. L'accordéon des alternatives supplémentaires doit afficher le cadenas de verrouillage
    const lockedAlternatives = page.locator('button:has-text("Autres alternatives compatibles")');
    await expect(lockedAlternatives).toContainText("🔒");

    // 5. Cliquer sur le bouton de déblocage d'une carte floutée pour ouvrir le modal Stripe
    const unlockBtn = page.locator('button:has-text("Débloquer pour 9,90 €")').first();
    await unlockBtn.click();

    // 6. Remplir le formulaire de paiement simulé
    const emailInput = page.locator('input[placeholder="votre@email.com"]');
    const cardInput = page.locator('input[placeholder="4242 4242 4242 4242"]');
    const expiryInput = page.locator('input[placeholder="MM/AA"]');
    const cvcInput = page.locator('input[placeholder="123"]');

    await expect(emailInput).toBeVisible();
    await emailInput.fill("user@evly.fr");
    await cardInput.fill("4242 4242 4242 4242");
    await expiryInput.fill("11/27");
    await cvcInput.fill("456");

    // 7. Soumettre le paiement Stripe
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 8. Attendre les écrans de chargement et de succès
    await expect(page.locator("text=Traitement en cours")).toBeVisible();
    await expect(page.locator("text=Paiement validé")).toBeVisible({ timeout: 5000 });

    // 9. Attendre la redirection de rafraîchissement avec paid=true
    await page.waitForURL(/paid=true/, { timeout: 10000 });

    // 10. Vérifier que le podium est maintenant déverrouillé (plus d'encart Podium Bloqué)
    await expect(page.locator("text=Podium Bloqué")).not.toBeVisible();

    // 11. Vérifier que le bouton de rapport premium est visible pour les véhicules du podium
    const premiumReportBtn = page.locator('a:has-text("Rapport TCO Premium (Inclus)")').first();
    await expect(premiumReportBtn).toBeVisible();

    // 12. Cliquer sur le lien du rapport premium d'un véhicule du podium et vérifier l'affichage du rapport
    await premiumReportBtn.click();
    await page.waitForURL(/\/simulateur\/rapport-premium\//, { timeout: 10000 });
    await expect(page.locator(".premium-report-container h1")).toContainText(/Analyse complète/i);
  });
});
