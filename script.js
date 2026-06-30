// =============================================================
// ===== SCRIPT - APENAS LOCALSTORAGE (SEM FIREBASE) =====
// =============================================================

console.log('✅ SCRIPT CARREGADO COM SUCESSO!');

// =============================================================
// ===== FUNÇÕES AUXILIARES =====
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

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function mostrarTela(id) {
    console.log('🔄 Mostrando tela:', id);
    
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    
    const tela = document.getElementById(id);
    if (tela) {
        tela.classList.add('active');
        console.log('✅ Tela', id, 'ativada!');
    }
    
    // Navegação
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
}

function mostrarToast(mensagem, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? '#EF4444' : '#10B981';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// =============================================================
// ===== DADOS INICIAIS =====
// =============================================================

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
    console.log('✅ Barbeiro padrão criado!');
}

if (!carregarDados('clientes')) {
    salvarDados('clientes', []);
}

if (!carregarDados('posts')) {
    salvarDados('posts', [
        {
            id: 'post1',
            titulo: 'Corte Degradê Navalhado',
            preco: 45.00,
            imagem: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500',
            video: '',
            descricao: 'Corte degradê com navalha, acabamento perfeito.',
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
            descricao: 'Pacote completo: corte social + barba.',
            data: new Date().toISOString(),
            barbeiroId: 'barbeiro1',
            curtidas: [],
            comentarios: []
        }
    ]);
}

if (!carregarDados('planos')) {
    salvarDados('planos', [
        { id: 'plano1', nome: 'Plano Mensal', periodo: 'mensal', preco: 150.00, descricao: '1 corte por mês + barba grátis' },
        { id: 'plano2', nome: 'Plano Trimestral', periodo: 'trimestral', preco: 400.00, descricao: '1 corte por mês + 1 barba + 1 luzes' }
    ]);
}

if (!carregarDados('pagamentos')) {
    salvarDados('pagamentos', []);
}

if (!carregarDados('agendamentos')) {
    salvarDados('agendamentos', []);
}

// =============================================================
// ===== VARIÁVEIS GLOBAIS =====
// =============================================================

let usuarioLogado = null;
let tipoUsuario = null;

// =============================================================
// ===== FUNÇÕES DE LOGIN =====
// =============================================================

