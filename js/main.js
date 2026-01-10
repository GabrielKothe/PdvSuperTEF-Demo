// =========================
// INICIALIZAÇÃO E EVENTOS
// =========================

// Handler para mudança de forma de pagamento
function onMethodChange() {
  const method = getSelectedPaymentMethod();
  $("instWrap").style.display = (method === "credit_inst") ? "block" : "none";
}

// Obtém o método de pagamento selecionado (compatibilidade com código existente)
function getSelectedPaymentMethod() {
  const activeBtn = document.querySelector('.payment-method-btn.active');
  return activeBtn ? activeBtn.getAttribute('data-method') : 'debit';
}

// Define o método de pagamento selecionado
function setSelectedPaymentMethod(method) {
  const buttons = document.querySelectorAll('.payment-method-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-method') === method) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  onMethodChange();
}

// =========================
// GERENCIAMENTO DE TEMA
// =========================

// Carrega o tema salvo ou usa dark como padrão
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButton(savedTheme);
}

// Alterna entre dark e light mode
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButton(newTheme);
}

// Atualiza o ícone do botão de tema
function updateThemeButton(theme) {
  const btn = $("btnToggleTheme");
  if (btn) {
    btn.textContent = theme === "dark" ? "🌓" : "☀️";
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Carregar tema salvo
  loadTheme();
  
  // Toggle de tema
  $("btnToggleTheme").addEventListener("click", toggleTheme);
  
  // Pagamento
  $("btnPay").addEventListener("click", startPayment);
  $("btnClear").addEventListener("click", clearCart);
  
  // Navegação de abas
  setupTabs();
  
  // Criar getter/setter para compatibilidade com código existente
  const payMethodContainer = $("payMethod");
  Object.defineProperty(payMethodContainer, 'value', {
    get: function() { return getSelectedPaymentMethod(); },
    set: function(val) { setSelectedPaymentMethod(val); },
    enumerable: true,
    configurable: true
  });
  
  // Botões de forma de pagamento
  const paymentButtons = document.querySelectorAll('.payment-method-btn');
  paymentButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      setSelectedPaymentMethod(this.getAttribute('data-method'));
      // Disparar evento change para compatibilidade
      const event = new Event('change');
      payMethodContainer.dispatchEvent(event);
    });
  });

  // Modal de pagamento - Botão Fechar/Cancelar
  $("btnCancelTef").addEventListener("click", async () => {
    const status = Number($("pstatus").textContent || "0");
    
    // Se status for 1 (aguardando) e tiver payment_uniqueid, cancelar solicitação
    if (status === 1 && currentPaymentId) {
      await cancelarSolicitacaoPagamento();
    } else {
      // Caso contrário, apenas fechar o modal
      stopPolling();
      closeModal();
    }
  });

  $("btnCloseOk").addEventListener("click", () => {
    stopPolling();
    closeModal();
  });

  // Configurações
  $("btnConfig").addEventListener("click", openConfig);
  $("btnSaveConfig").addEventListener("click", saveConfig);
  $("btnCancelConfig").addEventListener("click", closeConfig);
  $("btnCloseConfig").addEventListener("click", closeConfig);
  
  // Botão para limpar dados sensíveis
  const btnClearSensitiveData = document.getElementById("btnClearSensitiveData");
  if (btnClearSensitiveData) {
    btnClearSensitiveData.addEventListener("click", clearSensitiveData);
  }
  
  // Checkbox Listar POS
  const cfgListarPos = document.getElementById("cfgListarPos");
  if (cfgListarPos) {
    cfgListarPos.addEventListener("change", updatePosIdField);
  }

  // Modal de Seleção de POS
  $("btnClosePosSelect").addEventListener("click", closePosSelectModal);
  $("btnCancelPosSelect").addEventListener("click", closePosSelectModal);

  // Painel de Log
  $("btnToggleLog").addEventListener("click", toggleLogPanel);
  $("btnCloseLog").addEventListener("click", toggleLogPanel);
  $("btnClearLog").addEventListener("click", clearRequestLogs);
  $("btnCopyLog").addEventListener("click", copyRequestLogs);

  // Tela Cheia (Fullscreen)
  setupFullscreen();

  // Verificar se há configuração salva, se não, abrir modal automaticamente
  checkAndOpenConfig();
  
  // Inicialização
  renderProducts();
  loadCartFromCache(); // Carregar carrinho do cache
  renderCart();
  
  // Selecionar primeiro método de pagamento (débito) por padrão
  if (paymentButtons.length > 0) {
    setSelectedPaymentMethod('debit');
  }
  
  // Adicionar listener de change para compatibilidade
  payMethodContainer.addEventListener('change', onMethodChange);
  onMethodChange();
});

