# Criativo de feed Plano Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir um criativo estático 1080×1350 para o feed do Instagram, promovendo o Plano Pro da LandingNow por R$497.

**Architecture:** Uma única imagem raster, gerada a partir do conceito aprovado "Clique sem destino". A inspeção visual verifica legibilidade, composição vertical e presença da oferta antes da entrega.

**Tech Stack:** image_gen integrado, PNG.

## Global Constraints

- Usar a identidade noturna da LandingNow, com azul profundo, roxo e amarelo quente.
- Inserir somente os textos aprovados: "Seu anúncio trouxe o clique. E depois?", "A Landing Pro transforma interesse em conversa.", "Plano Pro · R$497", "até 5 seções · copy persuasiva" e "Chamar no WhatsApp".
- Não prometer vendas, leads ou retorno financeiro.
- Não usar urgência falsa, desconto inexistente ou visual genérico de template.

---

### Task 1: Gerar e validar o criativo de feed

**Files:**
- Create: `output/imagegen/landingnow-plano-pro-feed.png`

**Interfaces:**
- Consumes: conceito e texto definidos em `docs/superpowers/specs/2026-08-11-criativo-feed-plano-pro-design.md`.
- Produces: PNG vertical pronto para feed do Instagram.

- [ ] **Step 1: Gerar a arte raster**

Usar o gerador de imagem integrado com formato vertical 1080×1350 e o conceito "Clique sem destino". Priorizar hierarquia tipográfica, contraste e espaço respirável para o texto aprovado.

- [ ] **Step 2: Inspecionar a saída**

Verificar se headline, oferta de R$497 e CTA estão legíveis; confirmar que o percurso anúncio → página → WhatsApp está visualmente compreensível e que não existem promessas não aprovadas.

- [ ] **Step 3: Salvar a entrega final**

Copiar a versão aprovada para `output/imagegen/landingnow-plano-pro-feed.png`, sem sobrescrever outros ativos.

- [ ] **Step 4: Entregar**

Exibir a arte no chat e informar o caminho do PNG e o prompt usado.
