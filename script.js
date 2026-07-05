/* ==========================================================
   BARBEARIA RM - SCRIPT PRINCIPAL COMPLETO
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
let imagemBase64 = '';
let videoBase64 = '';
let imagemPlanoBase64 = '';
let anuncioImagemBase64 = '';
let todosPosts = [];
let todosReels = [];
let reelsAtual = 0;
let postSelecionadoId = null;
let horariosTrabalho = {
    diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horarioInicio: '09:00',
    horarioFim: '18:00',
    intervaloCortes: 30,
    folgas: []
};

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
            if (barbeiroLogado && document.getElementById('formAnuncio')) {
                document.getElementById('formAnuncio').style.display = 'block';
            }
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
        case 'galeriaCortes':
            carregarGaleria();
            break;
        case 'reels':
            carregarReels();
            break;
        case 'horariosTrabalho':
            carregarHorarios();
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
// FUNÇÕES DE LOGIN
// ==========================================================
function mostrarFormularioLogin(tipo) {
    document.getElementById('loginFormCliente').classList.remove('visible');
    document.getElementById('loginFormBarbeiro').classList.remove('visible');
    
    if (tipo === 'cliente') {
        document.getElementById('loginFormCliente').classList.add('visible');
    } else if (tipo === 'barbeiro') {
        document.getElementById('loginFormBarbeiro').classList.add('visible');
    }
}

function fecharFormulariosLogin() {
    const formCliente = document.getElementById('loginFormCliente');
    const formBarbeiro = document.getElementById('loginFormBarbeiro');
    if (formCliente) formCliente.classList.remove('visible');
    if (formBarbeiro) formBarbeiro.classList.remove('visible');
}

function voltarParaLogin() {
    fecharFormulariosLogin();
    mostrarTela('login');
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
// LOGIN / CADASTRO
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
            id,
            nome,
            email,
            celular,
            senha,
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
            id,
            nome,
            email,
            celular,
            senha,
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
// FEED / POSTS
// ==========================================================
async function carregarFeedCliente() {
    const container = document.getElementById('feedClienteContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        todosPosts = posts;
        
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
                    ${post.video ? `<video class="feed-post-video" controls><source src="${post.video}" type="video/mp4"></video>` : ''}
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image">` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${(post.preco || 0).toFixed(2)}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button onclick="likePost('${post.id}', this)">❤️ ${post.likes || 0}</button>
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
        const snapshot = await db.collection('posts')
            .where('barbeiroId', '==', barbeiroLogado.id)
            .get();
        
        const posts = [];
        snapshot.forEach(d => posts.push({ id: d.id, ...d.data() }));
        posts.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        
        if (posts.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum post</p>';
            return;
        }
        
        container.innerHTML = posts.map(post => {
            const comentarios = post.comentarios || [];
            let html = `
                <div class="feed-post" style="margin-bottom:12px;">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">${post.titulo}</div>
                            <div class="feed-post-user-time">R$ ${(post.preco || 0).toFixed(2)}</div>
                        </div>
                    </div>
            `;
            
            if (post.imagem) html += `<img src="${post.imagem}" class="feed-post-image">`;
            if (post.video) html += `<video class="feed-post-video" controls><source src="${post.video}" type="video/mp4"></video>`;
            
            html += `
                    <div class="feed-post-body">
                        <p>${post.descricao || ''}</p>
                        <p style="font-size:11px;color:#6B7280;">❤️ ${post.likes || 0} • 💬 ${comentarios.length}</p>
                    </div>
                    <button class="btn btn-small btn-danger" onclick="excluirMeuPost('${post.id}')">🗑 Excluir</button>
                </div>
            `;
            
            return html;
        }).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Erro ao carregar</p>';
    }
}

async function criarPost() {
    if (!barbeiroLogado) return;
    
    const titulo = document.getElementById('postTitulo').value.trim();
    const preco = parseFloat(document.getElementById('postPreco').value);
    const descricao = document.getElementById('postDescricao').value.trim();
    const imagem = document.getElementById('postImagem').value || '';
    const video = document.getElementById('postVideo').value || '';
    
    if (!titulo || !preco || preco <= 0) {
        mostrarToast('❌ Título e preço são obrigatórios!', 'error');
        return;
    }
    
    try {
        const id = Date.now().toString();
        await db.collection('posts').doc(id).set({
            id,
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo,
            preco,
            imagem,
            video,
            descricao,
            likes: 0,
            comentarios: [],
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Publicado!', 'success');
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postDescricao').value = '';
        removerImagem();
        removerVideo();
        mostrarTela('homeBarbeiro');
        
    } catch (erro) {
        mostrarToast('❌ Erro ao publicar!', 'error');
    }
}

async function excluirMeuPost(id) {
    if (!confirm('Excluir este post?')) return;
    
    try {
        await db.collection('posts').doc(id).delete();
        mostrarToast('🗑 Excluído!', 'success');
        carregarMeusPosts();
        carregarFeedCliente();
    } catch (erro) {
        mostrarToast('❌ Erro ao excluir!', 'error');
    }
}

function likePost(id, btn) {
    btn.classList.toggle('liked');
}

// ==========================================================
// COMENTÁRIOS
// ==========================================================
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
    carregarFeedCliente();
}

function fecharModalComentario() {
    document.getElementById('modalComentario').classList.remove('active');
}

// ==========================================================
// UPLOAD DE IMAGENS
// ==========================================================
function previewImagem(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        imagemBase64 = ev.target.result;
        document.getElementById('postImagem').value = imagemBase64;
        document.getElementById('imagemPreviewImg').src = imagemBase64;
        document.getElementById('imagemPreview').style.display = 'block';
        document.getElementById('imagemUploadArea').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removerImagem() {
    imagemBase64 = '';
    document.getElementById('postImagem').value = '';
    document.getElementById('imagemPreview').style.display = 'none';
    document.getElementById('imagemUploadArea').style.display = 'block';
    document.getElementById('postImagemInput').value = '';
}

function previewVideo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        videoBase64 = ev.target.result;
        document.getElementById('postVideo').value = videoBase64;
        document.getElementById('videoPreviewVideo').src = videoBase64;
        document.getElementById('videoPreview').style.display = 'block';
        document.getElementById('videoUploadArea').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removerVideo() {
    videoBase64 = '';
    document.getElementById('postVideo').value = '';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('videoUploadArea').style.display = 'block';
    document.getElementById('postVideoInput').value = '';
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
                const hora = String(h).padStart(2, '0');
                const min = String(m).padStart(2, '0');
                horarios.push(`${hora}:${min}`);
            }
        }
        selectHorario.innerHTML = horarios.map(h => `<option value="${h}">${h}</option>`).join('');
    }
    
    if (selectTipo) {
        const tipos = ['Corte Social', 'Corte Degradê', 'Corte Navalhado', 'Corte Máquina', 'Barba', 'Barba + Corte', 'Pintura', 'Luzes', 'Platinado', 'Selagem', 'Progressiva'];
        selectTipo.innerHTML = tipos.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    
    const inputData = document.getElementById('agendamentoData');
    if (inputData) {
        inputData.min = new Date().toISOString().split('T')[0];
    }
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
            clienteEmail: clienteLogado.email,
            data,
            horario,
            tipo,
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
        agendamentos.sort((a, b) => new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario));
        
        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
            return;
        }
        
        container.innerHTML = agendamentos.map(a => {
            const statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            const statusIcon = a.status === 'confirmado' ? '✅' : a.status === 'cancelado' ? '❌' : '⏳';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">${a.tipo}</div>
                        <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div>
                    </div>
                    <span class="agenda-status ${statusClass}">${statusIcon} ${a.status}</span>
                </div>
            `;
        }).join('');
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
        
        container.innerHTML = agendamentos.map(a => {
            const statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            const statusIcon = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">👤 ${a.clienteNome || 'Cliente'}</div>
                        <div class="agenda-data">📅 ${a.data || 'N/A'} • ⏰ ${a.horario || 'N/A'}</div>
                    </div>
                    <span class="agenda-status ${statusClass}">${statusIcon}</span>
                    ${a.status === 'pendente' ? `
                        <button class="btn btn-small btn-success" onclick="confirmarAgendamento('${a.id}')">✅</button>
                        <button class="btn btn-small btn-danger" onclick="cancelarAgendamento('${a.id}')">❌</button>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

async function confirmarAgendamento(id) {
    await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
    carregarAgendamentosBarbeiro();
    if (clienteLogado) carregarAgendaCliente();
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar agendamento?')) return;
    await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
    carregarAgendamentosBarbeiro();
    if (clienteLogado) carregarAgendaCliente();
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
            <div class="plano-card" style="flex-direction:column;align-items:flex-start;">
                ${p.imagem ? `<img src="${p.imagem}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">` : ''}
                <div style="display:flex;justify-content:space-between;width:100%;">
                    <div>
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                    </div>
                    <div class="plano-preco">R$ ${(p.preco || 0).toFixed(2)}</div>
                </div>
                <div style="margin-top:8px;">
                    <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️</button>
                    <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

async function criarPlano() {
    if (!barbeiroLogado) return;
    
    const nome = document.getElementById('planoNome').value.trim();
    const periodo = document.getElementById('planoPeriodo').value;
    const preco = parseFloat(document.getElementById('planoPreco').value);
    const descricao = document.getElementById('planoDescricao').value.trim();
    const imagem = document.getElementById('planoImagem').value || '';
    
    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Nome e preço são obrigatórios!', 'error');
        return;
    }
    
    try {
        const id = Date.now().toString();
        await db.collection('planos').doc(id).set({
            id,
            barbeiroId: barbeiroLogado.id,
            nome,
            periodo,
            preco,
            descricao,
            imagem,
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        removerImagemPlano();
        mostrarTela('homeBarbeiro');
        
    } catch (erro) {
        mostrarToast('❌ Erro ao criar plano!', 'error');
    }
}

async function excluirPlanoDireto(id) {
    if (!confirm('Excluir plano?')) return;
    await db.collection('planos').doc(id).delete();
    mostrarToast('🗑 Excluído!', 'success');
    carregarPlanos();
}

function previewImagemPlano(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        imagemPlanoBase64 = ev.target.result;
        document.getElementById('planoImagem').value = imagemPlanoBase64;
        document.getElementById('planoImagemPreview').src = imagemPlanoBase64;
        document.getElementById('planoImagemPreview').style.display = 'block';
        document.getElementById('btnRemoverImagemPlano').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function removerImagemPlano() {
    imagemPlanoBase64 = '';
    document.getElementById('planoImagem').value = '';
    document.getElementById('planoImagemPreview').style.display = 'none';
    document.getElementById('btnRemoverImagemPlano').style.display = 'none';
    document.getElementById('planoImagemInput').value = '';
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
                ${a.link ? `<a href="${a.link}" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:linear-gradient(135deg,#FF6B6B,#FF4757);color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>` : ''}
                ${barbeiroLogado ? `<button class="btn btn-small btn-danger" onclick="excluirAnuncio('${a.id}')" style="margin-top:8px;">🗑</button>` : ''}
            </div>
        `).join('');
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

async function criarAnuncio() {
    if (!barbeiroLogado) return;
    
    const titulo = document.getElementById('anuncioTitulo').value.trim();
    const descricao = document.getElementById('anuncioDescricao').value.trim();
    const link = document.getElementById('anuncioLink').value.trim();
    const imagem = document.getElementById('anuncioImagem').value || '';
    const duracao = parseInt(document.getElementById('anuncioDuracao').value);
    
    if (!titulo) {
        mostrarToast('❌ Título é obrigatório!', 'error');
        return;
    }
    
    const expiracao = new Date();
    expiracao.setDate(expiracao.getDate() + duracao);
    
    try {
        const id = 'anuncio_' + Date.now();
        await db.collection('anuncios').doc(id).set({
            id,
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo,
            descricao,
            link,
            imagem,
            duracao,
            dataCriacao: new Date().toISOString(),
            dataExpiracao: expiracao.toISOString()
        });
        
        mostrarToast('✅ Anúncio publicado!', 'success');
        document.getElementById('anuncioTitulo').value = '';
        document.getElementById('anuncioDescricao').value = '';
        document.getElementById('anuncioLink').value = '';
        removerAnuncioImagem();
        carregarAnuncios();
        
    } catch (erro) {
        mostrarToast('❌ Erro ao publicar!', 'error');
    }
}

async function excluirAnuncio(id) {
    if (!confirm('Excluir anúncio?')) return;
    await db.collection('anuncios').doc(id).delete();
    mostrarToast('🗑 Excluído!', 'success');
    carregarAnuncios();
}

function previewAnuncioImagem(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        anuncioImagemBase64 = ev.target.result;
        document.getElementById('anuncioImagem').value = anuncioImagemBase64;
        document.getElementById('anuncioImagemPreview').src = anuncioImagemBase64;
        document.getElementById('anuncioImagemPreview').style.display = 'block';
        document.getElementById('btnRemoverAnuncioImagem').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function removerAnuncioImagem() {
    anuncioImagemBase64 = '';
    document.getElementById('anuncioImagem').value = '';
    document.getElementById('anuncioImagemPreview').style.display = 'none';
    document.getElementById('btnRemoverAnuncioImagem').style.display = 'none';
    document.getElementById('anuncioImagemInput').value = '';
}

// ==========================================================
// GALERIA / REELS
// ==========================================================
async function carregarGaleria() {
    const container = document.getElementById('galeriaContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        filtrarGaleria();
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

function filtrarGaleria() {
    const container = document.getElementById('galeriaContainer');
    const filtro = document.getElementById('filtroCategoria')?.value || 'todos';
    
    const filtrados = filtro === 'todos' ? todosPosts : todosPosts.filter(p => p.titulo === filtro);
    
    if (filtrados.length === 0) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum corte encontrado</p>';
        return;
    }
    
    container.innerHTML = filtrados.map(post => `
        <div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
            ${post.imagem ? `<img src="${post.imagem}" class="galeria-item-image">` : '<div class="galeria-item-image" style="display:flex;align-items:center;justify-content:center;font-size:40px;">✂️</div>'}
            <div class="galeria-item-info">
                <div class="galeria-item-title">${post.titulo}</div>
                <div class="galeria-item-price">R$ ${(post.preco || 0).toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function verDetalheCorte(id) {
    const post = todosPosts.find(p => p.id === id);
    if (!post) return;
    
    document.getElementById('detalhePostConteudo').innerHTML = `
        <div class="card">
            <h3>${post.titulo}</h3>
            ${post.video ? `<video controls><source src="${post.video}" type="video/mp4"></video>` : ''}
            ${post.imagem ? `<img src="${post.imagem}" style="width:100%;max-height:300px;object-fit:cover;">` : ''}
            <p style="font-size:24px;color:var(--primary);">R$ ${(post.preco || 0).toFixed(2)}</p>
            <button class="btn btn-outline" onclick="mostrarTela('galeriaCortes')">← Voltar</button>
        </div>
    `;
    mostrarTela('detalhePost');
}

async function carregarReels() {
    const container = document.getElementById('reelsContainer');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosReels = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (todosReels.length === 0) {
            container.innerHTML = '<p style="color:#6B7280;padding:40px;">Nenhum reel</p>';
            return;
        }
        
        reelsAtual = 0;
        exibirReel(0);
    } catch (erro) {
        container.innerHTML = '<p style="color:#6B7280;">Erro ao carregar</p>';
    }
}

function exibirReel(i) {
    if (i < 0) i = 0;
    if (i >= todosReels.length) i = todosReels.length - 1;
    reelsAtual = i;
    
    const post = todosReels[i];
    document.getElementById('reelsContainer').innerHTML = `
        <div class="reel-item">
            ${post.video ? `<video src="${post.video}" autoplay loop muted playsinline></video>` : ''}
            ${post.imagem && !post.video ? `<img src="${post.imagem}" class="reel-item-image">` : ''}
            ${!post.video && !post.imagem ? '<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>' : ''}
            <div class="reel-item-overlay">
                <div class="reel-item-title">${post.titulo}</div>
                <div class="reel-item-price">R$ ${(post.preco || 0).toFixed(2)}</div>
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

function uploadFotoCliente(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(ev) {
        const foto = ev.target.result;
        const avatar = document.getElementById('perfilClienteAvatar');
        if (avatar) {
            const img = avatar.querySelector('img');
            if (img) img.src = foto;
        }
        clienteLogado.fotoPerfil = foto;
        await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
        salvarSessao('cliente', clienteLogado);
    };
    reader.readAsDataURL(file);
}

function uploadFotoBarbeiro(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(ev) {
        const foto = ev.target.result;
        const avatar = document.getElementById('perfilBarbeiroAvatar');
        if (avatar) {
            const img = avatar.querySelector('img');
            if (img) img.src = foto;
        }
        barbeiroLogado.fotoPerfil = foto;
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto });
        salvarSessao('barbeiro', barbeiroLogado);
    };
    reader.readAsDataURL(file);
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
            const valor = 35; // Valor base
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
// HORÁRIOS
// ==========================================================
async function carregarHorarios() {
    if (!barbeiroLogado) return;
    
    try {
        const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        if (doc.exists) {
            horariosTrabalho = doc.data();
        }
        
        ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'].forEach(dia => {
            const cb = document.getElementById('dia' + dia);
            if (cb) cb.checked = horariosTrabalho.diasTrabalho.includes(dia.toLowerCase());
        });
        
        document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio;
        document.getElementById('horarioFim').value = horariosTrabalho.horarioFim;
        document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes;
        carregarFolgas();
    } catch (erro) {
        console.error('Erro ao carregar horários:', erro);
    }
}

function carregarFolgas() {
    const container = document.getElementById('folgasContainer');
    if (!container) return;
    
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) {
        container.innerHTML = '<p style="color:#6B7280;">Nenhuma folga</p>';
        return;
    }
    
    container.innerHTML = horariosTrabalho.folgas.map((f, i) => `
        <div class="folga-item">
            <span>🏖️ ${new Date(f).toLocaleDateString('pt-BR')}</span>
            <button onclick="removerFolga(${i})">❌</button>
        </div>
    `).join('');
}

function adicionarFolga() {
    const data = document.getElementById('folgaData').value;
    if (!data) return;
    
    if (horariosTrabalho.folgas.includes(data)) {
        mostrarToast('❌ Data já adicionada!', 'error');
        return;
    }
    
    horariosTrabalho.folgas.push(data);
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
    
    const dias = [];
    ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'].forEach(dia => {
        const cb = document.getElementById('dia' + dia);
        if (cb && cb.checked) dias.push(dia.toLowerCase());
    });
    
    horariosTrabalho.diasTrabalho = dias;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    
    await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho);
    mostrarToast('✅ Horários salvos!', 'success');
}

// ==========================================================
// EXTRATO
// ==========================================================
function filtrarExtrato(tipo) {
    mostrarToast('📊 Filtrando por ' + tipo, 'info');
}

// ==========================================================
// PAGAMENTO
// ==========================================================
function copiarPix() {
    const chave = document.getElementById('pixChave').textContent;
    navigator.clipboard.writeText(chave);
    mostrarToast('✅ Chave PIX copiada!', 'success');
}

function fecharPagamento() {
    mostrarTela('homeCliente');
}

// ==========================================================
// LIVE
// ==========================================================
async function carregarLive() {
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        
        if (doc.exists && doc.data().ativa) {
            const live = doc.data();
            document.getElementById('livePlaceholder').style.display = 'none';
            document.getElementById('livePlayer').style.display = 'block';
            document.getElementById('liveStatus').style.display = 'block';
            
            document.getElementById('liveStatusTitulo').textContent = live.titulo;
            document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
        } else {
            document.getElementById('livePlaceholder').style.display = 'flex';
            document.getElementById('livePlayer').style.display = 'none';
            document.getElementById('liveStatus').style.display = 'none';
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
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Barbearia RM iniciando...');
    
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
    }
    
    // Verificar live
    verificarLiveAtiva();
    
    console.log('✅ Barbearia RM pronta!');
});

console.log('✅ Script completo carregado!');
