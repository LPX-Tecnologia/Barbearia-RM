// =============================================================
// ===== CONFIGURAÇÃO DO FIREBASE =====
// =============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",
    authDomain: "barbearia-rm.firebaseapp.com",
    projectId: "barbearia-rm",
    storageBucket: "barbearia-rm.firebasestorage.app",
    messagingSenderId: "512819922057",
    appId: "1:512819922057:web:6a913791cb6435e4f63258",
    measurementId: "G-TKVLVLPBJH"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =============================================================
// ===== FUNÇÕES DO BANCO DE DADOS (FIREBASE) =====
// =============================================================

// SALVAR AGENDAMENTO
async function salvarAgendamentoFirebase(agendamento) {
    try {
        const docRef = await db.collection('agendamentos').add({
            clienteId: agendamento.clienteId,
            clienteNome: agendamento.clienteNome,
            clienteCelular: agendamento.clienteCelular || '',
            data: agendamento.data,
            horario: agendamento.horario,
            tipo: agendamento.tipo,
            status: 'confirmado',
            dataAgendamento: new Date().toISOString()
        });
        return { sucesso: true, id: docRef.id };
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        return { sucesso: false, erro: error.message };
    }
}

// BUSCAR TODOS OS AGENDAMENTOS (para o barbeiro)
async function buscarAgendamentosFirebase() {
    try {
        const snapshot = await db.collection('agendamentos')
            .where('status', '!=', 'cancelado')
            .orderBy('data')
            .orderBy('horario')
            .get();
        
        const agendamentos = [];
        snapshot.forEach(doc => {
            agendamentos.push({ id: doc.id, ...doc.data() });
        });
        return agendamentos;
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return [];
    }
}

// BUSCAR AGENDAMENTOS DE UM CLIENTE ESPECÍFICO
async function buscarAgendamentosClienteFirebase(clienteId) {
    try {
        const snapshot = await db.collection('agendamentos')
            .where('clienteId', '==', clienteId)
            .where('status', '!=', 'cancelado')
            .orderBy('data')
            .orderBy('horario')
            .get();
        
        const agendamentos = [];
        snapshot.forEach(doc => {
            agendamentos.push({ id: doc.id, ...doc.data() });
        });
        return agendamentos;
    } catch (error) {
        console.error('Erro ao buscar agendamentos do cliente:', error);
        return [];
    }
}

// CANCELAR AGENDAMENTO
async function cancelarAgendamentoFirebase(id) {
    try {
        await db.collection('agendamentos').doc(id).update({
            status: 'cancelado',
            dataCancelamento: new Date().toISOString()
        });
        return { sucesso: true };
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        return { sucesso: false, erro: error.message };
    }
}

// ESCUTAR MUDANÇAS EM TEMPO REAL (para o barbeiro)
let unsubscribeAgendamentos = null;

function ouvirAgendamentosFirebase(callback) {
    if (unsubscribeAgendamentos) {
        unsubscribeAgendamentos();
    }
    
    unsubscribeAgendamentos = db.collection('agendamentos')
        .where('status', '!=', 'cancelado')
        .orderBy('data')
        .orderBy('horario')
        .onSnapshot((snapshot) => {
            const agendamentos = [];
            snapshot.forEach(doc => {
                agendamentos.push({ id: doc.id, ...doc.data() });
            });
            callback(agendamentos);
        }, (error) => {
            console.error('Erro ao ouvir agendamentos:', error);
        });
    
    return unsubscribeAgendamentos;
}

// =============================================================
// ===== SEGURANÇA - Sanitização de Dados =====
// =============================================================

