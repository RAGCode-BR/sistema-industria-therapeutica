const assert = require("node:assert/strict");
const qualidade = require("../assets/js/qualidade-utils.js");

assert.equal(qualidade.textoSituacao("treatment"), "Em tratativa");
assert.equal(qualidade.textoOrigem("branch_receiving"), "Recebimento na filial");
assert.equal(qualidade.duracao("2026-09-02T08:00:00Z", "2026-09-03T11:20:00Z"), "1d 3h");
assert.equal(qualidade.validarImagem({ type: "image/png", size: 1024 }), true);
assert.equal(qualidade.validarImagem({ type: "application/pdf", size: 1024 }), false);
assert.equal(qualidade.validarImagem({ type: "image/jpeg", size: 10485761 }), false);
console.log("Testes de qualidade concluídos.");
