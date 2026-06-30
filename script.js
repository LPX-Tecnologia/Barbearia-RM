// =============================================================
// ===== SCRIPT SIMPLIFICADO - APENAS LOCALSTORAGE =====
// =============================================================

console.log('✅ Script carregado!');

// =============================================================
// ===== FUNÇÕES AUXILIARES =====
// =============================================================

function salvarDados(chave, dados) {
    try {
        localStorage.setItem(chave, JSON.stringify(dados));
        console.log('💾 Dados salvos:', chave);
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

function mostrarToast(mensagem, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? '#EF4444' : tipo === 'sucesso' ? '#10B981' : '#1F2937';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
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
    } else {
        console.error('❌ Tela não encontrada:', id);
        return;
    }

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
// ===== FUNÇÕES DE LOGIN (APENAS LOCALSTORAGE) =====
// =============================================================

function mostrarLoginCliente() {
    console.log('🔄 mostrarLoginCliente() chamada!');
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    console.log('🔄 mostrarLoginBarbeiro() chamada!');
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

function loginCliente() {
    console.log('🔄 FUNÇÃO loginCliente() CHAMADA!');
    
    const email = document.getElementById('loginEmailCliente').value.trim();
    const senha = document.getElementById('loginSenhaCliente').value;
    
    console.log('📧 Email:', email);
    console.log('🔒 Senha:', senha);
    
    if (!email || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    const clientes = carregarDados('clientes') || [];
    console.log('📋 Clientes:', clientes);
    
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
    console.log('🔄 FUNÇÃO loginBarbeiro() CHAMADA!');
    
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
    console.log('🔄 FUNÇÃO cadastrarCliente() CHAMADA!');
    
    const nome = document.getElementById('cadNomeCliente').value.trim();
    const email = document.getElementById('cadEmailCliente').value.trim();
    const celular = document.getElementById('cadCelularCliente').value.trim();
    const senha = document.getElementById('cadSenhaCliente').value;
    
    console.log('📝 Dados:', { nome, email, celular, senha: '***' });
    
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

// =============================================================
// ===== SAIR =====
// =============================================================

function sairCliente() {
    usuarioLogado = null;
    tipoUsuario = null;
    salvarDados('usuarioLogado', null);
    mostrarTela('loginScreen');
    alert('👋 Até logo!');
}

function sairBarbeiro() {
    usuarioLogado = null;
    tipoUsuario = null;
    salvarDados('usuarioLogado', null);
    mostrarTela('loginScreen');
    alert('👋 Até logo!');
}

// =============================================================
// ===== FUNÇÕES VAZIAS (PARA NÃO QUEBRAR O APP) =====
// =============================================================

function carregarFeedCliente() { console.log('📱 Feed cliente'); }
function carregarFeedBarbeiro() { console.log('📱 Feed barbeiro'); }
function carregarAgendaCliente() { console.log('📅 Agenda cliente'); }
function carregarAgendamentosBarbeiro() { console.log('📅 Agendamentos barbeiro'); }
function carregarPlanos() { console.log('📋 Planos'); }
function carregarFaturamento() { console.log('💰 Faturamento'); }
function criarPost() { console.log('📸 Criar post'); }
function criarPlano() { console.log('📋 Criar plano'); }
function curtirPost() { console.log('❤️ Curtir post'); }
function abrirComentarios() { console.log('💬 Abrir comentários'); }
function adicionarComentario() { console.log('💬 Adicionar comentário'); }
function compartilharPost() { console.log('📤 Compartilhar post'); }
function excluirPost() { console.log('🗑️ Excluir post'); }
function abrirPagamento() { console.log('💳 Abrir pagamento'); }
function copiarPix() { console.log('📋 Copiar PIX'); }
function processarPagamento() { console.log('💳 Processar pagamento'); }
function fecharPagamento() { console.log('💳 Fechar pagamento'); }
function filtrarExtrato() { console.log('📊 Filtrar extrato'); }
function carregarExtrato() { console.log('📊 Carregar extrato'); }
function uploadFotoCliente() { console.log('📸 Upload foto cliente'); }
function uploadFotoBarbeiro() { console.log('📸 Upload foto barbeiro'); }
function trocarSenhaCliente() { console.log('🔑 Trocar senha cliente'); }
function trocarSenhaBarbeiro() { console.log('🔑 Trocar senha barbeiro'); }
function salvarPerfilCliente() { console.log('👤 Salvar perfil cliente'); }
function salvarPerfilBarbeiro() { console.log('👤 Salvar perfil barbeiro'); }
function carregarPerfilCliente() { console.log('👤 Carregar perfil cliente'); }
function carregarPerfilBarbeiro() { console.log('👤 Carregar perfil barbeiro'); }
function abrirLocalizacao() { console.log('📍 Abrir localização'); }
function atualizarEstatisticas() { console.log('📊 Atualizar estatísticas'); }
function atualizarInfoClientes() { console.log('📊 Atualizar info clientes'); }
function verClientes() { console.log('👥 Ver clientes'); }
function excluirCliente() { console.log('🗑️ Excluir cliente'); }
function abrirEditarPix() { console.log('💳 Editar PIX'); }
function salvarConfigPix() { console.log('💳 Salvar PIX'); }
function verificarPagamento() { console.log('💳 Verificar pagamento'); }
function agendarCorte() { console.log('✂️ Agendar corte'); }

// =============================================================
// ===== INICIALIZAÇÃO =====
// =============================================================

console.log('✂️ Barbearia RM carregada com sucesso!');
console.log('📧 Use: barbeiro@barbeariarm.com');
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
