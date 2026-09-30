# Hub de Leitura API — Automação de Testes com Cypress

Automação de testes de API da funcionalidade **Catálogo de Livros** da [Hub de Leitura API](https://github.com/EBAC-QE/hub-de-leitura-api), utilizando **Cypress** e o plugin **cypress-plugin-api**.

Os testes cobrem as operações **GET, POST, PUT e DELETE**, com cenários positivos, negativos e validação de permissões por perfil de usuário.

---

## Tecnologias

- **Cypress** — execução dos testes
- **cypress-plugin-api** — requisições com `cy.api()` e visualização das respostas no runner
- **JavaScript** e **Node.js**
- **Git e GitHub** — versionamento

---

## Cenários automatizados

Arquivo: `cypress/e2e/exercicio.cy.js`

| Método | Cenário | Validações principais |
| --- | --- | --- |
| GET | Listar livros com filtros e paginação | Filtro por categoria e por autor, limite de itens, página atual e total de páginas |
| GET | Obter detalhes de um livro | Todos os campos retornados, dados coerentes com a listagem e disponibilidade de exemplares |
| POST | Cadastrar livro com sucesso | 401 sem token, 403 com usuário comum e 201 com administrador |
| POST | Rejeitar livro com dados inválidos | 5 cenários parametrizados: sem título, sem autor, ano futuro, formato inválido e zero exemplares |
| PUT | Atualizar livro | 403 com usuário comum, 200 com administrador e persistência confirmada por GET |
| DELETE | Remover livro | 403 com usuário comum, 200 com administrador e 404 ao consultar o livro removido |

---

## Estratégia de testes

- **Validação de permissões:** as operações restritas são testadas com três perfis — sem autenticação, usuário comum e administrador.
- **Independência entre testes:** cada cenário cria a própria massa de dados, sem depender de IDs fixos ou da execução de outro teste.
- **Dados dinâmicos:** os títulos dos livros utilizam `Date.now()`, evitando conflito com a regra de duplicidade.
- **Cenários parametrizados:** os casos de dados inválidos são definidos em uma lista e executados com `forEach`, evitando duplicação de código.
- **Base limpa:** os livros criados durante os testes são excluídos ao final.
- **Validações além do status code:** as asserções conferem mensagens, campos retornados e persistência dos dados.

### Custom Commands

Definidos em `cypress/support/commands.js`:

| Comando | Finalidade |
| --- | --- |
| `cy.geraToken(email, senha)` | Realiza login e retorna o token JWT |
| `cy.cadastrarLivro(token, titulo)` | Cadastra um livro e retorna o ID criado, usado como massa nos testes de PUT e DELETE |

---

## Como executar

### 1. Inicie a API

Em um terminal, fora da pasta deste projeto:

```bash
git clone https://github.com/EBAC-QE/hub-de-leitura-api.git
cd hub-de-leitura-api
npm install
npm start
```

A API ficará disponível em `http://localhost:3000`, com a documentação Swagger em `http://localhost:3000/api-docs`.

### 2. Execute os testes

Em outro terminal:

```bash
git clone https://github.com/laurajala/hub-de-leitura-api-teste-task.git
cd hub-de-leitura-api-teste-task
npm install
npx cypress run --spec cypress/e2e/exercicio.cy.js
```

Para acompanhar pela interface do Cypress:

```bash
npx cypress open
```

> O arquivo `cypress/e2e/usuarios.cy.js` é um exemplo fornecido pelo material do curso e depende de dados fixos da base, podendo falhar em execuções completas da suíte.

---

## Autora

**Laura Ajala** — Quality Engineer

[LinkedIn](https://www.linkedin.com/in/laura-ajala/) · [GitHub](https://github.com/laurajala)
