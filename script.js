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
// ===== LOCAL STORAGE =====
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
// ===== DADOS INICIAIS =====
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

if (!carregarDados('agendamentos')) {
    salvarDados('agendamentos', []);
}

if (!carregarDados('pagamentos')) {
    salvarDados('pagamentos', []);
}

// =============================================================
// ===== VARIÁVEIS GLOBAIS =====
// =============================================================

let usuarioLogado = null;
let tipoUsuario = null; // 'cliente' ou 'barbeiro'
let postSelecionado = null;
let extratoFiltro = 'todos';

// =============================================================
// ===== CONTROLE DE TELAS =====
// =============================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('active');

    // Controla navegação inferior
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

    // Carrega dados ao entrar nas telas
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
    if (id === 'extratoScreen') {
        carregarExtrato();
    }
}

function mostrarToast(mensagem, tipo = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = mensagem;
    toast.style.background = tipo === 'erro' ? '#EF4444' : tipo === 'sucesso' ? '#10B981' : '#1F2937';
    toast.style.display = 'block';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3000);
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
        mostrarToast('Bem-vindo, ' + cliente.nome + '!', 'sucesso');
        mostrarTela('homeClienteScreen');
    } else {
        mostrarToast('E-mail ou senha inválidos!', 'erro');
    }
}

function loginBarbeiro() {
    const email = sanitizar(document.getElementById('loginEmailBarbeiro').value.trim());
    const senha = document.getElementById('loginSenhaBarbeiro').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'erro');
        return;
    }

    const barbeiros = carregarDados('barbeiros') || [];
    const barbeiro = barbeiros.find(b => b.email === email && b.senha === senha);

    if (barbeiro) {
        usuarioLogado = barbeiro;
        tipoUsuario = 'barbeiro';
        mostrarToast('Bem-vindo, ' + barbeiro.nome + '!', 'sucesso');
        mostrarTela('homeBarbeiroScreen');
    } else {
        mostrarToast('E-mail ou senha inválidos!', 'erro');
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

    mostrarToast('Cadastro realizado com sucesso!', 'sucesso');
    mostrarTela('loginScreen');
}

// =============================================================
// ===== SAIR =====
// =============================================================

function sairCliente() {
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!');
}

