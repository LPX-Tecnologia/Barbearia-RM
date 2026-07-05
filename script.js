/* ==========================================================
   BARBEARIA RM - SCRIPT PRINCIPAL (REFRATORADO)
   Autor: Barbearia RM
   Versão: 2.0
   ========================================================== */

// ==========================================================
// CONFIGURAÇÃO SEGURA DO FIREBASE
// (Em produção, carregue isso de um arquivo .env ou backend)
// ==========================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",
    authDomain: "barbearia-rm.firebaseapp.com",
    projectId: "barbearia-rm",
    storageBucket: "barbearia-rm.firebasestorage.app",
    messagingSenderId: "512819922057",
    appId: "1:512819922057:web:6a913791cb6435e4f63258",
    measurementId: "G-TKVLVLPBJH"
};

// ==========================================================
// CONSTANTES E CONFIGURAÇÕES GLOBAIS
// ==========================================================
const APP_CONFIG = {
    nome: 'Barbearia RM',
    slogan: 'Atitude, Estilo e Confiança',
    moeda: 'BRL',
    locale: 'pt-BR',
    sessionDuration: 30 * 24 * 60 * 60 * 1000, // 30 dias
    cacheTimeout: 5 * 60 * 1000, // 5 minutos
    maxImageWidth: 800,
    imageQuality: 0.7,
    tiposCorte: [
        'Corte Social', 'Corte Degradê', 'Corte Navalhado',
        'Corte Máquina', 'Barba', 'Barba + Corte',
        'Pintura', 'Luzes', 'Platinado', 'Selagem', 'Progressiva'
    ],
    horariosDisponiveis: gerarHorarios('09:00', '18:00', 30)
};