function sanitizar(texto) {
    if (!texto) return '';
    const mapa = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '=': '&#x3D;',
        '`': '&#x60;'
    };
    return String(texto).replace(/[&<>"'/=`]/g, function(s) {
        return mapa[s];
    });
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarSenha(senha) {
    return senha && senha.length >= 6;
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// =============================================================
// ===== LOCAL STORAGE (PARA DADOS QUE NÃO PRECISAM COMPARTILHAR) =====
// =============================================================

function salvarDados(chave, dados) {
    try {
        localStorage.setItem(chave, JSON.stringify(dados));
    } catch (e) {
        console.error('Erro ao salvar:', e);
    }
}

function carregarDados(chave) {
    try {
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : null;
    } catch (e) {
        console.error('Erro ao carregar:', e);
        return null;
    }
}

// =============================================================
// ===== DADOS INICIAIS (LOCAL) =====
// =============================================================

if (!carregarDados('clientes')) {
    salvarDados('clientes', []);
}

if (!carregarDados('barbeiros')) {
    salvarDados('barbeiros', [
        {
            id: 'barbeiro1',
            nome: 'Rafael Mendes',
            email: 'barbeiro@barbeariarm.com',
            celular: '11999990000',
            senha: '123456',
            foto: ''
        }
    ]);
}

if (!carregarDados('posts')) {
    salvarDados('posts', [
        {
            id: 'post1',
            titulo: 'Corte Degradê Navalhado',
            preco: 45.00,
            imagem: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500',
            video: '',
            descricao: 'Corte degradê com navalha, acabamento perfeito e linha marcada.',
            data: new Date().toISOString(),
            barbeiroId: 'barbeiro1',
            curtidas: [],
            comentarios: []
        },
        {
            id: 'post2',
            titulo: 'Barba e Corte Social',
            preco: 70.00,
            imagem: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500',
            video: '',
            descricao: 'Pacote completo: corte social + barba feita com toalha quente.',
            data: new Date().toISOString(),
            barbeiroId: 'barbeiro1',
            curtidas: [],
            comentarios: []
        }
    ]);
}

if (!carregarDados('planos')) {
    salvarDados('planos', [
        {
            id: 'plano1',
            nome: 'Plano Mensal',
            periodo: 'mensal',
            preco: 150.00,
            descricao: '1 corte por mês + barba grátis'
        },
        {
            id: 'plano2',
            nome: 'Plano Trimestral',
            periodo: 'trimestral',
            preco: 400.00,
            descricao: '1 corte por mês + 1 barba + 1 luzes'
        }
    ]);
}

if (!carregarDados('pagamentos')) {
    salvarDados('pagamentos', []);
}

// =============================================================
// ===== NOTIFICAÇÕES DIÁRIAS =====
// =============================================================

function iniciarNotificacoesDiarias() {
    const ultimaNotificacao = localStorage.getItem('ultimaNotificacao');
    const hoje = new Date().toDateString();

    if (ultimaNotificacao !== hoje) {
        setTimeout(() => {
            enviarNotificacao();
            localStorage.setItem('ultimaNotificacao', hoje);
        }, 5000);
    }

    setInterval(() => {
        const hoje2 = new Date().toDateString();
        const ultima = localStorage.getItem('ultimaNotificacao');
        if (ultima !== hoje2) {
            enviarNotificacao();
            localStorage.setItem('ultimaNotificacao', hoje2);
        }
    }, 3600000);
}

function enviarNotificacao() {
    if (!("Notification" in window)) {
        console.log("Este navegador não suporta notificações");
        return;
    }

    if (Notification.permission === "default") {
        Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
        const mensagens = [
            "✂️ Não perca tempo! Agende seu corte hoje mesmo na Barbearia RM!",
            "💈 Novidade! Plano Mensal com 20% de desconto na Barbearia RM!",
            "✂️ Corte + Barba por apenas R$ 60,00 na Barbearia RM! Agende já!",
            "💈 Promoção relâmpago! 30% off em qualquer corte hoje!",
            "✂️ Seu estilo merece o melhor. Agende na Barbearia RM agora!"
        ];

        const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];

        const notificacao = new Notification("✂️ Barbearia RM", {
            body: mensagem,
            icon: "https://i.ibb.co/TqKjX8xx/logobarbearia-rm.jpg",
            tag: "barbearia-rm",
            requireInteraction: true
        });

        notificacao.onclick = function() {
            window.focus();
            if (tipoUsuario === 'cliente' || tipoUsuario === 'barbeiro') {
                mostrarTela('homeClienteScreen');
            }
            this.close();
        };
    }
}

// =============================================================
// ===== LOCALIZAÇÃO =====
// =============================================================

function abrirLocalizacao() {
    const endereco = "Rua das Barbearias, 123 - Centro, São Paulo - SP";
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
}

// =============================================================
// ===== VARIÁVEIS GLOBAIS =====
// =============================================================

let usuarioLogado = null;
let tipoUsuario = null;
let postSelecionado = null;
let extratoFiltro = 'todos';

// =============================================================
// ===== CONTROLE DE TELAS =====
// =============================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('active');

    const navCliente = document.getElementById('bottomNavCliente');
    const navBarbeiro = document.getElementById('bottomNavBarbeiro');

    if (navCliente) navCliente.style.display = 'none';
    if (navBarbeiro) navBarbeiro.style.display = 'none';

    if (tipoUsuario === 'cliente' && ['homeClienteScreen', 'agendamentoScreen', 'perfilClienteScreen'].includes(id)) {
        if (navCliente) navCliente.style.display = 'flex';
    }

    if (tipoUsuario === 'barbeiro' && ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'perfilBarbeiroScreen'].includes(id)) {
        if (navBarbeiro) navBarbeiro.style.display = 'flex';
    }

    if (id === 'homeClienteScreen') {
        carregarFeedCliente();
        carregarAgendaCliente();
        document.getElementById('welcomeClienteNome').textContent = usuarioLogado?.nome || 'Cliente';
    }
    if (id === 'homeBarbeiroScreen') {
        carregarFeedBarbeiro();
        carregarAgendamentosBarbeiro();
        carregarPlanos();
        carregarFaturamento();
        document.getElementById('welcomeBarbeiroNome').textContent = usuarioLogado?.nome || 'Barbeiro';
    }
    if (id === 'extratoScreen') {
        carregarExtrato();
    }
    if (id === 'perfilClienteScreen') {
        carregarPerfilCliente();
    }
    if (id === 'perfilBarbeiroScreen') {
        carregarPerfilBarbeiro();
    }
}

