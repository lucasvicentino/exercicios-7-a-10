# Exercícios 7 a 10 — configuração segura e ambiente

Projeto de demonstração em TypeScript e Node.js 20+ para configuração tipada e imutável, uso seguro de credenciais, conferência prévia do `.env` e logs limitados à raiz do projeto.

## Onboarding

1. Instale Node.js 20 ou superior.
2. Na pasta do projeto, execute `npm install`.
3. Crie sua configuração local: `Copy-Item .env.example .env` (PowerShell).
4. Preencha `API_KEY` no `.env` com uma chave obtida no serviço externo. Não use uma chave real em commits ou mensagens de erro.
5. Execute `npm run dev`. O script `predev` compara as variáveis documentadas com as do `.env` local antes de iniciar o servidor.
6. Verifique `http://127.0.0.1:3000/health`. Para compilar e testar, use `npm test`; para iniciar a compilação de produção, use `npm start`.

O `.env.example` é apenas um modelo e deliberadamente deixa `API_KEY` vazia. O arquivo `.env` local, logs e artefatos compilados são ignorados pelo Git. Se um segredo já tiver sido enviado a qualquer remoto, revogue-o no serviço e emita uma nova chave antes de limpar o histórico: remover um arquivo do commit mais recente não invalida cópias anteriores.

## Exercício 7 — Chaves de API e segredos no ambiente

### Sintoma / Como foi reproduzido

O padrão vulnerável permite que a aplicação inicie com uma chave embutida, envia credenciais na query string e pode registrar detalhes da exceção. Para conferir a correção, inicie sem `API_KEY`: a configuração encerra o processo antes de abrir o servidor. Com uma chave apenas no `.env` local, consulte `/health` e confira o arquivo em `logs/`: nem a resposta nem o log contêm a credencial. A função de mascaramento pode ser validada com `npm test`.

### Resultado esperado vs. Resultado obtido

Esperado: sem chave, falha explícita na inicialização; com chave, ela aparece somente no cabeçalho `Authorization: Bearer ...` da chamada externa. URLs, console, arquivo de log e respostas de erro não mostram a chave em texto puro. Obtido: `API_KEY` é obrigatória, `createApiRequest` rejeita `?key=`, usa o cabeçalho de autorização, e erros externos são substituídos por mensagens sem detalhes sensíveis. `maskApiKey` retorna, por exemplo, `sk_live_****4b7e`.

| Aspecto | Chave no código | Chave no ambiente |
| --- | --- | --- |
| Exposição | Presente no histórico, diffs, cópias e artefatos | Mantida fora do código e fornecida por `.env` local ou pelo gerenciador de segredos do deploy |
| Rotação | Exige editar o código e publicar uma nova versão | Pode ser trocada no serviço e no ambiente sem alterar a aplicação |
| Colaboração | Todos recebem o mesmo segredo ao clonar ou ler o histórico | Cada pessoa configura seu próprio valor; o exemplo documenta apenas os nomes |
| Validação | Fallback pode esconder ausência e manter uma chave comprometida | Configuração tipada falha cedo se a chave obrigatória estiver ausente |

### Hipótese e Investigação

Uma chave embutida ou adicionada à URL tende a sobreviver em histórico, logs de proxy, telemetria e mensagens de erro. A configuração exige a variável sem fallback; o cliente constrói a URL separadamente do cabeçalho e não registra URL, chave ou stack trace.

### Causa encontrada e Como a correção foi validada

A causa é tratar o segredo como dado comum e permitir que caminhos de erro o propaguem. `src/config.ts` valida a chave sem imprimi-la; `src/api-client.ts` a envia no cabeçalho e remove detalhes de falha; `src/secrets.ts` fornece o mascaramento. `npm test` verifica o formato mascarado, e a validação manual sem `API_KEY` deve terminar com erro de configuração antes do bind HTTP.

## Exercício 8 — Módulo único de configuração (`config.ts`)

### Sintoma / Como foi reproduzido

Leituras dispersas de `process.env` resultam em tipos diferentes e valores divergentes. Uma atribuição como `config.port = 4000` também deve falhar no TypeScript e não deve alterar o objeto em execução.

### Resultado esperado vs. Resultado obtido