// ==========================================================
// UTILITÁRIOS (Utils)
// ==========================================================
const Utils = {
    // Hash simples (apenas para demonstração - use bcrypt em produção!)
    hashPassword: (senha) => {
        let hash = 0;
        for (let i = 0; i < senha.length; i++) {
            const char = senha.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },

    // Validadores
    isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isValidPassword: (senha) => senha && senha.length >= 6,
    isValidPhone: (fone) => {
        const limpo = fone.replace(/\D/g, '');
        return limpo.length >= 10 && limpo.length <= 11;
    },
    isValidPrice: (preco) => !isNaN(preco) && preco > 0,
    isValidDate: (data) => {
        const d = new Date(data);
        return d instanceof Date && !isNaN(d);
    },

    // Formatadores
    formatPhone: (valor) => {
        const limpo = valor.replace(/\D/g, '');
        if (limpo.length === 11) return `(${limpo.slice(0,2)}) ${limpo.slice(2,7)}-${limpo.slice(7)}`;
        if (limpo.length === 10) return `(${limpo.slice(0,2)}) ${limpo.slice(2,6)}-${limpo.slice(6)}`;
        return valor;
    },

    formatCurrency: (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    },

    formatDate: (data) => {
        if (!data) return 'N/A';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(data));
    },

    formatDateTime: (data) => {
        if (!data) return 'N/A';
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(new Date(data));
    },

    formatTimeAgo: (dataString) => {
        const data = new Date(dataString);
        const agora = new Date();
        const segundos = Math.floor((agora - data) / 1000);
        
        if (segundos < 60) return 'Agora mesmo';
        const minutos = Math.floor(segundos / 60);
        if (minutos < 60) return `Há ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Há ${horas}h`;
        const dias = Math.floor(horas / 24);
        if (dias < 7) return `Há ${dias} dias`;
        return Utils.formatDate(dataString);
    },

    truncateText: (texto, max = 100) => {
        if (!texto) return '';
        return texto.length > max ? texto.slice(0, max) + '...' : texto;
    },

    slugify: (texto) => {
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    },

    generateId: () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Compressão de imagem
    compressImage: (base64, larguraMax = 800) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let largura = img.width;
                let altura = img.height;
                
                if (largura > larguraMax) {
                    altura = (larguraMax / largura) * altura;
                    largura = larguraMax;
                }
                
                canvas.width = largura;
                canvas.height = altura;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, largura, altura);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = base64;
        });
    },

    // Debounce para limitar chamadas
    debounce: (func, wait = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// Função auxiliar para gerar horários
function gerarHorarios(inicio, fim, intervaloMinutos) {
    const horarios = [];
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    
    let hora = hInicio;
    let minuto = mInicio;
    
    while (hora < hFim || (hora === hFim && minuto <= mFim)) {
        const h = String(hora).padStart(2, '0');
        const m = String(minuto).padStart(2, '0');
        horarios.push(`${h}:${m}`);
        
        minuto += intervaloMinutos;
        if (minuto >= 60) {
            hora++;
            minuto -= 60;
        }
    }
    
    return horarios;
}

// ==========================================================
// SERVIÇO DO FIREBASE
// ==========================================================
const FirebaseDB = {
    db: null,
    cache: new Map(),

    inicializar() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.db.settings({ ignoreUndefinedProperties: true });
        console.log('✅ Firebase conectado');
    },

    // CRUD genérico
    async criar(colecao, dados) {
        try {
            const docRef = this.db.collection(colecao).doc(dados.id || Utils.generateId());
            const dadosCompletos = {
                ...dados,
                id: docRef.id,
                dataCriacao: dados.dataCriacao || new Date().toISOString(),
                dataAtualizacao: new Date().toISOString()
            };
            await docRef.set(dadosCompletos);
            return dadosCompletos;
        } catch (erro) {
            console.error(`Erro ao criar em ${colecao}:`, erro);
            throw erro;
        }
    },

    async atualizar(colecao, id, dados) {
        try {
            await this.db.collection(colecao).doc(id).update({
                ...dados,
                dataAtualizacao: new Date().toISOString()
            });
            return true;
        } catch (erro) {
            console.error(`Erro ao atualizar ${colecao}/${id}:`, erro);
            throw erro;
        }
    },

    async deletar(colecao, id) {
        try {
            await this.db.collection(colecao).doc(id).delete();
            return true;
        } catch (erro) {
            console.error(`Erro ao deletar ${colecao}/${id}:`, erro);
            throw erro;
        }
    },

    async buscar(colecao, id) {
        try {
            const doc = await this.db.collection(colecao).doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (erro) {
            console.error(`Erro ao buscar ${colecao}/${id}:`, erro);
            return null;
        }
    },

    async listar(colecao, ordenarPor = 'dataCriacao', direcao = 'desc', limite = 50) {
        const cacheKey = `${colecao}_${ordenarPor}_${direcao}_${limite}`;
        
        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < APP_CONFIG.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const snapshot = await this.db.collection(colecao)
                .orderBy(ordenarPor, direcao)
                .limit(limite)
                .get();

            const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Atualizar cache
            this.cache.set(cacheKey, { data: dados, timestamp: Date.now() });
            
            return dados;
        } catch (erro) {
            console.error(`Erro ao listar ${colecao}:`, erro);
            return [];
        }
    },

    async buscarPorFiltro(colecao, campo, operador, valor) {
        try {
            const snapshot = await this.db.collection(colecao)
                .where(campo, operador, valor)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (erro) {
            console.error(`Erro ao filtrar ${colecao}:`, erro);
            return [];
        }
    },

    limparCache() {
        this.cache.clear();
    }
};

// ==========================================================
// SERVIÇO DE AUTENTICAÇÃO
// ==========================================================
const AuthService = {
    usuarioAtual: null,
    tipoUsuario: null, // 'cliente' ou 'barbeiro'

    async cadastrar(dados, tipo) {
        // Validar
        if (!dados.nome || dados.nome.trim().length < 3) {
            throw new Error('Nome deve ter pelo menos 3 caracteres');
        }
        if (!Utils.isValidEmail(dados.email)) {
            throw new Error('E-mail inválido');
        }
        if (!Utils.isValidPassword(dados.senha)) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }
        if (!Utils.isValidPhone(dados.celular)) {
            throw new Error('Celular inválido');
        }

        const colecao = tipo === 'cliente' ? 'clientes' : 'barbeiros';
        
        // Verificar duplicidade
        const existentes = await FirebaseDB.buscarPorFiltro(
            colecao, 'email', '==', dados.email.toLowerCase().trim()
        );
        
        if (existentes.length > 0) {
            throw new Error('E-mail já cadastrado');
        }

        // Criar usuário
        const novoUsuario = await FirebaseDB.criar(colecao, {
            nome: dados.nome.trim(),
            email: dados.email.toLowerCase().trim(),
            celular: dados.celular.replace(/\D/g, ''),
            senha: Utils.hashPassword(dados.senha),
            fotoPerfil: '',
            ultimoAcesso: new Date().toISOString()
        });

        // Login automático
        await this.login(dados.email, dados.senha, tipo);
        
        return novoUsuario;
    },

    async login(email, senha, tipo) {
        const colecao = tipo === 'cliente' ? 'clientes' : 'barbeiros';
        const hashSenha = Utils.hashPassword(senha);
        
        const usuarios = await FirebaseDB.buscarPorFiltro(
            colecao, 'email', '==', email.toLowerCase().trim()
        );

        if (usuarios.length === 0 || usuarios[0].senha !== hashSenha) {
            throw new Error('E-mail ou senha inválidos');
        }

        const usuario = usuarios[0];
        
        // Atualizar último acesso
        await FirebaseDB.atualizar(colecao, usuario.id, {
            ultimoAcesso: new Date().toISOString()
        });

        this.usuarioAtual = usuario;
        this.tipoUsuario = tipo;
        this.salvarSessao();

        return usuario;
    },

    salvarSessao() {
        const sessao = {
            usuario: this.usuarioAtual,
            tipo: this.tipoUsuario,
            timestamp: Date.now()
        };
        localStorage.setItem('barbearia_session', btoa(JSON.stringify(sessao)));
    },

    carregarSessao() {
        try {
            const dados = localStorage.getItem('barbearia_session');
            if (!dados) return false;
            
            const sessao = JSON.parse(atob(dados));
            
            if (Date.now() - sessao.timestamp > APP_CONFIG.sessionDuration) {
                this.logout();
                return false;
            }
            
            this.usuarioAtual = sessao.usuario;
            this.tipoUsuario = sessao.tipo;
            return true;
        } catch (erro) {
            this.logout();
            return false;
        }
    },

    async restaurarSessao() {
        if (!this.carregarSessao()) return false;
        
        // Verificar se usuário ainda existe no banco
        const colecao = this.tipoUsuario === 'cliente' ? 'clientes' : 'barbeiros';
        const usuario = await FirebaseDB.buscar(colecao, this.usuarioAtual.id);
        
        if (!usuario) {
            this.logout();
            return false;
        }
        
        this.usuarioAtual = usuario;
        return true;
    },

    logout() {
        this.usuarioAtual = null;
        this.tipoUsuario = null;
        localStorage.removeItem('barbearia_session');
    },

    isAuthenticated() {
        return this.usuarioAtual !== null;
    },

    isCliente() {
        return this.tipoUsuario === 'cliente';
    },

    isBarbeiro() {
        return this.tipoUsuario === 'barbeiro';
    }
};