function mostrarToast(mensagem, tipo = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? 'rgba(239, 68, 68, 0.9)' : tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(31, 41, 55, 0.9)';
    toast.style.display = 'block';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// =============================================================
// ===== LOGIN =====
// =============================================================

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

function loginCliente() {
    const email = sanitizar(document.getElementById('loginEmailCliente').value.trim());
    const senha = document.getElementById('loginSenhaCliente').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    const clientes = carregarDados('clientes') || [];
    const cliente = clientes.find(c => c.email === email && c.senha === senha);

    if (cliente) {
        usuarioLogado = cliente;
        tipoUsuario = 'cliente';
        mostrarToast('👋 Bem-vindo, ' + cliente.nome + '!', 'sucesso');
        mostrarTela('homeClienteScreen');
        setTimeout(() => {
            mostrarToast('✂️ Agende seu corte agora mesmo!', '');
        }, 1500);
    } else {
        mostrarToast('E-mail ou senha inválidos!', 'erro');
    }
}

function loginBarbeiro() {
    console.log('✅ Botão ENTRAR foi clicado!');
    
    var email = document.getElementById('loginEmailBarbeiro').value;
    var senha = document.getElementById('loginSenhaBarbeiro').value;
    
    console.log('📧 Email:', email);
    console.log('🔒 Senha:', senha);
    
    if (!email || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    // Dados fixos para teste (se não houver no localStorage)
    var barbeiros = carregarDados('barbeiros');
    
    if (!barbeiros || barbeiros.length === 0) {
        // Cria o barbeiro padrão se não existir
        barbeiros = [{
            id: 'barbeiro1',
            nome: 'Rafael Mendes',
            email: 'barbeiro@barbeariarm.com',
            celular: '11999990000',
            senha: '123456',
            foto: ''
        }];
        salvarDados('barbeiros', barbeiros);
        console.log('✅ Barbeiro padrão criado!');
    }
    
    var encontrado = null;
    for (var i = 0; i < barbeiros.length; i++) {
        if (barbeiros[i].email === email && barbeiros[i].senha === senha) {
            encontrado = barbeiros[i];
            break;
        }
    }
    
    console.log('👤 Barbeiro encontrado:', encontrado);
    
    if (encontrado) {
        usuarioLogado = encontrado;
        tipoUsuario = 'barbeiro';
        salvarDados('usuarioLogado', encontrado);
        alert('✅ Bem-vindo, ' + encontrado.nome + '!');
        mostrarTela('homeBarbeiroScreen');
    } else {
        alert('❌ E-mail ou senha inválidos!\n\nUse:\nE-mail: barbeiro@barbeariarm.com\nSenha: 123456');
    }
}

function cadastrarCliente() {
    const nome = sanitizar(document.getElementById('cadNomeCliente').value.trim());
    const email = sanitizar(document.getElementById('cadEmailCliente').value.trim());
    const celular = sanitizar(document.getElementById('cadCelularCliente').value.trim());
    const senha = document.getElementById('cadSenhaCliente').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    if (!validarEmail(email)) {
        mostrarToast('E-mail inválido!', 'erro');
        return;
    }

    if (!validarSenha(senha)) {
        mostrarToast('Senha deve ter no mínimo 6 caracteres!', 'erro');
        return;
    }

    const clientes = carregarDados('clientes') || [];
    if (clientes.find(c => c.email === email)) {
        mostrarToast('E-mail já cadastrado!', 'erro');
        return;
    }

    const novo = {
        id: gerarId(),
        nome,
        email,
        celular,
        senha,
        foto: '',
        dataCadastro: new Date().toISOString()
    };

    clientes.push(novo);
    salvarDados('clientes', clientes);

    mostrarToast('🎉 Bem-vindo à Barbearia RM, ' + nome + '! Agende seu primeiro corte com desconto especial!', 'sucesso');
    mostrarTela('loginScreen');
}

// =============================================================
// ===== SAIR =====
// =============================================================

function sairCliente() {
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo! Volte sempre!', '');
}

function sairBarbeiro() {
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', '');
}

// =============================================================
// ===== PERFIL - CLIENTE =====
// =============================================================

function carregarPerfilCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;

    document.getElementById('perfilClienteNome').textContent = usuarioLogado.nome;
    document.getElementById('perfilClienteEmail').textContent = usuarioLogado.email;
    document.getElementById('editClienteNome').value = usuarioLogado.nome || '';
    document.getElementById('editClienteCelular').value = usuarioLogado.celular || '';

    if (usuarioLogado.foto) {
        document.getElementById('perfilClienteAvatar').innerHTML =
            `<img src="${usuarioLogado.foto}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">`;
    } else {
        document.getElementById('perfilClienteAvatar').innerHTML =
            '<img src="https://i.ibb.co/TqKjX8xx/logobarbearia-rm.jpg" alt="Logo" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">';
    }
}

function salvarPerfilCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;

    usuarioLogado.nome = sanitizar(document.getElementById('editClienteNome').value.trim());
    usuarioLogado.celular = sanitizar(document.getElementById('editClienteCelular').value.trim());

    const clientes = carregarDados('clientes') || [];
    const idx = clientes.findIndex(c => c.id === usuarioLogado.id);
    if (idx !== -1) {
        clientes[idx] = usuarioLogado;
        salvarDados('clientes', clientes);
    }

    mostrarToast('Perfil atualizado!', 'sucesso');
    carregarPerfilCliente();
}

// =============================================================
// ===== PERFIL - BARBEIRO =====
// =============================================================

function carregarPerfilBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') return;

    document.getElementById('perfilBarbeiroNome').textContent = usuarioLogado.nome;
    document.getElementById('perfilBarbeiroEmail').textContent = usuarioLogado.email;
    document.getElementById('editBarbeiroNome').value = usuarioLogado.nome || '';
    document.getElementById('editBarbeiroCelular').value = usuarioLogado.celular || '';
    document.getElementById('editBarbeiroEmail').value = usuarioLogado.email || '';

    if (usuarioLogado.foto) {
        document.getElementById('perfilBarbeiroAvatar').innerHTML =
            `<img src="${usuarioLogado.foto}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">`;
    } else {
        document.getElementById('perfilBarbeiroAvatar').innerHTML =
            '<img src="https://i.ibb.co/TqKjX8xx/logobarbearia-rm.jpg" alt="Logo" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">';
    }
}

function salvarPerfilBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') return;

    usuarioLogado.nome = sanitizar(document.getElementById('editBarbeiroNome').value.trim());
    usuarioLogado.celular = sanitizar(document.getElementById('editBarbeiroCelular').value.trim());
    usuarioLogado.email = sanitizar(document.getElementById('editBarbeiroEmail').value.trim());

    const barbeiros = carregarDados('barbeiros') || [];
    const idx = barbeiros.findIndex(b => b.id === usuarioLogado.id);
    if (idx !== -1) {
        barbeiros[idx] = usuarioLogado;
        salvarDados('barbeiros', barbeiros);
    }

    mostrarToast('Perfil atualizado!', 'sucesso');
    carregarPerfilBarbeiro();
}

// =============================================================
// ===== FOTO DE PERFIL =====
// =============================================================

function uploadFotoCliente(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        mostrarToast('A imagem deve ter no máximo 2MB!', 'erro');
        return;
    }

    if (!file.type.startsWith('image/')) {
        mostrarToast('Por favor, selecione uma imagem!', 'erro');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const fotoBase64 = e.target.result;

        document.getElementById('perfilClienteAvatar').innerHTML =
            `<img src="${fotoBase64}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">`;

        if (usuarioLogado && tipoUsuario === 'cliente') {
            usuarioLogado.foto = fotoBase64;

            const clientes = carregarDados('clientes') || [];
            const idx = clientes.findIndex(c => c.id === usuarioLogado.id);
            if (idx !== -1) {
                clientes[idx].foto = fotoBase64;
                salvarDados('clientes', clientes);
            }

            mostrarToast('📸 Foto atualizada!', 'sucesso');
        }
    };
    reader.readAsDataURL(file);
}

function uploadFotoBarbeiro(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        mostrarToast('A imagem deve ter no máximo 2MB!', 'erro');
        return;
    }

    if (!file.type.startsWith('image/')) {
        mostrarToast('Por favor, selecione uma imagem!', 'erro');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const fotoBase64 = e.target.result;

        document.getElementById('perfilBarbeiroAvatar').innerHTML =
            `<img src="${fotoBase64}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #C9A84C;">`;

        if (usuarioLogado && tipoUsuario === 'barbeiro') {
            usuarioLogado.foto = fotoBase64;

            const barbeiros = carregarDados('barbeiros') || [];
            const idx = barbeiros.findIndex(b => b.id === usuarioLogado.id);
            if (idx !== -1) {
                barbeiros[idx].foto = fotoBase64;
                salvarDados('barbeiros', barbeiros);
            }

            mostrarToast('📸 Foto atualizada!', 'sucesso');
        }
    };
    reader.readAsDataURL(file);
}

// =============================================================
// ===== TROCAR SENHA =====
// =============================================================

function trocarSenhaCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        mostrarToast('Faça login como cliente!', 'erro');
        return;
    }

    const senhaAtual = document.getElementById('senhaAtualCliente').value;
    const novaSenha = document.getElementById('novaSenhaCliente').value;
    const confirmarSenha = document.getElementById('confirmarSenhaCliente').value;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    if (senhaAtual !== usuarioLogado.senha) {
        mostrarToast('Senha atual incorreta!', 'erro');
        return;
    }

    if (novaSenha.length < 6) {
        mostrarToast('Nova senha deve ter no mínimo 6 caracteres!', 'erro');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarToast('As senhas não coincidem!', 'erro');
        return;
    }

    usuarioLogado.senha = novaSenha;

    const clientes = carregarDados('clientes') || [];
    const idx = clientes.findIndex(c => c.id === usuarioLogado.id);
    if (idx !== -1) {
        clientes[idx].senha = novaSenha;
        salvarDados('clientes', clientes);
    }

    document.getElementById('senhaAtualCliente').value = '';
    document.getElementById('novaSenhaCliente').value = '';
    document.getElementById('confirmarSenhaCliente').value = '';

    mostrarToast('✅ Senha alterada com sucesso!', 'sucesso');
}

function trocarSenhaBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        mostrarToast('Faça login como barbeiro!', 'erro');
        return;
    }

    const senhaAtual = document.getElementById('senhaAtualBarbeiro').value;
    const novaSenha = document.getElementById('novaSenhaBarbeiro').value;
    const confirmarSenha = document.getElementById('confirmarSenhaBarbeiro').value;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    if (senhaAtual !== usuarioLogado.senha) {
        mostrarToast('Senha atual incorreta!', 'erro');
        return;
    }

    if (novaSenha.length < 6) {
        mostrarToast('Nova senha deve ter no mínimo 6 caracteres!', 'erro');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarToast('As senhas não coincidem!', 'erro');
        return;
    }

    usuarioLogado.senha = novaSenha;

    const barbeiros = carregarDados('barbeiros') || [];
    const idx = barbeiros.findIndex(b => b.id === usuarioLogado.id);
    if (idx !== -1) {
        barbeiros[idx].senha = novaSenha;
        salvarDados('barbeiros', barbeiros);
    }

    document.getElementById('senhaAtualBarbeiro').value = '';
    document.getElementById('novaSenhaBarbeiro').value = '';
    document.getElementById('confirmarSenhaBarbeiro').value = '';

    mostrarToast('✅ Senha alterada com sucesso!', 'sucesso');
}

