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
var imagemPlanoBase64 = '';
var anuncioImagemBase64 = '';
var todosPosts = [];
var todosReels = [];
var reelsAtual = 0;
var postSelecionadoId = null;
var horariosTrabalho = {
    diasTrabalho: ['segunda','terca','quarta','quinta','sexta','sabado'],
    horarioInicio: '09:00',
    horarioFim: '18:00',
    intervaloCortes: 30,
    folgas: []
};
var liveLocalStream = null;
var liveChatInterval = null;
var liveAtiva = false;
var liveChatMessages = [];
var liveViewerId = null;
var liveViewerInterval = null;
var liveLikes = 0;
var liveLiked = false;
var liveFrameInterval = null;
var liveFrameCanvas = null;
var liveFrameCtx = null;
var liveViewersAtivos = {};
var liveUltimoFrameEnviado = 0;
var liveCarregandoLive = false;
var liveAudioMonitor = null;
var liveTelaAtiva = 1;
var liveAnuncioAtivo = false;
var lojasCadastradas = [];
var lojaSelecionada = null;
var lojaAtualIndex = 0;

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
    const btn = document.querySelector('.header-btn[onclick="toggleModoEscuro()"] i');
    if (btn) {
        if (document.body.classList.contains('light-mode')) {
            btn.className = 'fas fa-sun';
        } else {
            btn.className = 'fas fa-moon';
        }
    }
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
                mostrarTela('homeClienteScreen');
                atualizarHeaderLoja();
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
                mostrarTela('homeBarbeiroScreen');
                atualizarHeaderLoja();
                return true;
            }
        }
    } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
    }
    
    limparSessao();
    return false;
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

function voltarParaLogin() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
}

function switchLoginTab(tipo) {
    document.querySelectorAll('.login-tab').forEach(function(t) {
        t.classList.remove('active');
    });
    
    if (tipo === 'cliente') {
        document.querySelector('.login-tab:nth-child(1)').classList.add('active');
        document.getElementById('loginFormCliente').style.display = 'block';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
    } else {
        document.querySelector('.login-tab:nth-child(2)').classList.add('active');
        document.getElementById('loginFormCliente').style.display = 'none';
        document.getElementById('loginFormBarbeiro').style.display = 'block';
    }
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
                logo: 'logobarbearia-rm.png',
                dono: 'Admin',
                stats: { estrelas: 5.0, cortes: 1200, distancia: 0 }
            }];
        }
        
        carrossel.innerHTML = lojasCadastradas.map(function(loja, i) {
            var icones = {
                barbearia: '💈',
                salao: '💇',
                estetica: '✨',
                tatuagem: '🎨',
                petshop: '🐾',
                tecnologia: '💻',
                outro: '📦'
            };
            var icone = icones[loja.categoria] || '🏪';
            var ativa = i === lojaAtualIndex ? ' ativa' : '';
            
            return '<div class="portal-loja-card' + ativa + '" onclick="selecionarLoja(' + i + ')" id="lojaCard' + i + '">' +
                (loja.logo ? '<img src="' + loja.logo + '" class="portal-loja-card-logo" alt="' + loja.nome + '">' :
                '<div class="portal-loja-card-icone">' + icone + '</div>') +
                '<div class="portal-loja-card-nome">' + loja.nome + '</div>' +
                '<div class="portal-loja-card-categoria">' + icone + ' ' + (loja.categoria || 'Loja') + '</div>' +
                '</div>';
        }).join('');
        
        var inds = document.getElementById('portalIndicadores');
        if (inds && lojasCadastradas.length > 1) {
            inds.innerHTML = lojasCadastradas.map(function(_, i) {
                return '<div class="portal-indicador' + (i === lojaAtualIndex ? ' ativo' : '') + '" id="ind' + i + '"></div>';
            }).join('');
        }
        
        selecionarLoja(lojaAtualIndex, false);
        
        carrossel.addEventListener('scroll', function() {
            var idx = Math.round(carrossel.scrollLeft / 152);
            if (idx !== lojaAtualIndex && idx >= 0 && idx < lojasCadastradas.length) {
                selecionarLoja(idx, false);
            }
        });
    } catch (e) {
        console.error('Erro ao carregar lojas:', e);
    }
}

function selecionarLoja(index, scrollTo) {
    if (index < 0 || index >= lojasCadastradas.length) return;
    
    lojaAtualIndex = index;
    lojaSelecionada = lojasCadastradas[index];
    
    // Atualizar informações da loja selecionada
    var nomeLojaEl = document.getElementById('portalNomeLoja');
    var sloganLojaEl = document.getElementById('portalSloganLoja');
    var logoEl = document.getElementById('portalLogo');
    var statsEl = document.getElementById('portalStats');
    
    if (nomeLojaEl) nomeLojaEl.textContent = lojaSelecionada.nome;
    if (sloganLojaEl) sloganLojaEl.textContent = lojaSelecionada.slogan || 'Sua melhor escolha';
    if (logoEl) logoEl.src = lojaSelecionada.logo || 'logobarbearia-rm.png';
    
    var stats = lojaSelecionada.stats || {};
    if (statsEl) {
        statsEl.innerHTML = '⭐ ' + (stats.estrelas || '5.0') +
            ' • ✂️ ' + (stats.cortes || '0') + ' serviços' +
            ' • 📍 ' + (stats.distancia || '0') + 'km';
    }
    
    // Atualizar cards
    document.querySelectorAll('.portal-loja-card').forEach(function(c, i) {
        c.classList.toggle('ativa', i === index);
    });
    
    // Atualizar indicadores
    document.querySelectorAll('.portal-indicador').forEach(function(d, i) {
        d.classList.toggle('ativo', i === index);
    });
    
    // Scroll suave
    if (scrollTo !== false) {
        var carr = document.getElementById('portalCarrossel');
        var card = document.getElementById('lojaCard' + index);
        if (carr && card) {
            carr.scrollTo({
                left: card.offsetLeft - 20,
                behavior: 'smooth'
            });
        }
    }
    
    // Salvar loja selecionada
    localStorage.setItem('barbeariaRM_loja', JSON.stringify({
        id: lojaSelecionada.id,
        nome: lojaSelecionada.nome,
        logo: lojaSelecionada.logo || 'logobarbearia-rm.png',
        slogan: lojaSelecionada.slogan || ''
    }));
    
    // Atualizar header
    atualizarHeaderLoja();
}

function entrarNaLoja() {
    if (!lojaSelecionada) {
        mostrarToast('❌ Selecione uma loja primeiro!', 'error');
        return;
    }
    
    mostrarToast('🏪 Entrando em ' + lojaSelecionada.nome + '...', 'success');
    
    // Mostrar formulários de login
    var loginContainer = document.getElementById('loginFormsContainer');
    if (loginContainer) {
        loginContainer.style.display = 'block';
        document.getElementById('loginFormCliente').style.display = 'block';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
    }
}

