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

// ==========================================================
// ===== CORREÇÃO: CRIAR POSTS PADRÃO PARA O BARBEIRO =====
// ==========================================================

async function criarPostsPadraoParaBarbeiro() {
    if (!barbeiroLogado) return;
    
    try {
        // Verificar se já existem posts deste barbeiro
        const snapshot = await db.collection('posts')
            .where('barbeiroId', '==', barbeiroLogado.id)
            .get();
        
        if (!snapshot.empty) {
            console.log('📸 Barbeiro já tem posts');
            return;
        }
        
        console.log('📝 Criando posts padrão para o barbeiro...');
        
        var posts = [
            {
                barbeiroId: barbeiroLogado.id,
                titulo: 'Corte Social',
                preco: 35.00,
                imagem: '',
                video: '',
                descricao: 'Corte social com acabamento perfeito.',
                likes: 0,
                comentarios: [],
                dataCriacao: new Date().toISOString()
            },
            {
                barbeiroId: barbeiroLogado.id,
                titulo: 'Corte Degradê',
                preco: 45.00,
                imagem: '',
                video: '',
                descricao: 'Degradê moderno com máquina e tesoura.',
                likes: 0,
                comentarios: [],
                dataCriacao: new Date().toISOString()
            },
            {
                barbeiroId: barbeiroLogado.id,
                titulo: 'Barba',
                preco: 25.00,
                imagem: '',
                video: '',
                descricao: 'Barba completa com toalha quente.',
                likes: 0,
                comentarios: [],
                dataCriacao: new Date().toISOString()
            },
            {
                barbeiroId: barbeiroLogado.id,
                titulo: 'Barba + Corte',
                preco: 55.00,
                imagem: '',
                video: '',
                descricao: 'Combo completo: corte + barba.',
                likes: 0,
                comentarios: [],
                dataCriacao: new Date().toISOString()
            }
        ];
        
        for (var post of posts) {
            var postId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            await db.collection('posts').doc(postId).set({
                id: postId,
                ...post
            });
        }
        
        console.log('✅ Posts padrão criados para o barbeiro!');
        
    } catch (error) {
        console.error('❌ Erro ao criar posts padrão:', error);
    }
}

// ==========================================================
// ===== CORREÇÃO: CRIAR POST (VINCULADO AO BARBEIRO) =====
// ==========================================================

