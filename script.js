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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('🔥 Firebase OK');

// ==========================================================
// ===== VARIÁVEIS =====
// ==========================================================
var clienteLogado = null, barbeiroLogado = null;
var imagemBase64 = '', videoBase64 = '', imagemPlanoBase64 = '', anuncioImagemBase64 = '';
var todosPosts = [], todosReels = [], reelsAtual = 0, postSelecionadoId = null;
var horariosTrabalho = { diasTrabalho: ['segunda','terca','quarta','quinta','sexta','sabado'], horarioInicio: '09:00', horarioFim: '18:00', intervaloCortes: 30, folgas: [] };

// ==========================================================
// ===== VARIÁVEIS LIVE WebRTC =====
// ==========================================================
var liveLocalStream = null;
var livePeerConnections = {}; // Múltiplos peers (um por viewer)
var liveChatInterval = null;
var liveAtiva = false;
var liveChatMessages = [];
var liveViewerId = null;
var liveLikes = 0;
var liveLiked = false;

// Configuração WebRTC
var rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ==========================================================
// ===== SESSÃO =====
// ==========================================================
function salvarSessao(t,d){var s={tipo:t,id:d.id,nome:d.nome,email:d.email,celular:d.celular||'',senha:d.senha||'',fotoPerfil:d.fotoPerfil||'',timestamp:Date.now()};localStorage.setItem('barbeariaRM_sessao',JSON.stringify(s));}
function carregarSessao(){var s=localStorage.getItem('barbeariaRM_sessao');if(!s)return null;try{var p=JSON.parse(s);if((Date.now()-p.timestamp)/86400000>30){localStorage.removeItem('barbeariaRM_sessao');return null;}return p;}catch(e){localStorage.removeItem('barbeariaRM_sessao');return null;}}
function limparSessao(){localStorage.removeItem('barbeariaRM_sessao');}
async function restaurarSessao(){var s=carregarSessao();if(!s)return false;try{if(s.tipo==='cliente'){var sn=await db.collection('clientes').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){var d=sn.docs[0];clienteLogado={id:d.id,...d.data()};document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;mostrarTela('homeClienteScreen');return true;}}else{var sn=await db.collection('barbeiros').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){var d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;mostrarTela('homeBarbeiroScreen');return true;}}}catch(e){}limparSessao();return false;}

// ==========================================================
// ===== FUNÇÕES BÁSICAS =====
// ==========================================================
function mostrarToast(m,t){var x=document.getElementById('toast');if(!x)return;x.textContent=m;x.className='toast '+(t||'info');x.style.display='block';setTimeout(function(){x.style.display='none';},3000);}
function voltarParaLogin(){document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='none';mostrarTela('loginScreen');}
function mostrarLoginCliente(){document.getElementById('loginFormCliente').style.display='block';document.getElementById('loginFormBarbeiro').style.display='none';}
function mostrarLoginBarbeiro(){document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='block';}

