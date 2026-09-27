import { test } from "node:test";
import assert from "node:assert/strict";
import { cheminInterne } from "./redirection";

test("accepte les chemins internes", () => {
  for (const c of ["/", "/creer", "/orga/evenements/abc/modifier?erreur=dates", "/%2F%2Fsite.com"]) {
    assert.equal(cheminInterne(c), c);
  }
});

test("refuse les URL externes, y compris déguisées", () => {
  for (const c of [
    "//site-externe.com",
    "/\\site-externe.com",
    "/creer\\..\\//site-externe.com",
    "/\t/site-externe.com",
    "/\n/site-externe.com",
    "/\r/site-externe.com",
    "https://site-externe.com",
    "javascript:alert(1)",
    "creer",
    "",
  ]) {
    assert.equal(cheminInterne(c), "/", JSON.stringify(c));
  }
});

test("repli personnalisé, valeurs absentes", () => {
  assert.equal(cheminInterne(undefined), "/");
  assert.equal(cheminInterne(null, "/compte"), "/compte");
  assert.equal(cheminInterne("//x.com", "/orga"), "/orga");
});
