// ==========================================================
// ===== CONFIGURAÇÃO DO FIREBASE =====
// ==========================================================
// ==========================================================
// ===== CONFIGURAÇÃO DO FIREBASE (PROJETO BARBEARIA-RM) =====
// ==========================================================

// 🔥 SUAS NOVAS CREDENCIAIS DO PROJETO BARBEARIA-RM
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

// 🔥 COMENTE ESTA LINHA PARA TESTAR (DESATIVA O CACHE)
// db.enablePersistence()
//     .then(() => console.log('🔥 Firestore cache ativado!'))
//     .catch(err => console.warn('⚠️ Erro ao ativar cache:', err));

console.log('🔥 Firebase conectado ao projeto: barbearia-rm');

// ==========================================================
// ===== VARIÁVEIS GLOBAIS =====
// ==========================================================
var clienteLogado = null;
var barbeiroLogado = null;
var postSelecionado = null;

// ==========================================================
// ===== FUNÇÕES DE NAVEGAÇÃO =====
// ==========================================================

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    if (id === 'homeClienteScreen') {
        carregarFeedCliente();
        carregarAgendaCliente();
    }
    if (id === 'homeBarbeiroScreen') {
        carregarAgendamentosBarbeiro();
        carregarPlanos();
        calcularFaturamento();
    }
    if (id === 'perfilClienteScreen') carregarPerfilCliente();
    if (id === 'perfilBarbeiroScreen') carregarPerfilBarbeiro();
}

function mostrarToast(mensagem, tipo) {
    var toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = 'toast ' + (tipo || 'info');
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 3000);
}

function fecharModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ==========================================================
// ===== LOGIN CLIENTE =====
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
// ===== CADASTRO CLIENTE (CORRIGIDO) =====
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

    if (!email.includes('@')) {
        mostrarToast('❌ E-mail inválido!', 'error');
        return;
    }

    try {
        // Verificar se e-mail já existe
        const snapshot = await db.collection('clientes')
            .where('email', '==', email)
            .get();

        if (!snapshot.empty) {
            mostrarToast('❌ E-mail já cadastrado!', 'error');
            return;
        }

        var cliente = {
            id: Date.now(),
            nome: nome,
            email: email,
            celular: celular,
            senha: senha,
            fotoPerfil: '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('clientes').doc(cliente.id.toString()).set(cliente);
        
        clienteLogado = cliente;
        document.getElementById('welcomeClienteNome').textContent = cliente.nome;
        document.getElementById('bottomNavCliente').style.display = 'flex';
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
        
        mostrarToast('✅ Cadastro realizado com sucesso!', 'success');
        mostrarTela('homeClienteScreen');
        
    } catch (error) {
        console.error('❌ Erro detalhado:', error);
        
        if (error.code === 'permission-denied') {
            mostrarToast('❌ Erro de permissão! Publique as regras do Firestore.', 'error');
        } else if (error.code === 'not-found') {
            mostrarToast('❌ Coleção não encontrada! Crie a coleção "clientes".', 'error');
        } else {
            mostrarToast('❌ Erro: ' + error.message, 'error');
        }
    }
}

// ==========================================================
// ===== LOGIN CLIENTE =====
// ==========================================================

async function loginCliente() {
    var email = document.getElementById('loginEmailCliente').value.trim();
    var senha = document.getElementById('loginSenhaCliente').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('clientes')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snapshot.empty) {
            mostrarToast('E-mail ou senha inválidos!', 'error');
            return;
        }

        clienteLogado = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        document.getElementById('bottomNavCliente').style.display = 'flex';
        document.getElementById('bottomNavBarbeiro').style.display = 'none';
        mostrarToast('Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarToast('Erro ao fazer login!', 'error');
    }
}

// ==========================================================
// ===== LOGIN BARBEIRO =====
// ==========================================================

