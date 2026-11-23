// =========================
// MODAIS E UI
// =========================

// Atualiza o badge de status
function setBadge(status) {
  const b = $("statusBadge");
  b.classList.remove("ok", "warn", "bad");
  if (status === 4) {
    b.textContent = "Aprovado";
    b.classList.add("ok");
  } else if (status === 5) {
    b.textContent = "Cancelado";
    b.classList.add("bad");
  } else {
    b.textContent = "Aguardando";
    b.classList.add("warn");
  }
}

function openModal() { $("modal").classList.add("open"); }
function closeModal() { $("modal").classList.remove("open"); }

// Reseta o estado do modal para um novo pagamento
function resetModalState() {
  $("statusArea").style.display = "flex";
  $("successArea").style.display = "none";
  $("canceledArea").style.display = "none";
  $("log").textContent = "";
  $("btnCloseOk").style.display = "none";
  $("btnCancelTef").style.display = "inline-flex";
  $("btnCancelTef").disabled = false;
  $("btnCancelTef").textContent = "Cancelar cobrança";
  $("pid").textContent = "—";
  $("pid").title = "";
  if (typeof setStatus === "function") setStatus(1);
  else setBadge(1);

  $("timeoutCounter").style.display = "none";
  $("timeoutTime").textContent = "01:00";
  $("timeoutTime").classList.remove("warning");
  $("timeoutBar").style.width = "100%";
  $("timeoutBar").classList.remove("warning");
}