// =============================================================
// ===== FEED CLIENTE =====
// =============================================================

function carregarFeedCliente() {
    const posts = carregarDados('posts') || [];
    const container = document.getElementById('feedClienteContainer');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center;padding:40px;">
                <div style="font-size:60px;">✂️</div>
                <h3 style="margin-top:10px; color:#C9A84C;">Nenhum post ainda</h3>
                <p style="color:#6A6A6A;">Aguardando novidades do barbeiro!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const curtidas = post.curtidas?.length || 0;
        const comentarios = post.comentarios?.length || 0;
        const jaCurtiu = post.curtidas?.includes(usuarioLogado?.id) || false;

        let mediaHtml = '';
        if (post.video) {
            const videoId = post.video.split('v=')[1]?.split('&')[0] || post.video.split('/').pop();
            mediaHtml = `
                <div class="feed-post-video">
                    <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
                </div>
            `;
        } else if (post.imagem) {
            mediaHtml = `<img src="${post.imagem}" alt="${post.titulo}" class="feed-post-image" onerror="this.style.display='none'">`;
        }

        return `
            <div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">
                        <img src="https://i.ibb.co/TqKjX8xx/logobarbearia-rm.jpg" alt="Logo">
                    </div>
                    <div class="feed-post-user">
                        <div class="feed-post-user-name">Barbearia RM</div>
                        <div class="feed-post-user-time">${new Date(post.data).toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
                ${mediaHtml}
                <div class="feed-post-body">
                    <div class="feed-post-title">${post.titulo}</div>
                    <div class="feed-post-price">R$ ${post.preco.toFixed(2)}</div>
                    <div class="feed-post-desc">${post.descricao || ''}</div>
                </div>
                <div class="feed-post-actions">
                    <button onclick="curtirPost('${post.id}')" class="${jaCurtiu ? 'liked' : ''}">
                        <i class="fas fa-heart"></i> <span class="count">${curtidas}</span>
                    </button>
                    <button onclick="abrirComentarios('${post.id}')">
                        <i class="fas fa-comment"></i> <span class="count">${comentarios}</span>
                    </button>
                    <button onclick="compartilharPost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </button>
                    <button onclick="abrirPagamento('${post.id}')">
                        <i class="fas fa-credit-card"></i> Pagar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================================
// ===== FEED BARBEIRO =====
// =============================================================

function carregarFeedBarbeiro() {
    const posts = carregarDados('posts') || [];
    const container = document.getElementById('feedClienteContainer');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center;padding:40px;">
                <div style="font-size:60px;">📸</div>
                <h3 style="margin-top:10px; color:#C9A84C;">Nenhum post ainda</h3>
                <p style="color:#6A6A6A;">Crie seu primeiro post!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const curtidas = post.curtidas?.length || 0;
        const comentarios = post.comentarios?.length || 0;

        let mediaHtml = '';
        if (post.video) {
            const videoId = post.video.split('v=')[1]?.split('&')[0] || post.video.split('/').pop();
            mediaHtml = `
                <div class="feed-post-video">
                    <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
                </div>
            `;
        } else if (post.imagem) {
            mediaHtml = `<img src="${post.imagem}" alt="${post.titulo}" class="feed-post-image" onerror="this.style.display='none'">`;
        }

        return `
            <div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">
                        <img src="https://i.ibb.co/TqKjX8xx/logobarbearia-rm.jpg" alt="Logo">
                    </div>
                    <div class="feed-post-user">
                        <div class="feed-post-user-name">Barbearia RM</div>
                        <div class="feed-post-user-time">${new Date(post.data).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <button onclick="excluirPost('${post.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:18px;padding:0 8px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${mediaHtml}
                <div class="feed-post-body">
                    <div class="feed-post-title">${post.titulo}</div>
                    <div class="feed-post-price">R$ ${post.preco.toFixed(2)}</div>
                    <div class="feed-post-desc">${post.descricao || ''}</div>
                </div>
                <div class="feed-post-actions">
                    <button>
                        <i class="fas fa-heart"></i> <span class="count">${curtidas}</span>
                    </button>
                    <button onclick="abrirComentarios('${post.id}')">
                        <i class="fas fa-comment"></i> <span class="count">${comentarios}</span>
                    </button>
                    <button onclick="compartilharPost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================================
// ===== INTERAÇÕES COM POSTS =====
// =============================================================

function curtirPost(postId) {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        mostrarToast('Faça login como cliente para curtir!', 'erro');
        return;
    }

    const posts = carregarDados('posts') || [];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx === -1) return;

    if (!posts[idx].curtidas) posts[idx].curtidas = [];

    const jaCurtiu = posts[idx].curtidas.includes(usuarioLogado.id);
    if (jaCurtiu) {
        posts[idx].curtidas = posts[idx].curtidas.filter(id => id !== usuarioLogado.id);
    } else {
        posts[idx].curtidas.push(usuarioLogado.id);
    }

    salvarDados('posts', posts);
    carregarFeedCliente();
}

