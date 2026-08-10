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
