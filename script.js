// ==========================================================
// ===== CONFIGURAÇÃO FIREBASE =====
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
console.log('🔥 Firebase OK');

// ==========================================================
// ===== VARIÁVEIS =====
// ==========================================================
var clienteLogado = null, barbeiroLogado = null;
var imagemBase64 = '', videoBase64 = '', imagemPlanoBase64 = '', anuncioImagemBase64 = '';
var todosPosts = [], todosReels = [], reelsAtual = 0, postSelecionadoId = null;
var horariosTrabalho = { diasTrabalho: ['segunda','terca','quarta','quinta','sexta','sabado'], horarioInicio: '09:00', horarioFim: '18:00', intervaloCortes: 30, folgas: [] };
var liveLocalStream = null, liveChatInterval = null, liveAtiva = false, liveChatMessages = [];
var liveViewerId = null, liveViewerInterval = null, liveLikes = 0, liveLiked = false;
var liveFrameInterval = null, liveFrameCanvas = null, liveFrameCtx = null;
var liveViewersAtivos = {};
var liveUltimoFrameEnviado = 0;
var liveCarregandoLive = false;
var liveAudioMonitor = null;
var liveTelaAtiva = 1;
var liveAnuncioAtivo = false;

// ==========================================================
// ===== SESSÃO CORRIGIDA (NÃO MUDA SOZINHA) =====
// ==========================================================
function salvarSessao(tipo, dados) {
    var sessao = {
        tipo: tipo,
        id: dados.id,
        nome: dados.nome,
        email: dados.email,
        celular: dados.celular || '',
        senha: dados.senha || '',
        fotoPerfil: dados.fotoPerfil || '',
        timestamp: Date.now()
    };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(sessao));
    console.log('💾 Sessão salva:', tipo, dados.nome);
}

function carregarSessao() {
    var s = localStorage.getItem('barbeariaRM_sessao');
    if (!s) return null;
    try {
        var sessao = JSON.parse(s);
        // Expira em 7 dias
        if ((Date.now() - sessao.timestamp) / 86400000 > 7) {
            localStorage.removeItem('barbeariaRM_sessao');
            return null;
        }
        return sessao;
    } catch (e) {
        localStorage.removeItem('barbeariaRM_sessao');
        return null;
    }
}

function limparSessao() {
    localStorage.removeItem('barbeariaRM_sessao');
    console.log('🗑 Sessão removida');
}

async function restaurarSessao() {
    var sessao = carregarSessao();
    if (!sessao) return false;
    
    console.log('🔄 Tentando restaurar sessão:', sessao.tipo, sessao.email);
    
    try {
        if (sessao.tipo === 'cliente') {
            var sn = await db.collection('clientes')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!sn.empty) {
                var d = sn.docs[0];
                clienteLogado = { id: d.id, ...d.data() };
                barbeiroLogado = null; // Garantir que não fique logado como barbeiro
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                mostrarTela('homeClienteScreen');
                console.log('✅ Sessão CLIENTE restaurada:', clienteLogado.nome);
                return true;
            }
        } else if (sessao.tipo === 'barbeiro') {
            var sn = await db.collection('barbeiros')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!sn.empty) {
                var d = sn.docs[0];
                barbeiroLogado = { id: d.id, ...d.data() };
                clienteLogado = null; // Garantir que não fique logado como cliente
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                mostrarTela('homeBarbeiroScreen');
                console.log('✅ Sessão BARBEIRO restaurada:', barbeiroLogado.nome);
                return true;
            }
        }
    } catch (e) {
        console.error('❌ Erro ao restaurar:', e);
    }
    
    // Se não conseguiu restaurar, limpa a sessão inválida
    limparSessao();
    return false;
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================
function mostrarToast(m, t) {
    var x = document.getElementById('toast');
    if (!x) return;
    x.textContent = m;
    x.className = 'toast ' + (t || 'info');
    x.style.display = 'block';
    setTimeout(function() { x.style.display = 'none'; }, 3000);
}

function voltarParaLogin() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
}

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

