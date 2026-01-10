// =========================
// PRODUTOS
// =========================

// Render produtos
function renderProducts() {
  const wrap = $("products");
  wrap.innerHTML = "";
  for (const p of PRODUCTS) {
    const el = document.createElement("div");
    el.className = "p";
    
    // Layout horizontal: imagem à esquerda, conteúdo à direita
    el.innerHTML = `
      <div class="p-content-row">
        <div class="p-img-wrapper">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" class="p-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
          <div class="p-img-placeholder" style="display: ${p.image ? 'none' : 'flex'}">🛍️</div>
        </div>
        <div class="p-info">
          <div class="p-info-top">
            <div>
              <div class="name">${p.name}</div>
              <div class="sku">SKU: ${p.sku}</div>
            </div>
            <div class="price">${fmtBRL(p.price)}</div>
          </div>
          <button data-sku="${p.sku}">Adicionar</button>
        </div>
      </div>
    `;
    
    el.querySelector("button").addEventListener("click", () => addToCart(p.sku));
    wrap.appendChild(el);
  }
}
