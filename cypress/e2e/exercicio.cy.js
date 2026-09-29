/// <reference types="cypress" />

describe('Testes da Funcionalidade Catálogo de Livros', () => {

let token
beforeEach(() => {
    cy.geraToken('admin@biblioteca.com', 'admin123').then(tkn => {
        token = tkn
    })
});

    // Objetivo: Verificar que a API retorna lista de livros com paginação e filtros funcionando
    // Validar que filtros por categoria e autores funcionam corretamente
    it('GET - Deve listar livros com filtros e paginação', () => {
        // Filtro por categoria + paginação
        cy.api({
            method: 'GET',
            url: 'books',
            qs: {
                category: 'Ficção',
                limit: 2,
                page: 1
            }
        }).should(response => {
            const { books, pagination, filters } = response.body

            expect(response.status).to.equal(200)
            expect(books).to.be.an('array').and.not.be.empty

            // Paginação respeita o limite solicitado
            expect(books.length).to.be.at.most(2)
            expect(pagination.limit).to.equal(2)
            expect(pagination.currentPage).to.equal(1)
            expect(pagination.showing).to.equal(books.length)
            expect(pagination.totalPages).to.equal(Math.ceil(pagination.total / 2))

            // Filtro por categoria aplicado a todos os livros retornados
            expect(filters.category).to.equal('Ficção')
            books.forEach(livro => {
                expect(livro.category).to.equal('Ficção')
            })
        })

        // Filtro por autor (busca parcial)
        cy.api({
            method: 'GET',
            url: 'books',
            qs: { author: 'Tolkien' }
        }).should(response => {
            expect(response.status).to.equal(200)
            expect(response.body.books).to.be.an('array').and.not.be.empty
            response.body.books.forEach(livro => {
                expect(livro.author).to.include('Tolkien')
            })
        })
    });

    // Objetivo: Validar que é possível obter detalhes de um livro específico pelo ID
    // Verificar que todos os campos do livro são retornados corretamente
    it('GET - Deve obter detalhes de um livro específico', () => {
        // Pega um livro existente na listagem para não depender de ID fixo
        cy.api({
            method: 'GET',
            url: 'books',
            qs: { limit: 1 }
        }).then(listagem => {
            const livroListado = listagem.body.books[0]

            cy.api({
                method: 'GET',
                url: `books/${livroListado.id}`
            }).should(response => {
                const { book, availability } = response.body

                expect(response.status).to.equal(200)

                // Todos os campos do livro são retornados
                expect(book).to.include.all.keys(
                    'id', 'title', 'author', 'description', 'category', 'isbn',
                    'editor', 'language', 'publication_year', 'pages', 'format',
                    'total_copies', 'available_copies', 'cover_image'
                )

                // Os dados conferem com o livro da listagem
                expect(book.id).to.equal(livroListado.id)
                expect(book.title).to.equal(livroListado.title)
                expect(book.author).to.equal(livroListado.author)
                expect(book.category).to.equal(livroListado.category)

                // Disponibilidade coerente com os exemplares
                expect(availability.total_copies).to.equal(book.total_copies)
                expect(availability.available_copies).to.equal(book.available_copies)
                expect(availability.isAvailable).to.equal(book.available_copies > 0)
            })
        })
    });

    // Objetivo: Validar que um novo livro é adicionado com sucesso ao catálogo
    // Verificar que apenas admin pode adicionar novos livros (validação de permissão)
    it('POST - Deve cadastrar um novo livro com sucesso', () => {
        const titulo = `Livro Cypress ${Date.now()}`
        const livro = {
            title: titulo,
            author: 'Laura Ajala QA',
            category: 'Tecnologia',
            total_copies: 3
        }

        // Sem token: não autenticado
        cy.api({
            method: 'POST',
            url: 'books',
            body: livro,
            failOnStatusCode: false
        }).should(response => {
            expect(response.status).to.equal(401)
            expect(response.body.message).to.equal('Token de acesso necessário')
        })

        // Usuário comum: autenticado, mas sem permissão
        cy.geraToken('usuario@teste.com', 'user123').then(tokenUsuario => {
            cy.api({
                method: 'POST',
                url: 'books',
                headers: { 'Authorization': tokenUsuario },
                body: livro,
                failOnStatusCode: false
            }).should(response => {
                expect(response.status).to.equal(403)
                expect(response.body.message).to.equal('Acesso negado. Apenas administradores podem realizar esta ação.')
            })
        })

        // Admin: cadastro realizado com sucesso
        cy.api({
            method: 'POST',
            url: 'books',
            headers: { 'Authorization': token },
            body: livro
        }).should(response => {
            expect(response.status).to.equal(201)
            expect(response.body.message).to.equal('Livro criado com sucesso.')
            expect(response.body.book.id).to.be.a('number')
            expect(response.body.book.title).to.equal(titulo)
            expect(response.body.book.author).to.equal('Laura Ajala QA')
            expect(response.body.book.total_copies).to.equal(3)
            expect(response.body.book.available_copies).to.equal(3)
        }).then(response => {
            // Limpeza: remove o livro criado para manter a base limpa
            cy.api({
                method: 'DELETE',
                url: `books/${response.body.book.id}`,
                headers: { 'Authorization': token }
            })
        })
    });

    // Objetivo: Garantir que dados inválidos são rejeitados ao adicionar um livro
    // Validar mensagens de erro apropriadas para dados faltantes ou incorretos
    it('POST -  Deve rejeitar livro com dados inválidos', () => {
        const cenariosInvalidos = [
            { descricao: 'sem título', campo: 'title', body: { author: 'Laura Ajala QA' } },
            { descricao: 'sem autor', campo: 'author', body: { title: `Livro sem autor ${Date.now()}` } },
            { descricao: 'ano de publicação futuro', campo: 'publication_year', body: { title: `Livro ano futuro ${Date.now()}`, author: 'Laura Ajala QA', publication_year: 3000 } },
            { descricao: 'formato inválido', campo: 'format', body: { title: `Livro formato ${Date.now()}`, author: 'Laura Ajala QA', format: 'Pendrive' } },
            { descricao: 'total de exemplares zero', campo: 'total_copies', body: { title: `Livro zero ${Date.now()}`, author: 'Laura Ajala QA', total_copies: 0 } }
        ]

        cenariosInvalidos.forEach(cenario => {
            cy.api({
                method: 'POST',
                url: 'books',
                headers: { 'Authorization': token },
                body: cenario.body,
                failOnStatusCode: false
            }).should(response => {
                expect(response.status, `Status - ${cenario.descricao}`).to.equal(400)
                expect(response.body.field, `Campo - ${cenario.descricao}`).to.equal(cenario.campo)
                expect(response.body.message, `Mensagem - ${cenario.descricao}`).to.include(cenario.campo)
                expect(response.body).to.not.have.property('book')
            })
        })
    });

    // Objetivo: Validar que um livro pode ser atualizado com sucesso
    // Verificar que apenas admin pode atualizar livros (validação de permissão)
    it('PUT - Deve atualizar um livro previamente cadastrado', () => {
        const tituloOriginal = `Livro Cypress ${Date.now()}`
        const tituloEditado = `${tituloOriginal} - Editado`
        const dadosAtualizados = {
            title: tituloEditado,
            author: 'Laura Ajala QA',
            category: 'Qualidade de Software',
            total_copies: 3
        }

        cy.cadastrarLivro(token, tituloOriginal).then(livroId => {

            // Usuário comum não pode atualizar
            cy.geraToken('usuario@teste.com', 'user123').then(tokenUsuario => {
                cy.api({
                    method: 'PUT',
                    url: `books/${livroId}`,
                    headers: { 'Authorization': tokenUsuario },
                    body: dadosAtualizados,
                    failOnStatusCode: false
                }).should(response => {
                    expect(response.status).to.equal(403)
                })
            })

            // Admin atualiza com sucesso
            cy.api({
                method: 'PUT',
                url: `books/${livroId}`,
                headers: { 'Authorization': token },
                body: dadosAtualizados
            }).should(response => {
                expect(response.status).to.equal(200)
                expect(response.body.message).to.equal('Livro atualizado com sucesso.')
                expect(response.body.bookId).to.equal(livroId)
                expect(response.body.previousTitle).to.equal(tituloOriginal)
            })

            // Confirma que a alteração foi persistida
            cy.api({
                method: 'GET',
                url: `books/${livroId}`
            }).should(response => {
                expect(response.status).to.equal(200)
                expect(response.body.book.title).to.equal(tituloEditado)
                expect(response.body.book.category).to.equal('Qualidade de Software')
            })

            // Limpeza
            cy.api({
                method: 'DELETE',
                url: `books/${livroId}`,
                headers: { 'Authorization': token }
            })
        })
    });

    // Objetivo: Validar que um livro pode ser removido do catálogo
    // Verificar que apenas admin pode deletar livros (validação de permissão)
    it('DELETE - Deve deletar um livro previamente cadastrado', () => {
        const titulo = `Livro Cypress ${Date.now()}`

        cy.cadastrarLivro(token, titulo).then(livroId => {

            // Usuário comum não pode deletar
            cy.geraToken('usuario@teste.com', 'user123').then(tokenUsuario => {
                cy.api({
                    method: 'DELETE',
                    url: `books/${livroId}`,
                    headers: { 'Authorization': tokenUsuario },
                    failOnStatusCode: false
                }).should(response => {
                    expect(response.status).to.equal(403)
                })
            })

            // Admin deleta com sucesso
            cy.api({
                method: 'DELETE',
                url: `books/${livroId}`,
                headers: { 'Authorization': token }
            }).should(response => {
                expect(response.status).to.equal(200)
                expect(response.body.message).to.equal('Livro deletado com sucesso.')
                expect(response.body.deletedBook.id).to.equal(livroId)
                expect(response.body.deletedBook.title).to.equal(titulo)
            })

            // Confirma que o livro foi removido
            cy.api({
                method: 'GET',
                url: `books/${livroId}`,
                failOnStatusCode: false
            }).should(response => {
                expect(response.status).to.equal(404)
                expect(response.body.message).to.equal('Livro não encontrado.')
            })
        })
    });
});
