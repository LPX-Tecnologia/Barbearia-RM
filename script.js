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
var liveGravacaoCompleta = false;
var liveChunksCompletos = [];
var liveMediaRecorderCompleto = null;
var liveCanvasInterval = null;
var liveViewerId = null;
var liveViewerInterval = null;
var liveLikes = 0;
var liveLiked = false;

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
function mostrarToast(m, t) { var toast = document.getElementById('toast'); if (!toast) return; toast.textContent = m; toast.className = 'toast ' + (t || 'info'); toast.style.display = 'block'; setTimeout(function() { toast.style.display = 'none'; }, 4000); }
function voltarParaLogin() { document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); }

// ==========================================================
// ===== LOGIN / CADASTRO (MANTIDO IGUAL) =====
// ==========================================================
function mostrarLoginCliente() { document.getElementById('loginFormCliente').style.display = 'block'; document.getElementById('loginFormBarbeiro').style.display = 'none'; }
function mostrarLoginBarbeiro() { document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'block'; }

async function cadastrarCliente() {
    var n = document.getElementById('cadNomeCliente').value.trim(), e = document.getElementById('cadEmailCliente').value.trim(), c = document.getElementById('cadCelularCliente').value.trim(), s = document.getElementById('cadSenhaCliente').value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha mínima 6 caracteres!', 'error'); return; }
    try { const snap = await db.collection('clientes').where('email', '==', e).get(); if (!snap.empty) { mostrarToast('❌ E-mail já cadastrado!', 'error'); return; } var id = Date.now().toString(), cliente = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString(), notificacoesLive: true }; await db.collection('clientes').doc(id).set(cliente); clienteLogado = cliente; salvarSessao('cliente', cliente); document.getElementById('welcomeClienteNome').textContent = n; mostrarToast('✅ Cadastro realizado!', 'success'); mostrarTela('homeClienteScreen'); document.getElementById('cadNomeCliente').value = ''; document.getElementById('cadEmailCliente').value = ''; document.getElementById('cadCelularCliente').value = ''; document.getElementById('cadSenhaCliente').value = ''; } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
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

function sairCliente() { removerViewerLive(); clienteLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }
function sairBarbeiro() { removerViewerLive(); barbeiroLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }

// ==========================================================
// ===== SISTEMA DE VIEWERS (TIPO YOUTUBE) =====
// ==========================================================
function gerarViewerId() {
    return 'viewer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function adicionarViewerLive() {
    if (!liveAtiva) return;
    if (liveViewerId) return; // Já está como viewer
    
    liveViewerId = gerarViewerId();
    var nome = '👤 Visitante';
    if (clienteLogado) nome = '💇 ' + clienteLogado.nome;
    if (barbeiroLogado) nome = '✂️ ' + barbeiroLogado.nome;
    
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) return;
        
        var viewersAtivos = doc.data().viewersAtivos || {};
        viewersAtivos[liveViewerId] = {
            nome: nome,
            entrou: new Date().toISOString(),
            ultimoPing: new Date().toISOString(),
            userId: clienteLogado ? clienteLogado.id : (barbeiroLogado ? barbeiroLogado.id : 'anonimo')
        };
        
        // Limpar viewers inativos (mais de 30 segundos sem ping)
        var agora = new Date().getTime();
        var viewersLimpos = {};
        var count = 0;
        Object.keys(viewersAtivos).forEach(function(key) {
            var v = viewersAtivos[key];
            var ultimoPing = new Date(v.ultimoPing).getTime();
            if (agora - ultimoPing < 45000) { // 45 segundos
                viewersLimpos[key] = v;
                count++;
            }
        });
        
        await db.collection('lives').doc('live_atual').update({
            viewersAtivos: viewersLimpos,
            viewers: count,
            totalViews: firebase.firestore.FieldValue.increment(1)
        });
        
        // Iniciar ping para manter viewer ativo
        iniciarViewerPing();
        
    } catch (e) { console.error('❌ Erro viewer:', e); }
}

function iniciarViewerPing() {
    if (liveViewerInterval) clearInterval(liveViewerInterval);
    liveViewerInterval = setInterval(async function() {
        if (!liveAtiva || !liveViewerId) {
            clearInterval(liveViewerInterval);
            return;
        }
        try {
            const doc = await db.collection('lives').doc('live_atual').get();
            if (!doc.exists || !doc.data().ativa) {
                removerViewerLive();
                return;
            }
            var viewersAtivos = doc.data().viewersAtivos || {};
            if (viewersAtivos[liveViewerId]) {
                viewersAtivos[liveViewerId].ultimoPing = new Date().toISOString();
                await db.collection('lives').doc('live_atual').update({ viewersAtivos });
            }
        } catch (e) {}
    }, 15000); // Ping a cada 15 segundos
}

