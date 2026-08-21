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

/* ── Produtos Padrão (Fallback) - NUNCA MAIS MEXA AQUI ────── */
const DEFAULT_PRODUTOS = [
  {
    id: 'p1',
    nome: 'Costela Bovina Inteira (aprox. 2kg)',
    preco: 129.90,
    categoria: 'costelas',
    descricao: 'A costela bovina do Braseiro, assada lentamente no bafo por 10 horas. Tempero artesanal.',
    img: 'assets/produtos/placeholder.jpg',
    ativo: true,
    ordem: 10
  },
  {
    id: 'p2',
    nome: 'Costela Suína (aprox. 1,5kg)',
    preco: 89.90,
    categoria: 'costelas',
    descricao: 'Costela suína com molho barbecue artesanal, caramelizada na brasa.',
    img: 'assets/produtos/placeholder.jpg',
    ativo: true,
    ordem: 20
  },
  {
    id: 'p3',
    nome: 'Mandioca Frita (Porção)',
    preco: 22.90,
    categoria: 'acompanhamentos',
    descricao: 'Mandioca frita crocante, servida com molho especial da casa.',
    img: 'assets/produtos/placeholder.jpg',
    ativo: true,
    ordem: 10
  },
  {
    id: 'p4',
    nome: 'Refrigerante Lata (350ml)',
    preco: 6.50,
    categoria: 'bebidas',
    descricao: 'Coca-Cola, Guaraná Antarctica ou Fanta Laranja.',
    img: 'assets/produtos/placeholder.jpg',
    ativo: true,
    ordem: 10
  },
  {
    id: 'p5',
    nome: 'Combo Família (Costela Bovina + 2 Acomp.)',
    preco: 179.90,
    categoria: 'combos',
    descricao: 'Costela bovina inteira + Mandioca frita + Refrigerante 2L.',
    img: 'assets/produtos/placeholder.jpg',
    ativo: true,
    ordem: 10
  }
];

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
  
  const existing = STATE.cart.find(x => x.id ===
