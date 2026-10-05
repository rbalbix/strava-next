# PRD: Limite de manutenção por equipamento com unidade selecionável (km ou horas de pedalagem)

## Visão Geral

O GearLife permite que o atleta defina um limite de manutenção por equipamento, mas o limite só pode ser expresso em quilômetros. Isso impõe a unidade errada em componentes cujo desgaste é regido pelo tempo de uso — a suspensão é especificada pelos fabricantes em horas de pedalada (RockShox/Fox: serviço de lower leg/air can a cada 50h, serviço completo a cada 200h), não em quilômetros — e retira uma escolha que os ciclistas esperam. O concorrente comparável integrado ao Strava, o ProBikeGarage, já oferece intervalos por distância, moving time, elapsed time e número de pedaladas.

Este recurso permite que o atleta escolha, para cada equipamento, se o limite é medido em quilômetros ou em horas de pedalagem. Todos os demais comportamentos permanecem os mesmos: progresso, faixa de aviso aos 80%, alerta de vencimento e o modal de alerta.

## Objetivos

- **O1** — Todo limite de equipamento carrega uma unidade escolhida pelo atleta: km ou horas de pedalagem. Limites novos começam em km.
- **O2** — Progresso e alertas avaliam e apresentam o valor na unidade escolhida, sem ambiguidade.
- **O3** — A opção é descoberta no próprio local onde o limite é editado, e explicada na página "Como funciona".
- **O4** — Limites já salvos em km continuam se comportando exatamente como hoje, sem nenhuma ação do atleta.

Critério de sucesso (decisão: verificação funcional, sem telemetria): um atleta cria um limite em horas, o progresso e o alerta avaliam horas de pedalagem, e testes automatizados cobrem o caminho completo.

## Histórias de Usuário

- Como **atleta de MTB com suspensão full**, quero definir os limites do garfo e do shock em horas de pedalagem para seguir o intervalo de 50 horas do fabricante em vez de estimar um valor em quilômetros.
- Como **atleta de estrada**, quero que os limites de corrente e pneus continuem em km para que nada mude no meu fluxo atual.
- Como **atleta que troca um limite existente para horas**, quero que o valor salvo seja limpo e o campo peça um novo, para que um número de quilômetros nunca se torne silenciosamente um número de horas.
- Como **atleta lendo um alerta**, quero que o modal exiba `48,0 h / 50,0 h` para saber exatamente o que foi consumido e o que resta.
- Como **atleta usuário de leitor de tela**, quero que a barra de progresso anuncie a unidade que ela mede, para que a barra visual não seja a única fonte de significado.

## Funcionalidades Principais

**P1 — Seleção de unidade no editor de limite.** Um controle de duas opções (km | h) fica na mesma linha do campo de valor existente, com a mesma altura, sem acrescentar uma linha a um modal com espaço restrito. A unidade fica sempre visível ao lado do valor; o placeholder do campo deixa de fixar "km". O controle tem semântica de radio-group, navegação por teclas de seta e anel de foco visível. Trocar a unidade mantém o valor digitado no campo, que passa a valer na unidade recém-escolhida — a unidade visível ao lado do campo é o que indica a medida em uso.

**P1 — Avaliação de progresso por unidade.** A barra de progresso, a faixa de aviso aos 80% e o estado de vencimento aos 100% são avaliados na unidade escolhida. Para horas, o valor comparado são as horas de pedalagem acumuladas daquele equipamento desde sua última manutenção — a mesma acumulação já exibida no badge de tempo do equipamento. A barra não desenha texto dentro da trilha: valor e unidade seguem anunciados por leitores de tela na unidade do limite, e a trilha mantém uma altura fixa.

**P1 — Apresentação do alerta por unidade.** O modal de alerta de manutenção agrupa por bicicleta e exibe `unidade atual / limite atual` em vez de dois rótulos fixos de "km". Os filtros existentes (limite maior que zero) e as regras de disparo permanecem inalterados.

**P2 — Descoberta.** O controle de unidade está visível no momento em que o limite é digitado, e a página "Como funciona" explica que um limite pode ser expresso em quilômetros ou horas de pedalagem e qual convém a cada componente.

Interação: a unidade selecionada determina o que progresso e alertas comparam. Selecionar outra unidade invalida o valor digitado/salvo.

## Experiência do Usuário

1. O atleta abre o detalhe de equipamentos da bicicleta e ativa o editor de limite de um componente.
2. A linha mostra o campo de valor e o controle km | h lado a lado, com a unidade atual já selecionada (km para limite novo).
3. O atleta digita o valor e salva. O toast confirma.
4. A linha do equipamento passa a exibir uma barra de progresso rotulada com valor e unidade, na unidade escolhida.
5. Aos 80% a barra muda de estado; aos 100% o modal de alerta abre, agrupado por bicicleta, exibindo os dois valores na unidade escolhida.

