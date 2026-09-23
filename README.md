# API Lab Faculdade

Laboratório visual para aprender APIs HTTP. A versão exibida na página vem de `package.json`, a única fonte de versão do projeto.

Acesse [o laboratório publicado](https://alldevitone-maker.github.io/api-lab-faculdade/). A página funciona pelo link, sem instalar nada. O laboratório simula respostas em memória: não envia chamadas para a URL informada e não valida credenciais reais. Evite inserir tokens reais. A [versão anterior](https://alldevitone-maker.github.io/api-lab-faculdade/legacy.html) preserva as demais atividades originais durante a migração.

## Desenvolvimento

Requer Node.js 22 ou mais recente.

```bash
npm ci
npm run dev
npm run lint
npm run test
npm run build
npm run test:e2e
```

O teste de navegador requer `npx playwright install chromium` na primeira execução. A auditoria também pode ser executada na própria página.

## Organização

- `src/features/http-lab/services/core.js`: motor didático e auditoria migrados da página original sem alterar a lógica.
- `src/features/http-lab/models/request.ts`: contratos para entradas e respostas.
- `src/features/http-lab/examples/presets.ts`: exemplos de preenchimento.
- `src/features/wiki/content/fields.ts`: explicação de cada campo e termo.
- `src/App.tsx`: formulário, resultados e navegação.
- `public/legacy.html`: exercícios e explicações da página original.

Para mudar a versão, altere **somente** `version` em `package.json` e execute `npm install --package-lock-only`. `src/shared/constants/appVersion.ts` importa esse valor e todas as telas o reutilizam. O README não armazena uma cópia da versão.

## Publicação

O GitHub Actions executa lint, testes, verificação de versão e build antes de publicar `dist` no GitHub Pages. Nas configurações de Pages, escolha **GitHub Actions** como origem. O Vite ajusta o caminho base durante o workflow.
