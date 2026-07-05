/* ==========================================================
   BARBEARIA RM - ESTÚDIO AO VIVO PROFISSIONAL
   ========================================================== */

// Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",
    authDomain: "barbearia-rm.firebaseapp.com",
    projectId: "barbearia-rm",
    storageBucket: "barbearia-rm.firebasestorage.app",
    messagingSenderId: "512819922057",
    appId: "1:512819922057:web:6a913791cb6435e4f63258"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ==========================================================
// ESTADO DO ESTÚDIO
// ==========================================================
const Studio = {
    liveAtiva: false,
    stream: null,
    gravandoTrecho: false,
    trechosGravados: [],
    mediaRecorder: null,
    recordedChunks: [],
    efeitoAtual: 'none',
    stickerAtual: null,
    telaAtual: 'camera', // 'camera', 'commercial', 'ad'
    duracaoLive: 0,
    timerInterval: null,
    chatMessages: [],
    viewerCount: 0,
    
    // Comercial
    comercialVideo: null,
    comercialImagem: null,
    
    // Anúncio
    anuncioImagem: null,
    
    // Resolução
    resolucao: { width: 1280, height: 720 },
    facingMode: 'user' // 'user' ou 'environment'
};

// ==========================================================
// TOAST
// ==========================================================
function mostrarToast(msg, tipo) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    t.style.borderColor = tipo === 'error' ? '#ff4444' : tipo === 'success' ? '#00cc66' : '#D4A84B';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.style.display = 'none', 3000);
}

// ==========================================================
// INICIAR / PARAR LIVE
// ==========================================================
async function iniciarLive() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: Studio.resolucao.width }, height: { ideal: Studio.resolucao.height }, facingMode: Studio.facingMode },
            audio: { echoCancellation: true, noiseSuppression: true }
        });
        
        Studio.stream = stream;
        Studio.liveAtiva = true;
        
        const video = document.getElementById('liveVideo');
        video.srcObject = stream;
        video.muted = true;
        
        document.getElementById('livePlaceholder').style.display = 'none';
        document.getElementById('controlsBar').style.display = 'flex';
        document.getElementById('btnStartStop').textContent = '⏹️ Parar';
        document.getElementById('btnStartStop').classList.add('recording');
        
        // Salvar no Firebase
        await db.collection('lives').doc('live_atual').set({
            id: 'live_atual',
            titulo: 'Live Barbearia RM',
            barbeiroNome: 'Barbearia RM',
            ativa: true,
            chat: [],
            viewers: 0,
            likes: 0,
            dataInicio: new Date().toISOString()
        });
        
        // Iniciar timer
        iniciarTimer();
        iniciarChatListener();
        
        mostrarToast('🔴 Live iniciada!', 'success');
    } catch (erro) {
        console.error('Erro ao iniciar live:', erro);
        mostrarToast('❌ Erro ao acessar câmera: ' + erro.message, 'error');
    }
}

function pararLive() {
    if (!Studio.liveAtiva) return;
    
    pararGravacaoTrecho();
    
    if (Studio.stream) {
        Studio.stream.getTracks().forEach(t => t.stop());
        Studio.stream = null;
    }
    
    Studio.liveAtiva = false;
    Studio.telaAtual = 'camera';
    
    document.getElementById('liveVideo').srcObject = null;
    document.getElementById('livePlaceholder').style.display = 'flex';
    document.getElementById('controlsBar').style.display = 'none';
    document.getElementById('btnStartStop').textContent = '🎥 INICIAR TRANSMISSÃO';
    document.getElementById('btnStartStop').classList.remove('recording');
    document.getElementById('overlayComercial').classList.remove('active');
    document.getElementById('overlayAnuncio').classList.remove('active');
    document.getElementById('screenLabel').textContent = '🎥 CÂMERA';
    document.getElementById('currentScreen').textContent = 'Câmera';
    
    pararTimer();
    document.getElementById('liveDuration').textContent = '00:00:00';
    
    mostrarToast('⏹️ Live encerrada', 'info');
}

async function finalizarLive() {
    if (!confirm('Finalizar live permanentemente?')) return;
    
    pararLive();
    
    await db.collection('lives').doc('live_atual').update({
        ativa: false,
        dataFim: new Date().toISOString()
    });
    
    mostrarToast('✅ Live finalizada e salva!', 'success');
}

