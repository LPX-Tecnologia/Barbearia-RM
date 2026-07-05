/* ==========================================================
   BARBEARIA RM - SCRIPT PRINCIPAL
   ========================================================== */

// ==========================================================
// CONFIGURAÇÃO FIREBASE
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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('🔥 Firebase conectado');

// ==========================================================
// VARIÁVEIS GLOBAIS
// ==========================================================
let clienteLogado = null;
let barbeiroLogado = null;

// ==========================================================
// FUNÇÕES DE NAVEGAÇÃO
// ==========================================================
function mostrarTela(nomeTela) {
    console.log('📱 Navegando para:', nomeTela);
    
    document.querySelectorAll('.screen').forEach(tela => {
        tela.classList.remove('active');
    });
    
    let idTela;
    if (nomeTela === 'login') {
        idTela = 'loginScreen';
    } else {
        idTela = nomeTela + 'Screen';
    }
    
    const tela = document.getElementById(idTela);
    if (tela) {
        tela.classList.add('active');
    }
    
    atualizarBottomNav(nomeTela);
    carregarDadosTela(nomeTela);
    window.scrollTo(0, 0);
}

function atualizarBottomNav(nomeTela) {
    const navCliente = document.getElementById('bottomNavCliente');
    const navBarbeiro = document.getElementById('bottomNavBarbeiro');
    
    if (navCliente) navCliente.style.display = 'none';
    if (navBarbeiro) navBarbeiro.style.display = 'none';
    
    const telasCliente = ['homeCliente', 'agendamento', 'galeriaCortes', 'reels', 'anuncios', 'live', 'perfilCliente', 'detalhePost', 'pagamento'];
    const telasBarbeiro = ['homeBarbeiro', 'criarPost', 'extrato', 'criarPlano', 'editarPlano', 'horariosTrabalho', 'perfilBarbeiro'];
    
    if (telasCliente.includes(nomeTela) && clienteLogado) {
        if (navCliente) navCliente.style.display = 'flex';
    } else if (telasBarbeiro.includes(nomeTela) && barbeiroLogado) {
        if (navBarbeiro) navBarbeiro.style.display = 'flex';
    }
}

function carregarDadosTela(nomeTela) {
    switch(nomeTela) {
        case 'homeCliente':
            carregarFeedCliente();
            carregarAgendaCliente();
            verificarLiveAtiva();
            break;
        case 'homeBarbeiro':
            carregarAgendamentosBarbeiro();
            carregarPlanos();
            calcularFaturamento();
            carregarMeusPosts();
            verificarLiveAtiva();
            break;
        case 'agendamento':
            carregarOpcoesAgendamento();
            break;
        case 'anuncios':
            carregarAnuncios();
            break;
        case 'live':
            carregarLive();
            break;
        case 'perfilCliente':
            carregarPerfilCliente();
            break;
        case 'perfilBarbeiro':
            carregarPerfilBarbeiro();
            break;
    }
}

// ==========================================================
// TOAST
// ==========================================================
function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = mensagem;
    toast.className = 'toast ' + tipo;
    toast.style.display = 'block';
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ==========================================================
// LOGIN
// ==========================================================
function mostrarFormularioLogin(tipo) {
    const formCliente = document.getElementById('loginFormCliente');
    const formBarbeiro = document.getElementById('loginFormBarbeiro');
    
    if (formCliente) formCliente.classList.remove('visible');
    if (formBarbeiro) formBarbeiro.classList.remove('visible');
    
    if (tipo === 'cliente' && formCliente) {
        formCliente.classList.add('visible');
    } else if (tipo === 'barbeiro' && formBarbeiro) {
        formBarbeiro.classList.add('visible');
    }
}

function fecharFormulariosLogin() {
    const formCliente = document.getElementById('loginFormCliente');
    const formBarbeiro = document.getElementById('loginFormBarbeiro');
    if (formCliente) formCliente.classList.remove('visible');
    if (formBarbeiro) formBarbeiro.classList.remove('visible');
}

// ==========================================================
// SESSÃO
// ==========================================================
function salvarSessao(tipo, dados) {
    const sessao = {
        tipo: tipo,
        id: dados.id,
        nome: dados.nome,
        email: dados.email,
        celular: dados.celular || '',
        senha: dados.senha || '',
        fotoPerfil: dados.fotoPerfil || '',
        timestamp: Date.now()
    };
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify(sessao));
}

