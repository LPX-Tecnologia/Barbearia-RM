// ==========================================================
// ===== EDIÇÃO DE PLANOS =====
// ==========================================================

function editarPlano(planoId) {
    if (!barbeiroLogado) return;
    
    db.collection('planos').doc(planoId).get()
        .then(function(doc) {
            if (doc.exists) {
                var plano = doc.data();
                document.getElementById('editPlanoId').value = planoId;
                document.getElementById('editPlanoNome').value = plano.nome;
                document.getElementById('editPlanoPeriodo').value = plano.periodo;
                document.getElementById('editPlanoPreco').value = plano.preco;
                document.getElementById('editPlanoDescricao').value = plano.descricao || '';
                mostrarTela('editarPlanoScreen');
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar plano:', error);
            mostrarToast('Erro ao carregar plano!', 'error');
        });
}

async function salvarEdicaoPlano() {
    if (!barbeiroLogado) return;
    
    var planoId = document.getElementById('editPlanoId').value;
    var nome = document.getElementById('editPlanoNome').value.trim();
    var periodo = document.getElementById('editPlanoPeriodo').value;
    var preco = parseFloat(document.getElementById('editPlanoPreco').value);
    var descricao = document.getElementById('editPlanoDescricao').value.trim();
    
    if (!nome || !preco || preco <= 0) {
        mostrarToast('❌ Preencha todos os campos!', 'error');
        return;
    }
    
    try {
        await db.collection('planos').doc(planoId).update({
            nome: nome,
            periodo: periodo,
            preco: preco,
            descricao: descricao
        });
        
        mostrarToast('✅ Plano atualizado!', 'success');
        carregarPlanos();
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro ao atualizar plano:', error);
        mostrarToast('Erro ao atualizar!', 'error');
    }
}

async function excluirPlano() {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    var planoId = document.getElementById('editPlanoId').value;
    
    try {
        await db.collection('planos').doc(planoId).delete();
        mostrarToast('🗑 Plano excluído!', 'success');
        carregarPlanos();
        mostrarTela('homeBarbeiroScreen');
    } catch (error) {
        console.error('❌ Erro ao excluir plano:', error);
        mostrarToast('Erro ao excluir!', 'error');
    }
}

// Atualizar a função carregarPlanos para incluir botões de edição
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
                        <div class="plano-actions">
                            <button class="btn btn-small btn-primary" onclick="editarPlano('${p.id}')">✏️ Editar</button>
                            <button class="btn btn-small btn-danger" onclick="excluirPlanoDireto('${p.id}')">🗑 Excluir</button>
                        </div>
                    </div>
                    <div class="plano-preco">R$ ${p.preco.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
    }
}

async function excluirPlanoDireto(planoId) {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
        await db.collection('planos').doc(planoId).delete();
        mostrarToast('🗑 Plano excluído!', 'success');
        carregarPlanos();
    } catch (error) {
        console.error('❌ Erro ao excluir plano:', error);
        mostrarToast('Erro ao excluir!', 'error');
    }
}

// ==========================================================
// ===== GALERIA DE CORTES =====
// ==========================================================

var todosPosts = [];

async function carregarGaleria() {
    var container = document.getElementById('galeriaContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        todosPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filtrarGaleria();
    } catch (error) {
        console.error('❌ Erro ao carregar galeria:', error);
        container.innerHTML = '<p style="color:#6B7280; text-align:center;">Erro ao carregar galeria</p>';
    }
}

