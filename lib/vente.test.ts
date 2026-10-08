import { test } from "node:test";
import assert from "node:assert/strict";
import { finDeVenteDepuisDate, venteTerminee } from "./vente";

test("fin de vente : fin du jour choisi, heure de Porto-Novo (UTC+1)", () => {
  const fin = finDeVenteDepuisDate("2026-10-01");
  assert.equal(fin, "2026-10-01T23:59:59+01:00");
  assert.equal(new Date(fin).toISOString(), "2026-10-01T22:59:59.000Z");
});

test("vente ouverte jusqu'à 23:59:59 à Porto-Novo, fermée ensuite", () => {
  const fin = finDeVenteDepuisDate("2026-10-01");
  assert.equal(venteTerminee(fin, new Date("2026-10-01T22:59:58Z")), false); // 23:59:58 à Porto-Novo
  assert.equal(venteTerminee(fin, new Date("2026-10-01T22:59:59Z")), true); // 23:59:59 : terminée
  assert.equal(venteTerminee(fin, new Date("2026-10-01T23:30:00Z")), true); // 00:30 le 2 à Porto-Novo
});

test("sans date de fin, ou date illisible : jamais terminée", () => {
  assert.equal(venteTerminee(null), false);
  assert.equal(venteTerminee(undefined), false);
  assert.equal(venteTerminee(""), false);
  assert.equal(venteTerminee("pas une date"), false);
});

test("libellé de fin de vente, jour lu à Porto-Novo", async () => {
  const { libelleFinVente } = await import("./vente");
  assert.equal(libelleFinVente(finDeVenteDepuisDate("2026-10-01")), "jusqu'au 1er oct.");
  assert.equal(libelleFinVente(finDeVenteDepuisDate("2026-12-20")), "jusqu'au 20 déc.");
  // Ancienne valeur décalée (23:59:59 UTC = 00:59 le lendemain à Porto-Novo) : lue le lendemain, d'où le recalage.
  assert.equal(libelleFinVente("2026-12-20T23:59:59+00:00"), "jusqu'au 21 déc.");
});