function carregarSessao() {
    const dados = localStorage.getItem('barbeariaRM_sessao');
    if (!dados) return null;
    try {
        const sessao = JSON.parse(dados);
        if ((Date.now() - sessao.timestamp) / 86400000 > 30) {
            localStorage.removeItem('barbeariaRM_sessao');
            return null;
        }
        return sessao;
    } catch (e) {
        localStorage.removeItem('barbeariaRM_sessao');
        return null;
    }
}

function limparSessao() {
    localStorage.removeItem('barbeariaRM_sessao');
}

async function restaurarSessao() {
    const sessao = carregarSessao();
    if (!sessao) return false;
    
    try {
        if (sessao.tipo === 'cliente') {
            const snapshot = await db.collection('clientes')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                clienteLogado = { id: doc.id, ...doc.data() };
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                mostrarTela('homeCliente');
                return true;
            }
        } else {
            const snapshot = await db.collection('barbeiros')
                .where('email', '==', sessao.email)
                .where('senha', '==', sessao.senha)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                barbeiroLogado = { id: doc.id, ...doc.data() };
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                mostrarTela('homeBarbeiro');
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
// FUNÇÕES DE LOGIN
// ==========================================================
async function loginCliente() {
    const email = document.getElementById('loginEmailCliente').value.trim();
    const senha = document.getElementById('loginSenhaCliente').value;
    
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
        
        const doc = snapshot.docs[0];
        clienteLogado = { id: doc.id, ...doc.data() };
        salvarSessao('cliente', clienteLogado);
        
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        fecharFormulariosLogin();
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeCliente');
        
    } catch (erro) {
        console.error('Erro no login:', erro);
        mostrarToast('❌ Erro ao fazer login!', 'error');
    }
}

async function loginBarbeiro() {
    const email = document.getElementById('loginEmailBarbeiro').value.trim();
    const senha = document.getElementById('loginSenhaBarbeiro').value;
    
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
        
        const doc = snapshot.docs[0];
        barbeiroLogado = { id: doc.id, ...doc.data() };
        salvarSessao('barbeiro', barbeiroLogado);
        
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        fecharFormulariosLogin();
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiro');
        
    } catch (erro) {
        console.error('Erro no login:', erro);
        mostrarToast('❌ Erro ao fazer login!', 'error');
    }
}

async function cadastrarCliente() {
    const nome = document.getElementById('cadNomeCliente').value.trim();
    const email = document.getElementById('cadEmailCliente').value.trim();
    const celular = document.getElementById('cadCelularCliente').value.trim();
    const senha = document.getElementById('cadSenhaCliente').value;
    
    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    
    if (senha.length < 6) {
        mostrarToast('❌ Senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    try {
        const snapshot = await db.collection('clientes').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }
        
        const id = Date.now().toString();
        const cliente = {
            id, nome, email, celular, senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };
        
        await db.collection('clientes').doc(id).set(cliente);
        clienteLogado = cliente;
        salvarSessao('cliente', cliente);
        
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
        
        document.getElementById('welcomeClienteNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeCliente');
        
    } catch (erro) {
        console.error('Erro ao cadastrar:', erro);
        mostrarToast('❌ Erro ao cadastrar!', 'error');
    }
}

async function cadastrarBarbeiro() {
    const nome = document.getElementById('cadNomeBarbeiro').value.trim();
    const email = document.getElementById('cadEmailBarbeiro').value.trim();
    const celular = document.getElementById('cadCelularBarbeiro').value.trim();
    const senha = document.getElementById('cadSenhaBarbeiro').value;
    
    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    
    if (senha.length < 6) {
        mostrarToast('❌ Senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    try {
        const snapshot = await db.collection('barbeiros').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }
        
        const id = Date.now().toString();
        const barbeiro = {
            id, nome, email, celular, senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };
        
        await db.collection('barbeiros').doc(id).set(barbeiro);
        barbeiroLogado = barbeiro;
        salvarSessao('barbeiro', barbeiro);
        
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
        
        document.getElementById('welcomeBarbeiroNome').textContent = nome;
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeBarbeiro');
        
    } catch (erro) {
        console.error('Erro ao cadastrar:', erro);
        mostrarToast('❌ Erro ao cadastrar!', 'error');
    }
}

