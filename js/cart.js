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
    const decreaseBtnClass = it.qty === 1 ? 'qty-single' : '';
    qtyTd.innerHTML = `
      <div class="qty">
        <button class="${decreaseBtnClass}" title="Diminuir">−</button>
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
  if ($("grandTotalPayment")) {
    $("grandTotalPayment").textContent = fmtBRL(total);
  }
  $("cartCount").textContent = `${items} itens`;
  
  // Desabilitar botão "Escolher forma de pagamento" se carrinho vazio
  const btnChoosePayment = document.getElementById("btnChoosePayment");
  if (btnChoosePayment) {
    if (items === 0) {
      btnChoosePayment.disabled = true;
      btnChoosePayment.style.opacity = "0.5";
      btnChoosePayment.style.cursor = "not-allowed";
    } else {
      btnChoosePayment.disabled = false;
      btnChoosePayment.style.opacity = "1";
      btnChoosePayment.style.cursor = "pointer";
    }
  }
}
