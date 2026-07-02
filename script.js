// ==========================================================
// ===== CONFIGURAÇÃO DO FIREBASE =====
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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log('🔥 Firebase conectado!');

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
var horariosTrabalho = {
    diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horarioInicio: '09:00',
    horarioFim: '18:00',
    intervaloCortes: 30,
    folgas: []
};

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================

function mostrarToast(mensagem, tipo) {
    var toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = 'toast ' + (tipo || 'info');
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 3000);
}

function voltarParaLogin() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
}

// ==========================================================
// ===== LOGIN - MOSTRAR FORMULÁRIOS =====
// ==========================================================

function mostrarLoginCliente() {
    document.getElementById('loginFormCliente').style.display = 'block';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
}

function mostrarLoginBarbeiro() {
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'block';
}

// ==========================================================
// ===== CADASTRO CLIENTE =====
// ==========================================================

async function cadastrarCliente() {
    var nome = document.getElementById('cadNomeCliente').value.trim();
    var email = document.getElementById('cadEmailCliente').value.trim();
    var celular = document.getElementById('cadCelularCliente').value.trim();
    var senha = document.getElementById('cadSenhaCliente').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    if (senha.length < 6) {
        mostrarToast('❌ Senha mínima de 6 caracteres!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('clientes').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var clienteId = Date.now().toString();
        var cliente = {
            id: clienteId,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('clientes').doc(clienteId).set(cliente);
        clienteLogado = cliente;
        document.getElementById('welcomeClienteNome').textContent = cliente.nome;
        
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeClienteScreen');
        
        document.getElementById('cadNomeCliente').value = '';
        document.getElementById('cadEmailCliente').value = '';
        document.getElementById('cadCelularCliente').value = '';
        document.getElementById('cadSenhaCliente').value = '';
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== CADASTRO BARBEIRO =====
// ==========================================================

async function cadastrarBarbeiro() {
    var nome = document.getElementById('cadNomeBarbeiro').value.trim();
    var email = document.getElementById('cadEmailBarbeiro').value.trim();
    var celular = document.getElementById('cadCelularBarbeiro').value.trim();
    var senha = document.getElementById('cadSenhaBarbeiro').value;

    if (!nome || !email || !celular || !senha) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    if (senha.length < 6) {
        mostrarToast('❌ Senha mínima de 6 caracteres!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('barbeiros').where('email', '==', email).get();
        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var barbeiroId = Date.now().toString();
        var barbeiro = {
            id: barbeiroId,
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('barbeiros').doc(barbeiroId).set(barbeiro);
        barbeiroLogado = barbeiro;
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiro.nome;
        
        mostrarToast('✅ Cadastro realizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
        
        document.getElementById('cadNomeBarbeiro').value = '';
        document.getElementById('cadEmailBarbeiro').value = '';
        document.getElementById('cadCelularBarbeiro').value = '';
        document.getElementById('cadSenhaBarbeiro').value = '';
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN CLIENTE =====
// ==========================================================

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;

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

        var doc = snapshot.docs[0];
        clienteLogado = { id: doc.id, ...doc.data() };
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('loginEmailCliente').value = '';
        document.getElementById('loginSenhaCliente').value = '';
        document.getElementById('loginFormCliente').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGIN BARBEIRO =====
// ==========================================================

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;

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

        var doc = snapshot.docs[0];
        barbeiroLogado = { id: doc.id, ...doc.data() };
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('loginEmailBarbeiro').value = '';
        document.getElementById('loginSenhaBarbeiro').value = '';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== LOGOUT =====
// ==========================================================

function sairCliente() {
    clienteLogado = null;
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

function sairBarbeiro() {
    barbeiroLogado = null;
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== CARREGAR AGENDAMENTOS DO BARBEIRO =====
// ==========================================================

async function carregarAgendamentosBarbeiro() {
    var container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos').orderBy('data', 'desc').get();
        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:20px;">Nenhum agendamento</p>';
            return;
        }

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">👤 ${a.clienteNome || 'Cliente'}</div>
                        <div class="agenda-data">📅 ${a.data || 'N/A'} • ⏰ ${a.horario || 'N/A'}</div>
                        <div style="font-size:12px; color:#6B7280;">✂️ ${a.tipo || 'Corte'}</div>
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <span class="agenda-status ${statusClass}">${statusText}</span>
                        ${a.status === 'pendente' ? 
                            `<button class="btn btn-small btn-success" onclick="confirmarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">✅</button>
                             <button class="btn btn-small btn-danger" onclick="cancelarAgendamento('${a.id}')" style="padding:4px 8px;font-size:11px;">❌</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

// ==========================================================
// ===== CONFIRMAR/CANCELAR AGENDAMENTO =====
// ==========================================================

async function confirmarAgendamento(id) {
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
        mostrarToast('✅ Confirmado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function cancelarAgendamento(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
        mostrarToast('🗑 Cancelado!', 'success');
        carregarAgendamentosBarbeiro();
        if (clienteLogado) carregarAgendaCliente();
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

// ==========================================================
// ===== CARREGAR PLANOS =====
// ==========================================================

async function carregarPlanos() {
    var container = document.getElementById('planosContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        var planos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (planos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:20px;">Nenhum plano criado</p>';
            return;
        }

        container.innerHTML = planos.map(function(p) {
            return `
                <div class="plano-card">
                    <div class="plano-info">
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                        <div style="font-size:12px; color:#6B7280;">${p.descricao || ''}</div>
                        <div class="plano-actions">
                            <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️ Editar</button>
                            <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑</button>
                        </div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco ? p.preco.toFixed(2) : '0,00'}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

// ==========================================================
// ===== CRIAR PLANO =====
// ==========================================================

async function criarPlano() {
    if (!barbeiroLogado) return;

    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();

    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }

    try {
        var planoId = Date.now().toString();
        await db.collection('planos').doc(planoId).set({
            id: planoId,
            barbeiroId: barbeiroLogado.id,
            nome: nome,
            periodo: periodo,
            preco: preco,
            descricao: descricao,
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        mostrarToast('❌ Erro ao criar plano!', 'error');
    }
}

// ==========================================================
// ===== EDITAR/EXCLUIR PLANO =====
// ==========================================================

function editarPlano(planoId) {
    db.collection('planos').doc(planoId).get().then(function(doc) {
        if (doc.exists) {
            var plano = doc.data();
            document.getElementById('editPlanoId').value = planoId;
            document.getElementById('editPlanoNome').value = plano.nome;
            document.getElementById('editPlanoPeriodo').value = plano.periodo;
            document.getElementById('editPlanoPreco').value = plano.preco;
            document.getElementById('editPlanoDescricao').value = plano.descricao || '';
            mostrarTela('editarPlanoScreen');
        }
    });
}

async function salvarEdicaoPlano() {
    var planoId = document.getElementById('editPlanoId').value;
    try {
        await db.collection('planos').doc(planoId).update({
            nome: document.getElementById('editPlanoNome').value.trim(),
            periodo: document.getElementById('editPlanoPeriodo').value,
            preco: parseFloat(document.getElementById('editPlanoPreco').value),
            descricao: document.getElementById('editPlanoDescricao').value.trim()
        });
        mostrarToast('✅ Plano atualizado!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

async function excluirPlano() {
    if (!confirm('Excluir este plano?')) return;
    var planoId = document.getElementById('editPlanoId').value;
    await db.collection('planos').doc(planoId).delete();
    mostrarToast('🗑 Plano excluído!', 'success');
    mostrarTela('homeBarbeiroScreen');
}

async function excluirPlanoDireto(planoId) {
    if (!confirm('Excluir este plano?')) return;
    await db.collection('planos').doc(planoId).delete();
    mostrarToast('🗑 Plano excluído!', 'success');
    carregarPlanos();
}

// ==========================================================
// ===== CALCULAR FATURAMENTO =====
// ==========================================================

async function calcularFaturamento() {
    try {
        const snapshot = await db.collection('agendamentos').where('status', '==', 'confirmado').get();
        var agendamentos = snapshot.docs.map(doc => doc.data());
        
        var hoje = new Date().toISOString().split('T')[0];
        var valorHoje = 0, valorSemana = 0, valorMes = 0, valorAno = 0;

        agendamentos.forEach(function(a) {
            var valor = 35;
            if (a.data === hoje) valorHoje += valor;
            valorSemana += valor;
            valorMes += valor;
            valorAno += valor;
        });

        var elHoje = document.getElementById('faturamentoHoje');
        var elSemana = document.getElementById('faturamentoSemana');
        var elMes = document.getElementById('faturamentoMes');
        var elAno = document.getElementById('faturamentoAno');
        
        if (elHoje) elHoje.textContent = 'R$ ' + valorHoje.toFixed(2);
        if (elSemana) elSemana.textContent = 'R$ ' + valorSemana.toFixed(2);
        if (elMes) elMes.textContent = 'R$ ' + valorMes.toFixed(2);
        if (elAno) elAno.textContent = 'R$ ' + valorAno.toFixed(2);
    } catch (error) {
        console.error('❌ Erro faturamento:', error);
    }
}

// ==========================================================
// ===== FEED CLIENTE =====
// ==========================================================

async function carregarFeedCliente() {
    var container = document.getElementById('feedClienteContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        var posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3></div>';
            return;
        }

        container.innerHTML = posts.map(function(post) {
            return `
                <div class="feed-post">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">${post.barbeiroNome || 'Barbearia RM'}</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : ''}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                        <div class="feed-post-desc">${post.descricao || ''}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button onclick="likePost('${post.id}', this)">❤️ <span class="count">${post.likes || 0}</span></button>
                        <button onclick="agendarPorPost('${post.id}')">✂️ Agendar</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro feed:', error);
    }
}

// ==========================================================
// ===== CRIAR POST =====
// ==========================================================

async function criarPost() {
    if (!barbeiroLogado) {
        mostrarToast('❌ Faça login como barbeiro!', 'error');
        return;
    }

    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var descricao = document.getElementById('postDescricao').value.trim();
    var imagem = document.getElementById('postImagem').value || '';
    var video = document.getElementById('postVideo').value || '';

    if (!titulo || !preco || preco <= 0) {
        mostrarToast('❌ Preencha título e preço!', 'error');
        return;
    }

    try {
        var postId = Date.now().toString();
        await db.collection('posts').doc(postId).set({
            id: postId,
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo: titulo,
            preco: preco,
            imagem: imagem,
            video: video,
            descricao: descricao,
            likes: 0,
            comentarios: [],
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Post publicado!', 'success');
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postDescricao').value = '';
        removerImagem();
        removerVideo();
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

// ==========================================================
// ===== UPLOAD IMAGEM/VIDEO =====
// ==========================================================

function previewImagem(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        imagemBase64 = e.target.result;
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
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        videoBase64 = e.target.result;
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
// ===== AGENDAMENTO CLIENTE =====
// ==========================================================

async function agendarCorte() {
    if (!clienteLogado) {
        mostrarToast('❌ Faça login primeiro!', 'error');
        return;
    }

    var data = document.getElementById('agendamentoData').value;
    var horario = document.getElementById('agendamentoHorario').value;
    var tipo = document.getElementById('agendamentoTipo').value;

    if (!data) {
        mostrarToast('❌ Selecione uma data!', 'error');
        return;
    }

    try {
        var agendamento = {
            id: Date.now().toString(),
            clienteId: clienteLogado.id,
            clienteNome: clienteLogado.nome,
            clienteEmail: clienteLogado.email,
            data: data,
            horario: horario,
            tipo: tipo,
            status: 'pendente',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('agendamentos').doc(agendamento.id).set(agendamento);
        mostrarToast('✅ Agendamento realizado!', 'success');
        document.getElementById('agendamentoData').value = '';
        carregarAgendaCliente();
        mostrarTela('homeClienteScreen');
    } catch (error) {
        mostrarToast('❌ Erro: ' + error.message, 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;
    var container = document.getElementById('agendaClienteContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos')
            .where('clienteId', '==', clienteLogado.id)
            .get();

        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum agendamento</p>';
            return;
        }

        agendamentos.sort(function(a, b) {
            return new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario);
        });

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">${a.tipo}</div>
                        <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div>
                    </div>
                    <span class="agenda-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro agenda:', error);
    }
}

// ==========================================================
// ===== GALERIA DE CORTES =====
// ==========================================================

async function carregarGaleria() {
    var container = document.getElementById('galeriaContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filtrarGaleria();
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

function filtrarGaleria() {
    var categoria = document.getElementById('filtroCategoria').value;
    var container = document.getElementById('galeriaContainer');
    
    var postsFiltrados = categoria === 'todos' ? todosPosts : todosPosts.filter(function(p) { return p.titulo === categoria; });
    
    if (postsFiltrados.length === 0) {
        container.innerHTML = '<p style="color:#6B7280; text-align:center; grid-column:1/-1;">Nenhum corte encontrado</p>';
        return;
    }
    
    container.innerHTML = postsFiltrados.map(function(post) {
        return `
            <div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
                ${post.imagem ? `<img src="${post.imagem}" class="galeria-item-image" alt="${post.titulo}">` : `<div class="galeria-item-image">✂️</div>`}
                <div class="galeria-item-info">
                    <div class="galeria-item-title">${post.titulo}</div>
                    <div class="galeria-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function verDetalheCorte(postId) {
    var post = todosPosts.find(function(p) { return p.id === postId; });
    if (!post) return;
    
    var conteudo = document.getElementById('detalhePostConteudo');
    conteudo.innerHTML = `
        <div class="card">
            <h3>${post.titulo}</h3>
            ${post.imagem ? `<img src="${post.imagem}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin:10px 0;">` : ''}
            <p style="font-size:24px;color:var(--primary);font-weight:700;">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</p>
            <p style="color:#B0B0B0;">${post.descricao || ''}</p>
            <button class="btn btn-primary" onclick="agendarPorPost('${post.id}')">✂️ AGENDAR</button>
            <button class="btn btn-outline" onclick="mostrarTela('galeriaCortesScreen')">← Voltar</button>
        </div>
    `;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== REELS =====
// ==========================================================

async function carregarReels() {
    var container = document.getElementById('reelsContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts').orderBy('dataCriacao', 'desc').get();
        todosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (todosReels.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:40px;">Nenhum reel disponível</p>';
            return;
        }
        
        reelsAtual = 0;
        exibirReel(0);
    } catch (error) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar</p>';
    }
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    
    var container = document.getElementById('reelsContainer');
    var post = todosReels[index];
    
    container.innerHTML = `
        <div class="reel-item">
            ${post.video ? `<video src="${post.video}" autoplay loop muted playsinline></video>` : 
              post.imagem ? `<img src="${post.imagem}" class="reel-item-image" alt="${post.titulo}">` :
              `<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>`}
            <div class="reel-item-overlay">
                <div class="reel-item-title">${post.titulo}</div>
                <div class="reel-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
            </div>
            <div class="reel-item-actions">
                <button onclick="likeReel('${post.id}', this)">❤️</button>
                <button onclick="agendarPorReel('${post.id}')">✂️</button>
            </div>
        </div>
    `;
}

function reelAnterior() {
    if (reelsAtual > 0) { reelsAtual--; exibirReel(reelsAtual); }
}

function reelProximo() {
    if (reelsAtual < todosReels.length - 1) { reelsAtual++; exibirReel(reelsAtual); }
}

function likeReel(postId, btn) {
    btn.classList.toggle('liked');
    mostrarToast('❤️ Curtido!', 'success');
}

function agendarPorReel(postId) {
    mostrarTela('agendamentoScreen');
}

function agendarPorPost(postId) {
    mostrarTela('agendamentoScreen');
}

function likePost(postId, btn) {
    btn.classList.toggle('liked');
    var count = btn.querySelector('.count');
    if (count) {
        var current = parseInt(count.textContent) || 0;
        count.textContent = btn.classList.contains('liked') ? current + 1 : current - 1;
    }
}

// ==========================================================
// ===== PERFIL CLIENTE =====
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
    var nome = document.getElementById('editClienteNome').value.trim();
    var celular = document.getElementById('editClienteCelular').value.trim();
    try {
        await db.collection('clientes').doc(clienteLogado.id).update({ nome, celular });
        clienteLogado.nome = nome;
        clienteLogado.celular = celular;
        mostrarToast('✅ Perfil atualizado!', 'success');
        carregarPerfilCliente();
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

function uploadFotoCliente(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var avatar = document.getElementById('perfilClienteAvatar');
        if (avatar) {
            var img = avatar.querySelector('img');
            if (img) img.src = foto;
        }
        clienteLogado.fotoPerfil = foto;
        await db.collection('clientes').doc(clienteLogado.id).update({ fotoPerfil: foto });
        mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

// ==========================================================
// ===== PERFIL BARBEIRO =====
// ==========================================================

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
    var nome = document.getElementById('editBarbeiroNome').value.trim();
    var celular = document.getElementById('editBarbeiroCelular').value.trim();
    var email = document.getElementById('editBarbeiroEmail').value.trim();
    try {
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome, celular, email });
        barbeiroLogado.nome = nome;
        barbeiroLogado.celular = celular;
        barbeiroLogado.email = email;
        mostrarToast('✅ Perfil atualizado!', 'success');
        carregarPerfilBarbeiro();
    } catch (error) {
        mostrarToast('❌ Erro!', 'error');
    }
}

function uploadFotoBarbeiro(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        var avatar = document.getElementById('perfilBarbeiroAvatar');
        if (avatar) {
            var img = avatar.querySelector('img');
            if (img) img.src = foto;
        }
        barbeiroLogado.fotoPerfil = foto;
        await db.collection('barbeiros').doc(barbeiroLogado.id).update({ fotoPerfil: foto });
        mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

// ==========================================================
// ===== EXTRATO E PAGAMENTO =====
// ==========================================================

function filtrarExtrato(tipo) {
    mostrarToast('📊 Filtrando por ' + tipo, 'info');
}

function copiarPix() {
    var chave = document.getElementById('pixChave').textContent;
    navigator.clipboard.writeText(chave).then(function() {
        mostrarToast('✅ Chave PIX copiada!', 'success');
    });
}

function fecharPagamento() {
    mostrarTela('homeClienteScreen');
}

// ==========================================================
// ===== HORÁRIOS DE TRABALHO =====
// ==========================================================

async function carregarHorarios() {
    if (!barbeiroLogado) return;
    
    try {
        const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        if (doc.exists) {
            horariosTrabalho = doc.data();
        }
        
        var dias = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
        dias.forEach(function(dia) {
            var checkbox = document.getElementById('dia' + dia);
            if (checkbox) {
                checkbox.checked = horariosTrabalho.diasTrabalho.includes(dia.toLowerCase());
            }
        });
        
        document.getElementById('horarioInicio').value = horariosTrabalho.horarioInicio;
        document.getElementById('horarioFim').value = horariosTrabalho.horarioFim;
        document.getElementById('intervaloCortes').value = horariosTrabalho.intervaloCortes;
        carregarFolgas();
    } catch (error) {
        console.error('❌ Erro horários:', error);
    }
}

function carregarFolgas() {
    var container = document.getElementById('folgasContainer');
    if (!container) return;
    
    if (!horariosTrabalho.folgas || horariosTrabalho.folgas.length === 0) {
        container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhuma folga cadastrada</p>';
        return;
    }
    
    container.innerHTML = horariosTrabalho.folgas.map(function(folga, index) {
        return `
            <div class="folga-item">
                <span>🏖️ ${new Date(folga).toLocaleDateString('pt-BR')}</span>
                <button onclick="removerFolga(${index})">❌</button>
            </div>
        `;
    }).join('');
}

function adicionarFolga() {
    var data = document.getElementById('folgaData').value;
    if (!data) { mostrarToast('❌ Selecione uma data!', 'error'); return; }
    if (horariosTrabalho.folgas.includes(data)) { mostrarToast('❌ Data já cadastrada!', 'error'); return; }
    
    horariosTrabalho.folgas.push(data);
    horariosTrabalho.folgas.sort();
    carregarFolgas();
    document.getElementById('folgaData').value = '';
    mostrarToast('✅ Folga adicionada!', 'success');
}

function removerFolga(index) {
    horariosTrabalho.folgas.splice(index, 1);
    carregarFolgas();
    mostrarToast('🗑 Folga removida!', 'info');
}

async function salvarHorarios() {
    if (!barbeiroLogado) return;
    
    var diasSelecionados = [];
    var dias = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
    dias.forEach(function(dia) {
        var checkbox = document.getElementById('dia' + dia);
        if (checkbox && checkbox.checked) diasSelecionados.push(dia.toLowerCase());
    });
    
    horariosTrabalho.diasTrabalho = diasSelecionados;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    
    try {
        await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho);
        mostrarToast('✅ Horários salvos!', 'success');
    } catch (error) {
        mostrarToast('❌ Erro ao salvar!', 'error');
    }
}

// ==========================================================
// ===== POSTS PADRÃO =====
// ==========================================================

async function criarPostsPadraoParaBarbeiro() {
    if (!barbeiroLogado) return;
    
    try {
        const snapshot = await db.collection('posts').where('barbeiroId', '==', barbeiroLogado.id).get();
        if (!snapshot.empty) return;
        
        var posts = [
            { barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: 'Corte Social', preco: 35.00, descricao: 'Corte social com acabamento perfeito.', likes: 0, comentarios: [], dataCriacao: new Date().toISOString() },
            { barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: 'Corte Degradê', preco: 45.00, descricao: 'Degradê moderno com máquina e tesoura.', likes: 0, comentarios: [], dataCriacao: new Date().toISOString() },
            { barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: 'Barba', preco: 25.00, descricao: 'Barba completa com toalha quente.', likes: 0, comentarios: [], dataCriacao: new Date().toISOString() },
            { barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome, titulo: 'Barba + Corte', preco: 55.00, descricao: 'Combo completo: corte + barba.', likes: 0, comentarios: [], dataCriacao: new Date().toISOString() }
        ];
        
        for (var post of posts) {
            var postId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            await db.collection('posts').doc(postId).set({ id: postId, ...post });
        }
        
        carregarFeedCliente();
    } catch (error) {
        console.error('❌ Erro posts padrão:', error);
    }
}

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    
    var el = document.getElementById(id);
    if (el) { el.classList.add('active'); }
    
    var navCliente = document.getElementById('bottomNavCliente');
    var navBarbeiro = document.getElementById('bottomNavBarbeiro');
    
    var telasCliente = ['homeClienteScreen', 'agendamentoScreen', 'galeriaCortesScreen', 'reelsScreen', 'perfilClienteScreen', 'detalhePostScreen', 'pagamentoScreen'];
    var telasBarbeiro = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'criarPlanoScreen', 'editarPlanoScreen', 'horariosTrabalhoScreen', 'perfilBarbeiroScreen'];
    
    if (telasCliente.includes(id)) {
        if (navCliente) navCliente.style.display = 'flex';
        if (navBarbeiro) navBarbeiro.style.display = 'none';
    } else if (telasBarbeiro.includes(id)) {
        if (navBarbeiro) navBarbeiro.style.display = 'flex';
        if (navCliente) navCliente.style.display = 'none';
    } else {
        if (navCliente) navCliente.style.display = 'none';
        if (navBarbeiro) navBarbeiro.style.display = 'none';
    }
    
    if (id === 'homeClienteScreen') { carregarFeedCliente(); carregarAgendaCliente(); }
    if (id === 'homeBarbeiroScreen') { 
        carregarAgendamentosBarbeiro(); 
        carregarPlanos(); 
        calcularFaturamento();
        if (barbeiroLogado) { setTimeout(function() { criarPostsPadraoParaBarbeiro(); }, 300); }
    }
    if (id === 'perfilClienteScreen') carregarPerfilCliente();
    if (id === 'perfilBarbeiroScreen') carregarPerfilBarbeiro();
    if (id === 'galeriaCortesScreen') carregarGaleria();
    if (id === 'reelsScreen') carregarReels();
    if (id === 'horariosTrabalhoScreen') carregarHorarios();
    
    window.scrollTo(0, 0);
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    console.log('✅ Barbearia RM pronta!');
});
