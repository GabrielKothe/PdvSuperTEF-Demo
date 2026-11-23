// =========================
// PRODUTOS
// =========================

let productFilter = "";

function normalizeText(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function filteredProducts() {
  const q = normalizeText(productFilter.trim());
  if (!q) return PRODUCTS;
  return PRODUCTS.filter(p => normalizeText(p.name).includes(q) || p.sku.includes(q));
}

// Renderiza a grade de produtos
function renderProducts() {
  const wrap = $("products");
  const list = filteredProducts();
  wrap.innerHTML = "";

  for (const p of list) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "p";
    el.dataset.sku = p.sku;
    el.title = `Adicionar ${p.name}`;
    el.innerHTML = `
      <div class="p-thumb">${productVisual(p)}</div>
      <div class="p-body">
        <div class="p-name">${escapeHtml(p.name)}</div>
        <div class="p-sku">#${escapeHtml(p.sku)}</div>
        <div class="p-row">
          <span class="p-price">${fmtBRL(p.price)}</span>
          <span class="p-add"><svg class="ic"><use href="#i-plus"/></svg></span>
        </div>
      </div>
    `;
    el.addEventListener("click", () => {
      addToCart(p.sku);
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    });
    wrap.appendChild(el);
  }

  $("productsEmpty").hidden = list.length > 0;
  $("productCount").textContent = productFilter
    ? `${list.length} de ${PRODUCTS.length} produtos`
    : `${PRODUCTS.length} produtos`;
  updateProductBadges();
}

// Mostra a quantidade no carrinho sobre cada produto
function updateProductBadges() {
  document.querySelectorAll("#products .p").forEach(el => {
    const item = cart.get(el.dataset.sku);
    let badge = el.querySelector(".p-qty");
    if (item) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "p-qty";
        el.appendChild(badge);
      }
      badge.textContent = item.qty;
      el.classList.add("in-cart");
    } else {
      if (badge) badge.remove();
      el.classList.remove("in-cart");
    }
  });
}
