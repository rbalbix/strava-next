# Configurar limite de distância por equipamento com alerta visual

## Visão Geral

Permitir que o usuário defina um limite de distância para cada equipamento e exibir alertas visuais claros quando esses limites estiverem próximos ou forem ultrapassados. A funcionalidade deve mostrar o uso atual em comparação com os limites configurados, manter o painel enxuto e deixar os equipamentos em risco imediatamente visíveis ao abrir o app.

## Objetivos

- Permitir que o ciclista configure um limite de inspeção baseado em distância para cada equipamento.
- Avisar visualmente antes que um equipamento atinja o limite configurado.
- Resumir imediatamente os equipamentos atrasados ou em alto risco após o login, mostrando ao usuário a distância atual e o limite configurado lado a lado para cada equipamento com limite atingido.
- Manter a experiência de alerta leve e conectada aos fluxos existentes de detalhe do equipamento.

## Histórias de Usuário

- Como ciclista, quero definir meu próprio limite de quilometragem para cada peça para poder inspecioná-la antes que falhe.
- Como usuário recorrente, quero que o app destaque quais equipamentos alcançaram ou ultrapassaram o limite configurado.
- Como usuário, quero ver um indicador de progresso para cada equipamento para entender o quão perto ele está do limite.
- Como ciclista, quero um resumo curto de alertas, agrupados pelo bikes/gears, quando abrir o app para poder priorizar equipamentos atrasados rapidamente.
- Como usuário, quero editar o limite a partir da visualização de detalhes do equipamento para ajustar limites sem procurar em configurações.

## Funcionalidades Principais

- Adicionar um campo de limite de distância a cada item de detalhe do equipamento, em uma modal ao clicar no item de detalhe do equipamento.
- Persistir valores de limite por equipamento para que permaneçam após atualização e revisita.
- Adicionar um indicador de progresso para cada equipamento com estados de risco (normal, aviso, atrasado), logo abaixo dos badges de distância e tempo.
- Exibir uma modal de alerta ou resumo ao login listando gears/equipamentos que ultrapassaram limites configurados, mostrando a distância atual e o limite configurado juntos na visualização do equipamento.
- Não há necessidade de rótulos, apenas a lista com os valores e a barra de progresso com as cores.

## Experiência do Usuário

- Quando o usuário abre o GearLife, o painel carrega normalmente.
- Se algum equipamento ultrapassar seu limite, um pequeno resumo de alerta aparece imediatamente com a bike/gear e os nomes dos equipamentos afetados, sua distância limite configurada e a distância atual.
- Cada item de equipamento mostra uma barra de progresso compacta indicando a distância percorrida em relação ao limite.
- Equipamentos na faixa de aviso (por exemplo, perto de 80% do limite) usam um estado visual distinto para comunicar risco.
- O usuário pode clicar em um item de equipamento e editar seu limite de distância na modal de detalhe existente.
- Após editar, o app atualiza a distância atual exibida, o limite e o estado de progresso.

## Não-Objetivos

- Esta funcionalidade não envia email, SMS ou notificações push.
- Não cria uma página separada completa de gerenciamento de limites.
- Não infere ou sugere valores de limite automaticamente.
- Não altera o processamento de atividades do Strava ou o modelo de rastreamento de componentes.

## Plano de Implantação em Fases

1. Adicionar entrada de limite e persistência ao fluxo de detalhe do equipamento.
2. Exibir status de limite e progresso para cada equipamento no painel/cards.
3. Adicionar o resumo de alerta ao abrir o app para equipamentos atrasados.
4. Refinar textos, rótulos e estados visuais para manter a interface clara e compacta.

## Métricas de Sucesso

- Usuários conseguem configurar e salvar um limite de distância para cada equipamento.
- Equipamentos atrasados aparecem no resumo de alerta ao abrir o app, mostrando claramente limite configurado versus distância atual.
- Estados de aviso e atraso são visíveis sem exigir navegação extra.
- A funcionalidade não requer uma página de configurações separada para ser usada.

## Riscos e Mitigações

- Risco: a interface fica poluída com muitos indicadores de equipamento.
  - Mitigação: manter progresso em uma barra logo abaixo dos badges de distância e tempo.
- Risco: usuários interpretam mal o estado do limite.
  - Mitigação: usar rótulos explícitos e valores atual/limite na mesma linha.
- Risco: o resumo de alerta é dispensado e esquecido.
  - Mitigação: também mostrar badges de status no painel para manter o risco visível.

## Registros de Decisão de Arquitetura

- `adr-001.md` — Configuração de limite de distância por equipamento com notificação visual.

## Questões em Aberto

- Qual limiar exato de aviso deve ser usado antes de um item se tornar visualmente de risco? (80% é um candidato provável.)
- O modal de resumo de alerta deve permanecer acessível no painel após ser dispensado? Deve aparece toda vez que o usuário logar e houver equipmentos com seus limites atingidos.
- Os limites devem ser mostrados apenas por tipo de equipamento ou também agrupados por bike/gear no resumo? Os limites são mostrados para cada equipamento.