// ==========================================================
// ===== ATUALIZAR HEADER COM PERFIL DA LOJA =====
// ==========================================================
function atualizarHeaderLoja() {
    var lojaSalva = localStorage.getItem('barbeariaRM_loja');
    if (lojaSalva) {
        try {
            var loja = JSON.parse(lojaSalva);
            var logoImg = document.getElementById('headerLogoImg');
            var titleEl = document.getElementById('headerTitle');
            var sloganEl = document.getElementById('headerSlogan');
            
            if (logoImg) logoImg.src = loja.logo || 'logobarbearia-rm.png';
            if (titleEl) titleEl.textContent = loja.nome || 'LPX Tecnologia';
            if (sloganEl) sloganEl.textContent = loja.slogan || 'Inovação que transforma';
        } catch (e) {
            console.error('Erro ao atualizar header:', e);
        }
    }
    
    // Atualizar avatar do cliente
    if (clienteLogado && clienteLogado.fotoPerfil) {
        var av = document.querySelector('#clienteAvatarHeader img');
        if (av) av.src = clienteLogado.fotoPerfil;
    }
    
    // Atualizar avatar do barbeiro
    if (barbeiroLogado && barbeiroLogado.fotoPerfil) {
        var av = document.querySelector('#barbeiroAvatarHeader img');
        if (av) av.src = barbeiroLogado.fotoPerfil;
    }
}