// Adiciona linha ao log técnico do modal
function toastLog(line) {
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

function isConfigured() {
  const token = localStorage.getItem("supertef_token");
  const cliente = localStorage.getItem("supertef_cliente_chave");
  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  const posId = localStorage.getItem("supertef_pos_id");
  return !!(token && cliente && (listarPos || posId));
}

// Atualiza o indicador de configuração no topo
function updateConnStatus() {
  const chip = $("connStatus");
  if (!chip) return;
  const ok = isConfigured();
  chip.classList.toggle("ok", ok);
  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  const posId = localStorage.getItem("supertef_pos_id");
  chip.querySelector(".conn-text").textContent = ok
    ? (listarPos ? "Conectado · POS por venda" : `Conectado · POS ${posId}`)
    : "Não configurado";
}

function openConfig() {
  $("cfgToken").value = localStorage.getItem("supertef_token") || "";
  $("cfgCliente").value = localStorage.getItem("supertef_cliente_chave") || "";
  $("cfgListarPos").checked = localStorage.getItem("supertef_listar_pos") === "true";
  $("cfgPosId").value = localStorage.getItem("supertef_pos_id") || "";
  setTokenVisible(false);
  updatePosIdField();
  $("configModal").classList.add("open");
  setTimeout(() => ($("cfgToken").value ? $("btnSaveConfig") : $("cfgToken")).focus(), 50);
}

function setTokenVisible(visible) {
  $("cfgToken").type = visible ? "text" : "password";
  const use = document.querySelector("#btnToggleToken use");
  if (use) use.setAttribute("href", visible ? "#i-eye-off" : "#i-eye");
}

function setupTokenToggle() {
  $("btnToggleToken").addEventListener("click", () => {
    setTokenVisible($("cfgToken").type === "password");
  });
}

function closeConfig() {
  $("configModal").classList.remove("open");
}

function updatePosIdField() {
  $("cfgPosId").disabled = $("cfgListarPos").checked;
}

function saveConfig() {
  const token = $("cfgToken").value.trim();
  const cliente = $("cfgCliente").value.trim();
  if (!token || !cliente) {
    showWarning("Informe o token e a cliente chave.");
    return;
  }

  const listarPos = $("cfgListarPos").checked;
  const posId = $("cfgPosId").value.trim();
  if (!listarPos && !posId) {
    showWarning("Informe o POS_ID ou habilite “Listar POS”.");
    return;
  }

  localStorage.setItem("supertef_token", token);
  localStorage.setItem("supertef_cliente_chave", cliente);
  localStorage.setItem("supertef_listar_pos", listarPos ? "true" : "false");
  if (!listarPos && posId) localStorage.setItem("supertef_pos_id", posId);
  else localStorage.removeItem("supertef_pos_id");

  updateConnStatus();
  showSuccess("Configuração salva com sucesso.");
  closeConfig();
}

// Limpa todos os dados sensíveis do navegador
function clearSensitiveData() {
  const message = "Tem certeza que deseja limpar todos os dados sensíveis?\n\n" +
    "Serão removidos: Bearer Token, Cliente Chave, POS ID, POS selecionada e configuração de Listar POS.\n\n" +
    "Esta ação não pode ser desfeita.";
  if (!confirm(message)) return;

  try {
    ["supertef_token", "supertef_cliente_chave", "supertef_pos_id", "supertef_listar_pos",
     "supertef_pos_selected_id", "supertef_pos_selected_name"].forEach(k => localStorage.removeItem(k));

    $("cfgToken").value = "";
    $("cfgCliente").value = "";
    $("cfgPosId").value = "";
    $("cfgListarPos").checked = false;
    updatePosIdField();
    setTokenVisible(false);
    updateConnStatus();
    showSuccess("Dados sensíveis removidos deste navegador.");
  } catch (e) {
    console.error("Erro ao limpar dados sensíveis:", e);
    showError("Erro ao limpar dados sensíveis. Tente novamente.");
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

  const searchingModal = $("posSearchingModal");
  const posList = $("posList");
  const posSelectTitle = $("posSelectTitle");
  searchingModal.classList.add("open");

  try {
    const posAtivas = await listarPOS();
    searchingModal.classList.remove("open");

    if (!posAtivas || posAtivas.length === 0) {
      posSelectTitle.textContent = "Nenhum terminal disponível";
      posList.innerHTML = '<div class="pos-msg">Nenhuma POS ativa encontrada para este cliente.</div>';
      $("posSelectModal").classList.add("open");
      return;
    }

    // Apenas 1 POS: seleciona automaticamente
    if (posAtivas.length === 1) {
      const pos = posAtivas[0];
      selectedPosId = pos.id;
      localStorage.setItem("supertef_pos_selected_id", String(pos.id));
      localStorage.setItem("supertef_pos_selected_name", pos.nome);
      showInfo(`Terminal “${pos.nome}” selecionado automaticamente.`);
      posSelectionCallback = null;
      if (typeof callback === "function") callback(pos.id, pos.nome);
      return;
    }

    posSelectTitle.textContent = `Selecione o terminal (${posAtivas.length})`;
    const lastId = localStorage.getItem("supertef_pos_selected_id");
    posList.innerHTML = "";
    posAtivas.forEach(pos => {
      const posItem = document.createElement("div");
      posItem.className = "pos-item" + (String(pos.id) === lastId ? " selected" : "");
      posItem.dataset.posId = pos.id;
      posItem.tabIndex = 0;
      posItem.innerHTML = `
        <div class="pos-icon"><svg class="ic"><use href="#i-pos"/></svg></div>
        <div>
          <div class="pos-item-name">${escapeHtml(pos.nome)}</div>
          <div class="pos-item-status">Ativo${String(pos.id) === lastId ? " · último usado" : ""}</div>
        </div>
        <svg class="ic chev-r"><use href="#i-chevron"/></svg>
      `;
      posItem.addEventListener("click", () => selectPOS(pos.id, pos.nome));
      posItem.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectPOS(pos.id, pos.nome); }
      });
      posList.appendChild(posItem);
    });

    $("posSelectModal").classList.add("open");
    const first = posList.querySelector(".pos-item.selected") || posList.querySelector(".pos-item");
    if (first) setTimeout(() => first.focus(), 50);
  } catch (e) {
    searchingModal.classList.remove("open");
    posSelectTitle.textContent = "Erro ao buscar terminais";
    posList.innerHTML = `<div class="pos-msg err">${escapeHtml(e.message)}</div>`;
    $("posSelectModal").classList.add("open");
  }
}

function selectPOS(posId, posNome) {
  document.querySelectorAll(".pos-item").forEach(item => {
    item.classList.toggle("selected", String(item.dataset.posId) === String(posId));
  });

  selectedPosId = posId;
  localStorage.setItem("supertef_pos_selected_id", String(posId));
  localStorage.setItem("supertef_pos_selected_name", posNome);

  const callback = posSelectionCallback;
  posSelectionCallback = null;
  setTimeout(() => {
    closePosSelectModal();
    if (typeof callback === "function") callback(posId, posNome);
  }, 180);
}

function closePosSelectModal() {
  $("posSelectModal").classList.remove("open");
  posSelectionCallback = null;
}
