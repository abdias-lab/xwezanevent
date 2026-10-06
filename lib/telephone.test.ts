import { test } from "node:test";
import assert from "node:assert/strict";
import { formaterNumero } from "./telephone";

test("numéros nationaux groupés par deux", () => {
  assert.equal(formaterNumero("0190123456"), "01 90 12 34 56");
  assert.equal(formaterNumero("90123456"), "90 12 34 56");
  assert.equal(formaterNumero("01 90 12 34 56"), "01 90 12 34 56");
});

test("indicatif détaché avant de grouper (profils stockés en +229…)", () => {
  assert.equal(formaterNumero("+2290190123456"), "+229 01 90 12 34 56");
  assert.equal(formaterNumero("+22890123456"), "+228 90 12 34 56");
  assert.equal(formaterNumero("+229 01 90 12 34 56"), "+229 01 90 12 34 56");
  assert.equal(formaterNumero("+33612345678"), "+336 12 34 56 78"); // indicatif inconnu : 3 chiffres
});

test("indicatif enregistré sans le « + »", () => {
  assert.equal(formaterNumero("2290190123456"), "+229 01 90 12 34 56");
  assert.equal(formaterNumero("22890123456"), "+228 90 12 34 56");
  // 10 chiffres au plus : numéro national, même s'il commence par 22.
  assert.equal(formaterNumero("2290123456"), "22 90 12 34 56");
});

test("valeurs sans numéro rendues telles quelles", () => {
  assert.equal(formaterNumero("—"), "—");
  assert.equal(formaterNumero(""), "");
  assert.equal(formaterNumero("+"), "+");
  assert.equal(formaterNumero("appeler le soir"), "appeler le soir");
});
