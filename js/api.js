// =========================
// API SUPER TEF
// =========================

// Função auxiliar para fazer requisições à API
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("supertef_token");
  if (!token) throw new Error("Informe o Bearer token.");
  const headers = {
    "Authorization": token.startsWith("Bearer ") ? token : ("Bearer " + token),
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };
  
  const fullUrl = API_BASE + path;
  const method = (opts.method || 'GET').toUpperCase();
  
  // Extrair dados da requisição (body)
  let requestData = null;
  if (opts.body) {
    try {
      requestData = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
    } catch {
      requestData = opts.body;
    }
  }
  
  let response = null;
  let status = null;
  let error = null;
  
  try {
    const res = await fetch(fullUrl, { ...opts, headers });
    status = res.status;
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }

    if (!res.ok) {
      const msg = (json && (json.message || json.error)) ? (json.message || json.error) : text;
      error = new Error(`HTTP ${res.status} - ${msg || "Erro na requisição"}`);
      error.status = res.status;
      // Retry-After (segundos) — enviado pela API em respostas 429
      const retryAfter = parseInt(res.headers.get("Retry-After") || "", 10);
      if (!Number.isNaN(retryAfter)) error.retryAfterMs = retryAfter * 1000;
      
      // Registrar log com erro
      addRequestLog(method, fullUrl, requestData, json || text, status, error);
      
      throw error;
    }
    
    response = json;
    
    // Registrar log com sucesso
    addRequestLog(method, fullUrl, requestData, response, status, null);
    
    return json;
  } catch (e) {
    // Se ainda não foi registrado (erro de rede, etc)
    if (!error) {
      error = e;
      addRequestLog(method, fullUrl, requestData, null, status || 0, error);
    }
    throw e;
  }
}

// Lista POS disponíveis para o cliente (busca todas as páginas)
async function listarPOS() {
  const cliente_chave = localStorage.getItem("supertef_cliente_chave");
  if (!cliente_chave) {
    throw new Error("Cliente chave não configurado.");
  }
  
  try {
    let allPosAtivas = [];
    let currentPage = 1;
    let lastPage = 1;
    
    // Buscar todas as páginas
    do {
      const response = await apiFetch(`/pos?cliente_chave=${encodeURIComponent(cliente_chave)}&page=${currentPage}`, { method: "GET" });
      
      // Filtrar apenas POS com status 1 (ativo) desta página
      const posAtivasPage = (response?.data || []).filter(pos => pos.status === 1);
      allPosAtivas = allPosAtivas.concat(posAtivasPage);
      
      // Atualizar informações de paginação
      lastPage = response?.last_page || 1;
      currentPage++;
      
    } while (currentPage <= lastPage);
    
    return allPosAtivas;
  } catch(e) {
    throw new Error(`Erro ao listar POS: ${e.message}`);
  }
}

// Cancela um pagamento solicitado (PUT /pagamentos/cancelar/{payment_uniqueid})
async function cancelarPagamento(payment_uniqueid) {
  if (!payment_uniqueid) {
    throw new Error("Payment uniqueid é obrigatório.");
  }
  
  // Garantir que payment_uniqueid é string para URL
  const pid = String(payment_uniqueid).trim();
  
  if (!pid) {
    throw new Error("Payment uniqueid inválido.");
  }
  
  try {
    // Endpoint: PUT /pagamentos/cancelar/{payment_uniqueid}
    // Conforme documentação: https://supertef.apidog.io/rejeitar-pagamento-solicitado-status-5-19419031e0
    const url = `/pagamentos/cancelar/${encodeURIComponent(pid)}`;
    
    const response = await apiFetch(url, { 
      method: "PUT"
    });
    
    return response;
  } catch(e) {
    throw new Error(`Erro ao cancelar pagamento: ${e.message}`);
  }
}

// Constrói o payload de pagamento baseado na forma de pagamento selecionada
function buildPaymentPayload(amount, posId = null) {
  const cliente_chave = localStorage.getItem("supertef_cliente_chave");
  const order_id = $("orderId").value.trim() || ("PDV-" + Date.now());
  const description = $("desc").value.trim() || "Pagamento PDV";
  const method = getSelectedPaymentMethod();
  
  // Determinar qual POS_ID usar
  let pos_id_to_use;
  const listarPos = localStorage.getItem("supertef_listar_pos") === "true";
  
  if (listarPos) {
    // Se está configurado para listar POS, usar o selecionado
    pos_id_to_use = posId || localStorage.getItem("supertef_pos_selected_id");
    if (!pos_id_to_use) {
      throw new Error("Selecione uma POS para continuar.");
    }
    pos_id_to_use = parseInt(pos_id_to_use, 10);
  } else {
    // Se não está listando, usar o POS_ID manual
    const manualPosId = localStorage.getItem("supertef_pos_id");
    if (!manualPosId) {
      throw new Error("Configure o POS_ID nas configurações.");
    }
    pos_id_to_use = parseInt(manualPosId, 10);
  }

  // Defaults usados no exemplo do SuperTEF:
  // transaction_type: "2" no exemplo; installment_type: 1; installment_count: 1
  let transaction_type = "2"; // 2 = crédito (prática comum)
  let installment_count = 1;
  let installment_type = 1;

  if (method === "debit") {
    transaction_type = "1";     // 1 = débito (prática comum)
    installment_count = 1;
  } else if (method === "credit") {
    transaction_type = "2";
    installment_count = 1;
  } else if (method === "credit_inst") {
    transaction_type = "2";
    installment_count = Math.max(2, parseInt($("installments").value || "2", 10));
  } else if (method === "pix") {
    transaction_type = "3";
    installment_count = 1;
  } else if (method === "voucher") {
    transaction_type = "4";
    installment_count = 1;
  }

  return {
    cliente_chave,
    pos_id: pos_id_to_use,
    transaction_type,
    installment_count,
    installment_type,
    amount: Number(amount.toFixed(2)),
    order_id,
    description,
    print_receipt: true
  };
}
