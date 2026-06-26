// ROI CALCULATOR (somente ticket + meta)
const ticket = document.getElementById('ticket');
const goal = document.getElementById('goal');
const roiEyebrow = document.getElementById('roiEyebrow');
const roiTitle = document.getElementById('roiTitle');
const roiClientsValue = document.getElementById('roiClientsValue');
const roiPayback = document.getElementById('roiPayback');
const roiNarrative = document.getElementById('roiNarrative');
const ticketHint = document.getElementById('ticketHint');
const goalHint = document.getElementById('goalHint');

function formatNumber(n) { return n.toLocaleString('pt-BR'); }

function calculate() {
  let ticketVal = parseInt(ticket.value);
  let goalVal = parseInt(goal.value);

  if (!ticketVal || ticketVal < 10) {
    ticketHint.textContent = '⚠ Ticket mínimo de R$ 10 pra calcular';
    ticketHint.classList.add('visible');
    ticketVal = 10;
  } else { ticketHint.classList.remove('visible'); }

  if (!goalVal || goalVal < 500) {
    goalHint.textContent = '⚠ Meta mínima de R$ 500 pra calcular';
    goalHint.classList.add('visible');
    goalVal = 500;
  } else { goalHint.classList.remove('visible'); }

  const clientsNeeded = Math.ceil(goalVal / ticketVal);
  const paybackSales = Math.ceil(497 / ticketVal);

  roiEyebrow.textContent = '// PROJEÇÃO DA SUA META';
  roiTitle.innerHTML = `Pra bater sua meta, você precisa fechar <em>${formatNumber(clientsNeeded)} ${clientsNeeded === 1 ? 'cliente' : 'clientes'}</em> por mês.`;
  roiClientsValue.textContent = formatNumber(clientsNeeded);
  roiPayback.textContent = paybackSales;

  let strategy;
  if (clientsNeeded <= 5) {
    strategy = 'Com tráfego pago bem direcionado e uma boa landing, esse volume é totalmente possível.';
  } else if (clientsNeeded <= 30) {
    const perWeek = Math.ceil(clientsNeeded / 4);
    strategy = `Isso dá cerca de <span class="highlight">${perWeek} ${perWeek === 1 ? 'cliente novo por semana' : 'clientes novos por semana'}</span>. Com landing profissional + tráfego pago + atendimento ágil, é uma meta viável.`;
  } else if (clientsNeeded <= 100) {
    const perDay = Math.ceil(clientsNeeded / 30);
    strategy = `Em média <span class="highlight">${perDay} ${perDay === 1 ? 'cliente por dia' : 'clientes por dia'}</span>. Pra esse volume, a combinação landing + tráfego pago consistente + processo de atendimento bem estruturado é essencial.`;
  } else {
    const perDay = Math.ceil(clientsNeeded / 30);
    strategy = `São cerca de <span class="highlight">${perDay} clientes por dia</span>. Esse volume exige tráfego escalável, time de atendimento e operação afinada. A landing é o primeiro passo.`;
  }

  roiNarrative.innerHTML = `Pra bater <strong>R$ ${formatNumber(goalVal)}</strong> de meta, com ticket médio de <strong>R$ ${formatNumber(ticketVal)}</strong>, são necessárias <span class="highlight">${formatNumber(clientsNeeded)} ${clientsNeeded === 1 ? 'venda' : 'vendas'} por mês</span>. ${strategy}`;
}

ticket.addEventListener('input', calculate);
goal.addEventListener('input', calculate);

calculate();

// FAQ
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('click', () => {
    item.classList.toggle('open');
  });
});

