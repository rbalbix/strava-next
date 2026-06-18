# PRD — Manter a Sessão Ativa

## Visão Geral
Atualmente, o GearLife possui um tempo de expiração de sessão extremamente curto para seus cookies de autenticação (`strava_athleteId` e `strava_code`), configurado em apenas 5 minutos (300 segundos). Essa configuração força os ciclistas a passarem pelo fluxo de login e autorização do Strava repetidamente, prejudicando severamente a usabilidade do painel de monitoramento de desgaste de componentes. Este documento especifica a extensão do tempo de sessão para 30 dias com um mecanismo de renovação totalmente transparente e livre de atritos.

## Objetivos
* **Eliminar o atrito de login recorrente:** Permitir que o usuário acesse suas estatísticas instantaneamente ao abrir o aplicativo, sem telas intermediárias de autenticação diárias.
* **Renovação fluida e transparente:** Redirecionar o usuário silenciosamente para o fluxo OAuth do Strava caso sua sessão expire ou as permissões sejam revogadas, devolvendo-o ao dashboard de forma automatizada.
* **Garantir controle total no encerramento:** Assegurar que a ação explícita de "Sair" remova imediatamente todas as credenciais e exija reautenticação completa.

## Histórias de Usuário
1. **Como um** ciclista ativo,  
   **Eu quero** abrir o aplicativo GearLife após vários dias e ver meu dashboard atualizado imediatamente,  
   **Para que** eu não precise clicar em "Logar com Strava" toda vez que quiser checar a vida útil da minha corrente.

2. **Como um** usuário com sessão expirada ou permissão revogada no Strava,  
   **Eu quero** que o aplicativo renove meu acesso automaticamente em segundo plano ao abrir a página,  
   **Para que** eu não veja telas de erro técnico ou alertas assustadores de "Não Autorizado".

3. **Como um** usuário preocupado com privacidade em computadores compartilhados,  
   **Eu quero** clicar em "Sair" e ter a certeza de que meus cookies foram limpos,  
   **Para que** ninguém mais possa visualizar os dados dos meus componentes.

## Recursos Principais
* **Sessão Estendida por Padrão:** Configuração global dos cookies de sessão com tempo de vida útil de 30 dias fixos para todos os usuários logados.
* **Interceptação e Redirecionamento Silencioso (Fallback Automático):** Mecanismo nas APIs protegidas e páginas do servidor que detecta a ausência de um ID de atleta válido ou falha crítica de comunicação com o token do Strava, disparando imediatamente o fluxo de autorização oficial sem exibir falhas ou modais de erro na tela.
* **Logout Seguro e Destrutivo:** Limpeza imediata dos cookies `strava_athleteId` e `strava_code` através do endpoint `/api/logout`, invalidando o acesso local imediatamente.

## Experiência do Usuário (UX)
* Ao acessar o app logado, o carregamento do Dashboard é direto e instantâneo.
* Caso a sessão de 30 dias expire enquanto o usuário tenta acessar, ocorre um breve redirecionamento automático (pelo Strava) e o usuário é colocado de volta no Dashboard já reautenticado, sem necessidade de cliques.
* O botão "Sair" redireciona o usuário para a página inicial deslogada de forma limpa.

## Não-Escopo (Non-Goals)
* Criação de caixas de seleção "Lembrar-me" na interface gráfica.
* Renovação flutuante baseada em atividade (Sliding Sessions) a cada clique ou navegação.
* Armazenamento permanente de dados confidenciais do atleta no localStorage do navegador.

## Plano de Rollout Faseado
* **Fase 1:** Atualização do tempo de vida útil dos cookies para 30 dias e testes de regressão no fluxo de autorização atual.
* **Fase 2:** Implementação do middleware/mecanismo de interceptação de erros de autenticação nas rotas de API e páginas para iniciar o redirecionamento automático ao Strava.
* **Fase 3:** Validação do fluxo de logout manual e testes E2E simulando expiração e revogação de tokens.

## Métricas de Sucesso
* **Redução drástica no número de logins recorrentes:** Redução de logins manuais diários por usuário recorrente para quase zero dentro do ciclo de 30 dias.
* **Aumento do tempo de retenção:** Maior engajamento dos usuários com o painel por conta do acesso instantâneo.

## Riscos e Mitigações
* **Risco:** Redirecionamento infinito caso o servidor do Strava esteja fora do ar ou retorne erros contínuos.  
  * **Mitigação:** O fluxo de autorização existente já possui tratamento de redirecionamento para páginas de erro genéricas (como `/404`), o que impede loops infinitos na raiz do app.
* **Risco:** Cookies de longa duração expostos a ataques de interceptação em redes não seguras.  
  * **Mitigação:** Manter rigidamente as flags `HttpOnly`, `SameSite=Strict` (ou `Lax` onde necessário para o fluxo OAuth) e `Secure` ativas em ambiente de produção para máxima proteção.

## Registros de Decisão de Arquitetura (ADRs)
* [ADR-001: Sessão Longa Ininterrupta com Renovação Transparente](adrs/adr-001.md) — Define a extensão fixada em 30 dias com fallback invisível para o fluxo do Strava.

## Perguntas Em Aberto
* Nenhuma pergunta em aberto no momento. O comportamento desejado foi totalmente mapeado durante a etapa de alinhamento com o usuário.
