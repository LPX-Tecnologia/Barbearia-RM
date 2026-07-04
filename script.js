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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('🔥 Firebase OK');

// ==========================================================
// ===== VARIÁVEIS GLOBAIS =====
// ==========================================================
var clienteLogado = null;
var barbeiroLogado = null;
var lojasCadastradas = [];
var lojaSelecionada = null;
var lojaAtualIndex = 0;
var todosPosts = [];
var liveAtiva = false;
var liveChatMessages = [];
var liveChatInterval = null;

const PORTAL_CONFIG = {
    nome: 'LPX Tecnologia',
    slogan: 'Inovação que transforma',
    logo: 'logo-lpx-tecnologia.jpg'
};

// ==========================================================
// ===== TEMA CLARO/ESCURO =====
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
        icone.className = document.body.classList.contains('light-mode') ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ==========================================================
// ===== TOAST =====
// ==========================================================
function mostrarToast(m, t) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = m;
    toast.className = 'toast-modern ' + (t || 'info');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ==========================================================
// ===== MODAL PERSONALIZADO =====
// ==========================================================
function mostrarModalConfirmacao(titulo, mensagem, onConfirm) {
    const modal = document.getElementById('modalConfirmacao');
    document.getElementById('modalConfirmacaoTitulo').textContent = titulo;
    document.getElementById('modalConfirmacaoMensagem').textContent = mensagem;
    document.getElementById('modalConfirmacaoBtnSim').onclick = function() {
        fecharModal('modalConfirmacao');
        if (onConfirm) onConfirm();
    };
    modal.classList.add('active');
}

function mostrarModalValor(titulo, valorSugerido, onConfirm) {
    const modal = document.getElementById('modalValor');
    document.getElementById('modalValorTitulo').textContent = titulo;
    document.getElementById('modalValorInput').value = valorSugerido || '';
    document.getElementById('modalValorBtnConfirmar').onclick = function() {
        const valor = document.getElementById('modalValorInput').value;
        if (valor && parseFloat(valor) > 0) {
            fecharModal('modalValor');
            if (onConfirm) onConfirm(parseFloat(valor).toFixed(2));
        } else {
            mostrarToast('❌ Digite um valor válido!', 'error');
        }
    };
    modal.classList.add('active');
    setTimeout(() => document.getElementById('modalValorInput').focus(), 300);
}

function fecharModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ==========================================================
// ===== HEADER =====
// ==========================================================
function atualizarHeader() {
    const logoImg = document.getElementById('headerLogoImg');
    const titleEl = document.getElementById('headerTitle');
    const sloganEl = document.getElementById('headerSlogan');
    const lojaSalva = localStorage.getItem('barbeariaRM_loja');
    const estaLogado = clienteLogado || barbeiroLogado;
    
    if (lojaSalva && estaLogado) {
        try {
            const loja = JSON.parse(lojaSalva);
            if (logoImg) logoImg.src = loja.logo || 'logobarbearia-rm.png';
            if (titleEl) titleEl.textContent = loja.nome || 'Loja';
            if (sloganEl) sloganEl.textContent = loja.slogan || '';
        } catch (e) {
            mostrarHeaderPortal();
        }
    } else {
        mostrarHeaderPortal();
    }
}

function mostrarHeaderPortal() {
    const logoImg = document.getElementById('headerLogoImg');
    const titleEl = document.getElementById('headerTitle');
    const sloganEl = document.getElementById('headerSlogan');
    if (logoImg) logoImg.src = PORTAL_CONFIG.logo;
    if (titleEl) titleEl.textContent = PORTAL_CONFIG.nome;
    if (sloganEl) sloganEl.textContent = PORTAL_CONFIG.slogan;
}

