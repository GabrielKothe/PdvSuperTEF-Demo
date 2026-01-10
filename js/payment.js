// =========================
// PAGAMENTO E POLLING
// =========================

let pollTimer = null;
let currentPaymentId = null;
let pollingTimeout = null; // Timeout para cancelar automaticamente após 1 minuto
let countdownTimer = null; // Timer para atualizar o contador regressivo
let countdownStartTime = null; // Timestamp de quando o contador começou
const POLLING_TIMEOUT_MS = 60000; // 1 minuto em milissegundos

// Inicia o processo de pagamento
async function startPayment() {
  const { total, items } = cartTotals();

  const token = localStorage.getItem("supertef_token");
  const cliente = localStorage.getItem("supertef_cliente_chave");

  if (!token || !cliente) {
    showWarning("PDV não configurado. Acesse ⚙️ Configurações.");
    return;
  }

  if (items <= 0) {
    showWarning("Carrinho vazio.");
    return;
  }

  // Verificar se precisa listar POS
  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  if (listarPos) {
    // Sempre mostrar modal de seleção de POS quando configurado para listar
    await openPosSelectModal((posId, posNome) => {
      // Callback executado após selecionar POS - continuar com o pagamento
      proceedWithPayment(total, items);
    });
    return; // Aguardar seleção
  }

  // Continuar com o pagamento normalmente (usa POS_ID manual)
  proceedWithPayment(total, items);
}

// Procede com o pagamento após verificar/selecionar POS
async function proceedWithPayment(total, items) {
  // Solicitar pagamento (POST /pagamentos)
  let payload;
  try {
    payload = buildPaymentPayload(total);
  } catch(e) {
    showError(e.message);
    return;
  }

  // Resetar estado do modal para novo pagamento
  resetModalState();
  
  // Atualizar informações específicas deste pagamento
  $("modalSub").textContent = `Total: ${fmtBRL(total)} — Itens: ${items}`;
  
  // Parar polling anterior se existir
  stopPolling();
  clearPollingTimeout();
  stopCountdown();
  
  openModal();

  toastLog("Enviando solicitação de pagamento (POST /pagamentos) ...");
  toastLog("Payload: " + JSON.stringify(payload));

  let resp;
  try {
    resp = await apiFetch("/pagamentos", { method:"POST", body: JSON.stringify(payload) });
  } catch(e) {
    toastLog("Erro ao solicitar: " + e.message);
    $("statusArea").style.display = "none";
    $("successArea").style.display = "none";
    $("canceledArea").style.display = "block";
    $("modalTitle").textContent = "Falha ao solicitar pagamento";
    $("modalSub").textContent = "Erro na transação";
    setBadge(5);
    $("btnCloseOk").style.display = "inline-block";
    $("btnCancelTef").style.display = "none";
    return;
  }

  currentPaymentId = resp?.payment_uniqueid;
  if (!currentPaymentId) {
    toastLog("Resposta sem payment_uniqueid. Verifique a API.");
    $("statusArea").style.display = "none";
    $("successArea").style.display = "none";
    $("canceledArea").style.display = "block";
    $("modalTitle").textContent = "Resposta inesperada";
    $("modalSub").textContent = "Erro na transação";
    setBadge(5);
    $("btnCloseOk").style.display = "inline-block";
    $("btnCancelTef").style.display = "none";
    return;
  }

  $("pid").textContent = String(currentPaymentId);
  const initialStatus = Number(resp.payment_status ?? 1);
  $("pstatus").textContent = String(initialStatus);
  setBadge(initialStatus);
  updateCancelButton(); // Atualizar texto do botão
  toastLog("Solicitado com sucesso. payment_uniqueid=" + currentPaymentId);

  // Se já veio cancelado (status 5) ou aprovado (status 4), tratar imediatamente
  if (initialStatus === 5) {
    toastLog("Pagamento cancelado (status 5).");
    $("statusArea").style.display = "none";
    $("successArea").style.display = "none";
    $("canceledArea").style.display = "block";
    $("modalTitle").textContent = "Pagamento cancelado";
    $("modalSub").textContent = "Transação cancelada";
    $("btnCloseOk").style.display = "inline-block";
    $("btnCancelTef").style.display = "none";
    return; // Não inicia polling
  } else if (initialStatus === 4) {
    toastLog("Pagamento aprovado (status 4).");
    $("statusArea").style.display = "none";
    $("successArea").style.display = "block";
    $("canceledArea").style.display = "none";
    $("modalTitle").textContent = "Venda concluída";
    $("modalSub").textContent = "Pagamento confirmado";
    $("btnCloseOk").style.display = "inline-block";
    $("btnCancelTef").style.display = "none";
    clearCart();
    return; // Não inicia polling
  }

  // Polling GET /pagamentos/by-uniqueid/{id}
  if (pollTimer) clearInterval(pollTimer);
  if (pollingTimeout) clearTimeout(pollingTimeout);
  stopCountdown();
  
  // Iniciar timeout de 1 minuto para cancelar automaticamente
  pollingTimeout = setTimeout(() => {
    handlePollingTimeout();
  }, POLLING_TIMEOUT_MS);
  
  // Iniciar contador regressivo
  startCountdown();
  
  pollTimer = setInterval(() => pollPayment(currentPaymentId), POLL_MS);
  // Poll imediato
  await pollPayment(currentPaymentId);
}

