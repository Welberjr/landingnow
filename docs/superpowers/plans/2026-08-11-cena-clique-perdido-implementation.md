# Cena Clique Perdido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o painel vazio do capítulo um em uma narrativa visual que mostra o clique perdido antes da conversa no WhatsApp.

**Architecture:** O SVG existente em `#dor` passa a conter anúncio, caminho do clique, cartão de página ausente e WhatsApp sem conversa. O desktop usa a timeline pinada atual para revelar esses estados; o mobile apresenta a composição legível sem depender da animação. O deploy sai do diretório raiz para o projeto Cloudflare Pages existente `landingnow-v3`.

**Tech Stack:** HTML estático, SVG inline, CSS responsivo, GSAP + ScrollTrigger, Python `unittest`, Cloudflare Pages via Wrangler 4.90.0.

## Global Constraints

- Preserve o sol e a narrativa noite-para-dia; não adicionar WebGL, Three.js ou bibliotecas novas.
- O SVG permanece `aria-hidden`; os três beats de texto carregam o conteúdo equivalente.
- Não criar rolagem horizontal; em mobile o painel tem largura máxima de 320 px.
- Cada animação deve ter estados reversíveis para ida e volta no desktop; no mobile os reveals podem ocorrer uma vez.
- Publicar somente após testes locais e verificação visual; alvo Cloudflare Pages: `landingnow-v3`.

---

### Task 1: Contrato da cena de oportunidade perdida

**Files:**
- Modify: `tests/test_home_conversion.py`
- Modify: `index.html:314-337`

**Interfaces:**
- Consumes: `index.html` como página estática e `HomeParser.find_by_class`.
- Produces: teste de regressão e SVG para o caminho anúncio → página ausente → WhatsApp.

- [ ] **Step 1: Write the failing test**

```python
def test_lost_click_scene_shows_the_missing_next_step(self):
    self.assertEqual(len(self.dom.find_by_class("dor-page-missing")), 1)
    self.assertEqual(len(self.dom.find_by_class("dor-click-path")), 1)
    self.assertEqual(len(self.dom.find_by_class("dor-route-break")), 1)
    self.assertIn("Sem uma página, o interesse não encontra um próximo passo.", self.html)
    self.assertIn("0 conversas iniciadas", self.html)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_lost_click_scene_shows_the_missing_next_step -v`

Expected: FAIL because the current SVG contains only `dor-gap-line`, generic `lead` circles and `27 conversas que não aconteceram`.

- [ ] **Step 3: Implement the semantic SVG structure**

Replace the current gap line and falling lead circles inside `.dor-svg` with the classes `dor-click-path`, `dor-click`, `dor-page-missing` and `dor-route-break`. Keep the announcement and WhatsApp chips, change its sublabel to `0 conversas iniciadas`, and set the card warning to `Sem uma página, o interesse não encontra um próximo passo.`

- [ ] **Step 4: Run test to verify it passes**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_lost_click_scene_shows_the_missing_next_step -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/test_home_conversion.py
git commit -m "feat: show lost-click path in chapter one"
```

### Task 2: Dar hierarquia e estados reversíveis ao painel

**Files:**
- Modify: `styles.css:282-315`
- Modify: `app.js:280-348`

**Interfaces:**
- Consumes: `.dor-click-path`, `.dor-click`, `.dor-page-missing`, `.dor-route-break`, `.dor-chip-bottom` e `.dor-counter` criados na Task 1.
- Produces: uma cena SVG que revela anúncio → clique → página ausente → WhatsApp sem conversa e retorna à etapa correspondente durante a rolagem reversa.

- [ ] **Step 1: Write the failing behavior check**

Em um servidor local, carregar a página, posicionar o scroll em `#virada`, retornar para o centro do pin `#dor` e registrar o estado computado. O estado esperado é: `.dor-page-missing` visível, `.dor-route-break` visível e `#sol` com opacidade `0` antes de `#virada`.

- [ ] **Step 2: Run the behavior check to verify the current scene fails it**

Run the local browser reproduction before editing animation code. Expected: the new scene selectors do not exist yet, so the check fails before any style or timeline code is added.

- [ ] **Step 3: Implement CSS and GSAP states**

Add the card, path and break styling in CSS. In desktop `dorTl`, set these scene elements to hidden and reveal path/click with beat 1, page card with beat 2, then broken route and WhatsApp state with beat 3. Use only the existing scrubbed `dorTl` for this panel; do not use infinite loops or independent triggers. In mobile, set the scene visible once the section enters.

- [ ] **Step 4: Run behavior and visual checks**

Run the local browser sequence down and back up. Verify the expected middle state, hero at scroll `0`, no horizontal overflow at desktop and 390 px, and no sun before `#virada`.

- [ ] **Step 5: Commit**

```bash
git add styles.css app.js
git commit -m "feat: animate the lost-click story"
```

### Task 3: Validate and publish to Cloudflare Pages

**Files:**
- No source changes required.

**Interfaces:**
- Consumes: project root containing static site assets and authenticated Wrangler account.
- Produces: a Cloudflare Pages deployment at `landingnow-v3.pages.dev`.

- [ ] **Step 1: Run local checks**

```powershell
node --check app.js
python -B -m unittest tests.test_home_conversion -v
git diff --check
```

Expected: exit code `0` for each command.

- [ ] **Step 2: Deploy the verified root directory**

```powershell
wrangler pages deploy . --project-name=landingnow-v3 --branch=main --commit-dirty=true
```

Expected: Wrangler prints a unique deployment URL and the project URL.

- [ ] **Step 3: Verify the deployed page**

Open the deployment URL with a cache-busting query parameter. Verify the new page card text, `0 conversas iniciadas`, the desktop return-scroll behavior, and a 390 px viewport without overflow.

- [ ] **Step 4: Record the deployment result**

Report the exact deployment URL and whether `landingnow.com.br` is mapped to this Pages project. Do not claim the custom domain changed unless the Pages project lists it.