async function removerViewerLive() {
    if (liveViewerInterval) { clearInterval(liveViewerInterval); liveViewerInterval = null; }
    if (!liveViewerId) return;
    
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists) return;
        var viewersAtivos = doc.data().viewersAtivos || {};
        delete viewersAtivos[liveViewerId];
        var count = Object.keys(viewersAtivos).length;
        await db.collection('lives').doc('live_atual').update({ viewersAtivos, viewers: count });
        liveViewerId = null;
    } catch (e) {}
}

// ==========================================================
// ===== NOTIFICAÇÕES DE LIVE =====
// ==========================================================
async function notificarClientesLive(titulo) {
    if (!barbeiroLogado) return;
    
    try {
        // Salvar notificação para todos os clientes
        const snap = await db.collection('clientes').where('notificacoesLive', '==', true).get();
        var count = 0;
        
        snap.forEach(async function(doc) {
            var cliente = doc.data();
            await db.collection('notificacoes').add({
                userId: cliente.id,
                tipo: 'live',
                titulo: '🔴 Live ao vivo!',
                mensagem: titulo,
                barbeiroNome: barbeiroLogado.nome,
                lida: false,
                dataCriacao: new Date().toISOString()
            });
            count++;
        });
        
        // Também salvar no localStorage para notificação local
        localStorage.setItem('barbeariaRM_live_ativa', JSON.stringify({
            ativa: true,
            titulo: titulo,
            barbeiro: barbeiroLogado.nome,
            inicio: new Date().toISOString()
        }));
        
        console.log('📢 Notificações enviadas para ' + count + ' clientes');
        
    } catch (e) { console.error('❌ Erro notificações:', e); }
}

async function verificarNotificacoesLive() {
    if (!clienteLogado) return;
    
    try {
        // Verificar notificações não lidas
        const snap = await db.collection('notificacoes')
            .where('userId', '==', clienteLogado.id)
            .where('lida', '==', false)
            .where('tipo', '==', 'live')
            .orderBy('dataCriacao', 'desc')
            .limit(5)
            .get();
        
        if (!snap.empty) {
            var notificacao = snap.docs[0].data();
            mostrarToast('🔴 LIVE: ' + notificacao.mensagem, 'info');
            
            // Marcar como lida
            snap.forEach(async function(doc) {
                await db.collection('notificacoes').doc(doc.id).update({ lida: true });
            });
        }
        
        // Verificar localStorage
        var liveSalva = localStorage.getItem('barbeariaRM_live_ativa');
        if (liveSalva) {
            var dados = JSON.parse(liveSalva);
            if (dados.ativa) {
                var badge = document.getElementById('liveBadgeCliente');
                if (badge) badge.style.display = 'inline-block';
            }
        }
    } catch (e) {}
}

