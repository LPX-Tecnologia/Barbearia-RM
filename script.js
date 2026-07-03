// ==========================================================
// ===== CONFIGURAÇÃO DO FIREBASE =====
// ==========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",
    authDomain: "barbearia-rm.firebaseapp.com",
    projectId: "barbearia-rm",
    storageBucket: "barbearia-rm.firebasestorage.app",
    messagingSenderId: "512819922057",
    appId: "1:512819922057:web:6a913791cb6435e4f63258",
    measurementId: "G-TKVLVLPBJH"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('🔥 Firebase conectado!');

// ==========================================================
// ===== VARIÁVEIS GLOBAIS =====
// ==========================================================
var clienteLogado = null;
var barbeiroLogado = null;
var imagemBase64 = '';
var videoBase64 = '';
var imagemPlanoBase64 = '';
var anuncioImagemBase64 = '';
var todosPosts = [];
var todosReels = [];
var reelsAtual = 0;
var postSelecionadoId = null;
var horariosTrabalho = {
    diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horarioInicio: '09:00', horarioFim: '18:00', intervaloCortes: 30, folgas: []
};

// ==========================================================
// ===== VARIÁVEIS PARA LIVE PROFISSIONAL =====
// ==========================================================
var liveLocalStream = null;
var liveSecondStream = null;
var liveChatInterval = null;
var liveAtiva = false;
var liveChatMessages = [];
var liveTrechosSalvos = [];
var liveConvidados = [];
var liveSegundaTelaAtiva = false;
var liveGravando = false;
var liveMediaRecorder = null;
var liveChunksGravados = [];

// ==========================================================
// ===== SESSÃO =====
// ==========================================================
function salvarSessao(tipo, dados) {
    var sessao = { tipo, id: dados.id, nome: dados.nome, email: dados.email, celular: dados.celular || '', senha: dados.senha || '', fotoPerfil: dados.fotoPerfil || '', timestamp: new Date().getTime() };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(sessao));
}
function carregarSessao() {
    var s = localStorage.getItem('barbeariaRM_sessao'); if (!s) return null;
    try { var sessao = JSON.parse(s); if ((new Date().getTime() - sessao.timestamp) / 86400000 > 30) { localStorage.removeItem('barbeariaRM_sessao'); return null; } return sessao; } catch (e) { localStorage.removeItem('barbeariaRM_sessao'); return null; }
}
function limparSessao() { localStorage.removeItem('barbeariaRM_sessao'); }
async function restaurarSessao() {
    var sessao = carregarSessao(); if (!sessao) return false;
    try {
        if (sessao.tipo === 'cliente') { const snap = await db.collection('clientes').where('email', '==', sessao.email).where('senha', '==', sessao.senha).get(); if (!snap.empty) { var d = snap.docs[0]; clienteLogado = { id: d.id, ...d.data() }; document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome; mostrarTela('homeClienteScreen'); return true; } }
        else { const snap = await db.collection('barbeiros').where('email', '==', sessao.email).where('senha', '==', sessao.senha).get(); if (!snap.empty) { var d = snap.docs[0]; barbeiroLogado = { id: d.id, ...d.data() }; document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome; mostrarTela('homeBarbeiroScreen'); return true; } }
    } catch (e) {}
    limparSessao(); return false;
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================
function mostrarToast(m, t) { var toast = document.getElementById('toast'); if (!toast) return; toast.textContent = m; toast.className = 'toast ' + (t || 'info'); toast.style.display = 'block'; setTimeout(function() { toast.style.display = 'none'; }, 3000); }
function voltarParaLogin() { document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); }

// ==========================================================
// ===== LOGIN / CADASTRO =====
// ==========================================================
function mostrarLoginCliente() { document.getElementById('loginFormCliente').style.display = 'block'; document.getElementById('loginFormBarbeiro').style.display = 'none'; }
function mostrarLoginBarbeiro() { document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'block'; }

async function cadastrarCliente() {
    var n = document.getElementById('cadNomeCliente').value.trim(), e = document.getElementById('cadEmailCliente').value.trim(), c = document.getElementById('cadCelularCliente').value.trim(), s = document.getElementById('cadSenhaCliente').value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha mínima 6 caracteres!', 'error'); return; }
    try { const snap = await db.collection('clientes').where('email', '==', e).get(); if (!snap.empty) { mostrarToast('❌ E-mail já cadastrado!', 'error'); return; } var id = Date.now().toString(), cliente = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() }; await db.collection('clientes').doc(id).set(cliente); clienteLogado = cliente; salvarSessao('cliente', cliente); document.getElementById('welcomeClienteNome').textContent = n; mostrarToast('✅ Cadastro realizado!', 'success'); mostrarTela('homeClienteScreen'); document.getElementById('cadNomeCliente').value = ''; document.getElementById('cadEmailCliente').value = ''; document.getElementById('cadCelularCliente').value = ''; document.getElementById('cadSenhaCliente').value = ''; } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

async function cadastrarBarbeiro() {
    var n = document.getElementById('cadNomeBarbeiro').value.trim(), e = document.getElementById('cadEmailBarbeiro').value.trim(), c = document.getElementById('cadCelularBarbeiro').value.trim(), s = document.getElementById('cadSenhaBarbeiro').value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha mínima 6 caracteres!', 'error'); return; }
    try { const snap = await db.collection('barbeiros').where('email', '==', e).get(); if (!snap.empty) { mostrarToast('❌ E-mail já cadastrado!', 'error'); return; } var id = Date.now().toString(), barbeiro = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() }; await db.collection('barbeiros').doc(id).set(barbeiro); barbeiroLogado = barbeiro; salvarSessao('barbeiro', barbeiro); document.getElementById('welcomeBarbeiroNome').textContent = n; mostrarToast('✅ Cadastro realizado!', 'success'); mostrarTela('homeBarbeiroScreen'); document.getElementById('cadNomeBarbeiro').value = ''; document.getElementById('cadEmailBarbeiro').value = ''; document.getElementById('cadCelularBarbeiro').value = ''; document.getElementById('cadSenhaBarbeiro').value = ''; } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