// ==========================================================
// ===== LOGIN/CADASTRO (CORRIGIDO - LIMPA O OUTRO) =====
// ==========================================================
async function cadastrarCliente() {
    var n = document.getElementById('cadNomeCliente').value.trim();
    var e = document.getElementById('cadEmailCliente').value.trim();
    var c = document.getElementById('cadCelularCliente').value.trim();
    var s = document.getElementById('cadSenhaCliente').value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    try {
        var sn = await db.collection('clientes').where('email', '==', e).get();
        if (!sn.empty) { mostrarToast('❌ Email já existe!', 'error'); return; }
        var id = Date.now().toString();
        var cl = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('clientes').doc(id).set(cl);
        clienteLogado = cl;
        barbeiroLogado = null; // Limpa barbeiro
        salvarSessao('cliente', cl);
        document.getElementById('welcomeClienteNome').textContent = n;
        mostrarToast('✅ OK!', 'success');
        mostrarTela('homeClienteScreen');
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
    } catch (er) { mostrarToast('❌ ' + er.message, 'error'); }
}

async function cadastrarBarbeiro() {
    var n = document.getElementById('cadNomeBarbeiro').value.trim();
    var e = document.getElementById('cadEmailBarbeiro').value.trim();
    var c = document.getElementById('cadCelularBarbeiro').value.trim();
    var s = document.getElementById('cadSenhaBarbeiro').value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    try {
        var sn = await db.collection('barbeiros').where('email', '==', e).get();
        if (!sn.empty) { mostrarToast('❌ Email já existe!', 'error'); return; }
        var id = Date.now().toString();
        var bb = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('barbeiros').doc(id).set(bb);
        barbeiroLogado = bb;
        clienteLogado = null; // Limpa cliente
        salvarSessao('barbeiro', bb);
        document.getElementById('welcomeBarbeiroNome').textContent = n;
        mostrarToast('✅ OK!', 'success');
        mostrarTela('homeBarbeiroScreen');
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
    } catch (er) { mostrarToast('❌ ' + er.message, 'error'); }
}