// ==========================================================
// ===== LOGIN/CADASTRO =====
// ==========================================================
async function cadastrarCliente(){var n=document.getElementById('cadNomeCliente').value.trim(),e=document.getElementById('cadEmailCliente').value.trim(),c=document.getElementById('cadCelularCliente').value.trim(),s=document.getElementById('cadSenhaCliente').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha todos!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{var sn=await db.collection('clientes').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email já existe!','error');return;}var id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString(),notificacoesLive:true};await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;salvarSessao('cliente',cl);document.getElementById('welcomeClienteNome').textContent=n;mostrarToast('✅ OK!','success');mostrarTela('homeClienteScreen');document.getElementById('cadNomeCliente').value='';document.getElementById('cadEmailCliente').value='';document.getElementById('cadCelularCliente').value='';document.getElementById('cadSenhaCliente').value='';}catch(er){mostrarToast('❌ '+er.message,'error');}}
async function cadastrarBarbeiro(){var n=document.getElementById('cadNomeBarbeiro').value.trim(),e=document.getElementById('cadEmailBarbeiro').value.trim(),c=document.getElementById('cadCelularBarbeiro').value.trim(),s=document.getElementById('cadSenhaBarbeiro').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha todos!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{var sn=await db.collection('barbeiros').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email já existe!','error');return;}var id=Date.now().toString(),bb={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};await db.collection('barbeiros').doc(id).set(bb);barbeiroLogado=bb;salvarSessao('barbeiro',bb);document.getElementById('welcomeBarbeiroNome').textContent=n;mostrarToast('✅ OK!','success');mostrarTela('homeBarbeiroScreen');document.getElementById('cadNomeBarbeiro').value='';document.getElementById('cadEmailBarbeiro').value='';document.getElementById('cadCelularBarbeiro').value='';document.getElementById('cadSenhaBarbeiro').value='';}catch(er){mostrarToast('❌ '+er.message,'error');}}
async function loginCliente(){var e=document.getElementById('loginEmailCliente').value.trim(),s=document.getElementById('loginSenhaCliente').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{var sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}var d=sn.docs[0];clienteLogado={id:d.id,...d.data()};salvarSessao('cliente',clienteLogado);document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;document.getElementById('loginEmailCliente').value='';document.getElementById('loginSenhaCliente').value='';document.getElementById('loginFormCliente').style.display='none';mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeClienteScreen');}catch(er){mostrarToast('❌ Erro!','error');}}
async function loginBarbeiro(){var e=document.getElementById('loginEmailBarbeiro').value.trim(),s=document.getElementById('loginSenhaBarbeiro').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{var sn=await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}var d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};salvarSessao('barbeiro',barbeiroLogado);document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;document.getElementById('loginEmailBarbeiro').value='';document.getElementById('loginSenhaBarbeiro').value='';document.getElementById('loginFormBarbeiro').style.display='none';mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeBarbeiroScreen');}catch(er){mostrarToast('❌ Erro!','error');}}
function sairCliente(){desconectarLive();clienteLogado=null;limparSessao();document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='none';mostrarTela('loginScreen');mostrarToast('👋 Até logo!','info');}
function sairBarbeiro(){encerrarLive();barbeiroLogado=null;limparSessao();document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='none';mostrarTela('loginScreen');mostrarToast('👋 Até logo!','info');}

// ==========================================================
// ===== LIVE WebRTC (TEMPO REAL) =====
// ==========================================================

// --- INICIAR LIVE (BARBEIRO) ---
async function iniciarLive(){
    if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}
    var titulo=document.getElementById('liveTitulo').value.trim()||'🔴 Live da Barbearia RM';
    try{
        var stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:true});
        liveLocalStream=stream;
        
        // Mostrar no player do barbeiro
        document.getElementById('liveVideo').srcObject=stream;
        document.getElementById('liveVideo').style.display='block';
        document.getElementById('liveFrameImg').style.display='none';
        document.getElementById('liveVideoLocal').srcObject=stream;
        document.getElementById('liveVideoLocal').style.display='block';
        
        // Salvar no Firestore como live ativa
        await db.collection('lives').doc('live_atual').set({
            id:'live_atual',barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,
            titulo,ativa:true,chat:[],viewers:0,totalViews:0,likes:0,
            dataInicio:new Date().toISOString()
        });
        
        liveAtiva=true;liveChatMessages=[];liveLikes=0;liveLiked=false;
        livePeerConnections={};
        
        document.getElementById('livePlaceholder').style.display='none';
        document.getElementById('livePlayer').style.display='block';
        document.getElementById('liveStatus').style.display='block';
        document.getElementById('liveStatusTitulo').textContent=titulo;
        document.getElementById('liveStatusBarbeiro').textContent='👤 '+barbeiroLogado.nome;
        document.getElementById('liveLoginWarning').style.display='none';
        document.getElementById('liveViewerCount').textContent='👥 0';
        document.getElementById('liveStatusViewers').textContent='👥 0';
        atualizarChat();iniciarChatListener();verificarLiveAtiva();
        
        // Escutar ofertas de conexão dos viewers
        escutarConexoesViewers();
        
        mostrarToast('🔴 Live iniciada em tempo real!','success');
    }catch(error){
        if(error.name==='NotAllowedError')mostrarToast('❌ Permissão da câmera negada!','error');
        else mostrarToast('❌ '+error.message,'error');
    }
}

// --- ESCUTAR CONEXÕES DOS VIEWERS (BARBEIRO) ---
function escutarConexoesViewers(){
    db.collection('lives').doc('live_atual').collection('ofertas')
        .onSnapshot(function(snapshot){
            snapshot.docChanges().forEach(async function(change){
                if(change.type==='added'&&liveLocalStream){
                    var data=change.doc.data();
                    if(data.tipo==='oferta'&&!livePeerConnections[change.doc.id]){
                        await criarPeerConnection(change.doc.id,data.sdp);
                    }
                }
            });
        });
}

// --- CRIAR PEER CONNECTION (BARBEIRO) ---
async function criarPeerConnection(viewerId,ofertaSdp){
    try{
        var pc=new RTCPeerConnection(rtcConfig);
        livePeerConnections[viewerId]=pc;
        
        // Adicionar tracks do stream local
        liveLocalStream.getTracks().forEach(function(track){
            pc.addTrack(track,liveLocalStream);
        });
        
        // Receber oferta do viewer
        await pc.setRemoteDescription(new RTCSessionDescription(ofertaSdp));
        
        // Criar resposta
        var answer=await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Enviar resposta para o viewer
        await db.collection('lives').doc('live_atual').collection('respostas').doc(viewerId).set({
            sdp:{type:pc.localDescription.type,sdp:pc.localDescription.sdp},
            timestamp:Date.now()
        });
        
        // Remover oferta
        await db.collection('lives').doc('live_atual').collection('ofertas').doc(viewerId).delete();
        
        // Limpar quando desconectar
        pc.oniceconnectionstatechange=function(){
            if(pc.iceConnectionState==='disconnected'||pc.iceConnectionState==='failed'){
                pc.close();
                delete livePeerConnections[viewerId];
                atualizarViewers();
            }
        };
        
        atualizarViewers();
        
    }catch(e){console.error('❌ Erro peer:',e);}
}

// --- ATUALIZAR CONTADOR DE VIEWERS ---
function atualizarViewers(){
    var count=Object.keys(livePeerConnections).length;
    db.collection('lives').doc('live_atual').update({viewers:count});
    document.getElementById('liveViewerCount').textContent='👥 '+count;
    document.getElementById('liveStatusViewers').textContent='👥 '+count+' assistindo';
}

// --- CONECTAR VIEWER (CLIENTE) ---
async function conectarViewerLive(){
    if(!clienteLogado||!liveAtiva)return;
    
    try{
        var viewerId='viewer_'+Date.now()+'_'+Math.random().toString(36).substr(2,5);
        
        // Criar peer connection
        var pc=new RTCPeerConnection(rtcConfig);
        
        // Quando receber stream remoto
        pc.ontrack=function(event){
            console.log('📺 Stream recebido!');
            var video=document.getElementById('liveVideo');
            video.srcObject=event.streams[0];
            video.style.display='block';
            document.getElementById('liveFrameImg').style.display='none';
            document.getElementById('livePlaceholder').style.display='none';
            document.getElementById('livePlayer').style.display='block';
        };
        
        // Criar oferta
        var offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Enviar oferta para o barbeiro
        await db.collection('lives').doc('live_atual').collection('ofertas').doc(viewerId).set({
            tipo:'oferta',
            sdp:{type:pc.localDescription.type,sdp:pc.localDescription.sdp},
            timestamp:Date.now()
        });
        
        // Aguardar resposta
        db.collection('lives').doc('live_atual').collection('respostas').doc(viewerId)
            .onSnapshot(async function(snapshot){
                if(snapshot.exists){
                    var data=snapshot.data();
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    // Remover resposta
                    await db.collection('lives').doc('live_atual').collection('respostas').doc(viewerId).delete();
                }
            });
        
        // Incrementar views
        db.collection('lives').doc('live_atual').update({
            totalViews:firebase.firestore.FieldValue.increment(1)
        });
        
        // Desconectar ao sair
        pc.oniceconnectionstatechange=function(){
            if(pc.iceConnectionState==='disconnected'){pc.close();}
        };
        
        liveViewerId=viewerId;
        livePeerConnections[viewerId]=pc;
        
    }catch(e){console.error('❌ Erro viewer:',e);}
}

// --- CARREGAR LIVE ---
async function carregarLive(){
    var placeholder=document.getElementById('livePlaceholder'),player=document.getElementById('livePlayer'),
        status=document.getElementById('liveStatus'),warning=document.getElementById('liveLoginWarning'),
        controls=document.getElementById('liveControls');
    
    try{
        var doc=await db.collection('lives').doc('live_atual').get();
        if(doc.exists&&doc.data().ativa){
            var live=doc.data();liveAtiva=true;
            
            if(placeholder)placeholder.style.display='none';
            if(status){status.style.display='block';document.getElementById('liveStatusTitulo').textContent=live.titulo;document.getElementById('liveStatusBarbeiro').textContent='👤 '+live.barbeiroNome;document.getElementById('liveStatusViewers').textContent='👥 '+(live.viewers||0)+' • 👁 '+(live.totalViews||0)+' • ❤️ '+(live.likes||0);}
            
            liveChatMessages=live.chat||[];atualizarChat();liveLikes=live.likes||0;
            
            if(barbeiroLogado&&barbeiroLogado.id===live.barbeiroId){
                // BARBEIRO - já tem o stream local
                if(controls)controls.style.display='block';
                if(player)player.style.display='block';
                if(warning)warning.style.display='none';
                document.getElementById('liveTitulo').value=live.titulo;
                document.getElementById('liveViewerCount').textContent='👥 '+(live.viewers||0);
                if(liveLocalStream){
                    document.getElementById('liveVideo').srcObject=liveLocalStream;
                    document.getElementById('liveVideo').style.display='block';
                    document.getElementById('liveFrameImg').style.display='none';
                }
            }else if(clienteLogado){
                // CLIENTE - conectar via WebRTC
                if(controls)controls.style.display='none';
                if(player)player.style.display='block';
                if(warning)warning.style.display='none';
                document.getElementById('liveViewerCount').textContent='👥 '+(live.viewers||0);
                
                // Conectar ao stream do barbeiro
                if(!liveViewerId)conectarViewerLive();
                
            }else{
                if(player)player.style.display='none';
                if(warning)warning.style.display='block';
                if(controls)controls.style.display='none';
            }
            iniciarChatListener();
        }else{
            liveAtiva=false;desconectarLive();
            if(placeholder)placeholder.style.display='block';
            if(player)player.style.display='none';
            if(status)status.style.display='none';
            if(warning)warning.style.display='none';
            if(barbeiroLogado){if(controls)controls.style.display='block';}else{if(controls)controls.style.display='none';}
            pararChatListener();
        }
    }catch(e){liveAtiva=false;}
}

// --- DESCONECTAR LIVE (VIEWER) ---
function desconectarLive(){
    Object.keys(livePeerConnections).forEach(function(key){
        try{livePeerConnections[key].close();}catch(e){}
    });
    livePeerConnections={};
    liveViewerId=null;
    var video=document.getElementById('liveVideo');
    if(video)video.srcObject=null;
}

// --- ENCERRAR LIVE (BARBEIRO) ---
async function encerrarLive(){
    if(!barbeiroLogado)return;
    if(!confirm('Encerrar a live?'))return;
    
    // Fechar todas as conexões
    Object.keys(livePeerConnections).forEach(function(key){
        try{livePeerConnections[key].close();}catch(e){}
    });
    livePeerConnections={};
    
    if(liveLocalStream){liveLocalStream.getTracks().forEach(function(t){t.stop();});liveLocalStream=null;}
    
    await db.collection('lives').doc('live_atual').update({ativa:false,dataFim:new Date().toISOString()});
    liveAtiva=false;liveChatMessages=[];
    
    document.getElementById('livePlaceholder').style.display='block';
    document.getElementById('livePlayer').style.display='none';
    document.getElementById('liveStatus').style.display='none';
    document.getElementById('liveVideo').srcObject=null;
    document.getElementById('liveFrameImg').style.display='none';
    document.getElementById('liveLoginWarning').style.display='none';
    pararChatListener();atualizarChat();verificarLiveAtiva();
    mostrarToast('⏹ Live encerrada!','info');
}

function pararTransmissao(){
    if(liveLocalStream){liveLocalStream.getTracks().forEach(function(t){t.stop();});liveLocalStream=null;}
    document.getElementById('liveVideo').srcObject=null;
}

// --- LIKE ---
async function likeLive(){if(!liveAtiva||liveLiked)return;await db.collection('lives').doc('live_atual').update({likes:firebase.firestore.FieldValue.increment(1)});liveLiked=true;liveLikes++;mostrarToast('❤️ Curtido!','success');}
function compartilharLive(){if(!liveAtiva)return;var url=window.location.href.split('?')[0]+'?live=1';if(navigator.share){navigator.share({title:'Barbearia RM',text:'🔴 Live ao vivo!',url:url});}else{navigator.clipboard.writeText(url);mostrarToast('📋 Link copiado!','success');}}

// --- CHAT COM FOTO DE PERFIL ---
function iniciarChatListener(){pararChatListener();liveChatInterval=setInterval(async function(){var doc=await db.collection('lives').doc('live_atual').get();if(doc.exists&&doc.data().ativa){var novas=doc.data().chat||[];if(novas.length!==liveChatMessages.length){liveChatMessages=novas;atualizarChat();}var el=document.getElementById('liveStatusViewers');if(el)el.textContent='👥 '+(doc.data().viewers||0)+' • 👁 '+(doc.data().totalViews||0)+' • ❤️ '+(doc.data().likes||0);}},2000);}
function pararChatListener(){if(liveChatInterval){clearInterval(liveChatInterval);liveChatInterval=null;}}

async function enviarMensagemLive(){
    var input=document.getElementById('liveChatInput');if(!input)return;
    var texto=input.value.trim();if(!texto||!liveAtiva)return;
    
    var autor='👤 Visitante';
    var fotoPerfil='';
    if(clienteLogado){autor=clienteLogado.nome;fotoPerfil=clienteLogado.fotoPerfil||'';}
    if(barbeiroLogado){autor=barbeiroLogado.nome;fotoPerfil=barbeiroLogado.fotoPerfil||'';}
    
    var doc=await db.collection('lives').doc('live_atual').get();
    if(!doc.exists||!doc.data().ativa)return;
    var chat=doc.data().chat||[];
    chat.push({autor,texto,fotoPerfil,data:new Date().toISOString()});
    if(chat.length>100)chat=chat.slice(-100);
    await db.collection('lives').doc('live_atual').update({chat});liveChatMessages=chat;atualizarChat();input.value='';
}

function atualizarChat(){
    var c=document.getElementById('liveChatContainer');if(!c)return;
    if(!liveChatMessages||liveChatMessages.length===0){c.innerHTML='<p style="color:#6B7280;text-align:center;">💬 Chat vazio</p>';return;}
    c.innerHTML=liveChatMessages.map(function(msg){
        var h=new Date(msg.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        var avatar=msg.fotoPerfil?'<img src="'+msg.fotoPerfil+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;">':'<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#D4A84B;text-align:center;line-height:24px;font-size:12px;margin-right:6px;color:#1A1A1A;">👤</span>';
        return'<div class="live-chat-message" style="display:flex;align-items:flex-start;">'+avatar+'<div><span class="autor" style="color:#D4A84B;font-weight:700;font-size:12px;">'+msg.autor+'</span> <span style="font-size:10px;color:#6B7280;">'+h+'</span><div class="texto" style="color:#B0B0B0;">'+msg.texto+'</div></div></div>';
    }).join('');
    c.scrollTop=c.scrollHeight;
}

async function verificarLiveAtiva(){var doc=await db.collection('lives').doc('live_atual').get();var ativa=doc.exists&&doc.data().ativa;var b1=document.getElementById('liveBadgeCliente'),b2=document.getElementById('liveBadgeBarbeiro');if(b1)b1.style.display=ativa?'inline-block':'none';if(b2)b2.style.display=ativa?'inline-block':'none';}

// ==========================================================
// ===== DEMAIS FUNÇÕES (AGENDAMENTOS, PLANOS, POSTS, ETC) =====
// ==========================================================
// ... (manter todas as funções existentes de agendamentos, planos, anúncios, feed, posts, perfil, horários, etc.)

// ==========================================================
// ===== NAVEGAÇÃO =====
// ==========================================================
function mostrarTela(id){
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
    var el=document.getElementById(id);if(el)el.classList.add('active');
    var nc=document.getElementById('bottomNavCliente'),nb=document.getElementById('bottomNavBarbeiro');
    var tc=['homeClienteScreen','agendamentoScreen','galeriaCortesScreen','reelsScreen','anunciosScreen','liveScreen','perfilClienteScreen','detalhePostScreen','pagamentoScreen'];
    var tb=['homeBarbeiroScreen','criarPostScreen','extratoScreen','criarPlanoScreen','editarPlanoScreen','horariosTrabalhoScreen','anunciosScreen','liveScreen','perfilBarbeiroScreen'];
    if(tc.includes(id)){if(nc)nc.style.display='flex';if(nb)nb.style.display='none';}
    else if(tb.includes(id)){if(nb)nb.style.display='flex';if(nc)nc.style.display='none';}
    else{if(nc)nc.style.display='none';if(nb)nb.style.display='none';}
    if(id==='homeClienteScreen'){carregarFeedCliente();carregarAgendaCliente();verificarLiveAtiva();}
    if(id==='homeBarbeiroScreen'){carregarAgendamentosBarbeiro();carregarPlanos();calcularFaturamento();carregarMeusPosts();verificarLiveAtiva();}
    if(id==='anunciosScreen'){carregarAnuncios();if(barbeiroLogado)document.getElementById('formAnuncio').style.display='block';else document.getElementById('formAnuncio').style.display='none';}
    if(id==='liveScreen'){carregarLive();}
    if(id==='perfilClienteScreen')carregarPerfilCliente();
    if(id==='perfilBarbeiroScreen')carregarPerfilBarbeiro();
    if(id==='galeriaCortesScreen')carregarGaleria();
    if(id==='reelsScreen')carregarReels();
    if(id==='horariosTrabalhoScreen')carregarHorarios();
    window.scrollTo(0,0);
}

// ==========================================================
// ===== INICIALIZAÇÃO =====
// ==========================================================
document.addEventListener('DOMContentLoaded',function(){
    console.log('🚀 Barbearia RM');
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
    document.getElementById('bottomNavCliente').style.display='none';
    document.getElementById('bottomNavBarbeiro').style.display='none';
    document.getElementById('loginFormCliente').style.display='none';
    document.getElementById('loginFormBarbeiro').style.display='none';
    restaurarSessao().then(function(r){if(!r)document.getElementById('loginScreen').classList.add('active');});
    verificarLiveAtiva();
    if(window.location.search.includes('live=1')){setTimeout(function(){mostrarTela('liveScreen');},1000);}
    console.log('✅ Pronto!');
});

window.addEventListener('beforeunload',function(){desconectarLive();});
