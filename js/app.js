// ==========================================
// FIX DE VARIÁVEIS GLOBAIS E FALLBACKS
// ==========================================
if (typeof DEFAULT_PRODUTOS === 'undefined') {
  window.DEFAULT_PRODUTOS = [];
}

// Garante que a função de adicionar ao carrinho exista no escopo global
window.adicionarAoCarrinho = function(idProduto) {
  if (typeof window.adicionarItem === 'function') {
    window.adicionarItem(idProduto);
  } else if (typeof window.addToCart === 'function') {
    window.addToCart(idProduto);
  } else if (typeof window.adicionarProduto === 'function') {
    window.adicionarProduto(idProduto);
  } else {
    console.log("Adicionado ao carrinho (ID):", idProduto);
    alert("Produto adicionado ao carrinho!");
  }
};

// ==========================================
// ESCUTA DE PRODUTOS DO FIREBASE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const containerProdutos = document.getElementById('produtos-grid');

  const db = window.database || (typeof firebase !== 'undefined' ? firebase.database() : null);

  if (!db) {
    console.error("Firebase Realtime Database não inicializado corretamente.");
    if (containerProdutos) {
      containerProdutos.innerHTML = '<p style="color:#fff; text-align:center; grid-column:1/-1;">Erro ao conectar com o banco de dados. Atualize a página.</p>';
    }
    return;
  }

  db.ref('produtos').on('value', (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      if (containerProdutos) {
        containerProdutos.innerHTML = '<p style="color:#fff; text-align:center; grid-column:1/-1;">Nenhum produto disponível no momento.</p>';
      }
      return;
    }

    let listaProdutos = [];
    if (Array.isArray(data)) {
      listaProdutos = data.filter(Boolean);
    } else if (typeof data === 'object') {
      listaProdutos = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }

    if (typeof window.renderizarProdutos === 'function') {
      window.renderizarProdutos(listaProdutos);
    } else if (typeof window.renderProdutos === 'function') {
      window.renderProdutos(listaProdutos);
    } else {
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
// RENDERIZADOR DE EMERGÊNCIA
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
          <button onclick="window.adicionarAoCarrinho('${prod.id}')" class="btn-adicionar">Adicionar</button>
        </div>
      </div>
    </div>
  `).join('');
}