async function loginCliente() {
    var e = document.getElementById('loginEmailCliente').value.trim();
    var s = document.getElementById('loginSenhaCliente').value;
    if (!e || !s) { mostrarToast('❌ Preencha!', 'error'); return; }
    try {
        var sn = await db.collection('clientes').where('email', '==', e).where('senha', '==', s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        var d = sn.docs[0];
        clienteLogado = { id: d.id, ...d.data() };
        barbeiroLogado = null; // Limpa barbeiro
        salvarSessao('cliente', clienteLogado);
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        mostrarToast('✅ Bem-vindo!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

async function loginBarbeiro() {
    var e = document.getElementById('loginEmailBarbeiro').value.trim();
    var s = document.getElementById('loginSenhaBarbeiro').value;
    if (!e || !s) { mostrarToast('❌ Preencha!', 'error'); return; }
    try {
        var sn = await db.collection('barbeiros').where('email', '==', e).where('senha', '==', s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        var d = sn.docs[0];
        barbeiroLogado = { id: d.id, ...d.data() };
        clienteLogado = null; // Limpa cliente
        salvarSessao('barbeiro', barbeiroLogado);
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        mostrarToast('✅ Bem-vindo!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

function sairCliente() {
    removerViewerLive();
    clienteLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    encerrarLive();
    barbeiroLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== AGENDAMENTOS (COM CONCLUIR SERVIÇO) =====
// ==========================================================
async function carregarAgendamentosBarbeiro() {
    var c = document.getElementById('agendamentosBarbeiroContainer');
    if (!c) return;
    try {
        var sn = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var ag = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ag.length === 0) {
            c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum</p>';
            return;
        }
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'concluido' ? 'concluido' : a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'concluido' ? '✅ Concluído R$' + (a.valor || '0') : a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            var botoes = '';
            if (a.status === 'pendente') {
                botoes = '<button class="btn btn-small btn-success" onclick="confirmarAgendamento(\'' + a.id + '\')">✅</button>' +
                         '<button class="btn btn-small btn-danger" onclick="cancelarAgendamento(\'' + a.id + '\')">❌</button>';
            } else if (a.status === 'confirmado') {
                botoes = '<button class="btn btn-small btn-primary" onclick="concluirServico(\'' + a.id + '\')">💰 Concluir</button>';
            }
            return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 ' + (a.clienteNome || 'Cliente') + '</div><div class="agenda-data">📅 ' + (a.data || 'N/A') + ' • ⏰ ' + (a.horario || 'N/A') + ' - ' + (a.tipo || 'Corte') + '</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="agenda-status ' + sc + '">' + st + '</span>' + botoes + '</div></div>';
        }).join('');
    } catch (e) {}
}

async function confirmarAgendamento(id) {
    await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
    mostrarToast('✅ Confirmado!', 'success');
    carregarAgendamentosBarbeiro();
    if (clienteLogado) carregarAgendaCliente();
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar?')) return;
    await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
    mostrarToast('🗑 Cancelado!', 'success');
    carregarAgendamentosBarbeiro();
    if (clienteLogado) carregarAgendaCliente();
}

// 🆕 CONCLUIR SERVIÇO (PERGUNTA O VALOR)
async function concluirServico(id) {
    var valor = prompt('💰 Digite o valor do serviço (R$):', '35.00');
    if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        mostrarToast('❌ Valor inválido!', 'error');
        return;
    }
    valor = parseFloat(valor).toFixed(2);
    try {
        await db.collection('agendamentos').doc(id).update({
            status: 'concluido',
            valor: parseFloat(valor),
            dataConclusao: new Date().toISOString()
        });
        mostrarToast('✅ Serviço concluído! R$ ' + valor, 'success');
        carregarAgendamentosBarbeiro();
        calcularFaturamento();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function agendarCorte() {
    if (!clienteLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var d = document.getElementById('agendamentoData').value;
    var h = document.getElementById('agendamentoHorario').value;
    var t = document.getElementById('agendamentoTipo').value;
    if (!d) { mostrarToast('❌ Selecione data!', 'error'); return; }
    var id = Date.now().toString();
    await db.collection('agendamentos').doc(id).set({
        id, clienteId: clienteLogado.id, clienteNome: clienteLogado.nome,
        clienteEmail: clienteLogado.email, data: d, horario: h, tipo: t,
        status: 'pendente', valor: 0, dataCriacao: new Date().toISOString()
    });
    mostrarToast('✅ Agendado!', 'success');
    document.getElementById('agendamentoData').value = '';
    carregarAgendaCliente();
    mostrarTela('homeClienteScreen');
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var c = document.getElementById('agendaClienteContainer');
    if (!c) return;
    var sn = await db.collection('agendamentos').where('clienteId', '==', clienteLogado.id).get();
    var ag = sn.docs.map(d => ({ id: d.id, ...d.data() }));
    if (ag.length === 0) { c.innerHTML = '<p style="color:#6B7280;">Nenhum</p>'; return; }
    ag.sort((a, b) => new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario));
    c.innerHTML = ag.map(function(a) {
        var sc = a.status === 'concluido' ? 'concluido' : a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
        var st = a.status === 'concluido' ? '✅ Concluído' : a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
        return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">' + a.tipo + '</div><div class="agenda-data">📅 ' + a.data + ' • ⏰ ' + a.horario + '</div></div><span class="agenda-status ' + sc + '">' + st + '</span></div>';
    }).join('');
}

// ==========================================================
// ===== FATURAMENTO CORRIGIDO (SÓ SERVIÇOS CONCLUÍDOS) =====
// ==========================================================
async function calcularFaturamento() {
    try {
        var sn = await db.collection('agendamentos').where('status', '==', 'concluido').get();
        var ag = sn.docs.map(function(d) { return d.data(); });
        var hoje = new Date().toISOString().split('T')[0];
        var semanaInicio = new Date(); semanaInicio.setDate(semanaInicio.getDate() - 7);
        var mesInicio = new Date(); mesInicio.setMonth(mesInicio.getMonth() - 1);
        var anoInicio = new Date(); anoInicio.setFullYear(anoInicio.getFullYear() - 1);
        
        var valorHoje = 0, valorSemana = 0, valorMes = 0, valorAno = 0;
        
        ag.forEach(function(a) {
            var v = a.valor || 0;
            if (a.data === hoje) valorHoje += v;
            if (a.data >= semanaInicio.toISOString().split('T')[0]) valorSemana += v;
            if (a.data >= mesInicio.toISOString().split('T')[0]) valorMes += v;
            if (a.data >= anoInicio.toISOString().split('T')[0]) valorAno += v;
        });
        
        var eh = document.getElementById('faturamentoHoje');
        var es = document.getElementById('faturamentoSemana');
        var em = document.getElementById('faturamentoMes');
        var ea = document.getElementById('faturamentoAno');
        if (eh) eh.textContent = 'R$ ' + valorHoje.toFixed(2);
        if (es) es.textContent = 'R$ ' + valorSemana.toFixed(2);
        if (em) em.textContent = 'R$ ' + valorMes.toFixed(2);
        if (ea) ea.textContent = 'R$ ' + valorAno.toFixed(2);
        
        console.log('💰 Faturamento calculado:', { hoje: valorHoje, semana: valorSemana, mes: valorMes, ano: valorAno });
    } catch (e) {
        console.error('❌ Erro faturamento:', e);
    }
}

// ==========================================================
// ===== LIVE (FUNCIONANDO PARA CLIENTE) =====
// ==========================================================
async function iniciarLive() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiros!', 'error'); return; }
    var titulo = document.getElementById('liveTitulo').value.trim() || '🔴 Live da Barbearia RM';
    var videoEl = document.getElementById('liveVideo');
    if (!videoEl) { mostrarToast('❌ Erro: elemento de vídeo não encontrado!', 'error'); return; }
    try {
        var stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user', frameRate: { ideal: 25 } },
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
        });
        liveLocalStream = stream;
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.style.display = 'block';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        document.getElementById('liveFrameImg').style.display = 'none';
        var videoLocal = document.getElementById('liveVideoLocal');
        if (videoLocal) { videoLocal.srcObject = stream; videoLocal.style.display = 'block'; videoLocal.muted = true; }
        try {
            if (liveAudioMonitor) liveAudioMonitor.close();
            liveAudioMonitor = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            var source = liveAudioMonitor.createMediaStreamSource(stream);
            var gainNode = liveAudioMonitor.createGain(); gainNode.gain.value = 0.3;
            source.connect(gainNode); gainNode.connect(liveAudioMonitor.destination);
        } catch (e) {}
        await db.collection('lives').doc('live_atual').set({
            id: 'live_atual', barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo, ativa: true, chat: [], viewers: 0, totalViews: 0, likes: 0,
            telaAtiva: 1, dataInicio: new Date().toISOString()
        });
        liveAtiva = true; liveChatMessages = []; liveLikes = 0; liveLiked = false;
        liveViewersAtivos = {}; liveUltimoFrameEnviado = 0; liveTelaAtiva = 1;
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('livePlayer').style.display = 'block';
        document.getElementById('liveStatus').style.display = 'block';
        document.getElementById('liveStatusTitulo').textContent = titulo;
        document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + barbeiroLogado.nome;
        document.getElementById('liveLoginWarning').style.display = 'none';
        document.getElementById('liveViewerCount').textContent = '👥 0';
        document.getElementById('liveStatusViewers').textContent = '👥 0';
        document.getElementById('liveAnuncioOverlay').style.display = 'none';
        document.getElementById('liveTela1').style.display = 'block';
        document.getElementById('liveTela2').style.display = 'none';
        var ind = document.getElementById('liveTelaIndicador');
        if (ind) { ind.textContent = '🎥 CÂMERA'; ind.style.display = barbeiroLogado ? 'block' : 'none'; }
        liveFrameCanvas = document.createElement('canvas');
        liveFrameCanvas.width = 480; liveFrameCanvas.height = 270;
        liveFrameCtx = liveFrameCanvas.getContext('2d');
        iniciarCapturaFrames();
        atualizarChat();
        iniciarChatListener();
        verificarLiveAtiva();
        adicionarViewerLive();
        mostrarToast('🔴 Live iniciada!', 'success');
    } catch (error) {
        if (error.name === 'NotAllowedError') mostrarToast('❌ Permissão da câmera negada!', 'error');
        else if (error.name === 'NotFoundError') mostrarToast('❌ Nenhuma câmera!', 'error');
        else mostrarToast('❌ ' + error.message, 'error');
    }
}

function iniciarCapturaFrames() {
    if (liveFrameInterval) clearInterval(liveFrameInterval);
    liveFrameInterval = setInterval(async function() {
        if (!liveAtiva || !liveLocalStream || !liveFrameCtx) return;
        try {
            var video = document.getElementById('liveVideo');
            if (!video || !video.videoWidth || video.videoWidth === 0) return;
            var agora = Date.now();
            if (agora - liveUltimoFrameEnviado < 250) return;
            liveUltimoFrameEnviado = agora;
            liveFrameCtx.drawImage(video, 0, 0, 480, 270);
            var frameData = liveFrameCanvas.toDataURL('image/jpeg', 0.6);
            // Salvar frame para o cliente ver
            db.collection('lives').doc('live_atual').update({
                ultimoFrame: frameData,
                frameTimestamp: agora
            }).catch(function() {});
        } catch (e) {}
    }, 250);
}

function alternarParaTela1() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiro!', 'error'); return; }
    document.getElementById('liveTela1').style.display = 'block';
    document.getElementById('liveTela2').style.display = 'none';
    liveTelaAtiva = 1;
    mostrarToast('🎥 Câmera ativada', 'info');
}

function alternarParaTela2() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiro!', 'error'); return; }
    document.getElementById('liveTela1').style.display = 'none';
    document.getElementById('liveTela2').style.display = 'block';
    liveTelaAtiva = 2;
    mostrarToast('📺 Comercial ativado', 'info');
}

function carregarVideoComercial(event) {
    var file = event.target.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    var videoEl = document.getElementById('liveVideoComercial');
    if (!videoEl) return;
    videoEl.src = url;
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.style.display = 'block';
    document.getElementById('liveImagemComercial').style.display = 'none';
    document.getElementById('liveTela2Placeholder').style.display = 'none';
    mostrarToast('🎬 Vídeo carregado!', 'success');
}

function carregarImagemComercial(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('liveImagemComercial').src = e.target.result;
        document.getElementById('liveImagemComercial').style.display = 'block';
        document.getElementById('liveVideoComercial').style.display = 'none';
        document.getElementById('liveTela2Placeholder').style.display = 'none';
        mostrarToast('🖼️ Imagem carregada!', 'success');
    };
    reader.readAsDataURL(file);
}

function adicionarLinkComercial() {
    var link = prompt('Cole o link do vídeo (YouTube, URL direta, etc.):');
    if (!link) return;
    document.getElementById('liveImagemComercial').style.display = 'none';
    document.getElementById('liveTela2Placeholder').style.display = 'none';
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
        var videoId = link.split('v=')[1] || link.split('youtu.be/')[1];
        if (videoId) {
            videoId = videoId.split('&')[0];
            link = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&mute=1&loop=1&playlist=' + videoId;
        }
        document.getElementById('liveVideoComercial').style.display = 'none';
        var iframe = document.createElement('iframe');
        iframe.src = link;
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
        iframe.allow = 'autoplay;encrypted-media';
        iframe.allowFullscreen = true;
        var container = document.getElementById('liveTela2');
        var old = container.querySelector('iframe');
        if (old) old.remove();
        container.appendChild(iframe);
    } else {
        document.getElementById('liveVideoComercial').src = link;
        document.getElementById('liveVideoComercial').loop = true;
        document.getElementById('liveVideoComercial').muted = true;
        document.getElementById('liveVideoComercial').style.display = 'block';
        var container = document.getElementById('liveTela2');
        var old = container.querySelector('iframe');
        if (old) old.remove();
    }
    mostrarToast('🔗 Link adicionado!', 'success');
}

