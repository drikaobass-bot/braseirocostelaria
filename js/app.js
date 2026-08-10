/* ============================================================
   BRASEIRO COSTELARIA — app.js
   Cardápio Digital | Carrinho | Modal | Pedido | WhatsApp | Firebase
   ============================================================ */

'use strict';

/* ── Criptografia ──────────────────────────────────────────── */
function encryptData(data, key = 'braseiro_secure_2024') {
  try {
    const jsonStr = JSON.stringify(data);
    let result = '';
    for (let i = 0; i < jsonStr.length; i++) {
      result += String.fromCharCode(
        jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(result);
  } catch (e) {
    console.error('Erro ao criptografar:', e);
    return JSON.stringify(data);
  }
}

function decryptData(encryptedData, key = 'braseiro_secure_2024') {
  try {
    const decoded = atob(encryptedData);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return JSON.parse(result);
  } catch (e) {
    console.error('Erro ao descriptografar:', e);
    return null;
  }
}

/* ── Regras de Negócio e Taxas ─────────────────────────────── */
const TAXA_DELIVERY = 5.00;
const PEDIDO_MINIMO_DELIVERY = 50.00;

/* ── Estado Global ─────────────────────────────────────────── */
const STATE = {
  cart: [],          // { id, nome, preco, img, qty }
  produtos: [],      // carregados do Firebase / localStorage / defaults
  config: {},        // whatsapp, textos, etc.
  modalProduto: null // produto aberto no modal
};

/* ── Configuração padrão ───────────────────────────────────── */
const DEFAULT_CONFIG = {
  whatsapp: '5562981401158',
  heroTitle: 'Braseiro Costelaria',
  heroSubtitle: 'Costela assada no bafo.',
  heroBadge1: '🥩 Costelas artesanais.',
  heroBadge2: '📅 Encomendas para sexta, sábado, domingo e feriados.',
  heroBadge3: '⏳ Produção artesanal.'
};

/* ── Utilitários ───────────────────────────────────────────── */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function fmtBRL(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function formatarDataBR(dataIso) {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function saveLS(key, val) { 
  try {
    const encrypted = encryptData(val);
    localStorage.setItem('braseiro_' + key, encrypted);
  } catch(e) {
    console.warn('Erro ao salvar no LocalStorage:', e);
  }
}
function loadLS(key, def) {
  try { 
    const v = localStorage.getItem('braseiro_' + key); 
    if (!v) return def;
    const decrypted = decryptData(v);
    return decrypted !== null ? decrypted : def;
  } catch { 
    return def; 
  }
}

/* ── Toast ─────────────────────────────────────────────────── */
function showToast(msg) {
  const c = $('#toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.whiteSpace = 'pre-line';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ── Migração e Ordenação ──────────────────────────────────── */
function migrarOrdenacaoProdutos(produtos) {
  if (!produtos || produtos.length === 0) return [];
  
  let precisaSalvar = false;
  
  const produtosOrdenados = produtos.map((p, index) => {
    if (p.ordem === undefined || p.ordem === null) {
      p.ordem = (index + 1) * 10;
      precisaSalvar = true;
    }
    return p;
  });

  if (precisaSalvar) {
    saveLS('produtos', produtosOrdenados);
    if (typeof database !== 'undefined') {
      database.ref('produtos').set(produtosOrdenados).catch(err => console.warn('Erro ao salvar migração no Firebase', err));
    }
  }

  return produtosOrdenados;
}

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  STATE.config = loadLS('config', DEFAULT_CONFIG);
  
  const produtosLS = loadLS('produtos', null);
  if (produtosLS === null) {
    STATE.produtos = DEFAULT_PRODUTOS;
    saveLS('produtos', DEFAULT_PRODUTOS);
  } else {
    STATE.produtos = produtosLS;
  }

  applyConfig();
  renderProdutos();
  bindNav();
  bindCart();
  bindModalImg();
  bindPedido();
  
  initFirebaseListeners();

  if (typeof bindAdmin === 'function') bindAdmin();
  if (typeof bindAdminLogin === 'function') bindAdminLogin();
  registerSW();

  const ano = document.getElementById("ano");
  if (ano) {
    ano.textContent = new Date().getFullYear();
  }
});

/* ── Sincronização em Tempo Real Firebase ──────────────────── */
function initFirebaseListeners() {
  if (typeof database === 'undefined') return;

  database.ref('produtos').on('value', snapshot => {
    const prodsVal = snapshot.val();
    if (prodsVal) {
      STATE.produtos = Array.isArray(prodsVal) ? prodsVal : Object.values(prodsVal);
      saveLS('produtos', STATE.produtos);
    } else {
      database.ref('produtos').set(DEFAULT_PRODUTOS);
      STATE.produtos = DEFAULT_PRODUTOS;
      saveLS('produtos', DEFAULT_PRODUTOS);
    }
    const activeFilterBtn = $('.filter-btn.active');
    const filtroAtual = activeFilterBtn ? activeFilterBtn.dataset.filter : 'todos';
    renderProdutos(filtroAtual);
  }, err => console.warn('Erro ao escutar produtos no Firebase:', err));

  database.ref('config').on('value', snapshot => {
    const cfgVal = snapshot.val();
    if (cfgVal) {
      STATE.config = { ...DEFAULT_CONFIG, ...cfgVal };
      saveLS('config', STATE.config);
    } else {
      database.ref('config').set(DEFAULT_CONFIG);
      STATE.config = DEFAULT_CONFIG;
      saveLS('config', DEFAULT_CONFIG);
    }
    applyConfig();
  }, err => console.warn('Erro ao escutar configurações no Firebase:', err));
}

/* ── Aplicar configurações ─────────────────────────────────── */
function applyConfig() {
  const c = STATE.config;
  const el = (id) => document.getElementById(id);
  if (el('hero-title'))    el('hero-title').textContent    = c.heroTitle    || DEFAULT_CONFIG.heroTitle;
  if (el('hero-subtitle')) el('hero-subtitle').textContent = c.heroSubtitle || DEFAULT_CONFIG.heroSubtitle;
  if (el('hero-badge1'))   el('hero-badge1').textContent   = c.heroBadge1   || DEFAULT_CONFIG.heroBadge1;
  if (el('hero-badge2'))   el('hero-badge2').textContent   = c.heroBadge2   || DEFAULT_CONFIG.heroBadge2;
  if (el('hero-badge3'))   el('hero-badge3').textContent   = c.heroBadge3   || DEFAULT_CONFIG.heroBadge3;
}

/* ── Renderizar Produtos ───────────────────────────────────── */
function renderProdutos(filtro = 'todos') {
  const grid = $('#produtos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  STATE.produtos = migrarOrdenacaoProdutos(STATE.produtos);

  let lista = STATE.produtos.filter(p => {
    if (!p.ativo) return false;
    if (filtro === 'todos') return true;
    return p.categoria === filtro;
  });

  const ordemCategorias = ['costelas', 'acompanhamentos', 'bebidas', 'combos'];
  
  lista.sort((a, b) => {
    const indexA = ordemCategorias.indexOf(a.categoria);
    const indexB = ordemCategorias.indexOf(b.categoria);
    if (indexA !== indexB) return indexA - indexB;

    const ordemDiff = (a.ordem || 0) - (b.ordem || 0);
    if (ordemDiff !== 0) return ordemDiff;

    return a.nome.localeCompare(b.nome);
  });

  if (lista.length === 0) {
    grid.innerHTML = '<p style="color:var(--texto-muted);text-align:center;grid-column:1/-1;padding:40px 0">Nenhum produto disponível nesta categoria.</p>';
    return;
  }

  lista.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'produto-card';
    card.style.animationDelay = (i * 0.06) + 's';
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="produto-img-wrap" data-id="${p.id}" role="button" tabindex="0" aria-label="Ampliar imagem de ${p.nome}">
        <img src="${p.img}" alt="${p.nome}" loading="lazy" onerror="this.src='assets/produtos/placeholder.jpg'">
        <div class="produto-img-overlay"><span>🔍 Ampliar</span></div>
      </div>
      <div class="produto-info">
        <div class="produto-nome">${p.nome}</div>
        <div class="produto-preco">${fmtBRL(p.preco)}</div>
        ${p.descricao ? `<div class="produto-desc">${p.descricao}</div>` : ''}
        <button class="btn-add" data-id="${p.id}">Adicionar ao Pedido</button>
      </div>`;
    grid.appendChild(card);
  });

  $$('.produto-img-wrap').forEach(el => {
    el.addEventListener('click', () => openModalImg(el.dataset.id));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') openModalImg(el.dataset.id); });
  });
  $$('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

/* ── Filtro ────────────────────────────────────────────────── */
function bindNav() {
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProdutos(btn.dataset.filter);
    });
  });

  const btnHero = document.getElementById('btn-hero');
  if (btnHero) {
    btnHero.addEventListener('click', () => {
      document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' });
    });
  }

  const btnAdmin = document.getElementById('btn-admin-nav');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openAdminLogin === 'function') {
        openAdminLogin();
      }
    });
  }
}

/* ── Modal Imagem ──────────────────────────────────────────── */
function openModalImg(id) {
  const p = STATE.produtos.find(x => x.id === id);
  if (!p) return;
  STATE.modalProduto = p;

  const modal = document.getElementById('modal-img');
  if (!modal) return;
  
  $('#modal-img-img').src = p.img;
  $('#modal-img-img').alt = p.nome;
  $('#modal-img-nome').textContent = p.nome;
  $('#modal-img-preco').textContent = fmtBRL(p.preco);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalImg() {
  const modal = document.getElementById('modal-img');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  STATE.modalProduto = null;
}

function bindModalImg() {
  const modal = document.getElementById('modal-img');
  if (!modal) return;

  const btnClose = document.getElementById('btn-modal-img-close');
  if (btnClose) btnClose.addEventListener('click', closeModalImg);

  const btnAdd = document.getElementById('btn-modal-add');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      if (STATE.modalProduto) { 
        addToCart(STATE.modalProduto.id); 
        closeModalImg(); 
      }
    });
  }

  modal.addEventListener('click', e => { if (e.target === modal) closeModalImg(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalImg(); });
}

/* ── Carrinho ──────────────────────────────────────────────── */
function addToCart(id) {
  const p = STATE.produtos.find(x => x.id === id);
  if (!p) return;
  
  if (typeof p.preco !== 'number' || p.preco < 0 || p.preco > 99999) {
    showToast('⚠️ Produto inválido.');
    return;
  }
  
  const existing = STATE.cart.find(x => x.id === id);
  if (existing) { 
    existing.qty++; 
  } else { 
    STATE.cart.push({ id: p.id, nome: p.nome, preco: p.preco, img: p.img, qty: 1 }); 
  }
  updateCartUI();
  showToast(`✅ ${p.nome} adicionado!`);
}

function removeFromCart(id) {
  STATE.cart = STATE.cart.filter(x => x.id !== id);
  updateCartUI();
  renderCartItems();
}

function changeQty(id, delta) {
  const item = STATE.cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { updateCartUI(); renderCartItems(); }
}

function clearCart() {
  STATE.cart = [];
  updateCartUI();
  renderCartItems();
}

function cartTotal() { 
  return STATE.cart.reduce((s, i) => {
    const preco = typeof i.preco === 'number' ? i.preco : 0;
    const qty = typeof i.qty === 'number' ? i.qty : 0;
    return s + preco * qty;
  }, 0); 
}

function cartCount() { return STATE.cart.reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const cnt = cartCount();
  badge.textContent = cnt;
  badge.classList.toggle('visible', cnt > 0);
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const total = document.getElementById('cart-total');
  const btnFin = document.getElementById('btn-finalizar');

  if (!container) return;

  if (STATE.cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">🛒 Seu carrinho está vazio.</div>';
    if (total) total.textContent = fmtBRL(0);
    if (btnFin) btnFin.disabled = true;
    return;
  }
  if (btnFin) btnFin.disabled = false;
  
  const subtotal = cartTotal();
  if (total) total.textContent = fmtBRL(subtotal);

  let infoMinimo = document.getElementById('cart-minimo-info');
  if (!infoMinimo) {
    infoMinimo = document.createElement('div');
    infoMinimo.id = 'cart-minimo-info';
    if (total && total.parentElement) {
      total.parentElement.insertBefore(infoMinimo, total.parentElement.querySelector('.btn-limpar'));
    }
  }

  if (subtotal < PEDIDO_MINIMO_DELIVERY) {
    const faltam = PEDIDO_MINIMO_DELIVERY - subtotal;
    infoMinimo.style.color = '#e67e22';
    infoMinimo.style.fontWeight = '600';
    infoMinimo.innerHTML = `
      <span style="display:inline-block;">🛵 Faltam <strong>${fmtBRL(faltam)}</strong></span>
      <span style="display:inline-block; margin-left:4px;">para finalizar o pedido</span>
      <span style="display:block; font-weight:400; font-size:0.75rem; color:#888; margin-top:2px;">
        Pedido mínimo: ${fmtBRL(PEDIDO_MINIMO_DELIVERY)}
      </span>
    `;
  } else {
    infoMinimo.style.color = '#27ae60';
    infoMinimo.style.fontWeight = '500';
    infoMinimo.textContent = `✅ Pedido mínimo atingido!`;
  }

  container.innerHTML = STATE.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img class="cart-item-img" src="${item.img}" alt="${item.nome}" onerror="this.src='assets/produtos/placeholder.jpg'">
      <div class="cart-item-info">
        <div class="cart-item-nome">${item.nome}</div>
        <div class="cart-item-preco">${fmtBRL(item.preco)}</div>
        <div class="cart-item-controls">
          <button class="btn-qty" data-id="${item.id}" data-delta="-1" aria-label="Diminuir">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="btn-qty" data-id="${item.id}" data-delta="1" aria-label="Aumentar">+</button>
        </div>
      </div>
      <button class="btn-remove-item" data-id="${item.id}" aria-label="Remover">✕ Remover</button>
    </div>`).join('');

  $$('.btn-qty').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, parseInt(btn.dataset.delta)));
  });
  $$('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

function bindCart() {
  const fab      = document.getElementById('cart-fab');
  const panel    = document.getElementById('cart-panel');
  if (!fab || !panel) return;

  const backdrop = panel.querySelector('.cart-backdrop');
  const btnClose = document.getElementById('btn-cart-close');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnFin   = document.getElementById('btn-finalizar');

  fab.addEventListener('click', () => {
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCartItems();
  });

  const closeCart = () => { panel.classList.remove('open'); document.body.style.overflow = ''; };
  if (backdrop) backdrop.addEventListener('click', closeCart);
  if (btnClose) btnClose.addEventListener('click', closeCart);
  if (btnLimpar) btnLimpar.addEventListener('click', () => { clearCart(); showToast('Carrinho limpo.'); });
  if (btnFin) {
    btnFin.addEventListener('click', () => {
      if (STATE.cart.length === 0) return;
      closeCart();
      openModalPedido();
    });
  }
  updateCartUI();
}

/* ── Modal Pedido ──────────────────────────────────────────── */
let pedidoStep = 1;
let tipoEntrega = '';

function openModalPedido() {
  pedidoStep = 1;
  tipoEntrega = '';
  $$('.entrega-opcao').forEach(o => o.classList.remove('selected'));
  
  let avisoMinimo = document.getElementById('aviso-pedido-minimo');
  if (!avisoMinimo) {
    const containerOpcoes = document.querySelector('.entrega-opcoes') || document.getElementById('step-1');
    if (containerOpcoes) {
      avisoMinimo = document.createElement('div');
      avisoMinimo.id = 'aviso-pedido-minimo';
      avisoMinimo.style.fontSize = '0.85rem';
      avisoMinimo.style.color = 'var(--texto-muted, #777)';
      avisoMinimo.style.marginTop = '12px';
      avisoMinimo.style.textAlign = 'center';
      avisoMinimo.textContent = `ℹ️ Pedido mínimo para entrega: ${fmtBRL(PEDIDO_MINIMO_DELIVERY)}`;
      containerOpcoes.appendChild(avisoMinimo);
    }
  }

  const modal = document.getElementById('modal-pedido');
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  showStep(1);
}

function closeModalPedido() {
  const modal = document.getElementById('modal-pedido');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showStep(n) {
  pedidoStep = n;
  $$('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step-' + n);
  if (el) el.classList.add('active');
}

function bindPedido() {
  const modal = document.getElementById('modal-pedido');
  if (!modal) return;

  const btnClose = document.getElementById('btn-pedido-close');
  if (btnClose) btnClose.addEventListener('click', closeModalPedido);
  modal.addEventListener('click', e => { if (e.target === modal) closeModalPedido(); });

  const selectPagDelivery = document.getElementById('pagamento-delivery');
  if (selectPagDelivery) {
    selectPagDelivery.addEventListener('change', (e) => {
      const group = document.getElementById('troco-group-delivery');
      if (group) group.style.display = e.target.value === 'Dinheiro' ? 'block' : 'none';
    });
  }

  const selectPagRetirada = document.getElementById('pagamento-retirada');
  if (selectPagRetirada) {
    selectPagRetirada.addEventListener('change', (e) => {
      const group = document.getElementById('troco-group-retirada');
      if (group) group.style.display = e.target.value === 'Dinheiro' ? 'block' : 'none';
    });
  }

  $$('.entrega-opcao').forEach(op => {
    op.addEventListener('click', () => {
      $$('.entrega-opcao').forEach(o => o.classList.remove('selected'));
      op.classList.add('selected');
      tipoEntrega = op.dataset.tipo;
    });
  });

  const btnStep1 = document.getElementById('btn-step1-next');
  if (btnStep1) {
    btnStep1.addEventListener('click', () => {
      if (!tipoEntrega) { showToast('⚠️ Selecione como deseja receber.'); return; }
      
      const subtotal = cartTotal();
      if (tipoEntrega === 'delivery' && subtotal < PEDIDO_MINIMO_DELIVERY) {
        const faltam = PEDIDO_MINIMO_DELIVERY - subtotal;
        showToast(
          `🚫 Pedido mínimo: ${fmtBRL(PEDIDO_MINIMO_DELIVERY)}\n` +
          `Faltam ${fmtBRL(faltam)} para finalizar\n` +
          `Adicione mais itens ao carrinho`
        );
        return;
      }

      const deliveryFields = document.getElementById('delivery-fields');
      const retiradaFields = document.getElementById('retirada-fields');
      if (tipoEntrega === 'delivery') {
        if (deliveryFields) deliveryFields.style.display = 'block';
        if (retiradaFields) retiradaFields.style.display = 'none';
      } else {
        if (deliveryFields) deliveryFields.style.display = 'none';
        if (retiradaFields) retiradaFields.style.display = 'block';
      }
      showStep(2);
    });
  }

  const btnStep2Next = document.getElementById('btn-step2-next');
  if (btnStep2Next) {
    btnStep2Next.addEventListener('click', () => {
      if (!validarFormulario()) return;
      renderResumo();
      showStep(3);
    });
  }

  const btnStep2Back = document.getElementById('btn-step2-back');
  if (btnStep2Back) btnStep2Back.addEventListener('click', () => showStep(1));

  const btnStep3Back = document.getElementById('btn-step3-back');
  if (btnStep3Back) btnStep3Back.addEventListener('click', () => showStep(2));

  const btnWpp = document.getElementById('btn-whatsapp');
  if (btnWpp) btnWpp.addEventListener('click', enviarWhatsApp);
}

function validarFormulario() {
  const isDelivery = tipoEntrega === 'delivery';

  const campos = isDelivery
    ? ['nome-delivery', 'tel-delivery', 'endereco', 'numero', 'bairro', 'cidade', 'data-delivery', 'hora-delivery']
    : ['nome-retirada', 'tel-retirada', 'data-retirada', 'hora-retirada'];

  for (const id of campos) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      if (el) el.focus();
      showToast('⚠️ Preencha todos os campos obrigatórios.');
      return false;
    }
  }

  const idPagamento = isDelivery ? 'pagamento-delivery' : 'pagamento-retirada';
  const selectPagamento = document.getElementById(idPagamento);

  if (!selectPagamento || !selectPagamento.value || selectPagamento.value.trim() === '') {
    if (selectPagamento) selectPagamento.focus();
    showToast('⚠️ Selecione a forma de pagamento.');
    return false;
  }

  return true;
}

function renderResumo() {
  const itens = document.getElementById('resumo-itens');
  const subtotalVal = document.getElementById('resumo-subtotal-val');
  const taxaVal = document.getElementById('resumo-taxa-val');
  const linhaTaxa = document.getElementById('linha-taxa-resumo');
  const totalVal = document.getElementById('resumo-total-val');

  if (!itens || !totalVal) return;

  itens.innerHTML = STATE.cart.map(i =>
    `<div class="resumo-item"><span>${i.qty}x ${i.nome}</span><span>${fmtBRL(i.preco * i.qty)}</span></div>`
  ).join('');

  const subtotal = cartTotal();
  const taxa = (tipoEntrega === 'delivery') ? TAXA_DELIVERY : 0;
  const totalCalculado = subtotal + taxa;

  if (subtotalVal) subtotalVal.textContent = fmtBRL(subtotal);
  if (taxaVal) taxaVal.textContent = (taxa > 0) ? fmtBRL(taxa) : 'Grátis';
  if (linhaTaxa) linhaTaxa.style.display = (tipoEntrega === 'delivery') ? 'flex' : 'none';
  if (totalVal) totalVal.textContent = fmtBRL(totalCalculado);
}

function enviarWhatsApp() {
  const subtotal = cartTotal();

  if (tipoEntrega === 'delivery' && subtotal < PEDIDO_MINIMO_DELIVERY) {
    const faltam = PEDIDO_MINIMO_DELIVERY - subtotal;
    showToast(
      `🚚 Pedido mínimo para entrega: ${fmtBRL(PEDIDO_MINIMO_DELIVERY)}.\n` +
      `Faltam ${fmtBRL(faltam)} para finalizar seu pedido.\n` +
      `Adicione mais itens ao carrinho para continuar.`
    );
    return;
  }

  const cfg = STATE.config;
  const num = (cfg.whatsapp || DEFAULT_CONFIG.whatsapp).replace(/\D/g, '');

  const itensTexto = STATE.cart.map(i => `• ${i.qty}x ${i.nome} — ${fmtBRL(i.preco * i.qty)}`).join('\n');

  let msg = `*NOVO PEDIDO — BRASEIRO COSTELARIA*\n\n`;

  if (tipoEntrega === 'delivery') {
    const nome     = document.getElementById('nome-delivery').value.trim();
    const tel      = document.getElementById('tel-delivery').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const numero   = document.getElementById('numero').value.trim();
    const bairro   = document.getElementById('bairro').value.trim();
    const compl    = document.getElementById('complemento').value.trim();
    const cidade   = document.getElementById('cidade').value.trim();
    
    const rawData  = document.getElementById('data-delivery').value;
    const data     = formatarDataBR(rawData);

    const hora     = document.getElementById('hora-delivery').value;
    const formaPag = document.getElementById('pagamento-delivery').value;
    const troco    = document.getElementById('troco-delivery').value.trim();
    const obs      = document.getElementById('obs-delivery').value.trim();

    const totalComTaxa = subtotal + TAXA_DELIVERY;

    msg += `*Cliente:* ${nome}\n`;
    msg += `*Telefone:* ${tel}\n`;
    msg += `*Forma de recebimento:* Delivery\n\n`;
    msg += `*Produtos:*\n${itensTexto}\n\n`;
    msg += `*Subtotal:* ${fmtBRL(subtotal)}\n`;
    msg += `*Taxa de Entrega:* ${fmtBRL(TAXA_DELIVERY)}\n`;
    msg += `*Total Final:* ${fmtBRL(totalComTaxa)}\n\n`;
    msg += `*Forma de Pagamento:* ${formaPag}`;
    if (formaPag === 'Dinheiro' && troco) {
      msg += ` (Troco para ${troco})`;
    }
    msg += `\n\n*Endereco de entrega:*\n`;
    msg += `${endereco}, ${numero}${compl ? ' — ' + compl : ''}\n`;
    msg += `${bairro} — ${cidade}\n\n`;
    msg += `*Data:* ${data}\n`;
    msg += `*Horario:* ${hora}\n`;
    if (obs) msg += `\n*Observacoes:* ${obs}\n`;
  } else {
    const nome     = document.getElementById('nome-retirada').value.trim();
    const tel      = document.getElementById('tel-retirada').value.trim();
    
    const rawData  = document.getElementById('data-retirada').value;
    const data     = formatarDataBR(rawData);

    const hora     = document.getElementById('hora-retirada').value;
    const formaPag = document.getElementById('pagamento-retirada').value;
    const troco    = document.getElementById('troco-retirada').value.trim();
    const obs      = document.getElementById('obs-retirada').value.trim();

    msg += `*Cliente:* ${nome}\n`;
    msg += `*Telefone:* ${tel}\n`;
    msg += `*Forma de recebimento:* Retirada no estabelecimento\n\n`;
    msg += `*Produtos:*\n${itensTexto}\n\n`;
    msg += `*Total Final:* ${fmtBRL(subtotal)}\n\n`;
    msg += `*Forma de Pagamento:* ${formaPag}`;
    if (formaPag === 'Dinheiro' && troco) {
      msg += ` (Troco para ${troco})`;
    }
    msg += `\n\n*Data:* ${data}\n`;
    msg += `*Horario:* ${hora}\n`;
    if (obs) msg += `\n*Observacoes:* ${obs}\n`;
  }

  msg += `\n_Obrigado pela preferencia!_`;

  const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  closeModalPedido();
  clearCart();
  showToast('Pedido enviado com sucesso!');
}

/* ── Service Worker ────────────────────────────────────────── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.warn('SW não registrado:', err));
  }
}