function filtrarGaleria() {
    var categoria = document.getElementById('filtroCategoria').value;
    var container = document.getElementById('galeriaContainer');
    
    var postsFiltrados = categoria === 'todos' 
        ? todosPosts 
        : todosPosts.filter(function(p) { return p.titulo === categoria; });
    
    if (postsFiltrados.length === 0) {
        container.innerHTML = '<p style="color:#6B7280; text-align:center; grid-column: 1/-1;">Nenhum corte encontrado</p>';
        return;
    }
    
    var servicoIcones = {
        'Corte Social': '💇',
        'Corte Degradê': '✂️',
        'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡',
        'Barba': '🧔',
        'Barba + Corte': '✨',
        'Pintura': '🎨',
        'Luzes': '💡',
        'Platinado': '⭐',
        'Selagem': '💧',
        'Progressiva': '🌟'
    };
    
    container.innerHTML = postsFiltrados.map(function(post) {
        var icone = servicoIcones[post.titulo] || '✂️';
        return `
            <div class="galeria-item" onclick="verDetalheCorte('${post.id}')">
                ${post.imagem ? 
                    `<img src="${post.imagem}" class="galeria-item-image" alt="${post.titulo}">` :
                    `<div class="galeria-item-image">${icone}</div>`
                }
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
    
    var servicoIcones = {
        'Corte Social': '💇',
        'Corte Degradê': '✂️',
        'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡',
        'Barba': '🧔',
        'Barba + Corte': '✨',
        'Pintura': '🎨',
        'Luzes': '💡',
        'Platinado': '⭐',
        'Selagem': '💧',
        'Progressiva': '🌟'
    };
    var icone = servicoIcones[post.titulo] || '✂️';
    
    var conteudo = document.getElementById('detalhePostConteudo');
    conteudo.innerHTML = `
        <div class="card">
            <h3>${icone} ${post.titulo}</h3>
            ${post.imagem ? `<img src="${post.imagem}" style="width:100%; max-height:300px; object-fit:cover; border-radius:12px; margin:10px 0;">` : ''}
            ${post.video ? `<video controls style="width:100%; border-radius:12px; margin:10px 0;"><source src="${post.video}" type="video/mp4"></video>` : ''}
            <p style="font-size:24px; color:var(--primary); font-weight:700;">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</p>
            <p style="color:#B0B0B0;">${post.descricao || ''}</p>
            <button class="btn btn-primary" onclick="agendarPorPost('${post.id}')">✂️ AGENDAR ESTE CORTE</button>
            <button class="btn btn-outline" onclick="mostrarTela('galeriaCortesScreen')">← Voltar</button>
        </div>
    `;
    mostrarTela('detalhePostScreen');
}

// ==========================================================
// ===== HORÁRIOS DE TRABALHO =====
// ==========================================================

var horariosTrabalho = {
    diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    horarioInicio: '09:00',
    horarioFim: '18:00',
    intervaloCortes: 30,
    folgas: []
};

async function carregarHorarios() {
    if (!barbeiroLogado) return;
    
    try {
        const doc = await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).get();
        
        if (doc.exists) {
            horariosTrabalho = doc.data();
        }
        
        // Atualizar checkboxes
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
        console.error('❌ Erro ao carregar horários:', error);
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
        var data = new Date(folga);
        return `
            <div class="folga-item">
                <span>🏖️ ${data.toLocaleDateString('pt-BR')}</span>
                <button onclick="removerFolga(${index})">❌ Remover</button>
            </div>
        `;
    }).join('');
}

function adicionarFolga() {
    var data = document.getElementById('folgaData').value;
    if (!data) {
        mostrarToast('❌ Selecione uma data!', 'error');
        return;
    }
    
    if (horariosTrabalho.folgas.includes(data)) {
        mostrarToast('❌ Esta data já está cadastrada!', 'error');
        return;
    }
    
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
    
    // Coletar dias selecionados
    var diasSelecionados = [];
    var dias = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
    dias.forEach(function(dia) {
        var checkbox = document.getElementById('dia' + dia);
        if (checkbox && checkbox.checked) {
            diasSelecionados.push(dia.toLowerCase());
        }
    });
    
    if (diasSelecionados.length === 0) {
        mostrarToast('❌ Selecione pelo menos um dia de trabalho!', 'error');
        return;
    }
    
    horariosTrabalho.diasTrabalho = diasSelecionados;
    horariosTrabalho.horarioInicio = document.getElementById('horarioInicio').value;
    horariosTrabalho.horarioFim = document.getElementById('horarioFim').value;
    horariosTrabalho.intervaloCortes = parseInt(document.getElementById('intervaloCortes').value);
    
    try {
        await db.collection('configuracoes').doc('horarios_' + barbeiroLogado.id).set(horariosTrabalho);
        mostrarToast('✅ Horários salvos com sucesso!', 'success');
        
        // Atualizar opções de horário no agendamento
        atualizarHorariosAgendamento();
    } catch (error) {
        console.error('❌ Erro ao salvar horários:', error);
        mostrarToast('Erro ao salvar!', 'error');
    }
}

function atualizarHorariosAgendamento() {
    var select = document.getElementById('agendamentoHorario');
    if (!select) return;
    
    var inicio = horariosTrabalho.horarioInicio;
    var fim = horariosTrabalho.horarioFim;
    var intervalo = horariosTrabalho.intervaloCortes;
    
    // Converter para minutos
    var inicioMinutos = parseInt(inicio.split(':')[0]) * 60 + parseInt(inicio.split(':')[1]);
    var fimMinutos = parseInt(fim.split(':')[0]) * 60 + parseInt(fim.split(':')[1]);
    
    select.innerHTML = '';
    
    for (var minutos = inicioMinutos; minutos < fimMinutos; minutos += intervalo) {
        var hora = Math.floor(minutos / 60);
        var minuto = minutos % 60;
        var horario = String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0');
        
        var option = document.createElement('option');
        option.value = horario;
        option.textContent = horario;
        select.appendChild(option);
    }
}

// ==========================================================
// ===== REELS =====
// ==========================================================

var reelsAtual = 0;
var todosReels = [];

async function carregarReels() {
    var container = document.getElementById('reelsContainer');
    if (!container) return;

    try {
        const snapshot = await db.collection('posts')
            .orderBy('dataCriacao', 'desc')
            .get();

        todosReels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (todosReels.length === 0) {
            container.innerHTML = '<p style="color:#6B7280; text-align:center; padding:40px;">Nenhum reel disponível</p>';
            return;
        }
        
        exibirReel(reelsAtual);
    } catch (error) {
        console.error('❌ Erro ao carregar reels:', error);
        container.innerHTML = '<p style="color:#EF4444; text-align:center;">Erro ao carregar reels</p>';
    }
}

function exibirReel(index) {
    if (index < 0) index = 0;
    if (index >= todosReels.length) index = todosReels.length - 1;
    reelsAtual = index;
    
    var container = document.getElementById('reelsContainer');
    var post = todosReels[index];
    
    var servicoIcones = {
        'Corte Social': '💇',
        'Corte Degradê': '✂️',
        'Corte Navalhado': '🔪',
        'Corte Máquina': '⚡',
        'Barba': '🧔',
        'Barba + Corte': '✨',
        'Pintura': '🎨',
        'Luzes': '💡',
        'Platinado': '⭐',
        'Selagem': '💧',
        'Progressiva': '🌟'
    };
    var icone = servicoIcones[post.titulo] || '✂️';
    
    container.innerHTML = `
        <div class="reel-item">
            ${post.video ? 
                `<video src="${post.video}" autoplay loop muted playsinline></video>` :
                post.imagem ? 
                `<img src="${post.imagem}" class="reel-item-image" alt="${post.titulo}">` :
                `<div class="reel-item-image" style="display:flex; align-items:center; justify-content:center; font-size:80px; background:linear-gradient(135deg, #1A1A1A, #2D2D2D);">${icone}</div>`
            }
            <div class="reel-item-overlay">
                <div class="reel-item-title">${post.titulo}</div>
                <div class="reel-item-price">R$ ${post.preco ? post.preco.toFixed(2) : '0,00'}</div>
                <div style="font-size:12px; color:#B0B0B0;">${post.descricao ? post.descricao.substring(0, 50) + '...' : ''}</div>
            </div>
            <div class="reel-item-actions">
                <button onclick="likeReel('${post.id}', this)" title="Curtir">❤️</button>
                <button onclick="agendarPorReel('${post.id}')" title="Agendar">✂️</button>
                <button onclick="compartilharReel('${post.id}')" title="Compartilhar">📤</button>
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

function likeReel(postId, btn) {
    btn.classList.toggle('liked');
    mostrarToast('❤️ Curtido!', 'success');
}

function agendarPorReel(postId) {
    mostrarTela('agendamentoScreen');
    mostrarToast('✂️ Agende seu horário!', 'info');
}

function compartilharReel(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Barbearia RM',
            text: 'Confira este corte incrível!',
            url: window.location.href
        }).catch(function() {});
    } else {
        mostrarToast('📋 Link copiado!', 'success');
    }
}