// ==========================================================
// ===== LIVE PROFISSIONAL =====
// ==========================================================
async function iniciarLive() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiros!', 'error'); return; }
    var titulo = document.getElementById('liveTitulo').value.trim() || '🔴 Live da Barbearia RM - ' + barbeiroLogado.nome;
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true });
        liveLocalStream = stream;
        
        var preview = document.getElementById('previewCamera'); if (preview) { preview.srcObject = stream; preview.style.display = 'block'; }
        var videoPrincipal = document.getElementById('liveVideo'); if (videoPrincipal) videoPrincipal.srcObject = stream;
        var videoLocal = document.getElementById('liveVideoLocal'); if (videoLocal) { videoLocal.srcObject = stream; videoLocal.style.display = 'block'; }
        
        await db.collection('lives').doc('live_atual').set({
            id: 'live_atual', barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo, ativa: true, tipo: 'interna', chat: [], viewers: 0, viewersAtivos: {},
            totalViews: 0, likes: 0, convidados: [], aceitandoConvidados: false,
            dataInicio: new Date().toISOString()
        });
        
        liveAtiva = true; liveChatMessages = []; liveLikes = 0; liveLiked = false;
        
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('livePlayer').style.display = 'block';
        document.getElementById('liveStatus').style.display = 'block';
        document.getElementById('liveStatusTitulo').textContent = titulo;
        document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + barbeiroLogado.nome;
        document.getElementById('liveLoginWarning').style.display = 'none';
        document.getElementById('liveChatCard').style.display = 'block';
        document.getElementById('liveConvidadosCard').style.display = 'block';
        
        atualizarChat(); iniciarChatListener(); verificarLiveAtiva();
        document.getElementById('liveViewerCount').textContent = '👥 0';
        document.getElementById('liveStatusViewers').textContent = '👥 0 assistindo';
        
        iniciarGravacaoCompleta();
        iniciarCapturaFrames();
        notificarClientesLive(titulo);
        adicionarViewerLive();
        
        mostrarToast('🔴 Live iniciada! Notificações enviadas.', 'success');
    } catch (error) {
        if (error.name === 'NotAllowedError') mostrarToast('❌ Permissão da câmera negada!', 'error');
        else if (error.name === 'NotFoundError') mostrarToast('❌ Nenhuma câmera encontrada!', 'error');
        else mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

function iniciarCapturaFrames() {
    if (liveCanvasInterval) clearInterval(liveCanvasInterval);
    liveCanvasInterval = setInterval(async function() {
        if (!liveAtiva || !liveLocalStream) return;
        try {
            var video = document.getElementById('liveVideo');
            if (!video || !video.videoWidth) return;
            var canvas = document.createElement('canvas');
            canvas.width = 320; canvas.height = 180;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 320, 180);
            var frameData = canvas.toDataURL('image/jpeg', 0.5);
            await db.collection('lives').doc('live_atual').update({
                ultimoFrame: frameData,
                frameTimestamp: new Date().toISOString()
            });
        } catch (e) {}
    }, 2000);
}

async function carregarLive() {
    var placeholder = document.getElementById('livePlaceholder'), player = document.getElementById('livePlayer'), 
        status = document.getElementById('liveStatus'), warning = document.getElementById('liveLoginWarning'), 
        controls = document.getElementById('liveControls'), chatCard = document.getElementById('liveChatCard'), 
        convidadosCard = document.getElementById('liveConvidadosCard');
    
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            var live = doc.data(); liveAtiva = true;
            
            if (placeholder) placeholder.style.display = 'none';
            if (status) {
                status.style.display = 'block';
                document.getElementById('liveStatusTitulo').textContent = live.titulo;
                document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
                
                // Mostrar estatísticas detalhadas
                var viewersAtivos = live.viewersAtivos || {};
                var count = Object.keys(viewersAtivos).length;
                document.getElementById('liveStatusViewers').textContent = '👥 ' + count + ' assistindo • 👁 ' + (live.totalViews || 0) + ' views • ❤️ ' + (live.likes || 0) + ' likes';
            }
            
            liveChatMessages = live.chat || []; atualizarChat();
            liveLikes = live.likes || 0;
            
            if (barbeiroLogado && barbeiroLogado.id === live.barbeiroId) {
                if (controls) controls.style.display = 'block';
                if (player) player.style.display = 'block';
                if (warning) warning.style.display = 'none';
                if (chatCard) chatCard.style.display = 'block';
                if (convidadosCard) convidadosCard.style.display = 'block';
                document.getElementById('liveTitulo').value = live.titulo;
                document.getElementById('liveViewerCount').textContent = '👥 ' + count + ' • 👁 ' + (live.totalViews || 0);
                if (liveLocalStream) {
                    document.getElementById('liveVideo').srcObject = liveLocalStream;
                    document.getElementById('liveVideoLocal').style.display = 'block';
                }
                carregarConvidadosLista();
            } else if (clienteLogado) {
                if (controls) controls.style.display = 'none';
                if (player) {
                    player.style.display = 'block';
                    if (live.ultimoFrame) {
                        var videoEl = document.getElementById('liveVideo');
                        videoEl.srcObject = null; videoEl.style.display = 'none';
                        var imgEl = document.getElementById('liveFrameImg');
                        if (!imgEl) {
                            imgEl = document.createElement('img');
                            imgEl.id = 'liveFrameImg';
                            imgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
                            videoEl.parentElement.appendChild(imgEl);
                        }
                        imgEl.src = live.ultimoFrame; imgEl.style.display = 'block';
                        setTimeout(function() { if (liveAtiva) carregarLive(); }, 3000);
                    }
                }
                if (warning) warning.style.display = 'none';
                if (chatCard) chatCard.style.display = 'block';
                document.getElementById('liveViewerCount').textContent = '👥 ' + count;
                adicionarViewerLive();
            } else {
                if (player) player.style.display = 'none';
                if (warning) warning.style.display = 'block';
                if (chatCard) chatCard.style.display = 'none';
                if (controls) controls.style.display = 'none';
            }
            iniciarChatListener();
        } else {
            liveAtiva = false;
            removerViewerLive();
            if (placeholder) placeholder.style.display = 'block';
            if (player) player.style.display = 'none';
            if (status) status.style.display = 'none';
            if (warning) warning.style.display = 'none';
            if (barbeiroLogado) { if (controls) controls.style.display = 'block'; } else { if (controls) controls.style.display = 'none'; }
            pararChatListener();
            if (liveCanvasInterval) clearInterval(liveCanvasInterval);
        }
    } catch (e) { liveAtiva = false; if (placeholder) placeholder.style.display = 'block'; if (player) player.style.display = 'none'; }
}