function sairCliente() {
    clienteLogado = null;
    limparSessao();
    fecharFormulariosLogin();
    mostrarTela('login');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    limparSessao();
    fecharFormulariosLogin();
    mostrarTela('login');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// FEED
// ==========================================================
async function carregarFeedCliente() {
    const container = document.getElementById('feedClienteContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>';
            return;
        }
        
        container.innerHTML = posts.map(post => {
            const comentarios = post.comentarios || [];
            return `
                <div class="feed-post">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">${post.barbeiroNome || 'Barbearia RM'}</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image">` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${(post.preco || 0).toFixed(2)}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button>❤️ ${post.likes || 0}</button>
                        <button onclick="abrirComentarios('${post.id}')">💬 ${comentarios.length}</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Erro ao carregar</p>';
    }
}

async function carregarMeusPosts() {
    const container = document.getElementById('meusPostsContainer');
    if (!container || !barbeiroLogado) return;
    
    try {
        const snapshot = await db.collection('posts').where('barbeiroId', '==', barbeiroLogado.id).get();
        const posts = [];
        snapshot.forEach(d => posts.push({ id: d.id, ...d.data() }));
        posts.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        
        if (posts.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum post</p>';
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="feed-post" style="margin-bottom:12px;">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">✂️</div>
                    <div class="feed-post-user">
                        <div class="feed-post-user-name">${post.titulo}</div>
                        <div class="feed-post-user-time">R$ ${(post.preco || 0).toFixed(2)}</div>
                    </div>
                </div>
                ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image">` : ''}
                <div class="feed-post-body">
                    <p>${post.descricao || ''}</p>
                </div>
                <button class="btn btn-small btn-danger" onclick="excluirMeuPost('${post.id}')">🗑 Excluir</button>
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Erro ao carregar</p>';
    }
}

async function excluirMeuPost(id) {
    if (!confirm('Excluir este post?')) return;
    await db.collection('posts').doc(id).delete();
    mostrarToast('🗑 Excluído!', 'success');
    carregarMeusPosts();
    carregarFeedCliente();
}

// ==========================================================
// COMENTÁRIOS
// ==========================================================
let postSelecionadoId = null;

function abrirComentarios(id) {
    postSelecionadoId = id;
    carregarComentarios(id);
    document.getElementById('modalComentario').classList.add('active');
}

async function carregarComentarios(id) {
    const container = document.getElementById('comentariosContainer');
    if (!container) return;
    
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) return;
    
    const comentarios = doc.data().comentarios || [];
    container.innerHTML = comentarios.length === 0 
        ? '<p style="color:#6B7280;">Nenhum comentário</p>'
        : comentarios.map(c => `
            <div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;">
                <strong style="color:#D4A84B;">${c.autor}</strong>
                <p style="color:#B0B0B0;">${c.texto}</p>
            </div>
        `).join('');
}

async function adicionarComentario() {
    const texto = document.getElementById('novoComentario').value.trim();
    if (!texto) return;
    
    const autor = clienteLogado ? clienteLogado.nome : (barbeiroLogado ? barbeiroLogado.nome : 'Anônimo');
    
    const doc = await db.collection('posts').doc(postSelecionadoId).get();
    const comentarios = doc.data().comentarios || [];
    comentarios.push({ autor, texto, data: new Date().toISOString() });
    
    await db.collection('posts').doc(postSelecionadoId).update({ comentarios });
    document.getElementById('novoComentario').value = '';
    carregarComentarios(postSelecionadoId);
}

function fecharModalComentario() {
    document.getElementById('modalComentario').classList.remove('active');
}

// ==========================================================
// AGENDAMENTOS
// ==========================================================
function carregarOpcoesAgendamento() {
    const selectHorario = document.getElementById('agendamentoHorario');
    const selectTipo = document.getElementById('agendamentoTipo');
    
    if (selectHorario) {
        const horarios = [];
        for (let h = 9; h <= 18; h++) {
            for (let m = 0; m < 60; m += 30) {
                if (h === 18 && m > 0) break;
                horarios.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        selectHorario.innerHTML = horarios.map(h => `<option value="${h}">${h}</option>`).join('');
    }
    
    if (selectTipo) {
        const tipos = ['Corte Social', 'Corte Degradê', 'Corte Navalhado', 'Corte Máquina', 'Barba', 'Barba + Corte'];
        selectTipo.innerHTML = tipos.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    
    const inputData = document.getElementById('agendamentoData');
    if (inputData) inputData.min = new Date().toISOString().split('T')[0];
}

async function agendarCorte() {
    if (!clienteLogado) {
        mostrarToast('❌ Faça login para agendar!', 'error');
        return;
    }
    
    const data = document.getElementById('agendamentoData').value;
    const horario = document.getElementById('agendamentoHorario').value;
    const tipo = document.getElementById('agendamentoTipo').value;
    
    if (!data) {
        mostrarToast('❌ Selecione uma data!', 'error');
        return;
    }
    
    try {
        const id = Date.now().toString();
        await db.collection('agendamentos').doc(id).set({
            id,
            clienteId: clienteLogado.id,
            clienteNome: clienteLogado.nome,
            data, horario, tipo,
            status: 'pendente',
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Agendado com sucesso!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeCliente');
    } catch (erro) {
        mostrarToast('❌ Erro ao agendar!', 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    const container = document.getElementById('agendaClienteContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('agendamentos')
            .where('clienteId', '==', clienteLogado.id)
            .get();
        
        const agendamentos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        agendamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
            return;
        }
        
        container.innerHTML = agendamentos.map(a => `
            <div class="agenda-item">
                <div class="agenda-info">
                    <div class="agenda-cliente">${a.tipo}</div>
                    <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div>
                </div>
                <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅' : '⏳'} ${a.status}</span>
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

async function carregarAgendamentosBarbeiro() {
    const container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('agendamentos').orderBy('data', 'desc').get();
        const agendamentos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
            return;
        }
        
        container.innerHTML = agendamentos.map(a => `
            <div class="agenda-item">
                <div class="agenda-info">
                    <div class="agenda-cliente">👤 ${a.clienteNome || 'Cliente'}</div>
                    <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario} • ✂️ ${a.tipo}</div>
                </div>
                <span class="agenda-status ${a.status}">${a.status}</span>
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

// ==========================================================
// PLANOS
// ==========================================================
async function carregarPlanos() {
    const container = document.getElementById('planosContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        const planos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (planos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum plano</p>';
            return;
        }
        
        container.innerHTML = planos.map(p => `
            <div class="plano-card">
                <div class="plano-info">
                    <div class="plano-nome">${p.nome}</div>
                    <div class="plano-periodo">📅 ${p.periodo}</div>
                </div>
                <div class="plano-preco">R$ ${(p.preco || 0).toFixed(2)}</div>
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

// ==========================================================
// ANÚNCIOS
// ==========================================================
async function carregarAnuncios() {
    const container = document.getElementById('anunciosContainer');
    if (!container) return;
    
    try {
        const hoje = new Date().toISOString();
        const snapshot = await db.collection('anuncios').where('dataExpiracao', '>', hoje).get();
        const anuncios = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (anuncios.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:#6B7280;">📢 Nenhum anúncio ativo</p></div>';
            return;
        }
        
        container.innerHTML = anuncios.map(a => `
            <div class="card" style="border:2px solid #FF6B6B;margin-bottom:12px;">
                <span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢 ANÚNCIO</span>
                ${a.imagem ? `<img src="${a.imagem}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;">` : ''}
                <h3 style="color:#FF6B6B;">${a.titulo}</h3>
                <p style="color:#B0B0B0;">${a.descricao}</p>
                ${a.link ? `<a href="${a.link}" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#FF4757;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>` : ''}
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

// ==========================================================
// PERFIL
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
    const nome = document.getElementById('editClienteNome').value.trim();
    const celular = document.getElementById('editClienteCelular').value.trim();
    await db.collection('clientes').doc(clienteLogado.id).update({ nome, celular });
    clienteLogado.nome = nome;
    clienteLogado.celular = celular;
    salvarSessao('cliente', clienteLogado);
    mostrarToast('✅ Perfil salvo!', 'success');
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
    const nome = document.getElementById('editBarbeiroNome').value.trim();
    const celular = document.getElementById('editBarbeiroCelular').value.trim();
    const email = document.getElementById('editBarbeiroEmail').value.trim();
    await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome, celular, email });
    barbeiroLogado.nome = nome;
    barbeiroLogado.celular = celular;
    barbeiroLogado.email = email;
    salvarSessao('barbeiro', barbeiroLogado);
    mostrarToast('✅ Perfil salvo!', 'success');
}

// ==========================================================
// FINANCEIRO
// ==========================================================
async function calcularFaturamento() {
    try {
        const snapshot = await db.collection('agendamentos').where('status', '==', 'confirmado').get();
        const agendamentos = snapshot.docs.map(d => d.data());
        const hoje = new Date().toISOString().split('T')[0];
        let totalHoje = 0;
        let totalGeral = 0;
        
        agendamentos.forEach(a => {
            const valor = 35;
            if (a.data === hoje) totalHoje += valor;
            totalGeral += valor;
        });
        
        document.getElementById('faturamentoHoje').textContent = 'R$ ' + totalHoje.toFixed(2);
        document.getElementById('faturamentoSemana').textContent = 'R$ ' + (totalGeral * 0.3).toFixed(2);
        document.getElementById('faturamentoMes').textContent = 'R$ ' + (totalGeral * 0.7).toFixed(2);
        document.getElementById('faturamentoAno').textContent = 'R$ ' + totalGeral.toFixed(2);
    } catch (erro) {
        console.error('Erro ao calcular faturamento:', erro);
    }
}

// ==========================================================
// LIVE
// ==========================================================
async function carregarLive() {
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            const live = doc.data();
            const placeholder = document.getElementById('livePlaceholder');
            const player = document.getElementById('livePlayer');
            const status = document.getElementById('liveStatus');
            
            if (placeholder) placeholder.style.display = 'none';
            if (player) player.style.display = 'block';
            if (status) {
                status.style.display = 'block';
                document.getElementById('liveStatusTitulo').textContent = live.titulo;
                document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
            }
        }
    } catch (erro) {
        console.error('Erro ao carregar live:', erro);
    }
}

async function verificarLiveAtiva() {
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        const ativa = doc.exists && doc.data().ativa;
        const badgeCliente = document.getElementById('liveBadgeCliente');
        const badgeBarbeiro = document.getElementById('liveBadgeBarbeiro');
        if (badgeCliente) badgeCliente.style.display = ativa ? 'inline-block' : 'none';
        if (badgeBarbeiro) badgeBarbeiro.style.display = ativa ? 'inline-block' : 'none';
    } catch (erro) {
        console.error('Erro ao verificar live:', erro);
    }
}

// ==========================================================
// EXTRATO
// ==========================================================
function filtrarExtrato(tipo) {
    mostrarToast('📊 Filtrando por ' + tipo, 'info');
}

// ==========================================================
// INICIALIZAÇÃO COM EVENT LISTENERS
// ==========================================================
function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // Botões da tela de login
    document.getElementById('btnSouCliente')?.addEventListener('click', () => mostrarFormularioLogin('cliente'));
    document.getElementById('btnSouBarbeiro')?.addEventListener('click', () => mostrarFormularioLogin('barbeiro'));
    document.getElementById('btnEntrarCliente')?.addEventListener('click', loginCliente);
    document.getElementById('btnEntrarBarbeiro')?.addEventListener('click', loginBarbeiro);
    document.getElementById('btnCriarContaCliente')?.addEventListener('click', () => mostrarTela('cadastroCliente'));
    document.getElementById('btnCriarContaBarbeiro')?.addEventListener('click', () => mostrarTela('cadastroBarbeiro'));
    document.getElementById('btnVoltarCliente')?.addEventListener('click', fecharFormulariosLogin);
    document.getElementById('btnVoltarBarbeiro')?.addEventListener('click', fecharFormulariosLogin);
    
    // Botões de cadastro
    document.getElementById('btnFinalizarCadastroCliente')?.addEventListener('click', cadastrarCliente);
    document.getElementById('btnFinalizarCadastroBarbeiro')?.addEventListener('click', cadastrarBarbeiro);
    document.getElementById('btnVoltarCadastroCliente')?.addEventListener('click', () => mostrarTela('login'));
    document.getElementById('btnVoltarCadastroBarbeiro')?.addEventListener('click', () => mostrarTela('login'));
    
    // Home Cliente
    document.getElementById('btnAgendarCorte')?.addEventListener('click', () => mostrarTela('agendamento'));
    document.getElementById('btnGaleria')?.addEventListener('click', () => mostrarTela('galeriaCortes'));
    document.getElementById('btnReels')?.addEventListener('click', () => mostrarTela('reels'));
    document.getElementById('btnAnuncios')?.addEventListener('click', () => mostrarTela('anuncios'));
    document.getElementById('btnLive')?.addEventListener('click', () => mostrarTela('live'));
    
    // Home Barbeiro
    document.getElementById('btnCriarPlano')?.addEventListener('click', () => mostrarTela('criarPlano'));
    document.getElementById('btnNovoPost')?.addEventListener('click', () => mostrarTela('criarPost'));
    document.getElementById('btnExtrato')?.addEventListener('click', () => mostrarTela('extrato'));
    document.getElementById('btnHorarios')?.addEventListener('click', () => mostrarTela('horariosTrabalho'));
    document.getElementById('btnAnunciosBarbeiro')?.addEventListener('click', () => mostrarTela('anuncios'));
    document.getElementById('btnLiveBarbeiro')?.addEventListener('click', () => mostrarTela('live'));
    
    // Agendamento
    document.getElementById('btnConfirmarAgendamento')?.addEventListener('click', agendarCorte);
    document.getElementById('btnVoltarAgendamento')?.addEventListener('click', () => mostrarTela('homeCliente'));
    
    // Perfil Cliente
    document.getElementById('btnSalvarPerfilCliente')?.addEventListener('click', salvarPerfilCliente);
    document.getElementById('btnSairCliente')?.addEventListener('click', sairCliente);
    document.getElementById('perfilClienteAvatar')?.addEventListener('click', () => document.getElementById('fotoClienteInput').click());
    document.getElementById('fotoClienteInput')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(ev) {
            const foto = ev.target.result;
            document.querySelector('#perfilClienteAvatar img').src = foto;
            clienteLogado.fotoPerfil = foto;
            await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
            salvarSessao('cliente', clienteLogado);
        };
        reader.readAsDataURL(file);
    });
    
    // Perfil Barbeiro
    document.getElementById('btnSalvarPerfilBarbeiro')?.addEventListener('click', salvarPerfilBarbeiro);
    document.getElementById('btnSairBarbeiro')?.addEventListener('click', sairBarbeiro);
    document.getElementById('perfilBarbeiroAvatar')?.addEventListener('click', () => document.getElementById('fotoBarbeiroInput').click());
    document.getElementById('fotoBarbeiroInput')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(ev) {
            const foto = ev.target.result;
            document.querySelector('#perfilBarbeiroAvatar img').src = foto;
            barbeiroLogado.fotoPerfil = foto;
            await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto });
            salvarSessao('barbeiro', barbeiroLogado);
        };
        reader.readAsDataURL(file);
    });
    
    // Modal comentários
    document.getElementById('btnComentar')?.addEventListener('click', adicionarComentario);
    document.getElementById('btnFecharComentario')?.addEventListener('click', fecharModalComentario);
    
    // Navegação inferior Cliente
    document.getElementById('navHomeCliente')?.addEventListener('click', () => mostrarTela('homeCliente'));
    document.getElementById('navAgendar')?.addEventListener('click', () => mostrarTela('agendamento'));
    document.getElementById('navGaleria')?.addEventListener('click', () => mostrarTela('galeriaCortes'));
    document.getElementById('navLive')?.addEventListener('click', () => mostrarTela('live'));
    document.getElementById('navPerfilCliente')?.addEventListener('click', () => mostrarTela('perfilCliente'));
    
    // Navegação inferior Barbeiro
    document.getElementById('navHomeBarbeiro')?.addEventListener('click', () => mostrarTela('homeBarbeiro'));
    document.getElementById('navPostar')?.addEventListener('click', () => mostrarTela('criarPost'));
    document.getElementById('navExtrato')?.addEventListener('click', () => mostrarTela('extrato'));
    document.getElementById('navLiveBarbeiro')?.addEventListener('click', () => mostrarTela('live'));
    document.getElementById('navPerfilBarbeiro')?.addEventListener('click', () => mostrarTela('perfilBarbeiro'));
    
    console.log('✅ Event listeners configurados!');
}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Barbearia RM iniciando...');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Esconder navegação
    const navCliente = document.getElementById('bottomNavCliente');
    const navBarbeiro = document.getElementById('bottomNavBarbeiro');
    if (navCliente) navCliente.style.display = 'none';
    if (navBarbeiro) navBarbeiro.style.display = 'none';
    
    // Esconder formulários de login
    fecharFormulariosLogin();
    
    // Tentar restaurar sessão
    const restaurado = await restaurarSessao();
    
    if (!restaurado) {
        document.getElementById('loginScreen').classList.add('active');
        console.log('👋 Nenhuma sessão ativa - mostrando login');
    }
    
    // Verificar live
    verificarLiveAtiva();
    
    console.log('✅ Barbearia RM pronta!');
});