function sairBarbeiro() {
    usuarioLogado = null;
    tipoUsuario = null;
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!');
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
                <h3>Nenhum post ainda</h3>
                <p style="color:#6B7280;">Aguardando novidades do barbeiro!</p>
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
                    <iframe src="https://www.youtube.com/embed/${videoId}" 
                            style="width:100%;height:100%;border:none;" 
                            allowfullscreen></iframe>
                </div>
            `;
        } else if (post.imagem) {
            mediaHtml = `<img src="${post.imagem}" alt="${post.titulo}" class="feed-post-image">`;
        }

        return `
            <div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">✂️</div>
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

    // O barbeiro vê o mesmo feed, mas com opções de edição
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center;padding:40px;">
                <div style="font-size:60px;">📸</div>
                <h3>Nenhum post ainda</h3>
                <p style="color:#6B7280;">Crie seu primeiro post!</p>
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
                    <iframe src="https://www.youtube.com/embed/${videoId}" 
                            style="width:100%;height:100%;border:none;" 
                            allowfullscreen></iframe>
                </div>
            `;
        } else if (post.imagem) {
            mediaHtml = `<img src="${post.imagem}" alt="${post.titulo}" class="feed-post-image">`;
        }

        return `
            <div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">✂️</div>
                    <div class="feed-post-user">
                        <div class="feed-post-user-name">Barbearia RM</div>
                        <div class="feed-post-user-time">${new Date(post.data).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <button onclick="excluirPost('${post.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:18px;">
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
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum comentário ainda. Seja o primeiro!</p>';
    } else {
        container.innerHTML = comentarios.map(c => `
            <div style="padding:8px 0; border-bottom:1px solid #e5e7eb;">
                <strong>${c.nome}</strong>
                <p style="margin:4px 0; font-size:14px;">${c.texto}</p>
                <span style="font-size:11px; color:#9CA3AF;">${new Date(c.data).toLocaleDateString('pt-BR')}</span>
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
            title: 'Barbearia RM - Corte incrível!',
            text: 'Confira esse corte na Barbearia RM!',
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
    mostrarToast('Post publicado com sucesso!', 'sucesso');

    // Limpa campos
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
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum plano criado</p>';
        return;
    }

    container.innerHTML = planos.map(plano => `
        <div class="plano-card">
            <div class="plano-info">
                <div class="plano-nome">${plano.nome}</div>
                <div class="plano-periodo">📅 ${plano.periodo.charAt(0).toUpperCase() + plano.periodo.slice(1)}</div>
                <div style="font-size:12px; color:#6B7280;">${plano.descricao || ''}</div>
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
    mostrarToast('Plano criado com sucesso!', 'sucesso');

    document.getElementById('planoNome').value = '';
    document.getElementById('planoPreco').value = '';
    document.getElementById('planoDescricao').value = '';

    mostrarTela('homeBarbeiroScreen');
}

// =============================================================
// ===== AGENDAMENTO =====
// =============================================================

function agendarCorte() {
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

    const agendamentos = carregarDados('agendamentos') || [];

    // Verifica se já existe agendamento no mesmo horário
    const conflito = agendamentos.some(a => a.data === data && a.horario === horario && a.status !== 'cancelado');
    if (conflito) {
        mostrarToast('Horário já ocupado! Escolha outro.', 'erro');
        return;
    }

    agendamentos.push({
        id: gerarId(),
        clienteId: usuarioLogado.id,
        clienteNome: usuarioLogado.nome,
        data: data,
        horario: horario,
        tipo: tipo,
        status: 'confirmado',
        dataAgendamento: new Date().toISOString()
    });

    salvarDados('agendamentos', agendamentos);
    mostrarToast('✅ Agendamento confirmado para ' + data + ' às ' + horario, 'sucesso');
    mostrarTela('homeClienteScreen');
}

function carregarAgendaCliente() {
    if (!usuarioLogado || tipoUsuario !== 'cliente') return;

    const agendamentos = carregarDados('agendamentos') || [];
    const meus = agendamentos.filter(a => a.clienteId === usuarioLogado.id && a.status !== 'cancelado');

    const container = document.getElementById('agendaClienteContainer');
    if (!container) return;

    if (meus.length === 0) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
        return;
    }

    // Ordena por data
    meus.sort((a, b) => new Date(a.data + ' ' + a.horario) - new Date(b.data + ' ' + b.horario));

    container.innerHTML = meus.map(a => `
        <div class="agenda-item">
            <div class="agenda-info">
                <div>✂️ ${a.tipo}</div>
                <div class="agenda-data">📅 ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horario}</div>
            </div>
            <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}</span>
        </div>
    `).join('');
}

function carregarAgendamentosBarbeiro() {
    const agendamentos = carregarDados('agendamentos') || [];
    const container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;

    if (agendamentos.length === 0) {
        container.innerHTML = '<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';
        return;
    }

    // Ordena por data
    agendamentos.sort((a, b) => new Date(a.data + ' ' + a.horario) - new Date(b.data + ' ' + b.horario));

    container.innerHTML = agendamentos.map(a => `
        <div class="agenda-item">
            <div class="agenda-info">
                <div class="agenda-cliente">${a.clienteNome}</div>
                <div>✂️ ${a.tipo}</div>
                <div class="agenda-data">📅 ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horario}</div>
            </div>
            <div>
                <span class="agenda-status ${a.status}">${a.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}</span>
                ${a.status === 'confirmado' ? `<button onclick="cancelarAgendamento('${a.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:14px;margin-top:4px;">Cancelar</button>` : ''}
            </div>
        </div>
    `).join('');
}

function cancelarAgendamento(id) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    const agendamentos = carregarDados('agendamentos') || [];
    const idx = agendamentos.findIndex(a => a.id === id);
    if (idx === -1) return;

    agendamentos[idx].status = 'cancelado';
    salvarDados('agendamentos', agendamentos);

    // Verifica se o cliente faltou
    const agendamento = agendamentos[idx];
    if (agendamento) {
        mostrarToast(`❌ ${agendamento.clienteNome} perdeu a vez. Precisa agendar novamente.`, 'erro');
    }

    carregarAgendamentosBarbeiro();
}

// =============================================================
// ===== FATURAMENTO =====
// =============================================================

function carregarFaturamento() {
    const pagamentos = carregarDados('pagamentos') || [];
    const hoje = new Date();

    // Filtra pagamentos confirmados
    const confirmados = pagamentos.filter(p => p.status === 'confirmado');

    // Hoje
    const hojeStr = hoje.toISOString().split('T')[0];
    const faturamentoHoje = confirmados
        .filter(p => p.data.split('T')[0] === hojeStr)
        .reduce((sum, p) => sum + p.valor, 0);

    // Semana
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const faturamentoSemana = confirmados
        .filter(p => new Date(p.data) >= inicioSemana)
        .reduce((sum, p) => sum + p.valor, 0);

    // Mês
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const faturamentoMes = confirmados
        .filter(p => new Date(p.data) >= inicioMes)
        .reduce((sum, p) => sum + p.valor, 0);

    // Ano
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

    // Aplica filtro
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

    // Ordena por data (mais recente primeiro)
    filtrados.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6B7280;">Nenhum pagamento encontrado</p>';
        return;
    }

    let total = 0;
    container.innerHTML = filtrados.map(p => {
        total += p.valor;
        return `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
                <div>
                    <div style="font-weight:600;">${p.clienteNome}</div>
                    <div style="font-size:12px;color:#6B7280;">${p.tipo}</div>
                    <div style="font-size:12px;color:#9CA3AF;">${new Date(p.data).toLocaleString('pt-BR')}</div>
                </div>
                <div style="font-weight:700;color:#D4A84B;">R$ ${p.valor.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML += `
        <div style="text-align:right;padding:10px 0;font-weight:700;font-size:18px;border-top:2px solid #D4A84B;">
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

    // Gera QR Code PIX
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
            colorDark: '#1A1A1A',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        container.innerHTML = '<p>Erro ao gerar QR Code. Use a chave PIX abaixo.</p>';
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

    // Simula processamento
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

// Verifica se já está logado
const usuarioSalvo = carregarDados('usuarioLogado');
if (usuarioSalvo) {
    // Tenta identificar o tipo
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
console.log('🔒 Sistema com proteção contra XSS e sanitização de dados.');