async function loginBarbeiro() {
    var email = document.getElementById('loginEmailBarbeiro').value.trim();
    var senha = document.getElementById('loginSenhaBarbeiro').value;

    if (!email || !senha) {
        mostrarToast('Preencha todos os campos!', 'error');
        return;
    }

    try {
        const snapshot = await db.collection('barbeiros')
            .where('email', '==', email)
            .where('senha', '==', senha)
            .get();

        if (snapshot.empty) {
            mostrarToast('E-mail ou senha inválidos!', 'error');
            return;
        }

        barbeiroLogado = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        document.getElementById('bottomNavBarbeiro').style.display = 'flex';
        document.getElementById('bottomNavCliente').style.display = 'none';
        mostrarToast('Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarToast('Erro ao fazer login!', 'error');
    }
}

// ==========================================================
// ===== FEED CLIENTE =====
// ==========================================================

async function carregarFeedCliente() {
    var container = document.getElementById('feedClienteContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        var posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post ainda</h3><p style="color:#6B7280;">Aguarde novos cortes!</p></div>';
            return;
        }

        container.innerHTML = posts.map(function(post) {
            var videoHtml = post.video ? 
                `<iframe class="feed-post-video" src="${post.video.replace('watch?v=', 'embed/')}" allowfullscreen></iframe>` : '';
            
            return `
                <div class="feed-post">
                    <div class="feed-post-header">
                        <div class="feed-post-avatar">✂️</div>
                        <div class="feed-post-user">
                            <div class="feed-post-user-name">Barbearia RM</div>
                            <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                    ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" alt="${post.titulo}">` : ''}
                    ${videoHtml}
                    <div class="feed-post-body">
                        <div class="feed-post-title">${post.titulo}</div>
                        <div class="feed-post-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                        <div class="feed-post-desc">${post.descricao || ''}</div>
                    </div>
                    <div class="feed-post-actions">
                        <button onclick="likePost('${post.id}', this)">
                            ❤️ <span class="count">${post.likes || 0}</span>
                        </button>
                        <button onclick="abrirComentarios('${post.id}')">
                            💬 <span class="count">${post.comentarios ? post.comentarios.length : 0}</span>
                        </button>
                        <button onclick="agendarPorPost('${post.id}')">✂️ Agendar</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar feed:', error);
        mostrarToast('Erro ao carregar feed!', 'error');
    }
}

// ==========================================================
// ===== AGENDAMENTO CLIENTE =====
// ==========================================================

async function agendarCorte() {
    if (!clienteLogado) {
        mostrarToast('Faça login primeiro!', 'error');
        return;
    }

    var data = document.getElementById('agendamentoData').value;
    var horario = document.getElementById('agendamentoHorario').value;
    var tipo = document.getElementById('agendamentoTipo').value;

    if (!data) {
        mostrarToast('Selecione uma data!', 'error');
        return;
    }

    try {
        var agendamento = {
            id: Date.now(),
            clienteId: clienteLogado.id,
            clienteNome: clienteLogado.nome,
            clienteCelular: clienteLogado.celular,
            data: data,
            horario: horario,
            tipo: tipo,
            status: 'pendente',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('agendamentos').doc(agendamento.id.toString()).set(agendamento);
        mostrarToast('✅ Agendamento realizado!', 'success');
        carregarAgendaCliente();
        document.getElementById('agendamentoData').value = '';
    } catch (error) {
        console.error('❌ Erro ao agendar:', error);
        mostrarToast('Erro ao agendar!', 'error');
    }
}

async function carregarAgendaCliente() {
    if (!clienteLogado) return;

    var container = document.getElementById('agendaClienteContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos')
            .where('clienteId', '==', clienteLogado.id)
            .orderBy('data', 'desc')
            .get();

        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum agendamento</p>';
            return;
        }

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">${a.tipo || 'Corte'}</div>
                        <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario}</div>
                    </div>
                    <span class="agenda-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar agenda:', error);
    }
}

// ==========================================================
// ===== POSTS (BARBEIRO) =====
// ==========================================================

async function criarPost() {
    if (!barbeiroLogado) {
        mostrarToast('Faça login como barbeiro!', 'error');
        return;
    }

    var titulo = document.getElementById('postTitulo').value.trim();
    var preco = parseFloat(document.getElementById('postPreco').value);
    var imagem = document.getElementById('postImagem').value.trim();
    var video = document.getElementById('postVideo').value.trim();
    var descricao = document.getElementById('postDescricao').value.trim();

    if (!titulo) {
        mostrarToast('Digite um título!', 'error');
        return;
    }

    if (!preco || preco <= 0) {
        mostrarToast('Digite um preço válido!', 'error');
        return;
    }

    try {
        var post = {
            id: Date.now(),
            barbeiroId: barbeiroLogado.id,
            titulo: titulo,
            preco: preco,
            imagem: imagem || '',
            video: video || '',
            descricao: descricao || '',
            likes: 0,
            comentarios: [],
            dataCriacao: new Date().toISOString()
        };

        await db.collection('posts').doc(post.id.toString()).set(post);
        mostrarToast('✅ Post publicado!', 'success');
        document.getElementById('postTitulo').value = '';
        document.getElementById('postPreco').value = '';
        document.getElementById('postImagem').value = '';
        document.getElementById('postVideo').value = '';
        document.getElementById('postDescricao').value = '';
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro ao criar post:', error);
        mostrarToast('Erro ao publicar!', 'error');
    }
}

