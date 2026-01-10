// =========================
// MODAIS E UI
// =========================

// Atualiza o badge de status
function setBadge(status) {
  const b = $("statusBadge");
  b.classList.remove("ok","warn","bad");

  if (status === 4) {
    b.textContent = "Pago";
    b.classList.add("ok");
  } else if (status === 5) {
    b.textContent = "Cancelado";
    b.classList.add("bad");
  } else {
    b.textContent = "Solicitado/Aguardando";
    b.classList.add("warn");
  }
}

// Abre o modal de pagamento
function openModal() {
  $("modal").classList.add("open");
}

// Fecha o modal de pagamento
function closeModal() {
  $("modal").classList.remove("open");
}

// Reseta o estado do modal para um novo pagamento
function resetModalState() {
  $("statusArea").style.display = "block";  // Mostrar área de aguardando
  $("successArea").style.display = "none";  // Esconder área de sucesso
  $("canceledArea").style.display = "none"; // Esconder área de cancelado
  $("log").textContent = "";
  $("btnCloseOk").style.display = "none";
  $("btnCancelTef").style.display = "inline-block";
  $("btnCancelTef").disabled = false;
  $("modalTitle").textContent = "Aguardando pagamento TEF";
  $("modalSub").textContent = "Total: R$ 0,00 — Itens: 0";
  $("pid").textContent = "—";
  $("pstatus").textContent = "1"; // Status inicial é 1 (aguardando)
  setBadge(1);
  // updateCancelButton será chamado após definir currentPaymentId no proceedWithPayment
}

// Adiciona linha ao log do modal
function toastLog(line) {
  // log pequeno no modal (se aberto), senão no console
  const log = $("log");
  const ts = new Date().toLocaleTimeString("pt-BR");
  const txt = `[${ts}] ${line}\n`;
  if ($("modal").classList.contains("open")) {
    log.textContent += txt;
    log.scrollTop = log.scrollHeight;
  } else {
    console.log(txt.trim());
  }
}

// =========================
// MODAL DE CONFIGURAÇÃO
// =========================

function openConfig() {
  document.getElementById("cfgToken").value =
    localStorage.getItem("supertef_token") || "";

  document.getElementById("cfgCliente").value =
    localStorage.getItem("supertef_cliente_chave") || "";

  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  document.getElementById("cfgListarPos").checked = listarPos;

  document.getElementById("cfgPosId").value =
    localStorage.getItem("supertef_pos_id") || "";

  // Habilitar/desabilitar campo POS_ID baseado no checkbox
  updatePosIdField();
  
  // Configurar botão de mostrar/ocultar token
  setupTokenToggle();
  
  document.getElementById("configModal").classList.add("open");
}

// Configura o botão de mostrar/ocultar token
function setupTokenToggle() {
  const tokenInput = document.getElementById("cfgToken");
  const toggleBtn = document.getElementById("btnToggleToken");
  
  if (!tokenInput || !toggleBtn) return;
  
  // Remover listeners anteriores
  const newToggleBtn = toggleBtn.cloneNode(true);
  toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
  
  newToggleBtn.addEventListener("click", () => {
    const isPassword = tokenInput.type === "password";
    tokenInput.type = isPassword ? "text" : "password";
    
    const eyeIcon = newToggleBtn.querySelector(".token-eye-icon");
    if (eyeIcon) {
      eyeIcon.textContent = isPassword ? "🙈" : "👁️";
    }
  });
}

function closeConfig() {
  document.getElementById("configModal").classList.remove("open");
}

function updatePosIdField() {
  const listarPos = document.getElementById("cfgListarPos").checked;
  const posIdField = document.getElementById("cfgPosId");
  posIdField.disabled = listarPos;
  if (listarPos) {
    posIdField.style.opacity = "0.5";
    posIdField.style.cursor = "not-allowed";
  } else {
    posIdField.style.opacity = "1";
    posIdField.style.cursor = "text";
  }
}

function saveConfig() {
  const token = document.getElementById("cfgToken").value.trim();
  const cliente = document.getElementById("cfgCliente").value.trim();

  if (!token || !cliente) {
    showWarning("Informe o token e a chave.");
    return;
  }

  const listarPos = document.getElementById("cfgListarPos").checked;
  const posId = document.getElementById("cfgPosId").value.trim();

  if (!listarPos && !posId) {
    showWarning("Informe o POS_ID ou habilite 'Listar POS'.");
    return;
  }

  localStorage.setItem("supertef_token", token);
  localStorage.setItem("supertef_cliente_chave", cliente);
  localStorage.setItem("supertef_listar_pos", listarPos ? "true" : "false");
  
  if (!listarPos && posId) {
    localStorage.setItem("supertef_pos_id", posId);
  } else {
    localStorage.removeItem("supertef_pos_id");
  }

  showSuccess("Configuração salva com sucesso.");
  closeConfig();
}