// ==========================================================
// ===== PORTAL DE LOJAS =====
// ==========================================================
async function carregarLojasPortal() {
    const carrossel = document.getElementById('portalCarrossel');
    if (!carrossel) return;
    
    try {
        const sn = await db.collection('lojas').orderBy('dataCriacao', 'desc').get();
        lojasCadastradas = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (lojasCadastradas.length === 0) {
            lojasCadastradas = [{
                id: 'default', nome: 'LPX Tecnologia', slogan: 'Inovação que transforma',
                categoria: 'tecnologia', logo: 'logo-lpx-tecnologia.jpg', dono: 'Admin',
                stats: { estrelas: 5.0, cortes: 1200, distancia: 0 }
            }];
        }
        
        carrossel.innerHTML = lojasCadastradas.map((loja, i) => {
            const icones = { barbearia: '💈', salao: '💇', estetica: '✨', tatuagem: '🎨', petshop: '🐾', tecnologia: '💻', outro: '📦' };
            const icone = icones[loja.categoria] || '🏪';
            const ativa = i === lojaAtualIndex ? ' ativa' : '';
            return `<div class="portal-loja-card${ativa}" onclick="selecionarLojaPortal(${i})">
                ${loja.logo ? `<img src="${loja.logo}" class="portal-loja-card-logo">` : `<div class="portal-loja-card-icone">${icone}</div>`}
                <div class="portal-loja-card-nome">${loja.nome}</div>
                <div class="portal-loja-card-categoria">${icone} ${loja.categoria || 'Loja'}</div>
            </div>`;
        }).join('');
        
        selecionarLojaPortal(lojaAtualIndex, false);
    } catch (e) { console.error('Erro:', e); }
}

function selecionarLojaPortal(index, scrollTo) {
    if (index < 0 || index >= lojasCadastradas.length) return;
    lojaAtualIndex = index;
    lojaSelecionada = lojasCadastradas[index];
    
    const nomeLojaEl = document.getElementById('portalNomeLoja');
    const sloganLojaEl = document.getElementById('portalSloganLoja');
    const logoEl = document.getElementById('portalLogo');
    const statsEl = document.getElementById('portalStats');
    
    if (nomeLojaEl) nomeLojaEl.textContent = lojaSelecionada.nome;
    if (sloganLojaEl) sloganLojaEl.textContent = lojaSelecionada.slogan || '';
    if (logoEl) logoEl.src = lojaSelecionada.logo || 'logo-lpx-tecnologia.jpg';
    if (statsEl) statsEl.innerHTML = `⭐ ${lojaSelecionada.stats?.estrelas || '5.0'} • ✂️ ${lojaSelecionada.stats?.cortes || '0'} serviços • 📍 ${lojaSelecionada.stats?.distancia || '0'}km`;
    
    document.querySelectorAll('.portal-loja-card').forEach((c, i) => c.classList.toggle('ativa', i === index));
    
    if (scrollTo !== false) {
        const carr = document.getElementById('portalCarrossel');
        const card = document.getElementById('lojaCard' + index);
        if (carr && card) carr.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' });
    }
}

