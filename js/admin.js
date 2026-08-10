/* ============================================================
   BRASEIRO COSTELARIA — admin.js
   Painel Administrativo com Firebase + LocalStorage + Compressão
   ============================================================ */

'use strict';

let adminLogado = false;

// ============================================================
// SEGURANÇA: Criptografia para LocalStorage
// ============================================================

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

/* ── Utilitários ───────────────────────────────────────────── */
function saveLS(key, val) {
  try {
    const encrypted = encryptData(val);
    localStorage.setItem('braseiro_' + key, encrypted);
  } catch (e) {
    console.warn('LocalStorage quota exceeded:', e.message);
    showToast('⚠️ Armazenamento cheio! Tente usar imagens menores.');
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

      // ✅ FIREBASE AUTHENTICATION (RESTAURADO E SEGURO)
      firebase.auth().signInWithEmailAndPassword('drikao.bass@gmail.com', senha)
        .then(() => {
          adminLogado = true;
          closeAdminLogin();
          openAdmin();
          error.textContent = '';
        })
        .catch(err => {
          console.error('Erro na autenticação Firebase:', err);
          if (err.code === 'auth/wrong-password') {
            error.textContent = 'Senha incorreta. Tente novamente.';
          } else if (err.code === 'auth/user-not-found') {
            error.textContent = 'Usuário não encontrado. Verifique o e-mail.';
          } else {
            error.textContent = 'Erro ao fazer login: ' + err.message;
          }
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

  if (typeof STATE !== 'undefined') {
    STATE.config   = loadLS('config', {});
    STATE.produtos = loadLS('produtos', []);
    if (typeof applyConfig === 'function') applyConfig();
    if (typeof renderProdutos === 'function') renderProdutos();
  }
}

/* ── Tabs ──────────────────────────────────────────────────── */
function bindAdmin() {
  const btnClose = document.getElementById('btn-admin-close');
  if (btnClose) btnClose.addEventListener('click', closeAdmin);

  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach(t => t.classList.remove('active'));
      $$('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = document.getElementById('admin-panel-' + tab.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  const btnSaveCfg = document.getElementById('btn-save-config');
  if (btnSaveCfg) btnSaveCfg.addEventListener('click', salvarConfig);

  const btnNovoProd = document.getElementById('btn-novo-produto');
  if (btnNovoProd) btnNovoProd.addEventListener('click', () => abrirModalProduto(null));

  const btnCloseProdModal = document.getElementById('btn-admin-produto-close');
  if (btnCloseProdModal) btnCloseProdModal.addEventListener('click', fecharModalProduto);

  const btnSaveProd = document.getElementById('btn-admin-produto-save');
  if (btnSaveProd) btnSaveProd.addEventListener('click', salvarProduto);

  const inputFile = document.getElementById('admin-produto-img-file');
  if (inputFile) inputFile.addEventListener('change', handleImgUpload);

  const btnCancelProd = document.getElementById('btn-admin-produto-cancel');
  if (btnCancelProd) {
    btnCancelProd.addEventListener('click', fecharModalProduto);
  }
}

/* ── Configurações ─────────────────────────────────────────── */
function preencherConfigForm() {
  const c = loadLS('config', {});
  const def = {
    whatsapp: '5562981401158',
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

  const ordemCategorias = ['costelas', 'acompanhamentos', 'bebidas', 'combos'];
  const categorias = {};

  lista.forEach(p => {
    const cat = p.categoria || 'outros';
    if (!categorias[cat]) categorias[cat] = [];
    categorias[cat].push(p);
  });

  let html = '';
  
  ordemCategorias.forEach(catKey => {
    if (!categorias[catKey]) return;

    const itens = categorias[catKey];
    itens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    let displayName = catKey;
    if (catKey === 'costelas') displayName = '🥩 Carnes no Bafo';
    else if (catKey === 'acompanhamentos') displayName = '🍚 Acompanhamentos';
    else if (catKey === 'bebidas') displayName = '🥤 Bebidas';
    else if (catKey === 'combos') displayName = '🔥 Combos';

    html += `<div style="margin-bottom: 30px; border-bottom: 2px solid var(--grafite-3); padding-bottom: 15px;">`;
    html += `<h4 style="color: var(--dourado); margin-bottom: 15px;">${displayName}</h4>`;
    
    html += itens.map(p => `
      <div class="produto-admin-item" data-id="${p.id}">
        <div class="produto-admin-ordem" style="display:flex; flex-direction:column; gap:4px; margin-right:12px;">
          <button class="btn-admin-ordem-up" data-id="${p.id}" data-categoria="${catKey}" title="Mover para cima">⬆</button>
          <span style="font-size:0.75rem; color: var(--texto-muted); text-align:center;">${p.ordem || '0'}</span>
          <button class="btn-admin-ordem-down" data-id="${p.id}" data-categoria="${catKey}" title="Mover para baixo">⬇</button>
        </div>
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
      </div>
    `).join('');
    
    html += `</div>`;
  });

  container.innerHTML = html;

  $$('.btn-admin-ordem-up').forEach(btn => {
    btn.addEventListener('click', () => alterarOrdem(btn.dataset.id, btn.dataset.categoria, -1));
  });
  $$('.btn-admin-ordem-down').forEach(btn => {
    btn.addEventListener('click', () => alterarOrdem(btn.dataset.id, btn.dataset.categoria, 1));
  });

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

  let lista = loadLS('produtos', []);

  if (editandoProdutoId) {
    lista = lista.map(p => p.id === editandoProdutoId
      ? { ...p, nome, preco, categoria, descricao: desc, img: imgFinal, ativo }
      : p);
    showToast('✅ Produto atualizado!');
  } else {
    const itensMesmaCategoria = lista.filter(p => p.categoria === categoria);
    
    let maiorOrdem = 0;
    if (itensMesmaCategoria.length > 0) {
      const sorted = itensMesmaCategoria.sort((a, b) => (b.ordem || 0) - (a.ordem || 0));
      maiorOrdem = sorted[0].ordem || 0;
    }

    const novaOrdem = maiorOrdem + 10;

    lista.push({ 
      id: uid(), 
      nome, 
      preco, 
      categoria, 
      descricao: desc, 
      img: imgFinal, 
      ativo,
      ordem: novaOrdem 
    });
    showToast('✅ Produto adicionado ao final da categoria!');
  }

  saveLS('produtos', lista);
  syncProdutosToFirebase(lista);

  fecharModalProduto();
  renderAdminProdutos();
}

/* ── Lógica de Ordenação CORRIGIDA ─────────────────────────── */
function alterarOrdem(id, categoria, direcao) {
  let lista = loadLS('produtos', []);
  
  // Filtra apenas os itens da categoria selecionada e ordena por ordem atual
  let itensCategoria = lista.filter(p => p.categoria === categoria).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  
  // Encontra o índice do item a ser movido
  const indexAtual = itensCategoria.findIndex(p => p.id === id);
  if (indexAtual === -1) return;

  // Calcula o novo índice com base na direção
  const novoIndex = indexAtual + direcao;
  
  // Verifica se o movimento é válido (não ultrapassa os limites da lista)
  if (novoIndex < 0 || novoIndex >= itensCategoria.length) {
    showToast('⚠️ Já está no limite da lista.');
    return;
  }

  // Troca as posições no array da categoria
  [itensCategoria[indexAtual], itensCategoria[novoIndex]] = [itensCategoria[novoIndex], itensCategoria[indexAtual]];

  // Recalcula a ordem sequencial para a categoria inteira (10, 20, 30...)
  itensCategoria.forEach((p, i) => {
    p.ordem = (i + 1) * 10;
  });

  // Atualiza a lista principal com os novos valores de ordem
  itensCategoria.forEach(p => {
    const idxMain = lista.findIndex(x => x.id === p.id);
    if (idxMain !== -1) {
      lista[idxMain].ordem = p.ordem;
    }
  });

  // Persiste as alterações
  saveLS('produtos', lista);
  syncProdutosToFirebase(lista);
  renderAdminProdutos();
  
  // Atualiza o cardápio em tempo real, se a função existir
  if (typeof STATE !== 'undefined' && typeof renderProdutos === 'function') {
    STATE.produtos = lista;
    const activeFilterBtn = $('.filter-btn.active');
    const filtroAtual = activeFilterBtn ? activeFilterBtn.dataset.filter : 'todos';
    renderProdutos(filtroAtual);
  }
  
  showToast('✅ Ordem atualizada!');
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
