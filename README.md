# Sistema de Estoque — Therapeutica

Sistema web para controle do estoque do Centro de Distribuição (CD), pedidos das filiais, produção interna e expedição de remessas.

## Principais recursos

- Cadastro de produtos com código, descrição, categoria, unidade e estoque mínimo.
- Categorias e unidades de medida administráveis pela interface.
- Entradas, saídas, ajustes e histórico de movimentações do CD.
- Pesquisa, ordenação alfabética, paginação e alertas de estoque baixo.
- Estoque informado individualmente por filial.
- Pedidos com vários produtos, número sequencial (`#1`, `#2`, ...), análise item a item e motivo de recusa.
- Remessas parciais: o sistema mostra o já enviado, o saldo pendente e o que falta produzir.
- Produção programada por produto, permitindo prazos diferentes dentro do mesmo pedido.
- Reserva de saldo para pedidos em produção, evitando que outra solicitação use o estoque separado.
- Confirmação de recebimento pela filial destinatária ou por um administrador do CD.
- Pedido finalizado automaticamente quando todos os itens não recusados forem recebidos.
- Relatórios e filtros para análise pendente, produção, envio parcial, trânsito, finalização e recusa.

## Fluxo operacional

1. A filial cria um pedido e informa o estoque atual de cada produto.
2. O CD aprova ou recusa cada item.
3. Itens aprovados podem ser enviados imediatamente, em uma ou mais remessas.
4. Quando faltar estoque, o CD programa a produção do produto específico e registra a entrada produzida no estoque.
5. A filial destinatária — ou o administrador do CD — confirma o recebimento de cada remessa.
6. Quando todo item aprovado tiver sido recebido, o pedido fica como **Finalizado**. Itens recusados não impedem essa finalização.

## Tecnologias

- HTML, CSS e JavaScript puro.
- Supabase Auth e PostgreSQL.
- Row Level Security (RLS) para acesso por perfil e filial.

## Configuração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie `.env.local` a partir de `.env.example` e informe a URL e a chave pública do projeto Supabase.

3. Gere a configuração do navegador:

   ```bash
   node scripts/gerar-config.js
   ```

4. Inicie o servidor local:

   ```bash
   npm run dev
   ```

O sistema será servido em `http://localhost:3000`.

## Banco de dados e migrações

O projeto Supabase deve estar vinculado antes de aplicar migrações:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push --linked
```

As migrações em `supabase/migrations/` são a fonte de verdade do fluxo de pedidos, remessas, reservas, confirmações e finalização. Não altere migrações já aplicadas; crie uma nova migração para cada mudança de banco.

Os arquivos SQL em `supabase/` auxiliam a configuração inicial, importações e verificações operacionais.

## Validação

```bash
npm run test:reports
node --check assets/js/script.js
supabase db push --linked --dry-run
```

## Estrutura do projeto

```text
├── assets/
│   ├── css/
│   └── js/
├── scripts/
├── supabase/
│   └── migrations/
├── index.html
├── login.html
└── README.md
```
