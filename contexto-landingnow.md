# Contexto LandingNow - handoff para o Claude Cowork

> Documento de contexto compilado para alimentar o Cowork. Cobre apenas a LandingNow.
> Algumas informacoes (lista de clientes, status de dominios) vem de periodos diferentes e podem ter mudado. Confirme antes de tratar como verdade absoluta. Nao contem senhas nem chaves de API.

## 1. Visao geral
- **LandingNow**: empresa de criacao de landing pages produtizadas.
- Site institucional: **landingnow.com.br**
- CNPJ: **58.080.707/0001-35**
- Socio/fundador: **Welber Moreira de Azevedo Junior** (Brasilia-DF)
- Cogestao: **Carol** (Ana Carolina Ferreira da Silva Azevedo)
- Parceria comercial de revenda: designer **Patricia Forte** (linha "Flash Landing")

## 2. Modelo de negocio e precos
Quatro faixas de plano:
- **Start**: R$ 297 (ate 3 secoes)
- **Pro**: R$ 497
- **Premium**: R$ 997
- **Premium IA**: R$ 1.497

Pagamento: **PIX 50/50** (50% na entrada, 50% na entrega) ou **InfinitePay em ate 12x**.

## 3. Padroes OBRIGATORIOS de landing page (regras fixas)
Todas as paginas devem seguir, salvo pedido expresso do Welber ou do cliente:
- **Nunca usar travessoes** (nem em-dash nem en-dash) em nenhum texto.
- **Hospedagem exclusivamente no Cloudflare** (Cloudflare Pages).
- **Textos justificados.**
- **Titulos no mobile centralizados ou justificados** (o que ficar melhor visualmente).
- **100% responsivo** em Notebook, Desktop, iOS, Android, Tablet e iPad.
- Estetica moderna e inovadora: **cores vivas, alto contraste, cards chamativos**, diferenciais visuais em relacao a concorrencia.
- **Bordas neon fortes com brilho rotativo bem visivel** (nao sutil).
- **Sombras em camadas** para dar profundidade.
- **Grids de cards sempre pares** (2x2, 3x3). No mobile **nunca empilhar em lista** - manter grid de 2 colunas.
- **Menu hamburguer no mobile, sempre.**
- **Maximo de 3 secoes no plano Start (R$ 297).**
- **Nunca incluir "feito por landingnow".**
- **Galeria com scroll horizontal.**

## 4. Estrutura padrao da pagina
- Header com menu de navegacao; hamburguer no mobile sempre.
- **Rodape horizontal** no modelo do landingnow.com.br, com **3 botoes**:
  - **Briefing** -> /briefing
  - **Portfolio** -> /portfolio
  - **Login** -> /painel
- Galeria em scroll horizontal.
- Pagina unica (single page) autossuficiente.

## 5. Stack tecnica e fluxo de deploy
- Cada landing e um **arquivo HTML autossuficiente** com todos os assets (imagens, logos) embutidos em **base64**.
- Hospedagem: **Cloudflare Pages via Wrangler CLI**.
- Conta Cloudflare: **Filmesecia.df@gmail.com**
- Comando de deploy:
  `npx wrangler pages deploy dist --project-name=NOME_DO_PROJETO --commit-dirty=true`
- Site institucional landingnow.com.br: hospedado na **Vercel** (repo GitHub **Welberjr/landingnow**, deploy automatico no push).
- Fluxo de edicao: **Python + PowerShell**. Padroes recorrentes:
  - Remocao de BOM via `path.write_bytes`.
  - Remocao de fundo de logo via `numpy`.
  - Validacao pos-deploy via `urllib.request` / `Invoke-WebRequest` com **cache-bust** (`?v=aleatorio`).
- **Atencao (aprendizado importante):** pastas dentro do **OneDrive podem reverter arquivos no meio das edicoes** (corrida de sincronizacao), quebrando patches silenciosamente. Recomendado **trabalhar numa pasta local fora do OneDrive** e **sincronizar de volta ao final de cada rodada**.
- **Sempre garantir ausencia de travessoes** antes de publicar.