Acessibilidade e espaço: as linhas do modal são a superfície mais apertada do app, então o seletor só acrescenta largura, nunca altura; a barra de progresso permanece nos atuais 8px nessa única linha; todas as cores passam pelo gate de contraste APCA que o projeto já tem; o controle é operável por teclado e anuncia seu estado.

## Restrições Técnicas de Alto Nível

- A acumulação de horas por equipamento já existe e já chega ao cliente; este recurso não exige nenhuma medição nova.
- Os limites armazenados devem continuar legíveis como estão; os registros existentes são quilômetros.
- A escolha deve sobreviver a um recarregamento de página e a uma nova sessão, ou seja, faz parte do limite salvo, não é estado transitório de interface.

## Fora de Escopo (Non-Goals)

- Dois limites simultâneos por equipamento (km **e** horas, valendo o que primeiro vencer).
- Sugestão automática de unidade por tipo de componente (suspensão → horas).
- Limites por tempo de calendário (ex.: "a cada 12 meses") ou unidades livres digitadas pelo atleta.
- Limites exibidos em superfícies além do detalhe do equipamento e do modal de alerta (lista de equipamentos, painel principal).
- Notificações por e-mail, push ou SMS para limites.
- Corrigir os rótulos amigáveis dos equipamentos (`corrente:` → `Corrente`) nos alertas e no detalhe — adiado por decisão, mesmo tocando essas superfícies.
- Qualquer telemetria de adoção ou contagem de limites criados por unidade.

## Plano de Entrega por Fases

### MVP (Fase 1)
Controle de unidade no editor de limite, progresso e alerta por unidade, textos de descoberta.
**Critério de sucesso:** testes automatizados cobrem a criação de um limite em horas, a avaliação do progresso em horas e o disparo do alerta; todos os testes de limite em quilômetro existentes continuam passando.

### Fase 2
Polimento de exibição nas superfícies tocadas: rótulos amigáveis nos alertas e no detalhe, e limites visíveis na lista de equipamentos sem abrir o detalhe.
**Critério de sucesso:** alerta e detalhe leem de forma consistente com o resto do app.

### Fase 3
Somente se os atletas pedirem: limites duplos por equipamento, ou intervalos por tempo de calendário.
**Critério de sucesso:** a confusão relatada sobre "qual limite vale" é resolvida pela regra entregue.

## Métricas de Sucesso

- Limites em horas podem ser criados e sobrevivem ao recarregamento (teste funcional).
- Correção de progresso e alerta para ambas as unidades (testes automatizados, nas duas faixas).
- Nenhuma mudança de comportamento para limites em quilômetro existentes (testes de regressão).
- Descoberta: a opção de unidade está presente no editor e documentada no "Como funciona", sem depender de explicação externa.
- Sem telemetria no MVP — a adoção só é medida se a instrumentação da Fase 2 for aprovada.

## Riscos e Mitigações

- **O atleta perde um valor salvo ao trocar de unidade** → aceito por design; o campo é limpo e explicitamente re-pedido, em vez de reinterpretar o número.
- **Um limite em horas é confundido com quilômetros após a mudança** → todo limite existente continua em km, e a unidade fica permanentemente visível ao lado do valor e é anunciada pela barra de progresso.
- **Um modal com espaço restrito fica apertado** → o seletor ocupa apenas a linha do valor e não aumenta a altura; a barra cresce no máximo uma linha.
- **Atletas esperam sugestão automática de unidade** → explicitamente fora de escopo e explicado no "Como funciona".
- **Horas parecem ambíguas por não serem número de pedaladas** → o PRD define horas como horas de pedalagem desde a última manutenção, igual ao que o badge do equipamento já exibe.

## Registros de Decisão de Arquitetura (ADRs)

- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário (km ou horas de pedalagem)](adrs/adr-001.md) — Um valor por equipamento mais uma unidade escolhida pelo atleta; alternativas rejeitadas: limites simultâneos duplos, unidade padrão por tipo de componente e unidades livres.

## Questões em Aberto

- Formato de exibição das horas no modal de alerta e na barra de progresso: decimal (`48,0 h`, consistente com o formato de km com dois decimais) ou relógio (`48h`)?
- Granularidade do valor no editor: quilômetros hoje avançam de 100 em 100 — horas devem avançar de 1 em 1?
- A unidade padrão de um limite novo assume-se ser km para preservar o comportamento atual; confirmar.