// ==========================================================
// ===== CADASTRO DE LOJA =====
// ==========================================================
function previewLogoLoja(event) {
    var f = event.target.files[0];
    if (!f) return;
    
    var r = new FileReader();
    r.onload = function(e) {
        var preview = document.getElementById('logoLojaPreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        var input = document.getElementById('cadLogoLoja');
        if (input) input.value = e.target.result;
    };
    r.readAsDataURL(f);
}

async function cadastrarLoja() {
    var n = document.getElementById('cadNomeLoja')?.value.trim();
    var sl = document.getElementById('cadSloganLoja')?.value.trim();
    var cat = document.getElementById('cadCategoriaLoja')?.value;
    var dono = document.getElementById('cadDonoLoja')?.value.trim();
    var email = document.getElementById('cadEmailLoja')?.value.trim();
    var whats = document.getElementById('cadWhatsappLoja')?.value.trim();
    var end = document.getElementById('cadEnderecoLoja')?.value.trim();
    var logo = document.getElementById('cadLogoLoja')?.value || 'logobarbearia-rm.png';
    var senha = document.getElementById('cadSenhaLoja')?.value;
    
    if (!n || !dono || !email || !senha) {
        mostrarToast('❌ Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    if (senha.length < 6) {
        mostrarToast('❌ A senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    try {
        // Verificar se email já existe
        var sn = await db.collection('lojas').where('email', '==', email).get();
        if (!sn.empty) {
            mostrarToast('❌ Este email já está cadastrado!', 'error');
            return;
        }
        
        var id = Date.now().toString();
        var loja = {
            id: id,
            nome: n,
            slogan: sl || 'Sua melhor escolha',
            categoria: cat || 'outro',
            dono: dono,
            email: email,
            whatsapp: whats || '',
            endereco: end || '',
            logo: logo,
            senha: senha,
            stats: {
                estrelas: 5.0,
                cortes: 0,
                distancia: 0
            },
            dataCriacao: new Date().toISOString()
        };
        
        // Salvar loja
        await db.collection('lojas').doc(id).set(loja);
        
        // Criar conta de barbeiro automaticamente
        await db.collection('barbeiros').doc(id).set({
            id: id,
            nome: dono,
            email: email,
            celular: whats || '',
            senha: senha,
            lojaId: id,
            lojaNome: n,
            fotoPerfil: logo,
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Loja cadastrada com sucesso!', 'success');
        
        // Limpar formulário
        limparFormularioLoja();
        
        // Recarregar lojas
        await carregarLojasPortal();
        mostrarTela('loginScreen');
        
    } catch (e) {
        console.error('Erro ao cadastrar loja:', e);
        mostrarToast('❌ Erro ao cadastrar: ' + e.message, 'error');
    }
}

function limparFormularioLoja() {
    var campos = ['cadNomeLoja', 'cadSloganLoja', 'cadDonoLoja', 'cadEmailLoja', 
                  'cadWhatsappLoja', 'cadEnderecoLoja', 'cadSenhaLoja'];
    campos.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    var preview = document.getElementById('logoLojaPreview');
    if (preview) preview.style.display = 'none';
    
    var inputLogo = document.getElementById('cadLogoLoja');
    if (inputLogo) inputLogo.value = '';
}

// ==========================================================
// ===== LOGIN/CADASTRO =====
// ==========================================================
async function cadastrarCliente() {
    var n = document.getElementById('cadNomeCliente')?.value.trim();
    var e = document.getElementById('cadEmailCliente')?.value.trim();
    var c = document.getElementById('cadCelularCliente')?.value.trim();
    var s = document.getElementById('cadSenhaCliente')?.value;
    
    if (!n || !e || !c || !s) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    
    if (s.length < 6) {
        mostrarToast('❌ Senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    try {
        var sn = await db.collection('clientes').where('email', '==', e).get();
        if (!sn.empty) {
            mostrarToast('❌ Email já cadastrado!', 'error');
            return;
        }
        
        var id = Date.now().toString();
        var cl = {
            id: id,
            nome: n,
            email: e,
            celular: c,
            senha: s,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };
        
        await db.collection('clientes').doc(id).set(cl);
        clienteLogado = cl;
        barbeiroLogado = null;
        salvarSessao('cliente', cl);
        
        document.getElementById('welcomeClienteNome').textContent = n;
        mostrarToast('✅ Cadastro realizado com sucesso!', 'success');
        mostrarTela('homeClienteScreen');
        
        // Limpar formulário
        limparFormularioCliente();
        
    } catch (er) {
        console.error('Erro ao cadastrar cliente:', er);
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

async function cadastrarBarbeiro() {
    var n = document.getElementById('cadNomeBarbeiro')?.value.trim();
    var e = document.getElementById('cadEmailBarbeiro')?.value.trim();
    var c = document.getElementById('cadCelularBarbeiro')?.value.trim();
    var s = document.getElementById('cadSenhaBarbeiro')?.value;
    
    if (!n || !e || !c || !s) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    
    if (s.length < 6) {
        mostrarToast('❌ Senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    try {
        var sn = await db.collection('barbeiros').where('email', '==', e).get();
        if (!sn.empty) {
            mostrarToast('❌ Email já cadastrado!', 'error');
            return;
        }
        
        var id = Date.now().toString();
        var bb = {
            id: id,
            nome: n,
            email: e,
            celular: c,
            senha: s,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };
        
        await db.collection('barbeiros').doc(id).set(bb);
        barbeiroLogado = bb;
        clienteLogado = null;
        salvarSessao('barbeiro', bb);
        
        document.getElementById('welcomeBarbeiroNome').textContent = n;
        mostrarToast('✅ Cadastro realizado com sucesso!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        // Limpar formulário
        limparFormularioBarbeiro();
        
    } catch (er) {
        console.error('Erro ao cadastrar barbeiro:', er);
        mostrarToast('❌ Erro: ' + er.message, 'error');
    }
}

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
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        atualizarHeaderLoja();
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
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        atualizarHeaderLoja();
        mostrarTela('homeBarbeiroScreen');
        
    } catch (er) {
        console.error('Erro ao fazer login:', er);
        mostrarToast('❌ Erro ao fazer login!', 'error');
    }
}

function limparFormularioCliente() {
    ['cadNomeCliente', 'cadEmailCliente', 'cadCelularCliente', 'cadSenhaCliente'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function limparFormularioBarbeiro() {
    ['cadNomeBarbeiro', 'cadEmailBarbeiro', 'cadCelularBarbeiro', 'cadSenhaBarbeiro'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function sairCliente() {
    removerViewerLive();
    clienteLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    document.getElementById('loginFormsContainer').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    encerrarLive();
    barbeiroLogado = null;
    limparSessao();
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    document.getElementById('loginFormsContainer').style.display = 'none';
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
        var sn = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var ag = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (ag.length === 0) {
            c.innerHTML = '<p class="empty-state">📅 Nenhum agendamento</p>';
            return;
        }
        
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'concluido' ? 'concluido' : 
                     a.status === 'confirmado' ? 'confirmado' : 
                     a.status === 'cancelado' ? 'cancelado' : 'pendente';
            
            var st = a.status === 'concluido' ? '✅ Concluído R$' + (a.valor || '0') :
                     a.status === 'confirmado' ? '✅ Confirmado' :
                     a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            
            var botoes = '';
            if (a.status === 'pendente') {
                botoes = '<button class="btn-sm btn-sm-success" onclick="confirmarAgendamento(\'' + a.id + '\')">✅</button>' +
                        '<button class="btn-sm btn-sm-danger" onclick="cancelarAgendamento(\'' + a.id + '\')">❌</button>';
            } else if (a.status === 'confirmado') {
                botoes = '<button class="btn-sm btn-sm-primary" onclick="concluirServico(\'' + a.id + '\')">💰 Concluir</button>' +
                        '<button class="btn-sm btn-sm-danger" onclick="cancelarAgendamento(\'' + a.id + '\')">❌ Cancelar</button>';
            }
            
            return '<div class="agenda-item">' +
                '<div class="agenda-info">' +
                '<div class="agenda-cliente">👤 ' + (a.clienteNome || 'Cliente') + '</div>' +
                '<div class="agenda-data">📅 ' + (a.data || 'N/A') + ' • ⏰ ' + (a.horario || 'N/A') + ' - ' + (a.tipo || 'Serviço') + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:4px;align-items:center;">' +
                '<span class="agenda-status ' + sc + '">' + st + '</span>' + botoes +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar agendamentos:', e);
    }
}

async function confirmarAgendamento(id) {
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
        mostrarToast('✅ Agendamento confirmado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro ao confirmar!', 'error');
    }
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
        await db.collection('agendamentos').doc(id).update({ 
            status: 'cancelado', 
            motivoCancelamento: 'Cancelado pelo barbeiro' 
        });
        mostrarToast('❌ Agendamento cancelado!', 'info');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro ao cancelar!', 'error');
    }
}

async function concluirServico(id) {
    var valor = prompt('💰 Digite o valor do serviço (R$):', '35.00');
    if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        mostrarToast('❌ Valor inválido!', 'error');
        return;
    }
    
    valor = parseFloat(valor).toFixed(2);
    try {
        await db.collection('agendamentos').doc(id).update({
            status: 'concluido',
            valor: parseFloat(valor),
            dataConclusao: new Date().toISOString()
        });
        mostrarToast('✅ Serviço concluído! R$ ' + valor, 'success');
        carregarAgendamentosBarbeiro();
        calcularFaturamento();
        if (clienteLogado) carregarAgendaCliente();
    } catch (e) {
        mostrarToast('❌ Erro ao concluir!', 'error');
    }
}

async function agendarCorte() {
    if (!clienteLogado) {
        mostrarToast('❌ Faça login primeiro!', 'error');
        return;
    }
    
    var d = document.getElementById('agendamentoData')?.value;
    var h = document.getElementById('agendamentoHorario')?.value || '10:00';
    var t = document.getElementById('agendamentoTipo')?.value || 'Corte';
    
    if (!d) {
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
            data: d,
            horario: h,
            tipo: t,
            status: 'pendente',
            valor: 0,
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Agendamento realizado!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeClienteScreen');
    } catch (e) {
        mostrarToast('❌ Erro ao agendar!', 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    
    var c = document.getElementById('agendaClienteContainer');
    if (!c) return;
    
    try {
        var sn = await db.collection('agendamentos')
            .where('clienteId', '==', clienteLogado.id)
            .get();
        
        var ag = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (ag.length === 0) {
            c.innerHTML = '<p class="empty-state">📅 Nenhum agendamento</p>';
            return;
        }
        
        ag.sort((a, b) => new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario));
        
        c.innerHTML = ag.map(function(a) {
            var sc = a.status === 'concluido' ? 'concluido' : 
                     a.status === 'confirmado' ? 'confirmado' : 
                     a.status === 'cancelado' ? 'cancelado' : 'pendente';
            
            var st = a.status === 'concluido' ? '✅ Concluído' :
                     a.status === 'confirmado' ? '✅ Confirmado' :
                     a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            
            return '<div class="agenda-item">' +
                '<div class="agenda-info">' +
                '<div class="agenda-cliente">' + a.tipo + '</div>' +
                '<div class="agenda-data">📅 ' + a.data + ' • ⏰ ' + a.horario + '</div>' +
                '</div>' +
                '<span class="agenda-status ' + sc + '">' + st + '</span>' +
                '</div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar agenda:', e);
    }
}

// ==========================================================
// ===== FATURAMENTO =====
// ==========================================================
async function calcularFaturamento() {
    try {
        var sn = await db.collection('agendamentos').where('status', '==', 'concluido').get();
        var ag = sn.docs.map(function(d) { return d.data(); });
        
        var hoje = new Date().toISOString().split('T')[0];
        var semanaInicio = new Date();
        semanaInicio.setDate(semanaInicio.getDate() - 7);
        var mesInicio = new Date();
        mesInicio.setMonth(mesInicio.getMonth() - 1);
        var anoInicio = new Date();
        anoInicio.setFullYear(anoInicio.getFullYear() - 1);
        
        var valorHoje = 0, valorSemana = 0, valorMes = 0, valorAno = 0;
        
        ag.forEach(function(a) {
            var v = a.valor || 0;
            if (a.data === hoje) valorHoje += v;
            if (a.data >= semanaInicio.toISOString().split('T')[0]) valorSemana += v;
            if (a.data >= mesInicio.toISOString().split('T')[0]) valorMes += v;
            if (a.data >= anoInicio.toISOString().split('T')[0]) valorAno += v;
        });
        
        document.getElementById('faturamentoHoje').textContent = 'R$ ' + valorHoje.toFixed(2);
        document.getElementById('faturamentoSemana').textContent = 'R$ ' + valorSemana.toFixed(2);
        document.getElementById('faturamentoMes').textContent = 'R$ ' + valorMes.toFixed(2);
        document.getElementById('faturamentoAno').textContent = 'R$ ' + valorAno.toFixed(2);
    } catch (e) {
        console.error('Erro ao calcular faturamento:', e);
    }
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================
function mostrarTela(id) {
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // Mostrar tela selecionada
    var el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
    } else {
        console.error('Tela não encontrada:', id);
    }
    
    // Gerenciar bottom nav
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    
    var telasCliente = ['homeClienteScreen', 'agendamentoScreen', 'galeriaCortesScreen', 
                        'reelsScreen', 'anunciosScreen', 'liveScreen', 'perfilClienteScreen',
                        'detalhePostScreen', 'pagamentoScreen'];
    
    var telasBarbeiro = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 
                         'criarPlanoScreen', 'editarPlanoScreen', 'horariosTrabalhoScreen', 
                         'liveScreen', 'perfilBarbeiroScreen'];
    
    if (nc) nc.style.display = telasCliente.includes(id) ? 'flex' : 'none';
    if (nb) nb.style.display = telasBarbeiro.includes(id) ? 'flex' : 'none';
    
    // Carregar dados específicos
    if (id === 'homeClienteScreen') {
        carregarFeedCliente();
        carregarAgendaCliente();
        verificarLiveAtiva();
    }
    
    if (id === 'homeBarbeiroScreen') {
        carregarAgendamentosBarbeiro();
        carregarPlanos();
        calcularFaturamento();
        carregarMeusPosts();
        verificarLiveAtiva();
    }
    
    if (id === 'anunciosScreen') {
        carregarAnuncios();
        var formAnuncio = document.getElementById('formAnuncio');
        if (formAnuncio) {
            formAnuncio.style.display = barbeiroLogado ? 'block' : 'none';
        }
    }
    
    if (id === 'liveScreen') {
        carregarLive();
    }
    
    if (id === 'perfilClienteScreen') {
        carregarPerfilCliente();
    }
    
    if (id === 'perfilBarbeiroScreen') {
        carregarPerfilBarbeiro();
    }
    
    if (id === 'galeriaCortesScreen') {
        carregarGaleria();
    }
    
    if (id === 'reelsScreen') {
        carregarReels();
    }
    
    if (id === 'horariosTrabalhoScreen') {
        carregarHorarios();
    }
    
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== PERFIL CLIENTE =====
// ==========================================================
function carregarPerfilCliente() {
    if (!clienteLogado) return;
    
    var nomeEl = document.getElementById('perfilClienteNome');
    var emailEl = document.getElementById('perfilClienteEmail');
    
    if (nomeEl) nomeEl.textContent = clienteLogado.nome || '';
    if (emailEl) emailEl.textContent = clienteLogado.email || '';
    
    var editNome = document.getElementById('editClienteNome');
    var editCelular = document.getElementById('editClienteCelular');
    
    if (editNome) editNome.value = clienteLogado.nome || '';
    if (editCelular) editCelular.value = clienteLogado.celular || '';
}

async function salvarPerfilCliente() {
    if (!clienteLogado) return;
    
    var n = document.getElementById('editClienteNome')?.value.trim();
    var c = document.getElementById('editClienteCelular')?.value.trim();
    
    if (!n) {
        mostrarToast('❌ Nome é obrigatório!', 'error');
        return;
    }
    
    try {
        await db.collection('clientes').doc(clienteLogado.id).update({
            nome: n,
            celular: c
        });
        
        clienteLogado.nome = n;
        clienteLogado.celular = c;
        salvarSessao('cliente', clienteLogado);
        mostrarToast('✅ Perfil atualizado!', 'success');
    } catch (e) {
        mostrarToast('❌ Erro ao salvar!', 'error');
    }
}

// ==========================================================
// ===== PERFIL BARBEIRO =====
// ==========================================================
function carregarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    
    var nomeEl = document.getElementById('perfilBarbeiroNome');
    var emailEl = document.getElementById('perfilBarbeiroEmail');
    
    if (nomeEl) nomeEl.textContent = barbeiroLogado.nome || '';
    if (emailEl) emailEl.textContent = barbeiroLogado.email || '';
    
    var editNome = document.getElementById('editBarbeiroNome');
    var editCelular = document.getElementById('editBarbeiroCelular');
    var editEmail = document.getElementById('editBarbeiroEmail');
    
    if (editNome) editNome.value = barbeiroLogado.nome || '';
    if (editCelular) editCelular.value = barbeiroLogado.celular || '';
    if (editEmail) editEmail.value = barbeiroLogado.email || '';
}

async function salvarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    
    var n = document.getElementById('editBarbeiroNome')?.value.trim();
    var c = document.getElementById('editBarbeiroCelular')?.value.trim();
    var e = document.getElementById('editBarbeiroEmail')?.value.trim();
    
    if (!n || !e) {
        mostrarToast('❌ Nome e email são obrigatórios!', 'error');
        return;
    }
    
    try {
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({
            nome: n,
            celular: c,
            email: e
        });
        
        barbeiroLogado.nome = n;
        barbeiroLogado.celular = c;
        barbeiroLogado.email = e;
        salvarSessao('barbeiro', barbeiroLogado);
        mostrarToast('✅ Perfil atualizado!', 'success');
    } catch (er) {
        mostrarToast('❌ Erro ao salvar!', 'error');
    }
}

// ==========================================================
// ===== FEED / POSTS =====
// ==========================================================
async function carregarFeedCliente() {
    var c = document.getElementById('feedClienteContainer');
    if (!c) return;
    
    try {
        var sn = await db.collection('posts').orderBy('dataCriacao', 'desc').limit(20).get();
        var posts = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        todosPosts = posts;
        
        if (posts.length === 0) {
            c.innerHTML = '<div class="card-modern" style="text-align:center;padding:40px;">' +
                         '<h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3>' +
                         '<p style="color:#6B7280;">Seja o primeiro a publicar!</p></div>';
            return;
        }
        
        c.innerHTML = posts.map(function(post) {
            var com = post.comentarios || [];
            return '<div class="feed-post">' +
                '<div class="feed-post-header">' +
                '<div class="feed-post-avatar">✂️</div>' +
                '<div class="feed-post-user">' +
                '<div class="feed-post-user-name">' + (post.barbeiroNome || 'Barbearia RM') + '</div>' +
                '<div class="feed-post-user-time">' + new Date(post.dataCriacao).toLocaleDateString('pt-BR') + '</div>' +
                '</div></div>' +
                (post.video ? '<video class="feed-post-video" controls><source src="' + post.video + '" type="video/mp4"></video>' :
                 post.imagem ? '<img src="' + post.imagem + '" class="feed-post-image" alt="Post">' : '') +
                '<div class="feed-post-body">' +
                '<div class="feed-post-title">' + post.titulo + '</div>' +
                '<div class="feed-post-price">R$ ' + (post.preco ? post.preco.toFixed(2) : '0,00') + '</div>' +
                '</div>' +
                '<div class="feed-post-actions">' +
                '<button onclick="likePost(\'' + post.id + '\',this)">❤️ ' + (post.likes || 0) + '</button>' +
                '<button onclick="abrirComentarios(\'' + post.id + '\')">💬 ' + com.length + '</button>' +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar feed:', e);
    }
}

async function carregarMeusPosts() {
    var c = document.getElementById('meusPostsContainer');
    if (!c || !barbeiroLogado) return;
    
    try {
        var sn = await db.collection('posts')
            .where('barbeiroId', '==', barbeiroLogado.id)
            .get();
        
        var posts = [];
        sn.forEach(function(d) {
            posts.push({ id: d.id, ...d.data() });
        });
        
        posts.sort(function(a, b) {
            return new Date(b.dataCriacao) - new Date(a.dataCriacao);
        });
        
        if (posts.length === 0) {
            c.innerHTML = '<p class="empty-state">📸 Nenhum post criado</p>';
            return;
        }
        
        c.innerHTML = posts.map(function(post) {
            return '<div class="post-item">' +
                '<div class="post-header">' +
                '<span class="post-title">' + post.titulo + '</span>' +
                '<span class="post-price">R$ ' + (post.preco ? post.preco.toFixed(2) : '0,00') + '</span>' +
                '</div>' +
                (post.imagem ? '<img src="' + post.imagem + '" class="post-thumb">' : '') +
                '<div class="post-stats">❤️ ' + (post.likes || 0) + ' • 💬 ' + (post.comentarios?.length || 0) + '</div>' +
                '<button class="btn-sm btn-sm-danger" onclick="excluirMeuPost(\'' + post.id + '\')">🗑 Excluir</button>' +
                '</div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar posts:', e);
    }
}

function likePost(id, btn) {
    btn.classList.toggle('liked');
    var likes = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
    if (btn.classList.contains('liked')) {
        btn.textContent = '❤️ ' + (likes + 1);
    } else {
        btn.textContent = '❤️ ' + (likes - 1);
    }
}

function abrirComentarios(id) {
    postSelecionadoId = id;
    carregarComentarios(id);
    document.getElementById('modalComentario').classList.add('active');
}

async function carregarComentarios(id) {
    var c = document.getElementById('comentariosContainer');
    if (!c) return;
    
    try {
        var doc = await db.collection('posts').doc(id).get();
        if (!doc.exists) return;
        
        var com = doc.data().comentarios || [];
        c.innerHTML = com.length === 0 ? 
            '<p class="empty-state">Seja o primeiro a comentar!</p>' : 
            com.map(function(c) {
                return '<div class="comentario-item">' +
                    '<strong style="color:#D4A84B;">' + c.autor + '</strong>' +
                    '<p>' + c.texto + '</p>' +
                    '<small>' + new Date(c.data).toLocaleString('pt-BR') + '</small>' +
                    '</div>';
            }).join('');
    } catch (e) {
        console.error('Erro ao carregar comentários:', e);
    }
}

async function adicionarComentario() {
    var t = document.getElementById('novoComentario')?.value.trim();
    if (!t) return;
    
    if (!clienteLogado && !barbeiroLogado) {
        mostrarToast('❌ Faça login para comentar!', 'error');
        return;
    }
    
    var autor = clienteLogado ? clienteLogado.nome : barbeiroLogado.nome;
    
    try {
        var doc = await db.collection('posts').doc(postSelecionadoId).get();
        var com = doc.data().comentarios || [];
        com.push({
            autor: autor,
            texto: t,
            data: new Date().toISOString()
        });
        
        await db.collection('posts').doc(postSelecionadoId).update({
            comentarios: com
        });
        
        document.getElementById('novoComentario').value = '';
        carregarComentarios(postSelecionadoId);
        carregarFeedCliente();
        mostrarToast('💬 Comentário adicionado!', 'success');
    } catch (e) {
        mostrarToast('❌ Erro ao comentar!', 'error');
    }
}

function fecharModalComentario() {
    document.getElementById('modalComentario').classList.remove('active');
}

async function criarPost() {
    if (!barbeiroLogado) return;
    
    var t = document.getElementById('postTitulo')?.value.trim();
    var p = parseFloat(document.getElementById('postPreco')?.value);
    var d = document.getElementById('postDescricao')?.value.trim();
    var img = document.getElementById('postImagem')?.value || '';
    var vid = document.getElementById('postVideo')?.value || '';
    
    if (!t || !p || p <= 0) {
        mostrarToast('❌ Título e preço são obrigatórios!', 'error');
        return;
    }
    
    try {
        var id = Date.now().toString();
        await db.collection('posts').doc(id).set({
            id: id,
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo: t,
            preco: p,
            imagem: img,
            video: vid,
            descricao: d,
            likes: 0,
            comentarios: [],
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Post publicado com sucesso!', 'success');
        
        // Limpar formulário
        ['postTitulo', 'postPreco', 'postDescricao'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        removerImagem();
        removerVideo();
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro ao publicar!', 'error');
    }
}

async function excluirMeuPost(id) {
    if (!confirm('Excluir este post?')) return;
    
    try {
        await db.collection('posts').doc(id).delete();
        mostrarToast('🗑 Post excluído!', 'success');
        carregarMeusPosts();
        carregarFeedCliente();
    } catch (e) {
        mostrarToast('❌ Erro ao excluir!', 'error');
    }
}

// ==========================================================
// ===== UPLOAD DE IMAGENS E VÍDEOS =====
// ==========================================================
function previewImagem(e) {
    var f = e.target.files[0];
    if (!f) return;
    
    var r = new FileReader();
    r.onload = function(ev) {
        imagemBase64 = ev.target.result;
        document.getElementById('postImagem').value = imagemBase64;
        document.getElementById('imagemPreviewImg').src = imagemBase64;
        document.getElementById('imagemPreview').style.display = 'block';
        var uploadArea = document.getElementById('imagemUploadArea');
        if (uploadArea) uploadArea.style.display = 'none';
    };
    r.readAsDataURL(f);
}

function removerImagem() {
    imagemBase64 = '';
    var inputImagem = document.getElementById('postImagem');
    if (inputImagem) inputImagem.value = '';
    var preview = document.getElementById('imagemPreview');
    if (preview) preview.style.display = 'none';
    var uploadArea = document.getElementById('imagemUploadArea');
    if (uploadArea) uploadArea.style.display = 'block';
    var inputFile = document.getElementById('postImagemInput');
    if (inputFile) inputFile.value = '';
}

function previewVideo(e) {
    var f = e.target.files[0];
    if (!f) return;
    
    var r = new FileReader();
    r.onload = function(ev) {
        videoBase64 = ev.target.result;
        document.getElementById('postVideo').value = videoBase64;
        document.getElementById('videoPreviewVideo').src = videoBase64;
        document.getElementById('videoPreview').style.display = 'block';
        var uploadArea = document.getElementById('videoUploadArea');
        if (uploadArea) uploadArea.style.display = 'none';
    };
    r.readAsDataURL(f);
}

function removerVideo() {
    videoBase64 = '';
    var inputVideo = document.getElementById('postVideo');
    if (inputVideo) inputVideo.value = '';
    var preview = document.getElementById('videoPreview');
    if (preview) preview.style.display = 'none';
    var uploadArea = document.getElementById('videoUploadArea');
    if (uploadArea) uploadArea.style.display = 'block';
    var inputFile = document.getElementById('postVideoInput');
    if (inputFile) inputFile.value = '';
}

// ==========================================================
// ===== REELS =====
// ==========================================================
async function carregarReels() {
    var c = document.getElementById('reelsContainer');
    if (!c) return;
    
    try {
        var sn = await db.collection('posts').orderBy('dataCriacao', 'desc').limit(10).get();
        todosReels = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (todosReels.length === 0) {
            c.innerHTML = '<div class="reel-item-modern" style="display:flex;align-items:center;justify-content:center;">' +
                         '<p style="color:#6B7280;font-size:18px;">Nenhum reel disponível</p></div>';
            return;
        }
        
        reelsAtual = 0;
        exibirReel(0);
    } catch (e) {
        console.error('Erro ao carregar reels:', e);
    }
}

function exibirReel(i) {
    if (i < 0) i = 0;
    if (i >= todosReels.length) i = todosReels.length - 1;
    reelsAtual = i;
    
    var post = todosReels[i];
    var container = document.getElementById('reelsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="reel-item-modern">' +
        (post.video ? '<video src="' + post.video + '" autoplay loop muted playsinline></video>' :
         post.imagem ? '<img src="' + post.imagem + '" style="width:100%;height:100%;object-fit:contain;">' :
         '<div style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>') +
        '<div class="reel-overlay-modern">' +
        '<h3>' + post.titulo + '</h3>' +
        '<p>R$ ' + (post.preco ? post.preco.toFixed(2) : '0,00') + '</p>' +
        '</div></div>';
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

// ==========================================================
// ===== LIVE (SIMPLIFICADA) =====
// ==========================================================
async function carregarLive() {
    if (liveCarregandoLive) return;
    liveCarregandoLive = true;
    
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        
        if (doc.exists && doc.data().ativa) {
            liveAtiva = true;
            var live = doc.data();
            
            // Atualizar status
            document.getElementById('livePlaceholder').style.display = 'none';
            document.getElementById('livePlayer').style.display = 'block';
            document.getElementById('liveStatus').style.display = 'block';
            document.getElementById('liveStatusTitulo').textContent = live.titulo;
            document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
            
            var va = live.viewersAtivos || {};
            var count = Object.keys(va).length;
            document.getElementById('liveStatusViewers').textContent = 
                '👥 ' + count + ' • 👁 ' + (live.totalViews || 0) + ' • ❤️ ' + (live.likes || 0);
            
            liveChatMessages = live.chat || [];
            atualizarChat();
            
            if (barbeiroLogado) {
                document.getElementById('liveControls').style.display = 'block';
                document.getElementById('liveViewerCount').textContent = '👥 ' + count;
            }
            
            iniciarChatListener();
        } else {
            liveAtiva = false;
            document.getElementById('livePlaceholder').style.display = 'block';
            document.getElementById('livePlayer').style.display = 'none';
            document.getElementById('liveStatus').style.display = 'none';
        }
    } catch (e) {
        console.error('Erro ao carregar live:', e);
        liveAtiva = false;
    }
    
    liveCarregandoLive = false;
}

async function iniciarLive() {
    if (!barbeiroLogado) {
        mostrarToast('❌ Apenas profissionais podem iniciar live!', 'error');
        return;
    }
    
    var titulo = document.getElementById('liveTitulo')?.value.trim() || '🔴 Live da ' + (barbeiroLogado.lojaNome || 'Barbearia');
    
    try {
        await db.collection('lives').doc('live_atual').set({
            id: 'live_atual',
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo: titulo,
            ativa: true,
            chat: [],
            viewers: 0,
            totalViews: 0,
            likes: 0,
            ultimoFrame: '',
            telaAtiva: 1,
            dataInicio: new Date().toISOString()
        });
        
        liveAtiva = true;
        liveChatMessages = [];
        
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('livePlayer').style.display = 'block';
        document.getElementById('liveStatus').style.display = 'block';
        document.getElementById('liveStatusTitulo').textContent = titulo;
        document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + barbeiroLogado.nome;
        document.getElementById('liveViewerCount').textContent = '👥 0';
        
        iniciarChatListener();
        mostrarToast('🔴 Live iniciada!', 'success');
    } catch (e) {
        mostrarToast('❌ Erro ao iniciar live: ' + e.message, 'error');
    }
}

async function encerrarLive() {
    if (!barbeiroLogado) return;
    if (!confirm('Encerrar a transmissão?')) return;
    
    try {
        await db.collection('lives').doc('live_atual').update({
            ativa: false,
            dataFim: new Date().toISOString()
        });
        
        liveAtiva = false;
        liveChatMessages = [];
        
        document.getElementById('livePlaceholder').style.display = 'block';
        document.getElementById('livePlayer').style.display = 'none';
        document.getElementById('liveStatus').style.display = 'none';
        document.getElementById('liveControls').style.display = 'block';
        
        pararChatListener();
        atualizarChat();
        mostrarToast('⏹ Live encerrada!', 'info');
    } catch (e) {
        mostrarToast('❌ Erro ao encerrar!', 'error');
    }
}

function iniciarChatListener() {
    pararChatListener();
    liveChatInterval = setInterval(async function() {
        try {
            var doc = await db.collection('lives').doc('live_atual').get();
            if (doc.exists && doc.data().ativa) {
                var novas = doc.data().chat || [];
                if (novas.length !== liveChatMessages.length) {
                    liveChatMessages = novas;
                    atualizarChat();
                }
                
                var va = doc.data().viewersAtivos || {};
                var count = Object.keys(va).length;
                var statusEl = document.getElementById('liveStatusViewers');
                var viewerEl = document.getElementById('liveViewerCount');
                
                if (statusEl) statusEl.textContent = '👥 ' + count + ' • 👁 ' + (doc.data().totalViews || 0) + ' • ❤️ ' + (doc.data().likes || 0);
                if (viewerEl) viewerEl.textContent = '👥 ' + count + ' • 👁 ' + (doc.data().totalViews || 0);
            } else {
                liveAtiva = false;
                document.getElementById('livePlaceholder').style.display = 'block';
                document.getElementById('livePlayer').style.display = 'none';
                pararChatListener();
            }
        } catch (e) {}
    }, 2000);
}

function pararChatListener() {
    if (liveChatInterval) {
        clearInterval(liveChatInterval);
        liveChatInterval = null;
    }
}

async function enviarMensagemLive() {
    var input = document.getElementById('liveChatInput');
    if (!input) return;
    
    var texto = input.value.trim();
    if (!texto || !liveAtiva) return;
    
    var autor = '👤 Visitante';
    if (clienteLogado) autor = clienteLogado.nome;
    if (barbeiroLogado) autor = barbeiroLogado.nome;
    
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        if (!doc.exists || !doc.data().ativa) return;
        
        var chat = doc.data().chat || [];
        chat.push({
            autor: autor,
            texto: texto,
            fotoPerfil: '',
            data: new Date().toISOString()
        });
        
        if (chat.length > 100) chat = chat.slice(-100);
        await db.collection('lives').doc('live_atual').update({ chat });
        liveChatMessages = chat;
        atualizarChat();
        input.value = '';
    } catch (e) {
        console.error('Erro ao enviar mensagem:', e);
    }
}

function atualizarChat() {
    var c = document.getElementById('liveChatContainer');
    if (!c) return;
    
    if (!liveChatMessages || liveChatMessages.length === 0) {
        c.innerHTML = '<p style="color:#6B7280;text-align:center;padding:20px;">💬 Chat vazio</p>';
        return;
    }
    
    c.innerHTML = liveChatMessages.map(function(msg) {
        var h = new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return '<div class="live-chat-message">' +
            '<span class="autor">' + msg.autor + '</span> ' +
            '<span class="hora">' + h + '</span>' +
            '<div class="texto">' + msg.texto + '</div>' +
            '</div>';
    }).join('');
    
    c.scrollTop = c.scrollHeight;
}

async function likeLive() {
    if (!liveAtiva || liveLiked) return;
    
    try {
        await db.collection('lives').doc('live_atual').update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
        liveLiked = true;
        liveLikes++;
        mostrarToast('❤️ Curtido!', 'success');
    } catch (e) {
        console.error('Erro ao curtir:', e);
    }
}

function compartilharLive() {
    if (!liveAtiva) return;
    var url = window.location.href.split('?')[0] + '?live=1';
    
    if (navigator.share) {
        navigator.share({
            title: 'Barbearia RM - Live',
            text: '🔴 Transmissão ao vivo!',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(function() {
            mostrarToast('📋 Link copiado!', 'success');
        });
    }
}

function removerViewerLive() {
    if (liveViewerInterval) {
        clearInterval(liveViewerInterval);
        liveViewerInterval = null;
    }
    liveViewerId = null;
}

async function verificarLiveAtiva() {
    try {
        var doc = await db.collection('lives').doc('live_atual').get();
        var ativa = doc.exists && doc.data().ativa;
        
        var b1 = document.getElementById('liveBadgeCliente');
        var b2 = document.getElementById('liveBadgeBarbeiro');
        
        if (b1) b1.style.display = ativa ? 'inline-block' : 'none';
        if (b2) b2.style.display = ativa ? 'inline-block' : 'none';
    } catch (e) {}
}

// ==========================================================
// ===== ANÚNCIOS =====
// ==========================================================
async function carregarAnuncios() {
    var c = document.getElementById('anunciosContainer');
    if (!c) return;
    
    try {
        var hoje = new Date().toISOString();
        var sn = await db.collection('anuncios').where('dataExpiracao', '>', hoje).get();
        var a = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (a.length === 0) {
            c.innerHTML = '<div style="text-align:center;padding:40px;">' +
                         '<p style="color:#6B7280;">📢 Nenhum anúncio no momento</p></div>';
            return;
        }
        
        c.innerHTML = a.map(function(x) {
            return '<div class="card-modern" style="border-left:4px solid #FF6B6B;">' +
                '<span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢 ANÚNCIO</span>' +
                (x.imagem ? '<img src="' + x.imagem + '" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;" alt="Anúncio">' : '') +
                '<h3 style="color:#FF6B6B;">' + x.titulo + '</h3>' +
                '<p style="color:#B0B0B0;">' + x.descricao + '</p>' +
                (x.link ? '<a href="' + x.link + '" target="_blank" class="portal-btn portal-btn-primary" style="display:inline-block;margin-top:8px;">🔗 Saiba Mais</a>' : '') +
                '</div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar anúncios:', e);
    }
}

// ==========================================================
// ===== PLANOS =====
// ==========================================================
async function carregarPlanos() {
    var c = document.getElementById('planosContainer');
    if (!c) return;
    
    try {
        var sn = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var p = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (p.length === 0) {
            c.innerHTML = '<p class="empty-state">👑 Nenhum plano criado</p>';
            return;
        }
        
        c.innerHTML = p.map(function(x) {
            return '<div class="plano-card">' +
                (x.imagem ? '<img src="' + x.imagem + '" class="plano-img" alt="Plano">' : '') +
                '<div class="plano-info">' +
                '<h4>' + x.nome + '</h4>' +
                '<p>📅 ' + x.periodo + '</p>' +
                '<p class="plano-preco">R$ ' + (x.preco ? x.preco.toFixed(2) : '0,00') + '</p>' +
                '</div>' +
                '<div class="plano-actions">' +
                '<button class="btn-sm btn-sm-primary" onclick="editarPlano(\'' + x.id + '\')">✏️</button>' +
                '<button class="btn-sm btn-sm-danger" onclick="excluirPlanoDireto(\'' + x.id + '\')">🗑</button>' +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar planos:', e);
    }
}

async function criarPlano() {
    if (!barbeiroLogado) return;
    
    var n = document.getElementById('planoNome')?.value.trim();
    var p = document.getElementById('planoPeriodo')?.value || 'mensal';
    var pr = parseFloat(document.getElementById('planoPreco')?.value);
    var d = document.getElementById('planoDescricao')?.value.trim();
    
    if (!n || !pr || pr <= 0) {
        mostrarToast('❌ Nome e preço são obrigatórios!', 'error');
        return;
    }
    
    try {
        var id = Date.now().toString();
        await db.collection('planos').doc(id).set({
            id: id,
            barbeiroId: barbeiroLogado.id,
            nome: n,
            periodo: p,
            preco: pr,
            descricao: d,
            imagem: '',
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Plano criado!', 'success');
        ['planoNome', 'planoPreco', 'planoDescricao'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro ao criar plano!', 'error');
    }
}

async function editarPlano(id) {
    try {
        var doc = await db.collection('planos').doc(id).get();
        if (doc.exists) {
            var p = doc.data();
            document.getElementById('editPlanoId').value = id;
            document.getElementById('editPlanoNome').value = p.nome;
            document.getElementById('editPlanoPeriodo').value = p.periodo;
            document.getElementById('editPlanoPreco').value = p.preco;
            document.getElementById('editPlanoDescricao').value = p.descricao || '';
            mostrarTela('editarPlanoScreen');
        }
    } catch (e) {
        mostrarToast('❌ Erro ao carregar plano!', 'error');
    }
}

async function salvarEdicaoPlano() {
    var id = document.getElementById('editPlanoId')?.value;
    if (!id) return;
    
    try {
        await db.collection('planos').doc(id).update({
            nome: document.getElementById('editPlanoNome')?.value.trim(),
            periodo: document.getElementById('editPlanoPeriodo')?.value,
            preco: parseFloat(document.getElementById('editPlanoPreco')?.value),
            descricao: document.getElementById('editPlanoDescricao')?.value.trim()
        });
        
        mostrarToast('✅ Plano atualizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro ao atualizar!', 'error');
    }
}

async function excluirPlano() {
    if (!confirm('Excluir este plano?')) return;
    var id = document.getElementById('editPlanoId')?.value;
    if (!id) return;
    
    try {
        await db.collection('planos').doc(id).delete();
        mostrarToast('🗑 Plano excluído!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (e) {
        mostrarToast('❌ Erro ao excluir!', 'error');
    }
}

async function excluirPlanoDireto(id) {
    if (!confirm('Excluir este plano?')) return;
    
    try {
        await db.collection('planos').doc(id).delete();
        mostrarToast('🗑 Plano excluído!', 'success');
        carregarPlanos();
    } catch (e) {
        mostrarToast('❌ Erro ao excluir!', 'error');
    }
}

// ==========================================================
// ===== HORÁRIOS =====
// ==========================================================
async function carregarHorarios() {
    if (!barbeiroLogado) return;
    
    try {
        var doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        if (doc.exists) horariosTrabalho = doc.data();
        
        ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'].forEach(function(d) {
            var cb = document.getElementById('dia' + d);
            if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(d.toLowerCase());
        });
        
        var inicioEl = document.getElementById('horarioInicio');
        var fimEl = document.getElementById('horarioFim');
        var intervaloEl = document.getElementById('intervaloCortes');
        
        if (inicioEl) inicioEl.value = horariosTrabalho.horarioInicio;
        if (fimEl) fimEl.value = horariosTrabalho.horarioFim;
        if (intervaloEl) intervaloEl.value = horariosTrabalho.intervaloCortes;
        
        carregarFolgas();
    } catch (e) {
        console.error('Erro ao carregar horários:', e);
    }
}

function carregarFolgas() {
    var c = document.getElementById('folgasContainer');
    if (!c) return;
    
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) {
        c.innerHTML = '<p class="empty-state">🏖️ Nenhuma folga cadastrada</p>';
        return;
    }
    
    c.innerHTML = horariosTrabalho.folgas.map(function(f, i) {
        return '<div class="folga-item">' +
            '<span>🏖️ ' + new Date(f).toLocaleDateString('pt-BR') + '</span>' +
            '<button onclick="removerFolga(' + i + ')" class="btn-sm btn-sm-danger">❌</button>' +
            '</div>';
    }).join('');
}

function adicionarFolga() {
    var d = document.getElementById('folgaData')?.value;
    if (!d) return;
    
    if (horariosTrabalho.folgas.includes(d)) {
        mostrarToast('❌ Data já cadastrada!', 'error');
        return;
    }
    
    horariosTrabalho.folgas.push(d);
    horariosTrabalho.folgas.sort();
    carregarFolgas();
    document.getElementById('folgaData').value = '';
    mostrarToast('✅ Folga adicionada!', 'success');
}

function removerFolga(i) {
    horariosTrabalho.folgas.splice(i, 1);
    carregarFolgas();
}

async function salvarHorarios() {
    if (!barbeiroLogado) return;
    
    var dias = [];
    ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'].forEach(function(d) {
        var cb = document.getElementById('dia' + d);
        if (cb && cb.checked) dias.push(d.toLowerCase());
    });
    
    horariosTrabalho.diasTrabalho = dias;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio')?.value || '09:00';
    horariosTrabalho.horarioFim = document.getElementById('horarioFim')?.value || '18:00';
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes')?.value || '30');
    
    try {
        await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho);
        mostrarToast('✅ Horários salvos!', 'success');
    } catch (e) {
        mostrarToast('❌ Erro ao salvar!', 'error');
    }
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LPX Tecnologia - Portal Multi-Lojas iniciado!');
    
    // Inicializar tema
    inicializarTema();
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    
    // Esconder bottom navs
    var nc = document.getElementById('bottomNavCliente');
    var nb = document.getElementById('bottomNavBarbeiro');
    if (nc) nc.style.display = 'none';
    if (nb) nb.style.display = 'none';
    
    // Esconder formulários de login
    var loginContainer = document.getElementById('loginFormsContainer');
    if (loginContainer) loginContainer.style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    
    // Carregar lojas e restaurar sessão
    carregarLojasPortal();
    atualizarHeaderLoja();
    
    restaurarSessao().then(function(r) {
        if (!r) {
            document.getElementById('loginScreen').classList.add('active');
        }
    });
    
    verificarLiveAtiva();
    
    // Verificar se deve abrir live
    if (window.location.search.includes('live=1')) {
        setTimeout(function() {
            mostrarTela('liveScreen');
        }, 1000);
    }
    
    console.log('✅ Sistema pronto!');
});

// Limpar ao sair da página
window.addEventListener('beforeunload', function() {
    removerViewerLive();
});
