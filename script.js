// ==========================================================
// ===== CORREÇÃO: LOGIN E CADASTRO =====
// ==========================================================

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

function mostrarCadastroBarbeiro() {
    // Esconde os formulários de login
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    // Mostra a tela de cadastro de barbeiro
    mostrarTela('cadastroBarbeiroScreen');
}

// ==========================================================
// ===== CORREÇÃO: CADASTRO CLIENTE =====
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

    if (!email.includes('@')) {
        mostrarToast('❌ E-mail inválido!', 'error');
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

        // Criar ID único
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

        // Salvar no Firestore
        await db.collection('clientes').doc(clienteId).set(cliente);
        
        // Logar automaticamente
        clienteLogado = cliente;
        document.getElementById('welcomeClienteNome').textContent = cliente.nome;
        document.getElementById('bottomNavCliente').style.display = 'flex';
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
        
        mostrarToast('✅ Cadastro realizado com sucesso!', 'success');
        mostrarTela('homeClienteScreen');
        
        // Limpar campos
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
        
    } catch (error) {
        console.error('❌ Erro ao cadastrar cliente:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CORREÇÃO: CADASTRO BARBEIRO =====
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

    if (!email.includes('@')) {
        mostrarToast('❌ E-mail inválido!', 'error');
        return;
    }

    try {
        // Verificar se email já existe
        const snapshot = await db.collection('barbeiros')
            .where('email', '==', email)
            .get();

        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado como barbeiro!', 'error');
            return;
        }

        // Criar ID único
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

        // Salvar no Firestore
        await db.collection('barbeiros').doc(barbeiroId).set(barbeiro);
        
        // Logar automaticamente
        barbeiroLogado = barbeiro;
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiro.nome;
        document.getElementById('bottomNavBarbeiro').style.display = 'flex';
        document.getElementById('bottomNavCliente').style.display = 'none';
        
        mostrarToast('✅ Cadastro de barbeiro realizado com sucesso!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        // Limpar campos
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
        
    } catch (error) {
        console.error('❌ Erro ao cadastrar barbeiro:', error);
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CORREÇÃO: LOGIN CLIENTE =====
// ==========================================================

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        console.log('🔍 Buscando cliente com email:', email);
        
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
        
        console.log('✅ Cliente logado:', clienteLogado);
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('bottomNavCliente').style.display = 'flex';
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
        
        // Limpar campos de login
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
        
    } catch (error) {
        console.error('❌ Erro no login cliente:', error);
        mostrarToast('❌ Erro ao fazer login: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CORREÇÃO: LOGIN BARBEIRO =====
// ==========================================================

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;

    if (!email || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        console.log('🔍 Buscando barbeiro com email:', email);
        
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
        
        console.log('✅ Barbeiro logado:', barbeiroLogado);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('bottomNavBarbeiro').style.display = 'flex';
        document.getElementById('bottomNavCliente').style.display = 'none';
        
        // Limpar campos de login
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
    } catch (error) {
        console.error('❌ Erro no login barbeiro:', error);
        mostrarToast('❌ Erro ao fazer login: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CORREÇÃO: LOGOUT =====
// ==========================================================

function sairCliente() {
    clienteLogado = null;
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== CORREÇÃO: MOSTRAR TELA =====
// ==========================================================

function mostrarTela(id) {
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
    
    // Atualizar navegação inferior
    if (id === 'homeClienteScreen' || id === 'agendamentoScreen' || 
        id === 'galeriaCortesScreen' || id === 'reelsScreen' || 
        id === 'perfilClienteScreen') {
        document.getElementById('bottomNavCliente').style.display = 'flex';
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
    } else if (id === 'homeBarbeiroScreen' || id === 'criarPostScreen' || 
               id === 'extratoScreen' || id === 'criarPlanoScreen' || 
               id === 'editarPlanoScreen' || id === 'horariosTrabalhoScreen' || 
               id === 'perfilBarbeiroScreen') {
        document.getElementById('bottomNavBarbeiro').style.display = 'flex';
        document.getElementById('bottomNavCliente').style.display = 'none';
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
    
    // Scroll para o topo
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== INICIALIZAÇÃO CORRIGIDA =====
// ==========================================================

// Garantir que a tela de login apareça primeiro
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Barbearia RM...');
    
    // Esconder todas as telas primeiro
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // Mostrar apenas a tela de login
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.classList.add('active');
    }
    
    // Esconder as navs
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    
    // Esconder formulários de login
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    
    console.log('✅ Sistema inicializado!');
});
