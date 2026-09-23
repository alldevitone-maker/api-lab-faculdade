# API Lab Faculdade

**Versão v0.0.1**

Laboratório interativo para estudar requisições HTTP, endpoints, parâmetros, headers, JSON, Xano e FlutterFlow. Funciona como página estática, sem backend.

## Abrir

Acesse a página publicada no GitHub Pages ou abra [`index.html`](index.html) no navegador. Não é preciso instalar dependências.

## Experimente

1. Escolha um método HTTP. O construtor oferece GET, POST, PUT, PATCH, DELETE, HEAD e OPTIONS.
2. Deixe o recurso `alunos` e clique em **Simular resposta** para listar os registros de exemplo.
3. Digite o ID `42` para consultar um aluno. Deixe o ID vazio para listar ou criar.
4. Use o botão **Criar** e simule para cadastrar um registro. Depois consulte o ID retornado.
5. Clique nos ícones `?` ao lado dos campos para ver exemplos de preenchimento.
6. No fim da página, execute o autoteste.

Os registros são fictícios e ficam apenas na memória da aba. Recarregar a página restaura os dados iniciais (IDs 1, 2 e 42). A página não envia requisições à Base URL digitada e não valida credenciais reais. Os exemplos de cURL e `fetch()` servem para estudo; adapte URLs e autenticação antes de usá-los com uma API real. Não insira tokens reais no laboratório.

## Verificação da v0.0.1

O autoteste embarcado cobre 1.049 combinações e casos definidos, incluindo sete métodos, três formatos de saída, validações e operações em sequência. A aprovação desse teste valida a lógica local coberta; não substitui testes contra uma API real ou em diferentes navegadores.

## Publicação no GitHub Pages

Publique os arquivos na raiz da branch `main`. Em **Settings → Pages**, selecione **Deploy from a branch**, branch `main` e pasta `/ (root)`. O arquivo `index.html` será a página inicial.
