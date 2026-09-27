import { test } from "node:test";
import assert from "node:assert/strict";
import { issueTransaction } from "./statut-paiement";

test("payée : approved et transferred", () => {
  assert.equal(issueTransaction("approved"), "payee");
  assert.equal(issueTransaction("transferred"), "payee");
});

test("échec définitif : relance possible", () => {
  for (const s of ["declined", "canceled", "expired"]) assert.equal(issueTransaction(s), "echec_definitif", s);
});

test("en cours ou incertain : jamais de relance", () => {
  for (const s of ["pending", "refunded", "approved_partially_refunded", "", "statut_inconnu"]) assert.equal(issueTransaction(s), "en_cours", s);
});