// Limpa todos os dados sensíveis do navegador
function clearSensitiveData() {
  // Pedir confirmação ao usuário com mensagem clara
  const message = "⚠️ Tem certeza que deseja limpar todos os dados sensíveis?\n\n" +
    "Isso irá remover permanentemente:\n" +
    "• Bearer Token\n" +
    "• Cliente Chave\n" +
    "• POS ID\n" +
    "• POS Selecionada\n" +
    "• Configuração de Listar POS\n\n" +
    "⚠️ Esta ação NÃO pode ser desfeita!\n\n" +
    "Deseja continuar?";
  
  if (!confirm(message)) {
    return;
  }

  try {
    // Remover todos os dados sensíveis do localStorage
    localStorage.removeItem("supertef_token");
    localStorage.removeItem("supertef_cliente_chave");
    localStorage.removeItem("supertef_pos_id");
    localStorage.removeItem("supertef_listar_pos");
    localStorage.removeItem("supertef_pos_selected_id");
    localStorage.removeItem("supertef_pos_selected_name");

    // Limpar campos do formulário
    const tokenInput = document.getElementById("cfgToken");
    const clienteInput = document.getElementById("cfgCliente");
    const posIdInput = document.getElementById("cfgPosId");
    const listarPosCheckbox = document.getElementById("cfgListarPos");
    
    if (tokenInput) tokenInput.value = "";
    if (clienteInput) clienteInput.value = "";
    if (posIdInput) posIdInput.value = "";
    if (listarPosCheckbox) {
      listarPosCheckbox.checked = false;
      updatePosIdField();
    }

    // Mostrar mensagem de sucesso
    showSuccess("✅ Dados sensíveis removidos com sucesso do navegador.");

    // Resetar tipo do input de token para password caso esteja em text
    if (tokenInput && tokenInput.type === "text") {
      tokenInput.type = "password";
      const toggleBtn = document.getElementById("btnToggleToken");
      if (toggleBtn) {
        const eyeIcon = toggleBtn.querySelector(".token-eye-icon");
        if (eyeIcon) {
          eyeIcon.textContent = "👁️";
        }
      }
    }
  } catch (e) {
    console.error("Erro ao limpar dados sensíveis:", e);
    showError("❌ Erro ao limpar dados sensíveis. Tente novamente.");
  }
}

// =========================
// MODAL DE SELEÇÃO DE POS
// =========================

let selectedPosId = null;
let posSelectionCallback = null;

async function openPosSelectModal(callback) {
  posSelectionCallback = callback;
  selectedPosId = null;

  try {
    // Buscar lista de POS antes de abrir o modal
    const posAtivas = await listarPOS();
    
    if (!posAtivas || posAtivas.length === 0) {
      // Se não houver POS, mostrar modal com mensagem de erro
      const posList = document.getElementById("posList");
      const posSelectTitle = document.getElementById("posSelectTitle");
      posSelectTitle.textContent = "Selecione uma POS - Total: 0";
      posList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">Nenhuma POS ativa encontrada.</div>';
      document.getElementById("posSelectModal").classList.add("open");
      return;
    }

    // Se houver exatamente 1 POS, selecionar automaticamente sem abrir o modal
    if (posAtivas.length === 1) {
      const pos = posAtivas[0];
      // Selecionar automaticamente
      selectedPosId = pos.id;
      localStorage.setItem("supertef_pos_selected_id", pos.id.toString());
      localStorage.setItem("supertef_pos_selected_name", pos.nome);
      
      // Mostrar mensagem informativa
      showInfo(`POS "${pos.nome}" selecionada automaticamente.`);
      
      // Chamar callback imediatamente sem abrir modal
      if (callback && typeof callback === 'function') {
        callback(pos.id, pos.nome);
      }
      
      // Limpar callback
      posSelectionCallback = null;
      return;
    }

    // Se houver mais de 1 POS, abrir modal para seleção
    const posList = document.getElementById("posList");
    const posSelectTitle = document.getElementById("posSelectTitle");
    
    // Resetar título inicial
    posSelectTitle.textContent = "Selecione uma POS";
    posList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">Carregando POS...</div>';
    
    document.getElementById("posSelectModal").classList.add("open");

    // Atualizar título com o total
    posSelectTitle.textContent = `Selecione uma POS - Total: ${posAtivas.length}`;

    posList.innerHTML = "";
    posAtivas.forEach(pos => {
      const posItem = document.createElement("div");
      posItem.className = "pos-item";
      posItem.dataset.posId = pos.id;
      posItem.innerHTML = `
        <div class="pos-item-name">${pos.nome}</div>
        <div class="pos-item-status">Status: Ativo</div>
      `;
      
      posItem.addEventListener("click", () => selectPOS(pos.id, pos.nome));
      posList.appendChild(posItem);
    });
  } catch(e) {
    // Em caso de erro, abrir modal com mensagem de erro
    const posList = document.getElementById("posList");
    const posSelectTitle = document.getElementById("posSelectTitle");
    posSelectTitle.textContent = "Selecione uma POS - Total: 0";
    posList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--bad);">Erro: ${e.message}</div>`;
    document.getElementById("posSelectModal").classList.add("open");
  }
}

function selectPOS(posId, posNome) {
  // Remover seleção anterior
  document.querySelectorAll(".pos-item").forEach(item => {
    item.classList.remove("selected");
  });

  // Selecionar nova POS
  const selectedItem = document.querySelector(`[data-pos-id="${posId}"]`);
  if (selectedItem) {
    selectedItem.classList.add("selected");
  }

  selectedPosId = posId;
  localStorage.setItem("supertef_pos_selected_id", posId.toString());
  localStorage.setItem("supertef_pos_selected_name", posNome);

  // Salvar callback temporariamente
  const callback = posSelectionCallback;
  
  // Fechar modal após pequeno delay para feedback visual
  setTimeout(() => {
    closePosSelectModal();
    
    // Chamar callback após fechar o modal
    if (callback && typeof callback === 'function') {
      callback(posId, posNome);
    }
  }, 300);
}

function closePosSelectModal() {
  document.getElementById("posSelectModal").classList.remove("open");
  // Limpar callback ao fechar sem selecionar
  if (posSelectionCallback) {
    posSelectionCallback = null;
  }
}
