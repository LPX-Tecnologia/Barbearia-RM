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

// Evitar erro de índice composto
db.settings({ timestampsInSnapshots: true, ignoreUndefinedProperties: true });

console.log('🔥 Firebase conectado!');

// ==========================================================
// ===== VARIÁVEIS GLOBAIS =====
// ==========================================================
var clienteLogado = null;
var barbeiroLogado = null;
var imagemBase64 = '';
var videoBase64 = '';
var imagemPlanoBase64 = '';
var todosPosts = [];
var todosReels = [];
var reelsAtual = 0;
var postSelecionadoId = null;
var horariosTrabalho = {
    diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horarioInicio: '09:00',
    horarioFim: '18:00',
    intervaloCortes: 30,
    folgas: []
};

// ==========================================================
// ===== SESSÃO (LOCALSTORAGE) =====
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
        timestamp: new Date().getTime()
    };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(sessao));
}

function carregarSessao() {
    var s = localStorage.getItem('barbeariaRM_sessao');
    if (!s) return null;
    try {
        var sessao = JSON.parse(s);
        var dias = (new Date().getTime() - sessao.timestamp) / (1000 * 60 * 60 * 24);
        if (dias > 30) { localStorage.removeItem('barbeariaRM_sessao'); return null; }
        return sessao;
    } catch (e) { localStorage.removeItem('barbeariaRM_sessao'); return null; }
}

function limparSessao() { localStorage.removeItem('barbeariaRM_sessao'); }

async function restaurarSessao() {
    var sessao = carregarSessao();
    if (!sessao) return false;
    try {
        if (sessao.tipo === 'cliente') {
            const snap = await db.collection('clientes').where('email', '==', sessao.email).where('senha', '==', sessao.senha).get();
            if (!snap.empty) { var d = snap.docs[0]; clienteLogado = { id: d.id, ...d.data() }; document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome; mostrarTela('homeClienteScreen'); return true; }
        } else {
            const snap = await db.collection('barbeiros').where('email', '==', sessao.email).where('senha', '==', sessao.senha).get();
            if (!snap.empty) { var d = snap.docs[0]; barbeiroLogado = { id: d.id, ...d.data() }; document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome; mostrarTela('homeBarbeiroScreen'); return true; }
        }
    } catch (e) {}
    limparSessao(); return false;
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================

function mostrarToast(mensagem, tipo) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = mensagem; t.className = 'toast ' + (tipo || 'info'); t.style.display = 'block';
    setTimeout(function() { t.style.display = 'none'; }, 3000);
}

function voltarParaLogin() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
}

// ==========================================================
// ===== LOGIN / CADASTRO =====
// ==========================================================

function mostrarLoginCliente() { document.getElementById('loginFormCliente').style.display = 'block'; document.getElementById('loginFormBarbeiro').style.display = 'none'; }
function mostrarLoginBarbeiro() { document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'block'; }

