// ==========================================
// FIX DE VARIÁVEIS GLOBAIS E FALLBACKS
// ==========================================
if (typeof DEFAULT_PRODUTOS === 'undefined') {
  window.DEFAULT_PRODUTOS = [];
}

// ==========================================
// ESCUTA DE PRODUTOS DO FIREBASE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const containerProdutos = document.getElementById('produtos-grid');

  // Verifica se o Firebase Database está disponível no escopo global
  const db = window.database || (typeof firebase !== 'undefined' ? firebase.database() : null);

  if (!db) {
    console.error("Firebase Realtime Database não inicializado corretamente.");
    if (containerProdutos) {
      containerProdutos.innerHTML = '<p style="color:#fff; text-align:center; grid-column:1/-1;">Erro ao conectar com o banco de dados. Atualize a página.</p>';
    }
    return;
  }

  // Leitura em tempo real do nó "produtos"
  db.ref('produtos').on('value', (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      if (containerProdutos) {
        containerProdutos.innerHTML = '<p style="color:#fff; text-align:center; grid-column:1/-1;">Nenhum produto disponível no momento.</p>';
      }
      return;
    }

    // Normaliza os dados vindo do Firebase (trata se vier Array ou Objeto com chaves)
    let listaProdutos = [];
    if (Array.isArray(data)) {
      listaProdutos = data.filter(Boolean);
    } else if (typeof data === 'object') {
      listaProdutos = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }

    // Tenta renderizar usando as funções existentes no app
    if (typeof renderizarProdutos === 'function') {
      renderizarProdutos(listaProdutos);
    } else if (typeof renderProdutos === 'function') {
      renderProdutos(listaProdutos);
    } else {
      // Fallback seguro de montagem caso as funções auxiliares tenham falhado
      exibirProdutosFallback(listaProdutos, containerProdutos);
    }
  }, (error) => {
    console.error("Erro na leitura do Firebase:", error);
    if (containerProdutos) {
      containerProdutos.innerHTML = '<p style="color:#fff; text-align:center; grid-column:1/-1;">Falha ao carregar o cardápio.</p>';
    }
  });
});

// ==========================================
// RENDERIZADOR DE EMERGÊNCIA (FALLBACK)
// ==========================================
function exibirProdutosFallback(produtos, container) {
  if (!container) return;
  
  container.innerHTML = produtos.map(prod => `
    <div class="produto-card" data-categoria="${prod.categoria || 'outros'}">
      ${prod.imagem ? `<img src="${prod.imagem}" alt="${prod.nome}" class="produto-img">` : ''}
      <div class="produto-info">
        <h3>${prod.nome || 'Produto sem nome'}</h3>
        <p>${prod.descricao || ''}</p>
        <div class="produto-footer">
          <span class="preco">R$ ${parseFloat(prod.preco || 0).toFixed(2).replace('.', ',')}</span>
          <button onclick="adicionarAoCarrinho('${prod.id}')" class="btn-adicionar">Adicionar</button>
        </div>
      </div>
    </div>
  `).join('');
}
