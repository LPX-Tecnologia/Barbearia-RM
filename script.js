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

// INICIALIZA O FIREBASE
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log('✅ Firebase inicializado com sucesso!');
console.log('🔥 Firestore:', db ? 'Conectado' : 'Erro');
console.log('🔐 Auth:', auth ? 'Disponível' : 'Erro');

// =============================================================
// ===== FUNÇÕES AUXILIARES =====
// =============================================================

function mostrarToast(mensagem, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? '#EF4444' : tipo === 'sucesso' ? '#10B981' : '#1F2937';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

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

    if (tipoUsuario === 'barbeiro' && ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'perfilBarbeiroScreen', 'estatisticasScreen', 'infoClientesScreen'].includes(id)) {
        if (navBarbeiro) navBarbeiro.style.display = 'flex';
    }

    if (id === 'homeClienteScreen') {
        document.getElementById('welcomeClienteNome').textContent = usuarioLogado?.nome || 'Cliente';
    }
    if (id === 'homeBarbeiroScreen') {
        document.getElementById('welcomeBarbeiroNome').textContent = usuarioLogado?.nome || 'Barbeiro';
    }
}

// =============================================================
// ===== VARIÁVEIS GLOBAIS =====
// =============================================================

let usuarioLogado = null;
let tipoUsuario = null;

// =============================================================
// ===== CADASTRO CLIENTE (FIREBASE) =====
// =============================================================

async function cadastrarCliente() {
    const nome = document.getElementById('cadNomeCliente').value.trim();
    const email = document.getElementById('cadEmailCliente').value.trim();
    const celular = document.getElementById('cadCelularCliente').value.trim();
    const senha = document.getElementById('cadSenhaCliente').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    if (senha.length < 6) {
        mostrarToast('Senha deve ter no mínimo 6 caracteres!', 'erro');
        return;
    }

    try {
        // 1. Cria usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;

        // 2. Salva dados no Firestore
        await db.collection('clientes').doc(user.uid).set({
            id: user.uid,
            nome: nome,
            email: email,
            celular: celular,
            foto: '',
            ultimoAcesso: Date.now(),
            dataCadastro: new Date().toISOString()
        });

        mostrarToast('🎉 Cadastro realizado com sucesso, ' + nome + '!', 'sucesso');
        mostrarTela('loginScreen');
        
        // Limpa os campos
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';

    } catch (error) {
        console.error('Erro no cadastro:', error);
        mostrarToast('❌ Erro: ' + error.message, 'erro');
    }
}

// =============================================================
// ===== LOGIN CLIENTE (FIREBASE) =====
// =============================================================

async function loginCliente() {
    const email = document.getElementById('loginEmailCliente').value.trim();
    const senha = document.getElementById('loginSenhaCliente').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;

        // Busca dados do cliente no Firestore
        const doc = await db.collection('clientes').doc(user.uid).get();
        const cliente = doc.exists ? { id: user.uid, ...doc.data() } : null;

        if (cliente) {
            // Atualiza último acesso
            await db.collection('clientes').doc(user.uid).update({
                ultimoAcesso: Date.now()
            });

            cliente.ultimoAcesso = Date.now();
            usuarioLogado = cliente;
            tipoUsuario = 'cliente';

            mostrarToast('👋 Bem-vindo, ' + cliente.nome + '!', 'sucesso');
            mostrarTela('homeClienteScreen');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarToast('❌ E-mail ou senha inválidos!', 'erro');
    }
}

// =============================================================
// ===== LOGIN BARBEIRO (FIREBASE) =====
// =============================================================

async function loginBarbeiro() {
    const email = document.getElementById('loginEmailBarbeiro').value.trim();
    const senha = document.getElementById('loginSenhaBarbeiro').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;

        // Busca dados do barbeiro no Firestore
        const doc = await db.collection('barbeiros').doc(user.uid).get();
        const barbeiro = doc.exists ? { id: user.uid, ...doc.data() } : null;

        if (barbeiro) {
            // Atualiza último acesso
            await db.collection('barbeiros').doc(user.uid).update({
                ultimoAcesso: Date.now()
            });

            barbeiro.ultimoAcesso = Date.now();
            usuarioLogado = barbeiro;
            tipoUsuario = 'barbeiro';

            mostrarToast('✅ Bem-vindo, ' + barbeiro.nome + '!', 'sucesso');
            mostrarTela('homeBarbeiroScreen');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarToast('❌ E-mail ou senha inválidos!', 'erro');
    }
}

// =============================================================
// ===== FUNÇÕES DE LOGIN (MOSTRAR FORMS) =====
// =============================================================

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

// =============================================================
// ===== SAIR =====
// =============================================================

function sairCliente() {
    auth.signOut();
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', '');
}

function sairBarbeiro() {
    auth.signOut();
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', '');
}