async function cadastrarCliente() {
    var nome = document.getElementById('cadNomeCliente').value.trim();
    var email = document.getElementById('cadEmailCliente').value.trim();
    var celular = document.getElementById('cadCelularCliente').value.trim();
    var senha = document.getElementById('cadSenhaCliente').value;
    if (!nome || !email || !celular || !senha) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    if (senha.length < 6) { mostrarToast('❌ Senha mínima 6 caracteres!', 'error'); return; }
    try {
        const snap = await db.collection('clientes').where('email', '==', email).get();
        if (!snap.empty) { mostrarToast('❌ E-mail já cadastrado!', 'error'); return; }
        var id = Date.now().toString();
        var cliente = { id, nome, email, celular, senha, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('clientes').doc(id).set(cliente);
        clienteLogado = cliente; salvarSessao('cliente', cliente);
        document.getElementById('welcomeClienteNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success'); mostrarTela('homeClienteScreen');
        document.getElementById('cadNomeCliente').value = ''; document.getElementById('cadEmailCliente').value = ''; document.getElementById('cadCelularCliente').value = ''; document.getElementById('cadSenhaCliente').value = '';
    } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

async function cadastrarBarbeiro() {
    var nome = document.getElementById('cadNomeBarbeiro').value.trim();
    var email = document.getElementById('cadEmailBarbeiro').value.trim();
    var celular = document.getElementById('cadCelularBarbeiro').value.trim();
    var senha = document.getElementById('cadSenhaBarbeiro').value;
    if (!nome || !email || !celular || !senha) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    if (senha.length < 6) { mostrarToast('❌ Senha mínima 6 caracteres!', 'error'); return; }
    try {
        const snap = await db.collection('barbeiros').where('email', '==', email).get();
        if (!snap.empty) { mostrarToast('❌ E-mail já cadastrado!', 'error'); return; }
        var id = Date.now().toString();
        var barbeiro = { id, nome, email, celular, senha, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('barbeiros').doc(id).set(barbeiro);
        barbeiroLogado = barbeiro; salvarSessao('barbeiro', barbeiro);
        document.getElementById('welcomeBarbeiroNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success'); mostrarTela('homeBarbeiroScreen');
        document.getElementById('cadNomeBarbeiro').value = ''; document.getElementById('cadEmailBarbeiro').value = ''; document.getElementById('cadCelularBarbeiro').value = ''; document.getElementById('cadSenhaBarbeiro').value = '';
    } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;
    if (!email || !senha) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    try {
        const snap = await db.collection('clientes').where('email', '==', email).where('senha', '==', senha).get();
        if (snap.empty) { mostrarToast('❌ E-mail ou senha inválidos!', 'error'); return; }
        var d = snap.docs[0]; clienteLogado = { id: d.id, ...d.data() };
        salvarSessao('cliente', clienteLogado);
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = ''; document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success'); mostrarTela('homeClienteScreen');
    } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;
    if (!email || !senha) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    try {
        const snap = await db.collection('barbeiros').where('email', '==', email).where('senha', '==', senha).get();
        if (snap.empty) { mostrarToast('❌ E-mail ou senha inválidos!', 'error'); return; }
        var d = snap.docs[0]; barbeiroLogado = { id: d.id, ...d.data() };
        salvarSessao('barbeiro', barbeiroLogado);
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = ''; document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success'); mostrarTela('homeBarbeiroScreen');
    } catch (er) { mostrarToast('❌ Erro: ' + er.message, 'error'); }
}

function sairCliente() { clienteLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }
function sairBarbeiro() { barbeiroLogado = null; limparSessao(); document.getElementById('loginFormCliente').style.display = 'none'; document.getElementById('loginFormBarbeiro').style.display = 'none'; mostrarTela('loginScreen'); mostrarToast('👋 Até logo!', 'info'); }

// ==========================================================
// ===== AGENDAMENTOS =====
// ==========================================================

async function carregarAgendamentosBarbeiro() {
    var c = document.getElementById('agendamentosBarbeiroContainer'); if (!c) return;
    try {
        const snap = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var ag = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ag.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum agendamento</p>'; return; }
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 ' + (a.clienteNome||'Cliente') + '</div><div class="agenda-data">📅 ' + (a.data||'N/A') + ' • ⏰ ' + (a.horario||'N/A') + '</div><div style="font-size:12px;color:#6B7280;">✂️ ' + (a.tipo||'Corte') + '</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="agenda-status ' + sc + '">' + st + '</span>' + (a.status==='pendente'?'<button class="btn btn-small btn-success" onclick="confirmarAgendamento(\'' + a.id + '\')" style="padding:4px 8px;font-size:11px;">✅</button><button class="btn btn-small btn-danger" onclick="cancelarAgendamento(\'' + a.id + '\')" style="padding:4px 8px;font-size:11px;">❌</button>':'') + '</div></div>';
        }).join('');
    } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro ao carregar</p>'; }
}

async function confirmarAgendamento(id) {
    try { await db.collection('agendamentos').doc(id).update({ status: 'confirmado' }); mostrarToast('✅ Confirmado!', 'success'); carregarAgendamentosBarbeiro(); if (clienteLogado) carregarAgendaCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try { await db.collection('agendamentos').doc(id).update({ status: 'cancelado' }); mostrarToast('🗑 Cancelado!', 'success'); carregarAgendamentosBarbeiro(); if (clienteLogado) carregarAgendaCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

// ==========================================================
// ===== PLANOS =====
// ==========================================================

async function carregarPlanos() {
    var c = document.getElementById('planosContainer'); if (!c) return;
    try {
        const snap = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var planos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (planos.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum plano criado</p>'; return; }
        c.innerHTML = planos.map(function(p) {
            return '<div class="plano-card" style="flex-direction:column;align-items:flex-start;">' +
                (p.imagem ? '<img src="' + p.imagem + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">' : '') +
                '<div style="display:flex;justify-content:space-between;width:100%;align-items:center;">' +
                    '<div class="plano-info"><div class="plano-nome">' + p.nome + '</div><div class="plano-periodo">📅 ' + p.periodo + '</div><div style="font-size:12px;color:#6B7280;">' + (p.descricao||'') + '</div></div>' +
                    '<div class="plano-preco">R$ ' + (p.preco?p.preco.toFixed(2):'0,00') + '</div>' +
                '</div>' +
                '<div class="plano-actions" style="margin-top:8px;"><button class="btn btn-small btn-primary" onclick="editarPlano(\'' + p.id + '\')">✏️ Editar</button><button class="btn btn-small btn-danger" onclick="excluirPlanoDireto(\'' + p.id + '\')">🗑</button></div>' +
            '</div>';
        }).join('');
    } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro ao carregar</p>'; }
}

async function criarPlano() {
    if (!barbeiroLogado) return;
    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();
    var imagem = document.getElementById('planoImagem').value || '';
    if (!nome || !preco || preco <= 0) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }
    try {
        var id = Date.now().toString();
        await db.collection('planos').doc(id).set({ id, barbeiroId: barbeiroLogado.id, nome, periodo, preco, descricao, imagem, dataCriacao: new Date().toISOString() });
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = ''; document.getElementById('planoPreco').value = ''; document.getElementById('planoDescricao').value = '';
        removerImagemPlano(); mostrarTela('homeBarbeiroScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

function editarPlano(planoId) {
    db.collection('planos').doc(planoId).get().then(function(doc) {
        if (doc.exists) {
            var p = doc.data();
            document.getElementById('editPlanoId').value = planoId;
            document.getElementById('editPlanoNome').value = p.nome;
            document.getElementById('editPlanoPeriodo').value = p.periodo;
            document.getElementById('editPlanoPreco').value = p.preco;
            document.getElementById('editPlanoDescricao').value = p.descricao || '';
            document.getElementById('editPlanoImagem').value = p.imagem || '';
            if (p.imagem) { document.getElementById('editPlanoImagemPreview').src = p.imagem; document.getElementById('editPlanoImagemPreview').style.display = 'block'; }
            else { document.getElementById('editPlanoImagemPreview').style.display = 'none'; }
            mostrarTela('editarPlanoScreen');
        }
    });
}

async function salvarEdicaoPlano() {
    var id = document.getElementById('editPlanoId').value;
    var imagem = document.getElementById('editPlanoImagem').value || '';
    try {
        await db.collection('planos').doc(id).update({
            nome: document.getElementById('editPlanoNome').value.trim(),
            periodo: document.getElementById('editPlanoPeriodo').value,
            preco: parseFloat(document.getElementById('editPlanoPreco').value),
            descricao: document.getElementById('editPlanoDescricao').value.trim(),
            imagem: imagem
        });
        mostrarToast('✅ Plano atualizado!', 'success'); mostrarTela('homeBarbeiroScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function excluirPlano() { if (!confirm('Excluir?')) return; await db.collection('planos').doc(document.getElementById('editPlanoId').value).delete(); mostrarToast('🗑 Excluído!', 'success'); mostrarTela('homeBarbeiroScreen'); }
async function excluirPlanoDireto(id) { if (!confirm('Excluir?')) return; await db.collection('planos').doc(id).delete(); mostrarToast('🗑 Excluído!', 'success'); carregarPlanos(); }

function previewImagemPlano(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        imagemPlanoBase64 = e.target.result;
        document.getElementById('planoImagem').value = imagemPlanoBase64;
        document.getElementById('planoImagemPreview').src = imagemPlanoBase64;
        document.getElementById('planoImagemPreview').style.display = 'block';
        document.getElementById('btnRemoverImagemPlano').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function removerImagemPlano() {
    imagemPlanoBase64 = '';
    document.getElementById('planoImagem').value = '';
    document.getElementById('planoImagemPreview').style.display = 'none';
    document.getElementById('btnRemoverImagemPlano').style.display = 'none';
    document.getElementById('planoImagemInput').value = '';
}

function previewEditPlanoImagem(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('editPlanoImagem').value = e.target.result;
        document.getElementById('editPlanoImagemPreview').src = e.target.result;
        document.getElementById('editPlanoImagemPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// ==========================================================
// ===== FATURAMENTO =====
// ==========================================================

async function calcularFaturamento() {
    try {
        const snap = await db.collection('agendamentos').where('status', '==', 'confirmado').get();
        var ag = snap.docs.map(d => d.data());
        var hoje = new Date().toISOString().split('T')[0];
        var vh = 0, vt = 0;
        ag.forEach(function(a) { var v = 35; if (a.data === hoje) vh += v; vt += v; });
        var eh = document.getElementById('faturamentoHoje'); if (eh) eh.textContent = 'R$ ' + vh.toFixed(2);
        var es = document.getElementById('faturamentoSemana'); if (es) es.textContent = 'R$ ' + (vt*0.3).toFixed(2);
        var em = document.getElementById('faturamentoMes'); if (em) em.textContent = 'R$ ' + (vt*0.7).toFixed(2);
        var ea = document.getElementById('faturamentoAno'); if (ea) ea.textContent = 'R$ ' + vt.toFixed(2);
    } catch (e) {}
}

// ==========================================================
// ===== FEED CLIENTE (COM COMENTÁRIOS) =====
// ==========================================================

async function carregarFeedCliente() {
    var c = document.getElementById('feedClienteContainer'); if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        var posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        todosPosts = posts;
        if (posts.length === 0) { c.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>'; return; }
        c.innerHTML = posts.map(function(post) {
            var comentarios = post.comentarios || [];
            return '<div class="feed-post">' +
                '<div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">' + (post.barbeiroNome||'Barbearia RM') + '</div><div class="feed-post-user-time">' + new Date(post.dataCriacao).toLocaleDateString('pt-BR') + '</div></div></div>' +
                (post.video ? '<video class="feed-post-video" controls style="width:100%;"><source src="' + post.video + '" type="video/mp4"></video>' : post.imagem ? '<img src="' + post.imagem + '" class="feed-post-image" alt="' + post.titulo + '">' : '') +
                '<div class="feed-post-body"><div class="feed-post-title">' + post.titulo + '</div><div class="feed-post-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div><div class="feed-post-desc">' + (post.descricao||'') + '</div></div>' +
                '<div class="feed-post-actions"><button onclick="likePost(\'' + post.id + '\', this)">❤️ <span class="count">' + (post.likes||0) + '</span></button><button onclick="abrirComentarios(\'' + post.id + '\')">💬 <span class="count">' + comentarios.length + '</span></button><button onclick="agendarPorPost()">✂️ Agendar</button></div>' +
                (comentarios.length > 0 ? '<div class="comentarios-preview" style="padding:0 14px 10px;">' + comentarios.slice(-3).map(function(c) { return '<div style="font-size:12px;color:#B0B0B0;margin:4px 0;"><strong style="color:#D4A84B;">' + c.autor + ':</strong> ' + c.texto + '</div>'; }).join('') + (comentarios.length > 3 ? '<div style="font-size:11px;color:var(--primary);cursor:pointer;" onclick="abrirComentarios(\'' + post.id + '\')">Ver todos os ' + comentarios.length + ' comentários</div>' : '') + '</div>' : '') +
            '</div>';
        }).join('');
    } catch (e) { console.error('❌ Erro feed:', e); }
}

// ==========================================================
// ===== MEUS POSTS (BARBEIRO) - CORRIGIDO =====
// ==========================================================

async function carregarMeusPosts() {
    var container = document.getElementById('meusPostsContainer');
    if (!container) return;
    
    if (!barbeiroLogado) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Faça login para ver seus posts</p>';
        return;
    }

    try {
        // Buscar posts sem ordenação (evita erro de índice)
        const snap = await db.collection('posts')
            .where('barbeiroId', '==', barbeiroLogado.id)
            .get();
        
        var posts = [];
        snap.forEach(function(doc) {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordenar manualmente
        posts.sort(function(a, b) {
            return new Date(b.dataCriacao) - new Date(a.dataCriacao);
        });
        
        if (posts.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Você ainda não publicou nenhum post.<br><br><button class="btn btn-small btn-primary" onclick="mostrarTela(\'criarPostScreen\')">📸 Criar Primeiro Post</button></p>';
            return;
        }

        container.innerHTML = posts.map(function(post) {
            var comentarios = post.comentarios || [];
            return '<div class="feed-post" style="margin-bottom:12px;">' +
                '<div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">' + post.titulo + '</div><div class="feed-post-user-time">' + new Date(post.dataCriacao).toLocaleDateString('pt-BR') + ' • R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div></div></div>' +
                (post.imagem ? '<img src="' + post.imagem + '" class="feed-post-image" alt="' + post.titulo + '">' : '') +
                (post.video ? '<video class="feed-post-video" controls style="width:100%;"><source src="' + post.video + '" type="video/mp4"></video>' : '') +
                '<div class="feed-post-body"><div class="feed-post-desc">' + (post.descricao||'Sem descrição') + '</div><div style="font-size:12px;color:#6B7280;margin-top:4px;">❤️ ' + (post.likes||0) + ' curtidas • 💬 ' + comentarios.length + ' comentários</div></div>' +
                (comentarios.length > 0 ? '<div style="padding:0 14px 10px;border-top:1px solid rgba(255,255,255,0.05);"><div style="font-size:11px;color:var(--primary);margin-bottom:6px;">💬 Comentários:</div>' + comentarios.map(function(c) { return '<div style="font-size:12px;color:#B0B0B0;margin:6px 0;padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;"><strong style="color:#D4A84B;">' + c.autor + ':</strong> ' + c.texto + '<div style="font-size:10px;color:#6B7280;">' + new Date(c.data).toLocaleString('pt-BR') + '</div></div>'; }).join('') + '</div>' : '') +
                '<div class="feed-post-actions"><button onclick="excluirMeuPost(\'' + post.id + '\')" style="color:#EF4444;">🗑 Excluir</button></div>' +
            '</div>';
        }).join('');
        
    } catch (error) {
        console.error('❌ Erro meus posts:', error);
        container.innerHTML = '<p style="color:#EF4444;text-align:center;padding:20px;">Erro ao carregar posts<br><br><button class="btn btn-small btn-primary" onclick="carregarMeusPosts()">🔄 Tentar Novamente</button></p>';
    }
}

async function excluirMeuPost(postId) {
    if (!confirm('Excluir este post permanentemente?')) return;
    try {
        await db.collection('posts').doc(postId).delete();
        mostrarToast('🗑 Post excluído!', 'success');
        carregarMeusPosts();
        carregarFeedCliente();
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

// ==========================================================
// ===== SISTEMA DE COMENTÁRIOS =====
// ==========================================================

function abrirComentarios(postId) {
    postSelecionadoId = postId;
    carregarComentarios(postId);
    document.getElementById('modalComentario').classList.add('active');
}

async function carregarComentarios(postId) {
    var container = document.getElementById('comentariosContainer');
    if (!container) return;
    try {
        const doc = await db.collection('posts').doc(postId).get();
        if (!doc.exists) return;
        var post = doc.data();
        var comentarios = post.comentarios || [];
        if (comentarios.length === 0) { container.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum comentário ainda. Seja o primeiro!</p>'; return; }
        container.innerHTML = comentarios.map(function(c) {
            return '<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,0.03);border-radius:8px;"><strong style="color:#D4A84B;">' + c.autor + '</strong><span style="font-size:10px;color:#6B7280;margin-left:8px;">' + new Date(c.data).toLocaleString('pt-BR') + '</span><p style="margin:4px 0 0;color:#B0B0B0;">' + c.texto + '</p></div>';
        }).join('');
    } catch (e) { container.innerHTML = '<p style="color:#EF4444;">Erro ao carregar</p>'; }
}

async function adicionarComentario() {
    var texto = document.getElementById('novoComentario').value.trim();
    if (!texto) { mostrarToast('❌ Digite um comentário!', 'error'); return; }
    if (!clienteLogado && !barbeiroLogado) { mostrarToast('❌ Faça login para comentar!', 'error'); return; }
    var autor = clienteLogado ? clienteLogado.nome : (barbeiroLogado ? barbeiroLogado.nome : 'Anônimo');
    try {
        const doc = await db.collection('posts').doc(postSelecionadoId).get();
        if (!doc.exists) { mostrarToast('❌ Post não encontrado!', 'error'); return; }
        var post = doc.data();
        var comentarios = post.comentarios || [];
        comentarios.push({ autor: autor, texto: texto, data: new Date().toISOString() });
        await db.collection('posts').doc(postSelecionadoId).update({ comentarios: comentarios });
        mostrarToast('✅ Comentário adicionado!', 'success');
        document.getElementById('novoComentario').value = '';
        carregarComentarios(postSelecionadoId);
        carregarFeedCliente();
        if (barbeiroLogado) carregarMeusPosts();
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

function fecharModalComentario() {
    document.getElementById('modalComentario').classList.remove('active');
    postSelecionadoId = null;
}

// ==========================================================
// ===== CRIAR POST =====
// ==========================================================

async function criarPost() {
    if (!barbeiroLogado) { mostrarToast('❌ Faça login como barbeiro!', 'error'); return; }
    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var descricao = document.getElementById('postDescricao').value.trim();
    var imagem = document.getElementById('postImagem').value || '';
    var video = document.getElementById('postVideo').value || '';
    if (!titulo) { mostrarToast('❌ Digite um título!', 'error'); return; }
    if (!preco || preco <= 0) { mostrarToast('❌ Digite um preço válido!', 'error'); return; }
    try {
        var postId = Date.now().toString();
        await db.collection('posts').doc(postId).set({
            id: postId, barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo, preco, imagem, video, descricao, likes: 0, comentarios: [], dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Post publicado!', 'success');
        document.getElementById('postTitulo').value = ''; document.getElementById('postPreco').value = ''; document.getElementById('postDescricao').value = '';
        removerImagem(); removerVideo(); mostrarTela('homeBarbeiroScreen');
    } catch (error) { mostrarToast('❌ Erro: ' + error.message, 'error'); }
}

// ==========================================================
// ===== UPLOAD =====
// ==========================================================

function previewImagem(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        imagemBase64 = e.target.result;
        document.getElementById('postImagem').value = imagemBase64;
        document.getElementById('imagemPreviewImg').src = imagemBase64;
        document.getElementById('imagemPreview').style.display = 'block';
        document.getElementById('imagemUploadArea').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removerImagem() {
    imagemBase64 = '';
    document.getElementById('postImagem').value = '';
    document.getElementById('imagemPreview').style.display = 'none';
    document.getElementById('imagemUploadArea').style.display = 'block';
    document.getElementById('postImagemInput').value = '';
}

function previewVideo(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        videoBase64 = e.target.result;
        document.getElementById('postVideo').value = videoBase64;
        document.getElementById('videoPreviewVideo').src = videoBase64;
        document.getElementById('videoPreview').style.display = 'block';
        document.getElementById('videoUploadArea').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removerVideo() {
    videoBase64 = '';
    document.getElementById('postVideo').value = '';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('videoUploadArea').style.display = 'block';
    document.getElementById('postVideoInput').value = '';
}

// ==========================================================
// ===== AGENDAMENTO CLIENTE =====
// ==========================================================

async function agendarCorte() {
    if (!clienteLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var data = document.getElementById('agendamentoData').value;
    var horario = document.getElementById('agendamentoHorario').value;
    var tipo = document.getElementById('agendamentoTipo').value;
    if (!data) { mostrarToast('❌ Selecione uma data!', 'error'); return; }
    try {
        var id = Date.now().toString();
        await db.collection('agendamentos').doc(id).set({ id, clienteId: clienteLogado.id, clienteNome: clienteLogado.nome, clienteEmail: clienteLogado.email, data, horario, tipo, status: 'pendente', dataCriacao: new Date().toISOString() });
        mostrarToast('✅ Agendado!', 'success'); document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente(); mostrarTela('homeClienteScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var c = document.getElementById('agendaClienteContainer'); if (!c) return;
    try {
        const snap = await db.collection('agendamentos').where('clienteId', '==', clienteLogado.id).get();
        var ag = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ag.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>'; return; }
        ag.sort((a,b) => new Date(b.data+' '+b.horario) - new Date(a.data+' '+a.horario));
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return '<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">' + a.tipo + '</div><div class="agenda-data">📅 ' + a.data + ' • ⏰ ' + a.horario + '</div></div><span class="agenda-status ' + sc + '">' + st + '</span></div>';
        }).join('');
    } catch (e) {}
}

// ==========================================================
// ===== GALERIA =====
// ==========================================================

async function carregarGaleria() {
    var c = document.getElementById('galeriaContainer'); if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        filtrarGaleria();
    } catch (e) { c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro</p>'; }
}

function filtrarGaleria() {
    var cat = document.getElementById('filtroCategoria').value;
    var c = document.getElementById('galeriaContainer');
    var filtrados = cat === 'todos' ? todosPosts : todosPosts.filter(p => p.titulo === cat);
    if (filtrados.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;grid-column:1/-1;">Nenhum corte</p>'; return; }
    c.innerHTML = filtrados.map(function(post) {
        return '<div class="galeria-item" onclick="verDetalheCorte(\'' + post.id + '\')">' +
            (post.imagem ? '<img src="' + post.imagem + '" class="galeria-item-image" alt="' + post.titulo + '">' : '<div class="galeria-item-image" style="background:linear-gradient(135deg,#1A1A1A,#2D2D2D);display:flex;align-items:center;justify-content:center;font-size:40px;">✂️</div>') +
            '<div class="galeria-item-info"><div class="galeria-item-title">' + post.titulo + '</div><div class="galeria-item-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div>' + (post.video ? '<span style="font-size:11px;color:var(--primary);">🎬 Vídeo</span>' : '') + '</div>' +
        '</div>';
    }).join('');
}

function verDetalheCorte(postId) {
    var post = todosPosts.find(p => p.id === postId); if (!post) return;
    document.getElementById('detalhePostConteudo').innerHTML = '<div class="card"><h3>' + post.titulo + '</h3>' +
        (post.video ? '<video controls style="width:100%;border-radius:12px;margin:10px 0;"><source src="' + post.video + '" type="video/mp4"></video>' : post.imagem ? '<img src="' + post.imagem + '" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin:10px 0;">' : '') +
        '<p style="font-size:24px;color:var(--primary);">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</p><p style="color:#B0B0B0;">' + (post.descricao||'') + '</p>' +
        '<button class="btn btn-primary" onclick="agendarPorPost()">✂️ AGENDAR</button><button class="btn btn-outline" onclick="mostrarTela(\'galeriaCortesScreen\')">← Voltar</button></div>';
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== REELS =====
// ==========================================================

async function carregarReels() {
    var c = document.getElementById('reelsContainer'); if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosReels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (todosReels.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:40px;">Nenhum reel</p>'; return; }
        reelsAtual = 0; exibirReel(0);
    } catch (e) {}
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    var post = todosReels[index];
    document.getElementById('reelsContainer').innerHTML = '<div class="reel-item">' +
        (post.video ? '<video src="' + post.video + '" autoplay loop muted playsinline></video>' : post.imagem ? '<img src="' + post.imagem + '" class="reel-item-image">' : '<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>') +
        '<div class="reel-item-overlay"><div class="reel-item-title">' + post.titulo + '</div><div class="reel-item-price">R$ ' + (post.preco?post.preco.toFixed(2):'0,00') + '</div></div>' +
        '<div class="reel-item-actions"><button onclick="likeReel(this)">❤️</button><button onclick="agendarPorPost()">✂️</button></div></div>';
}

function reelAnterior() { if (reelsAtual > 0) { reelsAtual--; exibirReel(reelsAtual); } }
function reelProximo() { if (reelsAtual < todosReels.length - 1) { reelsAtual++; exibirReel(reelsAtual); } }
function likeReel(btn) { btn.classList.toggle('liked'); mostrarToast('❤️ Curtido!', 'success'); }
function agendarPorPost() { mostrarTela('agendamentoScreen'); }
function likePost(postId, btn) { btn.classList.toggle('liked'); var c = btn.querySelector('.count'); if (c) { var cur = parseInt(c.textContent) || 0; c.textContent = btn.classList.contains('liked') ? cur + 1 : cur - 1; } }

// ==========================================================
// ===== PERFIL =====
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
    try { await db.collection('clientes').doc(clienteLogado.id).update({ nome: n, celular: c }); clienteLogado.nome = n; clienteLogado.celular = c; salvarSessao('cliente', clienteLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilCliente(); } catch (e) { mostrarToast('❌ Erro!', 'error'); }
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
    try { await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome: n, celular: c, email: e }); barbeiroLogado.nome = n; barbeiroLogado.celular = c; barbeiroLogado.email = e; salvarSessao('barbeiro', barbeiroLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilBarbeiro(); } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

function uploadFotoCliente(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var av = document.getElementById('perfilClienteAvatar'); if (av) { var img = av.querySelector('img'); if (img) img.src = foto; }
        clienteLogado.fotoPerfil = foto;
        await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
        salvarSessao('cliente', clienteLogado); mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

function uploadFotoBarbeiro(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var av = document.getElementById('perfilBarbeiroAvatar'); if (av) { var img = av.querySelector('img'); if (img) img.src = foto; }
        barbeiroLogado.fotoPerfil = foto;
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto });
        salvarSessao('barbeiro', barbeiroLogado); mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

// ==========================================================
// ===== EXTRATO / PAGAMENTO =====
// ==========================================================

function filtrarExtrato(tipo) { mostrarToast('📊 ' + tipo, 'info'); }
function copiarPix() { navigator.clipboard.writeText(document.getElementById('pixChave').textContent).then(() => mostrarToast('✅ PIX copiado!', 'success')); }
function fecharPagamento() { mostrarTela('homeClienteScreen'); }

// ==========================================================
// ===== HORÁRIOS =====
// ==========================================================

async function carregarHorarios() {
    if (!barbeiroLogado) return;
    try {
        const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        if (doc.exists) horariosTrabalho = doc.data();
        ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => { var cb = document.getElementById('dia'+d); if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(d.toLowerCase()); });
        document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio;
        document.getElementById('horarioFim').value = horariosTrabalho.horarioFim;
        document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes;
        carregarFolgas();
    } catch (e) {}
}

function carregarFolgas() {
    var c = document.getElementById('folgasContainer'); if (!c) return;
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) { c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhuma folga</p>'; return; }
    c.innerHTML = horariosTrabalho.folgas.map((f,i) => '<div class="folga-item"><span>🏖️ ' + new Date(f).toLocaleDateString('pt-BR') + '</span><button onclick="removerFolga(' + i + ')">❌</button></div>').join('');
}

function adicionarFolga() {
    var data = document.getElementById('folgaData').value;
    if (!data) return;
    if (horariosTrabalho.folgas.includes(data)) { mostrarToast('❌ Já cadastrada!', 'error'); return; }
    horariosTrabalho.folgas.push(data); horariosTrabalho.folgas.sort(); carregarFolgas();
    document.getElementById('folgaData').value = ''; mostrarToast('✅ Adicionada!', 'success');
}

function removerFolga(index) { horariosTrabalho.folgas.splice(index, 1); carregarFolgas(); }

async function salvarHorarios() {
    if (!barbeiroLogado) return;
    var dias = [];
    ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => { var cb = document.getElementById('dia'+d); if (cb && cb.checked) dias.push(d.toLowerCase()); });
    horariosTrabalho.diasTrabalho = dias;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    try { await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho); mostrarToast('✅ Salvos!', 'success'); } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    var el = document.getElementById(id); if (el) el.classList.add('active');
    var nc = document.getElementById('bottomNavCliente'), nb = document.getElementById('bottomNavBarbeiro');
    var tc = ['homeClienteScreen','agendamentoScreen','galeriaCortesScreen','reelsScreen','perfilClienteScreen','detalhePostScreen','pagamentoScreen'];
    var tb = ['homeBarbeiroScreen','criarPostScreen','extratoScreen','criarPlanoScreen','editarPlanoScreen','horariosTrabalhoScreen','perfilBarbeiroScreen'];
    if (tc.includes(id)) { if (nc) nc.style.display = 'flex'; if (nb) nb.style.display = 'none'; }
    else if (tb.includes(id)) { if (nb) nb.style.display = 'flex'; if (nc) nc.style.display = 'none'; }
    else { if (nc) nc.style.display = 'none'; if (nb) nb.style.display = 'none'; }
    if (id === 'homeClienteScreen') { carregarFeedCliente(); carregarAgendaCliente(); }
    if (id === 'homeBarbeiroScreen') { carregarAgendamentosBarbeiro(); carregarPlanos(); calcularFaturamento(); carregarMeusPosts(); }
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
    var nc = document.getElementById('bottomNavCliente'), nb = document.getElementById('bottomNavBarbeiro');
    if (nc) nc.style.display = 'none'; if (nb) nb.style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    restaurarSessao().then(r => { if (!r) document.getElementById('loginScreen').classList.add('active'); });
    console.log('✅ Sistema pronto!');
});