function abrirComentarios(postId) {
    postSelecionado = postId;
    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const container = document.getElementById('comentariosContainer');
    if (!container) return;

    const comentarios = post.comentarios || [];

    if (comentarios.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A;text-align:center;">Nenhum comentário ainda. Seja o primeiro!</p>';
    } else {
        container.innerHTML = comentarios.map(c => `
            <div style="padding:10px 0; border-bottom:1px solid #2A2A2A;">
                <strong style="color:#C9A84C;">${c.nome}</strong>
                <p style="margin:4px 0; font-size:14px; color:#F5F0E8;">${c.texto}</p>
                <span style="font-size:11px; color:#6A6A6A;">${new Date(c.data).toLocaleDateString('pt-BR')}</span>
            </div>
        `).join('');
    }

    document.getElementById('modalComentario').classList.add('active');
}

function adicionarComentario() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        mostrarToast('Faça login como cliente para comentar!', 'erro');
        return;
    }

    const texto = sanitizar(document.getElementById('novoComentario').value.trim());
    if (!texto) {
        mostrarToast('Digite um comentário!', 'erro');
        return;
    }

    const posts = carregarDados('posts') || [];
    const idx = posts.findIndex(p => p.id === postSelecionado);
    if (idx === -1) return;

    if (!posts[idx].comentarios) posts[idx].comentarios = [];

    posts[idx].comentarios.push({
        nome: usuarioLogado.nome,
        texto: texto,
        data: new Date().toISOString()
    });

    salvarDados('posts', posts);
    document.getElementById('novoComentario').value = '';
    mostrarToast('Comentário adicionado!', 'sucesso');
    abrirComentarios(postSelecionado);
}

function compartilharPost(postId) {
    const url = window.location.href + '?post=' + postId;
    if (navigator.share) {
        navigator.share({
            title: '✂️ Barbearia RM',
            text: 'Confira esse corte incrível!',
            url: url
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            mostrarToast('Link copiado para compartilhar!', 'sucesso');
        }).catch(() => {
            mostrarToast('Compartilhe: ' + url, '');
        });
    }
}

function excluirPost(postId) {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    let posts = carregarDados('posts') || [];
    posts = posts.filter(p => p.id !== postId);
    salvarDados('posts', posts);
    mostrarToast('Post excluído!', 'sucesso');
    carregarFeedBarbeiro();
}

// =============================================================
// ===== CRIAR POST =====
// =============================================================

function criarPost() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        mostrarToast('Apenas barbeiros podem criar posts!', 'erro');
        return;
    }

    const titulo = sanitizar(document.getElementById('postTitulo').value.trim());
    const preco = parseFloat(document.getElementById('postPreco').value);
    const imagem = sanitizar(document.getElementById('postImagem').value.trim());
    const video = sanitizar(document.getElementById('postVideo').value.trim());
    const descricao = sanitizar(document.getElementById('postDescricao').value.trim());

    if (!titulo || !preco) {
        mostrarToast('Título e preço são obrigatórios!', 'erro');
        return;
    }

    const posts = carregarDados('posts') || [];
    posts.unshift({
        id: gerarId(),
        titulo,
        preco,
        imagem,
        video,
        descricao,
        data: new Date().toISOString(),
        barbeiroId: usuarioLogado.id,
        curtidas: [],
        comentarios: []
    });

    salvarDados('posts', posts);
    mostrarToast('📸 Post publicado com sucesso!', 'sucesso');

    document.getElementById('postTitulo').value = '';
    document.getElementById('postPreco').value = '';
    document.getElementById('postImagem').value = '';
    document.getElementById('postVideo').value = '';
    document.getElementById('postDescricao').value = '';

    mostrarTela('homeBarbeiroScreen');
}

// =============================================================
// ===== PLANOS =====
// =============================================================

function carregarPlanos() {
    const planos = carregarDados('planos') || [];
    const container = document.getElementById('planosContainer');
    if (!container) return;

    if (planos.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A;text-align:center;">Nenhum plano criado</p>';
        return;
    }

    container.innerHTML = planos.map(plano => `
        <div class="plano-card">
            <div class="plano-info">
                <div class="plano-nome">${plano.nome}</div>
                <div class="plano-periodo">📅 ${plano.periodo.charAt(0).toUpperCase() + plano.periodo.slice(1)}</div>
                <div style="font-size:12px; color:#6A6A6A;">${plano.descricao || ''}</div>
            </div>
            <div class="plano-preco">R$ ${plano.preco.toFixed(2)}</div>
        </div>
    `).join('');
}

function criarPlano() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        mostrarToast('Apenas barbeiros podem criar planos!', 'erro');
        return;
    }

    const nome = sanitizar(document.getElementById('planoNome').value.trim());
    const periodo = document.getElementById('planoPeriodo').value;
    const preco = parseFloat(document.getElementById('planoPreco').value);
    const descricao = sanitizar(document.getElementById('planoDescricao').value.trim());

    if (!nome || !preco) {
        mostrarToast('Nome e preço são obrigatórios!', 'erro');
        return;
    }

    const planos = carregarDados('planos') || [];
    planos.push({
        id: gerarId(),
        nome,
        periodo,
        preco,
        descricao
    });

    salvarDados('planos', planos);
    mostrarToast('📋 Plano criado com sucesso!', 'sucesso');

    document.getElementById('planoNome').value = '';
    document.getElementById('planoPreco').value = '';
    document.getElementById('planoDescricao').value = '';

    mostrarTela('homeBarbeiroScreen');
}