function mostrarLoginCliente() {
    console.log('🔄 MOSTRAR LOGIN CLIENTE');
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    console.log('🔄 MOSTRAR LOGIN BARBEIRO');
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

function loginCliente() {
    console.log('🔥 LOGIN CLIENTE CHAMADO!');
    
    const email = document.getElementById('loginEmailCliente').value.trim();
    const senha = document.getElementById('loginSenhaCliente').value;
    
    if (!email || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    const clientes = carregarDados('clientes') || [];
    const cliente = clientes.find(c => c.email === email && c.senha === senha);
    
    if (cliente) {
        usuarioLogado = cliente;
        tipoUsuario = 'cliente';
        salvarDados('usuarioLogado', cliente);
        alert('✅ Bem-vindo, ' + cliente.nome + '!');
        mostrarTela('homeClienteScreen');
    } else {
        alert('❌ E-mail ou senha inválidos!');
    }
}

function loginBarbeiro() {
    console.log('🔥 LOGIN BARBEIRO CHAMADO!');
    
    const email = document.getElementById('loginEmailBarbeiro').value.trim();
    const senha = document.getElementById('loginSenhaBarbeiro').value;
    
    console.log('📧 Email:', email);
    console.log('🔒 Senha:', senha);
    
    if (!email || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    const barbeiros = carregarDados('barbeiros') || [];
    console.log('📋 Barbeiros:', barbeiros);
    
    const barbeiro = barbeiros.find(b => b.email === email && b.senha === senha);
    
    if (barbeiro) {
        usuarioLogado = barbeiro;
        tipoUsuario = 'barbeiro';
        salvarDados('usuarioLogado', barbeiro);
        alert('✅ Bem-vindo, ' + barbeiro.nome + '!');
        mostrarTela('homeBarbeiroScreen');
    } else {
        alert('❌ E-mail ou senha inválidos!\n\nUse:\nE-mail: barbeiro@barbeariarm.com\nSenha: 123456');
    }
}

function cadastrarCliente() {
    console.log('🔥 CADASTRO CHAMADO!');
    
    const nome = document.getElementById('cadNomeCliente').value.trim();
    const email = document.getElementById('cadEmailCliente').value.trim();
    const celular = document.getElementById('cadCelularCliente').value.trim();
    const senha = document.getElementById('cadSenhaCliente').value;
    
    if (!nome || !email || !celular || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    if (senha.length < 6) {
        alert('⚠️ Senha deve ter no mínimo 6 caracteres!');
        return;
    }
    
    const clientes = carregarDados('clientes') || [];
    
    if (clientes.find(c => c.email === email)) {
        alert('⚠️ E-mail já cadastrado!');
        return;
    }
    
    const novo = {
        id: gerarId(),
        nome: nome,
        email: email,
        celular: celular,
        senha: senha,
        foto: '',
        dataCadastro: new Date().toISOString()
    };
    
    clientes.push(novo);
    salvarDados('clientes', clientes);
    alert('🎉 Cadastro realizado com sucesso, ' + nome + '!');
    mostrarTela('loginScreen');
}

function sairCliente() {
    usuarioLogado = null;
    tipoUsuario = null;
    salvarDados('usuarioLogado', null);
    mostrarTela('loginScreen');
}

function sairBarbeiro() {
    usuarioLogado = null;
    tipoUsuario = null;
    salvarDados('usuarioLogado', null);
    mostrarTela('loginScreen');
}

// =============================================================
// ===== FUNÇÕES VAZIAS (PARA NÃO DAR ERRO) =====
// =============================================================

function carregarFeedCliente() {}
function carregarFeedBarbeiro() {}
function carregarAgendaCliente() {}
function carregarAgendamentosBarbeiro() {}
function carregarPlanos() {}
function carregarFaturamento() {}
function criarPost() {}
function criarPlano() {}
function curtirPost() {}
function abrirComentarios() {}
function adicionarComentario() {}
function compartilharPost() {}
function excluirPost() {}
function abrirPagamento() {}
function copiarPix() {}
function processarPagamento() {}
function fecharPagamento() {}
function filtrarExtrato() {}
function carregarExtrato() {}
function uploadFotoCliente() {}
function uploadFotoBarbeiro() {}
function trocarSenhaCliente() {}
function trocarSenhaBarbeiro() {}
function salvarPerfilCliente() {}
function salvarPerfilBarbeiro() {}
function carregarPerfilCliente() {}
function carregarPerfilBarbeiro() {}
function abrirLocalizacao() {}
function atualizarEstatisticas() {}
function atualizarInfoClientes() {}
function verClientes() {}
function excluirCliente() {}
function abrirEditarPix() {}
function salvarConfigPix() {}
function verificarPagamento() {}
function agendarCorte() {}

// =============================================================
// ===== INICIALIZAÇÃO =====
// =============================================================

console.log('✂️ Barbearia RM - Modo LocalStorage');
console.log('📧 Barbeiro: barbeiro@barbeariarm.com');
console.log('🔒 Senha: 123456');

// Verifica se já está logado
const usuarioSalvo = carregarDados('usuarioLogado');
if (usuarioSalvo) {
    const clientes = carregarDados('clientes') || [];
    const barbeiros = carregarDados('barbeiros') || [];
    
    const isCliente = clientes.some(c => c.id === usuarioSalvo.id);
    const isBarbeiro = barbeiros.some(b => b.id === usuarioSalvo.id);
    
    if (isCliente) {
        usuarioLogado = usuarioSalvo;
        tipoUsuario = 'cliente';
        mostrarTela('homeClienteScreen');
    } else if (isBarbeiro) {
        usuarioLogado = usuarioSalvo;
        tipoUsuario = 'barbeiro';
        mostrarTela('homeBarbeiroScreen');
    }
}