// =============================================================
// ===== AGENDAMENTO (FIREBASE) =====
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

    // Verifica conflitos
    const snapshot = await db.collection('agendamentos')
        .where('data', '==', data)
        .where('horario', '==', horario)
        .where('status', '!=', 'cancelado')
        .get();

    if (!snapshot.empty) {
        mostrarToast('Horário já ocupado! Escolha outro.', 'erro');
        return;
    }

    try {
        await db.collection('agendamentos').add({
            clienteId: usuarioLogado.id,
            clienteNome: usuarioLogado.nome,
            clienteCelular: usuarioLogado.celular || '',
            data: data,
            horario: horario,
            tipo: tipo,
            status: 'confirmado',
            dataAgendamento: new Date().toISOString()
        });

        mostrarToast('✅ Agendamento confirmado para ' + data + ' às ' + horario, 'sucesso');
        mostrarTela('homeClienteScreen');
    } catch (error) {
        console.error('Erro ao agendar:', error);
        mostrarToast('❌ Erro ao agendar!', 'erro');
    }
}

// =============================================================
// ===== FUNÇÕES DE TESTE =====
// =============================================================

function testarFirebase() {
    console.log('🧪 TESTANDO FIREBASE...');
    
    // Testa Auth
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ Usuário logado:', user.email);
        } else {
            console.log('👤 Nenhum usuário logado');
        }
    });

    // Testa Firestore
    db.collection('teste').add({
        mensagem: 'Teste do app Barbearia RM',
        data: new Date().toISOString()
    })
    .then(() => {
        console.log('✅ TESTE: Dados salvos no Firestore!');
        alert('✅ Dados salvos! Verifique o Firestore.');
    })
    .catch((error) => {
        console.error('❌ TESTE: Erro ao salvar:', error);
        alert('❌ Erro: ' + error.message);
    });
}

// =============================================================
// ===== FUNÇÕES VAZIAS (PARA NÃO QUEBRAR O APP) =====
// =============================================================

function mostrarLoginCliente() { /* Já implementado acima */ }
function mostrarLoginBarbeiro() { /* Já implementado acima */ }

function carregarFeedCliente() { console.log('Feed cliente'); }
function carregarFeedBarbeiro() { console.log('Feed barbeiro'); }
function carregarAgendaCliente() { console.log('Agenda cliente'); }
function carregarAgendamentosBarbeiro() { console.log('Agendamentos barbeiro'); }
function carregarPlanos() { console.log('Planos'); }
function carregarFaturamento() { console.log('Faturamento'); }
function criarPost() { console.log('Criar post'); }
function criarPlano() { console.log('Criar plano'); }
function curtirPost() { console.log('Curtir post'); }
function abrirComentarios() { console.log('Abrir comentários'); }
function adicionarComentario() { console.log('Adicionar comentário'); }
function compartilharPost() { console.log('Compartilhar post'); }
function excluirPost() { console.log('Excluir post'); }
function abrirPagamento() { console.log('Abrir pagamento'); }
function copiarPix() { console.log('Copiar PIX'); }
function processarPagamento() { console.log('Processar pagamento'); }
function fecharPagamento() { console.log('Fechar pagamento'); }
function filtrarExtrato() { console.log('Filtrar extrato'); }
function carregarExtrato() { console.log('Carregar extrato'); }
function uploadFotoCliente() { console.log('Upload foto cliente'); }
function uploadFotoBarbeiro() { console.log('Upload foto barbeiro'); }
function trocarSenhaCliente() { console.log('Trocar senha cliente'); }
function trocarSenhaBarbeiro() { console.log('Trocar senha barbeiro'); }
function salvarPerfilCliente() { console.log('Salvar perfil cliente'); }
function salvarPerfilBarbeiro() { console.log('Salvar perfil barbeiro'); }
function carregarPerfilCliente() { console.log('Carregar perfil cliente'); }
function carregarPerfilBarbeiro() { console.log('Carregar perfil barbeiro'); }
function abrirLocalizacao() { console.log('Abrir localização'); }
function atualizarEstatisticas() { console.log('Atualizar estatísticas'); }
function atualizarInfoClientes() { console.log('Atualizar info clientes'); }
function verClientes() { console.log('Ver clientes'); }
function excluirCliente() { console.log('Excluir cliente'); }

// =============================================================
// ===== INICIALIZAÇÃO =====
// =============================================================

console.log('✂️ Barbearia RM carregada!');
console.log('📧 Use: barbeiro@barbeariarm.com');
console.log('🔒 Senha: 123456');
console.log('🔥 Firebase:', firebase.apps.length > 0 ? '✅ Conectado' : '❌ Offline');

// Verifica se já está logado
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Tenta buscar dados do cliente
            const docCliente = await db.collection('clientes').doc(user.uid).get();
            if (docCliente.exists) {
                usuarioLogado = { id: user.uid, ...docCliente.data() };
                tipoUsuario = 'cliente';
                mostrarTela('homeClienteScreen');
                return;
            }

            // Tenta buscar dados do barbeiro
            const docBarbeiro = await db.collection('barbeiros').doc(user.uid).get();
            if (docBarbeiro.exists) {
                usuarioLogado = { id: user.uid, ...docBarbeiro.data() };
                tipoUsuario = 'barbeiro';
                mostrarTela('homeBarbeiroScreen');
                return;
            }
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
        }
    } else {
        console.log('👤 Nenhum usuário logado');
    }
});

// TESTE AUTOMÁTICO
setTimeout(() => {
    console.log('🧪 Executando teste de conexão...');
    testarFirebase();
}, 2000);
