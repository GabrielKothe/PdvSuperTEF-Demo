// =========================
// INICIALIZAÇÃO E EVENTOS
// =========================

// Forma de pagamento
function getSelectedPaymentMethod() {
  const activeBtn = document.querySelector(".payment-method-btn.active");
  return activeBtn ? activeBtn.getAttribute("data-method") : "debit";
}

function setSelectedPaymentMethod(method) {
  document.querySelectorAll(".payment-method-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-method") === method);
  });
  onMethodChange();
}

function onMethodChange() {
  $("instWrap").style.display = getSelectedPaymentMethod() === "credit_inst" ? "flex" : "none";
  updateInstallmentInfo();
}

// Parcelas
function clampInstallments(v) {
  return Math.min(18, Math.max(2, parseInt(v, 10) || 2));
}
function changeInstallments(delta) {
  $("installments").value = clampInstallments(Number($("installments").value) + delta);
  updateInstallmentInfo();
}
function updateInstallmentInfo() {
  const info = $("instInfo");
  if (!info) return;
  const n = clampInstallments($("installments").value);
  const { total } = cartTotals();
  info.textContent = total > 0 ? `${n}x de ${fmtBRL(total / n)}` : "";
}

// Gera um novo número de pedido
function newOrderId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  $("orderId").value = `PDV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// =========================
// TEMA
// =========================

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButton(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const use = document.querySelector("#btnToggleTheme use");
  if (use) use.setAttribute("href", theme === "dark" ? "#i-sun" : "#i-moon");
  $("btnToggleTheme").title = theme === "dark" ? "Tema claro" : "Tema escuro";
}

// =========================
// RELÓGIO
// =========================

function startClock() {
  const tick = () => {
    $("clock").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  tick();
  setInterval(tick, 15000);
}

// =========================
// EVENTOS
// =========================

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  startClock();
  newOrderId();

  $("btnToggleTheme").addEventListener("click", toggleTheme);
  $("btnPay").addEventListener("click", startPayment);
  $("btnClear").addEventListener("click", () => {
    if (cartTotals().items === 0) return;
    if (confirm("Limpar todos os itens do carrinho?")) clearCart();
  });

  setupTabs();

  // Formas de pagamento
  document.querySelectorAll(".payment-method-btn").forEach(btn => {
    btn.addEventListener("click", () => setSelectedPaymentMethod(btn.getAttribute("data-method")));
  });

  // Parcelas
  $("instDec").addEventListener("click", () => changeInstallments(-1));
  $("instInc").addEventListener("click", () => changeInstallments(1));
  $("installments").addEventListener("input", updateInstallmentInfo);
  $("installments").addEventListener("change", () => {
    $("installments").value = clampInstallments($("installments").value);
    updateInstallmentInfo();
  });

  // Busca de produtos
  const search = $("productSearch");
  search.addEventListener("input", () => {
    productFilter = search.value;
    renderProducts();
  });
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      const first = filteredProducts()[0];
      if (first) {
        addToCart(first.sku);
        search.select();
      }
    } else if (ev.key === "Escape") {
      search.value = "";
      productFilter = "";
      renderProducts();
      search.blur();
    }
  });

  // Modal de pagamento
  $("btnCancelTef").addEventListener("click", cancelarSolicitacaoPagamento);
  $("btnCloseOk").addEventListener("click", () => {
    stopAllPaymentTimers();
    closeModal();
  });

  // Configurações
  $("btnConfig").addEventListener("click", openConfig);
  $("connStatus").addEventListener("click", openConfig);
  $("btnSaveConfig").addEventListener("click", saveConfig);
  $("btnCancelConfig").addEventListener("click", closeConfig);
  $("btnCloseConfig").addEventListener("click", closeConfig);
  $("btnClearSensitiveData").addEventListener("click", clearSensitiveData);
  $("cfgListarPos").addEventListener("change", updatePosIdField);
  setupTokenToggle();
  ["cfgToken", "cfgCliente", "cfgPosId"].forEach(id =>
    $(id).addEventListener("keydown", (ev) => { if (ev.key === "Enter") saveConfig(); }));

  // Seleção de POS
  $("btnClosePosSelect").addEventListener("click", closePosSelectModal);
  $("btnCancelPosSelect").addEventListener("click", closePosSelectModal);

  // Painel de log
  $("btnToggleLog").addEventListener("click", toggleLogPanel);
  $("btnCloseLog").addEventListener("click", toggleLogPanel);
  $("btnClearLog").addEventListener("click", clearRequestLogs);
  $("btnCopyLog").addEventListener("click", copyRequestLogs);

  // Barra mobile
  $("mbGo").addEventListener("click", () => $("orderPanel").scrollIntoView({ behavior: "smooth" }));

  // Fechar modais clicando fora (exceto o de pagamento em andamento)
  ["configModal", "posSelectModal"].forEach(id => {
    $(id).addEventListener("mousedown", (ev) => {
      if (ev.target.id === id) (id === "configModal" ? closeConfig : closePosSelectModal)();
    });
  });

  setupFullscreen();
  setupKeyboard();

  renderProducts();
  loadCartFromCache();
  renderCart();
  setSelectedPaymentMethod("debit");
  updateConnStatus();
  checkAndOpenConfig();
});

// =========================
// ATALHOS DE TECLADO
// =========================

function anyModalOpen() {
  return document.querySelector(".modal.open") !== null;
}

function setupKeyboard() {
  document.addEventListener("keydown", (ev) => {
    const payModalOpen = $("modal").classList.contains("open");

    if (ev.key === "Escape") {
      if ($("configModal").classList.contains("open")) return closeConfig();
      if ($("posSelectModal").classList.contains("open")) return closePosSelectModal();
      if ($("logPanel").classList.contains("open")) return toggleLogPanel();
      if (payModalOpen) {
        // Só fecha com Esc quando o pagamento já terminou
        if ($("btnCloseOk").style.display !== "none") $("btnCloseOk").click();
        return;
      }
      if ($("tabPayment").classList.contains("active")) return switchTab("cart");
      return;
    }

    if (anyModalOpen()) return;

    if (ev.key === "F2") {
      ev.preventDefault();
      $("productSearch").focus();
      $("productSearch").select();
      return;
    }
    if (ev.key === "F4") {
      ev.preventDefault();
      switchTab("payment");
      return;
    }
    if (ev.key === "F9") {
      ev.preventDefault();
      if (!$("tabPayment").classList.contains("active")) switchTab("payment");
      else startPayment();
      return;
    }

    // 1–5 escolhem a forma de pagamento (somente na etapa de pagamento e fora de campos de texto)
    const tag = (ev.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if ($("tabPayment").classList.contains("active") && /^[1-5]$/.test(ev.key)) {
      const btn = document.querySelectorAll(".payment-method-btn")[Number(ev.key) - 1];
      if (btn) btn.click();
    }
  });
}

// =========================
// VERIFICAÇÃO DE CONFIGURAÇÃO
// =========================

function checkAndOpenConfig() {
  const token = localStorage.getItem("supertef_token");
  const cliente = localStorage.getItem("supertef_cliente_chave");
  if (!token || !cliente) setTimeout(openConfig, 300);
}

// =========================
// ETAPAS (Pedido / Pagamento)
// =========================

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });
  $("btnChoosePayment").addEventListener("click", () => switchTab("payment"));
  $("btnBackToCart").addEventListener("click", () => switchTab("cart"));
}

function switchTab(tabName) {
  if (tabName === "payment" && cartTotals().items === 0) {
    showToast("Adicione produtos ao carrinho antes de ir para o pagamento.", "warning");
    return;
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  });
  const targetId = `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("active", content.id === targetId);
  });

  if (tabName === "payment") {
    $("grandTotalPayment").textContent = fmtBRL(cartTotals().total);
    updateInstallmentInfo();
    setTimeout(() => $("btnPay").focus(), 30);
  }
}

// =========================
// TELA CHEIA
// =========================

function setupFullscreen() {
  updateFullscreenButton();
  $("btnToggleFullscreen").addEventListener("click", toggleFullscreen);
  ["fullscreenchange", "webkitfullscreenchange"].forEach(evt =>
    document.addEventListener(evt, updateFullscreenButton));
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateFullscreenButton() {
  const btn = $("btnToggleFullscreen");
  const full = isFullscreen();
  btn.querySelector("use").setAttribute("href", full ? "#i-shrink" : "#i-expand");
  btn.title = full ? "Sair da tela cheia" : "Tela cheia";
}

async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } else {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else showWarning("Tela cheia não é suportada neste navegador.");
    }
  } catch (error) {
    console.error("Erro ao alternar tela cheia:", error);
    showError("Erro ao alternar tela cheia.");
  }
}