// ==========================================================
// ===== ATUALIZAR FUNÇÃO mostrarTela =====
// ==========================================================

// Sobrescrever a função mostrarTela para incluir as novas telas
var mostrarTelaOriginal = mostrarTela;
mostrarTela = function(id) {
    mostrarTelaOriginal(id);
    
    if (id === 'galeriaCortesScreen') {
        carregarGaleria();
    }
    if (id === 'reelsScreen') {
        carregarReels();
    }
    if (id === 'horariosTrabalhoScreen') {
        carregarHorarios();
    }
};

// ==========================================================
// ===== ADICIONAR BOTÕES NAS TELAS EXISTENTES =====
// ==========================================================

// Adicionar botão de galeria na home do cliente
function adicionarBotoesExtras() {
    // Botão na home do cliente
    var homeCliente = document.getElementById('homeClienteScreen');
    if (homeCliente) {
        var botoesDiv = document.createElement('div');
        botoesDiv.style.cssText = 'display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;';
        botoesDiv.innerHTML = `
            <button class="btn btn-secondary" style="flex:1;" onclick="mostrarTela('galeriaCortesScreen')">💇 GALERIA</button>
            <button class="btn btn-primary" style="flex:1;" onclick="mostrarTela('reelsScreen')">🎬 REELS</button>
        `;
        
        // Inserir após o botão de agendamento
        var btnAgendar = homeCliente.querySelector('.btn-primary');
        if (btnAgendar && btnAgendar.parentNode) {
            btnAgendar.parentNode.insertBefore(botoesDiv, btnAgendar.nextSibling);
        }
    }
    
    // Botão na home do barbeiro
    var homeBarbeiro = document.getElementById('homeBarbeiroScreen');
    if (homeBarbeiro) {
        var botoesBarbeiro = document.createElement('div');
        botoesBarbeiro.style.cssText = 'display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;';
        botoesBarbeiro.innerHTML = `
            <button class="btn btn-secondary" style="flex:1;" onclick="mostrarTela('horariosTrabalhoScreen')">⏰ HORÁRIOS</button>
        `;
        
        var ultimoBotao = homeBarbeiro.querySelector('div:last-child');
        if (ultimoBotao) {
            ultimoBotao.appendChild(botoesBarbeiro.firstChild);
        }
    }
}

// Executar após carregar
setTimeout(function() {
    adicionarBotoesExtras();
    atualizarHorariosAgendamento();
}, 1000);

console.log('✅ Novas funcionalidades carregadas!');
console.log('📋 Edição de planos');
console.log('💇 Galeria de cortes');
console.log('⏰ Horários de trabalho');
console.log('🎬 Reels');