async function criarPost() {
    if (!barbeiroLogado) {
        mostrarToast('❌ Faça login como barbeiro!', 'error');
        return;
    }

    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var descricao = document.getElementById('postDescricao').value.trim();
    var imagem = document.getElementById('postImagem').value || '';
    var video = document.getElementById('postVideo').value || '';

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

        await db.collection('posts').doc(postId).set(post);
        
        mostrarToast('✅ Post publicado com sucesso!', 'success');
        
        // Limpar campos
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postDescricao').value = '';
        removerImagem();
        removerVideo();
        
        // Recarregar feed e voltar
        carregarFeedCliente();
        mostrarTela('homeBarbeiroScreen');
        
    } catch (error) {
        console.error('❌ Erro ao criar post:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CORREÇÃO: CARREGAR FEED (TODOS OS POSTS) =====
// ==========================================================

async function carregarFeedCliente() {
    var container = document.getElementById('feedClienteContainer');
    if (!container) return;

    try {
        // Buscar TODOS os posts de TODOS os barbeiros
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        var posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3><p style="color:#6B7280;">Aguarde novos cortes!</p></div>';
            return;
        }

        container.innerHTML = posts.map(function(post) {
            var servicoIcones = {
                'Corte Social': '💇', 'Corte Degradê': '✂️', 'Corte Navalhado': '🔪',
                'Corte Máquina': '⚡', 'Barba': '🧔', 'Barba + Corte': '✨',
                'Pintura': '🎨', 'Luzes': '💡', 'Platinado': '⭐',
                'Selagem': '💧', 'Progressiva': '🌟'
            };
            var icone = servicoIcones[post.titulo] || '✂️';
            
            return `
                <div class="feed-post">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">${post.barbeiroNome || 'Barbearia RM'}</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : 
                      `<div class="feed-card-image">${icone}</div>`}
                    ${post.video ? `<video class="feed-post-video" controls><source src="${post.video}" type="video/mp4"></video>` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                        <div class="feed-post-desc">${post.descricao || ''}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button onclick="likePost('${post.id}', this)">❤️ <span class="count">${post.likes || 0}</span></button>
                        <button onclick="agendarPorPost('${post.id}')">✂️ Agendar</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar feed:', error);
        container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><p style="color:#EF4444;">Erro ao carregar feed</p></div>';
    }
}

// ==========================================================
// ===== CORREÇÃO: CARREGAR POSTS DO BARBEIRO LOGADO =====
// ==========================================================

async function carregarPostsDoBarbeiro() {
    if (!barbeiroLogado) return;
    
    try {
        const snapshot = await db.collection('posts')
            .where('barbeiroId', '==', barbeiroLogado.id)
            .orderBy('dataCriacao', 'desc')
            .get();

        var posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📸 Posts do barbeiro:', posts.length);
        
        return posts;
    } catch (error) {
        console.error('❌ Erro ao carregar posts do barbeiro:', error);
        return [];
    }
}

// ==========================================================
// ===== CORREÇÃO: GALERIA (TODOS OS POSTS) =====
// ==========================================================

async function carregarGaleria() {
    var container = document.getElementById('galeriaContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        todosPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filtrarGaleria();
        
    } catch (error) {
        console.error('❌ Erro galeria:', error);
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

function filtrarGaleria() {
    var categoria = document.getElementById('filtroCategoria').value;
    var container = document.getElementById('galeriaContainer');
    
    var postsFiltrados = categoria === 'todos' 
        ? todosPosts 
        : todosPosts.filter(function(p) { return p.titulo === categoria; });
    
    if (postsFiltrados.length === 0) {
        container.innerHTML = '<p style="color:#6B7280; text-align:center; grid-column:1/-1;">Nenhum corte encontrado</p>';
        return;
    }
    
    var servicoIcones = {
        'Corte Social': '💇', 'Corte Degradê': '✂️', 'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡', 'Barba': '🧔', 'Barba + Corte': '✨',
        'Pintura': '🎨', 'Luzes': '💡', 'Platinado': '⭐',
        'Selagem': '💧', 'Progressiva': '🌟'
    };
    
    container.innerHTML = postsFiltrados.map(function(post) {
        var icone = servicoIcones[post.titulo] || '✂️';
        return `
            <div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
                ${post.imagem ? 
                    `<img src="${post.imagem}" class="galeria-item-image" alt="${post.titulo}">` :
                    `<div class="galeria-item-image">${icone}</div>`
                }
                <div class="galeria-item-info">
                    <div class="galeria-item-title">${post.titulo}</div>
                    <div class="galeria-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================================
// ===== CORREÇÃO: REELS (TODOS OS POSTS) =====
// ==========================================================

async function carregarReels() {
    var container = document.getElementById('reelsContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        todosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (todosReels.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:40px;">Nenhum reel disponível</p>';
            return;
        }
        
        reelsAtual = 0;
        exibirReel(0);
        
    } catch (error) {
        console.error('❌ Erro reels:', error);
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    
    var container = document.getElementById('reelsContainer');
    var post = todosReels[index];
    
    var servicoIcones = {
        'Corte Social': '💇', 'Corte Degradê': '✂️', 'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡', 'Barba': '🧔', 'Barba + Corte': '✨',
        'Pintura': '🎨', 'Luzes': '💡', 'Platinado': '⭐',
        'Selagem': '💧', 'Progressiva': '🌟'
    };
    var icone = servicoIcones[post.titulo] || '✂️';
    
    container.innerHTML = `
        <div class="reel-item">
            ${post.video ? 
                `<video src="${post.video}" autoplay loop muted playsinline></video>` :
                post.imagem ? 
                `<img src="${post.imagem}" class="reel-item-image" alt="${post.titulo}">` :
                `<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;background:linear-gradient(135deg,#1A1A1A,#2D2D2D);">${icone}</div>`
            }
            <div class="reel-item-overlay">
                <div class="reel-item-title">${post.titulo}</div>
                <div class="reel-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
            </div>
            <div class="reel-item-actions">
                <button onclick="likeReel('${post.id}', this)" title="Curtir">❤️</button>
                <button onclick="agendarPorReel('${post.id}')" title="Agendar">✂️</button>
            </div>
        </div>
    `;
}

function reelAnterior() {
    if (reelsAtual > 0) {
        reelsAtual--;
        exibirReel(reelsAtual);
    }
}

function reelProximo() {
    if (reelsAtual < todosReels.length - 1) {
        reelsAtual++;
        exibirReel(reelsAtual);
    }
}

function likeReel(postId, btn) {
    btn.classList.toggle('liked');
    mostrarToast('❤️ Curtido!', 'success');
}

function agendarPorReel(postId) {
    mostrarTela('agendamentoScreen');
}

function agendarPorPost(postId) {
    mostrarTela('agendamentoScreen');
}

function likePost(postId, btn) {
    btn.classList.toggle('liked');
    var count = btn.querySelector('.count');
    var current = parseInt(count.textContent);
    count.textContent = btn.classList.contains('liked') ? current + 1 : current - 1;
}

// ==========================================================
// ===== CORREÇÃO: ATUALIZAR HOME BARBEIRO =====
// ==========================================================

// Modificar a função mostrarTela para criar posts padrão quando o barbeiro logar
var mostrarTelaOriginal = mostrarTela;
mostrarTela = function(id) {
    mostrarTelaOriginal(id);
    
    if (id === 'homeBarbeiroScreen' && barbeiroLogado) {
        // Criar posts padrão para o barbeiro se não tiver nenhum
        setTimeout(function() {
            criarPostsPadraoParaBarbeiro().then(function() {
                carregarFeedCliente();
            });
        }, 500);
    }
};

// ==========================================================
// ===== FUNÇÕES AUXILIARES =====
// ==========================================================

function verDetalheCorte(postId) {
    var post = todosPosts.find(function(p) { return p.id === postId; });
    if (!post) return;
    
    var servicoIcones = {
        'Corte Social': '💇', 'Corte Degradê': '✂️', 'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡', 'Barba': '🧔', 'Barba + Corte': '✨',
        'Pintura': '🎨', 'Luzes': '💡', 'Platinado': '⭐',
        'Selagem': '💧', 'Progressiva': '🌟'
    };
    var icone = servicoIcones[post.titulo] || '✂️';
    
    var conteudo = document.getElementById('detalhePostConteudo');
    conteudo.innerHTML = `
        <div class="card">
            <h3>${icone} ${post.titulo}</h3>
            ${post.imagem ? `<img src="${post.imagem}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin:10px 0;">` : ''}
            ${post.video ? `<video controls style="width:100%;border-radius:12px;margin:10px 0;"><source src="${post.video}" type="video/mp4"></video>` : ''}
            <p style="font-size:24px;color:var(--primary);font-weight:700;">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</p>
            <p style="color:#B0B0B0;">${post.descricao || ''}</p>
            <button class="btn btn-primary" onclick="agendarPorPost('${post.id}')">✂️ AGENDAR ESTE CORTE</button>
            <button class="btn btn-outline" onclick="mostrarTela('galeriaCortesScreen')">← Voltar</button>
        </div>
    `;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== ATUALIZAR REGRAS DO FIRESTORE =====
// ==========================================================
// Cole isso no Console do Firebase > Firestore > Rules:

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
*/
