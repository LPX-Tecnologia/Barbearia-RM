// ==========================================================
// ===== CONFIGURAÇÃO FIREBASE =====
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('🔥 Firebase conectado com sucesso!');

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
var postSelecionadoId = null;
var lojasCadastradas = [];
var lojaSelecionada = null;
var lojaAtualIndex = 0;
var liveAtiva = false;
var liveChatMessages = [];
var liveChatInterval = null;
var liveCarregandoLive = false;

// Configurações padrão do PORTAL LPX
const PORTAL_CONFIG = {
    nome: 'LPX Tecnologia',
    slogan: 'Inovação que transforma',
    logo: 'logo-lpx-tecnologia.jpg'
};

// ==========================================================
// ===== SISTEMA DE TEMA CLARO/ESCURO =====
// ==========================================================
function inicializarTema() {
    const temaSalvo = localStorage.getItem('barbeariaRM_tema');
    if (temaSalvo === 'light') {
        document.body.classList.add('light-mode');
    }
    atualizarIconeTema();
}

function toggleModoEscuro() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('barbeariaRM_tema', isLight ? 'light' : 'dark');
    atualizarIconeTema();
    mostrarToast(isLight ? '☀️ Modo claro ativado!' : '🌙 Modo escuro ativado!', 'info');
}

function atualizarIconeTema() {
    const icone = document.querySelector('#btnTema i');
    if (icone) {
        if (document.body.classList.contains('light-mode')) {
            icone.className = 'fas fa-sun';
        } else {
            icone.className = 'fas fa-moon';
        }
    }
}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================
function mostrarToast(m, t) {
    var x = document.getElementById('toast');
    if (!x) return;
    x.textContent = m;
    x.className = 'toast-modern ' + (t || 'info');
    x.style.display = 'block';
    setTimeout(function() {
        x.style.display = 'none';
    }, 3000);
}

// ==========================================================
// ===== ATUALIZAR HEADER (MOSTRA PORTAL OU LOJA) =====
// ==========================================================
function atualizarHeader() {
    const logoImg = document.getElementById('headerLogoImg');
    const titleEl = document.getElementById('headerTitle');
    const sloganEl = document.getElementById('headerSlogan');
    
    // Verificar se tem uma loja selecionada E se está logado
    const lojaSalva = localStorage.getItem('barbeariaRM_loja');
    const estaLogado = clienteLogado || barbeiroLogado;
    
    if (lojaSalva && estaLogado) {
        // MODO LOJA: Mostrar dados da loja selecionada
        try {
            const loja = JSON.parse(lojaSalva);
            if (logoImg) logoImg.src = loja.logo || 'logobarbearia-rm.png';
            if (titleEl) titleEl.textContent = loja.nome || 'Loja';
            if (sloganEl) sloganEl.textContent = loja.slogan || 'Sua melhor escolha';
            console.log('🏪 Header MODO LOJA:', loja.nome);
        } catch (e) {
            mostrarHeaderPortal();
        }
    } else {
        // MODO PORTAL: Mostrar LPX Tecnologia
        mostrarHeaderPortal();
    }
    
    // Atualizar avatares
    if (clienteLogado && clienteLogado.fotoPerfil) {
        const av = document.querySelector('#clienteAvatarHeader img');
        if (av) av.src = clienteLogado.fotoPerfil;
    }
    if (barbeiroLogado && barbeiroLogado.fotoPerfil) {
        const av = document.querySelector('#barbeiroAvatarHeader img');
        if (av) av.src = barbeiroLogado.fotoPerfil;
    }
}

function mostrarHeaderPortal() {
    const logoImg = document.getElementById('headerLogoImg');
    const titleEl = document.getElementById('headerTitle');
    const sloganEl = document.getElementById('headerSlogan');
    
    if (logoImg) logoImg.src = PORTAL_CONFIG.logo;
    if (titleEl) titleEl.textContent = PORTAL_CONFIG.nome;
    if (sloganEl) sloganEl.textContent = PORTAL_CONFIG.slogan;
    console.log('🌐 Header MODO PORTAL:', PORTAL_CONFIG.nome);
}

