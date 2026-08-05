/* ============================================================
   BRASEIRO COSTELARIA — admin.js
   Painel Administrativo com Firebase + LocalStorage + Compressão
   ============================================================ */

'use strict';

let adminLogado = false;

/* ── Utilitários ───────────────────────────────────────────── */
function saveLS(key, val) {
  try {
    localStorage.setItem('braseiro_' + key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage quota exceeded:', e.message);
    showToast('⚠️ Armazenamento cheio! Tente usar imagens menores.');
  }
}

function loadLS(key, def) {
  try { 
    const v = localStorage.getItem('braseiro_' + key); 
    return v ? JSON.parse(v) : def; 
  } catch { 
    return def; 
  }
}

function fmtBRL(v) { 
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

function showToast(msg) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function uid() { 
  return 'p' + Date.now() + Math.random().toString(36).slice(2, 6); 
}

/* ── Integração Firebase Helper Functions ─────────────────── */
function syncProdutosToFirebase(produtos) {
  if (typeof database !== 'undefined') {
    database.ref('produtos').set(produtos)
      .catch(err => console.error('Erro ao sincronizar produtos com Firebase:', err));
  }
}

function syncConfigToFirebase(config) {
  if (typeof database !== 'undefined') {
    database.ref('config').set(config)
      .catch(err => console.error('Erro ao sincronizar configurações com Firebase:', err));
  }
}

/* ── Compressão de Imagem ──────────────────────────────────── */
function compressImage(file, maxDim = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ── Login com Firebase Auth ────────────────────────────────── */
function openAdminLogin() {
  document.getElementById('admin-login').classList.add('open');
  document.getElementById('admin-login-input').value = '';
  document.getElementById('admin-login-error').textContent = '';
  document.getElementById('admin-login-input').focus();
}

function closeAdminLogin() {
  document.getElementById('admin-login').classList.remove('open');
}

function bindAdminLogin() {
  const btnLogin = document.getElementById('btn-admin-login-confirm');
  const btnCancel = document.getElementById('btn-admin-login-cancel');
  const input = document.getElementById('admin-login-input');
  const error = document.getElementById('admin-login-error');

  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      const senha = input.value.trim();

      if (!senha) {
        error.textContent = 'Por favor, digite a senha.';
        return;
      }

      error.textContent = 'Autenticando...';

      // Login via Firebase Authentication com e-mail fixo e a senha informada
      firebase.auth().signInWithEmailAndPassword('drikao.bass@gmail.com', senha)
        .then(() => {
          adminLogado = true;
          closeAdminLogin();
          openAdmin();
        })
        .catch(err => {
          console.error('Erro na autenticação Firebase:', err);
          error.textContent = 'Senha incorreta ou erro de autenticação.';
          input.value = '';
          input.focus();
        });
    });
  }

  if (input) {
    input.addEventListener('keydown', e => { 
      if (e.key === 'Enter') btnLogin.click(); 
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', closeAdminLogin);
  }
}

/* ── Abrir / Fechar Admin ──────────────────────────────────── */
function openAdmin() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('admin-page').classList.add('open');

  // Tentar carregar do Firebase primeiro ou fallback para LS
  if (typeof database !== 'undefined') {
    database.ref('produtos').once('value').then(snapshot => {
      const prodFirebase = snapshot.val();
      if (prodFirebase) {
        saveLS('produtos', prodFirebase);
      } else {
        const prodLS = loadLS('produtos', null);
        if (!prodLS && typeof DEFAULT_PRODUTOS !== 'undefined') {
          saveLS('produtos', DEFAULT_PRODUTOS);
          syncProdutosToFirebase(DEFAULT_PRODUTOS);
        }
      }
      renderAdminProdutos();
    }).catch(() => {
      renderAdminProdutos();
    });

    database.ref('config').once('value').then(snapshot => {
      const cfgFirebase = snapshot.val();
      if (cfgFirebase) {
        saveLS('config', cfgFirebase);
      }
      preencherConfigForm();
    }).catch(() => {
      preencherConfigForm();
    });
  } else {
    const prodLS = loadLS('produtos', null);
    if (!prodLS && typeof DEFAULT_PRODUTOS !== 'undefined') {
      saveLS('produtos', DEFAULT_PRODUTOS);
    }
    renderAdminProdutos();
    preencherConfigForm();
  }
}

function closeAdmin() {
  document.getElementById('admin-page').classList.remove('open');
  document.getElementById('main-content').style.display = '';

  // Recarregar dados na página principal
  if (typeof STATE !== 'undefined') {
    STATE.config   = loadLS('config', {});
    STATE.produtos = loadLS('produtos', []);
    if (typeof applyConfig === 'function') applyConfig();
    if (typeof renderProdutos === 'function') renderProdutos();
  }
}

/* ── Tabs ──────────────────────────────────────────────────── */
function bindAdmin() {
  // Fechar admin
  const btnClose = document.getElementById('btn-admin-close');
  if (btnClose) btnClose.addEventListener('click', closeAdmin);

  // Tabs
  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach(t => t.classList.remove('active'));
      $$('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = document.getElementById('admin-panel-' + tab.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Salvar configurações
  const btnSaveCfg = document.getElementById('btn-save-config');
  if (btnSaveCfg) btnSaveCfg.addEventListener('click', salvarConfig);

  // Novo produto
  const btnNovoProd = document.getElementById('btn-novo-produto');
  if (btnNovoProd) btnNovoProd.addEventListener('click', () => abrirModalProduto(null));

  // Modal produto
  const btnCloseProdModal = document.getElementById('btn-admin-produto-close');
  if (btnCloseProdModal) btnCloseProdModal.addEventListener('click', fecharModalProduto);

  const btnSaveProd = document.getElementById('btn-admin-produto-save');
  if (btnSaveProd) btnSaveProd.addEventListener('click', salvarProduto);

  const inputFile = document.getElementById('admin-produto-img-file');
  if (inputFile) inputFile.addEventListener('change', handleImgUpload);

  // Botão cancelar do modal produto
  const btnCancelProd = document.getElementById('btn-admin-produto-cancel');
  if (btnCancelProd) {
    btnCancelProd.addEventListener('click', fecharModalProduto);
  }
}

/* ── Configurações ─────────────────────────────────────────── */
function preencherConfigForm() {
  const c = loadLS('config', {});
  const def = {
    whatsapp: '5500000000000',
    heroTitle: 'Braseiro Costelaria',
    heroSubtitle: 'Costela assada no bafo.',
    heroBadge1: '🥩 Costelas artesanais.',
    heroBadge2: '📅 Encomendas para sexta, sábado, domingo e feriados.',
    heroBadge3: '⏳ Produção artesanal.'
  };
  const merged = { ...def, ...c };
  
  if (document.getElementById('cfg-whatsapp')) document.getElementById('cfg-whatsapp').value = merged.whatsapp;
  if (document.getElementById('cfg-hero-title')) document.getElementById('cfg-hero-title').value = merged.heroTitle;
  if (document.getElementById('cfg-hero-subtitle')) document.getElementById('cfg-hero-subtitle').value = merged.heroSubtitle;
  if (document.getElementById('cfg-badge1')) document.getElementById('cfg-badge1').value = merged.heroBadge1;
  if (document.getElementById('cfg-badge2')) document.getElementById('cfg-badge2').value = merged.heroBadge2;
  if (document.getElementById('cfg-badge3')) document.getElementById('cfg-badge3').value = merged.heroBadge3;
}

function salvarConfig() {
  const cfg = {
    whatsapp:     document.getElementById('cfg-whatsapp').value.trim(),
    heroTitle:    document.getElementById('cfg-hero-title').value.trim(),
    heroSubtitle: document.getElementById('cfg-hero-subtitle').value.trim(),
    heroBadge1:   document.getElementById('cfg-badge1').value.trim(),
    heroBadge2:   document.getElementById('cfg-badge2').value.trim(),
    heroBadge3:   document.getElementById('cfg-badge3').value.trim()
  };

  saveLS('config', cfg);
  syncConfigToFirebase(cfg);
  showToast('✅ Configurações salvas e sincronizadas!');
}

/* ── Produtos Admin ────────────────────────────────────────── */
function renderAdminProdutos() {
  const lista = loadLS('produtos', []);
  const container = document.getElementById('admin-produtos-lista');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = '<p style="color:var(--texto-muted);text-align:center;padding:24px">Nenhum produto cadastrado.</p>';
    return;
  }

  container.innerHTML = lista.map(p => `
    <div class="produto-admin-item" data-id="${p.id}">
      <img class="produto-admin-img" src="${p.img}" alt="${p.nome}" onerror="this.src='assets/produtos/placeholder.jpg'">
      <div class="produto-admin-info">
        <div class="produto-admin-nome">${p.nome}</div>
        <div class="produto-admin-preco">${fmtBRL(p.preco)}</div>
        <div class="produto-admin-status ${p.ativo ? 'ativo' : 'inativo'}">${p.ativo ? '● Ativo' : '● Inativo'}</div>
      </div>
      <div class="produto-admin-actions">
        <button class="btn-admin-secondary btn-editar-produto" data-id="${p.id}">Editar</button>
        <button class="btn-admin-danger btn-excluir-produto" data-id="${p.id}">Excluir</button>
      </div>
    </div>`).join('');

  $$('.btn-editar-produto').forEach(btn => {
    btn.addEventListener('click', () => {
      const prod = lista.find(x => x.id === btn.dataset.id);
      if (prod) abrirModalProduto(prod);
    });
  });

  $$('.btn-excluir-produto').forEach(btn => {
    btn.addEventListener('click', () => excluirProduto(btn.dataset.id));
  });
}

function excluirProduto(id) {
  if (!confirm('Deseja excluir este produto?')) return;
  let lista = loadLS('produtos', []);
  lista = lista.filter(p => p.id !== id);

  saveLS('produtos', lista);
  syncProdutosToFirebase(lista);
  renderAdminProdutos();
  showToast('🗑️ Produto excluído.');
}

/* ── Modal Produto ─────────────────────────────────────────── */
let editandoProdutoId = null;
let imagemComprimida = null;

function abrirModalProduto(prod) {
  editandoProdutoId = prod ? prod.id : null;
  imagemComprimida = null;
  const modal = document.getElementById('modal-admin-produto');
  const titulo = document.getElementById('admin-produto-modal-title');

  if (titulo) titulo.textContent = prod ? 'Editar Produto' : 'Novo Produto';

  document.getElementById('admin-produto-nome').value      = prod ? prod.nome : '';
  document.getElementById('admin-produto-preco').value     = prod ? prod.preco : '';
  document.getElementById('admin-produto-categoria').value = prod ? prod.categoria : 'costelas';
  document.getElementById('admin-produto-desc').value      = prod ? (prod.descricao || '') : '';
  
  const imgVal = prod ? prod.img : '';
  document.getElementById('admin-produto-img-url').value   = imgVal.startsWith('data:') ? '' : imgVal;
  document.getElementById('admin-produto-ativo').checked   = prod ? prod.ativo : true;
  document.getElementById('admin-produto-img-file').value  = '';
  
  const preview = document.getElementById('admin-produto-img-preview');
  if (preview) {
    preview.innerHTML = prod ? `<img src="${prod.img}" alt="Preview" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:8px;margin-top:8px;display:block">` : '';
  }

  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModalProduto() {
  const modal = document.getElementById('modal-admin-produto');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  editandoProdutoId = null;
  imagemComprimida = null;
}

async function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ Imagem muito grande (máx 5MB).');
    return;
  }

  showToast('⏳ Processando imagem...');

  try {
    const dataUrl = await compressImage(file, 400, 0.7);
    imagemComprimida = dataUrl;

    const preview = document.getElementById('admin-produto-img-preview');
    if (preview) {
      preview.innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:8px;margin-top:8px;display:block">`;
    }

    document.getElementById('admin-produto-img-url').value = '';
    showToast('✅ Imagem processada!');
  } catch (err) {
    console.error('Erro ao comprimir imagem:', err);
    showToast('❌ Erro ao processar imagem.');
  }
}

