// =============================================================
// ===== SCRIPT - BARBEARIA RM (100% FUNCIONAL) =====
// =============================================================

console.log('✅ SCRIPT CARREGADO COM SUCESSO!');

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

    // Carrega dados quando entra nas telas
    if (id === 'homeClienteScreen') {
        carregarFeedCliente();
        carregarAgendaCliente();
    }
    if (id === 'homeBarbeiroScreen') {
        carregarFeedBarbeiro();
        carregarAgendamentosBarbeiro();
        carregarPlanos();
        carregarFaturamento();
    }
}

function mostrarToast(mensagem, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? '#EF4444' : tipo === 'sucesso' ? '#10B981' : '#1F2937';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// =============================================================
// ===== DADOS INICIAIS =====
// =============================================================

// BARBEIRO PADRÃO
if (!carregarDados('barbeiros')) {
    salvarDados('barbeiros', [
        {
            id: 'barbeiro1',
            nome: 'Rafael Mendes',
            email: 'barbeiro@barbeariarm.com',
            celular: '11999990000',
            senha: '123456',
            foto: '',
            ultimoAcesso: Date.now()
        }
    ]);
    console.log('✅ Barbeiro padrão criado!');
}

// CLIENTES
if (!carregarDados('clientes')) {
    salvarDados('clientes', []);
}

// POSTS (FEED)
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
    console.log('✅ Posts de exemplo criados!');
}

// PLANOS
if (!carregarDados('planos')) {
    salvarDados('planos', [
        { id: 'plano1', nome: 'Plano Mensal', periodo: 'mensal', preco: 150.00, descricao: '1 corte por mês + barba grátis' },
        { id: 'plano2', nome: 'Plano Trimestral', periodo: 'trimestral', preco: 400.00, descricao: '1 corte por mês + 1 barba + 1 luzes' }
    ]);
    console.log('✅ Planos de exemplo criados!');
}

// PAGAMENTOS
if (!carregarDados('pagamentos')) {
    salvarDados('pagamentos', []);
}

// AGENDAMENTOS
if (!carregarDados('agendamentos')) {
    salvarDados('agendamentos', []);
    console.log('✅ Agendamentos iniciados!');
}

// =============================================================
// ===== VARIÁVEIS GLOBAIS =====
// =============================================================

let usuarioLogado = null;
let tipoUsuario = null;
let postSelecionado = null;
let extratoFiltro = 'todos';
let pagamentoPostId = null;
let pixCopiado = false;
let qrCodeLido = false;

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
// ===== FEED =====
// =============================================================