// Consulta o status do pagamento periodicamente
async function pollPayment(pid) {
  try {
    toastLog(`Consultando status (GET /pagamentos/by-uniqueid/${pid}) ...`);
    const data = await apiFetch(`/pagamentos/by-uniqueid/${encodeURIComponent(pid)}`, { method:"GET" });
    const st = Number(data?.payment_status);
    $("pstatus").textContent = String(st);
    setBadge(st);
    updateCancelButton(); // Atualizar texto do botão baseado no status

    if (st === 4) {
      toastLog("Pagamento aprovado (status 4).");

      document.getElementById("statusArea").style.display = "none";
      document.getElementById("successArea").style.display = "block";
      document.getElementById("canceledArea").style.display = "none";

      document.getElementById("modalTitle").textContent = "Venda concluída";
      document.getElementById("modalSub").textContent = "Pagamento confirmado";

      document.getElementById("btnCloseOk").style.display = "inline-block";
      document.getElementById("btnCancelTef").style.display = "none";

      stopPolling();
      clearPollingTimeout();
      stopCountdown();
      clearCart();
    } else if (st === 5) {
      toastLog("Pagamento cancelado (status 5).");

      document.getElementById("statusArea").style.display = "none";
      document.getElementById("successArea").style.display = "none";
      document.getElementById("canceledArea").style.display = "block";

      document.getElementById("modalTitle").textContent = "Pagamento cancelado";
      document.getElementById("modalSub").textContent = "Transação cancelada";

      document.getElementById("btnCloseOk").style.display = "inline-block";
      document.getElementById("btnCancelTef").style.display = "none";

      stopPolling();
      clearPollingTimeout();
      stopCountdown();
    }
  } catch(e) {
    toastLog("Erro no polling: " + e.message);
    // mantém tentando (pode ser instabilidade)
  }
}

// Para o polling
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Limpa o timeout de polling
function clearPollingTimeout() {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }
}

// Inicia o contador regressivo de timeout
function startCountdown() {
  // Limpar contador anterior se existir
  stopCountdown();
  
  // Mostrar elemento do contador
  const counterElement = document.getElementById("timeoutCounter");
  const timeElement = document.getElementById("timeoutTime");
  
  if (!counterElement || !timeElement) return;
  
  counterElement.style.display = "flex";
  
  // Definir tempo inicial
  countdownStartTime = Date.now();
  const totalSeconds = Math.floor(POLLING_TIMEOUT_MS / 1000);
  updateCountdownDisplay(totalSeconds, timeElement);
  
  // Atualizar contador a cada segundo
  countdownTimer = setInterval(() => {
    const elapsed = Date.now() - countdownStartTime;
    const remaining = Math.max(0, POLLING_TIMEOUT_MS - elapsed);
    const remainingSeconds = Math.floor(remaining / 1000);
    
    updateCountdownDisplay(remainingSeconds, timeElement);
    
    // Se o tempo acabou, o handlePollingTimeout vai ser chamado
    if (remainingSeconds <= 0) {
      stopCountdown();
    }
  }, 1000);
}

// Atualiza a exibição do contador
function updateCountdownDisplay(seconds, timeElement) {
  if (!timeElement) return;
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  timeElement.textContent = formattedTime;
  
  // Adicionar classe de aviso quando restam 10 segundos ou menos
  if (seconds <= 10) {
    timeElement.classList.add("warning");
  } else {
    timeElement.classList.remove("warning");
  }
}

// Para o contador regressivo
function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  countdownStartTime = null;
  
  // Esconder elemento do contador
  const counterElement = document.getElementById("timeoutCounter");
  if (counterElement) {
    counterElement.style.display = "none";
  }
  
  // Remover classe de aviso
  const timeElement = document.getElementById("timeoutTime");
  if (timeElement) {
    timeElement.classList.remove("warning");
  }
}