// ==========================================================
// ===== PORTAL DE LOJAS =====
// ==========================================================
async function carregarLojasPortal() {
    var carrossel = document.getElementById('portalCarrossel');
    if (!carrossel) return;
    
    try {
        var sn = await db.collection('lojas').orderBy('dataCriacao', 'desc').get();
        lojasCadastradas = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (lojasCadastradas.length === 0) {
            lojasCadastradas = [{
                id: 'default',
                nome: 'LPX Tecnologia',
                slogan: 'Inovação que transforma',
                categoria: 'tecnologia',
                logo: 'logo-lpx-tecnologia.jpg',
                dono: 'Admin',
                stats: { estrelas: 5.0, cortes: 1200, distancia: 0 }
            }];
        }
        
        carrossel.innerHTML = lojasCadastradas.map(function(loja, i) {
            var icones = {
                barbearia: '💈', salao: '💇', estetica: '✨',
                tatuagem: '🎨', petshop: '🐾', tecnologia: '💻', outro: '📦'
            };
            var icone = icones[loja.categoria] || '🏪';
            var ativa = i === lojaAtualIndex ? ' ativa' : '';
            
            return '<div class="portal-loja-card' + ativa + '" onclick="selecionarLojaPortal(' + i + ')" id="lojaCard' + i + '">' +
                (loja.logo ? '<img src="' + loja.logo + '" class="portal-loja-card-logo" alt="' + loja.nome + '">' :
                '<div class="portal-loja-card-icone">' + icone + '</div>') +
                '<div class="portal-loja-card-nome">' + loja.nome + '</div>' +
                '<div class="portal-loja-card-categoria">' + icone + ' ' + (loja.categoria || 'Loja') + '</div>' +
                '</div>';
        }).join('');
        
        selecionarLojaPortal(lojaAtualIndex, false);
    } catch (e) {
        console.error('Erro ao carregar lojas:', e);
    }
}

function selecionarLojaPortal(index, scrollTo) {
    if (index < 0 || index >= lojasCadastradas.length) return;
    
    lojaAtualIndex = index;
    lojaSelecionada = lojasCadastradas[index];
    
    console.log('🏪 Loja selecionada no portal:', lojaSelecionada.nome);
    
    // Atualizar informações no card do portal
    const nomeLojaEl = document.getElementById('portalNomeLoja');
    const sloganLojaEl = document.getElementById('portalSloganLoja');
    const logoEl = document.getElementById('portalLogo');
    const statsEl = document.getElementById('portalStats');
    
    if (nomeLojaEl) nomeLojaEl.textContent = lojaSelecionada.nome;
    if (sloganLojaEl) sloganLojaEl.textContent = lojaSelecionada.slogan || '';
    if (logoEl) logoEl.src = lojaSelecionada.logo || 'logo-lpx-tecnologia.jpg';
    
    const stats = lojaSelecionada.stats || {};
    if (statsEl) {
        statsEl.innerHTML = '⭐ ' + (stats.estrelas || '5.0') +
            ' • ✂️ ' + (stats.cortes || '0') + ' serviços' +
            ' • 📍 ' + (stats.distancia || '0') + 'km';
    }
    
    // Atualizar cards visuais
    document.querySelectorAll('.portal-loja-card').forEach(function(c, i) {
        c.classList.toggle('ativa', i === index);
    });
    
    // Scroll suave
    if (scrollTo !== false) {
        const carr = document.getElementById('portalCarrossel');
        const card = document.getElementById('lojaCard' + index);
        if (carr && card) {
            carr.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' });
        }
    }
}

