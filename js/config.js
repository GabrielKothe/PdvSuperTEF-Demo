// =========================
// CONFIGURAÇÕES GLOBAIS
// =========================
const API_BASE = "https://api.supertef.com.br/api"; // URL produção
const POLL_MS = 1000; // recomendação 4s (ajuste conforme necessário)

// Produtos fixos (exemplo PDV mercado)
// Adicione a URL da imagem de cada produto no campo 'image'
const PRODUCTS = [
  { sku:"0001", name:"Coca cola lata", price: 6.50, image: "img/FotoProduto.png" },
  { sku:"0002", name:"Cheetos", price: 8.90, image: "img/FotoProduto.png" },
  { sku:"0003", name:"Guaraná lata", price: 5.90, image: "img/FotoProduto.png" },
  { sku:"0004", name:"Pão de queijo", price: 12.00, image: "img/FotoProduto.png" },
  { sku:"0005", name:"Água mineral 500ml", price: 3.50, image: "img/FotoProduto.png" },
  { sku:"0006", name:"Coca cola 2L", price: 11.90, image: "img/FotoProduto.png" },
  { sku:"0007", name:"Pepsi lata", price: 6.30, image: "img/FotoProduto.png" },
  { sku:"0008", name:"Suco Del Valle lata", price: 5.50, image: "img/FotoProduto.png" },
  { sku:"0009", name:"Fanta laranja lata", price: 6.20, image: "img/FotoProduto.png" },
  { sku:"0010", name:"Red Bull lata", price: 12.50, image: "img/FotoProduto.png" },
  { sku:"0011", name:"Água com gás 500ml", price: 4.00, image: "img/FotoProduto.png" },
  { sku:"0012", name:"Suco de laranja 1L", price: 8.90, image: "img/FotoProduto.png" },
  { sku:"0013", name:"Gatorade 500ml", price: 7.50, image: "img/FotoProduto.png" },
  { sku:"0014", name:"Cerveja Brahma lata", price: 4.90, image: "img/FotoProduto.png" },
  { sku:"0015", name:"Cerveja Skol lata", price: 4.90, image: "img/FotoProduto.png" },
  { sku:"0016", name:"Ruffles original", price: 9.90, image: "img/FotoProduto.png" },
  { sku:"0017", name:"Doritos", price: 10.50, image: "img/FotoProduto.png" },
  { sku:"0018", name:"Fandangos", price: 8.50, image: "img/FotoProduto.png" },
  { sku:"0019", name:"Bis chocolate", price: 5.90, image: "img/FotoProduto.png" },
  { sku:"0020", name:"Snickers", price: 6.50, image: "img/FotoProduto.png" },
  { sku:"0021", name:"Kit Kat", price: 6.90, image: "img/FotoProduto.png" },
  { sku:"0022", name:"Chocolate Laka", price: 5.50, image: "img/FotoProduto.png" },
  { sku:"0023", name:"Pipoca de microondas", price: 7.90, image: "img/FotoProduto.png" },
  { sku:"0024", name:"Salgadinho Elma Chips", price: 8.90, image: "img/FotoProduto.png" },
  { sku:"0025", name:"Biscoito Oreo", price: 6.50, image: "img/FotoProduto.png" },
  { sku:"0026", name:"Biscoito Passatempo", price: 5.90, image: "img/FotoProduto.png" },
  { sku:"0027", name:"Bala Fini 50g", price: 4.50, image: "img/FotoProduto.png" },
  { sku:"0028", name:"Chiclete Trident", price: 3.90, image: "img/FotoProduto.png" },
  { sku:"0029", name:"Barra de cereal", price: 4.90, image: "img/FotoProduto.png" },
  { sku:"0030", name:"Pastel assado", price: 7.50, image: "img/FotoProduto.png" },
  { sku:"0031", name:"Coxinha", price: 5.50, image: "img/FotoProduto.png" },
  { sku:"0032", name:"Empada", price: 6.00, image: "img/FotoProduto.png" },
  { sku:"0033", name:"Sanduíche natural", price: 12.90, image: "img/FotoProduto.png" },
  { sku:"0034", name:"Salgado misto", price: 6.50, image: "img/FotoProduto.png" }
];