// ==========================================================
// GRAVAÇÃO DE TRECHOS
// ==========================================================
function iniciarGravacaoTrecho() {
    if (!Studio.stream || Studio.gravandoTrecho) return;
    
    const options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
    }
    
    Studio.mediaRecorder = new MediaRecorder(Studio.stream, options);
    Studio.recordedChunks = [];
    
    Studio.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) Studio.recordedChunks.push(e.data);
    };
    
    Studio.mediaRecorder.onstop = () => {
        const blob = new Blob(Studio.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const duracao = Studio.recordedChunks.length * 0.5; // Estimativa
        
        Studio.trechosGravados.push({
            id: Date.now(),
            url: url,
            blob: blob,
            duracao: duracao.toFixed(1),
            efeito: Studio.efeitoAtual,
            data: new Date().toISOString()
        });
        
        atualizarTimeline();
        document.getElementById('clipCount').textContent = Studio.trechosGravados.length + ' trechos';
        mostrarToast('✅ Trecho salvo! (' + duracao.toFixed(1) + 's)', 'success');
    };
    
    Studio.mediaRecorder.start(1000);
    Studio.gravandoTrecho = true;
    
    document.getElementById('btnRecordClip').style.display = 'none';
    document.getElementById('btnStopClip').style.display = 'inline-block';
    document.getElementById('statusRecording').style.display = 'flex';
    
    mostrarToast('⏺️ Gravando trecho...', 'info');
}

function pararGravacaoTrecho() {
    if (!Studio.gravandoTrecho || !Studio.mediaRecorder) return;
    
    Studio.mediaRecorder.stop();
    Studio.gravandoTrecho = false;
    
    document.getElementById('btnRecordClip').style.display = 'inline-block';
    document.getElementById('btnStopClip').style.display = 'none';
    document.getElementById('statusRecording').style.display = 'none';
}

function atualizarTimeline() {
    const timeline = document.getElementById('clipsTimeline');
    
    if (Studio.trechosGravados.length === 0) {
        timeline.innerHTML = '<div class="clip-item" style="color:#aaa;">Nenhum trecho gravado</div>';
        return;
    }
    
    timeline.innerHTML = Studio.trechosGravados.map((clip, i) => `
        <div class="clip-item" onclick="reproduzirTrecho(${i})">
            <div>🎬 Clip ${i + 1}</div>
            <div class="clip-duration">${clip.duracao}s</div>
            <div style="font-size:9px;color:#aaa;">✨ ${clip.efeito}</div>
        </div>
    `).join('');
}

function reproduzirTrecho(index) {
    const clip = Studio.trechosGravados[index];
    if (!clip) return;
    
    const win = window.open(clip.url, '_blank');
    if (win) win.focus();
}

function salvarTrechos() {
    Studio.trechosGravados.forEach((clip, i) => {
        const a = document.createElement('a');
        a.href = clip.url;
        a.download = `barbearia-rm-clip-${i + 1}-${Date.now()}.webm`;
        a.click();
    });
    mostrarToast('💾 ' + Studio.trechosGravados.length + ' trechos baixados!', 'success');
}

function limparTrechos() {
    if (!confirm('Limpar todos os trechos?')) return;
    Studio.trechosGravados.forEach(c => URL.revokeObjectURL(c.url));
    Studio.trechosGravados = [];
    atualizarTimeline();
    document.getElementById('clipCount').textContent = '0 trechos';
    mostrarToast('🗑 Trechos limpos', 'info');
}

// ==========================================================
// EFEITOS VISUAIS
// ==========================================================
function aplicarEfeito(efeito, elemento) {
    const overlay = document.getElementById('effectsOverlay');
    const video = document.getElementById('liveVideo');
    
    // Remover classes anteriores
    overlay.className = 'effects-overlay';
    video.className = '';
    
    if (efeito === 'none') {
        Studio.efeitoAtual = 'none';
        document.getElementById('currentEffect').textContent = 'Nenhum';
    } else {
        overlay.classList.add('effect-' + efeito);
        video.classList.add('effect-' + efeito);
        Studio.efeitoAtual = efeito;
        document.getElementById('currentEffect').textContent = efeito.charAt(0).toUpperCase() + efeito.slice(1);
    }
    
    // Atualizar seleção visual
    document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('selected'));
    if (elemento) elemento.classList.add('selected');
    
    mostrarToast('✨ Efeito: ' + Studio.efeitoAtual, 'info');
}

