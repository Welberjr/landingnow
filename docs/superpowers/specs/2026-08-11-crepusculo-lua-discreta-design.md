# Transição de crepúsculo com lua discreta

## Objetivo

Suavizar o encontro de lua e sol no fechamento da home. A lua deve estar
presente desde o começo da subida, porém quase imperceptível; o sol continua
predominante e só desaparece no horizonte no fim da transição.

## Comportamento aprovado

- A trajetória dos dois astros não muda.
- Quando o intervalo de pôr do sol começa, a lua inicia com 6% de opacidade.
- A opacidade da lua cresce em curva lenta: permanece fraca enquanto o sol
  ainda está no céu e só ganha presença no terço final da descida.
- Durante a maior parte desse encontro, o sol reduz apenas de 100% para 85% de
  opacidade.
- No trecho final, o sol termina de desaparecer atrás dos prédios e a lua
  chega a 100% de opacidade na posição noturna.

## Implementação e verificação

Ajustar somente a fórmula de opacidade dentro de `syncAstronomy()` em
`app.js`, preservando coordenadas, gatilhos e o movimento já validado. Estender
o teste de contrato da home para registrar a curva de crepúsculo, rodar a suíte
direcionada e conferir visualmente o ponto de sobreposição no desktop e mobile.

## Fora de escopo

Não altera o design do sol ou da lua, cores, copy, sequência de seções ou
publicação.