Esperado: só `src/config.ts` lê `process.env`; `port` é `number`, campos essenciais são obrigatórios, e a configuração não pode ser mutada. Obtido: as variáveis são validadas e convertidas juntas, `Config` tipa campos não opcionais, e `Object.freeze()` protege o objeto exportado.

### Hipótese e Investigação

O carregamento tardio de dotenv, o acesso direto ao ambiente e a exportação de um objeto mutável explicam as inconsistências. A configuração carrega dotenv e dotenv-expand antes de validar as variáveis e exporta apenas valores já validados.

### Causa encontrada e Como a correção foi validada

O problema era não haver uma fronteira única de configuração. O tipo `Config` e o objeto congelado ficam em `src/config.ts`; portas e valores inválidos são validados por Joi. `npm run typecheck` e `npm test` verificam compilação e utilitários; a busca `rg "process\\.env" src scripts tests` deve apontar somente para `src/config.ts`.

## Exercício 9 — Boas práticas em equipe e validação pré-subida

### Sintoma / Como foi reproduzido

Se o `.env.example` não documenta uma variável nova, colegas podem iniciar sem configuração completa. Copie o exemplo para `.env`, remova uma chave ou deixe `API_KEY` vazia e execute `npm run dev`: o `predev` informa apenas os nomes das variáveis e bloqueia a inicialização. Uma chave em `.env` não deve aparecer em `git status`.

### Resultado esperado vs. Resultado obtido

Esperado: `.env.example` acompanha todas as variáveis; cada máquina é avisada antes da aplicação subir; `.env` real não é rastreado. Obtido: `scripts/check-env.ts` compara nomes, detecta valores vazios e variáveis locais não documentadas sem imprimir valores. `.gitignore` ignora `.env` e `.env.*`, mantendo `.env.example` versionável.

### Hipótese e Investigação

`.gitignore` não remove do índice um arquivo já rastreado, e apagar o arquivo atual não remove versões anteriores do histórico. Neste diretório recém-criado não havia `.env` rastreado nem histórico próprio com commits; portanto, não foi necessário executar uma remoção do índice nem houve credencial real disponível para rotacionar.

### Causa encontrada e Como a correção foi validada

A falha de equipe é a ausência de um contrato versionado e de uma checagem antes do desenvolvimento. `npm run dev` executa `predev`; `npm run check:env` também permite rodar a validação diretamente. `npm test` inclui casos de variável ausente, vazia e extra. Se um `.env` real tiver sido commitado em outro histórico, revogue a chave no provedor imediatamente; depois, coordene a limpeza do histórico com a equipe. `git rm --cached -- .env` remove somente o rastreamento atual e não apaga commits antigos.

## Exercício 10 — Variáveis dinâmicas e ambientes

### Sintoma / Como foi reproduzido

Com apenas dotenv, uma expressão como `LOG_PATH=./logs/${NODE_ENV}.log` pode permanecer literal. Um caminho configurado com `../` também poderia escrever fora da pasta do projeto. A inicialização com cada ambiente deve criar o diretório de log quando necessário.

### Resultado esperado vs. Resultado obtido

Esperado: `LOG_PATH` usa a interpolação de `NODE_ENV`, o arquivo resultante fica na raiz do projeto, o diretório é criado recursivamente e uma tentativa de escapar da raiz é rejeitada. `LOG_LEVEL` é `debug` em desenvolvimento e `info` em produção por padrão. Obtido: `dotenv-expand` expande o caminho; `path.resolve` e uma verificação de contenção bloqueiam escapes; o logger cria o diretório antes de gravar e também rejeita diretórios resolvidos fora da raiz.

### Hipótese e Investigação

Dotenv carrega pares chave/valor, mas a expansão precisa de suporte explícito. A interpolação ocorre durante o bootstrap de `src/config.ts`; a seleção de nível e a validação do caminho também ficam concentradas na configuração.

### Causa encontrada e Como a correção foi validada

A causa era tratar um valor interpolado como caminho literal e confiar nele sem normalização. `src/config.ts` usa `dotenv-expand`, deriva o nível de log por ambiente sem espalhar condicionais pelo app, e normaliza `LOG_PATH`; `src/logger.ts` cria diretórios com `{ recursive: true }` e verifica o caminho real. `npm test` valida a contenção de caminho e `npm run typecheck` valida os tipos.