function salvarProduto() {
  const nome      = document.getElementById('admin-produto-nome').value.trim();
  const precoStr  = document.getElementById('admin-produto-preco').value.trim();
  const categoria = document.getElementById('admin-produto-categoria').value;
  const desc      = document.getElementById('admin-produto-desc').value.trim();
  const imgUrl    = document.getElementById('admin-produto-img-url').value.trim();
  const ativo     = document.getElementById('admin-produto-ativo').checked;

  if (!nome || !precoStr) { 
    showToast('⚠️ Nome e preço são obrigatórios.'); 
    return; 
  }
  const preco = parseFloat(precoStr.replace(',', '.'));
  if (isNaN(preco) || preco < 0) { 
    showToast('⚠️ Preço inválido.'); 
    return; 
  }

  let imgFinal = imgUrl || 'assets/produtos/placeholder.jpg';
  if (imagemComprimida) {
    imgFinal = imagemComprimida;
  }

  if (editandoProdutoId && !imgUrl && !imagemComprimida) {
    const listaAtual = loadLS('produtos', []);
    const prodAtual = listaAtual.find(p => p.id === editandoProdutoId);
    if (prodAtual) {
      imgFinal = prodAtual.img;
    }
  }

  let lista = loadLS('produtos', []);

  if (editandoProdutoId) {
    lista = lista.map(p => p.id === editandoProdutoId
      ? { ...p, nome, preco, categoria, descricao: desc, img: imgFinal, ativo }
      : p);
    showToast('✅ Produto atualizado!');
  } else {
    lista.push({ id: uid(), nome, preco, categoria, descricao: desc, img: imgFinal, ativo });
    showToast('✅ Produto adicionado!');
  }

  saveLS('produtos', lista);
  syncProdutosToFirebase(lista);

  fecharModalProduto();
  renderAdminProdutos();
}

/* ── Expor funções globais ─────────────────────────────────── */
window.openAdminLogin     = openAdminLogin;
window.closeAdminLogin    = closeAdminLogin;
window.bindAdminLogin     = bindAdminLogin;
window.bindAdmin          = bindAdmin;
window.openAdmin          = openAdmin;
window.closeAdmin         = closeAdmin;
window.fecharModalProduto = fecharModalProduto;
window.$$                 = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
