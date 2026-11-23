// =========================
// CARRINHO DE COMPRAS
// =========================

// Carrinho em memória
const cart = new Map(); // sku -> { sku, name, price, qty, image }

// Salva carrinho no cache
function saveCartToCache() {
  try {
    const cartArray = Array.from(cart.entries()).map(([sku, item]) => ({
      sku,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: item.image || null
    }));
    localStorage.setItem("pdv_cart_cache", JSON.stringify(cartArray));
  } catch (e) {
    console.error("Erro ao salvar carrinho no cache:", e);
  }
}

// Carrega carrinho do cache
function loadCartFromCache() {
  try {
    const cached = localStorage.getItem("pdv_cart_cache");
    if (cached) {
      const cartArray = JSON.parse(cached);
      cart.clear();
      cartArray.forEach(item => {
        cart.set(item.sku, {
          sku: item.sku,
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image || null
        });
      });
    }
  } catch (e) {
    console.error("Erro ao carregar carrinho do cache:", e);
    cart.clear();
  }
}

// Limpa o cache do carrinho
function clearCartCache() {
  try {
    localStorage.removeItem("pdv_cart_cache");
  } catch (e) {
    console.error("Erro ao limpar cache do carrinho:", e);
  }
}

// Adiciona produto ao carrinho
function addToCart(sku) {
  const p = PRODUCTS.find(x => x.sku === sku);
  if (!p) return;
  const cur = cart.get(sku);
  if (cur) cur.qty += 1;
  else cart.set(sku, { ...p, qty: 1 });
  renderCart();
  saveCartToCache(); // Salvar no cache
  
  // Se estiver na aba de pagamento, voltar para a aba do carrinho
  if (typeof switchTab === 'function') {
    const tabPayment = document.getElementById("tabPayment");
    if (tabPayment && tabPayment.classList.contains("active")) {
      switchTab('cart');
    }
  }

  // Rola o item adicionado para a vista
  const idx = Array.from(cart.keys()).indexOf(sku);
  const row = $("cartRows").children[idx];
  if (row && window.matchMedia("(min-width: 901px)").matches) row.scrollIntoView({ block: "nearest" });
}

// Incrementa quantidade de um item
function incQty(sku) {
  const it = cart.get(sku);
  if (!it) return;
  it.qty += 1;
  renderCart();
  saveCartToCache(); // Salvar no cache
}

// Decrementa quantidade de um item
function decQty(sku) {
  const it = cart.get(sku);
  if (!it) return;
  it.qty -= 1;
  if (it.qty <= 0) cart.delete(sku);
  renderCart();
  saveCartToCache(); // Salvar no cache
}

// Limpa o carrinho
function clearCart() {
  cart.clear();
  renderCart();
  clearCartCache(); // Limpar cache quando limpar carrinho
  // Voltar para a aba do carrinho se existir a função switchTab
  if (typeof switchTab === 'function') {
    switchTab('cart');
  }
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

// Remove um item inteiro
function removeItem(sku) {
  cart.delete(sku);
  renderCart();
  saveCartToCache();
}

// Renderiza o carrinho na tela
function renderCart() {
  const rows = $("cartRows");
  rows.innerHTML = "";
  for (const it of cart.values()) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-thumb">${productVisual(it)}</div>
      <div class="cart-info">
        <div class="cart-name" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</div>
        <div class="cart-unit">${fmtBRL(it.price)} / un</div>
      </div>
      <div class="cart-total">${fmtBRL(it.price * it.qty)}</div>
      <div class="qty">
        <button class="${it.qty === 1 ? "qty-single" : ""}" title="${it.qty === 1 ? "Remover" : "Diminuir"}">
          <svg class="ic"><use href="#${it.qty === 1 ? "i-trash" : "i-minus"}"/></svg>
        </button>
        <span>${it.qty}</span>
        <button title="Aumentar"><svg class="ic"><use href="#i-plus"/></svg></button>
      </div>
      <button class="cart-remove" title="Remover item">Remover</button>
    `;
    const btns = row.querySelectorAll(".qty button");
    btns[0].addEventListener("click", () => decQty(it.sku));
    btns[1].addEventListener("click", () => incQty(it.sku));
    row.querySelector(".cart-remove").addEventListener("click", () => removeItem(it.sku));
    rows.appendChild(row);
  }

  const { total, items } = cartTotals();
  const itemsTxt = `${items} ${items === 1 ? "item" : "itens"}`;
  $("cartEmpty").hidden = items > 0;
  $("subTotal").textContent = fmtBRL(total);
  $("grandTotal").textContent = fmtBRL(total);
  $("grandTotalPayment").textContent = fmtBRL(total);
  $("payBtnAmount").textContent = fmtBRL(total);
  $("paymentItemsInfo").textContent = itemsTxt;
  $("cartCount").textContent = items;
  $("mbItems").textContent = itemsTxt;
  $("mbTotal").textContent = fmtBRL(total);
  $("mobileBar").classList.toggle("hide", items === 0);

  $("btnChoosePayment").disabled = items === 0;
  $("btnClear").disabled = items === 0;
  $("btnPay").disabled = items === 0;

  if (typeof updateProductBadges === "function") updateProductBadges();
  if (typeof updateInstallmentInfo === "function") updateInstallmentInfo();
}