// =========================
// VERIFICAÇÃO DE CONFIGURAÇÃO
// =========================

function checkAndOpenConfig() {
  const token = localStorage.getItem("supertef_token");
  const cliente = localStorage.getItem("supertef_cliente_chave");
  
  // Se não tiver token ou cliente, abrir modal de configuração
  if (!token || !cliente) {
    // Pequeno delay para melhor UX
    setTimeout(() => {
      openConfig();
    }, 300);
  }
}

// =========================
// SISTEMA DE ABAS
// =========================

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Navegação por clique nas abas
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
  
  // Botão "Escolher forma de pagamento"
  const btnChoosePayment = document.getElementById("btnChoosePayment");
  if (btnChoosePayment) {
    btnChoosePayment.addEventListener('click', () => {
      const { items } = cartTotals();
      if (items > 0) {
        switchTab('payment');
      }
    });
  }
  
  // Botão "Voltar ao carrinho"
  const btnBackToCart = document.getElementById("btnBackToCart");
  if (btnBackToCart) {
    btnBackToCart.addEventListener('click', () => {
      switchTab('cart');
    });
  }
}

function switchTab(tabName) {
  // Se tentar ir para pagamento e carrinho estiver vazio, não permitir
  if (tabName === 'payment') {
    const { items } = cartTotals();
    if (items === 0) {
      showToast('Adicione produtos ao carrinho antes de escolher a forma de pagamento', 'warning');
      return;
    }
  }
  
  // Atualizar botões das abas
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Atualizar conteúdo das abas
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    if (content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Se mudar para a aba de pagamento, atualizar o total
  if (tabName === 'payment') {
    const { total } = cartTotals();
    if ($("grandTotalPayment")) {
      $("grandTotalPayment").textContent = fmtBRL(total);
    }
  }
}

// =========================
// GERENCIAMENTO DE TELA CHEIA (FULLSCREEN)
// =========================

function setupFullscreen() {
  const btnToggleFullscreen = document.getElementById("btnToggleFullscreen");
  if (!btnToggleFullscreen) return;

  // Atualizar estado inicial do botão
  updateFullscreenButton();

  // Event listener para o botão
  btnToggleFullscreen.addEventListener("click", toggleFullscreen);

  // Escutar mudanças de estado de fullscreen (quando usuário sai com ESC, etc)
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  document.addEventListener("mozfullscreenchange", updateFullscreenButton);
  document.addEventListener("MSFullscreenChange", updateFullscreenButton);
}

// Verifica se está em modo fullscreen
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

// Atualiza o texto e ícone do botão baseado no estado
function updateFullscreenButton() {
  const btn = document.getElementById("btnToggleFullscreen");
  if (!btn) return;

  const isFull = isFullscreen();
  
  if (isFull) {
    btn.innerHTML = "🔲 Sair da Tela Cheia";
    btn.title = "Sair da tela cheia (ou pressione ESC)";
  } else {
    btn.innerHTML = "⛶ Tela Cheia";
    btn.title = "Entrar em tela cheia";
  }
}

// Alterna entre fullscreen e modo normal
async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      // Sair do fullscreen
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } else {
      // Entrar em fullscreen
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      } else {
        showWarning("Tela cheia não é suportada neste navegador.");
        return;
      }
    }
    
    // O botão será atualizado automaticamente pelos event listeners
  } catch (error) {
    console.error("Erro ao alternar tela cheia:", error);
    showError("Erro ao alternar tela cheia. Tente novamente.");
  }
}