// ==========================================================
// GERENCIADOR DE UI (Telas e Navegação)
// ==========================================================
const UIManager = {
    telaAtual: null,

    // Cache de elementos DOM
    elementos: {},

    init() {
        // Cache de elementos frequentemente usados
        this.elementos = {
            screens: document.querySelectorAll('.screen'),
            bottomNavCliente: document.getElementById('bottomNavCliente'),
            bottomNavBarbeiro: document.getElementById('bottomNavBarbeiro'),
            toast: document.getElementById('toast'),
            modalComentario: document.getElementById('modalComentario')
        };
    },

    navegarPara(nomeTela) {
        // Esconder todas as telas
        this.elementos.screens.forEach(tela => tela.classList.remove('active'));
        
        // Mostrar tela alvo
        const tela = document.getElementById(nomeTela + 'Screen') || 
                     document.getElementById(nomeTela);
        
        if (tela) {
            tela.classList.add('active');
            this.telaAtual = nomeTela;
            
            // Atualizar navegação inferior
            this.atualizarBottomNav();
            
            // Carregar dados da tela
            ScreenLoader.carregar(nomeTela);
        }
        
        window.scrollTo(0, 0);
    },

    atualizarBottomNav() {
        if (!AuthService.isAuthenticated()) {
            if (this.elementos.bottomNavCliente) this.elementos.bottomNavCliente.style.display = 'none';
            if (this.elementos.bottomNavBarbeiro) this.elementos.bottomNavBarbeiro.style.display = 'none';
            return;
        }

        if (AuthService.isCliente()) {
            if (this.elementos.bottomNavCliente) this.elementos.bottomNavCliente.style.display = 'flex';
            if (this.elementos.bottomNavBarbeiro) this.elementos.bottomNavBarbeiro.style.display = 'none';
        } else {
            if (this.elementos.bottomNavCliente) this.elementos.bottomNavCliente.style.display = 'none';
            if (this.elementos.bottomNavBarbeiro) this.elementos.bottomNavBarbeiro.style.display = 'flex';
        }
    },

    mostrarToast(mensagem, tipo = 'info') {
        const toast = this.elementos.toast;
        if (!toast) return;
        
        toast.textContent = mensagem;
        toast.className = `toast ${tipo}`;
        toast.style.display = 'block';
        
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    },

    mostrarLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Carregando...</p>
                </div>
            `;
        }
    },

    mostrarVazio(containerId, mensagem = 'Nenhum item encontrado') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>${mensagem}</p>
                </div>
            `;
        }
    },

    mostrarErro(containerId, mensagem = 'Erro ao carregar') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>${mensagem}</p>
                    <button class="btn btn-small btn-outline" onclick="location.reload()">
                        🔄 Tentar novamente
                    </button>
                </div>
            `;
        }
    }
};

// ==========================================================
// CARREGADOR DE TELAS
// ==========================================================
const ScreenLoader = {
    async carregar(nomeTela) {
        switch(nomeTela) {
            case 'homeCliente':
                await this.carregarHomeCliente();
                break;
            case 'homeBarbeiro':
                await this.carregarHomeBarbeiro();
                break;
            case 'agendamento':
                this.carregarAgendamento();
                break;
            case 'anuncios':
                await this.carregarAnuncios();
                break;
            case 'live':
                await LiveManager.carregar();
                break;
            case 'perfilCliente':
                this.carregarPerfilCliente();
                break;
            case 'perfilBarbeiro':
                this.carregarPerfilBarbeiro();
                break;
            case 'galeriaCortes':
                await this.carregarGaleria();
                break;
            case 'reels':
                await this.carregarReels();
                break;
            case 'horariosTrabalho':
                await this.carregarHorarios();
                break;
        }
    },

    async carregarHomeCliente() {
        if (!AuthService.isAuthenticated()) return;
        
        // Atualizar nome
        const nomeEl = document.getElementById('welcomeClienteNome');
        if (nomeEl) nomeEl.textContent = AuthService.usuarioAtual.nome;
        
        // Carregar feed
        UIManager.mostrarLoading('feedClienteContainer');
        
        try {
            const posts = await PostService.listar();
            
            if (posts.length === 0) {
                UIManager.mostrarVazio('feedClienteContainer', 'Nenhum post ainda');
            } else {
                const html = posts.map(post => PostService.renderizarCard(post)).join('');
                document.getElementById('feedClienteContainer').innerHTML = html;
            }
        } catch (erro) {
            UIManager.mostrarErro('feedClienteContainer');
        }
        
        // Carregar agendamentos
        await AgendamentoService.carregarAgendaCliente();
    },

    async carregarHomeBarbeiro() {
        if (!AuthService.isAuthenticated()) return;
        
        // Atualizar nome
        const nomeEl = document.getElementById('welcomeBarbeiroNome');
        if (nomeEl) nomeEl.textContent = AuthService.usuarioAtual.nome;
        
        // Carregar dados
        await Promise.all([
            AgendamentoService.carregarAgendamentosBarbeiro(),
            PlanoService.carregarPlanos(),
            PostService.carregarMeusPosts(),
            FinanceiroService.calcularFaturamento()
        ]);
    },

    carregarAgendamento() {
        // Popular horários
        const selectHorario = document.getElementById('agendamentoHorario');
        if (selectHorario) {
            selectHorario.innerHTML = APP_CONFIG.horariosDisponiveis
                .map(h => `<option value="${h}">${h}</option>`)
                .join('');
        }
        
        // Popular tipos de corte
        const selectTipo = document.getElementById('agendamentoTipo');
        if (selectTipo) {
            selectTipo.innerHTML = APP_CONFIG.tiposCorte
                .map(t => `<option value="${t}">${t}</option>`)
                .join('');
        }
        
        // Setar data mínima como hoje
        const inputData = document.getElementById('agendamentoData');
        if (inputData) {
            inputData.min = new Date().toISOString().split('T')[0];
        }
    },

    async carregarAnuncios() {
        UIManager.mostrarLoading('anunciosContainer');
        
        try {
            const hoje = new Date().toISOString();
            const anuncios = await FirebaseDB.listar('anuncios');
            
            const ativos = anuncios.filter(a => a.dataExpiracao > hoje);
            
            if (ativos.length === 0) {
                UIManager.mostrarVazio('anunciosContainer', 'Nenhum anúncio ativo');
            } else {
                const html = ativos.map(anuncio => `
                    <div class="card anuncio-card">
                        <span class="badge badge-anuncio">📢 ANÚNCIO</span>
                        ${anuncio.imagem ? `
                            <img src="${anuncio.imagem}" alt="${anuncio.titulo}" 
                                 class="anuncio-imagem" loading="lazy">
                        ` : ''}
                        <h3 class="anuncio-titulo">${anuncio.titulo}</h3>
                        <p class="anuncio-descricao">${anuncio.descricao}</p>
                        ${anuncio.link ? `
                            <a href="${anuncio.link}" target="_blank" rel="noopener" 
                               class="btn btn-small btn-anuncio">
                                🔗 Saiba Mais
                            </a>
                        ` : ''}
                        ${AuthService.isBarbeiro() ? `
                            <button class="btn btn-small btn-danger" 
                                    onclick="AnuncioService.excluir('${anuncio.id}')">
                                🗑 Excluir
                            </button>
                        ` : ''}
                    </div>
                `).join('');
                
                document.getElementById('anunciosContainer').innerHTML = html;
            }
        } catch (erro) {
            UIManager.mostrarErro('anunciosContainer');
        }
    },

    carregarPerfilCliente() {
        if (!AuthService.isAuthenticated()) return;
        
        const user = AuthService.usuarioAtual;
        document.getElementById('perfilClienteNome').textContent = user.nome;
        document.getElementById('perfilClienteEmail').textContent = user.email;
        document.getElementById('editClienteNome').value = user.nome || '';
        document.getElementById('editClienteCelular').value = user.celular || '';
        
        // Atualizar avatar
        const avatar = document.getElementById('perfilClienteAvatar');
        if (avatar && user.fotoPerfil) {
            avatar.querySelector('img').src = user.fotoPerfil;
        }
    },

    carregarPerfilBarbeiro() {
        if (!AuthService.isAuthenticated()) return;
        
        const user = AuthService.usuarioAtual;
        document.getElementById('perfilBarbeiroNome').textContent = user.nome;
        document.getElementById('perfilBarbeiroEmail').textContent = user.email;
        document.getElementById('editBarbeiroNome').value = user.nome || '';
        document.getElementById('editBarbeiroCelular').value = user.celular || '';
        document.getElementById('editBarbeiroEmail').value = user.email || '';
        
        // Atualizar avatar
        const avatar = document.getElementById('perfilBarbeiroAvatar');
        if (avatar && user.fotoPerfil) {
            avatar.querySelector('img').src = user.fotoPerfil;
        }
    },

    async carregarGaleria() {
        UIManager.mostrarLoading('galeriaContainer');
        
        try {
            const posts = await PostService.listar();
            
            if (posts.length === 0) {
                UIManager.mostrarVazio('galeriaContainer', 'Nenhum corte na galeria');
            } else {
                const html = posts.map(post => `
                    <div class="galeria-item" onclick="PostService.verDetalhe('${post.id}')">
                        ${post.imagem ? 
                            `<img src="${post.imagem}" alt="${post.titulo}" loading="lazy">` :
                            `<div class="galeria-placeholder">✂️</div>`
                        }
                        <div class="galeria-info">
                            <h4>${post.titulo}</h4>
                            <span class="preco">${Utils.formatCurrency(post.preco)}</span>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('galeriaContainer').innerHTML = html;
            }
        } catch (erro) {
            UIManager.mostrarErro('galeriaContainer');
        }
    },

    async carregarReels() {
        UIManager.mostrarLoading('reelsContainer');
        
        try {
            const posts = await PostService.listar();
            
            if (posts.length === 0) {
                UIManager.mostrarVazio('reelsContainer', 'Nenhum reel disponível');
            } else {
                window.reelsData = posts;
                window.reelsIndex = 0;
                ReelsManager.exibir(0);
            }
        } catch (erro) {
            UIManager.mostrarErro('reelsContainer');
        }
    },

    async carregarHorarios() {
        if (!AuthService.isBarbeiro()) return;
        
        const config = await FirebaseDB.buscar('configuracoes', 'horarios_' + AuthService.usuarioAtual.id);
        
        if (config) {
            // Popular checkboxes de dias
            const dias = config.diasTrabalho || [];
            ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'].forEach(dia => {
                const cb = document.getElementById('dia' + dia);
                if (cb) cb.checked = dias.includes(dia.toLowerCase());
            });
            
            document.getElementById('horarioInicio').value = config.horarioInicio || '09:00';
            document.getElementById('horarioFim').value = config.horarioFim || '18:00';
            document.getElementById('intervaloCortes').value = config.intervaloCortes || '30';
        }
    }
};

