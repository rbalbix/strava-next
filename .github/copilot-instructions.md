# Regras e Diretrizes do Agente AI para **GearLife** (strava-next)

Este documento define regras de codificação, padrões de segurança e receitas de desenvolvimento ("Skills") para guiar qualquer agente de Inteligência Artificial ou desenvolvedor na manutenção e evolução deste repositório com consistência e segurança absoluta.

---

## 🎯 1. Regras de Arquitetura e Codificação (Rules)

### 💻 A. Restrições de Runtime e Ambiente

- **Next.js & TypeScript**: O projeto roda em Next.js (Node >= 16) com tipagem estática. Toda nova implementação deve manter o TypeScript estrito (`tsconfig.json`).
- **Segredos e Variáveis de Ambiente**: Nunca versione tokens, senhas ou credenciais de APIs. Use exclusivamente o arquivo `.env.local` (não versionado) para carregar credenciais. Siga a estrutura de `.env.example`.

### 🛡️ B. Segurança de Dados e Privacidade

- **Redis Server-Only**: O acesso direto ao Redis (`src/services/redis.ts`) é estritamente **server-side**. Nunca importe ou use conexões com o Redis em páginas frontend ou componentes client-side.
- **Cookies de Sessão**: Cookies sensíveis (como `strava_code` e `strava_athleteId`) gerados em rotas de API devem ser configurados com `HttpOnly`, `Secure` (em produção) e política `SameSite=Strict` para mitigar CSRF.
- **Privacidade do Ciclista (GDPR / LGPD)**: Eventos de deleção do atleta recebidos via webhook (`athlete` com `aspect_type: delete`) devem apagar imediatamente todas as chaves do atleta do Redis.

### ⚡ C. Concorrência e Resiliência

- **Locks de Token Refresh**: Ao realizar o refresh do token de acesso do Strava, use sempre o lock distribuído baseado em Redis (`strava:lock:refresh:<athleteId>`) com `SET NX` e TTL adequado para evitar concorrência descontrolada (_cache stampede_). Siga o padrão de `src/services/strava-auth.ts`.
- **Retries em APIs Externas**: Requisições externas para a API do Strava ou outras dependências devem usar políticas de retentativa exponencial (_exponential backoff_). Utilize a configuração pré-existente do `axios-retry` em `src/services/api.ts`.
- **Idempotência de Webhooks**: Sempre deduplique eventos de webhook do Strava usando chaves temporárias de cache no Redis com TTL de 2 horas.

### 📊 D. Observabilidade e Logs

- **Logs Estruturados**: Nunca use `console.log` para depuração ou erro em produção. Utilize o logger estruturado **Pino** (`src/services/logger.ts`).
- **Rastreabilidade (`X-Request-ID`)**: Garanta que o cabeçalho `X-Request-ID` seja propagado em logs secundários e chamadas assíncronas internas para facilitar o rastreamento em microsserviços e funções serverless.

---

## 🚀 2. Receitas Práticas de Desenvolvimento (Skills)

Qualquer alteração ou nova feature no projeto deve seguir os passo-a-passo consolidados abaixo para evitar regressões:

### 🔧 Skill 1: Cadastrar Novos Componentes de Manutenção (Equipments)

Para adicionar uma nova peça rastreável ao GearLife (ex: `helmet`, `shoes`, `freehub`):

1. **Configuração**: Adicione o ID e a legenda legível do componente no objeto `Equipments` em `src/services/equipment.ts`.
   ```typescript
   Helmet: { id: 'helmet', caption: 'capacete:', show: 'Capacete' }
   ```
2. **Lógica de Relação**: Adicione as regras de depuração ou exclusão mútua em `createStatistics` em `src/services/statistics.ts` caso a substituição da nova peça afete outras (ex: se o ciclista instala `tubeless`, as `tubes` antigas devem ser desativadas).
3. **Validação**: Execute `yarn test` e certifique-se de que os testes unitários do fluxo de estatísticas continuam passando com a nova peça cadastrada.

### 📈 Skill 2: Criar Métricas de Telemetria Distribuída

Para adicionar um novo contador de eventos ou erros no painel Prometheus do projeto:

1. **Definição**: Declare a métrica no arquivo `src/services/metrics.ts` usando o helper `createCounter`.
   ```typescript
   export const myNewEvent = createCounter(
     'my_new_event_total',
     'Descrição explicativa da métrica para o Prometheus',
     ['label_name'], // Opcional: labels adicionais
   );
   ```
2. **Incremento**: Chame o contador no código de produção no momento em que o evento ocorrer:
   ```typescript
   import { myNewEvent } from '../../services/metrics';
   myNewEvent.inc({ label_name: 'sucesso' });
   ```
3. **Validação**: Suba o app e chame `/api/metrics` com a chave `X-Internal-Api-Key` para garantir que o contador está integrando ao Redis e saindo no formato Prometheus.

### 🧪 Skill 3: Criar Testes Rápidos usando o Harness Next-API

Para adicionar um novo teste de rota sem a necessidade de subir servidores de rede HTTP:

1. **Criação**: No arquivo de teste (`tests/integration/*` ou `tests/unit/*`), importe a rota que deseja testar e os simuladores de API.
   ```typescript
   import handler from '../../src/pages/api/minha-rota';
   import { createMockRequest, createMockResponse } from '../helpers/next-api';
   ```
2. **Montagem do Caso**: Monte os mocks de Request e Response com os headers e parâmetros desejados.
   ```typescript
   const req = createMockRequest({
     method: 'POST',
     headers: { 'x-request-id': 'teste-123' },
     body: { dado: 'teste' },
   });
   const res = createMockResponse();
   ```
3. **Execução**: Execute o handler diretamente de forma assíncrona e valide os retornos:
   ```typescript
   await handler(req, res);
   expect(res.statusCode).toBe(200);
   expect(res.body).toEqual({ success: true });
   ```

### 📡 Skill 4: Executar e Simular Webhooks Localmente com o Dev-Harness

Para testar alterações nos fluxos de dados sem precisar de túneis HTTPS ou contas reais do Strava:

1. **Subir App**: Inicie a aplicação no localhost:
   ```bash
   yarn dev
   ```
2. **Autenticar Mock**: Crie um atleta de simulação temporário no Redis:
   ```bash
   node scripts/dev-harness.mjs auth-simulate 999888
   ```
3. **Disparar Webhook**: Simule a criação de uma atividade com asterisco no nome e ID do componente na nota privada:
   ```bash
   node scripts/dev-harness.mjs webhook-simulate 999888 777666 create "Treino de MTB *" "chain,lub"
   ```
4. **Verificar Resultados**: Inspecione o Redis para verificar se a quilometragem do atleta e do componente foi processada corretamente:
   ```bash
   node scripts/dev-harness.mjs redis-inspect 999888
   ```

---

## 📝 3. Estrutura do Repositório (Referências)

Antes de fazer alterações em módulos complexos, estude os arquivos de referência:

- **Fluxo OAuth e Cookies**: `src/pages/api/authorize.tsx`
- **Gestão e Locks de Token**: `src/services/strava-auth.ts`
- **Cálculo de Desgaste e Estatísticas**: `src/services/statistics.ts`
- **Recepção de Webhooks**: `src/pages/api/webhook.ts`
- **Clientes e Configuração HTTP**: `src/services/api.ts`

_Ao propor melhorias arquiteturais ou novos endpoints externos, garanta que todos os testes passem executando `yarn test` localmente antes de prosseguir com PRs ou commits._