async function loginCliente() {
    var e = document.getElementById('loginEmailCliente').value.trim(), s = document.getElementById('loginSenhaCliente').value;
    if (!e || !s) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    try { const snap = await db.collection('clientes').where('email', '==', e).where('senha', '==', s).get(); if (snap.empty) { mostrarToast('❌ E-mail ou senha inválidos!', 'error'); return; } var d = snap.docs[0]; clienteLogado = { id: d.id, ...d.data() }; salvarSessao('cliente', clienteLogado); document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome; document.getElementById('loginEmailCliente').value = ''; document.getElementById('loginSenhaCliente').value = ''; document.getElementById('loginFormCliente').style.display = 'none'; mostrarToast('✅ Bem-vindo!', 'success'); mostrarTela('homeClienteScreen'); } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

async function loginBarbeiro() {
    var e = document.getElementById('loginEmailBarbeiro').value.trim(), s = document.getElementById('loginSenhaBarbeiro').value;
    if (!e || !s) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    try { const snap = await db.collection('barbeiros').where('email', '==', e).where('senha', '==', s).get(); if (snap.empty) { mostrarToast('❌ E-mail ou senha inválidos!', 'error'); return; } var d = snap.docs[0]; barbeiroLogado = { id: d.id, ...d.data() }; salvarSessao('barbeiro', barbeiroLogado); document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome; document.getElementById('loginEmailBarbeiro').value = ''; document.getElementById('loginSenhaBarbeiro').value = ''; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarToast('✅ Bem-vindo!', 'success'); mostrarTela('homeBarbeiroScreen'); } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

function sairCliente() { clienteLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }
function sairBarbeiro() { barbeiroLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }

// ==========================================================
// ===== AGENDAMENTOS =====
// ==========================================================
async function carregarAgendamentosBarbeiro() { var c = document.getElementById('agendamentosBarbeiroContainer'); if (!c) return; try { const snap = await db.collection('agendamentos').orderBy('data', 'desc').get(); var ag = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (ag.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum agendamento</p>'; return; } c.innerHTML = ag.map(function(a) { var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente'; var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente'; return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 ' + (a.clienteNome||'Cliente') + '</div><div class="agenda-data">📅 ' + (a.data||'N/A') + ' • ⏰ ' + (a.horario||'N/A') + '</div><div style="font-size:12px;color:#6B7280;">✂️ ' + (a.tipo||'Corte') + '</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="agenda-status ' + sc + '">' + st + '</span>' + (a.status==='pendente'?'<button class="btn btn-small btn-success" onclick="confirmarAgendamento(\'' + a.id + '\')" style="padding:4px 8px;font-size:11px;">✅</button><button class="btn btn-small btn-danger" onclick="cancelarAgendamento(\'' + a.id + '\')" style="padding:4px 8px;font-size:11px;">❌</button>':'') + '</div></div>'; }).join(''); } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro ao carregar</p>'; } }
async function confirmarAgendamento(id) { try { await db.collection('agendamentos').doc(id).update({ status: 'confirmado' }); mostrarToast('✅ Confirmado!', 'success'); carregarAgendamentosBarbeiro(); if (clienteLogado) carregarAgendaCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
async function cancelarAgendamento(id) { if (!confirm('Cancelar?')) return; try { await db.collection('agendamentos').doc(id).update({ status: 'cancelado' }); mostrarToast('🗑 Cancelado!', 'success'); carregarAgendamentosBarbeiro(); if (clienteLogado) carregarAgendaCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }

// ==========================================================
// ===== PLANOS =====
// ==========================================================
async function carregarPlanos() { var c = document.getElementById('planosContainer'); if (!c) return; try { const snap = await db.collection('planos').orderBy('dataCriacao', 'desc').get(); var planos = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (planos.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum plano</p>'; return; } c.innerHTML = planos.map(function(p) { return '<div class="plano-card" style="flex-direction:column;align-items:flex-start;">' + (p.imagem ? '<img src="' + p.imagem + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">' : '') + '<div style="display:flex;justify-content:space-between;width:100%;align-items:center;"><div class="plano-info"><div class="plano-nome">' + p.nome + '</div><div class="plano-periodo">📅 ' + p.periodo + '</div><div style="font-size:12px;color:#6B7280;">' + (p.descricao||'') + '</div></div><div class="plano-preco">R$ ' + (p.preco?p.preco.toFixed(2):'0,00') + '</div></div><div class="plano-actions" style="margin-top:8px;"><button class="btn btn-small btn-primary" onclick="editarPlano(\'' + p.id + '\')">✏️</button><button class="btn btn-small btn-danger" onclick="excluirPlanoDireto(\'' + p.id + '\')">🗑</button></div></div>'; }).join(''); } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro</p>'; } }
async function criarPlano() { if (!barbeiroLogado) return; var n = document.getElementById('planoNome').value.trim(), p = document.getElementById('planoPeriodo').value, pr = parseFloat(document.getElementById('planoPreco').value), d = document.getElementById('planoDescricao').value.trim(), img = document.getElementById('planoImagem').value || ''; if (!n || !pr || pr <= 0) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; } try { var id = Date.now().toString(); await db.collection('planos').doc(id).set({ id, barbeiroId: barbeiroLogado.id, nome: n, periodo: p, preco: pr, descricao: d, imagem: img, dataCriacao: new Date().toISOString() }); mostrarToast('✅ Plano criado!', 'success'); document.getElementById('planoNome').value = ''; document.getElementById('planoPreco').value = ''; document.getElementById('planoDescricao').value = ''; removerImagemPlano(); mostrarTela('homeBarbeiroScreen'); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
function editarPlano(id) { db.collection('planos').doc(id).get().then(function(doc) { if (doc.exists) { var p = doc.data(); document.getElementById('editPlanoId').value = id; document.getElementById('editPlanoNome').value = p.nome; document.getElementById('editPlanoPeriodo').value = p.periodo; document.getElementById('editPlanoPreco').value = p.preco; document.getElementById('editPlanoDescricao').value = p.descricao || ''; document.getElementById('editPlanoImagem').value = p.imagem || ''; if (p.imagem) { document.getElementById('editPlanoImagemPreview').src = p.imagem; document.getElementById('editPlanoImagemPreview').style.display = 'block'; } else { document.getElementById('editPlanoImagemPreview').style.display = 'none'; } mostrarTela('editarPlanoScreen'); } }); }
async function salvarEdicaoPlano() { var id = document.getElementById('editPlanoId').value, img = document.getElementById('editPlanoImagem').value || ''; try { await db.collection('planos').doc(id).update({ nome: document.getElementById('editPlanoNome').value.trim(), periodo: document.getElementById('editPlanoPeriodo').value, preco: parseFloat(document.getElementById('editPlanoPreco').value), descricao: document.getElementById('editPlanoDescricao').value.trim(), imagem: img }); mostrarToast('✅ Atualizado!', 'success'); mostrarTela('homeBarbeiroScreen'); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
async function excluirPlano() { if (!confirm('Excluir?')) return; await db.collection('planos').doc(document.getElementById('editPlanoId').value).delete(); mostrarToast('🗑 Excluído!', 'success'); mostrarTela('homeBarbeiroScreen'); }
async function excluirPlanoDireto(id) { if (!confirm('Excluir?')) return; await db.collection('planos').doc(id).delete(); mostrarToast('🗑 Excluído!', 'success'); carregarPlanos(); }
function previewImagemPlano(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { imagemPlanoBase64 = ev.target.result; document.getElementById('planoImagem').value = imagemPlanoBase64; document.getElementById('planoImagemPreview').src = imagemPlanoBase64; document.getElementById('planoImagemPreview').style.display = 'block'; document.getElementById('btnRemoverImagemPlano').style.display = 'inline-block'; }; r.readAsDataURL(f); }
function removerImagemPlano() { imagemPlanoBase64 = ''; document.getElementById('planoImagem').value = ''; document.getElementById('planoImagemPreview').style.display = 'none'; document.getElementById('btnRemoverImagemPlano').style.display = 'none'; document.getElementById('planoImagemInput').value = ''; }
function previewEditPlanoImagem(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { document.getElementById('editPlanoImagem').value = ev.target.result; document.getElementById('editPlanoImagemPreview').src = ev.target.result; document.getElementById('editPlanoImagemPreview').style.display = 'block'; }; r.readAsDataURL(f); }

// ==========================================================
// ===== ANÚNCIOS =====
// ==========================================================
async function carregarAnuncios() { var c = document.getElementById('anunciosContainer'); if (!c) return; try { var hoje = new Date().toISOString(); const snap = await db.collection('anuncios').where('dataExpiracao', '>', hoje).get(); var anuncios = []; snap.forEach(function(doc) { anuncios.push({ id: doc.id, ...doc.data() }); }); anuncios.sort(function(a, b) { return new Date(b.dataCriacao) - new Date(a.dataCriacao); }); if (anuncios.length === 0) { c.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:#6B7280;">📢 Nenhum anúncio ativo</p></div>'; return; } c.innerHTML = anuncios.map(function(a) { return '<div class="card" style="border:2px solid #FF6B6B;margin-bottom:12px;background:rgba(255,107,107,0.05);"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">📢 ANÚNCIO</span><span style="font-size:11px;color:#6B7280;">Expira em ' + new Date(a.dataExpiracao).toLocaleDateString('pt-BR') + '</span></div>' + (a.imagem ? '<img src="' + a.imagem + '" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:8px;">' : '') + '<h3 style="color:#FF6B6B;">' + a.titulo + '</h3><p style="color:#B0B0B0;">' + a.descricao + '</p>' + (a.link ? '<a href="' + a.link + '" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:linear-gradient(135deg,#FF6B6B,#FF4757);color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>' : '') + (barbeiroLogado ? '<button class="btn btn-small btn-danger" onclick="excluirAnuncio(\'' + a.id + '\')" style="margin-top:8px;">🗑 Excluir</button>' : '') + '</div>'; }).join(''); } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro</p>'; } }
async function criarAnuncio() { if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiros!', 'error'); return; } var t = document.getElementById('anuncioTitulo').value.trim(), d = document.getElementById('anuncioDescricao').value.trim(), l = document.getElementById('anuncioLink').value.trim(), img = document.getElementById('anuncioImagem').value || '', dur = parseInt(document.getElementById('anuncioDuracao').value); if (!t) { mostrarToast('❌ Digite um título!', 'error'); return; } try { var exp = new Date(); exp.setDate(exp.getDate() + dur); var id = 'anuncio_' + Date.now(); await db.collection('anuncios').doc(id).set({ id, barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: t, descricao: d, link: l, imagem: img, duracao: dur, dataCriacao: new Date().toISOString(), dataExpiracao: exp.toISOString() }); mostrarToast('✅ Anúncio publicado!', 'success'); document.getElementById('anuncioTitulo').value = ''; document.getElementById('anuncioDescricao').value = ''; document.getElementById('anuncioLink').value = ''; removerAnuncioImagem(); carregarAnuncios(); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
async function excluirAnuncio(id) { if (!confirm('Excluir?')) return; await db.collection('anuncios').doc(id).delete(); mostrarToast('🗑 Excluído!', 'success'); carregarAnuncios(); }
function previewAnuncioImagem(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { anuncioImagemBase64 = ev.target.result; document.getElementById('anuncioImagem').value = anuncioImagemBase64; document.getElementById('anuncioImagemPreview').src = anuncioImagemBase64; document.getElementById('anuncioImagemPreview').style.display = 'block'; document.getElementById('btnRemoverAnuncioImagem').style.display = 'inline-block'; }; r.readAsDataURL(f); }
function removerAnuncioImagem() { anuncioImagemBase64 = ''; document.getElementById('anuncioImagem').value = ''; document.getElementById('anuncioImagemPreview').style.display = 'none'; document.getElementById('btnRemoverAnuncioImagem').style.display = 'none'; document.getElementById('anuncioImagemInput').value = ''; }

// ==========================================================
// ===== LIVE PROFISSIONAL =====
// ==========================================================

// --- INICIAR LIVE ---
async function iniciarLive() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiros!', 'error'); return; }
    var titulo = document.getElementById('liveTitulo').value.trim() || '🔴 Live da Barbearia RM - ' + barbeiroLogado.nome;
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true });
        liveLocalStream = stream;
        var preview = document.getElementById('previewCamera'); if (preview) { preview.srcObject = stream; preview.style.display = 'block'; }
        var videoPrincipal = document.getElementById('liveVideo'); if (videoPrincipal) videoPrincipal.srcObject = stream;
        var videoLocal = document.getElementById('liveVideoLocal'); if (videoLocal) { videoLocal.srcObject = stream; videoLocal.style.display = 'block'; }
        await db.collection('lives').doc('live_atual').set({ id: 'live_atual', barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo, ativa: true, tipo: 'interna', chat: [], viewers: 0, convidados: [], aceitandoConvidados: false, dataInicio: new Date().toISOString() });
        liveAtiva = true; liveChatMessages = [];
        var placeholder = document.getElementById('livePlaceholder'); if (placeholder) placeholder.style.display = 'none';
        var player = document.getElementById('livePlayer'); if (player) player.style.display = 'block';
        var status = document.getElementById('liveStatus'); if (status) { status.style.display = 'block'; document.getElementById('liveStatusTitulo').textContent = titulo; document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + barbeiroLogado.nome; }
        var warning = document.getElementById('liveLoginWarning'); if (warning) warning.style.display = 'none';
        var chatCard = document.getElementById('liveChatCard'); if (chatCard) chatCard.style.display = 'block';
        var convidadosCard = document.getElementById('liveConvidadosCard'); if (convidadosCard && barbeiroLogado) convidadosCard.style.display = 'block';
        atualizarChat(); iniciarChatListener(); verificarLiveAtiva();
        document.getElementById('liveViewerCount').textContent = '👥 1';
        document.getElementById('liveStatusViewers').textContent = '👥 1 assistindo';
        mostrarToast('🔴 Live iniciada!', 'success');
    } catch (error) {
        if (error.name === 'NotAllowedError') mostrarToast('❌ Permissão da câmera negada!', 'error');
        else if (error.name === 'NotFoundError') mostrarToast('❌ Nenhuma câmera encontrada!', 'error');
        else mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// --- CARREGAR LIVE ---
async function carregarLive() {
    var placeholder = document.getElementById('livePlaceholder'), player = document.getElementById('livePlayer'), status = document.getElementById('liveStatus'), warning = document.getElementById('liveLoginWarning'), controls = document.getElementById('liveControls'), chatCard = document.getElementById('liveChatCard'), convidadosCard = document.getElementById('liveConvidadosCard');
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            var live = doc.data(); liveAtiva = true;
            if (placeholder) placeholder.style.display = 'none';
            if (status) { status.style.display = 'block'; document.getElementById('liveStatusTitulo').textContent = live.titulo; document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome; document.getElementById('liveStatusViewers').textContent = '👥 ' + (live.viewers || 0) + ' assistindo'; }
            liveChatMessages = live.chat || []; atualizarChat();
            if (barbeiroLogado && barbeiroLogado.id === live.barbeiroId) {
                if (controls) controls.style.display = 'block';
                if (player) player.style.display = 'block';
                if (warning) warning.style.display = 'none';
                if (chatCard) chatCard.style.display = 'block';
                if (convidadosCard) convidadosCard.style.display = 'block';
                document.getElementById('liveTitulo').value = live.titulo;
                document.getElementById('liveViewerCount').textContent = '👥 ' + (live.viewers || 0);
                if (liveLocalStream) { document.getElementById('liveVideo').srcObject = liveLocalStream; document.getElementById('liveVideoLocal').style.display = 'block'; }
                carregarConvidadosLista();
            } else if (clienteLogado) {
                if (controls) controls.style.display = 'none';
                if (player) player.style.display = 'block';
                if (warning) warning.style.display = 'none';
                if (chatCard) chatCard.style.display = 'block';
                if (convidadosCard) convidadosCard.style.display = 'none';
                document.getElementById('liveViewerCount').textContent = '👥 ' + (live.viewers || 0);
                var viewers = (live.viewers || 0) + 1;
                await db.collection('lives').doc('live_atual').update({ viewers });
                document.getElementById('liveStatusViewers').textContent = '👥 ' + viewers + ' assistindo';
                document.getElementById('liveViewerCount').textContent = '👥 ' + viewers;
            } else {
                if (player) player.style.display = 'none';
                if (warning) warning.style.display = 'block';
                if (chatCard) chatCard.style.display = 'none';
                if (controls) controls.style.display = 'none';
            }
            iniciarChatListener();
        } else {
            liveAtiva = false;
            if (placeholder) placeholder.style.display = 'block';
            if (player) player.style.display = 'none';
            if (status) status.style.display = 'none';
            if (warning) warning.style.display = 'none';
            if (barbeiroLogado) { if (controls) controls.style.display = 'block'; } else { if (controls) controls.style.display = 'none'; }
            pararChatListener();
        }
    } catch (e) { liveAtiva = false; if (placeholder) placeholder.style.display = 'block'; if (player) player.style.display = 'none'; }
}

// --- ENCERRAR LIVE ---
async function encerrarLive() {
    if (!barbeiroLogado) return;
    if (!confirm('Encerrar a live?')) return;
    pararTransmissao();
    try {
        await db.collection('lives').doc('live_atual').update({ ativa: false, dataFim: new Date().toISOString() });
        liveAtiva = false; liveChatMessages = [];
        document.getElementById('livePlaceholder').style.display = 'block';
        document.getElementById('livePlayer').style.display = 'none';
        document.getElementById('liveStatus').style.display = 'none';
        document.getElementById('liveVideo').srcObject = null;
        document.getElementById('liveVideoLocal').style.display = 'none';
        document.getElementById('liveTitulo').value = '';
        document.getElementById('liveLoginWarning').style.display = 'none';
        pararChatListener(); atualizarChat(); verificarLiveAtiva();
        mostrarToast('⏹ Live encerrada!', 'info');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

function pararTransmissao() {
    if (liveLocalStream) { liveLocalStream.getTracks().forEach(track => track.stop()); liveLocalStream = null; }
    if (liveSecondStream) { liveSecondStream.getTracks().forEach(track => track.stop()); liveSecondStream = null; }
    var pc = document.getElementById('previewCamera'); if (pc) { pc.srcObject = null; pc.style.display = 'none'; }
    var lv = document.getElementById('liveVideo'); if (lv) lv.srcObject = null;
    var vl = document.getElementById('liveVideoLocal'); if (vl) { vl.srcObject = null; vl.style.display = 'none'; }
    var sv = document.getElementById('liveSecondVideo'); if (sv) { sv.srcObject = null; sv.style.display = 'none'; }
}

// --- SEGUNDA TELA ---
function toggleSegundaTela() {
    var secondScreen = document.getElementById('liveSecondScreen');
    if (!secondScreen) return;
    if (liveSegundaTelaAtiva) {
        secondScreen.style.display = 'none';
        liveSegundaTelaAtiva = false;
        mostrarToast('📺 Segunda tela ocultada', 'info');
    } else {
        secondScreen.style.display = 'block';
        liveSegundaTelaAtiva = true;
        mostrarToast('📺 Segunda tela ativada', 'info');
    }
}

function carregarVideoComercial() {
    document.getElementById('comercialVideoInput').click();
}

function carregarVideoArquivo(event) {
    var file = event.target.files[0]; if (!file) return;
    var url = URL.createObjectURL(file);
    var video = document.getElementById('liveSecondVideo');
    var placeholder = document.getElementById('liveSecondPlaceholder');
    video.src = url; video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    document.getElementById('liveSecondScreen').style.display = 'block';
    liveSegundaTelaAtiva = true;
    mostrarToast('🎬 Vídeo carregado!', 'success');
}

function carregarImagemArquivo(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var container = document.getElementById('liveSecondVideo').parentElement;
        var oldImg = container.querySelector('img'); if (oldImg) oldImg.remove();
        var img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
        container.appendChild(img);
        document.getElementById('liveSecondVideo').style.display = 'none';
        document.getElementById('liveSecondPlaceholder').style.display = 'none';
        document.getElementById('liveSecondScreen').style.display = 'block';
        liveSegundaTelaAtiva = true;
        mostrarToast('🖼️ Imagem carregada!', 'success');
    };
    reader.readAsDataURL(file);
}

// --- CONVIDADOS ---
function solicitarConvidado() {
    if (!barbeiroLogado) return;
    db.collection('lives').doc('live_atual').update({ aceitandoConvidados: true }).then(() => {
        mostrarToast('👤 Aguardando convidados...', 'info');
    });
}

async function conectarConvidado() {
    if (!clienteLogado && !barbeiroLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) { mostrarToast('❌ Nenhuma live ativa!', 'error'); return; }
        if (!doc.data().aceitandoConvidados) {
            var nome = clienteLogado ? clienteLogado.nome : barbeiroLogado.nome;
            var solicitacao = { id: Date.now().toString(), nome, userId: clienteLogado ? clienteLogado.id : barbeiroLogado.id, tipo: clienteLogado ? 'cliente' : 'barbeiro', status: 'pendente', data: new Date().toISOString() };
            var convidados = doc.data().convidados || []; convidados.push(solicitacao);
            await db.collection('lives').doc('live_atual').update({ convidados });
            mostrarToast('📩 Solicitação enviada!', 'info'); return;
        }
        var stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        liveSecondStream = stream;
        var secondVideo = document.getElementById('liveSecondVideo');
        secondVideo.srcObject = stream; secondVideo.style.display = 'block';
        document.getElementById('liveSecondPlaceholder').style.display = 'none';
        document.getElementById('liveSecondScreen').style.display = 'block';
        liveSegundaTelaAtiva = true;
        mostrarToast('✅ Você está ao vivo!', 'success');
    } catch (error) { mostrarToast('❌ Erro: ' + error.message, 'error'); }
}

async function aprovarConvidado() {
    if (!barbeiroLogado) return;
    try {
        const doc = await db.collection('lives').doc('live_atual').get(); if (!doc.exists) return;
        var convidados = doc.data().convidados || [];
        var pendentes = convidados.filter(c => c.status === 'pendente');
        if (pendentes.length === 0) { mostrarToast('📭 Nenhum convidado', 'info'); return; }
        pendentes[0].status = 'aprovado';
        await db.collection('lives').doc('live_atual').update({ convidados, aceitandoConvidados: true });
        mostrarToast('✅ ' + pendentes[0].nome + ' aprovado!', 'success');
        carregarConvidadosLista();
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function carregarConvidadosLista() {
    var container = document.getElementById('liveConvidadosContainer'); if (!container) return;
    try {
        const doc = await db.collection('lives').doc('live_atual').get(); if (!doc.exists) return;
        var convidados = doc.data().convidados || [];
        if (convidados.length === 0) { container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum convidado</p>'; return; }
        container.innerHTML = convidados.map(function(c) {
            var statusColor = c.status === 'aprovado' ? '#10B981' : c.status === 'pendente' ? '#F59E0B' : '#EF4444';
            var statusText = c.status === 'aprovado' ? '✅' : c.status === 'pendente' ? '⏳' : '❌';
            return '<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:6px;display:flex;justify-content:space-between;"><span>👤 ' + c.nome + '</span><span style="color:' + statusColor + ';">' + statusText + ' ' + c.status + '</span></div>';
        }).join('');
    } catch (e) {}
}

// --- CORTAR TRECHOS ---
function cortarTrechoLive() {
    if (!liveAtiva) { mostrarToast('❌ Não há live ativa!', 'error'); return; }
    if (liveGravando) { pararGravacao(); } else { iniciarGravacao(); }
}

function iniciarGravacao() {
    if (!liveLocalStream) { mostrarToast('❌ Nenhum stream!', 'error'); return; }
    try {
        liveChunksGravados = [];
        liveMediaRecorder = new MediaRecorder(liveLocalStream, { mimeType: 'video/webm;codecs=vp8,opus' });
        liveMediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) liveChunksGravados.push(e.data); };
        liveMediaRecorder.onstop = function() {
            var blob = new Blob(liveChunksGravados, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            var timestamp = new Date().toLocaleTimeString('pt-BR');
            liveTrechosSalvos.push({ id: Date.now(), nome: 'Trecho ' + timestamp, url, blob, data: new Date().toISOString() });
            atualizarTrechosSalvos();
            mostrarToast('✅ Trecho salvo!', 'success');
        };
        liveMediaRecorder.start(); liveGravando = true;
        mostrarToast('🔴 Gravando trecho...', 'info');
    } catch (e) { mostrarToast('❌ Erro ao gravar', 'error'); }
}

function pararGravacao() { if (liveMediaRecorder && liveGravando) { liveMediaRecorder.stop(); liveGravando = false; } }

function atualizarTrechosSalvos() {
    var container = document.getElementById('trechosSalvosContainer'); if (!container) return;
    if (liveTrechosSalvos.length === 0) { container.innerHTML = '<p style="color:#6B7280;font-size:11px;">Nenhum trecho</p>'; return; }
    container.innerHTML = liveTrechosSalvos.map(function(t, i) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:6px;">' +
            '<span style="color:white;font-size:11px;">✂️ ' + t.nome + '</span>' +
            '<div style="display:flex;gap:4px;"><button class="btn btn-small btn-primary" onclick="baixarTrecho(' + i + ')" style="font-size:10px;padding:2px 8px;">⬇️</button><button class="btn btn-small btn-danger" onclick="excluirTrecho(' + i + ')" style="font-size:10px;padding:2px 8px;">🗑</button></div></div>';
    }).join('');
}

function baixarTrecho(index) {
    var trecho = liveTrechosSalvos[index]; if (!trecho) return;
    var a = document.createElement('a'); a.href = trecho.url; a.download = 'live_trecho_' + trecho.id + '.webm';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    mostrarToast('⬇️ Download!', 'success');
}

function excluirTrecho(index) { liveTrechosSalvos.splice(index, 1); atualizarTrechosSalvos(); mostrarToast('🗑 Removido', 'info'); }

// --- CHAT ---
function iniciarChatListener() { pararChatListener(); liveChatInterval = setInterval(async function() { try { const doc = await db.collection('lives').doc('live_atual').get(); if (doc.exists && doc.data().ativa) { var novas = doc.data().chat || []; if (novas.length !== liveChatMessages.length) { liveChatMessages = novas; atualizarChat(); } var viewers = doc.data().viewers || 0; var el = document.getElementById('liveStatusViewers'); var el2 = document.getElementById('liveViewerCount'); if (el) el.textContent = '👥 ' + viewers + ' assistindo'; if (el2) el2.textContent = '👥 ' + viewers; } } catch (e) {} }, 3000); }
function pararChatListener() { if (liveChatInterval) { clearInterval(liveChatInterval); liveChatInterval = null; } }

async function enviarMensagemLive() {
    var input = document.getElementById('liveChatInput'); if (!input) return;
    var texto = input.value.trim(); if (!texto) { mostrarToast('❌ Digite!', 'error'); return; }
    if (!liveAtiva) { mostrarToast('❌ Sem live!', 'error'); return; }
    if (!clienteLogado && !barbeiroLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var autor = '👤 Anônimo'; if (clienteLogado) autor = '💇 ' + clienteLogado.nome; if (barbeiroLogado) autor = '✂️ ' + barbeiroLogado.nome;
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) { mostrarToast('❌ Live encerrada!', 'error'); return; }
        var chat = doc.data().chat || []; chat.push({ autor, texto, data: new Date().toISOString() });
        if (chat.length > 100) chat = chat.slice(-100);
        await db.collection('lives').doc('live_atual').update({ chat });
        liveChatMessages = chat; atualizarChat(); input.value = '';
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

function atualizarChat() {
    var c = document.getElementById('liveChatContainer'); if (!c) return;
    if (!liveChatMessages || liveChatMessages.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">💬 Nenhuma mensagem</p>'; return; }
    c.innerHTML = liveChatMessages.map(function(msg) { var hora = new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return '<div class="live-chat-message"><span class="autor">' + (msg.autor||'Anônimo') + '</span> <span style="font-size:10px;color:#6B7280;">' + hora + '</span><div class="texto">' + (msg.texto||'') + '</div></div>'; }).join('');
    c.scrollTop = c.scrollHeight;
}

async function verificarLiveAtiva() { try { const doc = await db.collection('lives').doc('live_atual').get(); var ativa = doc.exists && doc.data().ativa; var b1 = document.getElementById('liveBadgeCliente'), b2 = document.getElementById('liveBadgeBarbeiro'); if (b1) b1.style.display = ativa ? 'inline-block' : 'none'; if (b2) b2.style.display = ativa ? 'inline-block' : 'none'; } catch (e) {} }

// ==========================================================
// ===== FATURAMENTO =====
// ==========================================================
async function calcularFaturamento() { try { const snap = await db.collection('agendamentos').where('status', '==', 'confirmado').get(); var ag = snap.docs.map(d => d.data()), hoje = new Date().toISOString().split('T')[0], vh = 0, vt = 0; ag.forEach(function(a) { var v = 35; if (a.data === hoje) vh += v; vt += v; }); var eh = document.getElementById('faturamentoHoje'); if (eh) eh.textContent = 'R$ ' + vh.toFixed(2); var es = document.getElementById('faturamentoSemana'); if (es) es.textContent = 'R$ ' + (vt*0.3).toFixed(2); var em = document.getElementById('faturamentoMes'); if (em) em.textContent = 'R$ ' + (vt*0.7).toFixed(2); var ea = document.getElementById('faturamentoAno'); if (ea) ea.textContent = 'R$ ' + vt.toFixed(2); } catch (e) {} }

// ==========================================================
// ===== FEED CLIENTE =====
// ==========================================================
async function carregarFeedCliente() { var c = document.getElementById('feedClienteContainer'); if (!c) return; try { const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get(); var posts = snap.docs.map(d => ({ id: d.id, ...d.data() })); todosPosts = posts; if (posts.length === 0) { c.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>'; return; } c.innerHTML = posts.map(function(post) { var com = post.comentarios || []; return '<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">' + (post.barbeiroNome||'Barbearia RM') + '</div><div class="feed-post-user-time">' + new Date(post.dataCriacao).toLocaleDateString('pt-BR') + '</div></div></div>' + (post.video ? '<video class="feed-post-video" controls style="width:100%;"><source src="' + post.video + '" type="video/mp4"></video>' : post.imagem ? '<img src="' + post.imagem + '" class="feed-post-image" alt="' + post.titulo + '">' : '') + '<div class="feed-post-body"><div class="feed-post-title">' + post.titulo + '</div><div class="feed-post-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div><div class="feed-post-desc">' + (post.descricao||'') + '</div></div><div class="feed-post-actions"><button onclick="likePost(\'' + post.id + '\', this)">❤️ <span class="count">' + (post.likes||0) + '</span></button><button onclick="abrirComentarios(\'' + post.id + '\')">💬 <span class="count">' + com.length + '</span></button><button onclick="agendarPorPost()">✂️ Agendar</button></div>' + (com.length > 0 ? '<div class="comentarios-preview" style="padding:0 14px 10px;">' + com.slice(-3).map(function(c) { return '<div style="font-size:12px;color:#B0B0B0;margin:4px 0;"><strong style="color:#D4A84B;">' + c.autor + ':</strong> ' + c.texto + '</div>'; }).join('') + (com.length > 3 ? '<div style="font-size:11px;color:var(--primary);cursor:pointer;" onclick="abrirComentarios(\'' + post.id + '\')">Ver todos os ' + com.length + ' comentários</div>' : '') + '</div>' : '') + '</div>'; }).join(''); } catch (e) {} }

// ==========================================================
// ===== MEUS POSTS =====
// ==========================================================
async function carregarMeusPosts() { var c = document.getElementById('meusPostsContainer'); if (!c) return; if (!barbeiroLogado) { c.innerHTML = '<p style="color:#6B7280;">Faça login</p>'; return; } try { const snap = await db.collection('posts').where('barbeiroId', '==', barbeiroLogado.id).get(); var posts = []; snap.forEach(function(doc) { posts.push({ id: doc.id, ...doc.data() }); }); posts.sort(function(a, b) { return new Date(b.dataCriacao) - new Date(a.dataCriacao); }); if (posts.length === 0) { c.innerHTML = '<p style="color:#6B7280;">Nenhum post.<br><button class="btn btn-small btn-primary" onclick="mostrarTela(\'criarPostScreen\')">📸 Criar</button></p>'; return; } c.innerHTML = posts.map(function(post) { var com = post.comentarios || []; var h = '<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">' + post.titulo + '</div><div class="feed-post-user-time">' + new Date(post.dataCriacao).toLocaleDateString('pt-BR') + ' • R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div></div></div>'; if (post.imagem) h += '<img src="' + post.imagem + '" class="feed-post-image">'; if (post.video) h += '<video class="feed-post-video" controls><source src="' + post.video + '" type="video/mp4"></video>'; h += '<div class="feed-post-body"><div class="feed-post-desc">' + (post.descricao||'Sem descrição') + '</div><div style="font-size:12px;color:#6B7280;">❤️ ' + (post.likes||0) + ' • 💬 ' + com.length + '</div></div>'; if (com.length > 0) { h += '<div style="padding:0 14px 10px;border-top:1px solid rgba(255,255,255,0.05);"><div style="font-size:11px;color:var(--primary);">💬 Comentários:</div>'; com.forEach(function(c) { h += '<div style="font-size:12px;color:#B0B0B0;margin:6px 0;padding:6px;background:rgba(255,255,255,.03);border-radius:6px;"><strong style="color:#D4A84B;">' + c.autor + ':</strong> ' + c.texto + '</div>'; }); h += '</div>'; } h += '<div class="feed-post-actions"><button onclick="excluirMeuPost(\'' + post.id + '\')" style="color:#EF4444;">🗑 Excluir</button></div></div>'; return h; }).join(''); } catch (e) { c.innerHTML = '<p style="color:#EF4444;">Erro<br><button class="btn btn-small btn-primary" onclick="carregarMeusPosts()">🔄 Tentar</button></p>'; } }
async function excluirMeuPost(id) { if (!confirm('Excluir?')) return; await db.collection('posts').doc(id).delete(); mostrarToast('🗑 Excluído!', 'success'); carregarMeusPosts(); carregarFeedCliente(); }

// ==========================================================
// ===== COMENTÁRIOS =====
// ==========================================================
function abrirComentarios(id) { postSelecionadoId = id; carregarComentarios(id); document.getElementById('modalComentario').classList.add('active'); }
async function carregarComentarios(id) { var c = document.getElementById('comentariosContainer'); if (!c) return; try { const doc = await db.collection('posts').doc(id).get(); if (!doc.exists) return; var com = doc.data().comentarios || []; if (com.length === 0) { c.innerHTML = '<p style="color:#6B7280;">Nenhum comentário</p>'; return; } c.innerHTML = com.map(function(c) { return '<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">' + c.autor + '</strong><p style="color:#B0B0B0;">' + c.texto + '</p></div>'; }).join(''); } catch (e) {} }
async function adicionarComentario() { var t = document.getElementById('novoComentario').value.trim(); if (!t) { mostrarToast('❌ Digite algo!', 'error'); return; } if (!clienteLogado && !barbeiroLogado) { mostrarToast('❌ Faça login!', 'error'); return; } var autor = clienteLogado ? clienteLogado.nome : barbeiroLogado.nome; try { const doc = await db.collection('posts').doc(postSelecionadoId).get(); var com = doc.data().comentarios || []; com.push({ autor, texto: t, data: new Date().toISOString() }); await db.collection('posts').doc(postSelecionadoId).update({ comentarios: com }); mostrarToast('✅ Comentado!', 'success'); document.getElementById('novoComentario').value = ''; carregarComentarios(postSelecionadoId); carregarFeedCliente(); if (barbeiroLogado) carregarMeusPosts(); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
function fecharModalComentario() { document.getElementById('modalComentario').classList.remove('active'); }

// ==========================================================
// ===== CRIAR POST =====
// ==========================================================
async function criarPost() { if (!barbeiroLogado) { mostrarToast('❌ Faça login!', 'error'); return; } var t = document.getElementById('postTitulo').value.trim(), p = parseFloat(document.getElementById('postPreco').value), d = document.getElementById('postDescricao').value.trim(), img = document.getElementById('postImagem').value || '', vid = document.getElementById('postVideo').value || ''; if (!t || !p || p <= 0) { mostrarToast('❌ Preencha título e preço!', 'error'); return; } try { var id = Date.now().toString(); await db.collection('posts').doc(id).set({ id, barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: t, preco: p, imagem: img, video: vid, descricao: d, likes: 0, comentarios: [], dataCriacao: new Date().toISOString() }); mostrarToast('✅ Publicado!', 'success'); document.getElementById('postTitulo').value = ''; document.getElementById('postPreco').value = ''; document.getElementById('postDescricao').value = ''; removerImagem(); removerVideo(); mostrarTela('homeBarbeiroScreen'); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }

// ==========================================================
// ===== UPLOAD =====
// ==========================================================
function previewImagem(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { imagemBase64 = ev.target.result; document.getElementById('postImagem').value = imagemBase64; document.getElementById('imagemPreviewImg').src = imagemBase64; document.getElementById('imagemPreview').style.display = 'block'; document.getElementById('imagemUploadArea').style.display = 'none'; }; r.readAsDataURL(f); }
function removerImagem() { imagemBase64 = ''; document.getElementById('postImagem').value = ''; document.getElementById('imagemPreview').style.display = 'none'; document.getElementById('imagemUploadArea').style.display = 'block'; document.getElementById('postImagemInput').value = ''; }
function previewVideo(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { videoBase64 = ev.target.result; document.getElementById('postVideo').value = videoBase64; document.getElementById('videoPreviewVideo').src = videoBase64; document.getElementById('videoPreview').style.display = 'block'; document.getElementById('videoUploadArea').style.display = 'none'; }; r.readAsDataURL(f); }
function removerVideo() { videoBase64 = ''; document.getElementById('postVideo').value = ''; document.getElementById('videoPreview').style.display = 'none'; document.getElementById('videoUploadArea').style.display = 'block'; document.getElementById('postVideoInput').value = ''; }

// ==========================================================
// ===== AGENDAMENTO CLIENTE =====
// ==========================================================
async function agendarCorte() { if (!clienteLogado) { mostrarToast('❌ Faça login!', 'error'); return; } var d = document.getElementById('agendamentoData').value, h = document.getElementById('agendamentoHorario').value, t = document.getElementById('agendamentoTipo').value; if (!d) { mostrarToast('❌ Selecione uma data!', 'error'); return; } try { var id = Date.now().toString(); await db.collection('agendamentos').doc(id).set({ id, clienteId: clienteLogado.id, clienteNome: clienteLogado.nome, clienteEmail: clienteLogado.email, data: d, horario: h, tipo: t, status: 'pendente', dataCriacao: new Date().toISOString() }); mostrarToast('✅ Agendado!', 'success'); document.getElementById('agendamentoData').value = ''; carregarAgendaCliente(); mostrarTela('homeClienteScreen'); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
async function carregarAgendaCliente() { if (!clienteLogado) return; var c = document.getElementById('agendaClienteContainer'); if (!c) return; try { const snap = await db.collection('agendamentos').where('clienteId', '==', clienteLogado.id).get(); var ag = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (ag.length === 0) { c.innerHTML = '<p style="color:#6B7280;">Nenhum agendamento</p>'; return; } ag.sort((a,b) => new Date(b.data+' '+b.horario) - new Date(a.data+' '+a.horario)); c.innerHTML = ag.map(function(a) { var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente'; var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente'; return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">' + a.tipo + '</div><div class="agenda-data">📅 ' + a.data + ' • ⏰ ' + a.horario + '</div></div><span class="agenda-status ' + sc + '">' + st + '</span></div>'; }).join(''); } catch (e) {} }

// ==========================================================
// ===== GALERIA / REELS =====
// ==========================================================
async function carregarGaleria() { var c = document.getElementById('galeriaContainer'); if (!c) return; try { const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get(); todosPosts = snap.docs.map(d => ({ id: d.id, ...d.data() })); filtrarGaleria(); } catch (e) {} }
function filtrarGaleria() { var cat = document.getElementById('filtroCategoria').value, c = document.getElementById('galeriaContainer'); var f = cat === 'todos' ? todosPosts : todosPosts.filter(p => p.titulo === cat); if (f.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;grid-column:1/-1;">Nenhum corte</p>'; return; } c.innerHTML = f.map(function(post) { return '<div class="galeria-item" onclick="verDetalheCorte(\'' + post.id + '\')">' + (post.imagem ? '<img src="' + post.imagem + '" class="galeria-item-image">' : '<div class="galeria-item-image" style="background:linear-gradient(135deg,#1A1A1A,#2D2D2D);display:flex;align-items:center;justify-content:center;font-size:40px;">✂️</div>') + '<div class="galeria-item-info"><div class="galeria-item-title">' + post.titulo + '</div><div class="galeria-item-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div></div></div>'; }).join(''); }
function verDetalheCorte(id) { var post = todosPosts.find(p => p.id === id); if (!post) return; document.getElementById('detalhePostConteudo').innerHTML = '<div class="card"><h3>' + post.titulo + '</h3>' + (post.video ? '<video controls style="width:100%;border-radius:12px;"><source src="' + post.video + '" type="video/mp4"></video>' : post.imagem ? '<img src="' + post.imagem + '" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;">' : '') + '<p style="font-size:24px;color:var(--primary);">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</p><button class="btn btn-primary" onclick="agendarPorPost()">✂️ AGENDAR</button><button class="btn btn-outline" onclick="mostrarTela(\'galeriaCortesScreen\')">← Voltar</button></div>'; mostrarTela('detalhePostScreen'); }
async function carregarReels() { var c = document.getElementById('reelsContainer'); if (!c) return; try { const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get(); todosReels = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (todosReels.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:40px;">Nenhum reel</p>'; return; } reelsAtual = 0; exibirReel(0); } catch (e) {} }
function exibirReel(i) { if (i < 0) i = 0; if (i >= todosReels.length) i = todosReels.length - 1; reelsAtual = i; var post = todosReels[i]; document.getElementById('reelsContainer').innerHTML = '<div class="reel-item">' + (post.video ? '<video src="' + post.video + '" autoplay loop muted playsinline></video>' : post.imagem ? '<img src="' + post.imagem + '" class="reel-item-image">' : '<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>') + '<div class="reel-item-overlay"><div class="reel-item-title">' + post.titulo + '</div><div class="reel-item-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div></div><div class="reel-item-actions"><button onclick="likeReel(this)">❤️</button><button onclick="agendarPorPost()">✂️</button></div></div>'; }
function reelAnterior() { if (reelsAtual > 0) { reelsAtual--; exibirReel(reelsAtual); } }
function reelProximo() { if (reelsAtual < todosReels.length - 1) { reelsAtual++; exibirReel(reelsAtual); } }
function likeReel(btn) { btn.classList.toggle('liked'); mostrarToast('❤️ Curtido!', 'success'); }
function agendarPorPost() { mostrarTela('agendamentoScreen'); }
function likePost(id, btn) { btn.classList.toggle('liked'); var c = btn.querySelector('.count'); if (c) { var cur = parseInt(c.textContent) || 0; c.textContent = btn.classList.contains('liked') ? cur + 1 : cur - 1; } }

// ==========================================================
// ===== PERFIL =====
// ==========================================================
function carregarPerfilCliente() { if (!clienteLogado) return; document.getElementById('perfilClienteNome').textContent = clienteLogado.nome; document.getElementById('perfilClienteEmail').textContent = clienteLogado.email; document.getElementById('editClienteNome').value = clienteLogado.nome || ''; document.getElementById('editClienteCelular').value = clienteLogado.celular || ''; }
async function salvarPerfilCliente() { if (!clienteLogado) return; var n = document.getElementById('editClienteNome').value.trim(), c = document.getElementById('editClienteCelular').value.trim(); try { await db.collection('clientes').doc(clienteLogado.id).update({ nome: n, celular: c }); clienteLogado.nome = n; clienteLogado.celular = c; salvarSessao('cliente', clienteLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }
function carregarPerfilBarbeiro() { if (!barbeiroLogado) return; document.getElementById('perfilBarbeiroNome').textContent = barbeiroLogado.nome; document.getElementById('perfilBarbeiroEmail').textContent = barbeiroLogado.email; document.getElementById('editBarbeiroNome').value = barbeiroLogado.nome || ''; document.getElementById('editBarbeiroCelular').value = barbeiroLogado.celular || ''; document.getElementById('editBarbeiroEmail').value = barbeiroLogado.email || ''; }
async function salvarPerfilBarbeiro() { if (!barbeiroLogado) return; var n = document.getElementById('editBarbeiroNome').value.trim(), c = document.getElementById('editBarbeiroCelular').value.trim(), e = document.getElementById('editBarbeiroEmail').value.trim(); try { await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome: n, celular: c, email: e }); barbeiroLogado.nome = n; barbeiroLogado.celular = c; barbeiroLogado.email = e; salvarSessao('barbeiro', barbeiroLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilBarbeiro(); } catch (er) { mostrarToast('❌ Erro!', 'error'); } }
function uploadFotoCliente(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = async function(ev) { var foto = ev.target.result; var av = document.getElementById('perfilClienteAvatar'); if (av) { var img = av.querySelector('img'); if (img) img.src = foto; } clienteLogado.fotoPerfil = foto; await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto }); salvarSessao('cliente', clienteLogado); mostrarToast('✅ Foto atualizada!', 'success'); }; r.readAsDataURL(f); }
function uploadFotoBarbeiro(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = async function(ev) { var foto = ev.target.result; var av = document.getElementById('perfilBarbeiroAvatar'); if (av) { var img = av.querySelector('img'); if (img) img.src = foto; } barbeiroLogado.fotoPerfil = foto; await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto }); salvarSessao('barbeiro', barbeiroLogado); mostrarToast('✅ Foto atualizada!', 'success'); }; r.readAsDataURL(f); }

// ==========================================================
// ===== EXTRATO / PAGAMENTO =====
// ==========================================================
function filtrarExtrato(t) { mostrarToast('📊 ' + t, 'info'); }
function copiarPix() { navigator.clipboard.writeText(document.getElementById('pixChave').textContent).then(() => mostrarToast('✅ PIX copiado!', 'success')); }
function fecharPagamento() { mostrarTela('homeClienteScreen'); }

// ==========================================================
// ===== HORÁRIOS =====
// ==========================================================
async function carregarHorarios() { if (!barbeiroLogado) return; try { const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get(); if (doc.exists) horariosTrabalho = doc.data(); ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => { var cb = document.getElementById('dia'+d); if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(d.toLowerCase()); }); document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio; document.getElementById('horarioFim').value = horariosTrabalho.horarioFim; document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes; carregarFolgas(); } catch (e) {} }
function carregarFolgas() { var c = document.getElementById('folgasContainer'); if (!c) return; if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhuma folga</p>'; return; } c.innerHTML = horariosTrabalho.folgas.map((f,i) => '<div class="folga-item"><span>🏖️ ' + new Date(f).toLocaleDateString('pt-BR') + '</span><button onclick="removerFolga(' + i + ')">❌</button></div>').join(''); }
function adicionarFolga() { var d = document.getElementById('folgaData').value; if (!d) return; if (horariosTrabalho.folgas.includes(d)) { mostrarToast('❌ Já cadastrada!', 'error'); return; } horariosTrabalho.folgas.push(d); horariosTrabalho.folgas.sort(); carregarFolgas(); document.getElementById('folgaData').value = ''; mostrarToast('✅ Adicionada!', 'success'); }
function removerFolga(i) { horariosTrabalho.folgas.splice(i, 1); carregarFolgas(); }
async function salvarHorarios() { if (!barbeiroLogado) return; var dias = []; ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => { var cb = document.getElementById('dia'+d); if (cb && cb.checked) dias.push(d.toLowerCase()); }); horariosTrabalho.diasTrabalho = dias; horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value; horariosTrabalho.horarioFim = document.getElementById('horarioFim').value; horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value); try { await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho); mostrarToast('✅ Salvos!', 'success'); } catch (e) { mostrarToast('❌ Erro!', 'error'); } }

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    var el = document.getElementById(id); if (el) el.classList.add('active');
    var nc = document.getElementById('bottomNavCliente'), nb = document.getElementById('bottomNavBarbeiro');
    var tc = ['homeClienteScreen','agendamentoScreen','galeriaCortesScreen','reelsScreen','anunciosScreen','liveScreen','perfilClienteScreen','detalhePostScreen','pagamentoScreen'];
    var tb = ['homeBarbeiroScreen','criarPostScreen','extratoScreen','criarPlanoScreen','editarPlanoScreen','horariosTrabalhoScreen','anunciosScreen','liveScreen','perfilBarbeiroScreen'];
    if (tc.includes(id)) { if (nc) nc.style.display = 'flex'; if (nb) nb.style.display = 'none'; }
    else if (tb.includes(id)) { if (nb) nb.style.display = 'flex'; if (nc) nc.style.display = 'none'; }
    else { if (nc) nc.style.display = 'none'; if (nb) nb.style.display = 'none'; }
    if (id === 'homeClienteScreen') { carregarFeedCliente(); carregarAgendaCliente(); verificarLiveAtiva(); }
    if (id === 'homeBarbeiroScreen') { carregarAgendamentosBarbeiro(); carregarPlanos(); calcularFaturamento(); carregarMeusPosts(); verificarLiveAtiva(); }
    if (id === 'anunciosScreen') { carregarAnuncios(); if (barbeiroLogado) document.getElementById('formAnuncio').style.display = 'block'; else document.getElementById('formAnuncio').style.display = 'none'; }
    if (id === 'liveScreen') { carregarLive(); }
    if (id === 'perfilClienteScreen') carregarPerfilCliente();
    if (id === 'perfilBarbeiroScreen') carregarPerfilBarbeiro();
    if (id === 'galeriaCortesScreen') carregarGaleria();
    if (id === 'reelsScreen') carregarReels();
    if (id === 'horariosTrabalhoScreen') carregarHorarios();
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Barbearia RM iniciando...');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    restaurarSessao().then(r => { if (!r) document.getElementById('loginScreen').classList.add('active'); });
    verificarLiveAtiva();
    console.log('✅ Sistema pronto!');
});