// --- LIKE NA LIVE ---
async function likeLive() {
    if (!liveAtiva) return;
    if (liveLiked) { mostrarToast('❤️ Você já curtiu!', 'info'); return; }
    try {
        await db.collection('lives').doc('live_atual').update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
        liveLiked = true;
        liveLikes++;
        mostrarToast('❤️ Live curtida!', 'success');
    } catch (e) {}
}

// --- COMPARTILHAR LIVE ---
function compartilharLive() {
    if (!liveAtiva) { mostrarToast('❌ Nenhuma live ativa!', 'error'); return; }
    var url = window.location.href.split('?')[0] + '?live=1';
    var texto = '🔴 Estou assistindo uma live na Barbearia RM! Venha conferir!';
    
    if (navigator.share) {
        navigator.share({ title: 'Barbearia RM - Live', text: texto, url: url })
            .catch(function() {});
    } else {
        navigator.clipboard.writeText(url).then(function() {
            mostrarToast('📋 Link copiado! Compartilhe com seus amigos.', 'success');
        });
    }
}

async function encerrarLive() {
    if (!barbeiroLogado) return;
    if (!confirm('Encerrar a live? Os dados serão salvos.')) return;
    if (liveGravacaoCompleta) pararGravacaoCompleta();
    pararTransmissao();
    removerViewerLive();
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
        if (liveCanvasInterval) clearInterval(liveCanvasInterval);
        localStorage.removeItem('barbeariaRM_live_ativa');
        mostrarToast('⏹ Live encerrada! Gravação salva.', 'info');
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

// --- GRAVAÇÃO COMPLETA ---
function iniciarGravacaoCompleta() {
    if (!liveLocalStream) return;
    try {
        liveChunksCompletos = [];
        liveMediaRecorderCompleto = new MediaRecorder(liveLocalStream, { mimeType: 'video/webm;codecs=vp8,opus' });
        liveMediaRecorderCompleto.ondataavailable = function(e) { if (e.data.size > 0) liveChunksCompletos.push(e.data); };
        liveMediaRecorderCompleto.onstop = function() {
            var blob = new Blob(liveChunksCompletos, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            var agora = new Date();
            var nome = '🎬 Live Completa - ' + agora.toLocaleDateString('pt-BR');
            db.collection('posts').doc('live_' + Date.now()).set({
                id: 'live_' + Date.now(), barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
                titulo: nome, preco: 0, video: url, imagem: '', descricao: 'Gravação completa da live',
                likes: 0, comentarios: [], dataCriacao: new Date().toISOString(), tipo: 'live_completa'
            });
            liveTrechosSalvos.push({ id: Date.now(), nome: nome, url: url, blob: blob, data: new Date().toISOString(), tipo: 'completa' });
            atualizarTrechosSalvos();
        };
        liveMediaRecorderCompleto.start(); liveGravacaoCompleta = true;
    } catch (e) {}
}

function pararGravacaoCompleta() { if (liveMediaRecorderCompleto && liveGravacaoCompleta) { liveMediaRecorderCompleto.stop(); liveGravacaoCompleta = false; } }

function cortarTrechoLive() { if (!liveAtiva) { mostrarToast('❌ Não há live!', 'error'); return; } if (liveGravando) { pararGravacaoTrecho(); } else { iniciarGravacaoTrecho(); } }
function iniciarGravacaoTrecho() {
    if (!liveLocalStream) return;
    try {
        liveChunksGravados = [];
        liveMediaRecorder = new MediaRecorder(liveLocalStream, { mimeType: 'video/webm;codecs=vp8,opus' });
        liveMediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) liveChunksGravados.push(e.data); };
        liveMediaRecorder.onstop = function() {
            var blob = new Blob(liveChunksGravados, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            var trecho = { id: Date.now(), nome: '✂️ Trecho ' + new Date().toLocaleTimeString('pt-BR'), url, blob, data: new Date().toISOString(), tipo: 'trecho' };
            liveTrechosSalvos.push(trecho); atualizarTrechosSalvos();
            if (confirm('Trecho salvo! Publicar nos Reels?')) publicarTrechoNosReels(trecho);
            mostrarToast('✅ Trecho salvo!', 'success');
        };
        liveMediaRecorder.start(); liveGravando = true;
        mostrarToast('🔴 Gravando... Clique novamente para parar', 'info');
    } catch (e) { mostrarToast('❌ Erro', 'error'); }
}
function pararGravacaoTrecho() { if (liveMediaRecorder && liveGravando) { liveMediaRecorder.stop(); liveGravando = false; } }

async function publicarTrechoNosReels(trecho) {
    if (!barbeiroLogado) return;
    try {
        var postId = 'reel_' + Date.now();
        await db.collection('posts').doc(postId).set({
            id: postId, barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo: trecho.nome, preco: 0, video: trecho.url, imagem: '',
            descricao: 'Trecho da live! 🔴 #Live #BarbeariaRM', likes: 0, comentarios: [],
            dataCriacao: new Date().toISOString(), tipo: 'reel_live'
        });
        mostrarToast('✅ Publicado nos Reels!', 'success');
        setTimeout(function() { carregarReels(); carregarFeedCliente(); }, 1000);
    } catch (e) { mostrarToast('❌ Erro', 'error'); }
}

function publicarTrechoSalvo(index) { var trecho = liveTrechosSalvos[index]; if (trecho) publicarTrechoNosReels(trecho); }
function atualizarTrechosSalvos() {
    var container = document.getElementById('trechosSalvosContainer'); if (!container) return;
    if (liveTrechosSalvos.length === 0) { container.innerHTML = '<p style="color:#6B7280;font-size:11px;">Nenhum trecho</p>'; return; }
    container.innerHTML = liveTrechosSalvos.map(function(t, i) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:6px;">' +
            '<span style="color:white;font-size:11px;">' + (t.tipo==='completa'?'🎬':'✂️') + ' ' + t.nome + '</span>' +
            '<div style="display:flex;gap:4px;"><button class="btn btn-small btn-primary" onclick="publicarTrechoSalvo(' + i + ')" style="font-size:10px;padding:2px 6px;">📤</button><button class="btn btn-small btn-primary" onclick="baixarTrecho(' + i + ')" style="font-size:10px;padding:2px 6px;">⬇️</button><button class="btn btn-small btn-danger" onclick="excluirTrecho(' + i + ')" style="font-size:10px;padding:2px 6px;">🗑</button></div></div>';
    }).join('');
}
function baixarTrecho(index) { var t = liveTrechosSalvos[index]; if (!t) return; var a = document.createElement('a'); a.href = t.url; a.download = 'trecho_' + t.id + '.webm'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function excluirTrecho(index) { liveTrechosSalvos.splice(index, 1); atualizarTrechosSalvos(); }

// --- SEGUNDA TELA ---
function toggleSegundaTela() { var s = document.getElementById('liveSecondScreen'); if (!s) return; liveSegundaTelaAtiva = !liveSegundaTelaAtiva; s.style.display = liveSegundaTelaAtiva ? 'block' : 'none'; mostrarToast(liveSegundaTelaAtiva ? '📺 Segunda tela ativada' : '📺 Segunda tela ocultada', 'info'); }
function carregarVideoComercial() { document.getElementById('comercialVideoInput').click(); }
function carregarVideoArquivo(event) { var f = event.target.files[0]; if (!f) return; var url = URL.createObjectURL(f); var v = document.getElementById('liveSecondVideo'); v.src = url; v.style.display = 'block'; document.getElementById('liveSecondPlaceholder').style.display = 'none'; document.getElementById('liveSecondScreen').style.display = 'block'; liveSegundaTelaAtiva = true; }
function carregarImagemArquivo(event) { var f = event.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(e) { var c = document.getElementById('liveSecondVideo').parentElement; var old = c.querySelector('img'); if (old) old.remove(); var img = document.createElement('img'); img.src = e.target.result; img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;'; c.appendChild(img); document.getElementById('liveSecondVideo').style.display = 'none'; document.getElementById('liveSecondPlaceholder').style.display = 'none'; document.getElementById('liveSecondScreen').style.display = 'block'; liveSegundaTelaAtiva = true; }; r.readAsDataURL(f); }

// --- CONVIDADOS ---
function solicitarConvidado() { if (!barbeiroLogado) return; db.collection('lives').doc('live_atual').update({ aceitandoConvidados: true }).then(() => mostrarToast('👤 Aguardando...', 'info')); }
async function conectarConvidado() { /* mesma lógica anterior */ }
async function aprovarConvidado() { /* mesma lógica anterior */ }
async function carregarConvidadosLista() { /* mesma lógica anterior */ }

// --- CHAT ---
function iniciarChatListener() { pararChatListener(); liveChatInterval = setInterval(async function() { try { const doc = await db.collection('lives').doc('live_atual').get(); if (doc.exists && doc.data().ativa) { var novas = doc.data().chat || []; if (novas.length !== liveChatMessages.length) { liveChatMessages = novas; atualizarChat(); } var viewersAtivos = doc.data().viewersAtivos || {}; var count = Object.keys(viewersAtivos).length; var el = document.getElementById('liveStatusViewers'); var el2 = document.getElementById('liveViewerCount'); if (el) el.textContent = '👥 ' + count + ' assistindo • 👁 ' + (doc.data().totalViews||0) + ' views • ❤️ ' + (doc.data().likes||0) + ' likes'; if (el2) el2.textContent = '👥 ' + count + ' • 👁 ' + (doc.data().totalViews||0); } } catch (e) {} }, 3000); }
function pararChatListener() { if (liveChatInterval) { clearInterval(liveChatInterval); liveChatInterval = null; } }
async function enviarMensagemLive() {
    var input = document.getElementById('liveChatInput'); if (!input) return;
    var texto = input.value.trim(); if (!texto) return;
    if (!liveAtiva) { mostrarToast('❌ Sem live!', 'error'); return; }
    var autor = '👤 Visitante'; if (clienteLogado) autor = '💇 ' + clienteLogado.nome; if (barbeiroLogado) autor = '✂️ ' + barbeiroLogado.nome;
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) return;
        var chat = doc.data().chat || []; chat.push({ autor, texto, data: new Date().toISOString() });
        if (chat.length > 100) chat = chat.slice(-100);
        await db.collection('lives').doc('live_atual').update({ chat });
        liveChatMessages = chat; atualizarChat(); input.value = '';
    } catch (e) {}
}
function atualizarChat() {
    var c = document.getElementById('liveChatContainer'); if (!c) return;
    if (!liveChatMessages || liveChatMessages.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">💬 Nenhuma mensagem</p>'; return; }
    c.innerHTML = liveChatMessages.map(function(msg) { var hora = new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return '<div class="live-chat-message"><span class="autor">' + (msg.autor||'Anônimo') + '</span> <span style="font-size:10px;color:#6B7280;">' + hora + '</span><div class="texto">' + (msg.texto||'') + '</div></div>'; }).join('');
    c.scrollTop = c.scrollHeight;
}
async function verificarLiveAtiva() { try { const doc = await db.collection('lives').doc('live_atual').get(); var ativa = doc.exists && doc.data().ativa; var b1 = document.getElementById('liveBadgeCliente'), b2 = document.getElementById('liveBadgeBarbeiro'); if (b1) b1.style.display = ativa ? 'inline-block' : 'none'; if (b2) b2.style.display = ativa ? 'inline-block' : 'none'; } catch (e) {} }

// ==========================================================
// ===== DEMAIS FUNÇÕES (FATURAMENTO, FEED, POSTS, ETC) =====
// ===== MANTIDAS IGUAIS AO CÓDIGO ANTERIOR =====
// ==========================================================
// ... (incluir todas as funções de agendamentos, planos, anúncios, feed, posts, perfil, etc.)

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
    if (id === 'homeClienteScreen') { carregarFeedCliente(); carregarAgendaCliente(); verificarLiveAtiva(); verificarNotificacoesLive(); }
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
    if (clienteLogado) verificarNotificacoesLive();
    
    // Verificar se veio de link de live
    if (window.location.search.includes('live=1')) {
        setTimeout(function() { mostrarTela('liveScreen'); }, 1000);
    }
    
    console.log('✅ Sistema pronto!');
});

// Limpar viewer ao fechar a página
window.addEventListener('beforeunload', function() {
    removerViewerLive();
});