// ==========================================================
// SERVIÇO DE POSTS
// ==========================================================
const PostService = {
    async criar(dados) {
        if (!AuthService.isBarbeiro()) throw new Error('Apenas barbeiros podem postar');
        
        const { titulo, preco, descricao, imagem, video } = dados;
        
        if (!titulo || titulo.trim().length < 3) {
            throw new Error('Título deve ter pelo menos 3 caracteres');
        }
        if (!Utils.isValidPrice(preco)) {
            throw new Error('Preço inválido');
        }
        
        // Comprimir imagem se existir
        let imagemFinal = imagem;
        if (imagem && imagem.startsWith('data:image')) {
            imagemFinal = await Utils.compressImage(imagem);
        }
        
        const post = await FirebaseDB.criar('posts', {
            barbeiroId: AuthService.usuarioAtual.id,
            barbeiroNome: AuthService.usuarioAtual.nome,
            titulo: titulo.trim(),
            preco: Number(preco),
            descricao: descricao?.trim() || '',
            imagem: imagemFinal,
            video: video || '',
            likes: 0,
            likedBy: [],
            comentarios: []
        });
        
        FirebaseDB.limparCache();
        return post;
    },

    async listar(limite = 20) {
        return await FirebaseDB.listar('posts', 'dataCriacao', 'desc', limite);
    },

    async listarPorBarbeiro(barbeiroId) {
        return await FirebaseDB.buscarPorFiltro('posts', 'barbeiroId', '==', barbeiroId);
    },

    async curtir(postId) {
        if (!AuthService.isAuthenticated()) {
            throw new Error('Faça login para curtir');
        }
        
        const userId = AuthService.usuarioAtual.id;
        const postRef = FirebaseDB.db.collection('posts').doc(postId);
        
        await FirebaseDB.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(postRef);
            if (!doc.exists) throw new Error('Post não encontrado');
            
            const data = doc.data();
            const likedBy = data.likedBy || [];
            
            if (likedBy.includes(userId)) {
                transaction.update(postRef, {
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
                });
                return false; // descurtiu
            } else {
                transaction.update(postRef, {
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(userId)
                });
                return true; // curtiu
            }
        });
        
        FirebaseDB.limparCache();
    },

    async comentar(postId, texto) {
        if (!AuthService.isAuthenticated()) throw new Error('Faça login para comentar');
        if (!texto || texto.trim().length === 0) throw new Error('Comentário vazio');
        
        const comentario = {
            autor: AuthService.usuarioAtual.nome,
            autorId: AuthService.usuarioAtual.id,
            texto: texto.trim(),
            data: new Date().toISOString()
        };
        
        await FirebaseDB.db.collection('posts').doc(postId).update({
            comentarios: firebase.firestore.FieldValue.arrayUnion(comentario)
        });
        
        return comentario;
    },

    async excluir(postId) {
        await FirebaseDB.deletar('posts', postId);
        FirebaseDB.limparCache();
    },

    async carregarMeusPosts() {
        if (!AuthService.isBarbeiro()) return;
        
        const container = document.getElementById('meusPostsContainer');
        if (!container) return;
        
        UIManager.mostrarLoading('meusPostsContainer');
        
        try {
            const posts = await this.listarPorBarbeiro(AuthService.usuarioAtual.id);
            
            if (posts.length === 0) {
                UIManager.mostrarVazio('meusPostsContainer', 'Você ainda não publicou');
            } else {
                container.innerHTML = posts.map(post => `
                    <div class="meu-post">
                        <div class="post-header">
                            <h4>${post.titulo}</h4>
                            <span class="preco">${Utils.formatCurrency(post.preco)}</span>
                        </div>
                        ${post.imagem ? `<img src="${post.imagem}" alt="${post.titulo}">` : ''}
                        <div class="post-stats">
                            ❤️ ${post.likes || 0} • 💬 ${post.comentarios?.length || 0}
                        </div>
                        <button class="btn btn-small btn-danger" 
                                onclick="PostService.excluir('${post.id}')">
                            🗑 Excluir
                        </button>
                    </div>
                `).join('');
            }
        } catch (erro) {
            UIManager.mostrarErro('meusPostsContainer');
        }
    },

    verDetalhe(postId) {
        // Implementar visualização detalhada
        console.log('Ver detalhe:', postId);
    },

    renderizarCard(post) {
        const isLiked = AuthService.isAuthenticated() && 
                       post.likedBy?.includes(AuthService.usuarioAtual.id);
        
        return `
            <article class="feed-post" data-id="${post.id}">
                <header class="feed-post-header">
                    <div class="avatar">✂️</div>
                    <div class="user-info">
                        <strong>${post.barbeiroNome || 'Barbearia RM'}</strong>
                        <time>${Utils.formatTimeAgo(post.dataCriacao)}</time>
                    </div>
                </header>
                
                ${post.imagem ? `
                    <img src="${post.imagem}" alt="${post.titulo}" class="post-imagem" loading="lazy">
                ` : ''}
                
                ${post.video ? `
                    <video controls preload="metadata" class="post-video">
                        <source src="${post.video}" type="video/mp4">
                    </video>
                ` : ''}
                
                <div class="feed-post-body">
                    <h3>${post.titulo}</h3>
                    <p class="preco">${Utils.formatCurrency(post.preco)}</p>
                    ${post.descricao ? `<p class="descricao">${Utils.truncateText(post.descricao)}</p>` : ''}
                </div>
                
                <footer class="feed-post-actions">
                    <button class="btn-like ${isLiked ? 'active' : ''}" 
                            onclick="PostService.curtir('${post.id}')">
                        ❤️ <span>${post.likes || 0}</span>
                    </button>
                    <button onclick="ComentarioService.abrir('${post.id}')">
                        💬 <span>${post.comentarios?.length || 0}</span>
                    </button>
                </footer>
            </article>
        `;
    }
};