function removerVideoComercial() {
    document.getElementById('liveVideoComercial').src = '';
    document.getElementById('liveVideoComercial').style.display = 'none';
    document.getElementById('liveImagemComercial').style.display = 'none';
    document.getElementById('liveTela2Placeholder').style.display = 'flex';
    var container = document.getElementById('liveTela2');
    var old = container.querySelector('iframe');
    if (old) old.remove();
    mostrarToast('🗑 Removido', 'info');
}

function carregarAnuncioLive(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('liveAnuncioImg').src = e.target.result;
        document.getElementById('liveAnuncioOverlay').style.display = 'flex';
        liveAnuncioAtivo = true;
        mostrarToast('📢 Anúncio exibido!', 'success');
        setTimeout(function() { removerAnuncioLive(); }, 10000);
    };
    reader.readAsDataURL(file);
}

function removerAnuncioLive() {
    document.getElementById('liveAnuncioOverlay').style.display = 'none';
    liveAnuncioAtivo = false;
}

function fecharAnuncioLive() {
    removerAnuncioLive();
    mostrarToast('📢 Removido', 'info');
}

// ==========================================================
// ===== VIEWERS =====
// ==========================================================
function gerarViewerId() { return 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }

async function adicionarViewerLive() {
    if (!liveAtiva || liveViewerId) return;
    liveViewerId = gerarViewerId();
    var nome = clienteLogado ? '💇 ' + clienteLogado.nome : (barbeiroLogado ? '✂️ ' + barbeiroLogado.nome : '👤 Visitante');
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) return;
        var va = doc.data().viewersAtivos || {};
        va[liveViewerId] = { nome: nome, entrou: new Date().toISOString(), ultimoPing: Date.now() };
        var agora = Date.now(), vl = {}, count = 0;
        Object.keys(va).forEach(function(k) {
            if (agora - va[k].ultimoPing < 8000) { vl[k] = va[k]; count++; }
        });
        await db.collection('lives').doc('live_atual').update({
            viewersAtivos: vl, viewers: count,
            totalViews: firebase.firestore.FieldValue.increment(1)
        });
        iniciarViewerPing();
    } catch (e) {}
}

