/* ==========================================================
   BARBEARIA RM - COMPLETO FINAL CORRIGIDO
   ========================================================== */
const firebaseConfig={apiKey:"AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",authDomain:"barbearia-rm.firebaseapp.com",projectId:"barbearia-rm",storageBucket:"barbearia-rm.firebasestorage.app",messagingSenderId:"512819922057",appId:"1:512819922057:web:6a913791cb6435e4f63258",measurementId:"G-TKVLVLPBJH"};
firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();
db.settings({ignoreUndefinedProperties:true,merge:true});
console.log('🔥 Firebase OK');

let clienteLogado=null,barbeiroLogado=null,postSelecionadoId=null;
let liveStream=null,liveStreamLocal=null,liveAtiva=!1,gravandoTrecho=!1,mediaRecorder=null,recordedChunks=[],trechosGravados=[],efeitoLiveAtual='none',telaLiveAtual='camera',liveTimerInterval=null,liveDuracao=0,liveFacingMode='user';
let anuncioAutoAtivo=!1,anuncioAutoInterval=null,anuncioAutoTimeout=null,anuncioImagemAuto=null,anuncioTextoAuto='';
let sorteioAtivo=!1,participantesSorteio=[],premioSorteio='';
let liveAtivaGeral=!1,liveChatListener=null,liveFrameInterval=null;
let mediaRecorderAudio=null,audioChunks=[],gravandoAudio=!1,typingTimeout=null;
let imagemBase64='',videoBase64='';

// ==========================================================
// NAVEGAÇÃO
// ==========================================================
function mostrarTela(t){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    let id=t==='login'?'loginScreen':t+'Screen';
    let el=document.getElementById(id);if(el)el.classList.add('active');
    atualizarBottomNav(t);carregarDadosTela(t);window.scrollTo(0,0);
}
function atualizarBottomNav(t){
    let nc=document.getElementById('bottomNavCliente'),nb=document.getElementById('bottomNavBarbeiro');
    if(nc)nc.style.display='none';if(nb)nb.style.display='none';
    let tc=['homeCliente','agendamento','galeriaCortes','reels','anuncios','live','perfilCliente','socialCliente'];
    let tb=['homeBarbeiro','criarPost','extrato','criarPlano','horariosTrabalho','perfilBarbeiro','socialBarbeiro'];
    if(tc.includes(t)&&clienteLogado){if(nc)nc.style.display='flex';}
    else if(tb.includes(t)&&barbeiroLogado){if(nb)nb.style.display='flex';}
}
function carregarDadosTela(t){
    switch(t){
        case 'homeCliente':carregarFeedCliente();carregarAgendaCliente();break;
        case 'homeBarbeiro':carregarAgendamentosBarbeiro();carregarPlanos();calcularFaturamento();carregarMeusPosts();carregarClientesCadastrados();break;
        case 'agendamento':carregarOpcoesAgendamento();break;
        case 'anuncios':carregarAnuncios();break;
        case 'perfilCliente':carregarPerfilCliente();break;
        case 'perfilBarbeiro':carregarPerfilBarbeiro();carregarClientesCadastrados();break;
        case 'live':carregarLiveTela();break;
        case 'socialCliente':carregarSocialCliente();carregarConversasSocial();break;
        case 'socialBarbeiro':carregarSocialBarbeiro();carregarConversasSocialBarbeiro();break;
        case 'extrato':calcularExtrato('hoje');break;
    }
}
function mostrarToast(m,tp){
    let t=document.getElementById('toast');if(!t)return;
    t.textContent=m;t.className='toast '+(tp||'info');t.style.display='block';
    clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3000);
}
function mostrarFormularioLogin(t){
    let fc=document.getElementById('loginFormCliente'),fb=document.getElementById('loginFormBarbeiro');
    if(fc)fc.classList.remove('show');if(fb)fb.classList.remove('show');
    if(t==='cliente'&&fc)fc.classList.add('show');if(t==='barbeiro'&&fb)fb.classList.add('show');
}
function fecharFormulariosLogin(){
    let fc=document.getElementById('loginFormCliente'),fb=document.getElementById('loginFormBarbeiro');
    if(fc)fc.classList.remove('show');if(fb)fb.classList.remove('show');
}

