// ===== Máquina — Liquid Glass Landing: interactions =====

document.addEventListener('DOMContentLoaded', () => {

  // ── Captura de UTM (pra saber de qual campanha/criativo veio cada lead) ──
  // Guarda na primeira visita e mantém mesmo se o lead navegar pela página antes de converter.
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const params = new URLSearchParams(window.location.search);
  const hasNewUtm = UTM_KEYS.some((k) => params.has(k));
  if (hasNewUtm) {
    const utm = {};
    UTM_KEYS.forEach((k) => { if (params.has(k)) utm[k] = params.get(k); });
    sessionStorage.setItem('utmData', JSON.stringify(utm));
  }
  const getStoredUtm = () => {
    try { return JSON.parse(sessionStorage.getItem('utmData') || '{}'); } catch { return {}; }
  };

  // ── A/B test: variante já foi decidida no <head> (evita flash) — aqui só reportamos ──
  const abVariant = document.documentElement.getAttribute('data-variant') || 'a';
  if (typeof fbq === 'function') fbq('trackCustom', 'ABTestAssigned', { variant: abVariant });

  // Links diretos de WhatsApp (nav, rodapé, barra fixa, popup) também levam a origem —
  // não só quem passa pelo formulário.
  const directUtm = getStoredUtm();
  const directUtmLines = Object.entries(directUtm).map(([k, v]) => `${k}: ${v}`).join('\n');
  const directWaMessage = 'Vim pelo site e quero saber mais.'
    + (directUtmLines ? `\n\nOrigem:\n${directUtmLines}` : '');
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
    const url = new URL(a.href);
    if (!url.searchParams.has('text')) url.searchParams.set('text', directWaMessage);
    a.href = url.toString();
    a.addEventListener('click', () => { if (typeof fbq === 'function') fbq('track', 'Contact', { variant: abVariant }); });
  });

  // ── Parallax suave no scroll ──
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      for (const el of parallaxEls) {
        const factor = parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${y * factor}px, 0)`;
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Reveal on scroll ──
  const revealIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealIO.unobserve(entry.target);
    }
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 6) * 70}ms`;
    revealIO.observe(el);
  });

  // ── Contadores animados ──
  const animateCounter = (el) => {
    const final = el.textContent;
    const match = final.match(/([\d.,]+)/);
    if (!match) return;
    const numStr = match[1];
    const decimals = (numStr.split(',')[1] || '').length;
    const target = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
    const start = performance.now();
    const duration = 1400;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      let str = decimals ? value.toFixed(decimals).replace('.', ',') : Math.round(value).toString();
      if (!decimals) str = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      el.textContent = final.replace(numStr, str);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const counterIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      animateCounter(entry.target);
      counterIO.unobserve(entry.target);
    }
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach((el) => counterIO.observe(el));

  // ── Tilt 3D do iPhone — segue o mouse (desktop) e também reage ao scroll (todo mundo) ──
  const stage = document.querySelector('[data-tilt-stage]');
  const phone = document.querySelector('[data-tilt]');
  if (stage && phone) {
    let mouseDx = 0, mouseDy = 0;
    const applyPhoneTilt = () => {
      const scrollT = Math.min(1, Math.max(0, (window.scrollY) / (window.innerHeight * 0.9)));
      const scrollRotate = scrollT * 10; // gira mais conforme rola, mesmo sem mouse
      phone.style.transform = `rotateX(${(5 - mouseDy * 8).toFixed(2)}deg) rotateY(${(-13 + mouseDx * 12 + scrollRotate).toFixed(2)}deg) scale(0.58)`;
    };
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      mouseDx = (e.clientX - rect.left) / rect.width - 0.5;
      mouseDy = (e.clientY - rect.top) / rect.height - 0.5;
      applyPhoneTilt();
    });
    stage.addEventListener('mouseleave', () => { mouseDx = 0; mouseDy = 0; applyPhoneTilt(); });
    window.addEventListener('scroll', applyPhoneTilt, { passive: true });
    applyPhoneTilt();
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── V2: botões magnéticos (CTA primário segue levemente o cursor, desktop) ──
  if (isFinePointer && !prefersReducedMotion) {
    document.querySelectorAll('.btn-primary').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        btn.style.transform = `translate(${dx * 10}px, ${dy * 8}px) translateY(-3px) scale(1.02)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });

    // ── V2: cards com tilt 3D leve seguindo o cursor ──
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-dy * 7).toFixed(2)}deg) rotateY(${(dx * 7).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  // ── Calculadora interativa ──
  // MARKET_CPC: referência pública de mercado para CPC médio de Meta Ads no Brasil.
  // OUR_CPC: CPC real de uma campanha ativa sob gestão (Meta Ads Manager, ver seção "Resultados").
  const MARKET_CPC = 1.2;
  const OUR_CPC = 0.44;
  const calcSlider = document.getElementById('calc-spend');
  if (calcSlider) {
    const spendValueEl = document.getElementById('calc-spend-value');
    const potentialEl = document.getElementById('calc-potential');
    const lossEl = document.getElementById('calc-loss');
    const formatBRL = (n) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
    const formatInt = (n) => Math.round(n).toLocaleString('pt-BR');

    const updateCalc = () => {
      const spend = parseFloat(calcSlider.value);
      const pct = ((spend - calcSlider.min) / (calcSlider.max - calcSlider.min)) * 100;
      calcSlider.style.setProperty('--calc-pct', pct + '%');
      spendValueEl.textContent = formatBRL(spend);
      const marketClicks = spend / MARKET_CPC;
      const ourClicks = spend / OUR_CPC;
      potentialEl.textContent = formatInt(marketClicks) + ' cliques';
      lossEl.innerHTML = '+' + formatInt(ourClicks - marketClicks) + '<span> cliques</span>';
    };

    calcSlider.addEventListener('input', updateCalc);
    updateCalc();
  }

  // ── Formulário de captura de lead ──
  const form = document.getElementById('lead-form');
  const success = document.getElementById('lead-success');
  const leadNameEl = document.getElementById('lead-name');

  // Aceita qualquer formatação (com/sem DDD entre parênteses, espaço, traço, com/sem
  // código do país) — valida só a quantidade de dígitos, pra não barrar lead de verdade
  // por causa de formatação.
  const isValidWhatsapp = (value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const setError = (input, hasError) => input.classList.toggle('field-error', hasError);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = form.nome.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const email = form.email.value.trim();

    let valid = true;
    if (!nome) { setError(form.nome, true); valid = false; } else setError(form.nome, false);
    if (!isValidWhatsapp(whatsapp)) { setError(form.whatsapp, true); valid = false; } else setError(form.whatsapp, false);
    if (!EMAIL_RE.test(email)) { setError(form.email, true); valid = false; } else setError(form.email, false);
    if (!valid) return;

    // TODO: quando tiver CRM (RD Station, HubSpot, Pipedrive, etc.), substituir o bloco
    // abaixo por um fetch() real pro webhook do CRM. Até lá, o lead cai direto no seu
    // WhatsApp com os dados preenchidos, pra nenhum lead se perder.
    const utm = getStoredUtm();
    const utmLines = Object.entries(utm).map(([k, v]) => `${k}: ${v}`).join('\n');
    const waMessage = `Novo lead do site:\nNome: ${nome}\nWhatsApp: ${whatsapp}\nE-mail: ${email}`
      + (utmLines ? `\n\nOrigem:\n${utmLines}` : '\n\nOrigem: acesso direto (sem UTM)');
    window.open(`https://wa.me/5511962158598?text=${encodeURIComponent(waMessage)}`, '_blank', 'noopener');

    if (typeof fbq === 'function') fbq('track', 'Lead', { variant: abVariant });

    leadNameEl.textContent = nome.split(' ')[0] || 'obrigado';
    form.hidden = true;
    success.hidden = false;
  });

  // ── Shine sweep (fallback para touch, sem hover) ──
  document.querySelectorAll('[data-shine], .shine').forEach((host) => {
    host.addEventListener('touchstart', () => {
      const bar = host.querySelector('.shine-bar');
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.transform = 'translateX(-180%) skewX(-20deg)';
      void bar.offsetWidth;
      bar.style.transition = 'transform .9s cubic-bezier(.25,.6,.2,1)';
      bar.style.transform = 'translateX(320%) skewX(-20deg)';
    }, { passive: true });
  });

  // ── Popup de saída (exit intent) — só 1x por sessão ──
  const exitPopup = document.getElementById('exit-popup');
  if (exitPopup) {
    const SHOWN_KEY = 'exitPopupShown';
    let hasShown = sessionStorage.getItem(SHOWN_KEY) === '1';
    let deepScrolled = false;

    const openPopup = () => {
      if (hasShown || success && !success.hidden) return;
      hasShown = true;
      sessionStorage.setItem(SHOWN_KEY, '1');
      exitPopup.hidden = false;
    };
    const closePopup = () => { exitPopup.hidden = true; };

    document.getElementById('exit-popup-close').addEventListener('click', closePopup);
    exitPopup.addEventListener('click', (e) => { if (e.target === exitPopup) closePopup(); });
    document.getElementById('exit-popup-form-cta').addEventListener('click', closePopup);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !exitPopup.hidden) closePopup(); });

    // Desktop: mouse saindo pela parte de cima da janela (indo pra barra de endereço/aba)
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY <= 0) openPopup();
    });

    // Mobile: sem mouse — usa "rolou bastante e voltou pro topo" como proxy de saída
    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight * 1.2) deepScrolled = true;
      if (deepScrolled && window.scrollY < 80) openPopup();
    }, { passive: true });
  }

});