// Trata o timeout de 1 minuto - cancela o pagamento automaticamente
async function handlePollingTimeout() {
  toastLog("Timeout: 1 minuto de polling atingido sem resposta final. Cancelando pagamento automaticamente...");
  
  // Parar polling e contador
  stopPolling();
  clearPollingTimeout();
  stopCountdown();
  
  // Atualizar contador para 00:00
  const timeElement = document.getElementById("timeoutTime");
  if (timeElement) {
    timeElement.textContent = "00:00";
    timeElement.classList.add("warning");
  }
  
  // Verificar se ainda há um pagamento em andamento
  if (!currentPaymentId) {
    // Se não houver payment_uniqueid, apenas fechar
    $("statusArea").style.display = "none";
    $("successArea").style.display = "none";
    $("canceledArea").style.display = "block";
    $("modalTitle").textContent = "Tempo esgotado";
    $("modalSub").textContent = "Não foi possível obter resposta do pagamento";
    $("btnCloseOk").style.display = "inline-block";
    $("btnCancelTef").style.display = "none";
    setBadge(5);
    showError("Tempo de espera esgotado. O pagamento não retornou status final após 1 minuto.");
    return;
  }
  
  // Tentar cancelar o pagamento na API
  const currentStatus = Number($("pstatus").textContent || "0");
  
  // Se o status ainda for 1 (aguardando), tentar cancelar via API
  if (currentStatus === 1) {
    try {
      toastLog(`Tentando cancelar pagamento automaticamente (payment_uniqueid: ${currentPaymentId})...`);
      const response = await cancelarPagamento(currentPaymentId);
      
      toastLog(`Resposta do cancelamento automático: ${JSON.stringify(response)}`);
      
      if (response && (response.status === true || response.status === "true")) {
        toastLog(`Pagamento cancelado automaticamente: ${response.message || "Cancelado com sucesso"}`);
      } else {
        toastLog(`Não foi possível cancelar via API: ${response?.message || "Erro desconhecido"}`);
      }
    } catch(e) {
      toastLog(`Erro ao cancelar automaticamente: ${e.message}`);
      // Continuar mesmo se houver erro na API - vamos mostrar como cancelado na UI
    }
  }
  
  // Atualizar UI para mostrar como cancelado (timeout)
  const st = 5; // Status cancelado
  $("pstatus").textContent = String(st);
  setBadge(st);
  updateCancelButton();
  
  $("statusArea").style.display = "none";
  $("successArea").style.display = "none";
  $("canceledArea").style.display = "block";
  
  $("modalTitle").textContent = "Tempo esgotado";
  $("modalSub").textContent = "Pagamento cancelado automaticamente após 1 minuto sem resposta";
  
  $("btnCloseOk").style.display = "inline-block";
  $("btnCancelTef").style.display = "none";
  
  showError("Tempo de espera esgotado. O pagamento foi cancelado automaticamente após 1 minuto sem resposta final.");
}

// Cancela a solicitação de pagamento (só funciona se status for 1 - aguardando)
async function cancelarSolicitacaoPagamento() {
  if (!currentPaymentId) {
    showWarning("Nenhum pagamento em andamento para cancelar.");
    return;
  }

  // Verificar se o status atual permite cancelamento (status 1 = aguardando)
  const currentStatus = Number($("pstatus").textContent || "0");
  if (currentStatus !== 1) {
    stopPolling();
    clearPollingTimeout();
    stopCountdown();
    closeModal();
    return;
  }

  // Validar formato do payment_uniqueid
  const pidToCancel = String(currentPaymentId).trim();
  if (!pidToCancel) {
    showError("Payment uniqueid inválido.");
    return;
  }

  // Desabilitar botão durante o processamento
  const btn = $("btnCancelTef");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Cancelando...";

  toastLog(`Cancelando solicitação de pagamento (payment_uniqueid: ${pidToCancel})...`);

  try {
    const response = await cancelarPagamento(pidToCancel);
    
    toastLog(`Resposta recebida: ${JSON.stringify(response)}`);
    
    // Verificar se response existe e tem a propriedade status
    if (!response) {
      throw new Error("Resposta vazia da API");
    }
    
    if (response.status === true || response.status === "true") {
      toastLog(`Pagamento cancelado: ${response.message || "Cancelado com sucesso"}`);
      
      // Atualizar UI para mostrar status cancelado
      const st = Number(response.data?.payment_status ?? 5);
      $("pstatus").textContent = String(st);
      setBadge(st);
      updateCancelButton();

      $("statusArea").style.display = "none";
      $("successArea").style.display = "none";
      $("canceledArea").style.display = "block";

      $("modalTitle").textContent = "Pagamento cancelado";
      $("modalSub").textContent = response.data?.payment_message || response.message || "Transação cancelada";

      $("btnCloseOk").style.display = "inline-block";
      $("btnCancelTef").style.display = "none";

      stopPolling();
      clearPollingTimeout();
      stopCountdown();
    } else {
      // Status false - mostrar mensagem de erro
      const errorMsg = response.message || "Erro ao cancelar pagamento";
      toastLog(`Erro: ${errorMsg}`);
      showError(errorMsg);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch(e) {
    const errorMessage = e.message || "Erro desconhecido";
    toastLog(`Erro ao cancelar: ${errorMessage}`);
    showError(`Erro ao cancelar pagamento: ${errorMessage}`);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Atualiza o texto do botão baseado no status do pagamento
function updateCancelButton() {
  const btn = $("btnCancelTef");
  if (!btn) return;
  
  const status = Number($("pstatus").textContent || "0");
  
  if (status === 1 && currentPaymentId) {
    // Status 1 (aguardando) - permitir cancelamento
    btn.textContent = "Fechar e Cancelar solicitação";
    btn.disabled = false;
  } else {
    // Outros status - apenas fechar
    btn.textContent = "Fechar";
    btn.disabled = false;
  }
}