// ==========================================================
// SERVIÇO DE AGENDAMENTOS
// ==========================================================
const AgendamentoService = {
    async criar(dados) {
        if (!AuthService.isCliente()) throw new Error('Apenas clientes podem agendar');
        
        const { data, horario, tipo } = dados;
        
        if (!Utils.isValidDate(data)) throw new Error('Data inválida');
        if (!horario) throw new Error('Horário inválido');
        if (!tipo) throw new Error('Tipo de corte inválido');
        
        const agendamento = await FirebaseDB.criar('agendamentos', {
            clienteId: AuthService.usuarioAtual.id,
            clienteNome: AuthService.usuarioAtual.nome,
            clienteEmail: AuthService.usuarioAtual.email,
            data,
            horario,
            tipo,
            status: 'pendente'
        });
        
        return agendamento;
    },

    async confirmar(id) {
        await FirebaseDB.atualizar('agendamentos', id, { status: 'confirmado' });
    },

    async cancelar(id) {
        await FirebaseDB.atualizar('agendamentos', id, { status: 'cancelado' });
    },

    async carregarAgendaCliente() {
        if (!AuthService.isCliente()) return;
        
        const container = document.getElementById('agendaClienteContainer');
        if (!container) return;
        
        try {
            const agendamentos = await FirebaseDB.buscarPorFiltro(
                'agendamentos', 'clienteId', '==', AuthService.usuarioAtual.id
            );
            
            if (agendamentos.length === 0) {
                UIManager.mostrarVazio('agendaClienteContainer', 'Nenhum agendamento');
                return;
            }
            
            agendamentos.sort((a, b) => new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario));
            
            container.innerHTML = agendamentos.map(a => `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <strong>${a.tipo}</strong>
                        <span>📅 ${Utils.formatDate(a.data)} • ⏰ ${a.horario}</span>
                    </div>
                    <span class="badge badge-${a.status}">
                        ${a.status === 'confirmado' ? '✅' : a.status === 'cancelado' ? '❌' : '⏳'}
                        ${a.status}
                    </span>
                </div>
            `).join('');
        } catch (erro) {
            UIManager.mostrarErro('agendaClienteContainer');
        }
    },

    async carregarAgendamentosBarbeiro() {
        if (!AuthService.isBarbeiro()) return;
        
        const container = document.getElementById('agendamentosBarbeiroContainer');
        if (!container) return;
        
        try {
            const agendamentos = await FirebaseDB.listar('agendamentos');
            
            if (agendamentos.length === 0) {
                UIManager.mostrarVazio('agendamentosBarbeiroContainer', 'Nenhum agendamento');
                return;
            }
            
            container.innerHTML = agendamentos.map(a => `
                <div class="agenda-item">
                    <div class="agenda-info">
                        <strong>👤 ${a.clienteNome || 'Cliente'}</strong>
                        <span>📅 ${Utils.formatDate(a.data)} • ⏰ ${a.horario}</span>
                        <span>✂️ ${a.tipo}</span>
                    </div>
                    <span class="badge badge-${a.status}">
                        ${a.status === 'confirmado' ? '✅' : a.status === 'cancelado' ? '❌' : '⏳'}
                        ${a.status}
                    </span>
                    ${a.status === 'pendente' ? `
                        <div class="btn-group">
                            <button class="btn btn-small btn-success" 
                                    onclick="AgendamentoService.confirmar('${a.id}')">
                                ✅
                            </button>
                            <button class="btn btn-small btn-danger" 
                                    onclick="AgendamentoService.cancelar('${a.id}')">
                                ❌
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (erro) {
            UIManager.mostrarErro('agendamentosBarbeiroContainer');
        }
    }
};

// ==========================================================
// SERVIÇO FINANCEIRO
// ==========================================================
const FinanceiroService = {
    async calcularFaturamento() {
        if (!AuthService.isBarbeiro()) return;
        
        try {
            const hoje = new Date();
            const hojeStr = hoje.toISOString().split('T')[0];
            
            const agendamentos = await FirebaseDB.buscarPorFiltro(
                'agendamentos', 'status', '==', 'confirmado'
            );
            
            let totalHoje = 0;
            let totalSemana = 0;
            let totalMes = 0;
            let totalAno = 0;
            
            agendamentos.forEach(a => {
                const valor = 35; // Valor base - idealmente viria do banco
                const dataAgendamento = new Date(a.data);
                
                if (a.data === hojeStr) totalHoje += valor;
                
                // Calcular semana
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                if (dataAgendamento >= inicioSemana) totalSemana += valor;
                
                // Calcular mês
                if (dataAgendamento.getMonth() === hoje.getMonth() && 
                    dataAgendamento.getFullYear() === hoje.getFullYear()) {
                    totalMes += valor;
                }
                
                // Calcular ano
                if (dataAgendamento.getFullYear() === hoje.getFullYear()) {
                    totalAno += valor;
                }
            });
            
            document.getElementById('faturamentoHoje').textContent = Utils.formatCurrency(totalHoje);
            document.getElementById('faturamentoSemana').textContent = Utils.formatCurrency(totalSemana);
            document.getElementById('faturamentoMes').textContent = Utils.formatCurrency(totalMes);
            document.getElementById('faturamentoAno').textContent = Utils.formatCurrency(totalAno);
            
        } catch (erro) {
            console.error('Erro ao calcular faturamento:', erro);
        }
    }
};

// ==========================================================
// GERENCIADOR DE LIVE
// ==========================================================
const LiveManager = {
    ativa: false,
    stream: null,
    viewerId: null,
    chatInterval: null,
    frameInterval: null,

    async carregar() {
        try {
            const doc = await FirebaseDB.db.collection('lives').doc('live_atual').get();
            
            if (doc.exists && doc.data().ativa) {
                this.ativa = true;
                this.mostrarPlayer();
                this.iniciarChatListener();
                
                if (AuthService.isAuthenticated()) {
                    this.adicionarViewer();
                }
            } else {
                this.ativa = false;
                this.mostrarPlaceholder();
            }
        } catch (erro) {
            console.error('Erro ao carregar live:', erro);
            this.mostrarPlaceholder();
        }
    },

    mostrarPlayer() {
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('livePlayer').style.display = 'block';
        document.getElementById('liveStatus').style.display = 'block';
        
        if (AuthService.isBarbeiro()) {
            document.getElementById('liveControls').style.display = 'block';
        }
    },

    mostrarPlaceholder() {
        document.getElementById('livePlaceholder').style.display = 'flex';
        document.getElementById('livePlayer').style.display = 'none';
        document.getElementById('liveStatus').style.display = 'none';
        document.getElementById('liveControls').style.display = 'none';
    },

    async iniciar() {
        if (!AuthService.isBarbeiro()) {
            UIManager.mostrarToast('Apenas barbeiros podem iniciar live', 'error');
            return;
        }
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
                audio: true
            });
            
            const videoEl = document.getElementById('liveVideo');
            videoEl.srcObject = this.stream;
            videoEl.style.display = 'block';
            
            // Criar live no banco
            const titulo = document.getElementById('liveTitulo').value || 'Live da Barbearia RM';
            
            await FirebaseDB.db.collection('lives').doc('live_atual').set({
                id: 'live_atual',
                barbeiroId: AuthService.usuarioAtual.id,
                barbeiroNome: AuthService.usuarioAtual.nome,
                titulo,
                ativa: true,
                chat: [],
                viewers: 0,
                likes: 0,
                dataInicio: new Date().toISOString()
            });
            
            this.ativa = true;
            this.mostrarPlayer();
            UIManager.mostrarToast('🔴 Live iniciada!', 'success');
            
        } catch (erro) {
            console.error('Erro ao iniciar live:', erro);
            UIManager.mostrarToast('Erro ao acessar câmera', 'error');
        }
    },

    async encerrar() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.chatInterval) clearInterval(this.chatInterval);
        if (this.frameInterval) clearInterval(this.frameInterval);
        
        await FirebaseDB.db.collection('lives').doc('live_atual').update({
            ativa: false,
            dataFim: new Date().toISOString()
        });
        
        this.ativa = false;
        this.mostrarPlaceholder();
        UIManager.mostrarToast('Live encerrada', 'info');
    },

    iniciarChatListener() {
        this.chatInterval = setInterval(async () => {
            const doc = await FirebaseDB.db.collection('lives').doc('live_atual').get();
            if (doc.exists && doc.data().ativa) {
                this.atualizarChat(doc.data().chat || []);
            }
        }, 2000);
    },

    atualizarChat(mensagens) {
        const container = document.getElementById('liveChatContainer');
        if (!container) return;
        
        container.innerHTML = mensagens.map(msg => `
            <div class="chat-message">
                <strong>${msg.autor}</strong>
                <span>${msg.texto}</span>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    },

    async enviarMensagem(texto) {
        if (!this.ativa) return;
        
        const autor = AuthService.isAuthenticated() ? 
            AuthService.usuarioAtual.nome : 'Visitante';
        
        await FirebaseDB.db.collection('lives').doc('live_atual').update({
            chat: firebase.firestore.FieldValue.arrayUnion({
                autor,
                texto,
                data: new Date().toISOString()
            })
        });
    },

    adicionarViewer() {
        // Implementar contagem de viewers
    }
};

// ==========================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================
async function iniciarApp() {
    console.log('🚀 Iniciando Barbearia RM...');
    
    // Inicializar Firebase
    FirebaseDB.inicializar();
    
    // Inicializar UI
    UIManager.init();
    
    // Tentar restaurar sessão
    const sessaoRestaurada = await AuthService.restaurarSessao();
    
    if (sessaoRestaurada) {
        console.log('✅ Sessão restaurada:', AuthService.usuarioAtual.nome);
        UIManager.navegarPara(AuthService.isCliente() ? 'homeCliente' : 'homeBarbeiro');
    } else {
        console.log('👋 Nenhuma sessão ativa');
        UIManager.navegarPara('login');
    }
}

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', iniciarApp);

// Limpar recursos ao sair
window.addEventListener('beforeunload', () => {
    if (LiveManager.ativa) {
        LiveManager.encerrar();
    }
});

console.log('✅ Script carregado com sucesso!');