// =============================================================
// ===== AGENDAMENTO (COM FIREBASE) =====
// =============================================================

async function agendarCorte() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        mostrarToast('Faça login como cliente para agendar!', 'erro');
        return;
    }

    const data = document.getElementById('agendamentoData').value;
    const horario = document.getElementById('agendamentoHorario').value;
    const tipo = document.getElementById('agendamentoTipo').value;

    if (!data || !horario) {
        mostrarToast('Selecione data e horário!', 'erro');
        return;
    }

    // Verifica conflitos no Firebase
    const agendamentos = await buscarAgendamentosFirebase();
    const conflito = agendamentos.some(a => a.data === data && a.horario === horario && a.status !== 'cancelado');
    
    if (conflito) {
        mostrarToast('⚠️ Horário já ocupado! Escolha outro.', 'erro');
        return;
    }

    const novoAgendamento = {
        clienteId: usuarioLogado.id,
        clienteNome: usuarioLogado.nome,
        clienteCelular: usuarioLogado.celular || '',
        data: data,
        horario: horario,
        tipo: tipo,
        status: 'confirmado'
    };

    const resultado = await salvarAgendamentoFirebase(novoAgendamento);
    
    if (resultado.sucesso) {
        mostrarToast('✅ Agendamento confirmado para ' + data + ' às ' + horario, 'sucesso');
        mostrarTela('homeClienteScreen');
    } else {
        mostrarToast('❌ Erro ao agendar: ' + resultado.erro, 'erro');
    }
}

async function carregarAgendaCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;

    const container = document.getElementById('agendaClienteContainer');
    if (!container) return;

    const meus = await buscarAgendamentosClienteFirebase(usuarioLogado.id);

    if (meus.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A;text-align:center;">Nenhum agendamento</p>';
        return;
    }

    meus.sort((a, b) => new Date(a.data + ' ' + a.horario) - new Date(b.data + ' ' + b.horario));

    container.innerHTML = meus.map(a => `
        <div class="agenda-item">
            <div class="agenda-info">
                <div style="font-weight:600; color:#C9A84C;">✂️ ${a.tipo}</div>
                <div class="agenda-data">📅 ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horario}</div>
            </div>
            <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}</span>
        </div>
    `).join('');
}

async function carregarAgendamentosBarbeiro() {
    const container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;

    // Inicia escuta em tempo real
    ouvirAgendamentosFirebase((agendamentos) => {
        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6A6A6A;text-align:center;">Nenhum agendamento</p>';
            return;
        }

        container.innerHTML = agendamentos.map(a => `
            <div class="agenda-item">
                <div class="agenda-info">
                    <div class="agenda-cliente">👤 ${a.clienteNome}</div>
                    <div style="color:#C9A84C;">✂️ ${a.tipo}</div>
                    <div class="agenda-data">📅 ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horario}</div>
                    ${a.clienteCelular ? `<div class="agenda-data">📱 ${a.clienteCelular}</div>` : ''}
                </div>
                <div>
                    <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}</span>
                    ${a.status === 'confirmado' ? `<button onclick="cancelarAgendamento('${a.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:14px;margin-top:4px;display:block;">Cancelar</button>` : ''}
                </div>
            </div>
        `).join('');
    });
}

async function cancelarAgendamento(id) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    const resultado = await cancelarAgendamentoFirebase(id);
    
    if (resultado.sucesso) {
        mostrarToast('❌ Agendamento cancelado!', 'erro');
        // A atualização vem em tempo real pelo listener
    } else {
        mostrarToast('❌ Erro ao cancelar: ' + resultado.erro, 'erro');
    }
}

// =============================================================
// ===== FATURAMENTO =====
// =============================================================

function carregarFaturamento() {
    const pagamentos = carregarDados('pagamentos') || [];
    const hoje = new Date();

    const confirmados = pagamentos.filter(p => p.status === 'confirmado');

    const hojeStr = hoje.toISOString().split('T')[0];
    const faturamentoHoje = confirmados
        .filter(p => p.data.split('T')[0] === hojeStr)
        .reduce((sum, p) => sum + p.valor, 0);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const faturamentoSemana = confirmados
        .filter(p => new Date(p.data) >= inicioSemana)
        .reduce((sum, p) => sum + p.valor, 0);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const faturamentoMes = confirmados
        .filter(p => new Date(p.data) >= inicioMes)
        .reduce((sum, p) => sum + p.valor, 0);

    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const faturamentoAno = confirmados
        .filter(p => new Date(p.data) >= inicioAno)
        .reduce((sum, p) => sum + p.valor, 0);

    document.getElementById('faturamentoHoje').textContent = 'R$ ' + faturamentoHoje.toFixed(2);
    document.getElementById('faturamentoSemana').textContent = 'R$ ' + faturamentoSemana.toFixed(2);
    document.getElementById('faturamentoMes').textContent = 'R$ ' + faturamentoMes.toFixed(2);
    document.getElementById('faturamentoAno').textContent = 'R$ ' + faturamentoAno.toFixed(2);
}

// =============================================================
// ===== EXTRATO =====
// =============================================================