// ==========================================================
// SESSÃO
// ==========================================================
function salvarSessao(t,d){let s={tipo:t,id:d.id,nome:d.nome,email:d.email,celular:d.celular||'',senha:d.senha||'',fotoPerfil:d.fotoPerfil||'',timestamp:Date.now()};localStorage.setItem('barbeariaRM_sessao',JSON.stringify(s));}
function carregarSessao(){let d=localStorage.getItem('barbeariaRM_sessao');if(!d)return null;try{let s=JSON.parse(d);if((Date.now()-s.timestamp)/86400000>30){limparSessao();return null;}return s;}catch(e){limparSessao();return null;}}
function limparSessao(){localStorage.removeItem('barbeariaRM_sessao');}
async function restaurarSessao(){
    let s=carregarSessao();if(!s)return!1;
    try{
        if(s.tipo==='cliente'){let sn=await db.collection('clientes').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};marcarClienteOnline(clienteLogado);return!0;}}
        else{let sn=await db.collection('barbeiros').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};return!0;}}
    }catch(e){}
    limparSessao();return!1;
}

// ==========================================================
// LOGIN / CADASTRO
// ==========================================================
async function loginCliente(){let e=document.getElementById('loginEmailCliente').value.trim(),s=document.getElementById('loginSenhaCliente').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{let sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};salvarSessao('cliente',clienteLogado);marcarClienteOnline(clienteLogado);document.getElementById('loginEmailCliente').value='';document.getElementById('loginSenhaCliente').value='';fecharFormulariosLogin();document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeCliente');}catch(er){mostrarToast('❌ Erro!','error');}}
async function loginBarbeiro(){let e=document.getElementById('loginEmailBarbeiro').value.trim(),s=document.getElementById('loginSenhaBarbeiro').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{let sn=await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};salvarSessao('barbeiro',barbeiroLogado);document.getElementById('loginEmailBarbeiro').value='';document.getElementById('loginSenhaBarbeiro').value='';fecharFormulariosLogin();document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeBarbeiro');}catch(er){mostrarToast('❌ Erro!','error');}}
async function cadastrarCliente(){let n=document.getElementById('cadNomeCliente').value.trim(),e=document.getElementById('cadEmailCliente').value.trim(),c=document.getElementById('cadCelularCliente').value.trim(),s=document.getElementById('cadSenhaCliente').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{let sn=await db.collection('clientes').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email existe!','error');return;}let id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',online:!1,notificacoes:!0,dataCriacao:new Date().toISOString()};await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;salvarSessao('cliente',cl);marcarClienteOnline(cl);document.getElementById('cadNomeCliente').value='';document.getElementById('cadEmailCliente').value='';document.getElementById('cadCelularCliente').value='';document.getElementById('cadSenhaCliente').value='';mostrarToast('✅ OK!','success');mostrarTela('homeCliente');}catch(er){mostrarToast('❌ Erro!','error');}}
async function cadastrarBarbeiro(){let n=document.getElementById('cadNomeBarbeiro').value.trim(),e=document.getElementById('cadEmailBarbeiro').value.trim(),c=document.getElementById('cadCelularBarbeiro').value.trim(),s=document.getElementById('cadSenhaBarbeiro').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{let sn=await db.collection('barbeiros').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email existe!','error');return;}let id=Date.now().toString(),bb={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};await db.collection('barbeiros').doc(id).set(bb);barbeiroLogado=bb;salvarSessao('barbeiro',bb);document.getElementById('cadNomeBarbeiro').value='';document.getElementById('cadEmailBarbeiro').value='';document.getElementById('cadCelularBarbeiro').value='';document.getElementById('cadSenhaBarbeiro').value='';mostrarToast('✅ OK!','success');mostrarTela('homeBarbeiro');}catch(er){mostrarToast('❌ Erro!','error');}}
function sairCliente(){if(!confirm('Tem certeza?'))return;if(clienteLogado)removerClienteOnline(clienteLogado.id);clienteLogado=null;limparSessao();fecharFormulariosLogin();mostrarTela('login');mostrarToast('👋 Até logo!','info');}
function sairBarbeiro(){if(!confirm('Tem certeza?'))return;barbeiroLogado=null;limparSessao();fecharFormulariosLogin();mostrarTela('login');mostrarToast('👋 Até logo!','info');}

// ==========================================================
// CLIENTES ONLINE
// ==========================================================
async function marcarClienteOnline(c){try{await db.collection('clientes').doc(c.id).update({online:!0,ultimoAcesso:new Date().toISOString()});}catch(e){}}
async function removerClienteOnline(id){try{await db.collection('clientes').doc(id).update({online:!1});}catch(e){}}
async function carregarClientesOnline(){try{let sn=await db.collection('clientes').where('online','==',!0).get();return sn.docs.map(d=>({id:d.id,...d.data()}));}catch(e){return[];}}
async function carregarTodosClientes(){try{let sn=await db.collection('clientes').orderBy('nome').get();return sn.docs.map(d=>({id:d.id,...d.data()}));}catch(e){return[];}}
async function carregarClientesCadastrados(){if(!barbeiroLogado)return;let el=document.getElementById('totalClientesBarbeiro');if(!el)return;try{let sn=await db.collection('clientes').get();el.textContent=sn.size+' clientes';}catch(e){}}

// ==========================================================
// UPLOAD IMAGEM/VIDEO POST
// ==========================================================
function previewImagemPost(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){imagemBase64=ev.target.result;document.getElementById('postImagem').value=imagemBase64;document.getElementById('imagemPreviewImg').src=imagemBase64;document.getElementById('imagemPreview').style.display='block';document.getElementById('imagemUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerImagemPost(){imagemBase64='';document.getElementById('postImagem').value='';document.getElementById('imagemPreview').style.display='none';document.getElementById('imagemUploadArea').style.display='block';document.getElementById('postImagemInput').value='';}
function previewVideoPost(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){videoBase64=ev.target.result;document.getElementById('postVideo').value=videoBase64;document.getElementById('videoPreviewVideo').src=videoBase64;document.getElementById('videoPreview').style.display='block';document.getElementById('videoUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerVideoPost(){videoBase64='';document.getElementById('postVideo').value='';document.getElementById('videoPreview').style.display='none';document.getElementById('videoUploadArea').style.display='block';document.getElementById('postVideoInput').value='';}

// ==========================================================
// FEED / POSTS / AGENDAMENTOS / PLANOS / EXTRATO / PERFIL
// (mantenha as funções existentes: criarPost, carregarFeedCliente, carregarMeusPosts, excluirMeuPost, abrirComentarios, carregarComentarios, adicionarComentario, fecharModalComentario, carregarOpcoesAgendamento, agendarCorte, carregarAgendaCliente, carregarAgendamentosBarbeiro, confirmarAgendamento, cancelarAgendamento, concluirAgendamento, carregarPlanos, criarPlano, editarPlano, excluirPlano, calcularExtrato, carregarAnuncios, carregarPerfilCliente, salvarPerfilCliente, carregarPerfilBarbeiro, salvarPerfilBarbeiro, calcularFaturamento, verificarLiveBadge)
// ... (COLOQUE AQUI TODAS AS FUNÇÕES JÁ EXISTENTES)
// ==========================================================

// ==========================================================
// 🔴 LIVE CORRIGIDA - COM FRAMES PARA O CLIENTE VER
// ==========================================================
function carregarLiveTela(){
    let controls=document.getElementById('liveControlsCard');
    let btnIniciar=document.getElementById('btnIniciarLiveNaTela');
    let placeholder=document.getElementById('livePlaceholder');
    let placeholderText=document.getElementById('livePlaceholderText');
    if(btnIniciar)btnIniciar.style.display='none';
    
    if(barbeiroLogado){
        if(controls)controls.style.display='none';
        if(btnIniciar)btnIniciar.style.display='inline-block';
        if(placeholderText)placeholderText.textContent='Estúdio offline';
        if(!liveAtiva&&placeholder)placeholder.style.display='flex';
    }else if(clienteLogado){
        if(controls)controls.style.display='none';
        if(liveAtivaGeral){
            // LIVE ATIVA - Cliente assiste
            if(placeholder)placeholder.style.display='none';
            document.getElementById('liveStatus').style.display='block';
            iniciarVisualizacaoCliente();
        }else{
            if(placeholder)placeholder.style.display='flex';
            if(placeholderText)placeholderText.textContent='Nenhuma live no momento';
        }
    }else{
        if(controls)controls.style.display='none';
    }
    verificarLiveBadge();
}

// BARBEIRO INICIA LIVE E CAPTURA FRAMES
async function iniciarLive(){
    if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}
    try{
        console.log('🎥 Iniciando câmera...');
        let stream=await navigator.mediaDevices.getUserMedia({
            video:{width:{ideal:640},height:{ideal:480},facingMode:liveFacingMode},
            audio:{echoCancellation:!0,noiseSuppression:!0}
        });
        liveStreamLocal=stream;liveStream=stream;liveAtiva=!0;liveAtivaGeral=!0;
        
        // Mostrar no player do barbeiro
        let videoEl=document.getElementById('liveVideo');
        videoEl.srcObject=stream;videoEl.muted=!0;videoEl.style.display='block';
        
        document.getElementById('livePlaceholder').style.display='none';
        document.getElementById('liveControlsCard').style.display='block';
        document.getElementById('liveStatus').style.display='block';
        
        // Timer
        liveDuracao=0;
        if(liveTimerInterval)clearInterval(liveTimerInterval);
        liveTimerInterval=setInterval(()=>{
            liveDuracao++;
            let h=Math.floor(liveDuracao/3600),m=Math.floor((liveDuracao%3600)/60),s=liveDuracao%60;
            document.getElementById('liveDuration').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
        },1000);
        
        // Salvar no Firebase
        await db.collection('lives').doc('live_atual').set({
            id:'live_atual',titulo:'Live Barbearia RM',barbeiroNome:barbeiroLogado.nome,
            ativa:!0,chat:[],viewers:0,likes:0,sorteioAtivo:!1,premioSorteio:'',
            dataInicio:new Date().toISOString()
        });
        
        // 🔥 INICIAR CAPTURA DE FRAMES (a cada 1.5 segundos)
        iniciarCapturaFrames();
        
        // Iniciar chat listener
        iniciarChatListenerLive();
        
        // Notificar clientes
        notificarClientesLive();
        
        mostrarToast('🔴 Live iniciada! Clientes notificados!','success');
        console.log('✅ Live iniciada com sucesso!');
    }catch(er){
        console.error('❌ Erro:',er);
        if(er.name==='NotAllowedError')mostrarToast('❌ Permissão de câmera negada!','error');
        else if(er.name==='NotFoundError')mostrarToast('❌ Nenhuma câmera encontrada!','error');
        else mostrarToast('❌ '+er.message,'error');
    }
}

// CAPTURAR FRAMES DO VÍDEO E ENVIAR PRO FIREBASE
function iniciarCapturaFrames(){
    if(liveFrameInterval)clearInterval(liveFrameInterval);
    let canvas=document.createElement('canvas');
    canvas.width=320;canvas.height=180;
    let ctx=canvas.getContext('2d');
    
    liveFrameInterval=setInterval(async()=>{
        if(!liveAtiva||!liveStreamLocal)return;
        try{
            let video=document.getElementById('liveVideo');
            if(!video||video.videoWidth===0)return;
            ctx.drawImage(video,0,0,320,180);
            let frameData=canvas.toDataURL('image/jpeg',0.5);
            await db.collection('lives').doc('live_atual').update({
                ultimoFrame:frameData,
                frameTimestamp:Date.now()
            });
        }catch(e){}
    },1500);
}

// CLIENTE ASSISTINDO - RECEBE OS FRAMES
function iniciarVisualizacaoCliente(){
    console.log('👀 Cliente assistindo live...');
    
    // Remover frame antigo se existir
    let oldFrame=document.getElementById('liveFrameImg');
    if(oldFrame)oldFrame.remove();
    
    // Criar elemento de imagem para mostrar os frames
    let frameImg=document.createElement('img');
    frameImg.id='liveFrameImg';
    frameImg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;';
    
    // Inserir no container do player
    let playerDiv=document.getElementById('livePlayerContainer').querySelector('div');
    playerDiv.appendChild(frameImg);
    
    // Buscar frames a cada 1.5 segundos
    let frameInterval=setInterval(async()=>{
        try{
            let doc=await db.collection('lives').doc('live_atual').get();
            if(!doc.exists||!doc.data().ativa){
                clearInterval(frameInterval);
                if(frameImg)frameImg.remove();
                document.getElementById('livePlaceholder').style.display='flex';
                document.getElementById('liveStatus').style.display='none';
                liveAtivaGeral=!1;
                return;
            }
            let frame=doc.data().ultimoFrame;
            if(frame&&frameImg){
                frameImg.src=frame;
            }
            // Atualizar viewers
            document.getElementById('liveViewerCount').textContent='👥 '+(doc.data().viewers||0);
            document.getElementById('liveLikeCount').textContent=doc.data().likes||0;
        }catch(e){}
    },1500);
    
    // Incrementar viewer
    db.collection('lives').doc('live_atual').update({
        viewers:firebase.firestore.FieldValue.increment(1)
    });
    
    // Iniciar chat listener
    iniciarChatListenerLive();
}

// CHAT LISTENER (FUNCIONA PARA AMBOS)
function iniciarChatListenerLive(){
    if(liveChatListener)liveChatListener();
    
    liveChatListener=db.collection('lives').doc('live_atual')
        .onSnapshot((doc)=>{
            if(!doc.exists||!doc.data().ativa)return;
            
            let data=doc.data();
            let chat=data.chat||[];
            let container=document.getElementById('liveChatMessages');
            if(!container)return;
            
            let meuNome=clienteLogado?.nome||barbeiroLogado?.nome||'';
            
            // Construir HTML do chat
            let html='';
            
            // Mostrar sorteio se ativo
            if(data.sorteioAtivo){
                html+='<div style="background:rgba(255,215,0,0.2);padding:14px;border-radius:12px;margin:8px 0;border:2px solid #FFD700;text-align:center;align-self:stretch;animation:msgIn 0.3s ease-out;"><div style="font-size:24px;">🎉</div><strong style="color:#FFD700;font-size:16px;">SORTEIO ATIVO!</strong><br><span style="color:white;font-size:14px;">Prêmio: '+data.premioSorteio+'</span><br><span style="font-size:11px;color:#FFD700;">Digite <b>!PARTICIPAR</b> no chat</span></div>';
            }
            
            if(chat.length===0&&!data.sorteioAtivo){
                html+='<p style="color:#aaa;text-align:center;font-size:12px;align-self:center;">💬 Seja o primeiro a comentar!</p>';
            }
            
            chat.forEach(m=>{
                let isSent=m.autor===meuNome||m.autor==='✂️ '+meuNome;
                let bubbleClass=isSent?'sent':'received';
                let time=m.data?new Date(m.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
                html+='<div class="chat-bubble '+bubbleClass+'">'+(!isSent?'<div class="msg-sender">'+m.autor+'</div>':'')+m.texto+'<div class="msg-time">'+time+'</div></div>';
            });
            
            container.innerHTML=html;
            container.scrollTop=container.scrollHeight;
            
            // Atualizar likes e viewers
            let likeEl=document.getElementById('liveLikeCount');
            if(likeEl)likeEl.textContent=data.likes||0;
            let viewerEl=document.getElementById('liveViewerCount');
            if(viewerEl)viewerEl.textContent='👥 '+(data.viewers||0);
            
            // Sincronizar estado do sorteio
            sorteioAtivo=data.sorteioAtivo||!1;
            premioSorteio=data.premioSorteio||'';
        });
}

// ENVIAR CHAT
async function enviarChatLive(){
    let input=document.getElementById('liveChatInput');if(!input)return;
    let msg=input.value.trim();if(!msg)return;
    let nome='Visitante',foto='logobarbearia-rm.png';
    if(clienteLogado){nome=clienteLogado.nome;foto=clienteLogado.fotoPerfil||'logobarbearia-rm.png';}
    else if(barbeiroLogado){nome='✂️ '+barbeiroLogado.nome;foto=barbeiroLogado.fotoPerfil||'logobarbearia-rm.png';}
    
    try{
        await db.collection('lives').doc('live_atual').update({
            chat:firebase.firestore.FieldValue.arrayUnion({
                autor:nome,foto,texto:msg,data:new Date().toISOString()
            })
        });
        input.value='';
        
        // Verificar comando !PARTICIPAR
        if(msg.toUpperCase()==='!PARTICIPAR'&&sorteioAtivo){
            await participarSorteioFirebase(nome);
        }
    }catch(e){console.error('Erro ao enviar chat:',e);}
}

// SORTEIO - INICIAR (BARBEIRO)
async function iniciarSorteio(premio){
    if(!barbeiroLogado)return;
    if(!premio)premio='Corte Grátis';
    
    try{
        await db.collection('lives').doc('live_atual').update({
            sorteioAtivo:!0,
            premioSorteio:premio,
            participantesSorteio:[]
        });
        sorteioAtivo=!0;
        premioSorteio=premio;
        participantesSorteio=[];
        mostrarToast('🎉 Sorteio iniciado!','success');
    }catch(e){console.error('Erro ao iniciar sorteio:',e);}
}

// PARTICIPAR DO SORTEIO
async function participarSorteioFirebase(nome){
    try{
        let doc=await db.collection('lives').doc('live_atual').get();
        if(!doc.exists)return;
        let participantes=doc.data().participantesSorteio||[];
        if(participantes.includes(nome)){
            mostrarToast('⚠️ Você já está participando!','info');
            return;
        }
        participantes.push(nome);
        await db.collection('lives').doc('live_atual').update({participantesSorteio:participantes});
        participantesSorteio=participantes;
        mostrarToast('✅ '+nome+' entrou no sorteio!','success');
    }catch(e){}
}

// REALIZAR SORTEIO
async function realizarSorteio(){
    if(!barbeiroLogado)return;
    try{
        let doc=await db.collection('lives').doc('live_atual').get();
        if(!doc.exists)return;
        let participantes=doc.data().participantesSorteio||[];
        if(participantes.length===0){mostrarToast('❌ Ninguém participou!','error');return;}
        
        let vencedor=participantes[Math.floor(Math.random()*participantes.length)];
        
        // Anunciar vencedor no chat
        await db.collection('lives').doc('live_atual').update({
            chat:firebase.firestore.FieldValue.arrayUnion({
                autor:'🤖 Sistema',foto:'',texto:'🏆 O vencedor do sorteio é: '+vencedor+'! Prêmio: '+premioSorteio,
                data:new Date().toISOString()
            }),
            sorteioAtivo:!1,
            participantesSorteio:[]
        });
        
        sorteioAtivo=!1;
        participantesSorteio=[];
        mostrarToast('🏆 '+vencedor+' venceu!','success');
    }catch(e){}
}

function participarSorteio(nome){
    participarSorteioFirebase(nome);
}

// NOTIFICAR CLIENTES
async function notificarClientesLive(){
    try{
        let sn=await db.collection('clientes').get();
        let count=0;
        sn.forEach(async(doc)=>{
            await db.collection('notificacoes').add({
                clienteId:doc.id,titulo:'🔴 LIVE AO VIVO!',
                mensagem:'Barbearia RM está transmitindo agora! Assista!',
                lida:!1,data:new Date().toISOString()
            });
            count++;
        });
        console.log('📢 '+count+' clientes notificados');
    }catch(e){}
}

// PARAR LIVE
async function pararLive(){
    if(anuncioAutoAtivo)pararAnuncioAutomatico();
    if(gravandoTrecho)pararGravacaoTrecho();
    if(liveTimerInterval){clearInterval(liveTimerInterval);liveTimerInterval=null;}
    if(liveFrameInterval){clearInterval(liveFrameInterval);liveFrameInterval=null;}
    if(liveChatListener){liveChatListener();liveChatListener=null;}
    if(liveStreamLocal){liveStreamLocal.getTracks().forEach(t=>t.stop());liveStreamLocal=null;}
    liveStream=null;liveAtiva=!1;liveAtivaGeral=!1;
    
    let v=document.getElementById('liveVideo');if(v){v.srcObject=null;v.style.display='none';}
    let f=document.getElementById('liveFrameImg');if(f)f.remove();
    document.getElementById('livePlaceholder').style.display='flex';
    document.getElementById('liveControlsCard').style.display='none';
    document.getElementById('liveStatus').style.display='none';
    document.getElementById('liveDuration').textContent='00:00:00';
    document.getElementById('overlayComercial').style.display='none';
    document.getElementById('overlayAnuncio').style.display='none';
    
    await db.collection('lives').doc('live_atual').update({ativa:!1,dataFim:new Date().toISOString()});
    carregarLiveTela();
}

// ... (MANTENHA TODAS AS OUTRAS FUNÇÕES: curtirLive, reagirLive, iniciarGravacaoTrecho, pararGravacaoTrecho, salvarTrechosLive, trocarCameraLive, aplicarEfeitoLive, mostrarTelaLive, carregarComercialLive, compartilharLive, finalizarLive, carregarAnuncioAuto, iniciarAnuncioAutomatico, mostrarAnuncioAuto, esconderAnuncioAuto, fecharAnuncioManual, pararAnuncioAutomatico)
// ==========================================================

// ==========================================================
// EVENT LISTENERS
// ==========================================================
function setupEventListeners(){
    // ... (mantenha todos os listeners existentes)
    
    // Live
    document.getElementById('btnIniciarLiveNaTela')?.addEventListener('click',iniciarLive);
    document.getElementById('btnSendLiveChat')?.addEventListener('click',enviarChatLive);
    document.getElementById('liveChatInput')?.addEventListener('keypress',e=>{if(e.key==='Enter')enviarChatLive();});
    document.getElementById('btnVoltarLive')?.addEventListener('click',()=>{
        if(liveAtiva&&barbeiroLogado)pararLive();
        if(barbeiroLogado)mostrarTela('homeBarbeiro');
        else if(clienteLogado)mostrarTela('homeCliente');
        else mostrarTela('login');
    });
    
    // Sorteio
    document.getElementById('btnIniciarSorteio')?.addEventListener('click',function(){
        let p=document.getElementById('premioSorteioInput').value.trim()||'Corte Grátis';
        iniciarSorteio(p);
    });
    document.getElementById('btnRealizarSorteio')?.addEventListener('click',realizarSorteio);
    
    // ... (mantenha todos os outros listeners)
}

document.addEventListener('DOMContentLoaded',async function(){
    setupEventListeners();
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('bottomNavCliente').style.display='none';
    document.getElementById('bottomNavBarbeiro').style.display='none';
    fecharFormulariosLogin();
    let restaurado=await restaurarSessao();
    if(restaurado){
        if(clienteLogado){document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;mostrarTela('homeCliente');}
        else if(barbeiroLogado){document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;mostrarTela('homeBarbeiro');}
    }else{document.getElementById('loginScreen').classList.add('active');}
    verificarLiveBadge();
    console.log('✅ Pronto!');
});
window.addEventListener('beforeunload',()=>{if(clienteLogado)removerClienteOnline(clienteLogado.id);});