function entrarNaLoja() {
    if (!lojaSelecionada) {
        mostrarToast('❌ Selecione uma loja primeiro!', 'error');
        return;
    }
    
    // Salvar loja selecionada no localStorage
    const dadosLoja = {
        id: lojaSelecionada.id,
        nome: lojaSelecionada.nome,
        logo: lojaSelecionada.logo || 'logo-lpx-tecnologia.jpg',
        slogan: lojaSelecionada.slogan || ''
    };
    localStorage.setItem('barbeariaRM_loja', JSON.stringify(dadosLoja));
    
    mostrarToast('🏪 ' + lojaSelecionada.nome + ' selecionada! Faça login para continuar.', 'success');
    
    // Mostrar formulários de login
    const loginContainer = document.getElementById('loginFormsContainer');
    if (loginContainer) {
        loginContainer.style.display = 'block';
        document.getElementById('loginFormCliente').style.display = 'block';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        
        // Resetar tabs
        document.querySelectorAll('.login-tab').forEach(function(tab, i) {
            tab.classList.toggle('active', i === 0);
        });
        
        setTimeout(function() {
            loginContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}

// ==========================================================
// ===== LOGIN/LOGOUT =====
// ==========================================================
async function loginCliente() {
    var e = document.getElementById('loginEmailCliente')?.value.trim();
    var s = document.getElementById('loginSenhaCliente')?.value;
    
    if (!e || !s) {
        mostrarToast('❌ Preencha email e senha!', 'error');
        return;
    }
    
    try {
        var sn = await db.collection('clientes')
            .where('email', '==', e)
            .where('senha', '==', s)
            .get();
        
        if (sn.empty) {
            mostrarToast('❌ Email ou senha inválidos!', 'error');
            return;
        }
        
        var d = sn.docs[0];
        clienteLogado = { id: d.id, ...d.data() };
        barbeiroLogado = null;
        salvarSessao('cliente', clienteLogado);
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        document.getElementById('loginFormsContainer').style.display = 'none';
        
        // ATUALIZAR HEADER PARA MODO LOJA
        atualizarHeader();
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
        
    } catch (er) {
        console.error('Erro ao fazer login:', er);
        mostrarToast('❌ Erro ao fazer login!', 'error');
    }
}

async function loginBarbeiro() {
    var e = document.getElementById('loginEmailBarbeiro')?.value.trim();
    var s = document.getElementById('loginSenhaBarbeiro')?.value;
    
    if (!e || !s) {
        mostrarToast('❌ Preencha email e senha!', 'error');
        return;
    }
    
    try {
        var sn = await db.collection('barbeiros')
            .where('email', '==', e)
            .where('senha', '==', s)
            .get();
        
        if (sn.empty) {
            mostrarToast('❌ Email ou senha inválidos!', 'error');
            return;
        }
        
        var d = sn.docs[0];
        barbeiroLogado = { id: d.id, ...d.data() };
        clienteLogado = null;
        salvarSessao('barbeiro', barbeiroLogado);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        document.getElementById('loginFormsContainer').style.display = 'none';
        
        // ATUALIZAR HEADER PARA MODO LOJA
        atualizarHeader();
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
    } catch (er) {
        console.error('Erro ao fazer login:', er);
        mostrarToast('❌ Erro ao fazer login!', 'error');
    }
}

function sairCliente() {
    clienteLogado = null;
    limparSessao();
    localStorage.removeItem('barbeariaRM_loja'); // REMOVER LOJA AO SAIR
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    document.getElementById('loginFormsContainer').style.display = 'none';
    atualizarHeader(); // VOLTAR PARA MODO PORTAL
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    limparSessao();
    localStorage.removeItem('barbeariaRM_loja'); // REMOVER LOJA AO SAIR
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    document.getElementById('loginFormsContainer').style.display = 'none';
    atualizarHeader(); // VOLTAR PARA MODO PORTAL
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== SESSÃO =====
// ==========================================================
function salvarSessao(tipo, dados) {
    var s = {
        tipo: tipo,
        id: dados.id,
        nome: dados.nome,
        email: dados.email,
        celular: dados.celular || '',
        senha: dados.senha || '',
        fotoPerfil: dados.fotoPerfil || '',
        timestamp: Date.now()
    };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(s));
}

function carregarSessao() {
    var s = localStorage.getItem('barbeariaRM_sessao');
    if (!s) return null;
    try {
        var p = JSON.parse(s);
        if ((Date.now() - p.timestamp) / 86400000 > 7) {
            localStorage.removeItem('barbeariaRM_sessao');
            return null;
        }
        return p;
    } catch (e) {
        localStorage.removeItem('barbeariaRM_sessao');
        return null;
    }
}

function limparSessao() {
    localStorage.removeItem('barbeariaRM_sessao');
}

async function restaurarSessao() {
    var sessao = carregarSessao();
    if (!sessao) return false;
    
    try {
        if (sessao.tipo === 'cliente') {
            var sn = await db.collection('clientes')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!sn.empty) {
                var d = sn.docs[0];
                clienteLogado = { id: d.id, ...d.data() };
                barbeiroLogado = null;
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                atualizarHeader(); // MODO LOJA
                mostrarTela('homeClienteScreen');
                return true;
            }
        } else if (sessao.tipo === 'barbeiro') {
            var sn = await db.collection('barbeiros')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            if (!sn.empty) {
                var d = sn.docs[0];
                barbeiroLogado = { id: d.id, ...d.data() };
                clienteLogado = null;
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                atualizarHeader(); // MODO LOJA
                mostrarTela('homeBarbeiroScreen');
                return true;
            }
        }
    } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
    }
    
    limparSessao();
    localStorage.removeItem('barbeariaRM_loja');
    return false;
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    // Gerenciar bottom nav
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    
    var telasCliente = ['homeClienteScreen', 'agendamentoScreen', 'galeriaCortesScreen', 
                        'reelsScreen', 'anunciosScreen', 'liveScreen', 'perfilClienteScreen'];
    var telasBarbeiro = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 
                         'criarPlanoScreen', 'editarPlanoScreen', 'horariosTrabalhoScreen', 
                         'liveScreen', 'perfilBarbeiroScreen'];
    
    if (nc) nc.style.display = telasCliente.includes(id) ? 'flex' : 'none';
    if (nb) nb.style.display = telasBarbeiro.includes(id) ? 'flex' : 'none';
    
    // Se voltar para tela de login, mostrar header do portal
    if (id === 'loginScreen') {
        localStorage.removeItem('barbeariaRM_loja');
        atualizarHeader();
        carregarLojasPortal();
    }
    
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LPX Tecnologia - Sistema iniciando...');
    
    // 1. Inicializar tema
    inicializarTema();
    
    // 2. Mostrar header do PORTAL (LPX Tecnologia)
    mostrarHeaderPortal();
    
    // 3. Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // 4. Esconder navegação
    if (document.getElementById('bottomNavCliente')) {
        document.getElementById('bottomNavCliente').style.display = 'none';
    }
    if (document.getElementById('bottomNavBarbeiro')) {
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
    }
    
    // 5. Esconder formulários de login
    const loginContainer = document.getElementById('loginFormsContainer');
    if (loginContainer) loginContainer.style.display = 'none';
    if (document.getElementById('loginFormCliente')) {
        document.getElementById('loginFormCliente').style.display = 'none';
    }
    if (document.getElementById('loginFormBarbeiro')) {
        document.getElementById('loginFormBarbeiro').style.display = 'none';
    }
    
    // 6. Carregar lojas do portal
    carregarLojasPortal();
    
    // 7. Tentar restaurar sessão
    restaurarSessao().then(function(sessaoRestaurada) {
        if (!sessaoRestaurada) {
            document.getElementById('loginScreen').classList.add('active');
        }
    });
    
    console.log('✅ Sistema pronto!');
    console.log('🌐 Header:', document.getElementById('headerTitle')?.textContent);
});
