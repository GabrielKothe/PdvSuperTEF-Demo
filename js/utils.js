// =========================
// FUNÇÕES AUXILIARES
// =========================

// DOM helper - seleciona elemento por ID
const $ = (id) => document.getElementById(id);

// Formata valor em Real Brasileiro
const fmtBRL = (n) => n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
