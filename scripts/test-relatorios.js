const assert = require("node:assert/strict");
const { calcularResumoPedido, calcularProducaoNecessaria } = require("../assets/js/relatorios-utils.js");
const { calcularAtendimentoPedido, quantidadeMaximaRemessa } = require("../assets/js/pedidos-utils.js");

function pedido(itens) {
    return { id: "pedido-teste", situacao: "pendente", itens: itens.map(([produtoId, quantidadeSolicitada]) => ({ produtoId, quantidadeSolicitada })) };
}

function remessa(id, situacao, itens) {
    return { id, pedidoId: "pedido-teste", situacao, enviadaEm: "2026-08-28T10:00:00Z", recebidaEm: situacao === "recebida" ? "2026-08-28T11:00:00Z" : null, itens: itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade })) };
}

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

// Pedido e remessa são conceitos distintos: todos os cenários usam um único pedido.
let atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), []);
assert.deepEqual([atendimento.solicitado, atendimento.enviado, atendimento.pendente], [100, 0, 100]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "em_transito", [["a", 60]])]);
assert.deepEqual([atendimento.enviado, atendimento.pendente, atendimento.parcial, atendimento.totalmenteEnviado], [60, 40, true, false]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "em_transito", [["a", 60]]), remessa("r2", "em_transito", [["a", 20]])]);
assert.deepEqual([atendimento.enviado, atendimento.pendente], [80, 20]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "em_transito", [["a", 60]]), remessa("r2", "em_transito", [["a", 40]])]);
assert.deepEqual([atendimento.enviado, atendimento.pendente, atendimento.totalmenteEnviado], [100, 0, true]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100], ["b", 50]]), [remessa("r1", "em_transito", [["a", 100], ["b", 30]])]);
assert.deepEqual([atendimento.solicitado, atendimento.enviado, atendimento.pendente, atendimento.parcial], [150, 130, 20, true]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100], ["b", 50]]), [remessa("r1", "em_transito", [["a", 100], ["b", 30]]), remessa("r2", "em_transito", [["b", 20]])]);
assert.deepEqual([atendimento.enviado, atendimento.pendente, atendimento.totalmenteEnviado], [150, 0, true]);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "recebida", [["a", 60]]), remessa("r2", "em_transito", [["a", 40]])]);
assert.equal(atendimento.totalmenteEnviado, true);
assert.equal(atendimento.totalmenteRecebido, false);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "recebida", [["a", 60]]), remessa("r2", "recebida", [["a", 40]])]);
assert.equal(atendimento.totalmenteRecebido, true);

atendimento = calcularAtendimentoPedido(pedido([["a", 100]]), [remessa("r1", "em_transito", [["a", 100]]), remessa("cancelada", "cancelada", [["a", 30]])]);
assert.deepEqual([atendimento.enviado, atendimento.pendente], [100, 0]);

assert.equal(quantidadeMaximaRemessa(pedido([["a", 100]]), [remessa("r1", "em_transito", [["a", 80]])], "a", 50), 20);

console.log("Regras de relatório validadas.");