function iniciarViewerPing() {
    if (liveViewerInterval) clearInterval(liveViewerInterval);
    liveViewerInterval = setInterval(async function() {
        if (!liveAtiva || !liveViewerId) { clearInterval(liveViewerInterval); return; }
        try {
            var doc = await db.collection('lives').doc('live_atual').get();
            if (!doc.exists || !doc.data().ativa) { removerViewerLive(); return; }
            var va = doc.data().viewersAtivos || {};
            if (va[liveViewerId]) {
                va[liveViewerId].ultimoPing = Date.now();
                await db.collection('lives').doc('live_atual').update({ viewersAtivos: va });
            }
        } catch (e) {}
    }, 4000);
}

async function removerViewerLive() {
    if (liveViewerInterval) { clearInterval(liveViewerInterval); liveViewerInterval = null; }
    if (!liveViewerId) return;
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists) return;
        var va = doc.data().viewersAtivos || {};
        delete va[liveViewerId];
        var count = Object.keys(va).length;
        await db.collection('lives').doc('live_atual').update({ viewersAtivos: va, viewers: count });
        liveViewerId = null;
    } catch (e) {}
}

// ==========================================================
// ===== CARREGAR LIVE (CLIENTE VÊ FRAMES) =====
// ==========================================================
async function carregarLive() {
    if (liveCarregandoLive) return;
    liveCarregandoLive = true;
    var placeholder = document.getElementById('livePlaceholder');
    var player = document.getElementById('livePlayer');
    var status = document.getElementById('liveStatus');
    var warning = document.getElementById('liveLoginWarning');
    var controls = document.getElementById('liveControls');
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            var live = doc.data();
            liveAtiva = true;
            if (placeholder) placeholder.style.display = 'none';
            if (status) {
                status.style.display = 'block';
                document.getElementById('liveStatusTitulo').textContent = live.titulo;
                document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
                var va = live.viewersAtivos || {};
                var count = Object.keys(va).length;
                document.getElementById('liveStatusViewers').textContent = '👥 ' + count + ' • 👁 ' + (live.totalViews || 0) + ' • ❤️ ' + (live.likes || 0);
            }
            liveChatMessages = live.chat || [];
            atualizarChat();
            liveLikes = live.likes || 0;
            var ind = document.getElementById('liveTelaIndicador');
            if (ind) ind.style.display = (barbeiroLogado && barbeiroLogado.id === live.barbeiroId) ? 'block' : 'none';
            if (live.telaAtiva === 2) {
                document.getElementById('liveTela1').style.display = 'none';
                document.getElementById('liveTela2').style.display = 'block';
            } else {
                document.getElementById('liveTela1').style.display = 'block';
                document.getElementById('liveTela2').style.display = 'none';
            }
            if (barbeiroLogado && barbeiroLogado.id === live.barbeiroId) {
                // BARBEIRO - vê stream direto
                if (controls) controls.style.display = 'block';
                if (player) player.style.display = 'block';
                if (warning) warning.style.display = 'none';
                document.getElementById('liveTitulo').value = live.titulo;
                document.getElementById('liveViewerCount').textContent = '👥 ' + count;
                if (liveLocalStream) {
                    document.getElementById('liveVideo').srcObject = liveLocalStream;
                    document.getElementById('liveVideo').style.display = 'block';
                    document.getElementById('liveVideo').muted = true;
                    document.getElementById('liveFrameImg').style.display = 'none';
                    document.getElementById('liveVideoLocal').style.display = 'block';
                }
            } else if (clienteLogado) {
                // CLIENTE - vê frames
                if (controls) controls.style.display = 'none';
                if (player) player.style.display = 'block';
                if (warning) warning.style.display = 'none';
                document.getElementById('liveViewerCount').textContent = '👥 ' + count;
                document.getElementById('liveVideo').style.display = 'none';
                document.getElementById('liveVideoLocal').style.display = 'none';
                // Mostrar frame
                if (live.ultimoFrame) {
                    var imgEl = document.getElementById('liveFrameImg');
                    if (imgEl.src !== live.ultimoFrame) { imgEl.src = live.ultimoFrame; }
                    imgEl.style.display = 'block';
                }
                // Atualizar a cada 500ms
                setTimeout(function() {
                    liveCarregandoLive = false;
                    if (liveAtiva && clienteLogado) carregarLive();
                }, 500);
                adicionarViewerLive();
                liveCarregandoLive = false;
                return;
            } else {
                if (player) player.style.display = 'none';
                if (warning) warning.style.display = 'block';
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
            if (liveFrameInterval) clearInterval(liveFrameInterval);
        }
    } catch (e) { liveAtiva = false; }
    liveCarregandoLive = false;
}