// ==========================================================
// ===== PLANOS (BARBEIRO) =====
// ==========================================================

async function criarPlano() {
    if (!barbeiroLogado) {
        mostrarToast('Faça login como barbeiro!', 'error');
        return;
    }

    var nome = document.getElementById('planoNome').value.trim();
    var periodo = document.getElementById('planoPeriodo').value;
    var preco = parseFloat(document.getElementById('planoPreco').value);
    var descricao = document.getElementById('planoDescricao').value.trim();

    if (!nome || !preco || preco <= 0) {
        mostrarToast('Preencha todos os campos!', 'error');
        return;
    }

    try {
        var plano = {
            id: Date.now(),
            barbeiroId: barbeiroLogado.id,
            nome: nome,
            periodo: periodo,
            preco: preco,
            descricao: descricao || '',
            dataCriacao: new Date().toISOString()
        };

        await db.collection('planos').doc(plano.id.toString()).set(plano);
        mostrarToast('✅ Plano criado!', 'success');
        document.getElementById('planoNome').value = '';
        document.getElementById('planoPreco').value = '';
        document.getElementById('planoDescricao').value = '';
        carregarPlanos();
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro ao criar plano:', error);
        mostrarToast('Erro ao criar plano!', 'error');
    }
}

async function carregarPlanos() {
    var container = document.getElementById('planosContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('planos')
            .orderBy('dataCriacao', 'desc')
            .get();

        var planos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (planos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum plano criado</p>';
            return;
        }

        container.innerHTML = planos.map(function(p) {
            return `
                <div class="plano-card">
                    <div class="plano-info">
                        <div class="plano-nome">${p.nome}</div>
                        <div class="plano-periodo">📅 ${p.periodo}</div>
                        <div style="font-size:12px; color:#6B7280;">${p.descricao || ''}</div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
    }
}

// ==========================================================
// ===== AGENDAMENTOS BARBEIRO =====
// ==========================================================

async function carregarAgendamentosBarbeiro() {
    var container = document.getElementById('agendamentosBarbeiroContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('agendamentos')
            .orderBy('data', 'asc')
            .get();

        var agendamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center;">Nenhum agendamento</p>';
            return;
        }

        container.innerHTML = agendamentos.map(function(a) {
            var statusClass = a.status === 'confirmado' ? 'confirmado' : a.status === 'cancelado' ? 'cancelado' : 'pendente';
            var statusText = a.status === 'confirmado' ? '✅ Confirmado' : a.status === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente';
            return `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <div class="agenda-cliente">${a.clienteNome}</div>
                        <div class="agenda-data">📅 ${a.data} • ⏰ ${a.horario} • ${a.tipo || 'Corte'}</div>
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        <span class="agenda-status ${statusClass}">${statusText}</span>
                        ${a.status === 'pendente' ? `<button class="btn btn-small btn-success" onclick="confirmarAgendamentoBarbeiro('${a.id}')" style="padding:2px 8px; font-size:10px;">✅</button>` : ''}
                        ${a.status === 'pendente' || a.status === 'confirmado' ? `<button class="btn btn-small btn-danger" onclick="cancelarAgendamentoBarbeiro('${a.id}')" style="padding:2px 8px; font-size:10px;">❌</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar agendamentos:', error);
    }
}

async function confirmarAgendamentoBarbeiro(id) {
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
        mostrarToast('✅ Agendamento confirmado!', 'success');
        carregarAgendamentosBarbeiro();
    } catch (error) {
        console.error('❌ Erro ao confirmar:', error);
        mostrarToast('Erro ao confirmar!', 'error');
    }
}

async function cancelarAgendamentoBarbeiro(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
        await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
        mostrarToast('✅ Agendamento cancelado!', 'success');
        carregarAgendamentosBarbeiro();
    } catch (error) {
        console.error('❌ Erro ao cancelar:', error);
        mostrarToast('Erro ao cancelar!', 'error');
    }
}

// ==========================================================
// ===== FATURAMENTO =====
// ==========================================================

async function calcularFaturamento() {
    try {
        const snapshot = await db.collection('agendamentos')
            .where('status', '==', 'confirmado')
            .get();

        var agendamentos = snapshot.docs.map(doc => doc.data());
        var hoje = new Date().toISOString().split('T')[0];
        var semana = new Date();
        semana.setDate(semana.getDate() - 7);
        var mes = new Date();
        mes.setMonth(mes.getMonth() - 1);
        var ano = new Date();
        ano.setFullYear(ano.getFullYear() - 1);

        var valorHoje = 0, valorSemana = 0, valorMes = 0, valorAno = 0;

        agendamentos.forEach(function(a) {
            var valor = 35;
            if (a.data === hoje) valorHoje += valor;
            if (a.data >= semana.toISOString().split('T')[0]) valorSemana += valor;
            if (a.data >= mes.toISOString().split('T')[0]) valorMes += valor;
            if (a.data >= ano.toISOString().split('T')[0]) valorAno += valor;
        });

        document.getElementById('faturamentoHoje').textContent = 'R$ ' + valorHoje.toFixed(2);
        document.getElementById('faturamentoSemana').textContent = 'R$ ' + valorSemana.toFixed(2);
        document.getElementById('faturamentoMes').textContent = 'R$ ' + valorMes.toFixed(2);
        document.getElementById('faturamentoAno').textContent = 'R$ ' + valorAno.toFixed(2);
    } catch (error) {
        console.error('❌ Erro ao calcular faturamento:', error);
    }
}

// ==========================================================
// ===== FUNÇÕES AUXILIARES =====
// ==========================================================

function agendarPorPost(postId) {
    mostrarTela('agendamentoScreen');
    mostrarToast('✂️ Agende seu horário!', 'info');
}

function likePost(postId, btn) {
    btn.classList.toggle('liked');
    var count = btn.querySelector('.count');
    var current = parseInt(count.textContent);
    count.textContent = btn.classList.contains('liked') ? current + 1 : current - 1;
}

function abrirComentarios(postId) {
    postSelecionado = postId;
    document.getElementById('modalComentario').classList.add('active');
}

function adicionarComentario() {
    var comentario = document.getElementById('novoComentario').value.trim();
    if (!comentario) {
        mostrarToast('Digite um comentário!', 'error');
        return;
    }
    mostrarToast('✅ Comentário adicionado!', 'success');
    document.getElementById('novoComentario').value = '';
    fecharModal('modalComentario');
}

function filtrarExtrato(tipo) {
    mostrarToast('📊 Filtrando por ' + tipo, 'info');
}

function copiarPix() {
    var chave = document.getElementById('pixChave').textContent;
    navigator.clipboard.writeText(chave).then(function() {
        mostrarToast('✅ Chave PIX copiada!', 'success');
    });
}

function processarPagamento() {
    mostrarToast('💳 Pagamento processado!', 'success');
    setTimeout(function() { mostrarTela('homeClienteScreen'); }, 1500);
}

function fecharPagamento() {
    mostrarTela('homeClienteScreen');
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
    if (clienteLogado.fotoPerfil) {
        document.getElementById('perfilClienteAvatar').innerHTML = 
            '<img src="' + clienteLogado.fotoPerfil + '" style="width:100%;height:100%;object-fit:cover;">';
    }
}

async function salvarPerfilCliente() {
    if (!clienteLogado) return;
    clienteLogado.nome = document.getElementById('editClienteNome').value.trim();
    clienteLogado.celular = document.getElementById('editClienteCelular').value.trim();
    try {
        await db.collection('clientes').doc(clienteLogado.id.toString()).update({
            nome: clienteLogado.nome,
            celular: clienteLogado.celular
        });
        mostrarToast('✅ Perfil atualizado!', 'success');
        carregarPerfilCliente();
    } catch (error) {
        console.error('❌ Erro ao salvar perfil:', error);
        mostrarToast('Erro ao salvar!', 'error');
    }
}

function uploadFotoCliente(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        document.getElementById('perfilClienteAvatar').innerHTML = 
            '<img src="' + foto + '" style="width:100%;height:100%;object-fit:cover;">';
        clienteLogado.fotoPerfil = foto;
        await db.collection('clientes').doc(clienteLogado.id.toString()).update({ fotoPerfil: foto });
        mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

async function trocarSenhaCliente() {
    if (!clienteLogado) return;
    var atual = document.getElementById('senhaAtualCliente').value;
    var nova = document.getElementById('novaSenhaCliente').value;
    var confirmar = document.getElementById('confirmarSenhaCliente').value;

    if (atual !== clienteLogado.senha) {
        mostrarToast('Senha atual incorreta!', 'error');
        return;
    }
    if (nova.length < 6) {
        mostrarToast('Nova senha mínima de 6 caracteres!', 'error');
        return;
    }
    if (nova !== confirmar) {
        mostrarToast('Senhas não coincidem!', 'error');
        return;
    }

    clienteLogado.senha = nova;
    await db.collection('clientes').doc(clienteLogado.id.toString()).update({ senha: nova });
    mostrarToast('✅ Senha alterada!', 'success');
    document.getElementById('senhaAtualCliente').value = '';
    document.getElementById('novaSenhaCliente').value = '';
    document.getElementById('confirmarSenhaCliente').value = '';
}

function sairCliente() {
    clienteLogado = null;
    document.getElementById('bottomNavCliente').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
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
    if (barbeiroLogado.fotoPerfil) {
        document.getElementById('perfilBarbeiroAvatar').innerHTML = 
            '<img src="' + barbeiroLogado.fotoPerfil + '" style="width:100%;height:100%;object-fit:cover;">';
    }
}

async function salvarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    barbeiroLogado.nome = document.getElementById('editBarbeiroNome').value.trim();
    barbeiroLogado.celular = document.getElementById('editBarbeiroCelular').value.trim();
    barbeiroLogado.email = document.getElementById('editBarbeiroEmail').value.trim();
    try {
        await db.collection('barbeiros').doc(barbeiroLogado.id.toString()).update({
            nome: barbeiroLogado.nome,
            celular: barbeiroLogado.celular,
            email: barbeiroLogado.email
        });
        mostrarToast('✅ Perfil atualizado!', 'success');
        carregarPerfilBarbeiro();
    } catch (error) {
        console.error('❌ Erro ao salvar perfil:', error);
        mostrarToast('Erro ao salvar!', 'error');
    }
}

function uploadFotoBarbeiro(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(ev) {
        var foto = ev.target.result;
        document.getElementById('perfilBarbeiroAvatar').innerHTML = 
            '<img src="' + foto + '" style="width:100%;height:100%;object-fit:cover;">';
        barbeiroLogado.fotoPerfil = foto;
        await db.collection('barbeiros').doc(barbeiroLogado.id.toString()).update({ fotoPerfil: foto });
        mostrarToast('✅ Foto atualizada!', 'success');
    };
    reader.readAsDataURL(file);
}

async function trocarSenhaBarbeiro() {
    if (!barbeiroLogado) return;
    var atual = document.getElementById('senhaAtualBarbeiro').value;
    var nova = document.getElementById('novaSenhaBarbeiro').value;
    var confirmar = document.getElementById('confirmarSenhaBarbeiro').value;

    if (atual !== barbeiroLogado.senha) {
        mostrarToast('Senha atual incorreta!', 'error');
        return;
    }
    if (nova.length < 6) {
        mostrarToast('Nova senha mínima de 6 caracteres!', 'error');
        return;
    }
    if (nova !== confirmar) {
        mostrarToast('Senhas não coincidem!', 'error');
        return;
    }

    barbeiroLogado.senha = nova;
    await db.collection('barbeiros').doc(barbeiroLogado.id.toString()).update({ senha: nova });
    mostrarToast('✅ Senha alterada!', 'success');
    document.getElementById('senhaAtualBarbeiro').value = '';
    document.getElementById('novaSenhaBarbeiro').value = '';
    document.getElementById('confirmarSenhaBarbeiro').value = '';
}

function sairBarbeiro() {
    barbeiroLogado = null;
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    mostrarTela('loginScreen');
    mostrarToast('👋 Até logo!', 'info');
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================

console.log('✅ Barbearia RM com Firebase!');
console.log('🔥 Projeto: construtorlpx');
console.log('📁 Coleções: clientes, barbeiros, posts, agendamentos, planos');
console.log('🎨 Tema Neon - Barbearia RM');