// ==========================================================
// STICKERS / OVERLAYS
// ==========================================================
function adicionarSticker(emoji) {
    const overlay = document.getElementById('effectsOverlay');
    
    // Remover sticker anterior
    const existente = overlay.querySelector('.sticker-ativo');
    if (existente) existente.remove();
    
    if (Studio.stickerAtual === emoji) {
        Studio.stickerAtual = null;
        mostrarToast('Sticker removido', 'info');
        return;
    }
    
    const sticker = document.createElement('div');
    sticker.className = 'sticker-ativo';
    sticker.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 40px;
        z-index: 15;
        animation: floatSticker 3s ease-in-out infinite;
        text-shadow: 0 0 20px rgba(255,215,0,0.5);
    `;
    sticker.textContent = emoji;
    overlay.appendChild(sticker);
    
    Studio.stickerAtual = emoji;
    mostrarToast('🎭 Sticker: ' + emoji, 'info');
}

// ==========================================================
// TELAS (CÂMERA / COMERCIAL / ANÚNCIO)
// ==========================================================
function mostrarTelaCamera() {
    document.getElementById('overlayComercial').classList.remove('active');
    document.getElementById('overlayAnuncio').classList.remove('active');
    document.getElementById('screenLabel').textContent = '🎥 CÂMERA';
    document.getElementById('currentScreen').textContent = 'Câmera';
    Studio.telaAtual = 'camera';
    
    // Parar vídeo comercial
    const vid = document.getElementById('comercialVideo');
    if (vid) vid.pause();
}

function mostrarTelaComercial() {
    document.getElementById('overlayAnuncio').classList.remove('active');
    document.getElementById('overlayComercial').classList.add('active');
    document.getElementById('screenLabel').textContent = '📺 COMERCIAL';
    document.getElementById('currentScreen').textContent = 'Comercial';
    Studio.telaAtual = 'commercial';
    
    // Tocar vídeo comercial
    const vid = document.getElementById('comercialVideo');
    if (vid && vid.src) vid.play();
}

function mostrarTelaAnuncio() {
    document.getElementById('overlayComercial').classList.remove('active');
    document.getElementById('overlayAnuncio').classList.add('active');
    document.getElementById('screenLabel').textContent = '📢 ANÚNCIO';
    document.getElementById('currentScreen').textContent = 'Anúncio';
    Studio.telaAtual = 'ad';
}

function carregarComercial(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const vid = document.getElementById('comercialVideo');
    vid.src = url;
    vid.loop = true;
    vid.muted = true;
    document.getElementById('comercialImagem').style.display = 'none';
    vid.style.display = 'block';
    mostrarToast('🎬 Comercial carregado!', 'success');
}

function carregarComercialImagem(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('comercialImagem').src = e.target.result;
        document.getElementById('comercialImagem').style.display = 'block';
        document.getElementById('comercialVideo').style.display = 'none';
    };
    reader.readAsDataURL(file);
    mostrarToast('🖼️ Imagem comercial carregada!', 'success');
}

function carregarAnuncio(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('anuncioImg').src = e.target.result;
        mostrarTelaAnuncio();
    };
    reader.readAsDataURL(file);
}

// ==========================================================
// TROCAR CÂMERA
// ==========================================================
async function trocarCamera() {
    Studio.facingMode = Studio.facingMode === 'user' ? 'environment' : 'user';
    
    if (Studio.stream) {
        Studio.stream.getTracks().forEach(t => t.stop());
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: Studio.facingMode },
            audio: true
        });
        
        Studio.stream = stream;
        document.getElementById('liveVideo').srcObject = stream;
        mostrarToast('🔄 Câmera: ' + (Studio.facingMode === 'user' ? 'Frontal' : 'Traseira'), 'info');
    } catch (erro) {
        mostrarToast('❌ Erro ao trocar câmera', 'error');
    }
}

// ==========================================================
// TIMER
// ==========================================================
function iniciarTimer() {
    Studio.duracaoLive = 0;
    Studio.timerInterval = setInterval(() => {
        Studio.duracaoLive++;
        const h = Math.floor(Studio.duracaoLive / 3600);
        const m = Math.floor((Studio.duracaoLive % 3600) / 60);
        const s = Studio.duracaoLive % 60;
        document.getElementById('liveDuration').textContent = 
            String(h).padStart(2, '0') + ':' + 
            String(m).padStart(2, '0') + ':' + 
            String(s).padStart(2, '0');
    }, 1000);
}

function pararTimer() {
    clearInterval(Studio.timerInterval);
    Studio.duracaoLive = 0;
}

// ==========================================================
// CHAT
// ==========================================================
async function enviarChat() {
    const input = document.getElementById('chatInput');
    const texto = input.value.trim();
    if (!texto) return;
    
    const msg = {
        user: 'Barbeiro RM',
        texto,
        data: new Date().toISOString()
    };
    
    Studio.chatMessages.push(msg);
    atualizarChat();
    
    // Salvar no Firebase
    if (Studio.liveAtiva) {
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists) {
            const chat = doc.data().chat || [];
            chat.push(msg);
            await db.collection('lives').doc('live_atual').update({ chat });
        }
    }
    
    input.value = '';
}

function atualizarChat() {
    const container = document.getElementById('chatMessages');
    if (Studio.chatMessages.length === 0) {
        container.innerHTML = '<p style="color:#aaa;text-align:center;font-size:12px;">Chat vazio</p>';
        return;
    }
    
    container.innerHTML = Studio.chatMessages.map(m => `
        <div class="chat-msg">
            <span class="user">${m.user}:</span> ${m.texto}
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function iniciarChatListener() {
    setInterval(async () => {
        if (!Studio.liveAtiva) return;
        const doc = await db.collection('lives').doc('live_atual').get();
        if (doc.exists) {
            Studio.viewerCount = doc.data().viewers || 0;
            document.getElementById('liveViewerCount').textContent = '👥 ' + Studio.viewerCount;
        }
    }, 3000);
}

// ==========================================================
// COMPARTILHAR
// ==========================================================
function compartilhar(rede) {
    const url = window.location.href;
    const texto = '🔴 Barbearia RM - Ao Vivo!';
    
    const links = {
        instagram: 'https://instagram.com',
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
        tiktok: 'https://tiktok.com',
        youtube: 'https://youtube.com',
        whatsapp: 'https://wa.me/?text=' + encodeURIComponent(texto + ' ' + url),
        twitter: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(texto) + '&url=' + url,
        link: null,
        embed: null
    };
    
    if (rede === 'link') {
        navigator.clipboard.writeText(url);
        mostrarToast('📋 Link copiado!', 'success');
    } else if (rede === 'embed') {
        const embed = '<iframe src="' + url + '" width="560" height="315"></iframe>';
        navigator.clipboard.writeText(embed);
        mostrarToast('📝 Código embed copiado!', 'success');
    } else if (links[rede]) {
        window.open(links[rede], '_blank');
    }
}

// ==========================================================
// PAINÉIS EXPANSÍVEIS
// ==========================================================
function togglePanel(id) {
    const panel = document.getElementById(id);
    const parent = panel.parentElement;
    parent.classList.toggle('open');
    
    const header = parent.querySelector('.section-header');
    if (header) header.classList.toggle('open');
}

// ==========================================================
// EVENT LISTENERS
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎥 Estúdio Ao Vivo carregado');
    
    // Botões principais
    document.getElementById('btnIniciarLive').addEventListener('click', iniciarLive);
    document.getElementById('btnStartStop').addEventListener('click', () => {
        Studio.liveAtiva ? pararLive() : iniciarLive();
    });
    document.getElementById('btnEndLive').addEventListener('click', finalizarLive);
    
    // Gravação
    document.getElementById('btnRecordClip').addEventListener('click', iniciarGravacaoTrecho);
    document.getElementById('btnStopClip').addEventListener('click', pararGravacaoTrecho);
    document.getElementById('btnSaveClips').addEventListener('click', salvarTrechos);
    document.getElementById('btnClearClips').addEventListener('click', limparTrechos);
    document.getElementById('btnSaveAll').addEventListener('click', salvarTrechos);
    
    // Telas
    document.getElementById('btnScreenCamera').addEventListener('click', mostrarTelaCamera);
    document.getElementById('btnScreenCommercial').addEventListener('click', mostrarTelaComercial);
    document.getElementById('btnScreenAd').addEventListener('click', mostrarTelaAnuncio);
    
    // Câmera
    document.getElementById('btnSwitchCamera').addEventListener('click', trocarCamera);
    
    // Chat
    document.getElementById('btnSendChat').addEventListener('click', enviarChat);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarChat();
    });
    
    // Efeito padrão
    document.querySelector('.effect-card[data-effect="none"]').classList.add('selected');
});
