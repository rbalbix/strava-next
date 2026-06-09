# Atualização Automática da Interface (Sync em Tempo Real)

## Visão Geral

Implementar uma sincronização automática entre o backend (Redis/Webhooks) e o frontend para que o ciclista veja suas estatísticas atualizadas instantaneamente após uma atividade no Strava ser processada. A interface deve reagir "silenciosamente" às mudanças, atualizando contadores de distância, tempo e disparando alertas de manutenção sem que o usuário precise recarregar a página ou fazer login novamente.

## Objetivos

- Eliminar a necessidade de refresh manual para visualizar novos dados processados por webhooks.
- Proporcionar uma experiência de "tempo real" para o usuário que monitora o dashboard após um treino.
- Garantir que alertas de manutenção críticos sejam exibidos assim que os dados indicarem o atingimento de um limite.
- Manter o custo de infraestrutura zero (sem serviços pagos de terceiros).

## Histórias de Usuário

- Como ciclista, quero terminar minha atividade no Strava e, ao abrir o GearLife, ver os números mudarem automaticamente assim que a sincronização ocorrer.
- Como usuário, não quero ter que me preocupar em "dar F5" para saber se minha última troca de corrente já foi contabilizada.
- Como mecânico/usuário cuidadoso, quero que o app me avise imediatamente sobre um equipamento atrasado se a atividade que acabei de fazer ultrapassar o limite configurado.

## Funcionalidades Principais

- **Polling Inteligente de Alta Frequência:** Verificação periódica (a cada 5 segundos) de novos dados enquanto o app está aberto e visível.
- **Sincronização Silenciosa de Stats:** Atualização em tempo real dos cards de equipamentos (distância e tempo) e estatísticas gerais do atleta.
- **Disparo Automático de Alertas:** Lógica para acionar o `ThresholdAlertModal` automaticamente caso a nova quilometragem atinja um limite configurado pelo usuário.
- **Otimização de Recursos:** Suspensão automática de atualizações quando a aba do navegador está em segundo plano ou o dispositivo entra em modo de economia.

## Experiência do Usuário

- O usuário abre o dashboard e visualiza seus dados atuais.
- Após o Strava processar uma atividade, o webhook do GearLife atualiza o Redis em segundo plano.
- No máximo 5 segundos depois, os números na tela do usuário aumentam suavemente para refletir a nova atividade.
- Se a nova atividade fizer um componente (ex: Corrente) ultrapassar o limite de manutenção, o modal de alerta aparece na tela imediatamente após os números serem atualizados.
- Tudo ocorre sem interrupções na navegação atual do usuário.

## Não-Objetivos

- Não utiliza WebSockets ou serviços de push externos (Pusher/Ably).
- Não envia notificações push do sistema (mobile/OS).
- Não altera a lógica de processamento de webhooks, apenas como a UI consome os resultados.

## Plano de Implantação em Fases

1. **Fase 1 (Check-in):** Criar um mecanismo leve de "heartbeat" que verifica se há novos dados comparando timestamps de última atualização.
2. **Fase 2 (UI Hook):** Implementar o hook de sincronização no `Stats.tsx` para atualizar o estado global com os novos dados do dashboard.
3. **Fase 3 (Alert Integration):** Integrar a lógica de verificação de limites ao fluxo de atualização automática.
4. **Fase 4 (Otimização):** Adicionar controles de visibilidade da página para evitar requisições desnecessárias.

## Métricas de Sucesso

- Latência máxima de 5 segundos entre o fim do processamento do webhook e a atualização na tela (com aba ativa).
- Zero aumento nos custos fixos de infraestrutura.
- 100% dos alertas de manutenção disparados corretamente após uma atualização automática.

## Riscos e Mitigações

- **Risco:** Sobrecarga no Redis/Vercel devido à frequência de 5 segundos.
  - **Mitigação:** Usar a Page Visibility API para parar o polling quando a aba não estiver visível e considerar um endpoint de "check" ultra-leve antes de baixar o dashboard completo.
- **Risco:** Concorrência entre atualizações manuais e automáticas.
  - **Mitigação:** Utilizar bibliotecas de data-fetching (como SWR) que gerenciam estados de cache e revalidação de forma robusta.

## Registros de Decisão de Arquitetura

- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Escolha do Polling sobre SSE/WebSockets por custo e simplicidade.

## Questões em Aberto

- Devemos mostrar um pequeno indicador de "Sincronizando..." durante o polling ou manter 100% invisível?
- O intervalo de 5 segundos deve ser dinâmico (ex: aumentar para 30s se o usuário estiver inativo por muito tempo)?
