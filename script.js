// =============================================================
// ===== INFORMAÇÕES DOS CLIENTES (COMPLETA) =====
// =============================================================

async function atualizarInfoClientes() {
    // Busca clientes
    let clientes = [];
    
    if (db) {
        try {
            const snapshot = await db.collection('clientes').get();
            snapshot.forEach(doc => {
                clientes.push({ id: doc.id, ...doc.data() });
            });
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            clientes = carregarDados('clientes') || [];
        }
    } else {
        clientes = carregarDados('clientes') || [];
    }

    // Total
    document.getElementById('infoTotalClientes').textContent = clientes.length;

    // Online (últimos 5 minutos)
    const agora = Date.now();
    const online = clientes.filter(c => {
        const ultimoAcesso = c.ultimoAcesso || 0;
        return (agora - ultimoAcesso) < 5 * 60 * 1000;
    });
    document.getElementById('infoOnlineClientes').textContent = online.length;

    // Com localização
    const comLocalizacao = clientes.filter(c => c.latitude && c.longitude);
    document.getElementById('infoComLocalizacao').textContent = comLocalizacao.length;

    // Lista de clientes
    const container = document.getElementById('infoListaClientes');
    if (!container) return;

    if (clientes.length === 0) {
        container.innerHTML = '<p style="color:#6A6A6A; text-align:center;">Nenhum cliente cadastrado</p>';
        return;
    }

    // Ordena por último acesso (mais recente primeiro)
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
}

// ===== VER LOCALIZAÇÃO DO CLIENTE =====
function verLocalizacaoCliente(lat, lng) {
    if (!lat || !lng) {
        mostrarToast('📍 Cliente não compartilhou localização', 'erro');
        return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}

// ===== ATUALIZA LOCALIZAÇÃO DO CLIENTE =====
function atualizarLocalizacaoCliente() {
    if (!navigator.geolocation) {
        console.log('Geolocalização não suportada');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 Localização obtida:', latitude, longitude);

            if (usuarioLogado && tipoUsuario === 'cliente') {
                // Salva no LocalStorage
                usuarioLogado.latitude = latitude;
                usuarioLogado.longitude = longitude;
                usuarioLogado.ultimaLocalizacao = Date.now();

                const clientes = carregarDados('clientes') || [];
                const idx = clientes.findIndex(c => c.id === usuarioLogado.id);
                if (idx !== -1) {
                    clientes[idx].latitude = latitude;
                    clientes[idx].longitude = longitude;
                    clientes[idx].ultimaLocalizacao = Date.now();
                    salvarDados('clientes', clientes);
                }

                // Salva no Firestore se disponível
                if (db) {
                    try {
                        await db.collection('clientes').doc(usuarioLogado.id).update({
                            latitude: latitude,
                            longitude: longitude,
                            ultimaLocalizacao: Date.now()
                        });
                        console.log('✅ Localização salva no Firestore');
                    } catch (error) {
                        console.warn('Erro ao salvar localização no Firestore:', error);
                    }
                }
            }
        },
        (error) => {
            console.warn('Erro ao obter localização:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}
