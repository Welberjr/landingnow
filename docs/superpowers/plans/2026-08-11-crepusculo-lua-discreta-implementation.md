# Transição de Crepúsculo com Lua Discreta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a lua ganhar presença lentamente durante o pôr do sol, preservando a predominância visual do sol até o horizonte.

**Architecture:** `syncAstronomy()` já calcula o progresso único de `sunset` para os dois astros. O plano substitui apenas as fórmulas lineares de opacidade por curvas determinísticas: a lua começa em 6% e acelera no fim; o sol fica entre 100% e 85% até a fase final, quando completa o desaparecimento.

**Tech Stack:** JavaScript ES5, GSAP 3/ScrollTrigger e testes `unittest` em Python.

## Global Constraints

- Não alterar coordenadas, gatilhos, cidade, cores, copy ou publicação.
- Lua: 6% no início do pôr do sol; 100% somente no fim.
- Sol: entre 100% e 85% durante a maior parte da sobreposição; 0% apenas ao desaparecer atrás dos prédios.
- Manter cálculo determinístico nos dois sentidos do scroll.
- Preservar os arquivos locais não relacionados.

---

### Task 1: Proteger o contrato da curva de crepúsculo

**Files:**
- Modify: `tests/test_home_conversion.py`

**Interfaces:**
- Consumes: conteúdo de `app.js` em `self.js`.
- Produces: `test_astronomy_uses_a_subtle_moon_dusk_curve`, que impede o retorno à opacidade linear entre lua e sol.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `HomeConversionContractTests`:

```python
def test_astronomy_uses_a_subtle_moon_dusk_curve(self):
    self.assertIn("var moonDuskOpacity = 0.06 + 0.94 * Math.pow(sunset, 2.4);", self.js)
    self.assertIn("var sunDuskOpacity = 1 - sunset * 0.15;", self.js)
    self.assertIn("sunOpacity = sunDuskOpacity", self.js)
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_astronomy_uses_a_subtle_moon_dusk_curve -v`

Expected: FAIL porque `syncAstronomy()` ainda usa diretamente `sunset` e `1 - sunset`.

- [ ] **Step 3: Rodar o teste após a implementação**

Run: `python -B -m unittest tests.test_home_conversion.HomeConversionContractTests.test_astronomy_uses_a_subtle_moon_dusk_curve -v`

Expected: PASS.

### Task 2: Aplicar as curvas de opacidade

**Files:**
- Modify: `app.js:161-183`

**Interfaces:**
- Consumes: `sunset`, obtido por `progressBetween()` em `syncAstronomy()`.
- Produces: `moonDuskOpacity` e `sunDuskOpacity`, usados quando `sunset > 0`.

- [ ] **Step 1: Calcular a presença inicial e o ganho tardio da lua**

Logo após calcular `moonFade`, acrescentar:

```javascript
var moonDuskOpacity = 0.06 + 0.94 * Math.pow(sunset, 2.4);
var sunDuskOpacity = 1 - sunset * 0.15;
```

`Math.pow(sunset, 2.4)` mantém a lua quase imperceptível no começo e faz o ganho de presença acontecer no terço final.

- [ ] **Step 2: Trocar apenas as opacidades da sobreposição**

No bloco `if (sunset > 0)`, substituir:

```javascript
moonOpacity = sunset;
sunOpacity = 1 - sunset;
```

por:

```javascript
moonOpacity = moonDuskOpacity;
sunOpacity = sunDuskOpacity;
```

Depois do bloco, incluir o mergulho final do sol apenas no último 18% do percurso:

```javascript
if (sunset > 0.82) {
  sunOpacity = sunDuskOpacity * (1 - progressBetween(sunset, 0.82, 1));
}
```

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check app.js`

Expected: exit code 0.

### Task 3: Verificar regressão e a transição visual

**Files:**
- Verify: `app.js`, `tests/test_home_conversion.py`

**Interfaces:**
- Consumes: curva de opacidade do task 2 e servidor estático local.
- Produces: evidência automatizada e visual da sobreposição suave.

- [ ] **Step 1: Rodar a suíte direcionada**

Run: `python -B -m unittest tests.test_home_conversion -v`

Expected: todos os testes passam.

- [ ] **Step 2: Rodar validação estática**

Run: `git diff --check && node --check app.js`

Expected: exit code 0.

- [ ] **Step 3: Conferir visualmente em desktop e mobile**

No início do pôr do sol, confirmar a lua com aproximadamente 6% de opacidade e o sol próximo de 100%. No meio, confirmar a lua ainda discreta e o sol com no mínimo 85%. No final, confirmar lua a 100% e sol atrás dos prédios. Repetir o trajeto em sentido inverso.

- [ ] **Step 4: Commit**

```bash
git add app.js tests/test_home_conversion.py
git commit -m "fix: soften moon and sun dusk handoff"
```