function entrarNaLoja() {
    if (!lojaSelecionada) {
        mostrarToast('❌ Selecione uma loja!', 'error');
        return;
    }
    
    localStorage.setItem('barbeariaRM_loja', JSON.stringify({
        id: lojaSelecionada.id,
        nome: lojaSelecionada.nome,
        logo: lojaSelecionada.logo || 'logo-lpx-tecnologia.jpg',
        slogan: lojaSelecionada.slogan || ''
    }));
    
    mostrarToast('🏪 ' + lojaSelecionada.nome + ' - Faça login!', 'success');
    
    const container = document.getElementById('loginFormsContainer');
    if (container) {
        container.style.display = 'block';
        document.getElementById('loginFormCliente').style.display = 'block';
        document.getElementById('loginFormBarbeiro').style.display = 'none';
        document.querySelectorAll('.login-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
        setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
}

function switchLoginTab(tipo) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('loginFormCliente').style.display = tipo === 'cliente' ? 'block' : 'none';
    document.getElementById('loginFormBarbeiro').style.display = tipo === 'barbeiro' ? 'block' : 'none';
    document.querySelector(`.login-tab:nth-child(${tipo === 'cliente' ? 1 : 2})`).classList.add('active');
}

// ==========================================================
// ===== LOGIN/LOGOUT =====
// ==========================================================
async function loginCliente() {
    const e = document.getElementById('loginEmailCliente')?.value.trim();
    const s = document.getElementById('loginSenhaCliente')?.value;
    if (!e || !s) { mostrarToast('❌ Preencha email e senha!', 'error'); return; }
    
    try {
        const sn = await db.collection('clientes').where('email', '==', e).where('senha', '==', s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        
        clienteLogado = { id: sn.docs[0].id, ...sn.docs[0].data() };
        barbeiroLogado = null;
        salvarSessao('cliente', clienteLogado);
        
        document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
        limparCamposLogin();
        atualizarHeader();
        mostrarToast('✅ Bem-vindo, ' + clienteLogado.nome + '!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function loginBarbeiro() {
    const e = document.getElementById('loginEmailBarbeiro')?.value.trim();
    const s = document.getElementById('loginSenhaBarbeiro')?.value;
    if (!e || !s) { mostrarToast('❌ Preencha email e senha!', 'error'); return; }
    
    try {
        const sn = await db.collection('barbeiros').where('email', '==', e).where('senha', '==', s).get();
        if (sn.empty) { mostrarToast('❌ Inválido!', 'error'); return; }
        
        barbeiroLogado = { id: sn.docs[0].id, ...sn.docs[0].data() };
        clienteLogado = null;
        salvarSessao('barbeiro', barbeiroLogado);
        
        document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
        limparCamposLogin();
        atualizarHeader();
        mostrarToast('✅ Bem-vindo, ' + barbeiroLogado.nome + '!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

function limparCamposLogin() {
    ['loginEmailCliente', 'loginSenhaCliente', 'loginEmailBarbeiro', 'loginSenhaBarbeiro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const container = document.getElementById('loginFormsContainer');
    if (container) container.style.display = 'none';
}

function sairCliente() {
    mostrarModalConfirmacao('Sair', 'Tem certeza que deseja sair?', () => {
        clienteLogado = null;
        limparSessao();
        localStorage.removeItem('barbeariaRM_loja');
        atualizarHeader();
        mostrarTela('loginScreen');
        mostrarToast('👋 Até logo!', 'info');
    });
}

function sairBarbeiro() {
    mostrarModalConfirmacao('Sair', 'Tem certeza que deseja sair?', () => {
        barbeiroLogado = null;
        limparSessao();
        localStorage.removeItem('barbeariaRM_loja');
        atualizarHeader();
        mostrarTela('loginScreen');
        mostrarToast('👋 Até logo!', 'info');
    });
}

// ==========================================================
// ===== SESSÃO =====
// ==========================================================
function salvarSessao(tipo, dados) {
    localStorage.setItem('barbeariaRM_sessao', JSON.stringify({
        tipo, id: dados.id, nome: dados.nome, email: dados.email,
        celular: dados.celular || '', senha: dados.senha || '',
        fotoPerfil: dados.fotoPerfil || '', timestamp: Date.now()
    }));
}

function carregarSessao() {
    const s = localStorage.getItem('barbeariaRM_sessao');
    if (!s) return null;
    try {
        const p = JSON.parse(s);
        return (Date.now() - p.timestamp) / 86400000 > 7 ? null : p;
    } catch (e) { return null; }
}

function limparSessao() { localStorage.removeItem('barbeariaRM_sessao'); }

async function restaurarSessao() {
    const sessao = carregarSessao();
    if (!sessao) return false;
    
    try {
        const col = sessao.tipo === 'cliente' ? 'clientes' : 'barbeiros';
        const sn = await db.collection(col).where('email', '==', sessao.email).where('senha', '==', sessao.senha).get();
        if (!sn.empty) {
            const d = sn.docs[0];
            if (sessao.tipo === 'cliente') {
                clienteLogado = { id: d.id, ...d.data() };
                barbeiroLogado = null;
                document.getElementById('welcomeClienteNome').textContent = clienteLogado.nome;
                atualizarHeader();
                mostrarTela('homeClienteScreen');
            } else {
                barbeiroLogado = { id: d.id, ...d.data() };
                clienteLogado = null;
                document.getElementById('welcomeBarbeiroNome').textContent = barbeiroLogado.nome;
                atualizarHeader();
                mostrarTela('homeBarbeiroScreen');
            }
            return true;
        }
    } catch (e) {}
    limparSessao();
    localStorage.removeItem('barbeariaRM_loja');
    return false;
}

// ==========================================================
// ===== CADASTROS =====
// ==========================================================
async function cadastrarCliente() {
    const n = document.getElementById('cadNomeCliente')?.value.trim();
    const e = document.getElementById('cadEmailCliente')?.value.trim();
    const c = document.getElementById('cadCelularCliente')?.value.trim();
    const s = document.getElementById('cadSenhaCliente')?.value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    
    try {
        const sn = await db.collection('clientes').where('email', '==', e).get();
        if (!sn.empty) { mostrarToast('❌ Email já existe!', 'error'); return; }
        
        const id = Date.now().toString();
        const cl = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('clientes').doc(id).set(cl);
        clienteLogado = cl;
        barbeiroLogado = null;
        salvarSessao('cliente', cl);
        document.getElementById('welcomeClienteNome').textContent = n;
        mostrarToast('✅ Cadastro OK!', 'success');
        mostrarTela('homeClienteScreen');
    } catch (er) { mostrarToast('❌ ' + er.message, 'error'); }
}

async function cadastrarBarbeiro() {
    const n = document.getElementById('cadNomeBarbeiro')?.value.trim();
    const e = document.getElementById('cadEmailBarbeiro')?.value.trim();
    const c = document.getElementById('cadCelularBarbeiro')?.value.trim();
    const s = document.getElementById('cadSenhaBarbeiro')?.value;
    if (!n || !e || !c || !s) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    if (s.length < 6) { mostrarToast('❌ Senha 6+', 'error'); return; }
    
    try {
        const sn = await db.collection('barbeiros').where('email', '==', e).get();
        if (!sn.empty) { mostrarToast('❌ Email já existe!', 'error'); return; }
        
        const id = Date.now().toString();
        const bb = { id, nome: n, email: e, celular: c, senha: s, fotoPerfil: '', dataCriacao: new Date().toISOString() };
        await db.collection('barbeiros').doc(id).set(bb);
        barbeiroLogado = bb;
        clienteLogado = null;
        salvarSessao('barbeiro', bb);
        document.getElementById('welcomeBarbeiroNome').textContent = n;
        mostrarToast('✅ Cadastro OK!', 'success');
        mostrarTela('homeBarbeiroScreen');
    } catch (er) { mostrarToast('❌ ' + er.message, 'error'); }
}

// ==========================================================
// ===== AGENDAMENTOS =====
// ==========================================================
async function carregarAgendamentosBarbeiro() {
    const c = document.getElementById('agendamentosBarbeiroContainer');
    if (!c) return;
    
    try {
        const sn = await db.collection('agendamentos').orderBy('data', 'desc').get();
        const ag = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (ag.length === 0) {
            c.innerHTML = '<p class="empty-state">📅 Nenhum agendamento</p>';
            return;
        }
        
        c.innerHTML = ag.map(a => {
            const statusClass = { concluido: 'concluido', confirmado: 'confirmado', cancelado: 'cancelado' }[a.status] || 'pendente';
            const statusTexto = { concluido: '✅ Concluído R$' + (a.valor || '0'), confirmado: '✅ Confirmado', cancelado: '❌ Cancelado' }[a.status] || '⏳ Pendente';
            
            let botoes = '';
            if (a.status === 'pendente') {
                botoes = `<button class="btn-sm btn-sm-success" onclick="confirmarAgendamento('${a.id}')">✅</button>
                         <button class="btn-sm btn-sm-danger" onclick="cancelarAgendamento('${a.id}')">❌</button>`;
            } else if (a.status === 'confirmado') {
                botoes = `<button class="btn-sm btn-sm-primary" onclick="concluirServico('${a.id}', '${a.tipo || 'Serviço'}')">💰</button>
                         <button class="btn-sm btn-sm-danger" onclick="cancelarAgendamento('${a.id}')">❌</button>`;
            }
            
            return `<div class="agenda-item">
                <div class="agenda-info">
                    <div class="agenda-cliente">👤 ${a.clienteNome || 'Cliente'}</div>
                    <div class="agenda-data">📅 ${a.data || ''} • ⏰ ${a.horario || ''} - ${a.tipo || 'Serviço'}</div>
                </div>
                <div class="agenda-actions"><span class="agenda-status ${statusClass}">${statusTexto}</span>${botoes}</div>
            </div>`;
        }).join('');
    } catch (e) { console.error('Erro:', e); }
}

async function confirmarAgendamento(id) {
    await db.collection('agendamentos').doc(id).update({ status: 'confirmado' });
    mostrarToast('✅ Confirmado!', 'success');
    carregarAgendamentosBarbeiro();
}

async function cancelarAgendamento(id) {
    mostrarModalConfirmacao('Cancelar', 'Deseja cancelar este agendamento?', async () => {
        await db.collection('agendamentos').doc(id).update({ status: 'cancelado', motivoCancelamento: 'Cancelado' });
        mostrarToast('❌ Cancelado!', 'info');
        carregarAgendamentosBarbeiro();
    });
}

async function concluirServico(id, tipo) {
    mostrarModalValor('💰 Valor do Serviço', '35.00', async (valor) => {
        await db.collection('agendamentos').doc(id).update({
            status: 'concluido',
            valor: parseFloat(valor),
            dataConclusao: new Date().toISOString()
        });
        mostrarToast('✅ Serviço concluído! R$ ' + valor, 'success');
        carregarAgendamentosBarbeiro();
        calcularFaturamento();
    });
}

// ==========================================================
// ===== POSTS =====
// ==========================================================
async function carregarMeusPosts() {
    const c = document.getElementById('meusPostsContainer');
    if (!c || !barbeiroLogado) return;
    
    try {
        const sn = await db.collection('posts').where('barbeiroId', '==', barbeiroLogado.id).get();
        const posts = [];
        sn.forEach(d => posts.push({ id: d.id, ...d.data() }));
        posts.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        
        if (posts.length === 0) {
            c.innerHTML = '<p class="empty-state">📸 Nenhum post ainda</p>';
            return;
        }
        
        c.innerHTML = posts.map(post => `
            <div class="post-item">
                ${post.imagem ? `<img src="${post.imagem}" class="post-thumb" onerror="this.style.display='none'">` : ''}
                <div class="post-info">
                    <h4>${post.titulo}</h4>
                    <p class="post-preco">R$ ${(post.preco || 0).toFixed(2)}</p>
                    <p class="post-desc">${post.descricao || ''}</p>
                </div>
                <button class="btn-sm btn-sm-danger" onclick="excluirPost('${post.id}')">🗑</button>
            </div>
        `).join('');
    } catch (e) { console.error('Erro:', e); }
}

async function criarPost() {
    if (!barbeiroLogado) return;
    
    const titulo = document.getElementById('postTitulo')?.value.trim();
    const preco = parseFloat(document.getElementById('postPreco')?.value);
    const descricao = document.getElementById('postDescricao')?.value.trim();
    const imagem = document.getElementById('postImagem')?.value || '';
    
    if (!titulo || !preco || preco <= 0) {
        mostrarToast('❌ Título e preço obrigatórios!', 'error');
        return;
    }
    
    try {
        await db.collection('posts').doc(Date.now().toString()).set({
            id: Date.now().toString(),
            barbeiroId: barbeiroLogado.id,
            barbeiroNome: barbeiroLogado.nome,
            titulo, preco, descricao, imagem,
            likes: 0, comentarios: [],
            dataCriacao: new Date().toISOString()
        });
        
        mostrarToast('✅ Post publicado!', 'success');
        ['postTitulo', 'postPreco', 'postDescricao', 'postImagem'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        carregarMeusPosts();
        mostrarTela('homeBarbeiroScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function excluirPost(id) {
    mostrarModalConfirmacao('Excluir', 'Excluir este post?', async () => {
        await db.collection('posts').doc(id).delete();
        mostrarToast('🗑 Excluído!', 'success');
        carregarMeusPosts();
    });
}

function previewImagemPost(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = function(ev) {
        document.getElementById('postImagem').value = ev.target.result;
        document.getElementById('postImagemPreview').src = ev.target.result;
        document.getElementById('postImagemPreview').style.display = 'block';
    };
    r.readAsDataURL(f);
}

// ==========================================================
// ===== PLANOS =====
// ==========================================================
async function carregarPlanos() {
    const c = document.getElementById('planosContainer');
    if (!c) return;
    
    try {
        const sn = await db.collection('planos').orderBy('dataCriacao', 'desc').get();
        const planos = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (planos.length === 0) {
            c.innerHTML = '<p class="empty-state">👑 Nenhum plano</p>';
            return;
        }
        
        c.innerHTML = planos.map(p => `
            <div class="plano-item">
                <div>
                    <h4>${p.nome}</h4>
                    <p>📅 ${p.periodo}</p>
                    <p class="plano-preco">R$ ${(p.preco || 0).toFixed(2)}</p>
                </div>
                <button class="btn-sm btn-sm-danger" onclick="excluirPlano('${p.id}')">🗑</button>
            </div>
        `).join('');
    } catch (e) { console.error('Erro:', e); }
}

async function criarPlano() {
    if (!barbeiroLogado) return;
    
    const nome = document.getElementById('planoNome')?.value.trim();
    const periodo = document.getElementById('planoPeriodo')?.value || 'mensal';
    const preco = parseFloat(document.getElementById('planoPreco')?.value);
    
    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Nome e preço obrigatórios!', 'error');
        return;
    }
    
    try {
        await db.collection('planos').doc(Date.now().toString()).set({
            id: Date.now().toString(), barbeiroId: barbeiroLogado.id,
            nome, periodo, preco, dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Plano criado!', 'success');
        ['planoNome', 'planoPreco'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        carregarPlanos();
        mostrarTela('homeBarbeiroScreen');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function excluirPlano(id) {
    mostrarModalConfirmacao('Excluir', 'Excluir este plano?', async () => {
        await db.collection('planos').doc(id).delete();
        mostrarToast('🗑 Excluído!', 'success');
        carregarPlanos();
    });
}

// ==========================================================
// ===== FATURAMENTO =====
// ==========================================================
async function calcularFaturamento() {
    try {
        const sn = await db.collection('agendamentos').where('status', '==', 'concluido').get();
        const ag = sn.docs.map(d => d.data());
        const hoje = new Date().toISOString().split('T')[0];
        
        let totalHoje = 0, totalSemana = 0, totalMes = 0, totalAno = 0;
        const agora = new Date();
        
        ag.forEach(a => {
            const v = a.valor || 0;
            const dataAg = new Date(a.dataConclusao || a.data);
            if (a.data === hoje) totalHoje += v;
            if ((agora - dataAg) / 86400000 <= 7) totalSemana += v;
            if ((agora - dataAg) / 86400000 <= 30) totalMes += v;
            if ((agora - dataAg) / 86400000 <= 365) totalAno += v;
        });
        
        document.getElementById('faturamentoHoje').textContent = 'R$ ' + totalHoje.toFixed(2);
        document.getElementById('faturamentoSemana').textContent = 'R$ ' + totalSemana.toFixed(2);
        document.getElementById('faturamentoMes').textContent = 'R$ ' + totalMes.toFixed(2);
        document.getElementById('faturamentoAno').textContent = 'R$ ' + totalAno.toFixed(2);
    } catch (e) {}
}

// ==========================================================
// ===== LIVE =====
// ==========================================================
async function iniciarLive() {
    if (!barbeiroLogado) { mostrarToast('❌ Apenas barbeiros!', 'error'); return; }
    
    const titulo = document.getElementById('liveTitulo')?.value.trim() || '🔴 Live';
    try {
        await db.collection('lives').doc('live_atual').set({
            id: 'live_atual', barbeiroId: barbeiroLogado.id, barbeiroNome: barbeiroLogado.nome,
            titulo, ativa: true, chat: [], viewers: 0, totalViews: 0, likes: 0,
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
        document.getElementById('liveControls').style.display = 'none';
        iniciarChatListener();
        mostrarToast('🔴 Live iniciada!', 'success');
    } catch (e) { mostrarToast('❌ Erro!', 'error'); }
}

async function encerrarLive() {
    if (!barbeiroLogado) return;
    mostrarModalConfirmacao('Encerrar Live', 'Deseja encerrar a transmissão?', async () => {
        await db.collection('lives').doc('live_atual').update({ ativa: false, dataFim: new Date().toISOString() });
        liveAtiva = false;
        liveChatMessages = [];
        pararChatListener();
        document.getElementById('livePlaceholder').style.display = 'flex';
        document.getElementById('livePlayer').style.display = 'none';
        document.getElementById('liveStatus').style.display = 'none';
        document.getElementById('liveControls').style.display = 'block';
        atualizarChat();
        mostrarToast('⏹ Live encerrada!', 'info');
    });
}

async function carregarLive() {
    try {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            liveAtiva = true;
            const live = doc.data();
            document.getElementById('livePlaceholder').style.display = 'none';
            document.getElementById('livePlayer').style.display = 'block';
            document.getElementById('liveStatus').style.display = 'block';
            document.getElementById('liveStatusTitulo').textContent = live.titulo;
            document.getElementById('liveStatusBarbeiro').textContent = '👤 ' + live.barbeiroNome;
            liveChatMessages = live.chat || [];
            atualizarChat();
            if (barbeiroLogado && barbeiroLogado.id === live.barbeiroId) {
                document.getElementById('liveControls').style.display = 'none';
            }
            iniciarChatListener();
        } else {
            liveAtiva = false;
            document.getElementById('livePlaceholder').style.display = 'flex';
            document.getElementById('livePlayer').style.display = 'none';
            document.getElementById('liveStatus').style.display = 'none';
            if (barbeiroLogado) document.getElementById('liveControls').style.display = 'block';
        }
    } catch (e) { liveAtiva = false; }
}

function iniciarChatListener() {
    pararChatListener();
    liveChatInterval = setInterval(async () => {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists && doc.data().ativa) {
            const novas = doc.data().chat || [];
            if (novas.length !== liveChatMessages.length) {
                liveChatMessages = novas;
                atualizarChat();
            }
            const count = Object.keys(doc.data().viewersAtivos || {}).length;
            document.getElementById('liveViewerCount').textContent = '👥 ' + count;
        }
    }, 2000);
}

function pararChatListener() {
    if (liveChatInterval) { clearInterval(liveChatInterval); liveChatInterval = null; }
}

async function enviarMensagemLive() {
    const input = document.getElementById('liveChatInput');
    if (!input || !liveAtiva) return;
    const texto = input.value.trim();
    if (!texto) return;
    
    const autor = clienteLogado ? clienteLogado.nome : barbeiroLogado ? barbeiroLogado.nome : '👤 Visitante';
    const doc = await db.collection('lives').doc('live_atual').get();
    const chat = doc.data().chat || [];
    chat.push({ autor, texto, data: new Date().toISOString() });
    await db.collection('lives').doc('live_atual').update({ chat: chat.slice(-100) });
    liveChatMessages = chat;
    atualizarChat();
    input.value = '';
}

function atualizarChat() {
    const c = document.getElementById('liveChatContainer');
    if (!c) return;
    if (!liveChatMessages || liveChatMessages.length === 0) {
        c.innerHTML = '<p style="color:#6B7280;text-align:center;">💬 Chat vazio</p>';
        return;
    }
    c.innerHTML = liveChatMessages.map(msg => `
        <div class="chat-msg"><strong>${msg.autor}:</strong> ${msg.texto}</div>
    `).join('');
    c.scrollTop = c.scrollHeight;
}

// ==========================================================
// ===== PERFIL =====
// ==========================================================
function carregarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    document.getElementById('perfilBarbeiroNome').textContent = barbeiroLogado.nome || '';
    document.getElementById('perfilBarbeiroEmail').textContent = barbeiroLogado.email || '';
    document.getElementById('editBarbeiroNome').value = barbeiroLogado.nome || '';
    document.getElementById('editBarbeiroCelular').value = barbeiroLogado.celular || '';
}

async function salvarPerfilBarbeiro() {
    if (!barbeiroLogado) return;
    const nome = document.getElementById('editBarbeiroNome')?.value.trim();
    const celular = document.getElementById('editBarbeiroCelular')?.value.trim();
    if (!nome) { mostrarToast('❌ Nome obrigatório!', 'error'); return; }
    
    await db.collection('barbeiros').doc(barbeiroLogado.id).update({ nome, celular });
    barbeiroLogado.nome = nome;
    barbeiroLogado.celular = celular;
    salvarSessao('barbeiro', barbeiroLogado);
    mostrarToast('✅ Salvo!', 'success');
}

// ==========================================================
// ===== NAVEGAÇÃO COM BOTTOM NAV ATIVO =====
// ==========================================================
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    // Gerenciar bottom nav
    const nc = document.getElementById('bottomNavCliente');
    const nb = document.getElementById('bottomNavBarbeiro');
    const telasCliente = ['homeClienteScreen', 'agendamentoScreen', 'reelsScreen', 'liveScreen', 'perfilClienteScreen'];
    const telasBarbeiro = ['homeBarbeiroScreen', 'criarPostScreen', 'extratoScreen', 'liveScreen', 'perfilBarbeiroScreen'];
    
    if (nc) nc.style.display = telasCliente.includes(id) ? 'flex' : 'none';
    if (nb) nb.style.display = telasBarbeiro.includes(id) ? 'flex' : 'none';
    
    // Ativar item do bottom nav
    document.querySelectorAll('.nav-item-modern').forEach(item => item.classList.remove('active'));
    const navMap = {
        'homeBarbeiroScreen': 0, 'criarPostScreen': 1, 'extratoScreen': 2, 'liveScreen': 3, 'perfilBarbeiroScreen': 4,
        'homeClienteScreen': 0, 'agendamentoScreen': 1, 'reelsScreen': 2, 'perfilClienteScreen': 4
    };
    const idx = navMap[id];
    if (idx !== undefined && nb && nb.style.display === 'flex') {
        nb.children[idx]?.classList.add('active');
    }
    if (idx !== undefined && nc && nc.style.display === 'flex') {
        nc.children[idx]?.classList.add('active');
    }
    
    // Carregar dados
    if (id === 'homeBarbeiroScreen') { carregarAgendamentosBarbeiro(); carregarPlanos(); calcularFaturamento(); carregarMeusPosts(); }
    if (id === 'criarPostScreen') { /* Tela de criar post */ }
    if (id === 'extratoScreen') { calcularFaturamento(); }
    if (id === 'liveScreen') { carregarLive(); }
    if (id === 'perfilBarbeiroScreen') { carregarPerfilBarbeiro(); }
    if (id === 'homeClienteScreen') { carregarFeedCliente(); }
    if (id === 'loginScreen') { localStorage.removeItem('barbeariaRM_loja'); atualizarHeader(); carregarLojasPortal(); }
    
    window.scrollTo(0, 0);
}

async function carregarFeedCliente() {
    const c = document.getElementById('feedClienteContainer');
    if (!c) return;
    try {
        const sn = await db.collection('posts').orderBy('dataCriacao', 'desc').limit(20).get();
        const posts = sn.docs.map(d => ({ id: d.id, ...d.data() }));
        todosPosts = posts;
        if (posts.length === 0) {
            c.innerHTML = '<p class="empty-state">📸 Nenhum post</p>';
            return;
        }
        c.innerHTML = posts.map(post => `
            <div class="feed-post">
                <div class="feed-post-header">
                    <div class="feed-post-avatar">✂️</div>
                    <div>
                        <div class="feed-post-user-name">${post.barbeiroNome || 'Profissional'}</div>
                        <div class="feed-post-user-time">${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
                ${post.imagem ? `<img src="${post.imagem}" class="feed-post-image" onerror="this.style.display='none'">` : ''}
                <div class="feed-post-body">
                    <h3>${post.titulo}</h3>
                    <p class="feed-post-price">R$ ${(post.preco || 0).toFixed(2)}</p>
                    <p>${post.descricao || ''}</p>
                </div>
                <div class="feed-post-actions">
                    <button onclick="likePost('${post.id}', this)">❤️ ${post.likes || 0}</button>
                    <button>💬 ${(post.comentarios || []).length}</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error('Erro:', e); }
}

function likePost(id, btn) {
    btn.classList.toggle('liked');
    const likes = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
    btn.textContent = '❤️ ' + (btn.classList.contains('liked') ? likes + 1 : likes - 1);
}

// ==========================================================
// ===== PREVIEW LOGO LOJA =====
// ==========================================================
function previewLogoLoja(event) {
    const f = event.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = function(e) {
        document.getElementById('logoLojaPreview').src = e.target.result;
        document.getElementById('logoLojaPreview').style.display = 'block';
        document.getElementById('cadLogoLoja').value = e.target.result;
    };
    r.readAsDataURL(f);
}

async function cadastrarLoja() {
    const n = document.getElementById('cadNomeLoja')?.value.trim();
    const email = document.getElementById('cadEmailLoja')?.value.trim();
    const dono = document.getElementById('cadDonoLoja')?.value.trim();
    const senha = document.getElementById('cadSenhaLoja')?.value;
    if (!n || !email || !dono || !senha) { mostrarToast('❌ Preencha todos!', 'error'); return; }
    
    try {
        const id = Date.now().toString();
        await db.collection('lojas').doc(id).set({
            id, nome: n, slogan: document.getElementById('cadSloganLoja')?.value || '',
            categoria: document.getElementById('cadCategoriaLoja')?.value || 'outro',
            dono, email, whatsapp: document.getElementById('cadWhatsappLoja')?.value || '',
            endereco: document.getElementById('cadEnderecoLoja')?.value || '',
            logo: document.getElementById('cadLogoLoja')?.value || 'logobarbearia-rm.png',
            senha, stats: { estrelas: 5.0, cortes: 0, distancia: 0 },
            dataCriacao: new Date().toISOString()
        });
        await db.collection('barbeiros').doc(id).set({
            id, nome: dono, email, celular: document.getElementById('cadWhatsappLoja')?.value || '',
            senha, lojaId: id, lojaNome: n, fotoPerfil: document.getElementById('cadLogoLoja')?.value || '',
            dataCriacao: new Date().toISOString()
        });
        mostrarToast('✅ Loja cadastrada!', 'success');
        carregarLojasPortal();
        mostrarTela('loginScreen');
    } catch (e) { mostrarToast('❌ ' + e.message, 'error'); }
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LPX Tecnologia iniciando...');
    
    inicializarTema();
    mostrarHeaderPortal();
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('bottomNavCliente').style.display = 'none';
    document.getElementById('bottomNavBarbeiro').style.display = 'none';
    document.getElementById('loginFormsContainer').style.display = 'none';
    document.getElementById('loginFormCliente').style.display = 'none';
    document.getElementById('loginFormBarbeiro').style.display = 'none';
    
    carregarLojasPortal();
    
    restaurarSessao().then(restaurada => {
        if (!restaurada) document.getElementById('loginScreen').classList.add('active');
    });
    
    console.log('✅ Pronto!');
});
