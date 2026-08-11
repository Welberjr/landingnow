# Cena "Clique perdido" — Capítulo um

## Objetivo

Fazer o visitante entender, em poucos segundos, que o anúncio pode gerar interesse, mas a venda não avança sem uma página que explique, prove e direcione para a conversa.

## Mensagem

"O anúncio trouxe o clique. A página é que transforma interesse em conversa."

O foco não é o valor desperdiçado no anúncio. É a oportunidade perdida porque o interesse não encontra um próximo passo claro.

## Composição visual

No painel direito do capítulo um, substituir o espaço vazio por uma sequência vertical:

1. Chip "Seu anúncio" no topo.
2. Um clique/cursor percorre uma linha pontilhada de intenção.
3. Um cartão "Sua página" aparece vazio, com o aviso "Sem uma página, o interesse não encontra um próximo passo."
4. A linha se rompe antes do chip "Seu WhatsApp".
5. O WhatsApp permanece sem mensagem e o contador mostra "0 conversas iniciadas".

O painel deve usar os mesmos tons noturnos, tipografia mono e acento coral já presentes na cena. O cartão vazio é o ponto de tensão; não serão adicionadas imagens decorativas ou efeitos 3D.

## Texto do capítulo

Manter a estrutura de três beats, refinando-os para acompanhar a sequência:

1. "O anúncio funciona. O clique acontece."
2. "Mas o clique não encontra um próximo passo."
3. "E a conversa que podia começar nunca chega."

O primeiro beat confirma o investimento. O segundo identifica a ausência da página como bloqueio. O terceiro torna a consequência visível no WhatsApp vazio.

## Movimento e retorno de scroll

No desktop pinado, os beats e o painel avançam na mesma ordem: anúncio, clique, página ausente, conversa interrompida. No mobile, cada etapa revela uma vez quando entra na viewport.

As animações precisam ter estado inicial e final explícitos. Nenhum elemento do painel pode depender de repetição infinita, de `fromTo` concorrente ou de um valor deixado por uma cena posterior. Ao subir a página, cursor, linha, cartão, WhatsApp e contador devem retornar ao estado correspondente à posição atual do scroll.

## Responsividade e acessibilidade

- O SVG continua `aria-hidden`, pois o argumento completo está nos beats de texto.
- Em telas pequenas, preservar largura máxima de 320 px e contraste legível.
- A composição não pode criar rolagem horizontal.
- Com movimento reduzido, o painel permanece totalmente legível sem depender da animação.

## Verificação

1. Validar o texto e a estrutura do SVG em teste de contrato.
2. Verificar desktop e mobile sem overflow horizontal.
3. Percorrer o capítulo para baixo e para cima e conferir que cada etapa volta ao estado correto.
4. Reexecutar os testes existentes e a checagem sintática do JavaScript.
