// =========================
// CARRINHO DE COMPRAS
// =========================

// Carrinho em memória
const cart = new Map(); // sku -> { sku, name, price, qty }

// Adiciona produto ao carrinho
function addToCart(sku) {
  const p = PRODUCTS.find(x => x.sku === sku);
  if (!p) return;
  const cur = cart.get(sku);
  if (cur) cur.qty += 1;
  else cart.set(sku, { ...p, qty: 1 });
  renderCart();
}

// Incrementa quantidade de um item
function incQty(sku) {
  const it = cart.get(sku);
  if (!it) return;
  it.qty += 1;
  renderCart();
}

// Decrementa quantidade de um item
function decQty(sku) {
  const it = cart.get(sku);
  if (!it) return;
  it.qty -= 1;
  if (it.qty <= 0) cart.delete(sku);
  renderCart();
}

// Limpa o carrinho
function clearCart() {
  cart.clear();
  renderCart();
}

// Calcula totais do carrinho
function cartTotals() {
  let total = 0;
  let items = 0;
  for (const it of cart.values()) {
    total += it.price * it.qty;
    items += it.qty;
  }
  return { total, items };
}

// Renderiza o carrinho na tela
function renderCart() {
  const rows = $("cartRows");
  rows.innerHTML = "";
  for (const it of cart.values()) {
    const tr = document.createElement("tr");
    
    // Usar imagem do item do carrinho (já preservada quando adicionado)
    const productImage = it.image || "";
    
    const firstTd = document.createElement("td");
    firstTd.innerHTML = `
      <div class="p-img-wrapper cart-img">
        ${productImage ? `<img src="${productImage}" alt="${it.name}" class="cart-item-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
        <div class="cart-item-img-placeholder" style="display: ${productImage ? 'none' : 'flex'}">🛍️</div>
      </div>
      <div class="cart-item-info">
        <div style="font-weight:700">${it.name}</div>
        <div style="color:var(--muted); font-size:12px;">${fmtBRL(it.price)} un</div>
      </div>
    `;
    
    const qtyTd = document.createElement("td");
    qtyTd.innerHTML = `
      <div class="qty">
        <button title="Diminuir">−</button>
        <span style="min-width:22px; text-align:center;">${it.qty}</span>
        <button title="Aumentar">+</button>
      </div>
    `;
    
    const priceTd = document.createElement("td");
    priceTd.textContent = fmtBRL(it.price * it.qty);
    
    tr.appendChild(firstTd);
    tr.appendChild(qtyTd);
    tr.appendChild(priceTd);
    
    const btns = tr.querySelectorAll("button");
    btns[0].addEventListener("click", () => decQty(it.sku));
    btns[1].addEventListener("click", () => incQty(it.sku));
    rows.appendChild(tr);
  }

  const { total, items } = cartTotals();
  $("subTotal").textContent = fmtBRL(total);
  $("grandTotal").textContent = fmtBRL(total);
  $("cartCount").textContent = `${items} itens`;
}
