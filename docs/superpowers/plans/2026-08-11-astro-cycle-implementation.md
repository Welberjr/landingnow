# Ciclo Contínuo de Lua e Sol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer lua e sol seguirem trajetórias independentes e contínuas, sincronizadas ao scroll em ambos os sentidos.

**Architecture:** A camada `#astro` continuará apenas como agrupador visual, sem receber transformações. Um único `syncAstronomy()` calcula as propriedades independentes de `#lua` e `#sol` para cada posição do scroll: noite, amanhecer, dia e encerramento. Assim, nenhum tween futuro reaplica um estado inicial fora de sua fase e os dois astros podem se cruzar no horizonte.

**Tech Stack:** HTML estático, CSS, JavaScript ES5, GSAP 3 e ScrollTrigger; testes `unittest` em Python.

## Global Constraints

- Manter o mesmo sol, cidade, cores e texto já aprovados.
- Não adicionar dependências ou publicar no Cloudflare.
- Respeitar `prefers-reduced-motion`: a saída estática permanece inalterada.
- Usar coordenadas responsivas e manter o sol fora do título do capítulo dois em desktop.
- Preservar os arquivos não relacionados já presentes no diretório de trabalho.

---

### Task 1: Cobrir o contrato da nova arquitetura dos astros

**Files:**
- Modify: `tests/test_home_conversion.py`

**Interfaces:**
- Consumes: `app.js` como conteúdo de texto e a estrutura existente de `HomeConversionContractTests`.
- Produces: `test_astronomy_uses_independent_sun_and_moon_cycles`, que protege a separação de transformações e as fases de amanhecer/retorno.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `HomeConversionContractTests`:

```python
def test_astronomy_uses_independent_sun_and_moon_cycles(self):
    self.assertIn("gsap.set('#lua'", self.js)
    self.assertIn("gsap.set('#sol'", self.js)
    self.assertIn("function moonSetX()", self.js)
    self.assertIn("function sunDayX()", self.js)
    self.assertIn("trigger: '#fim'", self.js)
    self.assertNotIn("var astroSegs = []", self.js)
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_astronomy_uses_independent_sun_and_moon_cycles -v`

Expected: FAIL porque a implementação atual só posiciona `#astro` e usa `astroSegs`.

- [ ] **Step 3: Manter o teste como guarda de regressão**

Não relaxar as asserções após a implementação: elas comprovam a separação de responsabilidade que evita o conflito do scroll reverso.

- [ ] **Step 4: Rodar o teste novamente após a implementação**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_astronomy_uses_independent_sun_and_moon_cycles -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/test_home_conversion.py app.js
git commit -m "fix: synchronize independent sun and moon cycle"
```

### Task 2: Implementar as trajetórias independentes e determinísticas

**Files:**
- Modify: `app.js: bloco "O ASTRO"`

**Interfaces:**
- Consumes: `vw`, `vh`, `#dor`, `#virada`, `#oferta`, `#quem`, `#final`, `#fim`, `#lua`, `#sol` e ScrollTrigger, todos existentes.
- Produces: funções responsivas `moonStartX`, `moonSetX`, `sunRiseX`, `sunDayX` e ScrollTriggers independentes para lua e sol.

- [ ] **Step 1: Substituir o estado compartilhado por estados iniciais independentes**

Remover `astroSegs`, `placeAstro`, `sceneBounds`, `between`, `syncAstroState` e o `ScrollTrigger.create` global desse bloco. Definir as coordenadas como funções e inicializar:

```javascript
gsap.set('#lua', { x: moonStartX(), y: moonStartY(), opacity: 1, scale: 1 });
gsap.set('#sol', { x: sunRiseX(), y: sunHorizonY(), opacity: 0, scale: 1 });
```

- [ ] **Step 2: Criar o cálculo determinístico da lua**

Medir as seções `#dor`, `#virada`, `#faq` e `#fim`, e usar `progressBetween()` para levar a lua da posição noturna até `y: vh(1.08)` durante o capítulo um. Reduzir a opacidade apenas nos 8% finais da descida, quando ela já está abaixo da linha dos prédios.

- [ ] **Step 3: Criar o cálculo determinístico do sol**

Usar o mesmo cálculo para fazer o sol nascer entre `#virada` entrar na viewport e atingir o topo. Ao fim da subida, posicioná-lo em `sunDayX()`/`sunDayY()`, à esquerda do título em desktop, mantendo-o visível até o FAQ.

- [ ] **Step 4: Fazer pôr do sol e retorno da lua no fechamento**

Iniciar o encerramento quando `#faq` cruza 65% da viewport e terminar no fim de `#fim`. Nesse mesmo progresso, mover o sol até `y: vh(1.08)` e reduzir sua opacidade, enquanto a lua faz o caminho inverso até sua posição noturna e recupera a opacidade. Conectar `syncAstronomy()` a um único ScrollTrigger global e ao refresh.

- [ ] **Step 5: Verificar sintaxe**

Run: `node --check app.js`

Expected: exit code 0.

### Task 3: Verificar o comportamento completo

**Files:**
- Verify: `app.js`, `index.html`, `styles.css`, `tests/test_home_conversion.py`

**Interfaces:**
- Consumes: implementação dos tasks 1 e 2 e servidor estático local.
- Produces: evidência de que o ciclo percorre e reverte entre as fases sem sumiço do astro.

- [ ] **Step 1: Rodar a suíte da home**

Run: `python -B -m unittest tests.test_home_conversion -v`

Expected: todas as verificações passam, incluindo o contrato do ciclo independente.

- [ ] **Step 2: Rodar validação estática**

Run: `git diff --check && node --check app.js`

Expected: exit code 0 para ambos os comandos.

- [ ] **Step 3: Conferir visualmente no navegador**

Abrir o servidor local e verificar desktop e mobile no percurso descendente e ascendente: lua no capítulo um, cruzamento no amanhecer, sol à esquerda no capítulo dois, sol visível na prova/portfólio, pôr do sol e retorno da lua no fim.

- [ ] **Step 4: Confirmar escopo do commit**

Run: `git status --short`

Expected: somente os arquivos do ciclo são commitados; criativos e arquivos temporários preexistentes continuam fora do commit.
