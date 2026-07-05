/* ==========================================================
   BARBEARIA RM - SCRIPT PRINCIPAL CORRIGIDO
   ========================================================== */

// ==========================================================
// FIREBASE
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
db.settings({ ignoreUndefinedProperties: true, merge: true });
console.log('🔥 Firebase conectado');

// ==========================================================
// VARIÁVEIS GLOBAIS
// ==========================================================
let clienteLogado = null;
let barbeiroLogado = null;
let postSelecionadoId = null;

// ==========================================================
// VARIÁVEIS DA LIVE
// ==========================================================
let liveStream = null;
let liveAtiva = false;
let gravandoTrecho = false;
let mediaRecorder = null;
let recordedChunks = [];
let trechosGravados = [];
let efeitoLiveAtual = 'none';
let telaLiveAtual = 'camera';
let liveTimerInterval = null;
let liveDuracao = 0;
let liveFacingMode = 'user';

// ==========================================================
// NAVEGAÇÃO
// ==========================================================
function mostrarTela(nomeTela) {
    console.log('📱 Navegando para:', nomeTela);
    
    // Remove active de TODAS as telas
    document.querySelectorAll('.screen').forEach(t => t.classList.remove('active'));
    
    let idTela = nomeTela === 'login' ? 'loginScreen' : nomeTela + 'Screen';
    const tela = document.getElementById(idTela);
    if (tela) tela.classList.add('active');
    
    atualizarBottomNav(nomeTela);
    carregarDadosTela(nomeTela);
    window.scrollTo(0, 0);
}

function atualizarBottomNav(nomeTela) {
    const nc = document.getElementById('bottomNavCliente');
    const nb = document.getElementById('bottomNavBarbeiro');
    if (nc) nc.style.display = 'none';
    if (nb) nb.style.display = 'none';
    
    const telasC = ['homeCliente','agendamento','galeriaCortes','reels','anuncios','live','perfilCliente'];
    const telasB = ['homeBarbeiro','criarPost','extrato','criarPlano','horariosTrabalho','perfilBarbeiro'];
    
    if (telasC.includes(nomeTela) && clienteLogado) { if (nc) nc.style.display = 'flex'; }
    else if (telasB.includes(nomeTela) && barbeiroLogado) { if (nb) nb.style.display = 'flex'; }
}

function carregarDadosTela(nomeTela) {
    switch(nomeTela) {
        case 'homeCliente': carregarFeedCliente(); carregarAgendaCliente(); break;
        case 'homeBarbeiro': carregarAgendamentosBarbeiro(); carregarPlanos(); calcularFaturamento(); carregarMeusPosts(); break;
        case 'agendamento': carregarOpcoesAgendamento(); break;
        case 'anuncios': carregarAnuncios(); break;
        case 'live': break;
        case 'perfilCliente': carregarPerfilCliente(); break;
        case 'perfilBarbeiro': carregarPerfilBarbeiro(); break;
    }
}

// ==========================================================
// TOAST
// ==========================================================
function mostrarToast(msg, tipo) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + (tipo || 'info');
    t.style.display = 'block';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(function(){ t.style.display = 'none'; }, 3000);
}

// ==========================================================
// LOGIN - FORMULÁRIOS
// ==========================================================
function mostrarFormularioLogin(tipo) {
    var fc = document.getElementById('loginFormCliente');
    var fb = document.getElementById('loginFormBarbeiro');
    if (fc) fc.classList.remove('show');
    if (fb) fb.classList.remove('show');
    if (tipo === 'cliente' && fc) fc.classList.add('show');
    if (tipo === 'barbeiro' && fb) fb.classList.add('show');
}

function fecharFormulariosLogin() {
    var fc = document.getElementById('loginFormCliente');
    var fb = document.getElementById('loginFormBarbeiro');
    if (fc) fc.classList.remove('show');
    if (fb) fb.classList.remove('show');
}

// ==========================================================
// SESSÃO
// ==========================================================
function salvarSessao(tipo, dados) {
    var s = { 
        tipo: tipo, 
        id: dados.id, 
        nome: dados.nome, 
        email: dados.email, 
        celular: dados.celular || '', 
        senha: dados.senha || '', 
        fotoPerfil: dados.fotoPerfil || '', 
        timestamp: Date.now() 
    };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(s));
    console.log('💾 Sessão salva:', tipo, dados.nome);
}

function carregarSessao() {
    var d = localStorage.getItem('barbeariaRM_sessao');
    if (!d) return null;
    try {
        var s = JSON.parse(d);
        // Verificar expiração (30 dias)
        if ((Date.now() - s.timestamp) / 86400000 > 30) {
            limparSessao();
            return null;
        }
        return s;
    } catch(e) {
        limparSessao();
        return null;
    }
}

function limparSessao() {
    localStorage.removeItem('barbeariaRM_sessao');
    console.log('🗑 Sessão removida');
}

