# Série de 10 criativos locais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar 30 PNGs do Plano Pro da LandingNow, com três composições por nicho local.

**Architecture:** Cada nicho gera um conceito visual próprio em feed, quadrado e story/reels. Os arquivos finais ficam em `output/imagegen/` e usam nomes estáveis por nicho e formato.

**Tech Stack:** image_gen integrado, PNG, inspeção visual local.

## Global Constraints

- Promover somente "Plano Pro · R$497", "até 5 seções · copy persuasiva" e "Chamar no WhatsApp".
- Aplicar estética noturna LandingNow e não prometer vendas, leads, ROI, descontos ou urgência falsa.
- Entregar formatos exatos: feed 1080×1350, quadrado 1080×1080 e story/reels 1080×1920.
- Usar objetos e situações próprias de cada nicho, sem pessoas genéricas de banco de imagens.

---

### Task 1: Produzir criativos de clínica/estética e advocacia

**Files:**
- Create: `output/imagegen/landingnow-estetica-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-advocacia-{feed,square,story}.png`

**Interfaces:**
- Consumes: matriz de nichos em `docs/superpowers/specs/2026-08-11-serie-10-criativos-locais-design.md`.
- Produces: seis PNGs com oferta comum e gancho específico de cada público.

- [ ] **Step 1: Gerar e revisar estética**

Criar os três formatos com o gancho "Seu antes e depois merece uma página que convence." e uma janela de agendamento com transformação visual abstrata.

- [ ] **Step 2: Gerar e revisar advocacia**

Criar os três formatos com o gancho "Confiança começa antes da primeira mensagem." e uma cena de documento organizado que conduz à consulta.

- [ ] **Step 3: Verificar e salvar**

Verificar dimensões, leitura de R$497, CTA e a ausência de promessas não aprovadas nos seis arquivos.

### Task 2: Produzir criativos de imobiliária, odontologia e arquitetura

**Files:**
- Create: `output/imagegen/landingnow-imobiliaria-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-odontologia-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-arquitetura-{feed,square,story}.png`

**Interfaces:**
- Consumes: matriz de nichos aprovada.
- Produces: nove PNGs específicos para decisão de imóvel, consulta odontológica e portfólio de arquitetura.

- [ ] **Step 1: Gerar e revisar imobiliária**

Usar o gancho "O imóvel chamou atenção. E depois?" com card de imóvel, visita e conversa de agendamento.

- [ ] **Step 2: Gerar e revisar odontologia**

Usar o gancho "Seu paciente pesquisou. Sua página respondeu?" com agenda, sorriso abstrato e consulta.

- [ ] **Step 3: Gerar e revisar arquitetura**

Usar o gancho "Seu portfólio merece mais do que um link na bio." com prancha arquitetônica e janela de projeto.

- [ ] **Step 4: Verificar e salvar**

Verificar que cada um dos nove arquivos usa uma cena distinta, tem dimensões corretas e oferta completa.

### Task 3: Produzir criativos de restaurante, academia e contabilidade

**Files:**
- Create: `output/imagegen/landingnow-restaurante-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-academia-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-contabilidade-{feed,square,story}.png`

**Interfaces:**
- Consumes: matriz de nichos aprovada.
- Produces: nove PNGs específicos para pedido/reserva, aula experimental e atendimento contábil.

- [ ] **Step 1: Gerar e revisar restaurante**

Usar o gancho "A fome não espera uma página confusa." com card de prato, menu e reserva/pedido.

- [ ] **Step 2: Gerar e revisar academia**

Usar o gancho "A pessoa quer treinar. Facilite o primeiro passo." com ficha de treino e conversa sobre aula experimental.

- [ ] **Step 3: Gerar e revisar contabilidade**

Usar o gancho "Quem procura contador quer clareza, não caça ao botão." com painel simples e checklist.

- [ ] **Step 4: Verificar e salvar**

Verificar que os nove arquivos não repetem cenas, preservam legibilidade e a oferta comum.

### Task 4: Produzir criativos de escolas/cursos e serviços residenciais

**Files:**
- Create: `output/imagegen/landingnow-educacao-{feed,square,story}.png`
- Create: `output/imagegen/landingnow-servicos-residenciais-{feed,square,story}.png`

**Interfaces:**
- Consumes: matriz de nichos aprovada.
- Produces: seis PNGs para matrícula e contato de manutenção residencial.

- [ ] **Step 1: Gerar e revisar educação**

Usar o gancho "A matrícula começa antes do WhatsApp." com calendário de turma e ficha de interesse.

- [ ] **Step 2: Gerar e revisar serviços residenciais**

Usar o gancho "Quando surge uma urgência, a escolha é rápida." com ícone de casa/manutenção e pedido de atendimento.

- [ ] **Step 3: Verificar e salvar**

Verificar os seis arquivos e a contagem final de 30 PNGs na pasta de saída.

### Task 5: Validar e entregar a série

**Files:**
- Modify: `output/imagegen/`

**Interfaces:**
- Consumes: trinta PNGs das tarefas 1 a 4.
- Produces: inventário final de arte por nicho e formato.

- [ ] **Step 1: Validar o inventário**

Contar os 30 PNGs da série e conferir visualmente pelo menos uma versão de cada nicho.

- [ ] **Step 2: Entregar**

Informar a pasta com todos os arquivos, os formatos disponíveis e a matriz de públicos.