async function encerrarLive() {
    if (!barbeiroLogado) return;
    if (!confirm('Encerrar?')) return;
    if (liveFrameInterval) clearInterval(liveFrameInterval);
    if (liveAudioMonitor) liveAudioMonitor.close();
    removerViewerLive();
    if (liveLocalStream) { liveLocalStream.getTracks().forEach(function(t) { t.stop(); }); liveLocalStream = null; }
    await db.collection('lives').doc('live_atual').update({ ativa: false, dataFim: new Date().toISOString() });
    liveAtiva = false; liveChatMessages = [];
    document.getElementById('livePlaceholder').style.display = 'block';
    document.getElementById('livePlayer').style.display = 'none';
    document.getElementById('liveStatus').style.display = 'none';
    document.getElementById('liveVideo').srcObject = null;
    document.getElementById('liveFrameImg').style.display = 'none';
    document.getElementById('liveLoginWarning').style.display = 'none';
    document.getElementById('liveAnuncioOverlay').style.display = 'none';
    document.getElementById('liveTela1').style.display = 'block';
    document.getElementById('liveTela2').style.display = 'none';
    pararChatListener(); atualizarChat(); verificarLiveAtiva();
    mostrarToast('⏹ Live encerrada!', 'info');
}

function pararTransmissao() {
    if (liveFrameInterval) clearInterval(liveFrameInterval);
    if (liveAudioMonitor) liveAudioMonitor.close();
    if (liveLocalStream) { liveLocalStream.getTracks().forEach(function(t) { t.stop(); }); liveLocalStream = null; }
    document.getElementById('liveVideo').srcObject = null;
    document.getElementById('liveFrameImg').style.display = 'none';
    document.getElementById('liveAnuncioOverlay').style.display = 'none';
}