async function restaurarSessao() {
    var s = carregarSessao();
    if (!s) {
        console.log('👋 Nenhuma sessão encontrada');
        return false;
    }
    
    console.log('🔍 Tentando restaurar sessão:', s.tipo, s.email);
    
    try {
        if (s.tipo === 'cliente') {
            var sn = await db.collection('clientes')
                .where('email', '==', s.email)
                .where('senha', '==', s.senha)
                .get();
            
            if (!sn.empty) {
                var d = sn.docs[0];
                clienteLogado = { id: d.id, ...d.data() };
                console.log('✅ Sessão restaurada: Cliente', clienteLogado.nome);
                return true;
            }
        } else {
            var sn = await db.collection('barbeiros')
                .where('email', '==', s.email)
                .where('senha', '==', s.senha)
                .get();
            
            if (!sn.empty) {
                var d = sn.docs[0];
                barbeiroLogado = { id: d.id, ...d.data() };
                console.log('✅ Sessão restaurada: Barbeiro', barbeiroLogado.nome);
                return true;
            }
        }
        
        console.log('❌ Sessão inválida - dados não encontrados no banco');
        limparSessao();
    } catch(e) {
        console.error('Erro ao restaurar sessão:', e);
    }
    
    limparSessao();
    return false;
}

// ==========================================================
// LOGIN / CADASTRO
// ==========================================================
async function loginCliente() {
    var e = document.getElementById('loginEmailCliente').value.trim();
    var s = document.getElementById('loginSenhaCliente').value;
    if (!e || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    try {
        var sn = await db.collection('clientes').where('email','==',e).where('senha','==',s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        var d = sn.docs[0]; clienteLogado = { id: d.id, ...d.data() };
        salvarSessao('cliente', clienteLogado);
        document.getElementById('loginEmailCliente').value = ''; 
        document.getElementById('loginSenhaCliente').value = '';
        fecharFormulariosLogin();
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeCliente');
    } catch(er) { mostrarToast('❌ Erro!', 'error'); }
}

async function loginBarbeiro() {
    var e = document.getElementById('loginEmailBarbeiro').value.trim();
    var s = document.getElementById('loginSenhaBarbeiro').value;
    if (!e || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    try {
        var sn = await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        var d = sn.docs[0]; barbeiroLogado = { id: d.id, ...d.data() };
        salvarSessao('barbeiro', barbeiroLogado);
        document.getElementById('loginEmailBarbeiro').value = ''; 
        document.getElementById('loginSenhaBarbeiro').value = '';
        fecharFormulariosLogin();
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiro');
    } catch(er) { mostrarToast('❌ Erro!', 'error'); }
}

async function cadastrarCliente() {
    var n = document.getElementById('cadNomeCliente').value.trim();
    var e = document.getElementById('cadEmailCliente').value.trim();
    var c = document.getElementById('cadCelularCliente').value.trim();
    var s = document.getElementById('cadSenhaCliente').value;
    if (!n||!e||!c||!s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    try {
        var sn = await db.collection('clientes').where('email','==',e).get();
        if (!sn.empty) { mostrarToast('❌ Email existe!', 'error'); return; }
        var id = Date.now().toString();
        var cl = { id, nome:n, email:e, celular:c, senha:s, fotoPerfil:'', dataCriacao: new Date().toISOString() };
        await db.collection('clientes').doc(id).set(cl);
        clienteLogado = cl; salvarSessao('cliente', cl);
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
        mostrarToast('✅ Cadastro OK!', 'success');
        mostrarTela('homeCliente');
    } catch(er) { mostrarToast('❌ Erro!', 'error'); }
}

async function cadastrarBarbeiro() {
    var n = document.getElementById('cadNomeBarbeiro').value.trim();
    var e = document.getElementById('cadEmailBarbeiro').value.trim();
    var c = document.getElementById('cadCelularBarbeiro').value.trim();
    var s = document.getElementById('cadSenhaBarbeiro').value;
    if (!n||!e||!c||!s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    try {
        var sn = await db.collection('barbeiros').where('email','==',e).get();
        if (!sn.empty) { mostrarToast('❌ Email existe!', 'error'); return; }
        var id = Date.now().toString();
        var bb = { id, nome:n, email:e, celular:c, senha:s, fotoPerfil:'', dataCriacao: new Date().toISOString() };
        await db.collection('barbeiros').doc(id).set(bb);
        barbeiroLogado = bb; salvarSessao('barbeiro', bb);
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
        mostrarToast('✅ Cadastro OK!', 'success');
        mostrarTela('homeBarbeiro');
    } catch(er) { mostrarToast('❌ Erro!', 'error'); }
}

function sairCliente() {
    if (!confirm('Tem certeza que deseja sair?')) return;
    clienteLogado = null;
    limparSessao();
    fecharFormulariosLogin();
    mostrarTela('login');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    if (!confirm('Tem certeza que deseja sair?')) return;
    barbeiroLogado = null;
    limparSessao();
    fecharFormulariosLogin();
    mostrarTela('login');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// FEED / POSTS
// ==========================================================
async function carregarFeedCliente() {
    var c = document.getElementById('feedClienteContainer'); if (!c) return;
    try {
        var sn = await db.collection('posts').orderBy('dataCriacao','desc').get();
        var posts = sn.docs.map(function(d){ return { id: d.id, ...d.data() }; });
        if (posts.length === 0) {
            c.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post</h3></div>';
            return;
        }
        c.innerHTML = posts.map(function(post){
            var com = post.comentarios || [];
            return '<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+(post.barbeiroNome||'Barbearia RM')+'</div><div class="feed-post-user-time">'+new Date(post.dataCriacao).toLocaleDateString('pt-BR')+'</div></div></div>'+(post.imagem?'<img src="'+post.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><div class="feed-post-title">'+post.titulo+'</div><div class="feed-post-price">R$ '+(post.preco||0).toFixed(2)+'</div></div><div class="feed-post-actions"><button>❤️ '+(post.likes||0)+'</button><button class="btn-comentar-post" data-id="'+post.id+'">💬 '+com.length+'</button></div></div>';
        }).join('');
        // Event listeners para comentários
        document.querySelectorAll('.btn-comentar-post').forEach(function(btn){
            btn.addEventListener('click', function(){ abrirComentarios(this.dataset.id); });
        });
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>'; }
}

async function carregarMeusPosts() {
    var c = document.getElementById('meusPostsContainer'); if (!c || !barbeiroLogado) return;
    try {
        var sn = await db.collection('posts').where('barbeiroId','==',barbeiroLogado.id).get();
        var posts = []; sn.forEach(function(d){ posts.push({ id: d.id, ...d.data() }); });
        posts.sort(function(a,b){ return new Date(b.dataCriacao)-new Date(a.dataCriacao); });
        if (posts.length===0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum post</p>'; return; }
        c.innerHTML = posts.map(function(post){
            return '<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+post.titulo+'</div><div class="feed-post-user-time">R$ '+(post.preco||0).toFixed(2)+'</div></div></div>'+(post.imagem?'<img src="'+post.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><p>'+(post.descricao||'')+'</p></div><button class="btn btn-small btn-danger btn-excluir-post" data-id="'+post.id+'">🗑</button></div>';
        }).join('');
        document.querySelectorAll('.btn-excluir-post').forEach(function(btn){
            btn.addEventListener('click', function(){ excluirMeuPost(this.dataset.id); });
        });
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro</p>'; }
}

async function excluirMeuPost(id) {
    if (!confirm('Excluir este post?')) return;
    await db.collection('posts').doc(id).delete();
    mostrarToast('🗑 Excluído!', 'success');
    carregarMeusPosts();
    carregarFeedCliente();
}

// ==========================================================
// COMENTÁRIOS
// ==========================================================
function abrirComentarios(id) {
    postSelecionadoId = id;
    carregarComentarios(id);
    document.getElementById('modalComentario').classList.add('active');
}

async function carregarComentarios(id) {
    var c = document.getElementById('comentariosContainer'); if (!c) return;
    var doc = await db.collection('posts').doc(id).get(); if (!doc.exists) return;
    var com = doc.data().comentarios || [];
    c.innerHTML = com.length===0 ? '<p style="color:#6B7280;">Nenhum comentário</p>' : com.map(function(x){
        return '<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">'+x.autor+'</strong><p style="color:#B0B0B0;">'+x.texto+'</p></div>';
    }).join('');
}

async function adicionarComentario() {
    var t = document.getElementById('novoComentario').value.trim(); if (!t) return;
    var autor = clienteLogado ? clienteLogado.nome : (barbeiroLogado ? barbeiroLogado.nome : 'Anônimo');
    var doc = await db.collection('posts').doc(postSelecionadoId).get();
    var com = doc.data().comentarios || [];
    com.push({ autor, texto: t, data: new Date().toISOString() });
    await db.collection('posts').doc(postSelecionadoId).update({ comentarios: com });
    document.getElementById('novoComentario').value = '';
    carregarComentarios(postSelecionadoId);
}

function fecharModalComentario() {
    document.getElementById('modalComentario').classList.remove('active');
}

// ==========================================================
// AGENDAMENTOS
// ==========================================================
function carregarOpcoesAgendamento() {
    var sh = document.getElementById('agendamentoHorario');
    var st = document.getElementById('agendamentoTipo');
    if (sh) {
        var hor = [];
        for (var h=9; h<=18; h++) {
            for (var m=0; m<60; m+=30) {
                if (h===18 && m>0) break;
                hor.push(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'));
            }
        }
        sh.innerHTML = hor.map(function(x){ return '<option value="'+x+'">'+x+'</option>'; }).join('');
    }
    if (st) {
        var tipos = ['Corte Social','Corte Degradê','Corte Navalhado','Corte Máquina','Barba','Barba + Corte'];
        st.innerHTML = tipos.map(function(x){ return '<option value="'+x+'">'+x+'</option>'; }).join('');
    }
    var id = document.getElementById('agendamentoData');
    if (id) id.min = new Date().toISOString().split('T')[0];
}

async function agendarCorte() {
    if (!clienteLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var d = document.getElementById('agendamentoData').value;
    var h = document.getElementById('agendamentoHorario').value;
    var t = document.getElementById('agendamentoTipo').value;
    if (!d) { mostrarToast('❌ Selecione data!', 'error'); return; }
    try {
        var id = Date.now().toString();
        await db.collection('agendamentos').doc(id).set({
            id, clienteId: clienteLogado.id, clienteNome: clienteLogado.nome,
            data: d, horario: h, tipo: t, status: 'pendente',
            dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Agendado!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeCliente');
    } catch(e) { mostrarToast('❌ Erro!', 'error'); }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var c = document.getElementById('agendaClienteContainer'); if (!c) return;
    try {
        var sn = await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).get();
        var ag = sn.docs.map(function(d){ return { id: d.id, ...d.data() }; });
        ag.sort(function(a,b){ return new Date(b.data)-new Date(a.data); });
        if (ag.length===0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum</p>'; return; }
        c.innerHTML = ag.map(function(a){
            return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">'+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+(a.status==='confirmado'?'✅':'⏳')+' '+a.status+'</span></div>';
        }).join('');
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro</p>'; }
}

async function carregarAgendamentosBarbeiro() {
    var c = document.getElementById('agendamentosBarbeiroContainer'); if (!c) return;
    try {
        var sn = await db.collection('agendamentos').orderBy('data','desc').get();
        var ag = sn.docs.map(function(d){ return { id: d.id, ...d.data() }; });
        if (ag.length===0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum</p>'; return; }
        c.innerHTML = ag.map(function(a){
            return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 '+(a.clienteNome||'Cliente')+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+' • ✂️ '+a.tipo+'</div></div><span class="agenda-status '+a.status+'">'+a.status+'</span></div>';
        }).join('');
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro</p>'; }
}

// ==========================================================
// PLANOS
// ==========================================================
async function carregarPlanos() {
    var c = document.getElementById('planosContainer'); if (!c) return;
    try {
        var sn = await db.collection('planos').orderBy('dataCriacao','desc').get();
        var p = sn.docs.map(function(d){ return { id: d.id, ...d.data() }; });
        if (p.length===0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum</p>'; return; }
        c.innerHTML = p.map(function(x){
            return '<div class="plano-card"><div class="plano-info"><div class="plano-nome">'+x.nome+'</div><div class="plano-periodo">📅 '+x.periodo+'</div></div><div class="plano-preco">R$ '+(x.preco||0).toFixed(2)+'</div></div>';
        }).join('');
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro</p>'; }
}

// ==========================================================
// ANÚNCIOS
// ==========================================================
async function carregarAnuncios() {
    var c = document.getElementById('anunciosContainer'); if (!c) return;
    try {
        var hoje = new Date().toISOString();
        var sn = await db.collection('anuncios').where('dataExpiracao','>',hoje).get();
        var a = sn.docs.map(function(d){ return { id: d.id, ...d.data() }; });
        if (a.length===0) { c.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:#6B7280;">📢 Nenhum anúncio</p></div>'; return; }
        c.innerHTML = a.map(function(x){
            return '<div class="card" style="border:2px solid #FF6B6B;margin-bottom:12px;"><span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢 ANÚNCIO</span>'+(x.imagem?'<img src="'+x.imagem+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;">':'')+'<h3 style="color:#FF6B6B;">'+x.titulo+'</h3><p style="color:#B0B0B0;">'+x.descricao+'</p>'+(x.link?'<a href="'+x.link+'" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#FF4757;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>':'')+'</div>';
        }).join('');
    } catch(e) { c.innerHTML = '<p style="color:#6B7280;">Erro</p>'; }
}

// ==========================================================
// PERFIL
// ==========================================================
function carregarPerfilCliente() {
    if (!clienteLogado) return;
    document.getElementById('perfilClienteNome').textContent = clienteLogado.nome;
    document.getElementById('perfilClienteEmail').textContent = clienteLogado.email;
    document.getElementById('editClienteNome').value = clienteLogado.nome || '';
    document.getElementById('editClienteCelular').value = clienteLogado.celular || '';
}

async function salvarPerfilCliente() {
    if (!clienteLogado) return;
    var n = document.getElementById('editClienteNome').value.trim();
    var c = document.getElementById('editClienteCelular').value.trim();
    await db.collection('clientes').doc(clienteLogado.id).update({ nome: n, celular: c });
    clienteLogado.nome = n; clienteLogado.celular = c;
    salvarSessao('cliente', clienteLogado);
    mostrarToast('✅ Salvo!', 'success');
}

function carregarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    document.getElementById('perfilBarbeiroNome').textContent = barbeiroLogado.nome;
    document.getElementById('perfilBarbeiroEmail').textContent = barbeiroLogado.email;
    document.getElementById('editBarbeiroNome').value = barbeiroLogado.nome || '';
    document.getElementById('editBarbeiroCelular').value = barbeiroLogado.celular || '';
    document.getElementById('editBarbeiroEmail').value = barbeiroLogado.email || '';
}

async function salvarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    var n = document.getElementById('editBarbeiroNome').value.trim();
    var c = document.getElementById('editBarbeiroCelular').value.trim();
    var e = document.getElementById('editBarbeiroEmail').value.trim();
    await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome: n, celular: c, email: e });
    barbeiroLogado.nome = n; barbeiroLogado.celular = c; barbeiroLogado.email = e;
    salvarSessao('barbeiro', barbeiroLogado);
    mostrarToast('✅ Salvo!', 'success');
}

// ==========================================================
// FINANCEIRO
// ==========================================================
async function calcularFaturamento() {
    try {
        var sn = await db.collection('agendamentos').where('status','==','confirmado').get();
        var ag = sn.docs.map(function(d){ return d.data(); });
        var hoje = new Date().toISOString().split('T')[0];
        var th = 0, tg = 0;
        ag.forEach(function(a){ var v = 35; if(a.data===hoje) th+=v; tg+=v; });
        document.getElementById('faturamentoHoje').textContent = 'R$ '+th.toFixed(2);
        document.getElementById('faturamentoSemana').textContent = 'R$ '+(tg*0.3).toFixed(2);
        document.getElementById('faturamentoMes').textContent = 'R$ '+(tg*0.7).toFixed(2);
        document.getElementById('faturamentoAno').textContent = 'R$ '+tg.toFixed(2);
    } catch(e) {}
}

// ==========================================================
// LIVE - VERIFICAÇÃO DE BADGE
// ==========================================================
async function verificarLiveBadge() {
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        var ativa = doc.exists && doc.data().ativa;
        var bc = document.getElementById('liveBadgeCliente');
        var bb = document.getElementById('liveBadgeBarbeiro');
        if (bc) bc.style.display = ativa ? 'inline-block' : 'none';
        if (bb) bb.style.display = ativa ? 'inline-block' : 'none';
    } catch(e) {
        console.log('⚠️ Erro ao verificar live badge');
    }
}

// ==========================================================
// LIVE - FUNÇÕES DO ESTÚDIO
// ==========================================================
async function iniciarLive() {
    console.log('🎥 Tentando iniciar live...');
    
    try {
        // Verificar se o navegador suporta
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarToast('❌ Seu navegador não suporta câmera', 'error');
            return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 }, 
                facingMode: liveFacingMode 
            },
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true 
            }
        });
        
        liveStream = stream;
        liveAtiva = true;
        
        const videoEl = document.getElementById('liveVideo');
        if (!videoEl) {
            mostrarToast('❌ Erro: elemento de vídeo não encontrado', 'error');
            return;
        }
        
        videoEl.srcObject = stream;
        videoEl.muted = true;
        
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('liveControlsCard').style.display = 'block';
        document.getElementById('clipsCard').style.display = 'block';
        document.getElementById('liveStatus').style.display = 'block';
        
        // Iniciar timer
        liveDuracao = 0;
        if (liveTimerInterval) clearInterval(liveTimerInterval);
        liveTimerInterval = setInterval(function(){
            liveDuracao++;
            var h = Math.floor(liveDuracao / 3600);
            var m = Math.floor((liveDuracao % 3600) / 60);
            var s = liveDuracao % 60;
            var el = document.getElementById('liveDuration');
            if (el) el.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }, 1000);
        
        // Salvar no Firebase
        try {
            await db.collection('lives').doc('live_atual').set({
                id: 'live_atual',
                titulo: 'Live Barbearia RM',
                barbeiroNome: barbeiroLogado ? barbeiroLogado.nome : 'Barbearia RM',
                ativa: true,
                chat: [],
                viewers: 0,
                likes: 0,
                dataInicio: new Date().toISOString()
            });
        } catch(fbError) {
            console.log('⚠️ Não foi possível salvar no Firebase, mas live continua');
        }
        
        mostrarToast('🔴 Live iniciada com sucesso!', 'success');
        console.log('✅ Live iniciada');
        
    } catch (erro) {
        console.error('❌ Erro ao iniciar live:', erro);
        if (erro.name === 'NotAllowedError') {
            mostrarToast('❌ Permissão de câmera negada!', 'error');
        } else if (erro.name === 'NotFoundError') {
            mostrarToast('❌ Nenhuma câmera encontrada!', 'error');
        } else if (erro.name === 'NotReadableError') {
            mostrarToast('❌ Câmera já está em uso!', 'error');
        } else {
            mostrarToast('❌ Erro: ' + erro.message, 'error');
        }
    }
}

function pararLive() {
    if (gravandoTrecho) pararGravacaoTrecho();
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }
    if (liveStream) {
        liveStream.getTracks().forEach(function(t){ t.stop(); });
        liveStream = null;
    }
    liveAtiva = false;
    
    var videoEl = document.getElementById('liveVideo');
    if (videoEl) videoEl.srcObject = null;
    
    var placeholder = document.getElementById('livePlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    
    var controls = document.getElementById('liveControlsCard');
    if (controls) controls.style.display = 'none';
    
    var clips = document.getElementById('clipsCard');
    if (clips) clips.style.display = 'none';
    
    var status = document.getElementById('liveStatus');
    if (status) status.style.display = 'none';
    
    var duration = document.getElementById('liveDuration');
    if (duration) duration.textContent = '00:00:00';
    
    // Esconder overlays
    var overlayCom = document.getElementById('overlayComercial');
    var overlayAd = document.getElementById('overlayAnuncio');
    if (overlayCom) overlayCom.style.display = 'none';
    if (overlayAd) overlayAd.style.display = 'none';
}

function iniciarGravacaoTrecho() {
    if (!liveStream || gravandoTrecho) {
        mostrarToast('❌ Live não está ativa!', 'error');
        return;
    }
    
    try {
        var options = {};
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            options.mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            options.mimeType = 'video/webm';
        }
        
        mediaRecorder = new MediaRecorder(liveStream, options);
    } catch(e) {
        mediaRecorder = new MediaRecorder(liveStream);
    }
    
    recordedChunks = [];
    
    mediaRecorder.ondataavailable = function(e){
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.onstop = function(){
        var blob = new Blob(recordedChunks, { type: 'video/webm' });
        var url = URL.createObjectURL(blob);
        trechosGravados.push({ id: Date.now(), url: url, blob: blob, efeito: efeitoLiveAtual });
        atualizarTimelineLive();
        var countEl = document.getElementById('clipCountLive');
        if (countEl) countEl.textContent = trechosGravados.length;
        mostrarToast('✅ Trecho salvo!', 'success');
    };
    
    mediaRecorder.start(1000);
    gravandoTrecho = true;
    
    var btnRec = document.getElementById('btnRecordClip');
    var btnStop = document.getElementById('btnStopClip');
    if (btnRec) btnRec.style.display = 'none';
    if (btnStop) btnStop.style.display = 'inline-block';
    
    mostrarToast('⏺️ Gravando trecho...', 'info');
}

function pararGravacaoTrecho() {
    if (!gravandoTrecho || !mediaRecorder) return;
    
    mediaRecorder.stop();
    gravandoTrecho = false;
    
    var btnRec = document.getElementById('btnRecordClip');
    var btnStop = document.getElementById('btnStopClip');
    if (btnRec) btnRec.style.display = 'inline-block';
    if (btnStop) btnStop.style.display = 'none';
}

function atualizarTimelineLive() {
    var tl = document.getElementById('clipsTimelineLive');
    if (!tl) return;
    
    if (trechosGravados.length === 0) {
        tl.innerHTML = '<span style="color:#aaa;font-size:11px;">Nenhum trecho</span>';
        return;
    }
    
    tl.innerHTML = trechosGravados.map(function(c, i){
        return '<span style="background:rgba(255,255,255,.05);padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;margin-right:4px;white-space:nowrap;" onclick="window.open(\''+c.url+'\',\'_blank\')">🎬 Clip '+(i+1)+'</span>';
    }).join('');
}

function salvarTrechosLive() {
    if (trechosGravados.length === 0) {
        mostrarToast('❌ Nenhum trecho para salvar', 'error');
        return;
    }
    
    trechosGravados.forEach(function(c, i){
        var a = document.createElement('a');
        a.href = c.url;
        a.download = 'barbearia-rm-clip-'+(i+1)+'.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    mostrarToast('💾 ' + trechosGravados.length + ' trechos baixados!', 'success');
}

async function trocarCameraLive() {
    liveFacingMode = liveFacingMode === 'user' ? 'environment' : 'user';
    
    if (liveStream) {
        liveStream.getTracks().forEach(function(t){ t.stop(); });
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: liveFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
        });
        liveStream = stream;
        var videoEl = document.getElementById('liveVideo');
        if (videoEl) videoEl.srcObject = stream;
        mostrarToast('🔄 Câmera: ' + (liveFacingMode === 'user' ? 'Frontal' : 'Traseira'), 'info');
    } catch(e) {
        mostrarToast('❌ Erro ao trocar câmera', 'error');
    }
}

function aplicarEfeitoLive(efeito) {
    var video = document.getElementById('liveVideo');
    if (!video) return;
    
    video.style.filter = '';
    efeitoLiveAtual = efeito;
    
    if (efeito === 'bw') video.style.filter = 'grayscale(100%)';
    else if (efeito === 'sepia') video.style.filter = 'sepia(80%)';
    else if (efeito === 'neon') video.style.filter = 'brightness(1.2) contrast(1.3) saturate(1.5)';
    else if (efeito === 'warm') video.style.filter = 'sepia(20%) saturate(1.3)';
    
    mostrarToast('✨ Efeito: ' + efeito, 'info');
}

function mostrarTelaLive(tipo) {
    var overlayCom = document.getElementById('overlayComercial');
    var overlayAd = document.getElementById('overlayAnuncio');
    
    if (overlayCom) overlayCom.style.display = 'none';
    if (overlayAd) overlayAd.style.display = 'none';
    
    telaLiveAtual = tipo;
    
    if (tipo === 'comercial' && overlayCom) {
        overlayCom.style.display = 'block';
    } else if (tipo === 'anuncio' && overlayAd) {
        overlayAd.style.display = 'flex';
    }
}

function carregarComercialLive(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var vid = document.getElementById('comercialVideo');
    if (!vid) return;
    
    vid.src = URL.createObjectURL(file);
    vid.loop = true;
    vid.muted = true;
    mostrarToast('🎬 Comercial carregado!', 'success');
}

function carregarAnuncioLive(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e){
        var img = document.getElementById('anuncioImg');
        if (img) {
            img.src = e.target.result;
            mostrarTelaLive('anuncio');
        }
    };
    reader.readAsDataURL(file);
}

function compartilharLive(rede) {
    var url = window.location.href.split('?')[0];
    var texto = '🔴 Barbearia RM - Ao Vivo!';
    
    if (rede === 'link') {
        navigator.clipboard.writeText(url).then(function(){
            mostrarToast('📋 Link copiado!', 'success');
        });
    } else if (rede === 'whatsapp') {
        window.open('https://wa.me/?text=' + encodeURIComponent(texto + ' ' + url), '_blank');
    } else if (rede === 'facebook') {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
    } else {
        mostrarToast('📤 Compartilhado!', 'info');
    }
}

async function finalizarLive() {
    if (!confirm('Tem certeza que deseja finalizar a live?')) return;
    
    pararLive();
    
    try {
        await db.collection('lives').doc('live_atual').update({
            ativa: false,
            dataFim: new Date().toISOString()
        });
    } catch(e) {}
    
    mostrarToast('✅ Live finalizada!', 'info');
}

function enviarChatLive() {
    var input = document.getElementById('liveChatInput');
    if (!input) return;
    
    var msg = input.value.trim();
    if (!msg) return;
    
    var container = document.getElementById('liveChatMessages');
    if (!container) return;
    
    // Remove mensagem de "vazio" se existir
    if (container.querySelector('p')) {
        container.innerHTML = '';
    }
    
    container.innerHTML += '<div style="padding:4px;font-size:11px;"><strong style="color:#D4A84B;">Você:</strong> ' + msg + '</div>';
    container.scrollTop = container.scrollHeight;
    input.value = '';
}

// ==========================================================
// SETUP EVENT LISTENERS
// ==========================================================
function setupEventListeners() {
    console.log('🎯 Configurando eventos...');
    
    // Login
    var btnCliente = document.getElementById('btnMostrarLoginCliente');
    var btnBarbeiro = document.getElementById('btnMostrarLoginBarbeiro');
    if (btnCliente) btnCliente.addEventListener('click', function(){ mostrarFormularioLogin('cliente'); });
    if (btnBarbeiro) btnBarbeiro.addEventListener('click', function(){ mostrarFormularioLogin('barbeiro'); });
    
    document.getElementById('btnEntrarCliente')?.addEventListener('click', loginCliente);
    document.getElementById('btnEntrarBarbeiro')?.addEventListener('click', loginBarbeiro);
    document.getElementById('btnCriarContaCliente')?.addEventListener('click', function(){ mostrarTela('cadastroCliente'); });
    document.getElementById('btnCriarContaBarbeiro')?.addEventListener('click', function(){ mostrarTela('cadastroBarbeiro'); });
    document.getElementById('btnVoltarLoginCliente')?.addEventListener('click', fecharFormulariosLogin);
    document.getElementById('btnVoltarLoginBarbeiro')?.addEventListener('click', fecharFormulariosLogin);
    
    // Cadastro
    document.getElementById('btnFinalizarCadastroCliente')?.addEventListener('click', cadastrarCliente);
    document.getElementById('btnFinalizarCadastroBarbeiro')?.addEventListener('click', cadastrarBarbeiro);
    document.getElementById('btnVoltarCadastroCliente')?.addEventListener('click', function(){ mostrarTela('login'); });
    document.getElementById('btnVoltarCadastroBarbeiro')?.addEventListener('click', function(){ mostrarTela('login'); });
    
    // Home Cliente
    document.getElementById('btnAgendarCorte')?.addEventListener('click', function(){ mostrarTela('agendamento'); });
    document.getElementById('btnGaleriaCliente')?.addEventListener('click', function(){ mostrarTela('galeriaCortes'); });
    document.getElementById('btnReelsCliente')?.addEventListener('click', function(){ mostrarTela('reels'); });
    document.getElementById('btnAnunciosCliente')?.addEventListener('click', function(){ mostrarTela('anuncios'); });
    document.getElementById('btnLiveCliente')?.addEventListener('click', function(){ mostrarTela('live'); });
    
    // Home Barbeiro
    document.getElementById('btnCriarPlano')?.addEventListener('click', function(){ mostrarTela('criarPlano'); });
    document.getElementById('btnNovoPost')?.addEventListener('click', function(){ mostrarTela('criarPost'); });
    document.getElementById('btnExtratoBarbeiro')?.addEventListener('click', function(){ mostrarTela('extrato'); });
    document.getElementById('btnHorariosBarbeiro')?.addEventListener('click', function(){ mostrarTela('horariosTrabalho'); });
    document.getElementById('btnAnunciosBarbeiro')?.addEventListener('click', function(){ mostrarTela('anuncios'); });
    document.getElementById('btnLiveBarbeiro')?.addEventListener('click', function(){ mostrarTela('live'); });
    
    // Agendamento
    document.getElementById('btnConfirmarAgendamento')?.addEventListener('click', agendarCorte);
    document.getElementById('btnVoltarAgendamento')?.addEventListener('click', function(){ mostrarTela('homeCliente'); });
    
    // Perfis
    document.getElementById('btnSalvarPerfilCliente')?.addEventListener('click', salvarPerfilCliente);
    document.getElementById('btnSairCliente')?.addEventListener('click', sairCliente);
    document.getElementById('btnSalvarPerfilBarbeiro')?.addEventListener('click', salvarPerfilBarbeiro);
    document.getElementById('btnSairBarbeiro')?.addEventListener('click', sairBarbeiro);
    
    // Avatar upload
    document.getElementById('perfilClienteAvatar')?.addEventListener('click', function(){ document.getElementById('fotoClienteInput').click(); });
    document.getElementById('perfilBarbeiroAvatar')?.addEventListener('click', function(){ document.getElementById('fotoBarbeiroInput').click(); });
    document.getElementById('fotoClienteInput')?.addEventListener('change', handleFotoCliente);
    document.getElementById('fotoBarbeiroInput')?.addEventListener('change', handleFotoBarbeiro);
    
    // Comentários
    document.getElementById('btnEnviarComentario')?.addEventListener('click', adicionarComentario);
    document.getElementById('btnFecharComentario')?.addEventListener('click', fecharModalComentario);
    
    // Navegação inferior Cliente
    document.getElementById('navHomeCliente')?.addEventListener('click', function(){ mostrarTela('homeCliente'); });
    document.getElementById('navAgendarCliente')?.addEventListener('click', function(){ mostrarTela('agendamento'); });
    document.getElementById('navGaleriaCliente')?.addEventListener('click', function(){ mostrarTela('galeriaCortes'); });
    document.getElementById('navLiveCliente')?.addEventListener('click', function(){ mostrarTela('live'); });
    document.getElementById('navPerfilCliente')?.addEventListener('click', function(){ mostrarTela('perfilCliente'); });
    
    // Navegação inferior Barbeiro
    document.getElementById('navHomeBarbeiro')?.addEventListener('click', function(){ mostrarTela('homeBarbeiro'); });
    document.getElementById('navPostarBarbeiro')?.addEventListener('click', function(){ mostrarTela('criarPost'); });
    document.getElementById('navExtratoBarbeiro')?.addEventListener('click', function(){ mostrarTela('extrato'); });
    document.getElementById('navLiveBarbeiro')?.addEventListener('click', function(){ mostrarTela('live'); });
    document.getElementById('navPerfilBarbeiro')?.addEventListener('click', function(){ mostrarTela('perfilBarbeiro'); });
    
    // ==================== LIVE STUDIO ====================
    document.getElementById('btnIniciarLiveNaTela')?.addEventListener('click', function(){
        console.log('🎥 Botão INICIAR LIVE clicado');
        iniciarLive();
    });
    
    document.getElementById('btnRecordClip')?.addEventListener('click', function(){
        console.log('⏺️ Botão GRAVAR TRECHO clicado');
        iniciarGravacaoTrecho();
    });
    
    document.getElementById('btnStopClip')?.addEventListener('click', function(){
        console.log('⏹️ Botão PARAR GRAVAÇÃO clicado');
        pararGravacaoTrecho();
    });
    
    document.getElementById('btnSaveClipsLive')?.addEventListener('click', function(){
        salvarTrechosLive();
    });
    
    document.getElementById('btnSwitchCamera')?.addEventListener('click', function(){
        trocarCameraLive();
    });
    
    document.getElementById('btnTelaCamera')?.addEventListener('click', function(){
        mostrarTelaLive('camera');
    });
    
    document.getElementById('btnTelaComercial')?.addEventListener('click', function(){
        mostrarTelaLive('comercial');
    });
    
    document.getElementById('btnTelaAnuncio')?.addEventListener('click', function(){
        mostrarTelaLive('anuncio');
    });
    
    document.getElementById('btnFinalizarLive')?.addEventListener('click', function(){
        finalizarLive();
    });
    
    document.getElementById('btnSendLiveChat')?.addEventListener('click', function(){
        enviarChatLive();
    });
    
    document.getElementById('btnVoltarLive')?.addEventListener('click', function(){
        if (liveAtiva) pararLive();
        mostrarTela('homeCliente');
    });
    
    // Enter no chat
    document.getElementById('liveChatInput')?.addEventListener('keypress', function(e){
        if (e.key === 'Enter') enviarChatLive();
    });
    
    console.log('✅ Todos os eventos configurados!');
}

// Handlers de foto
function handleFotoCliente(e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = async function(ev){
        var foto = ev.target.result;
        var img = document.querySelector('#perfilClienteAvatar img');
        if (img) img.src = foto;
        if (clienteLogado) {
            clienteLogado.fotoPerfil = foto;
            await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
            salvarSessao('cliente', clienteLogado);
        }
    };
    r.readAsDataURL(f);
}

function handleFotoBarbeiro(e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = async function(ev){
        var foto = ev.target.result;
        var img = document.querySelector('#perfilBarbeiroAvatar img');
        if (img) img.src = foto;
        if (barbeiroLogado) {
            barbeiroLogado.fotoPerfil = foto;
            await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto });
            salvarSessao('barbeiro', barbeiroLogado);
        }
    };
    r.readAsDataURL(f);
}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener('DOMContentLoaded', async function(){
    console.log('🚀 Barbearia RM iniciando...');
    
    // Configurar eventos primeiro
    setupEventListeners();
    
    // Esconder TODAS as telas
    document.querySelectorAll('.screen').forEach(function(s){ 
        s.classList.remove('active'); 
    });
    
    // Esconder navegação
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    if (nc) nc.style.display = 'none';
    if (nb) nb.style.display = 'none';
    
    // Fechar formulários
    fecharFormulariosLogin();
    
    // Tentar restaurar sessão
    var restaurado = await restaurarSessao();
    
    if (restaurado) {
        // Sessão restaurada com sucesso
        if (clienteLogado) {
            document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
            mostrarTela('homeCliente');
        } else if (barbeiroLogado) {
            document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
            mostrarTela('homeBarbeiro');
        }
    } else {
        // Nenhuma sessão - mostrar login
        document.getElementById('loginScreen').classList.add('active');
        console.log('👋 Nenhuma sessão ativa - mostrando login');
    }
    
    // Verificar badge da live (só se tiver alguém logado)
    if (clienteLogado || barbeiroLogado) {
        verificarLiveBadge();
    }
    
    console.log('✅ Barbearia RM pronta!');
});
