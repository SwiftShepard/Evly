import { test, expect } from "@playwright/test";

test.describe("Evly E2E Test Suite", () => {
  test("Navigation globale", async ({ page }) => {
    // 1. Accueil
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Evly/);

    // Vérifier la présence du header et du titre principal
    const wordmark = page.locator('a[aria-label="Evly, accueil"]');
    await expect(wordmark).toBeVisible();

    // 2. Catalogue / Showroom
    await page.goto("/vehicules/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main h1")).toContainText("Tous les véhicules");

    // 3. Comparateur
    await page.goto("/comparer/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main h1")).toContainText("Quatre véhicules");

    // 4. Simulateur TCO
    await page.goto("/simulateur/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main h1")).toContainText(/vrai co/i);

    // 5. Glossaire
    await page.goto("/glossaire/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main h1")).toContainText(/vocabulaire/i);

    // 6. Méthodologie
    await page.goto("/methodologie/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main h1")).toContainText(/comment evly/i);
  });

  test("Showroom - Filtres et Recherche", async ({ page }) => {
    await page.goto("/vehicules/");
    await page.waitForLoadState("networkidle");

    // S'assurer de la présence d'au moins une carte
    const initialCardsCount = await page
      .locator('.vehicle-card:not([style*="display: none"])')
      .count();
    expect(initialCardsCount).toBeGreaterThan(0);

    // Sélectionner la marque "Renault" (desktop aside)
    const renaultChip = page.locator(
      'aside .filter-chip[data-filter="brand"][data-value="Renault"]'
    );
    await expect(renaultChip).toBeVisible();
    await renaultChip.click();

    // Attendre le filtrage côté client
    await page.waitForTimeout(400);

    // Vérifier que la liste s'est réduite et que la R5 E-Tech est présente
    const filteredCount = await page
      .locator('.vehicle-card:not([style*="display: none"])')
      .count();
    expect(filteredCount).toBeLessThan(initialCardsCount);

    const r5Card = page.locator(
      '.vehicle-card:not([style*="display: none"]) h2:has-text("5 E-Tech")'
    );
    await expect(r5Card).toBeVisible();

    // Cliquer sur le bouton de réinitialisation
    const resetBtn = page.locator("#reset-filters");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Attendre le reset
    await page.waitForTimeout(400);
    const afterResetCount = await page
      .locator('.vehicle-card:not([style*="display: none"])')
      .count();
    expect(afterResetCount).toBe(initialCardsCount);

    // Cliquer sur la catégorie "Citadine" (desktop aside)
    const citadineChip = page.locator(
      'aside .filter-chip[data-filter="cat"][data-value="Citadine"]'
    );
    await citadineChip.click();

    // Attendre le filtrage
    await page.waitForTimeout(400);
    const citadineCount = await page
      .locator('.vehicle-card:not([style*="display: none"])')
      .count();
    expect(citadineCount).toBeLessThan(initialCardsCount);
  });

  test("Comparateur - Ajout et Suppression", async ({ page }) => {
    await page.goto("/comparer/");
    await page.waitForLoadState("networkidle");

    // S'assurer que le comparateur est vide (retirer buttons)
    const removeButtons = page.locator('button[aria-label*="Retirer"]');
    const initialCompareCardsCount = await removeButtons.count();
    expect(initialCompareCardsCount).toBe(0);

    // Ouvrir le modal d'ajout
    const addButton = page
      .locator('button[aria-label="Ajouter un véhicule au comparatif"]')
      .first();
    await addButton.click();

    // Vérifier la présence du modal
    const modalTitle = page.locator('h2:has-text("Ajouter un véhicule")');
    await expect(modalTitle).toBeVisible();

    // Rechercher un véhicule
    const modalSearch = page.locator(
      'input[placeholder="Rechercher un véhicule…"]'
    );
    await modalSearch.fill("5 E-Tech");
    await page.waitForTimeout(300);

    // Sélectionner le véhicule
    const vehicleResult = page.locator('button:has-text("Renault 5 E-Tech")').first();
    await vehicleResult.click();

    // S'assurer que la carte du véhicule est maintenant affichée dans le comparateur
    await expect(modalTitle).not.toBeVisible();
    const compareCardName = page.locator('h3:has-text("5 E-Tech")');
    await expect(compareCardName).toBeVisible();

    // Tester la bascule de mode d'affichage
    const tableModeBtn = page.locator('button[aria-label="Tableau"]');
    await tableModeBtn.click();
    await expect(page.locator("table")).toBeVisible();

    const cardsModeBtn = page.locator('button[aria-label="Cartes"]');
    await cardsModeBtn.click();

    // Retirer le véhicule
    const removeBtn = page.locator('button[aria-label*="Retirer"]').first();
    await removeBtn.click();
    await expect(compareCardName).not.toBeVisible();
  });

  test("Simulateur TCO - Calculs interactifs", async ({ page }) => {
    await page.goto("/simulateur/");
    await page.waitForLoadState("networkidle");

    // Vérifier le sélecteur de véhicule
    const vehicleSelect = page.locator("select.tco-select");
    await expect(vehicleSelect).toBeVisible();

    // Relever l'économie initiale
    const savingsHero = page.locator(".tco-savings-amount");
    await expect(savingsHero).toBeVisible();
    const initialSavingsText = await savingsHero.innerText();

    // Modifier le kilométrage annuel par script en invoquant le setter React natif
    const kmSlider = page.locator(
      'label.tco-slider-field:has-text("Kilometres par an") input'
    );
    await kmSlider.evaluate((el: HTMLInputElement) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, "30000");
      } else {
        el.value = "30000";
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Attendre la mise à jour des calculs animés
    await page.waitForTimeout(800);
    const updatedSavingsText = await savingsHero.innerText();
    expect(updatedSavingsText).not.toBe(initialSavingsText);

    // Modifier la durée de détention par script
    const yearsSlider = page.locator(
      'label.tco-slider-field:has-text("Duree de detention") input'
    );
    await yearsSlider.evaluate((el: HTMLInputElement) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, "8");
      } else {
        el.value = "8";
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Attendre la mise à jour finale
    await page.waitForTimeout(800);
    const finalSavingsText = await savingsHero.innerText();
    expect(finalSavingsText).not.toBe(updatedSavingsText);
  });
});