async function likeLive() {
    if (!liveAtiva || liveLiked) return;
    await db.collection('lives').doc('live_atual').update({ likes: firebase.firestore.FieldValue.increment(1) });
    liveLiked = true; liveLikes++;
    mostrarToast('❤️ Curtido!', 'success');
}

function compartilharLive() {
    if (!liveAtiva) return;
    var url = window.location.href.split('?')[0] + '?live=1';
    if (navigator.share) { navigator.share({ title: 'Barbearia RM', text: '🔴 Live ao vivo!', url: url }); }
    else { navigator.clipboard.writeText(url); mostrarToast('📋 Link copiado!', 'success'); }
}

function iniciarChatListener() {
    pararChatListener();
    liveChatInterval = setInterval(async function() {
        var doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            var novas = doc.data().chat || [];
            if (novas.length !== liveChatMessages.length) { liveChatMessages = novas; atualizarChat(); }
            var va = doc.data().viewersAtivos || {};
            var count = Object.keys(va).length;
            var el = document.getElementById('liveStatusViewers');
            var el2 = document.getElementById('liveViewerCount');
            if (el) el.textContent = '👥 ' + count + ' • 👁 ' + (doc.data().totalViews || 0) + ' • ❤️ ' + (doc.data().likes || 0);
            if (el2) el2.textContent = '👥 ' + count + ' • 👁 ' + (doc.data().totalViews || 0);
        }
    }, 1500);
}

