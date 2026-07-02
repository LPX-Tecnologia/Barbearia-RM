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
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================

function mostrarToast(mensagem, tipo) {
    var toast = document.getElementById('toast');
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
// ===== NAVEGAÇÃO =====
// ==========================================================

function mostrarTela(id) {
    console.log('📱 Mostrando tela:', id);
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // Mostrar a tela desejada
    var el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
    } else {
        console.error('❌ Tela não encontrada:', id);
        return;
    }
    
    // Controle das bottom navs
    var navCliente = document.getElementById('bottomNavCliente');
    var navBarbeiro = document.getElementById('bottomNavBarbeiro');
    
    // Telas de cliente
    var telasCliente = ['homeClienteScreen', 'agendamentoScreen', 'galeriaCortesScreen', 'reelsScreen', 'perfilClienteScreen'];
    // Telas de barbeiro
    var telasBarbeiro = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'criarPlanoScreen', 'editarPlanoScreen', 'horariosTrabalhoScreen', 'perfilBarbeiroScreen'];
    
    if (telasCliente.includes(id)) {
        navCliente.style.display = 'flex';
        navBarbeiro.style.display = 'none';
    } else if (telasBarbeiro.includes(id)) {
        navBarbeiro.style.display = 'flex';
        navCliente.style.display = 'none';
    } else {
        navCliente.style.display = 'none';
        navBarbeiro.style.display = 'none';
    }
    
    // Carregar dados específicos
    if (id === 'homeClienteScreen') {
        carregarFeedCliente();
        carregarAgendaCliente();
    }
    if (id === 'homeBarbeiroScreen') {
        carregarAgendamentosBarbeiro();
        carregarPlanos();
        calcularFaturamento();
    }
    if (id === 'perfilClienteScreen') carregarPerfilCliente();
    if (id === 'perfilBarbeiroScreen') carregarPerfilBarbeiro();
    if (id === 'galeriaCortesScreen') carregarGaleria();
    if (id === 'reelsScreen') carregarReels();
    if (id === 'horariosTrabalhoScreen') carregarHorarios();
    
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== LOGIN - MOSTRAR FORMULÁRIOS =====
// ==========================================================

function mostrarLoginCliente() {
    console.log('👤 Mostrando login cliente');
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    console.log('✂️ Mostrando login barbeiro');
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
        // Verificar se email já existe
        const snapshot = await db.collection('clientes')
            .where('email', '==', email)
            .get();

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
        
        // Logar automaticamente
        clienteLogado = cliente;
        document.getElementById('welcomeClienteNome').textContent = cliente.nome;
        
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeClienteScreen');
        
        // Limpar campos
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
        
    } catch (error) {
        console.error('❌ Erro:', error);
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
        const snapshot = await db.collection('barbeiros')
            .where('email', '==', email)
            .get();

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
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiro.nome;
        
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
        
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN CLIENTE =====
// ==========================================================

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;

    console.log('🔍 Tentando login cliente:', email);

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('clientes')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        console.log('📊 Documentos encontrados:', snapshot.size);

        if (snapshot.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var doc = snapshot.docs[0];
        clienteLogado = { id: doc.id, ...doc.data() };
        
        console.log('✅ Cliente logado:', clienteLogado.nome);
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN BARBEIRO =====
// ==========================================================

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;

    console.log('🔍 Tentando login barbeiro:', email);

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('barbeiros')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        console.log('📊 Documentos encontrados:', snapshot.size);

        if (snapshot.empty) {
            mostrarToast('❌ E-mail ou senha inválidos!', 'error');
            return;
        }

        var doc = snapshot.docs[0];
        barbeiroLogado = { id: doc.id, ...doc.data() };
        
        console.log('✅ Barbeiro logado:', barbeiroLogado.nome);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGOUT =====
// ==========================================================

function sairCliente() {
    clienteLogado = null;
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
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
                            <div class="feed-post-user-name">Barbearia RM</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                        <div class="feed-post-desc">${post.descricao || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro feed:', error);
    }
}

// ==========================================================
// ===== AGENDAMENTO =====
// ==========================================================

async function agendarCorte() {
    if (!clienteLogado) {
        mostrarToast('❌ Faça login primeiro!', 'error');
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
        var agendamento = {
            id: Date.now().toString(),
            clienteId: clienteLogado.id,
            clienteNome: clienteLogado.nome,
            clienteEmail: clienteLogado.email,
            data: data,
            horario: horario,
            tipo: tipo,
            status: 'pendente',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('agendamentos').doc(agendamento.id).set(agendamento);
        mostrarToast('✅ Agendamento realizado!', 'success');
        
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeClienteScreen');
        
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var container = document.getElementById('agendaClienteContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos')
            .where('clienteId', '==', clienteLogado.id)
            .get();

        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum agendamento</p>';
            return;
        }

        agendamentos.sort(function(a, b) {
            return new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario);
        });

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">${a.tipo}</div>
                        <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div>
                    </div>
                    <span class="agenda-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro agenda:', error);
    }
}

// ==========================================================
// ===== PLANOS =====
// ==========================================================

async function criarPlano() {
    if (!barbeiroLogado) return;

    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();

    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        await db.collection('planos').doc(Date.now().toString()).set({
            id: Date.now().toString(),
            barbeiroId: barbeiroLogado.id,
            nome: nome,
            periodo: periodo,
            preco: preco,
            descricao: descricao,
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ Erro ao criar plano!', 'error');
    }
}

async function carregarPlanos() {
    var container = document.getElementById('planosContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var planos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (planos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum plano</p>';
            return;
        }

        container.innerHTML = planos.map(function(p) {
            return `
                <div class="plano-card">
                    <div class="plano-info">
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                        <div class="plano-actions">
                            <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️ Editar</button>
                            <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑</button>
                        </div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro planos:', error);
    }
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
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function excluirPlano() {
    if (!confirm('Excluir este plano?')) return;
    var planoId = document.getElementById('editPlanoId').value;
    await db.collection('planos').doc(planoId).delete();
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
// ===== INICIALIZAÇÃO =====
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Barbearia RM iniciada!');
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // Mostrar tela de login
    document.getElementById('loginScreen').classList.add('active');
    
    // Esconder navs
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    
    // Esconder formulários de login
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    
    console.log('✅ Pronto!');
});
