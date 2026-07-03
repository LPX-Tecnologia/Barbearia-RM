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
    console.log('💾 Sessão salva:', tipo, dados.nome);
}

function carregarSessao() {
    var s = localStorage.getItem('barbeariaRM_sessao');
    if (!s) return null;
    try {
        var sessao = JSON.parse(s);
        var dias = (new Date().getTime() - sessao.timestamp) / (1000 * 60 * 60 * 24);
        if (dias > 30) {
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
    if (!sessao) {
        console.log('📭 Nenhuma sessão salva');
        return false;
    }
    console.log('🔄 Tentando restaurar sessão:', sessao.tipo, sessao.email);
    try {
        if (sessao.tipo === 'cliente') {
            const snap = await db.collection('clientes')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!snap.empty) {
                var d = snap.docs[0];
                clienteLogado = { id: d.id, ...d.data() };
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                mostrarTela('homeClienteScreen');
                console.log('✅ Sessão cliente restaurada:', clienteLogado.nome);
                return true;
            }
        } else if (sessao.tipo === 'barbeiro') {
            const snap = await db.collection('barbeiros')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!snap.empty) {
                var d = snap.docs[0];
                barbeiroLogado = { id: d.id, ...d.data() };
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                mostrarTela('homeBarbeiroScreen');
                console.log('✅ Sessão barbeiro restaurada:', barbeiroLogado.nome);
                return true;
            }
        }
    } catch (e) {
        console.error('❌ Erro ao restaurar sessão:', e);
    }
    limparSessao();
    return false;
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================

function mostrarToast(mensagem, tipo) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = mensagem;
    t.className = 'toast ' + (tipo || 'info');
    t.style.display = 'block';
    setTimeout(function() { t.style.display = 'none'; }, 3000);
}

function voltarParaLogin() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
}

// ==========================================================
// ===== LOGIN - MOSTRAR FORMULÁRIOS =====
// ==========================================================

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

// ==========================================================
// ===== CADASTRO CLIENTE =====
// ==========================================================