// Reveal on scroll - apply to main content sections
(() => {
  // Skip if user prefers reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Targets: section headers, key cards, founder content, etc.
  const selectors = [
    '.cases-section .section-header',
    '.cases-section .cases-cta',
    '.roi-section .section-header',
    '.roi-section .roi-controls',
    '.roi-section .roi-result',
    '.pricing-section .section-header',
    '.price-card',
    '.custom-card',
    '.founder-image',
    '.founder-content',
    '.how-section .section-label',
    '.how-section h2',
    '.step',
    '.faq-section .section-header',
    '.faq-item',
    '.final-cta-content',
  ];

  const elements = document.querySelectorAll(selectors.join(','));
  elements.forEach(el => el.classList.add('reveal'));

  if (!('IntersectionObserver' in window)) {
    // Fallback: show all immediately
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0,
    rootMargin: '0px 0px 60px 0px'
  });

  elements.forEach(el => observer.observe(el));

  // Rede de seguranca: revela tudo apos 2.5s caso o observer nao dispare (ex.: secoes altas no mobile)
  setTimeout(function () {
    elements.forEach(function (el) { el.classList.add('is-visible'); });
  }, 2500);
})();
;
(function() {
  const MAX_USER_MESSAGES = 12;
  const WHATSAPP_URL = 'https://wa.me/5561985970300';
  const WPP_SVG = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>';

  const bubble = document.getElementById('liaBubble');
  const bubbleDot = document.getElementById('liaBubbleDot');
  const windowEl = document.getElementById('liaWindow');
  const closeBtn = document.getElementById('liaClose');
  const messagesEl = document.getElementById('liaMessages');
  const input = document.getElementById('liaInput');
  const sendBtn = document.getElementById('liaSend');

  let messages = [];
  let loading = false;
  let userMessageCount = 0;

  const greeting = 'Oi! Sou a Lia, atendimento virtual da landingnow ✨ Posso te ajudar com dúvidas sobre planos, prazos ou recomendar a opção ideal pro seu negócio. O que você quer saber?';

  function makePlanChip(name) {
    const span = document.createElement('span');
    const lower = name.toLowerCase();
    span.className = 'lia-plan-chip ' + (lower === 'start' ? 'start' : lower === 'pro' ? 'pro' : 'premium');
    span.textContent = name;
    return span;
  }

  function makePriceTag(text) {
    const span = document.createElement('span');
    span.className = 'lia-price';
    span.textContent = text;
    return span;
  }

  function appendRichText(parent, text) {
    if (!text) return;
    const richRegex = /(?:\b(START|PRO|PREMIUM)\b)|(R\$\s?[\d.]+(?:,\d{2})?)|\*\*([^*]+?)\*\*/g;
    let lastIdx = 0;
    let m;
    while ((m = richRegex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        parent.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      }
      if (m[1]) {
        parent.appendChild(makePlanChip(m[1]));
      } else if (m[2]) {
        parent.appendChild(makePriceTag(m[2]));
      } else if (m[3]) {
        const strong = document.createElement('strong');
        strong.textContent = m[3];
        parent.appendChild(strong);
      }
      lastIdx = richRegex.lastIndex;
    }
    if (lastIdx < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
  }

  function renderMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'lia-msg lia-msg-' + (role === 'user' ? 'user' : 'bot');
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'lia-msg-bubble';

    if (role === 'user') {
      bubbleEl.appendChild(document.createTextNode(content));
      div.appendChild(bubbleEl);
      messagesEl.appendChild(div);
      scrollToBottom();
      return;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    parts.forEach(part => {
      if (urlRegex.test(part)) {
        if (part.includes('wa.me')) {
          const a = document.createElement('a');
          a.href = part;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'lia-link-wpp';
          a.innerHTML = WPP_SVG + ' Abrir WhatsApp';
          bubbleEl.appendChild(a);
        } else {
          const a = document.createElement('a');
          a.href = part;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = part;
          bubbleEl.appendChild(a);
        }
      } else if (part) {
        appendRichText(bubbleEl, part);
      }
    });

    div.appendChild(bubbleEl);
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function renderLeadCard(waLink, leadName) {
    const div = document.createElement('div');
    div.className = 'lia-msg lia-msg-bot';
    div.style.maxWidth = '95%';

    const card = document.createElement('div');
    card.className = 'lia-lead-card';

    const title = document.createElement('div');
    title.className = 'lia-lead-card-title';
    const dot = document.createElement('span');
    dot.className = 'lia-lead-card-title-dot';
    title.appendChild(dot);
    const titleText = document.createElement('span');
    titleText.textContent = leadName ? ('Pronto, ' + leadName + '! Bora falar com o Welber.') : 'Pronto! Bora falar com o Welber.';
    title.appendChild(titleText);

    const sub = document.createElement('div');
    sub.className = 'lia-lead-card-sub';
    sub.textContent = 'Toca no botao abaixo. Ja vai abrir o WhatsApp com a mensagem pronta, sem precisar reescrever nada.';

    const link = document.createElement('a');
    link.href = waLink;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'lia-link-wpp';
    link.innerHTML = WPP_SVG + ' Abrir WhatsApp com mensagem pronta';

    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(link);
    div.appendChild(card);
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function renderTyping() {
    const div = document.createElement('div');
    div.className = 'lia-msg lia-msg-bot';
    div.id = 'liaTyping';
    div.innerHTML = '<div class="lia-msg-bubble lia-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('liaTyping');
    if (el) el.remove();
  }

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function showLimitWarning() {
    const div = document.createElement('div');
    div.className = 'lia-limit-warning';
    const link = '<a href="' + WHATSAPP_URL + '?text=Ol%C3%A1!%20Conversei%20com%20a%20Lia%20e%20quero%20continuar%20com%20voc%C3%AA" target="_blank" rel="noopener noreferrer" class="lia-link-wpp" style="margin-top: 10px;">' + WPP_SVG + ' Abrir WhatsApp</a>';
    div.innerHTML = '<strong>Limite de mensagens atingido.</strong><br>Continua direto com o Welber:<br>' + link;
    messagesEl.appendChild(div);
    scrollToBottom();
    input.disabled = true;
    sendBtn.disabled = true;
    input.placeholder = 'Limite atingido, fale com o Welber';
  }

  async function sendMessage() {
    const trimmed = input.value.trim();
    if (!trimmed || loading || userMessageCount >= MAX_USER_MESSAGES) return;

    messages.push({ role: 'user', content: trimmed });
    renderMessage('user', trimmed);
    userMessageCount++;
    input.value = '';
    loading = true;
    sendBtn.disabled = true;
    input.disabled = true;

    renderTyping();

    try {
      const res = await fetch('/api/lia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages })
      });

      const data = await res.json();
      removeTyping();

      if (!res.ok) {
        const errorMsg = data.error || 'Algo deu errado. Tenta de novo ou fala com o Welber: ' + WHATSAPP_URL;
        messages.push({ role: 'assistant', content: errorMsg });
        renderMessage('assistant', errorMsg);
      } else {
        if (data.reply) {
          messages.push({ role: 'assistant', content: data.reply });
          renderMessage('assistant', data.reply);
        }
        if (data.waLink) {
          const leadName = (data.lead && data.lead.nome) ? data.lead.nome.split(' ')[0] : '';
          renderLeadCard(data.waLink, leadName);
        }
      }
    } catch (e) {
      removeTyping();
      const errorMsg = 'Não consegui conectar agora. Fala direto com o Welber: ' + WHATSAPP_URL;
      messages.push({ role: 'assistant', content: errorMsg });
      renderMessage('assistant', errorMsg);
    } finally {
      loading = false;
      if (userMessageCount >= MAX_USER_MESSAGES) {
        showLimitWarning();
      } else {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }
  }

  function isMobile() { return window.matchMedia('(max-width: 480px)').matches; }
  let savedScrollY = 0;

  bubble.addEventListener('click', function() {
    bubble.style.display = 'none';
    windowEl.classList.add('open');
    if (isMobile()) {
      savedScrollY = window.scrollY;
      document.body.style.top = '-' + savedScrollY + 'px';
      document.body.classList.add('lia-open-mobile');
    }
    if (messages.length === 0) {
      messages.push({ role: 'assistant', content: greeting });
      renderMessage('assistant', greeting);
    }
    setTimeout(function() { input.focus({ preventScroll: true }); }, 300);
  });

  function closeChat() {
    windowEl.classList.remove('open');
    bubble.style.display = 'inline-flex';
    bubbleDot.style.display = 'none';
    if (document.body.classList.contains('lia-open-mobile')) {
      document.body.classList.remove('lia-open-mobile');
      document.body.style.top = '';
      window.scrollTo(0, savedScrollY);
    }
  }

  closeBtn.addEventListener('click', closeChat);

  // Permite fechar com tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && windowEl.classList.contains('open')) {
      closeChat();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
;
(function() {
  var PLANS = {
    'start': {
      name: 'Plano Start',
      title: 'Pra começar com presença online.',
      price: 'R$ 297 <span>Pix · 50% início, 50% entrega</span>',
      cta: 'https://wa.me/5561985970300?text=Ol%C3%A1!%20Quero%20o%20plano%20Start%20de%20R%24%20297',
      included: [
        'Landing até 3 seções',
        'Entrega em até 72h após pagamento + briefing',
        'Logo + 3 imagens enviadas por você (sem vídeo)',
        'Botão direto pro WhatsApp',
        '100% otimizada pra mobile',
        'SEO otimizado, mínimo 80%',
        '1 rodada de revisão inclusa',
        '7 dias de suporte grátis pós-entrega'
      ],
      excluded: [
        'Hospedagem e domínio (por sua conta, ou minha hospedagem por R$ 10/mês ou R$ 100/ano)',
        'Copy persuasiva reescrita pela equipe',
        'Formulário de contato integrado',
        'Tratamento de imagens ou edição de vídeo (você seleciona e envia)',
        'Chatbot de IA na landing',
        'Tema sazonal automático (serviço à parte, R$ 1.499 em até 10x)'
      ]
    },
    'pro': {
      name: 'Plano Pro',
      title: 'Pra vender de verdade.',
      price: 'R$ 497 <span>Pix · 50% início, 50% entrega</span>',
      cta: 'https://wa.me/5561985970300?text=Ol%C3%A1!%20Quero%20o%20plano%20Pro%20de%20R%24%20497',
      included: [
        'Tudo do plano Start, e mais:',
        'Landing completa, até 5 seções',
        'Entrega em até 5 dias úteis',
        'Domínio próprio configurado (você registra o .com.br)',
        'Copy persuasiva reescrita pela equipe',
        'Identidade visual aplicada com refinamento',
        'Logo + 5 imagens enviadas por você (sem vídeo)',
        'SEO otimizado, mínimo 90%',
        'Google Tag ID e Conversion Label (Google Ads)',
        '3 rodadas de revisão inclusas'
      ],
      excluded: [
        'Meta Pixel (este plano usa Google Ads, não dá pra trocar por Meta)',
        'Hospedagem (opcional comigo por R$ 10/mês ou R$ 100/ano)',
        'Formulário de contato integrado',
        'Página de obrigado',
        'Tratamento de imagens ou edição de vídeo (você seleciona e envia)',
        'Tema sazonal automático (serviço à parte, R$ 1.499 em até 10x)'
      ]
    },
    'premium': {
      name: 'Plano Premium',
      title: 'Pra crescer no próximo nível.',
      price: 'R$ 997 <span>Pix · 50% início, 50% entrega</span>',
      cta: 'https://wa.me/5561985970300?text=Ol%C3%A1!%20Quero%20o%20plano%20Premium%20de%20R%24%20997',
      included: [
        'Tudo do plano Pro, e mais:',
        'Landing premium, até 7 seções',
        'Entrega em até 7 dias úteis',
        'Design diferenciado com animações sutis',
        'Copy estratégica com narrativa completa',
        'Logo + 10 imagens e 2 vídeos enviados por você',
        'Formulário avançado (Web3Forms, 250 formulários por mês)',
        'Página de obrigado personalizada',
        'Seção de depoimentos + FAQ com accordion',
        'SEO 100% e desempenho acima de 85%',
        'Google Ads (Tag e Conversion Label) + Meta Pixel',
        'Hospedagem e domínio grátis por 1 ano',
        '5 rodadas de revisão inclusas'
      ],
      excluded: [
        'Chatbot de IA integrado na landing',
        'Qualificação e captura automática de leads por IA',
        'Tratamento de imagens ou edição de vídeo (você seleciona e envia)',
        'Tema sazonal automático (serviço à parte, R$ 1.499 em até 10x)'
      ]
    },
    'premium-ia': {
      name: 'Plano Premium IA',
      title: 'Pra capturar leads dormindo.',
      price: 'R$ 1.497 <span>Pix · 50% início, 50% entrega</span>',
      cta: 'https://wa.me/5561985970300?text=Ol%C3%A1!%20Quero%20o%20plano%20Premium%20IA%20de%20R%24%201.497',
      included: [
        'Tudo do plano Premium, e mais:',
        'Entrega em até 10 dias úteis',
        'IA integrada na landing (chatbot 24h por dia)',
        'Modelo Claude Haiku 4.5 da Anthropic',
        'Personalidade e treinamento da IA pela equipe',
        'Fluxo de qualificação (triagem antes do humano)',
        'Captura de leads pela IA, enviados por e-mail',
        '1ª recarga de créditos da IA inclusa',
        'Revisões livres dentro do prazo de 10 dias',
        'Hospedagem, domínio e e-mail personalizado grátis por 1 ano',
        '14 dias de suporte grátis (suporte estendido)'
      ],
      excluded: [
        'Após 1 ano: hospedagem e e-mail por R$ 20/mês',
        'Recargas de crédito da IA a partir do 2º mês',
        'Projetos sob orçamento (SaaS, login, dashboard)',
        'Tema sazonal automático (serviço à parte, R$ 1.499 em até 10x)'
      ]
    }
  };

  var overlay = document.getElementById('planModal');
  if (!overlay) return;
  var elName = document.getElementById('planModalName');
  var elTitle = document.getElementById('planModalTitle');
  var elPrice = document.getElementById('planModalPrice');
  var elIncluded = document.getElementById('planModalIncluded');
  var elExcluded = document.getElementById('planModalExcluded');
  var elCta = document.getElementById('planModalCta');
  var elClose = document.getElementById('planModalClose');

  function fill(listEl, items) {
    listEl.innerHTML = '';
    items.forEach(function(txt) {
      var li = document.createElement('li');
      li.textContent = txt;
      listEl.appendChild(li);
    });
  }

  function openModal(key) {
    var p = PLANS[key];
    if (!p) return;
    elName.textContent = p.name;
    elTitle.textContent = p.title;
    elPrice.innerHTML = p.price;
    fill(elIncluded, p.included);
    fill(elExcluded, p.excluded);
    elCta.href = p.cta;
    overlay.classList.add('open');
    overlay.removeAttribute('inert');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('inert', '');
    document.body.classList.remove('modal-open');
  }

  document.querySelectorAll('.price-details-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      openModal(btn.getAttribute('data-plan'));
    });
  });

  elClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
})();

// HERO: palavra que troca + mockup cross-fade
(function(){
  var w=document.getElementById('heroWord');
  if(w){var words=['vende','agenda','fecha'],i=0;
    setInterval(function(){w.classList.add('swap');setTimeout(function(){i=(i+1)%words.length;w.textContent=words[i];w.classList.remove('swap');},250);},2200);}
  var shots=document.querySelectorAll('.mockup-shot');
  if(shots.length>1){var j=0;setInterval(function(){shots[j].classList.remove('on');j=(j+1)%shots.length;shots[j].classList.add('on');},3000);}
})();
