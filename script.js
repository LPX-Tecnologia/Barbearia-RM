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

// Inicializar Firebase
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
// ===== FUNÇÃO PARA MANTER LOGIN (LOCALSTORAGE) =====
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
    var sessaoStr = localStorage.getItem('barbeariaRM_sessao');
    if (!sessaoStr) return null;
    
    try {
        var sessao = JSON.parse(sessaoStr);
        var agora = new Date().getTime();
        var diferenca = agora - sessao.timestamp;
        var dias = diferenca / (1000 * 60 * 60 * 24);
        
        // Sessão expira em 30 dias
        if (dias > 30) {
            localStorage.removeItem('barbeariaRM_sessao');
            return null;
        }
        
        return sessao;
    } catch (error) {
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
            const snapshot = await db.collection('clientes')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            
            if (!snapshot.empty) {
                var doc = snapshot.docs[0];
                clienteLogado = { id: doc.id, ...doc.data() };
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                mostrarTela('homeClienteScreen');
                console.log('✅ Sessão cliente restaurada:', clienteLogado.nome);
                return true;
            }
        } else if (sessao.tipo === 'barbeiro') {
            const snapshot = await db.collection('barbeiros')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            
            if (!snapshot.empty) {
                var doc = snapshot.docs[0];
                barbeiroLogado = { id: doc.id, ...doc.data() };
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                mostrarTela('homeBarbeiroScreen');
                console.log('✅ Sessão barbeiro restaurada:', barbeiroLogado.nome);
                return true;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
    }
    
    limparSessao();
    return false;
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================

function mostrarToast(mensagem, tipo) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.className = 'toast ' + (tipo || 'info');
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 3000);
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
        mostrarToast('❌ Senha mínima de 6 caracteres!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('clientes').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var clienteId = Date.now().toString();
        var cliente = {
            id: clienteId,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('clientes').doc(clienteId).set(cliente);
        clienteLogado = cliente;
        
        // SALVAR SESSÃO
        salvarSessao('cliente', cliente);
        
        document.getElementById('welcomeClienteNome').textContent = cliente.nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeClienteScreen');
        
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
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
        mostrarToast('❌ Senha mínima de 6 caracteres!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('barbeiros').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var barbeiroId = Date.now().toString();
        var barbeiro = {
            id: barbeiroId,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('barbeiros').doc(barbeiroId).set(barbeiro);
        barbeiroLogado = barbeiro;
        
        // SALVAR SESSÃO
        salvarSessao('barbeiro', barbeiro);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiro.nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
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
        const snapshot = await db.collection('clientes')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snapshot.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var doc = snapshot.docs[0];
        clienteLogado = { id: doc.id, ...doc.data() };
        
        // SALVAR SESSÃO
        salvarSessao('cliente', clienteLogado);
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
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
        const snapshot = await db.collection('barbeiros')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snapshot.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var doc = snapshot.docs[0];
        barbeiroLogado = { id: doc.id, ...doc.data() };
        
        // SALVAR SESSÃO
        salvarSessao('barbeiro', barbeiroLogado);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGOUT (AGORA LIMPA A SESSÃO) =====
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
// ===== CARREGAR AGENDAMENTOS DO BARBEIRO =====
// ==========================================================

async function carregarAgendamentosBarbeiro() {
    var container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:20px;">Nenhum agendamento</p>';
            return;
        }

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">👤 ${a.clienteNome || 'Cliente'}</div>
                        <div class="agenda-data">📅 ${a.data || 'N/A'} • ⏰ ${a.horario || 'N/A'}</div>
                        <div style="font-size:12px; color:#6B7280;">✂️ ${a.tipo || 'Corte'}</div>
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <span class="agenda-status ${statusClass}">${statusText}</span>
                        ${a.status === 'pendente' ? 
                            `<button class="btn btn-small btn-success" onclick="confirmarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">✅</button>
                             <button class="btn btn-small btn-danger" onclick="cancelarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">❌</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

// ==========================================================
// ===== CONFIRMAR/CANCELAR AGENDAMENTO =====
// ==========================================================

async function confirmarAgendamento(id) {
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
        mostrarToast('✅ Confirmado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (error) {
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
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

// ==========================================================
// ===== CARREGAR PLANOS =====
// ==========================================================

async function carregarPlanos() {
    var container = document.getElementById('planosContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var planos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (planos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:20px;">Nenhum plano criado</p>';
            return;
        }

        container.innerHTML = planos.map(function(p) {
            return `
                <div class="plano-card">
                    <div class="plano-info">
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                        <div style="font-size:12px; color:#6B7280;">${p.descricao || ''}</div>
                        <div class="plano-actions">
                            <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️ Editar</button>
                            <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑</button>
                        </div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco ? p.preco.toFixed(2) : '0,00'}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

// ==========================================================
// ===== CRIAR/EDITAR/EXCLUIR PLANO =====
// ==========================================================

async function criarPlano() {
    if (!barbeiroLogado) return;
    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();
    if (!nome || !preco || preco <= 0) { mostrarToast('❌ Preencha todos os campos!', 'error'); return; }

    try {
        var planoId = Date.now().toString();
        await db.collection('planos').doc(planoId).set({
            id: planoId, barbeiroId: barbeiroLogado.id, nome, periodo, preco, descricao, dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        mostrarTela('homeBarbeiroScreen');
    } catch (error) { mostrarToast('❌ Erro!', 'error'); }
}

function editarPlano(planoId) {
    db.collection('planos').doc(planoId).get().then(function(doc) {
        if (doc.exists) {
            var plano = doc.data();
            document.getElementById('editPlanoId').value = planoId;
            document.getElementById('editPlanoNome').value = plano.nome;
            document.getElementById('editPlanoPeriodo').value = plano.periodo;
            document.getElementById('editPlanoPreco').value = plano.preco;
            document.getElementById('editPlanoDescricao').value = plano.descricao || '';
            mostrarTela('editarPlanoScreen');
        }
    });
}

async function salvarEdicaoPlano() {
    var planoId = document.getElementById('editPlanoId').value;
    try {
        await db.collection('planos').doc(planoId).update({
            nome: document.getElementById('editPlanoNome').value.trim(),
            periodo: document.getElementById('editPlanoPeriodo').value,
            preco: parseFloat(document.getElementById('editPlanoPreco').value),
            descricao: document.getElementById('editPlanoDescricao').value.trim()
        });
        mostrarToast('✅ Plano atualizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (error) { mostrarToast('❌ Erro!', 'error'); }
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
// ===== FATURAMENTO =====
// ==========================================================

async function calcularFaturamento() {
    try {
        const snapshot = await db.collection('agendamentos').where('status', '==', 'confirmado').get();
        var agendamentos = snapshot.docs.map(doc => doc.data());
        var hoje = new Date().toISOString().split('T')[0];
        var valorHoje = 0, valorTotal = 0;
        agendamentos.forEach(function(a) { var v = 35; if (a.data === hoje) valorHoje += v; valorTotal += v; });
        var elHoje = document.getElementById('faturamentoHoje');
        var elSemana = document.getElementById('faturamentoSemana');
        var elMes = document.getElementById('faturamentoMes');
        var elAno = document.getElementById('faturamentoAno');
        if (elHoje) elHoje.textContent = 'R$ ' + valorHoje.toFixed(2);
        if (elSemana) elSemana.textContent = 'R$ ' + (valorTotal * 0.3).toFixed(2);
        if (elMes) elMes.textContent = 'R$ ' + (valorTotal * 0.7).toFixed(2);
        if (elAno) elAno.textContent = 'R$ ' + valorTotal.toFixed(2);
    } catch (error) {}
}

// ==========================================================
// ===== FEED CLIENTE =====
// ==========================================================

async function carregarFeedCliente() {
    var container = document.getElementById('feedClienteContainer');
    if (!container) return;
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        var posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>';
            return;
        }
        container.innerHTML = posts.map(function(post) {
            return `
                <div class="feed-post">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">${post.barbeiroNome || 'Barbearia RM'}</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                        <div class="feed-post-desc">${post.descricao || ''}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button onclick="likePost('${post.id}', this)">❤️ <span class="count">${post.likes || 0}</span></button>
                        <button onclick="agendarPorPost()">✂️ Agendar</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {}
}

// ==========================================================
// ===== CRIAR POST =====
// ==========================================================

async function criarPost() {
    if (!barbeiroLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var descricao = document.getElementById('postDescricao').value.trim();
    if (!titulo || !preco || preco <= 0) { mostrarToast('❌ Preencha título e preço!', 'error'); return; }
    try {
        var postId = Date.now().toString();
        await db.collection('posts').doc(postId).set({
            id: postId, barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo, preco, imagem: imagemBase64, video: videoBase64, descricao,
            likes: 0, comentarios: [], dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Post publicado!', 'success');
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postDescricao').value = '';
        removerImagem(); removerVideo();
        mostrarTela('homeBarbeiroScreen');
    } catch (error) { mostrarToast('❌ Erro!', 'error'); }
}

// ==========================================================
// ===== UPLOAD =====
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
    if (!clienteLogado) { mostrarToast('❌ Faça login!', 'error'); return; }
    var data = document.getElementById('agendamentoData').value;
    var horario = document.getElementById('agendamentoHorario').value;
    var tipo = document.getElementById('agendamentoTipo').value;
    if (!data) { mostrarToast('❌ Selecione uma data!', 'error'); return; }
    try {
        await db.collection('agendamentos').doc(Date.now().toString()).set({
            id: Date.now().toString(), clienteId: clienteLogado.id, clienteNome: clienteLogado.nome,
            clienteEmail: clienteLogado.email, data, horario, tipo, status: 'pendente', dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Agendado!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeClienteScreen');
    } catch (error) { mostrarToast('❌ Erro!', 'error'); }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var container = document.getElementById('agendaClienteContainer');
    if (!container) return;
    try {
        const snapshot = await db.collection('agendamentos').where('clienteId', '==', clienteLogado.id).get();
        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum agendamento</p>';
            return;
        }
        agendamentos.sort(function(a, b) { return new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario); });
        container.innerHTML = agendamentos.map(function(a) {
            var sc = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var st = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">${a.tipo}</div><div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div></div><span class="agenda-status ${sc}">${st}</span></div>`;
        }).join('');
    } catch (error) {}
}

// ==========================================================
// ===== GALERIA =====
// ==========================================================

async function carregarGaleria() {
    var container = document.getElementById('galeriaContainer');
    if (!container) return;
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filtrarGaleria();
    } catch (error) {}
}

function filtrarGaleria() {
    var categoria = document.getElementById('filtroCategoria').value;
    var container = document.getElementById('galeriaContainer');
    var filtrados = categoria === 'todos' ? todosPosts : todosPosts.filter(function(p) { return p.titulo === categoria; });
    if (filtrados.length === 0) {
        container.innerHTML = '<p style="color:#6B7280; text-align:center; grid-column:1/-1;">Nenhum corte</p>';
        return;
    }
    container.innerHTML = filtrados.map(function(post) {
        return `
            <div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
                ${post.imagem ? `<img src="${post.imagem}" class="galeria-item-image">` : '<div class="galeria-item-image">✂️</div>'}
                <div class="galeria-item-info"><div class="galeria-item-title">${post.titulo}</div><div class="galeria-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div></div>
            </div>`;
    }).join('');
}

function verDetalheCorte(postId) {
    var post = todosPosts.find(function(p) { return p.id === postId; });
    if (!post) return;
    document.getElementById('detalhePostConteudo').innerHTML = `
        <div class="card"><h3>${post.titulo}</h3>
        ${post.imagem ? `<img src="${post.imagem}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin:10px 0;">` : ''}
        <p style="font-size:24px;color:var(--primary);">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</p>
        <p style="color:#B0B0B0;">${post.descricao || ''}</p>
        <button class="btn btn-primary" onclick="agendarPorPost()">✂️ AGENDAR</button>
        <button class="btn btn-outline" onclick="mostrarTela('galeriaCortesScreen')">← Voltar</button></div>`;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== REELS =====
// ==========================================================

async function carregarReels() {
    var container = document.getElementById('reelsContainer');
    if (!container) return;
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (todosReels.length === 0) { container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:40px;">Nenhum reel</p>'; return; }
        reelsAtual = 0; exibirReel(0);
    } catch (error) {}
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    var post = todosReels[index];
    document.getElementById('reelsContainer').innerHTML = `
        <div class="reel-item">
            ${post.video ? `<video src="${post.video}" autoplay loop muted playsinline></video>` : post.imagem ? `<img src="${post.imagem}" class="reel-item-image">` : '<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>'}
            <div class="reel-item-overlay"><div class="reel-item-title">${post.titulo}</div><div class="reel-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div></div>
            <div class="reel-item-actions"><button onclick="likeReel(this)">❤️</button><button onclick="agendarPorPost()">✂️</button></div></div>`;
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
    try { await db.collection('clientes').doc(clienteLogado.id).update({ nome: n, celular: c }); clienteLogado.nome = n; clienteLogado.celular = c; salvarSessao('cliente', clienteLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilCliente(); } catch (error) { mostrarToast('❌ Erro!', 'error'); }
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
    try { await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome: n, celular: c, email: e }); barbeiroLogado.nome = n; barbeiroLogado.celular = c; barbeiroLogado.email = e; salvarSessao('barbeiro', barbeiroLogado); mostrarToast('✅ Atualizado!', 'success'); carregarPerfilBarbeiro(); } catch (error) { mostrarToast('❌ Erro!', 'error'); }
}

function uploadFotoCliente(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var avatar = document.getElementById('perfilClienteAvatar'); if (avatar) { var img = avatar.querySelector('img'); if (img) img.src = foto; }
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
        var avatar = document.getElementById('perfilBarbeiroAvatar'); if (avatar) { var img = avatar.querySelector('img'); if (img) img.src = foto; }
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

function filtrarExtrato(tipo) { mostrarToast('📊 Filtrando por ' + tipo, 'info'); }
function copiarPix() { navigator.clipboard.writeText(document.getElementById('pixChave').textContent).then(function() { mostrarToast('✅ PIX copiado!', 'success'); }); }
function fecharPagamento() { mostrarTela('homeClienteScreen'); }

// ==========================================================
// ===== HORÁRIOS =====
// ==========================================================

async function carregarHorarios() {
    if (!barbeiroLogado) return;
    try {
        const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        if (doc.exists) horariosTrabalho = doc.data();
        ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(function(d) { var cb = document.getElementById('dia'+d); if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(d.toLowerCase()); });
        document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio;
        document.getElementById('horarioFim').value = horariosTrabalho.horarioFim;
        document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes;
        carregarFolgas();
    } catch (error) {}
}

function carregarFolgas() {
    var container = document.getElementById('folgasContainer');
    if (!container) return;
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) { container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhuma folga</p>'; return; }
    container.innerHTML = horariosTrabalho.folgas.map(function(f, i) { return `<div class="folga-item"><span>🏖️ ${new Date(f).toLocaleDateString('pt-BR')}</span><button onclick="removerFolga(${i})">❌</button></div>`; }).join('');
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
    ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(function(d) { var cb = document.getElementById('dia'+d); if (cb && cb.checked) dias.push(d.toLowerCase()); });
    horariosTrabalho.diasTrabalho = dias;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    try { await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho); mostrarToast('✅ Salvos!', 'success'); } catch (error) { mostrarToast('❌ Erro!', 'error'); }
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
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
// ===== INICIALIZAÇÃO (VERIFICA SESSÃO SALVA) =====
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Barbearia RM iniciando...');
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    
    // Esconder navs
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    if (nc) nc.style.display = 'none';
    if (nb) nb.style.display = 'none';
    
    // Esconder formulários de login
    var lfc = document.getElementById('loginFormCliente');
    var lfb = document.getElementById('loginFormBarbeiro');
    if (lfc) lfc.style.display = 'none';
    if (lfb) lfb.style.display = 'none';
    
    // TENTAR RESTAURAR SESSÃO
    restaurarSessao().then(function(restaurado) {
        if (!restaurado) {
            // Se não conseguiu restaurar, mostra tela de login
            document.getElementById('loginScreen').classList.add('active');
            console.log('👋 Nenhuma sessão ativa - mostrando login');
        }
    });
    
    console.log('✅ Sistema pronto!');
});