async function cadastrarCliente() {
    var nome = document.getElementById('cadNomeCliente').value.trim();
    var email = document.getElementById('cadEmailCliente').value.trim();
    var celular = document.getElementById('cadCelularCliente').value.trim();
    var senha = document.getElementById('cadSenhaCliente').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    if (senha.length < 6) {
        mostrarToast('❌ Senha mínima 6 caracteres!', 'error');
        return;
    }

    try {
        const snap = await db.collection('clientes').where('email', '==', email).get();
        if (!snap.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var id = Date.now().toString();
        var cliente = {
            id: id,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('clientes').doc(id).set(cliente);
        clienteLogado = cliente;
        salvarSessao('cliente', cliente);
        document.getElementById('welcomeClienteNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeClienteScreen');
        
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
    } catch (er) {
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

// ==========================================================
// ===== CADASTRO BARBEIRO =====
// ==========================================================

async function cadastrarBarbeiro() {
    var nome = document.getElementById('cadNomeBarbeiro').value.trim();
    var email = document.getElementById('cadEmailBarbeiro').value.trim();
    var celular = document.getElementById('cadCelularBarbeiro').value.trim();
    var senha = document.getElementById('cadSenhaBarbeiro').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    if (senha.length < 6) {
        mostrarToast('❌ Senha mínima 6 caracteres!', 'error');
        return;
    }

    try {
        const snap = await db.collection('barbeiros').where('email', '==', email).get();
        if (!snap.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var id = Date.now().toString();
        var barbeiro = {
            id: id,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('barbeiros').doc(id).set(barbeiro);
        barbeiroLogado = barbeiro;
        salvarSessao('barbeiro', barbeiro);
        document.getElementById('welcomeBarbeiroNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
    } catch (er) {
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN CLIENTE =====
// ==========================================================

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snap = await db.collection('clientes')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snap.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var d = snap.docs[0];
        clienteLogado = { id: d.id, ...d.data() };
        salvarSessao('cliente', clienteLogado);
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (er) {
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN BARBEIRO =====
// ==========================================================

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snap = await db.collection('barbeiros')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snap.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var d = snap.docs[0];
        barbeiroLogado = { id: d.id, ...d.data() };
        salvarSessao('barbeiro', barbeiroLogado);
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (er) {
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

// ==========================================================
// ===== LOGOUT =====
// ==========================================================

function sairCliente() {
    clienteLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== AGENDAMENTOS =====
// ==========================================================

async function carregarAgendamentosBarbeiro() {
    var c = document.getElementById('agendamentosBarbeiroContainer');
    if (!c) return;
    try {
        const snap = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var ag = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ag.length === 0) {
            c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum agendamento</p>';
            return;
        }
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `<div class="agenda-item">
                <div class="agenda-info">
                    <div class="agenda-cliente">👤 ${a.clienteNome||'Cliente'}</div>
                    <div class="agenda-data">📅 ${a.data||'N/A'} • ⏰ ${a.horario||'N/A'}</div>
                    <div style="font-size:12px;color:#6B7280;">✂️ ${a.tipo||'Corte'}</div>
                </div>
                <div style="display:flex;gap:4px;align-items:center;">
                    <span class="agenda-status ${sc}">${st}</span>
                    ${a.status==='pendente'?`<button class="btn btn-small btn-success" onclick="confirmarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">✅</button><button class="btn btn-small btn-danger" onclick="cancelarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">❌</button>`:''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro ao carregar</p>';
    }
}

async function confirmarAgendamento(id) {
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
        mostrarToast('✅ Confirmado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
        mostrarToast('🗑 Cancelado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro!', 'error');
    }
}

// ==========================================================
// ===== PLANOS =====
// ==========================================================

async function carregarPlanos() {
    var c = document.getElementById('planosContainer');
    if (!c) return;
    try {
        const snap = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var planos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (planos.length === 0) {
            c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum plano criado</p>';
            return;
        }
        c.innerHTML = planos.map(function(p) {
            return `<div class="plano-card" style="flex-direction:column;align-items:flex-start;">
                ${p.imagem ? `<img src="${p.imagem}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">` : ''}
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="plano-info">
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                        <div style="font-size:12px;color:#6B7280;">${p.descricao||''}</div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco?p.preco.toFixed(2):'0,00'}</div>
                </div>
                <div class="plano-actions" style="margin-top:8px;">
                    <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️ Editar</button>
                    <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro ao carregar</p>';
    }
}

async function criarPlano() {
    if (!barbeiroLogado) return;
    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();
    var imagem = document.getElementById('planoImagem').value || '';

    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        var id = Date.now().toString();
        await db.collection('planos').doc(id).set({
            id: id,
            barbeiroId: barbeiroLogado.id,
            nome: nome,
            periodo: periodo,
            preco: preco,
            descricao: descricao,
            imagem: imagem,
            dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        removerImagemPlano();
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro: ' + e.message, 'error');
    }
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
            if (p.imagem) {
                document.getElementById('editPlanoImagemPreview').src = p.imagem;
                document.getElementById('editPlanoImagemPreview').style.display = 'block';
            }
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
        mostrarToast('✅ Plano atualizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function excluirPlano() {
    if (!confirm('Excluir este plano?')) return;
    await db.collection('planos').doc(document.getElementById('editPlanoId').value).delete();
    mostrarToast('🗑 Plano excluído!', 'success');
    mostrarTela('homeBarbeiroScreen');
}

async function excluirPlanoDireto(planoId) {
    if (!confirm('Excluir este plano?')) return;
    await db.collection('planos').doc(planoId).delete();
    mostrarToast('🗑 Plano excluído!', 'success');
    carregarPlanos();
}

// ==========================================================
// ===== UPLOAD IMAGEM PLANO =====
// ==========================================================

function previewImagemPlano(event) {
    var file = event.target.files[0];
    if (!file) return;
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
    var file = event.target.files[0];
    if (!file) return;
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
// ===== FEED CLIENTE =====
// ==========================================================

async function carregarFeedCliente() {
    var c = document.getElementById('feedClienteContainer');
    if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        var posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (posts.length === 0) {
            c.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>';
            return;
        }
        todosPosts = posts;
        c.innerHTML = posts.map(function(post) {
            return `<div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">✂️</div>
                    <div class="feed-post-user">
                        <div class="feed-post-user-name">${post.barbeiroNome||'Barbearia RM'}</div>
                        <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
                ${post.video ? `<video class="feed-post-video" controls style="width:100%;"><source src="${post.video}" type="video/mp4"></video>` : post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : ''}
                <div class="feed-post-body">
                    <div class="feed-post-title">${post.titulo}</div>
                    <div class="feed-post-price">R$ ${post.preco?post.preco.toFixed(2):'0,00'}</div>
                    <div class="feed-post-desc">${post.descricao||''}</div>
                </div>
                <div class="feed-post-actions">
                    <button onclick="likePost('${post.id}', this)">❤️ <span class="count">${post.likes||0}</span></button>
                    <button onclick="agendarPorPost()">✂️ Agendar</button>
                    ${post.video ? '<button onclick="verVideoFull(\'' + post.id + '\')">🎬 Assistir</button>' : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('❌ Erro feed:', e);
    }
}

function verVideoFull(postId) {
    var post = todosPosts.find(p => p.id === postId);
    if (!post || !post.video) return;
    document.getElementById('detalhePostConteudo').innerHTML = `<div class="card">
        <h3>🎬 ${post.titulo}</h3>
        <video controls autoplay style="width:100%;border-radius:12px;margin:10px 0;"><source src="${post.video}" type="video/mp4"></video>
        <p style="font-size:24px;color:var(--primary);">R$ ${post.preco?post.preco.toFixed(2):'0,00'}</p>
        <p style="color:#B0B0B0;">${post.descricao||''}</p>
        <button class="btn btn-primary" onclick="agendarPorPost()">✂️ AGENDAR</button>
        <button class="btn btn-outline" onclick="mostrarTela('homeClienteScreen')">← Voltar</button>
    </div>`;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== CRIAR POST (CORRIGIDO) =====
// ==========================================================

async function criarPost() {
    console.log('📝 Iniciando criação de post...');
    console.log('👤 Barbeiro logado:', barbeiroLogado);
    
    if (!barbeiroLogado) {
        mostrarToast('❌ Faça login como barbeiro!', 'error');
        return;
    }

    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var descricao = document.getElementById('postDescricao').value.trim();
    var imagem = document.getElementById('postImagem').value || '';
    var video = document.getElementById('postVideo').value || '';

    console.log('📋 Dados:', { titulo, preco, descricao, temImagem: !!imagem, temVideo: !!video });

    if (!titulo) {
        mostrarToast('❌ Digite um título!', 'error');
        return;
    }
    if (!preco || preco <= 0) {
        mostrarToast('❌ Digite um preço válido!', 'error');
        return;
    }

    try {
        var postId = Date.now().toString();
        var post = {
            id: postId,
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo: titulo,
            preco: preco,
            imagem: imagem,
            video: video,
            descricao: descricao,
            likes: 0,
            comentarios: [],
            dataCriacao: new Date().toISOString()
        };

        console.log('💾 Salvando no Firebase...');
        await db.collection('posts').doc(postId).set(post);
        console.log('✅ Post salvo com sucesso! ID:', postId);
        
        mostrarToast('✅ Post publicado com sucesso!', 'success');
        
        // Limpar campos
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postDescricao').value = '';
        removerImagem();
        removerVideo();
        
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro ao publicar:', error);
        console.error('❌ Código:', error.code);
        console.error('❌ Mensagem:', error.message);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== UPLOAD IMAGEM/VIDEO POST =====
// ==========================================================

function previewImagem(event) {
    var file = event.target.files[0];
    if (!file) return;
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
    var file = event.target.files[0];
    if (!file) return;
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
    if (!clienteLogado) {
        mostrarToast('❌ Faça login!', 'error');
        return;
    }
    var data = document.getElementById('agendamentoData').value;
    var horario = document.getElementById('agendamentoHorario').value;
    var tipo = document.getElementById('agendamentoTipo').value;
    if (!data) {
        mostrarToast('❌ Selecione uma data!', 'error');
        return;
    }
    try {
        var id = Date.now().toString();
        await db.collection('agendamentos').doc(id).set({
            id: id,
            clienteId: clienteLogado.id,
            clienteNome: clienteLogado.nome,
            clienteEmail: clienteLogado.email,
            data: data,
            horario: horario,
            tipo: tipo,
            status: 'pendente',
            dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Agendado!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeClienteScreen');
    } catch (e) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var c = document.getElementById('agendaClienteContainer');
    if (!c) return;
    try {
        const snap = await db.collection('agendamentos').where('clienteId', '==', clienteLogado.id).get();
        var ag = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ag.length === 0) {
            c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
            return;
        }
        ag.sort((a,b) => new Date(b.data+' '+b.horario) - new Date(a.data+' '+a.horario));
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">${a.tipo}</div><div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div></div><span class="agenda-status ${sc}">${st}</span></div>`;
        }).join('');
    } catch (e) {}
}

// ==========================================================
// ===== GALERIA =====
// ==========================================================

async function carregarGaleria() {
    var c = document.getElementById('galeriaContainer');
    if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        filtrarGaleria();
    } catch (e) {
        c.innerHTML = '<p style="color:#EF4444;text-align:center;">Erro</p>';
    }
}

function filtrarGaleria() {
    var cat = document.getElementById('filtroCategoria').value;
    var c = document.getElementById('galeriaContainer');
    var filtrados = cat === 'todos' ? todosPosts : todosPosts.filter(p => p.titulo === cat);
    if (filtrados.length === 0) {
        c.innerHTML = '<p style="color:#6B7280;text-align:center;grid-column:1/-1;">Nenhum corte</p>';
        return;
    }
    c.innerHTML = filtrados.map(function(post) {
        return `<div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
            ${post.imagem ? `<img src="${post.imagem}" class="galeria-item-image" alt="${post.titulo}">` : `<div class="galeria-item-image" style="background:linear-gradient(135deg,#1A1A1A,#2D2D2D);display:flex;align-items:center;justify-content:center;font-size:40px;">✂️</div>`}
            <div class="galeria-item-info">
                <div class="galeria-item-title">${post.titulo}</div>
                <div class="galeria-item-price">R$ ${post.preco?post.preco.toFixed(2):'0,00'}</div>
                ${post.video ? '<span style="font-size:11px;color:var(--primary);">🎬 Vídeo</span>' : ''}
            </div>
        </div>`;
    }).join('');
}

function verDetalheCorte(postId) {
    var post = todosPosts.find(p => p.id === postId);
    if (!post) return;
    document.getElementById('detalhePostConteudo').innerHTML = `<div class="card">
        <h3>${post.titulo}</h3>
        ${post.video ? `<video controls style="width:100%;border-radius:12px;margin:10px 0;"><source src="${post.video}" type="video/mp4"></video>` : post.imagem ? `<img src="${post.imagem}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin:10px 0;">` : ''}
        <p style="font-size:24px;color:var(--primary);">R$ ${post.preco?post.preco.toFixed(2):'0,00'}</p>
        <p style="color:#B0B0B0;">${post.descricao||''}</p>
        <button class="btn btn-primary" onclick="agendarPorPost()">✂️ AGENDAR</button>
        <button class="btn btn-outline" onclick="mostrarTela('galeriaCortesScreen')">← Voltar</button>
    </div>`;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== REELS =====
// ==========================================================

async function carregarReels() {
    var c = document.getElementById('reelsContainer');
    if (!c) return;
    try {
        const snap = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosReels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (todosReels.length === 0) {
            c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:40px;">Nenhum reel</p>';
            return;
        }
        reelsAtual = 0;
        exibirReel(0);
    } catch (e) {}
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    var post = todosReels[index];
    document.getElementById('reelsContainer').innerHTML = `<div class="reel-item">
        ${post.video ? `<video src="${post.video}" autoplay loop muted playsinline></video>` : post.imagem ? `<img src="${post.imagem}" class="reel-item-image">` : '<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>'}
        <div class="reel-item-overlay">
            <div class="reel-item-title">${post.titulo}</div>
            <div class="reel-item-price">R$ ${post.preco?post.preco.toFixed(2):'0,00'}</div>
        </div>
        <div class="reel-item-actions">
            <button onclick="likeReel(this)">❤️</button>
            <button onclick="agendarPorPost()">✂️</button>
        </div>
    </div>`;
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
    try {
        await db.collection('clientes').doc(clienteLogado.id).update({ nome: n, celular: c });
        clienteLogado.nome = n;
        clienteLogado.celular = c;
        salvarSessao('cliente', clienteLogado);
        mostrarToast('✅ Atualizado!', 'success');
        carregarPerfilCliente();
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
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
    try {
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome: n, celular: c, email: e });
        barbeiroLogado.nome = n;
        barbeiroLogado.celular = c;
        barbeiroLogado.email = e;
        salvarSessao('barbeiro', barbeiroLogado);
        mostrarToast('✅ Atualizado!', 'success');
        carregarPerfilBarbeiro();
    } catch (er) { mostrarToast('❌ Erro!', 'error'); }
}

function uploadFotoCliente(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var av = document.getElementById('perfilClienteAvatar'); if (av) { var img = av.querySelector('img'); if (img) img.src = foto; }
        clienteLogado.fotoPerfil = foto;
        await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
        salvarSessao('cliente', clienteLogado);
        mostrarToast('✅ Foto atualizada!', 'success');
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
        salvarSessao('barbeiro', barbeiroLogado);
        mostrarToast('✅ Foto atualizada!', 'success');
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
        ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => {
            var cb = document.getElementById('dia'+d); if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(d.toLowerCase());
        });
        document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio;
        document.getElementById('horarioFim').value = horariosTrabalho.horarioFim;
        document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes;
        carregarFolgas();
    } catch (e) {}
}

function carregarFolgas() {
    var c = document.getElementById('folgasContainer'); if (!c) return;
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) {
        c.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhuma folga</p>'; return;
    }
    c.innerHTML = horariosTrabalho.folgas.map((f,i) => `<div class="folga-item"><span>🏖️ ${new Date(f).toLocaleDateString('pt-BR')}</span><button onclick="removerFolga(${i})">❌</button></div>`).join('');
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
    ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(d => {
        var cb = document.getElementById('dia'+d); if (cb && cb.checked) dias.push(d.toLowerCase());
    });
    horariosTrabalho.diasTrabalho = dias;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    try {
        await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho);
        mostrarToast('✅ Salvos!', 'success');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
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
    if (id === 'homeBarbeiroScreen') { carregarAgendamentosBarbeiro(); carregarPlanos(); calcularFaturamento(); }
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