function carregarFeedCliente() {
    console.log('📱 carregarFeedCliente() CHAMADA!');
    
    const posts = carregarDados('posts') || [];
    const container = document.getElementById('feedClienteContainer');
    if (!container) {
        console.error('❌ Container feedClienteContainer não encontrado!');
        return;
    }

    console.log('📋 Posts carregados:', posts.length);

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center;padding:40px;">
                <div style="font-size:60px;">✂️</div>
                <h3 style="color:#C9A84C;">Nenhum post ainda</h3>
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

function carregarFeedBarbeiro() {
    console.log('📱 carregarFeedBarbeiro() CHAMADA!');
    
    const posts = carregarDados('posts') || [];
    const container = document.getElementById('feedClienteContainer');
    if (!container) {
        console.error('❌ Container feedClienteContainer não encontrado!');
        return;
    }

    console.log('📋 Posts carregados:', posts.length);

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center;padding:40px;">
                <div style="font-size:60px;">📸</div>
                <h3 style="color:#C9A84C;">Nenhum post ainda</h3>
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
                    <div style="display:flex; gap:8px;">
                        <button onclick="abrirEditarPost('${post.id}')" style="background:none;border:none;color:#C9A84C;cursor:pointer;font-size:16px;padding:0 4px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="excluirPost('${post.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:16px;padding:0 4px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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
        alert('Faça login como cliente para curtir!');
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
                <p style="margin:4px 0; color:#F5F0E8;">${c.texto}</p>
                <span style="font-size:11px; color:#6A6A6A;">${new Date(c.data).toLocaleDateString('pt-BR')}</span>
            </div>
        `).join('');
    }

    document.getElementById('modalComentario').classList.add('active');
}

function adicionarComentario() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        alert('Faça login como cliente para comentar!');
        return;
    }

    const texto = document.getElementById('novoComentario').value.trim();
    if (!texto) {
        alert('Digite um comentário!');
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
    alert('Comentário adicionado!');
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
            alert('Link copiado para compartilhar!');
        }).catch(() => {
            alert('Compartilhe: ' + url);
        });
    }
}

// =============================================================
// ===== POSTS (CRIAR, EDITAR, EXCLUIR) =====
// =============================================================

function criarPost() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        alert('Apenas barbeiros podem criar posts!');
        return;
    }

    const titulo = document.getElementById('postTitulo').value.trim();
    const preco = parseFloat(document.getElementById('postPreco').value);
    const imagem = document.getElementById('postImagem').value.trim();
    const video = document.getElementById('postVideo').value.trim();
    const descricao = document.getElementById('postDescricao').value.trim();

    if (!titulo || !preco) {
        alert('Título e preço são obrigatórios!');
        return;
    }

    const posts = carregarDados('posts') || [];
    posts.unshift({
        id: gerarId(),
        titulo: titulo,
        preco: preco,
        imagem: imagem,
        video: video,
        descricao: descricao,
        data: new Date().toISOString(),
        barbeiroId: usuarioLogado.id,
        curtidas: [],
        comentarios: []
    });

    salvarDados('posts', posts);
    alert('Post publicado com sucesso!');

    document.getElementById('postTitulo').value = '';
    document.getElementById('postPreco').value = '';
    document.getElementById('postImagem').value = '';
    document.getElementById('postVideo').value = '';
    document.getElementById('postDescricao').value = '';

    mostrarTela('homeBarbeiroScreen');
}

function abrirEditarPost(postId) {
    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) {
        alert('Post não encontrado!');
        return;
    }

    document.getElementById('editarPostId').value = post.id;
    document.getElementById('editarPostTitulo').value = post.titulo || '';
    document.getElementById('editarPostPreco').value = post.preco || '';
    document.getElementById('editarPostImagem').value = post.imagem || '';
    document.getElementById('editarPostVideo').value = post.video || '';
    document.getElementById('editarPostDescricao').value = post.descricao || '';

    mostrarTela('editarPostScreen');
}

function salvarEdicaoPost() {
    const id = document.getElementById('editarPostId').value;
    const titulo = document.getElementById('editarPostTitulo').value.trim();
    const preco = parseFloat(document.getElementById('editarPostPreco').value);
    const imagem = document.getElementById('editarPostImagem').value.trim();
    const video = document.getElementById('editarPostVideo').value.trim();
    const descricao = document.getElementById('editarPostDescricao').value.trim();

    if (!titulo || !preco) {
        alert('Título e preço são obrigatórios!');
        return;
    }

    const posts = carregarDados('posts') || [];
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) {
        alert('Post não encontrado!');
        return;
    }

    posts[idx].titulo = titulo;
    posts[idx].preco = preco;
    posts[idx].imagem = imagem;
    posts[idx].video = video;
    posts[idx].descricao = descricao;

    salvarDados('posts', posts);
    alert('✅ Post atualizado com sucesso!');
    mostrarTela('homeBarbeiroScreen');
}

function excluirPost(postId) {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    let posts = carregarDados('posts') || [];
    posts = posts.filter(p => p.id !== postId);
    salvarDados('posts', posts);
    alert('🗑️ Post excluído!');
    carregarFeedBarbeiro();
}

// =============================================================
// ===== PLANOS =====
// =============================================================

function carregarPlanos() {
    console.log('📋 carregarPlanos() CHAMADA!');
    
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
            <div style="display:flex; align-items:center; gap:8px;">
                <div class="plano-preco">R$ ${plano.preco.toFixed(2)}</div>
                <button onclick="abrirEditarPlano('${plano.id}')" style="background:none;border:none;color:#C9A84C;cursor:pointer;font-size:16px;padding:4px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="excluirPlano('${plano.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:16px;padding:4px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function criarPlano() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        alert('Apenas barbeiros podem criar planos!');
        return;
    }

    const nome = document.getElementById('planoNome').value.trim();
    const periodo = document.getElementById('planoPeriodo').value;
    const preco = parseFloat(document.getElementById('planoPreco').value);
    const descricao = document.getElementById('planoDescricao').value.trim();

    if (!nome || !preco) {
        alert('Nome e preço são obrigatórios!');
        return;
    }

    const planos = carregarDados('planos') || [];
    planos.push({
        id: gerarId(),
        nome: nome,
        periodo: periodo,
        preco: preco,
        descricao: descricao
    });

    salvarDados('planos', planos);
    alert('Plano criado com sucesso!');

    document.getElementById('planoNome').value = '';
    document.getElementById('planoPreco').value = '';
    document.getElementById('planoDescricao').value = '';

    mostrarTela('homeBarbeiroScreen');
}

function abrirEditarPlano(planoId) {
    const planos = carregarDados('planos') || [];
    const plano = planos.find(p => p.id === planoId);
    if (!plano) {
        alert('Plano não encontrado!');
        return;
    }

    document.getElementById('editarPlanoId').value = plano.id;
    document.getElementById('editarPlanoNome').value = plano.nome || '';
    document.getElementById('editarPlanoPeriodo').value = plano.periodo || 'mensal';
    document.getElementById('editarPlanoPreco').value = plano.preco || '';
    document.getElementById('editarPlanoDescricao').value = plano.descricao || '';

    mostrarTela('editarPlanoScreen');
}

function salvarEdicaoPlano() {
    const id = document.getElementById('editarPlanoId').value;
    const nome = document.getElementById('editarPlanoNome').value.trim();
    const periodo = document.getElementById('editarPlanoPeriodo').value;
    const preco = parseFloat(document.getElementById('editarPlanoPreco').value);
    const descricao = document.getElementById('editarPlanoDescricao').value.trim();

    if (!nome || !preco) {
        alert('Nome e preço são obrigatórios!');
        return;
    }

    const planos = carregarDados('planos') || [];
    const idx = planos.findIndex(p => p.id === id);
    if (idx === -1) {
        alert('Plano não encontrado!');
        return;
    }

    planos[idx].nome = nome;
    planos[idx].periodo = periodo;
    planos[idx].preco = preco;
    planos[idx].descricao = descricao;

    salvarDados('planos', planos);
    alert('✅ Plano atualizado com sucesso!');
    mostrarTela('homeBarbeiroScreen');
}

function excluirPlano(planoId) {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    let planos = carregarDados('planos') || [];
    planos = planos.filter(p => p.id !== planoId);
    salvarDados('planos', planos);
    alert('🗑️ Plano excluído!');
    carregarPlanos();
}

// =============================================================
// ===== AGENDAMENTO =====
// =============================================================

function agendarCorte() {
    console.log('✂️ FUNÇÃO agendarCorte() CHAMADA!');
    
    // VERIFICA SE ESTÁ LOGADO
    if (!usuarioLogado) {
        alert('⚠️ Faça login para agendar!');
        console.log('❌ Usuário não logado');
        return;
    }
    
    // VERIFICA SE É CLIENTE
    if (tipoUsuario !== 'cliente') {
        alert('⚠️ Apenas clientes podem agendar!');
        console.log('❌ Tipo de usuário:', tipoUsuario);
        return;
    }
    
    // PEGA OS DADOS
    const data = document.getElementById('agendamentoData').value;
    const horario = document.getElementById('agendamentoHorario').value;
    const tipo = document.getElementById('agendamentoTipo').value;
    
    console.log('📅 Data:', data);
    console.log('⏰ Horário:', horario);
    console.log('✂️ Tipo:', tipo);
    
    // VALIDA
    if (!data || !horario) {
        alert('⚠️ Selecione data e horário!');
        console.log('❌ Data ou horário vazio');
        return;
    }
    
    // CARREGA AGENDAMENTOS EXISTENTES
    const agendamentos = carregarDados('agendamentos') || [];
    console.log('📋 Agendamentos existentes:', agendamentos.length);
    
    // VERIFICA CONFLITO
    const conflito = agendamentos.some(a => a.data === data && a.horario === horario && a.status !== 'cancelado');
    
    if (conflito) {
        alert('⚠️ Horário já ocupado! Escolha outro.');
        console.log('❌ Conflito de horário');
        return;
    }
    
    // CRIA NOVO AGENDAMENTO
    const novo = {
        id: gerarId(),
        clienteId: usuarioLogado.id,
        clienteNome: usuarioLogado.nome,
        clienteCelular: usuarioLogado.celular || '',
        data: data,
        horario: horario,
        tipo: tipo,
        status: 'confirmado',
        dataAgendamento: new Date().toISOString()
    };
    
    console.log('📝 Novo agendamento:', novo);
    
    // SALVA
    agendamentos.push(novo);
    salvarDados('agendamentos', agendamentos);
    
    alert('✅ Agendamento confirmado para ' + data + ' às ' + horario + '!');
    
    // LIMPA O CAMPO DE DATA
    document.getElementById('agendamentoData').value = '';
    
    // VOLTA PARA A HOME
    mostrarTela('homeClienteScreen');
}

function carregarAgendaCliente() {
    console.log('📅 carregarAgendaCliente() CHAMADA!');
    
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        console.log('⚠️ Usuário não é cliente');
        return;
    }
    
    const container = document.getElementById('agendaClienteContainer');
    if (!container) {
        console.error('❌ Container agendaClienteContainer não encontrado');
        return;
    }
    
    const agendamentos = carregarDados('agendamentos') || [];
    const meus = agendamentos.filter(a => a.clienteId === usuarioLogado.id && a.status !== 'cancelado');
    
    console.log('📋 Agendamentos do cliente:', meus.length);
    
    if (meus.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A; text-align:center;">Nenhum agendamento</p>';
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

function carregarAgendamentosBarbeiro() {
    console.log('📅 carregarAgendamentosBarbeiro() CHAMADA!');
    
    const container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) {
        console.error('❌ Container agendamentosBarbeiroContainer não encontrado');
        return;
    }
    
    const agendamentos = carregarDados('agendamentos') || [];
    
    if (agendamentos.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A; text-align:center;">Nenhum agendamento</p>';
        return;
    }
    
    agendamentos.sort((a, b) => new Date(a.data + ' ' + a.horario) - new Date(b.data + ' ' + b.horario));
    
    container.innerHTML = agendamentos.filter(a => a.status !== 'cancelado').map(a => `
        <div class="agenda-item">
            <div class="agenda-info">
                <div class="agenda-cliente">👤 ${a.clienteNome}</div>
                <div style="color:#C9A84C;">✂️ ${a.tipo}</div>
                <div class="agenda-data">📅 ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horario}</div>
                ${a.clienteCelular ? `<div class="agenda-data">📱 ${a.clienteCelular}</div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}</span>
                <div style="display:flex; gap:4px;">
                    <button onclick="abrirEditarAgendamento('${a.id}')" style="background:none;border:none;color:#C9A84C;cursor:pointer;font-size:14px;padding:2px 6px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="excluirAgendamento('${a.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:14px;padding:2px 6px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function abrirEditarAgendamento(agendamentoId) {
    const agendamentos = carregarDados('agendamentos') || [];
    const agendamento = agendamentos.find(a => a.id === agendamentoId);
    if (!agendamento) {
        alert('Agendamento não encontrado!');
        return;
    }

    document.getElementById('agendamentoData').value = agendamento.data || '';
    document.getElementById('agendamentoHorario').value = agendamento.horario || '09:00';
    document.getElementById('agendamentoTipo').value = agendamento.tipo || 'Corte Social';
    document.getElementById('agendamentoId').value = agendamentoId;

    const btnAgendar = document.querySelector('#agendamentoScreen .btn-primary');
    if (btnAgendar) {
        btnAgendar.textContent = '✏️ ATUALIZAR AGENDAMENTO';
        btnAgendar.onclick = function() { atualizarAgendamento(); };
    }

    mostrarTela('agendamentoScreen');
}

function atualizarAgendamento() {
    const id = document.getElementById('agendamentoId').value;
    const data = document.getElementById('agendamentoData').value;
    const horario = document.getElementById('agendamentoHorario').value;
    const tipo = document.getElementById('agendamentoTipo').value;

    if (!data || !horario) {
        alert('Selecione data e horário!');
        return;
    }

    const agendamentos = carregarDados('agendamentos') || [];
    const idx = agendamentos.findIndex(a => a.id === id);
    if (idx === -1) {
        alert('Agendamento não encontrado!');
        return;
    }

    const conflito = agendamentos.some((a, i) => 
        i !== idx && a.data === data && a.horario === horario && a.status !== 'cancelado'
    );

    if (conflito) {
        alert('Horário já ocupado! Escolha outro.');
        return;
    }

    agendamentos[idx].data = data;
    agendamentos[idx].horario = horario;
    agendamentos[idx].tipo = tipo;

    salvarDados('agendamentos', agendamentos);
    alert('✅ Agendamento atualizado!');

    const btnAgendar = document.querySelector('#agendamentoScreen .btn-primary');
    if (btnAgendar) {
        btnAgendar.textContent = '✅ AGENDAR';
        btnAgendar.onclick = function() { agendarCorte(); };
    }
    document.getElementById('agendamentoId').value = '';

    mostrarTela('homeBarbeiroScreen');
}

function excluirAgendamento(agendamentoId) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    let agendamentos = carregarDados('agendamentos') || [];
    agendamentos = agendamentos.filter(a => a.id !== agendamentoId);
    salvarDados('agendamentos', agendamentos);
    alert('🗑️ Agendamento excluído!');
    carregarAgendamentosBarbeiro();
}

// =============================================================
// ===== FATURAMENTO =====
// =============================================================

function carregarFaturamento() {
    console.log('💰 carregarFaturamento() CHAMADA!');
    
    const pagamentos = carregarDados('pagamentos') || [];
    const hoje = new Date();
    const confirmados = pagamentos.filter(p => p.status === 'confirmado');

    const hojeStr = hoje.toISOString().split('T')[0];
    document.getElementById('faturamentoHoje').textContent = 'R$ ' + confirmados
        .filter(p => p.data.split('T')[0] === hojeStr)
        .reduce((sum, p) => sum + p.valor, 0).toFixed(2);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    document.getElementById('faturamentoSemana').textContent = 'R$ ' + confirmados
        .filter(p => new Date(p.data) >= inicioSemana)
        .reduce((sum, p) => sum + p.valor, 0).toFixed(2);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById('faturamentoMes').textContent = 'R$ ' + confirmados
        .filter(p => new Date(p.data) >= inicioMes)
        .reduce((sum, p) => sum + p.valor, 0).toFixed(2);

    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    document.getElementById('faturamentoAno').textContent = 'R$ ' + confirmados
        .filter(p => new Date(p.data) >= inicioAno)
        .reduce((sum, p) => sum + p.valor, 0).toFixed(2);
}

// =============================================================
// ===== EXTRATO =====
// =============================================================

function carregarExtrato() {
    console.log('📊 carregarExtrato() CHAMADA!');
    
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

function carregarConfigPix() {
    const chave = localStorage.getItem('pixChave') || 'barbearia.rm@email.com';
    const nome = localStorage.getItem('pixNome') || 'Barbearia RM';
    const cidade = localStorage.getItem('pixCidade') || 'SAO PAULO';
    return { chave, nome, cidade };
}

function salvarConfigPix() {
    const chave = document.getElementById('editPixChave').value.trim();
    const nome = document.getElementById('editPixNome').value.trim();
    const cidade = document.getElementById('editPixCidade').value.trim();

    if (!chave || !nome || !cidade) {
        alert('Preencha todos os campos!');
        return;
    }

    localStorage.setItem('pixChave', chave);
    localStorage.setItem('pixNome', nome);
    localStorage.setItem('pixCidade', cidade);

    alert('✅ Chave PIX atualizada!');
    mostrarTela('homeBarbeiroScreen');
}

function abrirEditarPix() {
    const config = carregarConfigPix();
    document.getElementById('editPixChave').value = config.chave;
    document.getElementById('editPixNome').value = config.nome;
    document.getElementById('editPixCidade').value = config.cidade;
    mostrarTela('editarPixScreen');
}

function abrirPagamento(postId) {
    console.log('💳 abrirPagamento() CHAMADA!');
    
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        alert('Faça login como cliente para pagar!');
        return;
    }

    pagamentoPostId = postId;
    pixCopiado = false;
    qrCodeLido = false;

    mostrarTela('pagamentoScreen');

    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = '';

    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) {
        alert('Post não encontrado!');
        return;
    }

    const valor = post.preco.toFixed(2);
    const config = carregarConfigPix();

    document.getElementById('pixChave').textContent = config.chave;
    document.getElementById('pixNome').textContent = config.nome;
    document.getElementById('pixValor').textContent = 'R$ ' + valor;

    const chavePix = config.chave;
    const nomePix = config.nome;
    const cidadePix = config.cidade;
    const pixString = `00020126580014BR.GOV.BCB.PIX0136${chavePix}5204000053039865404${valor}5802BR5913${nomePix}6008${cidadePix}62070503***6304`;

    try {
        new QRCode(container, {
            text: pixString,
            width: 200,
            height: 200,
            colorDark: '#C9A84C',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        container.style.cursor = 'pointer';
        container.onclick = function() {
            qrCodeLido = true;
            document.getElementById('qrCodeStatus').textContent = '✅ QR Code lido com sucesso!';
            document.getElementById('qrCodeStatus').style.color = '#10B981';
            verificarPagamento();
        };

    } catch (e) {
        container.innerHTML = '<p style="color:#6A6A6A;">Erro ao gerar QR Code. Use a chave PIX abaixo.</p>';
    }

    document.getElementById('qrCodeStatus').textContent = 'Clique no QR Code para simular leitura';
    document.getElementById('qrCodeStatus').style.color = '#6A6A6A';
    document.getElementById('pixStatus').textContent = 'Clique em "Copiar" para confirmar';
    document.getElementById('pixStatus').style.color = '#6A6A6A';
    document.getElementById('cartaoNumero').value = '';
    document.getElementById('cartaoValidade').value = '';
    document.getElementById('cartaoCVV').value = '';

    verificarPagamento();
}

function copiarPix() {
    const chave = document.getElementById('pixChave').textContent;
    navigator.clipboard.writeText(chave).then(() => {
        pixCopiado = true;
        document.getElementById('pixStatus').textContent = '✅ Chave copiada com sucesso!';
        document.getElementById('pixStatus').style.color = '#10B981';
        verificarPagamento();
        alert('Chave PIX copiada!');
    }).catch(() => {
        alert('Chave: ' + chave);
    });
}

function verificarPagamento() {
    console.log('💳 verificarPagamento() CHAMADA!');
    
    const btnPagar = document.querySelector('#pagamentoScreen .btn-primary');
    if (!btnPagar) return;

    const cartaoNumero = document.getElementById('cartaoNumero').value.replace(/\s/g, '');
    const cartaoValidade = document.getElementById('cartaoValidade').value;
    const cartaoCVV = document.getElementById('cartaoCVV').value;

    const cartaoPreenchido = cartaoNumero.length >= 16 && cartaoValidade.length >= 5 && cartaoCVV.length >= 3;

    if (pixCopiado || qrCodeLido || cartaoPreenchido) {
        btnPagar.disabled = false;
        btnPagar.style.opacity = '1';
        btnPagar.style.cursor = 'pointer';
        btnPagar.textContent = '💳 CONFIRMAR PAGAMENTO';
        console.log('✅ Pagamento liberado!');
    } else {
        btnPagar.disabled = true;
        btnPagar.style.opacity = '0.5';
        btnPagar.style.cursor = 'not-allowed';
        btnPagar.textContent = '💳 AGUARDANDO CONFIRMAÇÃO...';
        console.log('⏳ Aguardando confirmação...');
    }
}

function processarPagamento() {
    console.log('💳 processarPagamento() CHAMADA!');
    
    if (!pagamentoPostId) {
        alert('Erro no pagamento!');
        return;
    }

    const cartaoNumero = document.getElementById('cartaoNumero').value.replace(/\s/g, '');
    const cartaoValidade = document.getElementById('cartaoValidade').value;
    const cartaoCVV = document.getElementById('cartaoCVV').value;

    let metodo = '';
    let confirmado = false;

    if (pixCopiado || qrCodeLido) {
        metodo = qrCodeLido ? 'QR Code Lido' : 'PIX Copiado';
        confirmado = true;
    } else if (cartaoNumero.length >= 16 && cartaoValidade.length >= 5 && cartaoCVV.length >= 3) {
        metodo = 'Cartão de Crédito';
        confirmado = true;
    }

    if (!confirmado) {
        alert('⚠️ Confirme o pagamento antes de prosseguir!');
        return;
    }

    const posts = carregarDados('posts') || [];
    const post = posts.find(p => p.id === pagamentoPostId);
    if (!post) {
        alert('Post não encontrado!');
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
        metodo: metodo
    });

    salvarDados('pagamentos', pagamentos);
    alert('✅ Pagamento confirmado via ' + metodo + '!');
    pagamentoPostId = null;
    pixCopiado = false;
    qrCodeLido = false;
    mostrarTela('homeClienteScreen');
}

function fecharPagamento() {
    pagamentoPostId = null;
    pixCopiado = false;
    qrCodeLido = false;
    mostrarTela('homeClienteScreen');
}

// =============================================================
// ===== LOCALIZAÇÃO =====
// =============================================================

function abrirLocalizacao() {
    const endereco = "Rua das Barbearias, 123 - Centro, São Paulo - SP";
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank');
}

// =============================================================
// ===== ESTATÍSTICAS =====
// =============================================================

function atualizarEstatisticas() {
    console.log('📊 atualizarEstatisticas() CHAMADA!');
    
    const clientes = carregarDados('clientes') || [];
    document.getElementById('totalClientes').textContent = clientes.length;

    const agora = Date.now();
    const online = clientes.filter(c => (agora - (c.ultimoAcesso || 0)) < 5 * 60 * 1000);
    document.getElementById('clientesOnline').textContent = online.length;

    const agendamentos = carregarDados('agendamentos') || [];
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje && a.status !== 'cancelado');
    document.getElementById('totalAgendamentos').textContent = agendamentosHoje.length;

    alert('📊 Estatísticas atualizadas!');
}

// =============================================================
// ===== INFORMAÇÕES DOS CLIENTES =====
// =============================================================

function atualizarInfoClientes() {
    console.log('📊 atualizarInfoClientes() CHAMADA!');
    
    const clientes = carregarDados('clientes') || [];
    document.getElementById('infoTotalClientes').textContent = clientes.length;

    const agora = Date.now();
    const online = clientes.filter(c => (agora - (c.ultimoAcesso || 0)) < 5 * 60 * 1000);
    document.getElementById('infoOnlineClientes').textContent = online.length;

    const comLocalizacao = clientes.filter(c => c.latitude && c.longitude);
    document.getElementById('infoComLocalizacao').textContent = comLocalizacao.length;

    const container = document.getElementById('infoListaClientes');
    if (!container) return;

    if (clientes.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A; text-align:center;">Nenhum cliente cadastrado</p>';
        return;
    }

    clientes.sort((a, b) => (b.ultimoAcesso || 0) - (a.ultimoAcesso || 0));

    container.innerHTML = clientes.map(c => {
        const isOnline = (Date.now() - (c.ultimoAcesso || 0)) < 5 * 60 * 1000;
        const statusIcon = isOnline ? '🟢' : '⚪';
        const statusText = isOnline ? 'Online' : 'Offline';
        const statusColor = isOnline ? '#10B981' : '#6A6A6A';
        const ultimoAcesso = c.ultimoAcesso ? new Date(c.ultimoAcesso).toLocaleString('pt-BR') : 'Nunca';
        const temLocalizacao = c.latitude && c.longitude;

        return `
            <div class="agenda-item" style="cursor:default; flex-wrap:wrap;">
                <div class="agenda-info" style="flex:1; min-width:150px;">
                    <div class="agenda-cliente">${c.nome || 'Sem nome'}</div>
                    <div class="agenda-data">📧 ${c.email || 'Sem e-mail'}</div>
                    <div class="agenda-data">📱 ${c.celular || 'Não informado'}</div>
                    <div class="agenda-data" style="font-size:11px; color:#4A4A4A;">
                        Último acesso: ${ultimoAcesso}
                    </div>
                    ${temLocalizacao ? `
                        <button onclick="verLocalizacaoCliente(${c.latitude}, ${c.longitude})" 
                                style="background:none; border:none; color:#C9A84C; cursor:pointer; font-size:12px; margin-top:4px; padding:0; text-decoration:underline;">
                            📍 Ver localização
                        </button>
                    ` : `
                        <span style="font-size:11px; color:#4A4A4A; display:block; margin-top:4px;">
                            📍 Localização não disponível
                        </span>
                    `}
                </div>
                <div style="text-align:right; min-width:60px;">
                    <div style="font-size:20px;">${statusIcon}</div>
                    <div style="font-size:12px; color:${statusColor}; font-weight:600;">${statusText}</div>
                    ${temLocalizacao ? `<div style="font-size:10px; color:#C9A84C;">📍</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    alert('📊 Informações atualizadas!');
}

function verLocalizacaoCliente(lat, lng) {
    if (!lat || !lng) {
        alert('📍 Cliente não compartilhou localização');
        return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
}

// =============================================================
// ===== PERFIL =====
// =============================================================

function carregarPerfilCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;
    document.getElementById('perfilClienteNome').textContent = usuarioLogado.nome;
    document.getElementById('perfilClienteEmail').textContent = usuarioLogado.email;
    document.getElementById('editClienteNome').value = usuarioLogado.nome || '';
    document.getElementById('editClienteCelular').value = usuarioLogado.celular || '';
}

function salvarPerfilCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;
    usuarioLogado.nome = document.getElementById('editClienteNome').value.trim();
    usuarioLogado.celular = document.getElementById('editClienteCelular').value.trim();

    const clientes = carregarDados('clientes') || [];
    const idx = clientes.findIndex(c => c.id === usuarioLogado.id);
    if (idx !== -1) {
        clientes[idx] = usuarioLogado;
        salvarDados('clientes', clientes);
    }
    alert('Perfil atualizado!');
    carregarPerfilCliente();
}

function carregarPerfilBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') return;
    document.getElementById('perfilBarbeiroNome').textContent = usuarioLogado.nome;
    document.getElementById('perfilBarbeiroEmail').textContent = usuarioLogado.email;
    document.getElementById('editBarbeiroNome').value = usuarioLogado.nome || '';
    document.getElementById('editBarbeiroCelular').value = usuarioLogado.celular || '';
    document.getElementById('editBarbeiroEmail').value = usuarioLogado.email || '';
}

function salvarPerfilBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') return;
    usuarioLogado.nome = document.getElementById('editBarbeiroNome').value.trim();
    usuarioLogado.celular = document.getElementById('editBarbeiroCelular').value.trim();
    usuarioLogado.email = document.getElementById('editBarbeiroEmail').value.trim();

    const barbeiros = carregarDados('barbeiros') || [];
    const idx = barbeiros.findIndex(b => b.id === usuarioLogado.id);
    if (idx !== -1) {
        barbeiros[idx] = usuarioLogado;
        salvarDados('barbeiros', barbeiros);
    }
    alert('Perfil atualizado!');
    carregarPerfilBarbeiro();
}

function uploadFotoCliente(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB!');
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
            alert('📸 Foto atualizada!');
        }
    };
    reader.readAsDataURL(file);
}

function uploadFotoBarbeiro(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB!');
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
            alert('📸 Foto atualizada!');
        }
    };
    reader.readAsDataURL(file);
}

function trocarSenhaCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') {
        alert('Faça login como cliente!');
        return;
    }

    const senhaAtual = document.getElementById('senhaAtualCliente').value;
    const novaSenha = document.getElementById('novaSenhaCliente').value;
    const confirmarSenha = document.getElementById('confirmarSenhaCliente').value;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        alert('Preencha todos os campos!');
        return;
    }

    if (senhaAtual !== usuarioLogado.senha) {
        alert('Senha atual incorreta!');
        return;
    }

    if (novaSenha.length < 6) {
        alert('Nova senha deve ter no mínimo 6 caracteres!');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
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

    alert('✅ Senha alterada com sucesso!');
}

function trocarSenhaBarbeiro() {
    if (!usuarioLogado || tipoUsuario !== 'barbeiro') {
        alert('Faça login como barbeiro!');
        return;
    }

    const senhaAtual = document.getElementById('senhaAtualBarbeiro').value;
    const novaSenha = document.getElementById('novaSenhaBarbeiro').value;
    const confirmarSenha = document.getElementById('confirmarSenhaBarbeiro').value;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        alert('Preencha todos os campos!');
        return;
    }

    if (senhaAtual !== usuarioLogado.senha) {
        alert('Senha atual incorreta!');
        return;
    }

    if (novaSenha.length < 6) {
        alert('Nova senha deve ter no mínimo 6 caracteres!');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
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

    alert('✅ Senha alterada com sucesso!');
}

// =============================================================
// ===== VER CLIENTES =====
// =============================================================

function verClientes() {
    const clientes = carregarDados('clientes') || [];
    if (clientes.length === 0) {
        alert('Nenhum cliente cadastrado!');
        return;
    }

    let html = '<h3>👥 LISTA DE CLIENTES</h3>';
    clientes.forEach(c => {
        html += `
            <div class="agenda-item" style="cursor:default;">
                <div class="agenda-info">
                    <div class="agenda-cliente">${c.nome}</div>
                    <div class="agenda-data">📧 ${c.email}</div>
                    <div class="agenda-data">📱 ${c.celular || 'Não informado'}</div>
                </div>
                <button onclick="excluirCliente('${c.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:18px;padding:8px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modalClientes';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            ${html}
            <button class="btn btn-outline" onclick="document.getElementById('modalClientes').remove()">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function excluirCliente(clienteId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    let clientes = carregarDados('clientes') || [];
    clientes = clientes.filter(c => c.id !== clienteId);
    salvarDados('clientes', clientes);
    alert('🗑️ Cliente excluído!');

    const modal = document.getElementById('modalClientes');
    if (modal) modal.remove();
}

// =============================================================
// ===== INICIALIZAÇÃO =====
// =============================================================

console.log('✂️ Barbearia RM carregada com sucesso!');
console.log('📧 Barbeiro: barbeiro@barbeariarm.com');
console.log('🔒 Senha: 123456');

// Listeners para os campos de cartão
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM carregado! Configurando listeners...');
    
    const cartaoNumero = document.getElementById('cartaoNumero');
    const cartaoValidade = document.getElementById('cartaoValidade');
    const cartaoCVV = document.getElementById('cartaoCVV');

    if (cartaoNumero) {
        cartaoNumero.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
            verificarPagamento();
        });
    }
    if (cartaoValidade) {
        cartaoValidade.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').replace(/(.{2})/g, '$1/').trim();
            verificarPagamento();
        });
    }
    if (cartaoCVV) {
        cartaoCVV.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            verificarPagamento();
        });
    }
});

// Verifica se já está logado
const usuarioSalvo = carregarDados('usuarioLogado');
console.log('👤 Usuário salvo:', usuarioSalvo);

if (usuarioSalvo) {
    const clientes = carregarDados('clientes') || [];
    const barbeiros = carregarDados('barbeiros') || [];
    
    const isCliente = clientes.some(c => c.id === usuarioSalvo.id);
    const isBarbeiro = barbeiros.some(b => b.id === usuarioSalvo.id);
    
    if (isCliente) {
        usuarioLogado = usuarioSalvo;
        tipoUsuario = 'cliente';
        console.log('✅ Cliente logado:', usuarioLogado.nome);
        mostrarTela('homeClienteScreen');
    } else if (isBarbeiro) {
        usuarioLogado = usuarioSalvo;
        tipoUsuario = 'barbeiro';
        console.log('✅ Barbeiro logado:', usuarioLogado.nome);
        mostrarTela('homeBarbeiroScreen');
    }
}
