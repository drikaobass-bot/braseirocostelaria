# 🔥 Braseiro Costelaria — Cardápio Digital

> Cardápio digital profissional, moderno e responsivo para a **Braseiro Costelaria**. Funciona como um mini iFood exclusivo, com carrinho de pedidos, integração com WhatsApp e painel administrativo. **100% gratuito**, sem banco de dados, sem servidor.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Instalação e Uso Local](#instalação-e-uso-local)
5. [Personalização](#personalização)
6. [Publicação Gratuita](#publicação-gratuita)
7. [Painel Administrativo](#painel-administrativo)
8. [PWA — Instalação no Celular](#pwa--instalação-no-celular)
9. [Adicionando Produtos com Imagens](#adicionando-produtos-com-imagens)
10. [Perguntas Frequentes](#perguntas-frequentes)

---

## Visão Geral

O projeto é um **cardápio digital completo** desenvolvido em HTML, CSS e JavaScript puro, sem dependências externas pagas. Toda a persistência de dados é feita via **LocalStorage** do navegador.

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica e acessível |
| CSS3 | Identidade visual, animações, responsividade |
| JavaScript (ES6+) | Lógica de negócio, carrinho, pedidos |
| LocalStorage | Persistência de produtos e configurações |
| PWA | Instalação no celular, modo offline |
| WhatsApp API | Envio automático de pedidos |

---

## Funcionalidades

**Página inicial (Hero)**
- Logo, título e subtítulo configuráveis
- Badges informativos editáveis
- Botão de ação para o cardápio

**Cardápio**
- Grade responsiva de produtos com imagens
- Filtros por categoria (Costelas, Acompanhamentos, Bebidas, Combos)
- Modal de ampliação de imagem ao clicar
- Botão "Adicionar ao Pedido" em cada card

**Carrinho**
- Botão flutuante com contador de itens
- Drawer lateral com lista de itens
- Controle de quantidade por produto
- Remoção individual e limpeza total
- Total calculado em tempo real

**Finalização do Pedido**
- Seleção: Delivery ou Retirada
- Formulário completo (nome, telefone, endereço, data, horário, observações)
- Resumo do pedido antes de confirmar
- Geração automática de mensagem formatada
- Abertura direta do WhatsApp com a mensagem pronta

**Painel Administrativo**
- Senha de acesso (padrão: `braseiro2024`)
- Adicionar, editar e excluir produtos
- Upload de imagem ou URL externa
- Ativar/desativar produtos
- Alterar número do WhatsApp
- Editar textos da página inicial
- Tudo salvo em LocalStorage

**PWA**
- Instalável na tela inicial do celular
- Modo offline para páginas já carregadas
- Ícones em todos os tamanhos necessários

---

## Estrutura do Projeto

```
braseiro-costelaria/
├── index.html              # Página principal
├── manifest.json           # Configuração PWA
├── service-worker.js       # Cache offline
├── README.md               # Este arquivo
│
├── css/
│   └── style.css           # Estilos completos
│
├── js/
│   ├── app.js              # Lógica principal (cardápio, carrinho, pedido)
│   └── admin.js            # Painel administrativo
│
└── assets/
    ├── logo/
    │   ├── logo.png        # Logo principal
    │   ├── logo_ai.png     # Logo gerado por IA
    │   ├── hero-bg.jpg     # Imagem de fundo do hero
    │   └── og-image.jpg    # Imagem para compartilhamento
    │
    ├── produtos/
    │   ├── placeholder.jpg # Imagem padrão de produto
    │   └── [suas imagens]  # Adicione aqui as fotos dos produtos
    │
    └── icons/
        ├── icon-72.png     # Ícones PWA (todos os tamanhos)
        ├── icon-96.png
        ├── icon-128.png
        ├── icon-144.png
        ├── icon-152.png
        ├── icon-192.png
        ├── icon-384.png
        ├── icon-512.png
        ├── favicon-16.png
        ├── favicon-32.png
        └── favicon.ico
```

---

## Instalação e Uso Local

### Opção 1: Abrir direto no navegador

Basta abrir o arquivo `index.html` no navegador. O site funcionará normalmente, exceto pelo Service Worker (que requer HTTPS ou localhost).

### Opção 2: Servidor local (recomendado para testar PWA)

**Com Python:**
```bash
cd braseiro-costelaria
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

**Com Node.js:**
```bash
npx serve braseiro-costelaria
# ou
npx http-server braseiro-costelaria -p 8080
```

**Com VS Code:**
Instale a extensão **Live Server** e clique em "Go Live".

---

## Personalização

### 1. Alterar número do WhatsApp

**Via Painel Admin** (recomendado):
1. Acesse o site
2. Clique em "Admin" na navbar
3. Digite a senha (`braseiro2024`)
4. Vá em "Configurações"
5. Altere o campo "Número do WhatsApp"
6. Clique em "Salvar Configurações"

**Via código** (`js/admin.js`, linha 8):
```javascript
const ADMIN_PASS = 'braseiro2024'; // Altere a senha aqui
```

**Via código** (`js/app.js`, linha 14):
```javascript
whatsapp: '5511999999999', // Número com DDI (55) + DDD + número
```

### 2. Alterar senha do painel admin

No arquivo `js/admin.js`, linha 8:
```javascript
const ADMIN_PASS = 'suaNovaSenha';
```

### 3. Substituir o logo

Substitua o arquivo `assets/logo/logo.png` pela sua imagem.
- Formato recomendado: PNG com fundo transparente
- Tamanho recomendado: 512x512px

### 4. Alterar imagem do hero (fundo)

Substitua `assets/logo/hero-bg.jpg` pela imagem desejada.
- Formato: JPG ou PNG
- Tamanho recomendado: 1920x1080px ou maior

### 5. Alterar textos da página inicial

**Via Painel Admin** → Configurações → Página Inicial

**Via código** (`js/app.js`):
```javascript
const DEFAULT_CONFIG = {
  heroTitle: 'Braseiro Costelaria',
  heroSubtitle: 'Costela assada no bafo.',
  heroBadge1: '🥩 Costelas artesanais.',
  heroBadge2: '📅 Encomendas para sexta, sábado, domingo e feriados.',
  heroBadge3: '⏳ Produção artesanal.'
};
```

### 6. Alterar paleta de cores

No arquivo `css/style.css`, no bloco `:root`:
```css
:root {
  --preto:         #0d0d0d;   /* Fundo principal */
  --grafite:       #1e1e1e;   /* Fundo secundário */
  --vermelho:      #8b1a1a;   /* Cor de destaque */
  --vermelho-vivo: #c0392b;   /* Botões e ações */
  --dourado:       #c9a84c;   /* Títulos e destaques */
  --dourado-claro: #e8c96a;   /* Hover dourado */
  --branco:        #f5f5f5;   /* Texto principal */
}
```

---

## Publicação Gratuita

### GitHub Pages

1. Crie um repositório no GitHub (ex: `braseiro-cardapio`)
2. Faça upload de todos os arquivos do projeto
3. Vá em **Settings → Pages**
4. Em "Source", selecione **Deploy from a branch**
5. Selecione a branch `main` e pasta `/ (root)`
6. Clique em **Save**
7. Aguarde alguns minutos — seu site estará em:
   `https://seu-usuario.github.io/braseiro-cardapio/`

> **Importante:** No `manifest.json`, atualize `"start_url"` para `/braseiro-cardapio/`

### Netlify (recomendado — mais rápido)

1. Acesse [netlify.com](https://netlify.com) e crie uma conta gratuita
2. Clique em **"Add new site" → "Deploy manually"**
3. Arraste a pasta `braseiro-costelaria` para a área indicada
4. Pronto! Seu site estará online em segundos com URL automática
5. Opcionalmente, configure um domínio personalizado gratuito

### Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **"New Project"**
3. Importe o repositório do GitHub
4. Clique em **"Deploy"**
5. Site publicado com HTTPS automático

---

## Painel Administrativo

### Acesso

1. No site publicado, clique em **"Admin"** na barra de navegação
2. Digite a senha (padrão: `braseiro2024`)
3. Clique em **"Entrar"**

### Gerenciar Produtos

| Ação | Como fazer |
|---|---|
| Adicionar produto | Clique em "+ Novo Produto" |
| Editar produto | Clique em "Editar" no produto |
| Excluir produto | Clique em "Excluir" no produto |
| Desativar produto | Edite e desmarque "Produto ativo" |
| Alterar preço | Edite o produto e mude o preço |
| Alterar imagem | Edite e cole URL ou faça upload |

### Campos do Produto

| Campo | Descrição |
|---|---|
| Nome | Nome do produto exibido no cardápio |
| Preço | Valor em reais (ex: 120.00) |
| Categoria | costelas / acompanhamentos / bebidas / combos |
| Descrição | Texto opcional abaixo do nome |
| Imagem | URL externa ou upload direto |
| Ativo | Se marcado, aparece no cardápio |

> **Nota:** Todas as alterações são salvas no LocalStorage do navegador. Para compartilhar produtos entre dispositivos, use o painel para cadastrar os produtos em cada dispositivo, ou exporte/importe manualmente via console do navegador.

---

## PWA — Instalação no Celular

### Android (Chrome)

1. Acesse o site pelo Chrome no celular
2. Toque no menu (⋮) no canto superior direito
3. Selecione **"Adicionar à tela inicial"**
4. Confirme o nome e toque em **"Adicionar"**

### iPhone (Safari)

1. Acesse o site pelo Safari
2. Toque no botão de compartilhar (□↑)
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Confirme e toque em **"Adicionar"**

O app ficará disponível como ícone na tela inicial, abrindo em modo tela cheia sem barra do navegador.

---

## Adicionando Produtos com Imagens

Como especificado, as imagens dos produtos devem ser fornecidas pelo proprietário e **não serão alteradas**. Elas já contêm nome, preço e identidade visual.

### Via Painel Admin (recomendado)

1. Acesse o painel admin
2. Clique em "+ Novo Produto"
3. Preencha nome e preço (para referência interna)
4. No campo "Imagem":
   - **URL externa:** Cole o link direto da imagem (Google Drive, ImgBB, etc.)
   - **Upload:** Clique em "Ou fazer upload da imagem" e selecione o arquivo

### Via URL de hospedagem de imagens

Para hospedar suas imagens gratuitamente:
- [ImgBB](https://imgbb.com) — Upload gratuito, URL direta
- [Cloudinary](https://cloudinary.com) — Plano gratuito generoso
- [GitHub](https://github.com) — Faça upload no repositório e use a URL raw

### Via pasta local (para GitHub Pages)

1. Coloque as imagens em `assets/produtos/`
2. No painel admin, use o caminho relativo: `assets/produtos/nome-do-arquivo.jpg`

---

## Perguntas Frequentes

**P: Os dados do carrinho são salvos se fechar o navegador?**
R: Não. O carrinho é mantido apenas durante a sessão. Ao fechar o navegador, o carrinho é limpo. Os produtos e configurações do painel admin são salvos permanentemente no LocalStorage.

**P: Posso usar em múltiplos dispositivos ao mesmo tempo?**
R: Sim, mas cada dispositivo terá seu próprio LocalStorage. Alterações feitas no painel admin de um dispositivo não aparecem automaticamente nos outros.

**P: Como alterar a senha do admin?**
R: Edite o arquivo `js/admin.js` e altere o valor de `ADMIN_PASS` na linha 8.

**P: O site funciona sem internet?**
R: Após a primeira visita, o Service Worker armazena os arquivos em cache. O site funcionará offline para páginas já visitadas, mas o envio do pedido pelo WhatsApp requer conexão.

**P: Posso adicionar um domínio personalizado?**
R: Sim. Tanto o Netlify quanto o Vercel permitem configurar domínios personalizados gratuitamente. Você precisará adquirir o domínio (ex: no Registro.br) e apontar os DNS para o serviço.

**P: Como fazer backup dos produtos cadastrados?**
R: Abra o console do navegador (F12) e execute:
```javascript
console.log(localStorage.getItem('braseiro_produtos'));
```
Copie o JSON exibido para um arquivo de texto como backup.

---

## 📞 Suporte

Para dúvidas sobre personalização ou publicação, consulte a documentação de cada plataforma:
- [GitHub Pages Docs](https://docs.github.com/pages)
- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)

---

*Desenvolvido com ❤️ para a Braseiro Costelaria.*