## 6. LIA - chatbot do site
- Modelo: **Claude Sonnet 4.6**.
- Tom **consultivo**. Pergunta direta = resposta direta. **Nao repetir o PIX**.
- Regras de pagamento que a LIA aplica: **PIX 50/50 + InfinitePay 12x**.
- Correcao contra corrupcao de emoji: usar **api.whatsapp.com/send**.

## 7. Painel administrativo (/painel)
- Recursos: briefings, parceiros, notas, dashboard com **deteccao de nicho** e **download em ZIP**.
- Rotas: **/painel** (login), **/briefing**, **/portfolio**.

## 8. Contas e plataformas
- **Cloudflare Pages**: Filmesecia.df@gmail.com
- **Vercel**: welber.especialistadigital@gmail.com (repo landingnow)
- **GitHub**: usuario Welberjr (repo: landingnow)
- **E-mail comercial**: contato@landingnow.com.br (Google Workspace)
- **Netlify** (clientes antigos, antes da padronizacao no Cloudflare): augedetailer.netlify.app, autorodmotors.com.br

**Meta Ads / Facebook Business:**
- Conta de anuncios: Landingnow - ID 2287658172044277
- Portfolio empresarial: Tem de Tudo - ID 850080974068884
- Pagina Facebook: LandingNow - ID 880456748490999
- Instagram: @landingnow.br - ID 17841445105911808
- Pixel: LandingNow - ID 746976351217041
- Dominio verificado: landingnow.com.br
- Campanha ativa: LN - Trafego Site - Brasilia - Pixel - ID 120245630140410373

## 9. Caminhos locais (PC do Welber)
- Projetos de cliente: `C:\Users\welbe\Desktop\[nome-do-projeto]` (ou `C:\Users\welbe\Desktop\clientes-landingnow\[projeto]`)
- Site institucional: `C:\Users\welbe\OneDrive\Documentos\landingnow`
- Config MCP do Claude: `C:\Users\welbe\AppData\Roaming\Claude\claude_desktop_config.json`
- (No notebook da Carol os projetos ficam em `C:\Users\Welber\Desktop\clientes-landingnow\[projeto]` - W maiusculo.)

## 10. Clientes / portfolio
Pagina de portfolio: **landingnow.com.br/portfolio**.
Lista de clientes conhecidos (de periodos diferentes, **nao exaustiva** - confirme quais seguem ativos):
- Auge Detailer (augedetailer.netlify.app) - primeiro cliente
- Autorod Motors (autorodmotors.com.br, Netlify) - DNS pendente em registro anterior
- Marketplace Consultoria / Thiago Coutinho (marketplaceconsultoria.pages.dev)
- Maison Filipeia (maisonfilipeia.pages.dev) - espaco de eventos, Joao Pessoa
- Andrade Veiculos (andrade-veiculos.pages.dev) - Serra/ES
- Erick Nunes (erick-nunes.pages.dev) - gestor de trafego
- Renata Collodetti Arquitetura (renata-collodetti-arquitetura.pages.dev)
- Automalab, Rafael Felix, Solucoes Diesel, Karapina Motos, Daniele Leao (psicologa), Barbearia do Johnn, Dom Feijao, Flash Landing (Patricia Forte)

**Projeto ativo no momento:**
- **Scario Autopecas** - https://scario-autopecas.pages.dev - auto pecas, Osasco-SP, plano **Pro (R$ 297)**. Dominio **scario.com.br ainda nao conectado** no Cloudflare.

## 11. Observacoes de honestidade
- A lista de clientes e o status de dominios refletem momentos diferentes e podem estar desatualizados.
- Nao tenho senhas, tokens nem chaves de API - apenas e-mails de conta e IDs operacionais.
- Qualquer dado que o Cowork for usar para acao (deploy, dominio, cobranca) deve ser confirmado com o Welber.
