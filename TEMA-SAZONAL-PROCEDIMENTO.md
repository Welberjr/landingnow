# Add-on Tema Sazonal Automático — Procedimento de Entrega

Documento operacional pra entregar o produto **Tema Sazonal Automático** (R$ 347, pagamento único) pra um cliente novo da LandingNow. Tempo total estimado: 10 a 15 minutos por cliente.

---

## O que o cliente recebe

1. **Motor de temas no site**: pasta `themes/` com `base.css`, `calendar.js`, `engine.js` e 12 pastas de tema (cada uma com `theme.css` + `decorations.js`)
2. **Edge middleware na Vercel**: `middleware.js` na raiz, que troca meta tags Open Graph automaticamente conforme a data
3. **12 og-images temáticas**: PNG de 1200×630px na raiz do projeto, uma para cada data comemorativa do ano
4. **Janela de tempo automática**: motor entra e sai sozinho nas datas corretas (Carnaval e Páscoa calculados dinamicamente)

Datas cobertas pelos 12 temas:

| Tema | Janela |
|---|---|
| Ano Novo | 26/12 a 02/01 |
| Carnaval | 12 dias antes da Quarta de Cinzas |
| Páscoa | 7 dias antes do Domingo de Páscoa |
| Mães | semana do segundo domingo de maio |
| Namorados | 20/05 a 12/06 |
| Festa Junina | 13/06 a 30/06 |
| Pais | semana do segundo domingo de agosto |
| Independência | 05/09 a 07/09 |
| Crianças | 10/10 a 12/10 |
| Halloween | 25/10 a 31/10 |
| Black Friday | 01/11 a 30/11 |
| Natal | 10/12 a 25/12 |

Fora dessas janelas o site volta ao tema padrão.

---

## Pré-requisitos

- Cliente hospedado na **Vercel** (middleware exige runtime Edge)
- Site servido em **HTML estático** ou framework compatível com Edge Middleware da Vercel
- Acesso ao repositório do cliente (clone local ou GitHub)
- Python 3 + Pillow instalado na máquina (`pip install Pillow numpy`)

Se o cliente está em Cloudflare Pages ou Netlify, o middleware **não funciona**. Migrar pra Vercel é pré-condição.

---

## Procedimento passo a passo

### 1. Clonar o repositório do cliente

```powershell
cd C:\Users\welbe\OneDrive\Documentos
git clone https://github.com/Welberjr/<repo-do-cliente>.git
cd <repo-do-cliente>
```

### 2. Copiar o motor de temas pra dentro do projeto

Copie da LandingNow:

```powershell
$src = "C:\Users\welbe\OneDrive\Documentos\landingnow"
Copy-Item "$src\themes" -Destination .\themes -Recurse
Copy-Item "$src\middleware.js" -Destination .
Copy-Item "$src\og-pipeline.py" -Destination .
```

### 3. Adicionar os 3 scripts do motor no `<head>` do `index.html` do cliente

```html
<link rel="stylesheet" href="/themes/base.css">
<script src="/themes/calendar.js" defer></script>
<script src="/themes/engine.js" defer></script>
```

### 4. Adaptar o pipeline ao cliente

Abra `og-pipeline.py` e ajuste **só** o bloco `CLIENT` no topo:

```python
CLIENT = {
    'name': 'cliente-em-minusculo',       # vira logo na og-image
    'brand_color': (R, G, B),             # cor primaria da marca (RGB tuple)
    'trust_number': '50',                 # numero pro trust signal
    'trust_text_after': 'já confiaram na gente.',
    'out_dir': Path(__file__).parent,
}
```

Os 12 temas continuam funcionando sem mexer em mais nada. Cor da marca é preservada em CTAs e logo, só as decorações sazonais usam a cor accent de cada tema.

### 5. Adaptar o middleware ao domínio do cliente

Abra `middleware.js` e troque a constante `BASE_URL` na linha 90:

```javascript
const BASE_URL = 'https://dominio-do-cliente.com.br';
```

### 6. Gerar as 12 og-images do cliente

```powershell
python og-pipeline.py
```

Saída esperada (~30 segundos):

```
Gerando 12 og-images pra cliente-em-minusculo...
  OK og-image-namorados.png (~125 KB)
  OK og-image-junina.png (~115 KB)
  ...
  OK og-image-blackfriday.png (~120 KB)
Concluido.
```

### 7. Commit + push pra Vercel

```powershell
git add themes/ middleware.js og-pipeline.py og-image-*.png
git commit -m "feat: tema sazonal automatico em 12 datas do ano"
git push origin main
```

Deploy automático na Vercel em ~60 segundos.

### 8. Validar em produção

```powershell
# Substitua pelo dominio do cliente
$d = "https://dominio-do-cliente.com.br"
Invoke-WebRequest "$d/?cb=$(Get-Random)" -UseBasicParsing | Select-Object -ExpandProperty Headers | Format-List 'x-landingnow-theme', 'content-type'
```

Deve retornar `x-landingnow-theme` com o tema da data atual (`default` se não estiver em nenhuma janela).

### 9. Limpar cache do Facebook Debugger (1ª vez só)

Acesse https://developers.facebook.com/tools/debug/?q=`<URL-encoded-do-cliente>` e clique em **"Scrape Again"** duas vezes. Isso garante que o Facebook e Instagram peguem a preview correta.

WhatsApp atualiza cache sozinho em alguns dias por conversa.

---

## Manutenção

**Quando o calendário troca de tema, o que o cliente precisa fazer?** Nada. O middleware da Vercel calcula a janela ativa em cada request, e o motor JS no navegador re-checa a cada 60 segundos. Não há deploy manual, não há cron, não há acompanhamento.

**E se o cliente quiser ver uma preview do tema fora da janela?** Basta acessar com query param: `?theme=halloween`, `?theme=natal`, etc. O motor JS aceita os 12 slugs.

**E se quiser desligar temporariamente?** Adicionar `?theme=default` ou comentar os 3 scripts no `<head>` do `index.html`.

---

## Estrutura final no projeto do cliente

```
projeto-cliente/
├── index.html                  (com 3 tags adicionais no <head>)
├── middleware.js               (BASE_URL ajustado ao dominio)
├── og-pipeline.py              (CLIENT ajustado ao cliente)
├── og-image-namorados.png      (12 PNGs sazonais)
├── og-image-junina.png
├── og-image-maes.png
├── og-image-pais.png
├── og-image-natal.png
├── og-image-anonovo.png
├── og-image-carnaval.png
├── og-image-pascoa.png
├── og-image-independencia.png
├── og-image-criancas.png
├── og-image-halloween.png
├── og-image-blackfriday.png
└── themes/
    ├── base.css
    ├── calendar.js
    ├── engine.js
    ├── namorados/
    │   ├── theme.css
    │   └── decorations.js
    ├── junina/
    │   └── (pendente nos proximos lancamentos)
    └── ...
```

---

## Pendência interna LandingNow

O motor de temas no **site** atualmente só tem `theme.css` + `decorations.js` completos pro tema **Namorados**. Os outros 11 temas têm og-image, middleware e calendário funcionando, mas o tratamento visual "agressivo" do site (mudança de hero, cards, copy temático) ainda só está implementado pra Namorados.

Próximos a serem construídos por ordem cronológica do ano: **Festa Junina** (entra 13/06, prazo curto), Pais (agosto), Independência (setembro), Crianças (outubro), Halloween (outubro), Black Friday (novembro), Natal (dezembro), Ano Novo (dezembro), Carnaval (fevereiro), Páscoa (variável), Mães (maio).

O add-on pode ser vendido agora — o cliente recebe motor + middleware + 12 og-images temáticas funcionando. O tratamento visual completo de cada tema do site é entregue conforme cada data se aproxima ao longo do ano.
