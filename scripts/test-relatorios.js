const assert = require("node:assert/strict");
const { calcularResumoPedido, calcularProducaoNecessaria } = require("../assets/js/relatorios-utils.js");

const parcialComDuasRemessas = calcularResumoPedido([{ solicitado: 100, enviado: 80 }]);
assert.deepEqual(parcialComDuasRemessas, { solicitado: 100, enviado: 80, pendente: 20, completo: false, taxaAtendimento: 80 });

const completo = calcularResumoPedido([{ solicitado: 100, enviado: 100 }, { solicitado: 50, enviado: 50 }]);
assert.equal(completo.pendente, 0);
assert.equal(completo.completo, true);
assert.equal(completo.taxaAtendimento, 100);

const semEnvio = calcularResumoPedido([{ solicitado: 30, enviado: 0 }]);
assert.equal(semEnvio.pendente, 30);
assert.equal(semEnvio.taxaAtendimento, 0);

const semItens = calcularResumoPedido([]);
assert.equal(semItens.taxaAtendimento, null);
assert.equal(semItens.completo, false);

assert.equal(calcularProducaoNecessaria([{ pendente: 100, estoqueDisponivel: 30 }, { pendente: 20, estoqueDisponivel: 50 }]), 70);
assert.equal(calcularProducaoNecessaria([{ pendente: 0, estoqueDisponivel: 10 }]), 0);

console.log("Regras de relatório validadas.");
