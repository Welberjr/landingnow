# Ciclo contínuo de lua e sol

## Objetivo

Transformar o fundo da home em um ciclo contínuo de noite, amanhecer, dia e
anoitecer. A trajetória deve acompanhar o scroll nos dois sentidos, sem
aparições repentinas, desaparecimentos antecipados ou sobreposição do sol ao
título do capítulo dois.

## Decisão

Lua e sol deixam de compartilhar o mesmo contêiner animado. Cada elemento terá
posição, escala e opacidade próprias. Isso permite a lua descer enquanto o sol
surge, e a lua retornar ao mesmo tempo em que o sol se põe no encerramento.

O movimento será dirigido pelo scroll com `scrub` suavizado; o mesmo ponto do
documento sempre produzirá a mesma cena, inclusive ao rolar de volta.

## Roteiro visual

1. **Capítulo um — noite:** a lua começa alta à direita e desce lentamente até
   passar por trás dos prédios. Ela permanece visível durante essa descida;
   não haverá fade antecipado.
2. **Transição para o capítulo dois — amanhecer:** a lua completa a descida
   enquanto o sol sobe de trás da silhueta de prédios. As duas ações se cruzam
   de forma gradual na transição.
3. **Capítulo dois até provas — dia:** o sol se mantém alto e à esquerda do
   bloco de título, fora de "A página". Ele acompanha o clareamento e continua
   presente ao longo da área de prova/portfólio.
4. **FAQ e encerramento — fim de tarde e noite:** somente nesta etapa o sol
   começa a descer até ficar atrás dos prédios. Em paralelo, a lua sobe do
   horizonte e volta ao céu, fechando o ciclo.

## Limites visuais

- O sol continua sendo o mesmo elemento visual já aprovado; a alteração é
  apenas de trajetória e posição.
- Em desktop, o ponto alto do sol fica no lado esquerdo do título do capítulo
  dois, com margem para não cobrir letras. Em telas menores, a posição é
  recalculada para preservar o conteúdo.
- A cidade fica visualmente à frente dos astros quando eles cruzam o horizonte.
- A experiência mantém a preferência de movimento reduzido já existente, se
  houver, e não adiciona bibliotecas.

## Implementação prevista

- Substituir a sequência que anima `#astro` por sequências independentes para
  `#lua` e `#sol` em `app.js`.
- Remover a sincronização manual que escolhe um único segmento ativo, pois ela
  é a origem da competição entre os dois astros ao rolar de volta.
- Usar funções de coordenadas responsivas e um cálculo único do estado dos
  astros para cada posição do scroll, sem sobreposição contraditória entre as
  fases.
- Atualizar o teste de contrato da home para garantir que a lua e o sol tenham
  trajetórias independentes e que o ciclo inclua o retorno noturno.

## Verificação

1. Rodar o teste direcionado da home e a verificação sintática de `app.js`.
2. Conferir a sequência no navegador, descendo e voltando: noite, amanhecer,
   dia, prova/portfólio, FAQ/encerramento e retorno da noite.
3. Conferir uma largura mobile para assegurar que nenhum astro cubra o texto ou
   desapareça por estado de scroll inconsistente.

## Fora de escopo

Não altera copy, planos, navegação, cidade, cores de fundo, nem publica uma
nova versão no Cloudflare.