function carregarExtrato() {
    const pagamentos = carregarDados('pagamentos') || [];
    const container = document.getElementById('extratoContainer');
    if (!container) return;

    let filtrados = pagamentos.filter(p => p.status === 'confirmado');

    const hoje = new Date();
    if (extratoFiltro === 'dia') {
        const hojeStr = hoje.toISOString().split('T')[0];
        filtrados = filtrados.filter(p => p.data.split('T')[0] === hojeStr);
    } else if (extratoFiltro === 'semana') {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        filtrados = filtrados.filter(p => new Date(p.data) >= inicioSemana);
    } else if (extratoFiltro === 'mes') {
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        filtrados = filtrados.filter(p => new Date(p.data) >= inicioMes);
    } else if (extratoFiltro === 'ano') {
        const inicioAno = new Date(hoje.getFullYear(), 0, 1);
        filtrados = filtrados.filter(p => new Date(p.data) >= inicioAno);
    }

    filtrados.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6A6A6A;padding:20px;">Nenhum pagamento encontrado</p>';
        return;
    }

    let total = 0;
    container.innerHTML = filtrados.map(p => {
        total += p.valor;
        return `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2A2A2A;">
                <div>
                    <div style="font-weight:600; color:#F5F0E8;">${p.clienteNome}</div>
                    <div style="font-size:12px;color:#6A6A6A;">${p.tipo}</div>
                    <div style="font-size:12px;color:#4A4A4A;">${new Date(p.data).toLocaleString('pt-BR')}</div>
                </div>
                <div style="font-weight:700;color:#C9A84C;">R$ ${p.valor.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML += `
        <div style="text-align:right;padding:10px 0;font-weight:700;font-size:20px;border-top:2px solid #C9A84C;color:#C9A84C;">
            Total: R$ ${total.toFixed(2)}
        </div>
    `;
}

function filtrarExtrato(filtro) {
    extratoFiltro = filtro;
    carregarExtrato();
}

// =============================================================
// ===== PAGAMENTO =====
// =============================================================

let pagamentoPostId = null;

function abrirPagamento(postId) {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        mostrarToast('Faça login como cliente para pagar!', 'erro');
        return;
    }

    pagamentoPostId = postId;
    mostrarTela('pagamentoScreen');

    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = '';

    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const valor = post.preco.toFixed(2);
    const chavePix = 'barbearia.rm@email.com';
    const pixString = `00020126580014BR.GOV.BCB.PIX0136${chavePix}5204000053039865404${valor}5802BR5913Barbearia RM6008BRASIL62070503***6304`;

    try {
        new QRCode(container, {
            text: pixString,
            width: 200,
            height: 200,
            colorDark: '#C9A84C',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        container.innerHTML = '<p style="color:#6A6A6A;">Erro ao gerar QR Code. Use a chave PIX abaixo.</p>';
    }

    document.getElementById('pixChave').textContent = chavePix;
}

function copiarPix() {
    const chave = document.getElementById('pixChave').textContent;
    navigator.clipboard.writeText(chave).then(() => {
        mostrarToast('Chave PIX copiada!', 'sucesso');
    }).catch(() => {
        mostrarToast('Chave: ' + chave, '');
    });
}

function processarPagamento() {
    if (!pagamentoPostId) {
        mostrarToast('Erro no pagamento!', 'erro');
        return;
    }

    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === pagamentoPostId);
    if (!post) {
        mostrarToast('Post não encontrado!', 'erro');
        return;
    }

    const pagamentos = carregarDados('pagamentos') || [];
    pagamentos.push({
        id: gerarId(),
        clienteId: usuarioLogado.id,
        clienteNome: usuarioLogado.nome,
        postId: post.id,
        tipo: post.titulo,
        valor: post.preco,
        data: new Date().toISOString(),
        status: 'confirmado',
        metodo: 'PIX/Cartão'
    });

    salvarDados('pagamentos', pagamentos);
    mostrarToast('✅ Pagamento confirmado!', 'sucesso');
    pagamentoPostId = null;
    mostrarTela('homeClienteScreen');
}

function fecharPagamento() {
    pagamentoPostId = null;
    mostrarTela('homeClienteScreen');
}

// =============================================================
// ===== INICIALIZAÇÃO =====
// =============================================================

// Inicia notificações diárias
iniciarNotificacoesDiarias();

// Verifica se já está logado
const usuarioSalvo = carregarDados('usuarioLogado');
if (usuarioSalvo) {
    const clientes = carregarDados('clientes') || [];
    const barbeiros = carregarDados('barbeiros') || [];

    const cliente = clientes.find(c => c.id === usuarioSalvo.id);
    if (cliente) {
        usuarioLogado = cliente;
        tipoUsuario = 'cliente';
        mostrarTela('homeClienteScreen');
    } else {
        const barbeiro = barbeiros.find(b => b.id === usuarioSalvo.id);
        if (barbeiro) {
            usuarioLogado = barbeiro;
            tipoUsuario = 'barbeiro';
            mostrarTela('homeBarbeiroScreen');
        }
    }
}

console.log('✂️ Barbearia RM carregada com sucesso!');
console.log('🔥 Firebase integrado para agendamentos em tempo real!');
console.log('📢 Notificações diárias ativadas!');
console.log('📍 Localização disponível na home do cliente!');
console.log('🖼️ Logo da barbearia em todos os lugares!');