function pararChatListener() { if (liveChatInterval) { clearInterval(liveChatInterval); liveChatInterval = null; } }

async function enviarMensagemLive() {
    var input = document.getElementById('liveChatInput');
    if (!input) return;
    var texto = input.value.trim();
    if (!texto || !liveAtiva) return;
    var autor = '👤 Visitante';
    var fotoPerfil = '';
    if (clienteLogado) { autor = clienteLogado.nome; fotoPerfil = clienteLogado.fotoPerfil || ''; }
    if (barbeiroLogado) { autor = barbeiroLogado.nome; fotoPerfil = barbeiroLogado.fotoPerfil || ''; }
    var doc = await db.collection('lives').doc('live_atual').get();
    if (!doc.exists || !doc.data().ativa) return;
    var chat = doc.data().chat || [];
    chat.push({ autor, texto, fotoPerfil, data: new Date().toISOString() });
    if (chat.length > 100) chat = chat.slice(-100);
    await db.collection('lives').doc('live_atual').update({ chat });
    liveChatMessages = chat; atualizarChat(); input.value = '';
}

function atualizarChat() {
    var c = document.getElementById('liveChatContainer');
    if (!c) return;
    if (!liveChatMessages || liveChatMessages.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">💬 Chat vazio</p>'; return; }
    c.innerHTML = liveChatMessages.map(function(msg) {
        var h = new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var avatar = msg.fotoPerfil ? '<img src="' + msg.fotoPerfil + '" style="width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;">' : '<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#D4A84B;text-align:center;line-height:24px;font-size:12px;margin-right:6px;color:#1A1A1A;">👤</span>';
        return '<div class="live-chat-message" style="display:flex;align-items:flex-start;">' + avatar + '<div><span class="autor" style="color:#D4A84B;font-weight:700;font-size:12px;">' + msg.autor + '</span> <span style="font-size:10px;color:#6B7280;">' + h + '</span><div class="texto" style="color:#B0B0B0;">' + msg.texto + '</div></div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

async function verificarLiveAtiva() {
    var doc = await db.collection('lives').doc('live_atual').get();
    var ativa = doc.exists && doc.data().ativa;
    var b1 = document.getElementById('liveBadgeCliente');
    var b2 = document.getElementById('liveBadgeBarbeiro');
    if (b1) b1.style.display = ativa ? 'inline-block' : 'none';
    if (b2) b2.style.display = ativa ? 'inline-block' : 'none';
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    var tc = ['homeClienteScreen', 'agendamentoScreen', 'galeriaCortesScreen', 'reelsScreen', 'anunciosScreen', 'liveScreen', 'perfilClienteScreen', 'detalhePostScreen', 'pagamentoScreen'];
    var tb = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'criarPlanoScreen', 'editarPlanoScreen', 'horariosTrabalhoScreen', 'anunciosScreen', 'liveScreen', 'perfilBarbeiroScreen'];
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
    console.log('🚀 Barbearia RM');
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    restaurarSessao().then(function(r) {
        if (!r) document.getElementById('loginScreen').classList.add('active');
    });
    verificarLiveAtiva();
    if (window.location.search.includes('live=1')) {
        setTimeout(function() { mostrarTela('liveScreen'); }, 1000);
    }
    console.log('✅ Pronto!');
});
window.addEventListener('beforeunload', function() { removerViewerLive(); });
