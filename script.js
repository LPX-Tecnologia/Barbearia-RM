/* ==========================================================
   BARBEARIA RM - COMPLETO FINAL COM WHATSAPP
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
    let tc=['homeCliente','agendamento','galeriaCortes','reels','anuncios','live','perfilCliente','socialCliente','notificacoes'];
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
        case 'notificacoes':carregarNotificacoesCliente();break;
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
// SESSÃO / LOGIN / CADASTRO / CLIENTES ONLINE / FEED / POSTS
// AGENDAMENTOS / PLANOS / EXTRATO / PERFIL / ANÚNCIOS
// (MANTENHA TODAS AS FUNÇÕES EXISTENTES AQUI)
// ==========================================================

// ==========================================================
// 🔴 LIVE CORRIGIDA COM FRAMES
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
            if(placeholder)placeholder.style.display='none';
            document.getElementById('liveStatus').style.display='block';
            iniciarVisualizacaoCliente();
        }else{
            if(placeholder)placeholder.style.display='flex';
            if(placeholderText)placeholderText.textContent='Nenhuma live no momento';
        }
    }
    verificarLiveBadge();
}
async function iniciarLive(){
    if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}
    try{
        let stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:liveFacingMode},audio:{echoCancellation:!0,noiseSuppression:!0}});
        liveStreamLocal=stream;liveStream=stream;liveAtiva=!0;liveAtivaGeral=!0;
        let videoEl=document.getElementById('liveVideo');videoEl.srcObject=stream;videoEl.muted=!0;videoEl.style.display='block';
        document.getElementById('livePlaceholder').style.display='none';
        document.getElementById('liveControlsCard').style.display='block';
        document.getElementById('liveStatus').style.display='block';
        liveDuracao=0;if(liveTimerInterval)clearInterval(liveTimerInterval);
        liveTimerInterval=setInterval(()=>{liveDuracao++;let h=Math.floor(liveDuracao/3600),m=Math.floor((liveDuracao%3600)/60),s=liveDuracao%60;document.getElementById('liveDuration').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');},1000);
        await db.collection('lives').doc('live_atual').set({id:'live_atual',titulo:'Live Barbearia RM',barbeiroNome:barbeiroLogado.nome,ativa:!0,chat:[],viewers:0,likes:0,sorteioAtivo:!1,premioSorteio:'',participantesSorteio:[],dataInicio:new Date().toISOString()});
        iniciarCapturaFrames();iniciarChatListenerLive();notificarClientesLive();
        setTimeout(()=>{notificarClientesWhatsApp();},3000);
        mostrarToast('🔴 Live iniciada!','success');
    }catch(er){if(er.name==='NotAllowedError')mostrarToast('❌ Permissão negada!','error');else mostrarToast('❌ '+er.message,'error');}
}
function iniciarCapturaFrames(){
    if(liveFrameInterval)clearInterval(liveFrameInterval);
    let canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;let ctx=canvas.getContext('2d');
    liveFrameInterval=setInterval(async()=>{if(!liveAtiva||!liveStreamLocal)return;try{let video=document.getElementById('liveVideo');if(!video||video.videoWidth===0)return;ctx.drawImage(video,0,0,320,180);let frameData=canvas.toDataURL('image/jpeg',0.5);await db.collection('lives').doc('live_atual').update({ultimoFrame:frameData,frameTimestamp:Date.now()});}catch(e){}},1500);
}
function iniciarVisualizacaoCliente(){
    let oldFrame=document.getElementById('liveFrameImg');if(oldFrame)oldFrame.remove();
    let frameImg=document.createElement('img');frameImg.id='liveFrameImg';frameImg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;';
    let playerDiv=document.getElementById('livePlayerContainer').querySelector('div');playerDiv.appendChild(frameImg);
    let frameInterval=setInterval(async()=>{try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa){clearInterval(frameInterval);if(frameImg)frameImg.remove();document.getElementById('livePlaceholder').style.display='flex';document.getElementById('liveStatus').style.display='none';liveAtivaGeral=!1;return;}let frame=doc.data().ultimoFrame;if(frame&&frameImg)frameImg.src=frame;document.getElementById('liveViewerCount').textContent='👥 '+(doc.data().viewers||0);document.getElementById('liveLikeCount').textContent=doc.data().likes||0;}catch(e){}},1500);
    db.collection('lives').doc('live_atual').update({viewers:firebase.firestore.FieldValue.increment(1)});
    iniciarChatListenerLive();
}
function iniciarChatListenerLive(){
    if(liveChatListener)liveChatListener();
    liveChatListener=db.collection('lives').doc('live_atual').onSnapshot((doc)=>{if(!doc.exists||!doc.data().ativa)return;let data=doc.data();let chat=data.chat||[];let container=document.getElementById('liveChatMessages');if(!container)return;let meuNome=clienteLogado?.nome||barbeiroLogado?.nome||'';let html='';if(data.sorteioAtivo){html+='<div style="background:rgba(255,215,0,0.2);padding:14px;border-radius:12px;margin:8px 0;border:2px solid #FFD700;text-align:center;align-self:stretch;animation:msgIn 0.3s ease-out;"><div style="font-size:24px;">🎉</div><strong style="color:#FFD700;font-size:16px;">SORTEIO ATIVO!</strong><br><span style="color:white;font-size:14px;">Prêmio: '+data.premioSorteio+'</span><br><span style="font-size:11px;color:#FFD700;">Digite <b>!PARTICIPAR</b> no chat</span></div>';}if(chat.length===0&&!data.sorteioAtivo){html+='<p style="color:#aaa;text-align:center;font-size:12px;align-self:center;">💬 Seja o primeiro!</p>';}chat.forEach(m=>{let isSent=m.autor===meuNome||m.autor==='✂️ '+meuNome;let bubbleClass=isSent?'sent':'received';let time=m.data?new Date(m.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';html+='<div class="chat-bubble '+bubbleClass+'">'+(!isSent?'<div class="msg-sender">'+m.autor+'</div>':'')+m.texto+'<div class="msg-time">'+time+'</div></div>';});container.innerHTML=html;container.scrollTop=container.scrollHeight;document.getElementById('liveLikeCount').textContent=data.likes||0;document.getElementById('liveViewerCount').textContent='👥 '+(data.viewers||0);sorteioAtivo=data.sorteioAtivo||!1;premioSorteio=data.premioSorteio||'';participantesSorteio=data.participantesSorteio||[];});
}
async function enviarChatLive(){let input=document.getElementById('liveChatInput');if(!input)return;let msg=input.value.trim();if(!msg)return;let nome='Visitante',foto='logobarbearia-rm.png';if(clienteLogado){nome=clienteLogado.nome;foto=clienteLogado.fotoPerfil||'logobarbearia-rm.png';}else if(barbeiroLogado){nome='✂️ '+barbeiroLogado.nome;foto=barbeiroLogado.fotoPerfil||'logobarbearia-rm.png';}try{await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:nome,foto,texto:msg,data:new Date().toISOString()})});input.value='';if(msg.toUpperCase()==='!PARTICIPAR'&&sorteioAtivo){await participarSorteioFirebase(nome);}}catch(e){}}
async function participarSorteioFirebase(nome){try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists)return;let p=doc.data().participantesSorteio||[];if(p.includes(nome)){mostrarToast('⚠️ Já está participando!','info');return;}p.push(nome);await db.collection('lives').doc('live_atual').update({participantesSorteio:p});mostrarToast('✅ '+nome+' entrou!','success');}catch(e){}}
async function iniciarSorteio(premio){if(!barbeiroLogado)return;if(!premio)premio='Corte Grátis';try{await db.collection('lives').doc('live_atual').update({sorteioAtivo:!0,premioSorteio:premio,participantesSorteio:[]});sorteioAtivo=!0;premioSorteio=premio;participantesSorteio=[];mostrarToast('🎉 Sorteio iniciado!','success');}catch(e){}}
async function realizarSorteio(){if(!barbeiroLogado)return;try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists)return;let p=doc.data().participantesSorteio||[];if(p.length===0){mostrarToast('❌ Ninguém participou!','error');return;}let vencedor=p[Math.floor(Math.random()*p.length)];await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:'🤖 Sistema',foto:'',texto:'🏆 Vencedor: '+vencedor+'! Prêmio: '+premioSorteio,data:new Date().toISOString()}),sorteioAtivo:!1,participantesSorteio:[]});sorteioAtivo=!1;participantesSorteio=[];mostrarToast('🏆 '+vencedor+' venceu!','success');}catch(e){}}
async function curtirLive(){try{await db.collection('lives').doc('live_atual').update({likes:firebase.firestore.FieldValue.increment(1)});let heart=document.createElement('div');heart.textContent='❤️';heart.style.cssText='position:absolute;font-size:30px;pointer-events:none;z-index:20;animation:floatHeart 2s ease-out forwards;left:'+(Math.random()*80+10)+'%;bottom:20%;';document.getElementById('livePlayerContainer').appendChild(heart);setTimeout(()=>heart.remove(),2000);}catch(e){}}
async function reagirLive(emoji){try{let r=document.createElement('div');r.textContent=emoji;r.style.cssText='position:absolute;font-size:35px;pointer-events:none;z-index:20;animation:floatReaction 3s ease-out forwards;left:'+(Math.random()*80+10)+'%;bottom:30%;';document.getElementById('livePlayerContainer').appendChild(r);setTimeout(()=>r.remove(),3000);}catch(e){}}
async function pararLive(){if(anuncioAutoAtivo)pararAnuncioAutomatico();if(gravandoTrecho)pararGravacaoTrecho();if(liveTimerInterval){clearInterval(liveTimerInterval);}if(liveFrameInterval){clearInterval(liveFrameInterval);}if(liveChatListener){liveChatListener();}if(liveStreamLocal){liveStreamLocal.getTracks().forEach(t=>t.stop());}liveStream=null;liveStreamLocal=null;liveAtiva=!1;liveAtivaGeral=!1;let v=document.getElementById('liveVideo');if(v){v.srcObject=null;v.style.display='none';}let f=document.getElementById('liveFrameImg');if(f)f.remove();document.getElementById('livePlaceholder').style.display='flex';document.getElementById('liveControlsCard').style.display='none';document.getElementById('liveStatus').style.display='none';document.getElementById('liveDuration').textContent='00:00:00';await db.collection('lives').doc('live_atual').update({ativa:!1});carregarLiveTela();}
function iniciarGravacaoTrecho(){if(!liveStream||gravandoTrecho)return;try{mediaRecorder=new MediaRecorder(liveStream,MediaRecorder.isTypeSupported('video/webm')?{mimeType:'video/webm'}:{});}catch(e){mediaRecorder=new MediaRecorder(liveStream);}recordedChunks=[];mediaRecorder.ondataavailable=e=>{if(e.data.size>0)recordedChunks.push(e.data);};mediaRecorder.onstop=()=>{let blob=new Blob(recordedChunks,{type:'video/webm'}),url=URL.createObjectURL(blob);trechosGravados.push({id:Date.now(),url,blob});mostrarToast('✅ Trecho salvo!','success');};mediaRecorder.start(1000);gravandoTrecho=!0;document.getElementById('btnRecordClip').style.display='none';document.getElementById('btnStopClip').style.display='inline-block';}
function pararGravacaoTrecho(){if(!gravandoTrecho||!mediaRecorder)return;mediaRecorder.stop();gravandoTrecho=!1;document.getElementById('btnRecordClip').style.display='inline-block';document.getElementById('btnStopClip').style.display='none';}
function salvarTrechosLive(){trechosGravados.forEach((c,i)=>{let a=document.createElement('a');a.href=c.url;a.download='clip-'+(i+1)+'.webm';a.click();});}
async function trocarCameraLive(){liveFacingMode=liveFacingMode==='user'?'environment':'user';if(liveStreamLocal)liveStreamLocal.getTracks().forEach(t=>t.stop());try{let stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:liveFacingMode,width:{ideal:640}},audio:!0});liveStreamLocal=stream;liveStream=stream;document.getElementById('liveVideo').srcObject=stream;}catch(e){}}
function aplicarEfeitoLive(efeito){let v=document.getElementById('liveVideo');if(!v)return;v.style.filter='';if(efeito==='bw')v.style.filter='grayscale(100%)';else if(efeito==='sepia')v.style.filter='sepia(80%)';else if(efeito==='neon')v.style.filter='brightness(1.2) contrast(1.3) saturate(1.5)';}
function mostrarTelaLive(tipo){document.getElementById('overlayComercial').style.display='none';document.getElementById('overlayAnuncio').style.display='none';if(tipo==='comercial')document.getElementById('overlayComercial').style.display='block';else if(tipo==='anuncio')document.getElementById('overlayAnuncio').style.display='flex';}
function carregarComercialLive(event){let f=event.target.files[0];if(!f)return;let v=document.getElementById('comercialVideo');v.src=URL.createObjectURL(f);v.loop=!0;v.muted=!0;}
function compartilharLive(rede){let url=window.location.href,texto='🔴 Barbearia RM - Ao Vivo!';if(rede==='link'){navigator.clipboard.writeText(url);mostrarToast('📋 Link copiado!','success');}else if(rede==='whatsapp')window.open('https://wa.me/?text='+encodeURIComponent(texto+' '+url),'_blank');}
async function finalizarLive(){if(!confirm('Finalizar live?'))return;await pararLive();mostrarToast('✅ Finalizada!','info');}

// ==========================================================
// 📱 WHATSAPP - CONVIDAR CLIENTES
// ==========================================================
async function notificarClientesWhatsApp(){
    if(!barbeiroLogado)return;
    try{
        let sn=await db.collection('clientes').get();
        let urlLive=window.location.href.split('?')[0]+'?live=1';
        let notificados=0,semCelular=0;
        sn.forEach(async(doc)=>{
            let cliente=doc.data();
            if(cliente.celular&&cliente.celular.length>=10){
                let numero=cliente.celular.replace(/\D/g,'');
                if(numero.length===11)numero='55'+numero;
                if(numero.length===10)numero='55'+numero;
                let mensagem=encodeURIComponent('🔴 *BARBEARIA RM - AO VIVO!*\n\nOlá '+cliente.nome+'! A Barbearia RM está ao vivo!\n\n🎥 Assista: '+urlLive+'\n\n💬 Participe do chat!\n🎉 Concorra a sorteios!');
                let link='https://wa.me/'+numero+'?text='+mensagem;
                await db.collection('notificacoes').add({clienteId:cliente.id,clienteNome:cliente.nome,tipo:'whatsapp',titulo:'📱 Convite WhatsApp',mensagem:'Link gerado para '+cliente.nome,link:link,lida:!1,enviada:!1,data:new Date().toISOString()});
                notificados++;
            }else{semCelular++;}
        });
        setTimeout(()=>{mostrarToast('📱 '+notificados+' convites gerados!','success');document.getElementById('whatsappStatus').textContent='✅ '+notificados+' links gerados!';document.getElementById('whatsappStatus').style.color='#00cc66';},2000);
        await db.collection('lives').doc('live_atual').update({whatsappNotificados:notificados});
    }catch(e){}
}
async function enviarConvitesWhatsApp(){
    if(!barbeiroLogado)return;
    if(!confirm('Abrir WhatsApp para TODOS os clientes com celular?'))return;
    mostrarToast('📱 Abrindo convites...','info');
    try{
        let sn=await db.collection('clientes').get();
        let urlLive=window.location.href.split('?')[0]+'?live=1';
        let contador=0;
        for(let doc of sn.docs){
            let cliente=doc.data();
            if(cliente.celular&&cliente.celular.length>=10){
                let numero=cliente.celular.replace(/\D/g,'');
                if(numero.length>=10){
                    if(numero.length===11)numero='55'+numero;
                    if(numero.length===10)numero='55'+numero;
                    let mensagem=encodeURIComponent('🔴 *BARBEARIA RM - AO VIVO!*\n\nOlá '+cliente.nome+'! A Barbearia RM está ao vivo!\n\n🎥 Assista: '+urlLive+'\n\n💬 Participe do chat!\n🎉 Concorra a sorteios!');
                    let link='https://wa.me/'+numero+'?text='+mensagem;
                    if(contador<5){window.open(link,'_blank');}
                    contador++;
                    await new Promise(r=>setTimeout(r,300));
                }
            }
        }
        mostrarToast('📱 '+contador+' convites abertos!','success');
    }catch(e){}
}
async function carregarNotificacoesCliente(){
    if(!clienteLogado)return;
    let container=document.getElementById('notificacoesContainer');if(!container)return;
    try{
        let sn=await db.collection('notificacoes').where('clienteId','==',clienteLogado.id).orderBy('data','desc').limit(20).get();
        let notificacoes=sn.docs.map(d=>({id:d.id,...d.data()}));
        if(notificacoes.length===0){container.innerHTML='<p style="color:#6B7280;">Nenhuma notificação</p>';return;}
        container.innerHTML=notificacoes.map(n=>'<div style="padding:12px;margin:6px 0;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid '+(n.lida?'#666':'#25D366')+';"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">'+(n.tipo==='whatsapp'||n.tipo==='whatsapp_enviado'?'📱':n.tipo==='live'?'🔴':'🔔')+'</span><div style="flex:1;"><strong>'+n.titulo+'</strong><p style="color:#aaa;font-size:12px;">'+n.mensagem+'</p><span style="font-size:10px;color:#666;">'+new Date(n.data).toLocaleString('pt-BR')+'</span></div>'+(n.link?'<a href="'+n.link+'" target="_blank" style="background:#25D366;color:white;padding:6px 12px;border-radius:20px;text-decoration:none;font-size:11px;">📱 Abrir</a>':'')+'</div></div>').join('');
    }catch(e){}
}
function notificarClientesLive(){db.collection('clientes').get().then(sn=>{sn.forEach(doc=>{db.collection('notificacoes').add({clienteId:doc.id,titulo:'🔴 LIVE!',mensagem:'Barbearia RM está ao vivo!',tipo:'live',lida:!1,data:new Date().toISOString()});});});}
function carregarAnuncioAuto(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=e=>{anuncioImagemAuto=e.target.result;};r.readAsDataURL(f);}
function iniciarAnuncioAutomatico(){if(!anuncioImagemAuto)return;let texto=document.getElementById('anuncioTextoInput').value.trim();let intervalo=parseInt(document.getElementById('anuncioIntervalo').value)*1000;anuncioTextoAuto=texto||'🔥 Oferta!';anuncioAutoAtivo=!0;document.getElementById('btnIniciarAnuncioAuto').style.display='none';document.getElementById('btnPararAnuncioAuto').style.display='inline-block';mostrarAnuncioAuto();anuncioAutoInterval=setInterval(mostrarAnuncioAuto,intervalo);}
function mostrarAnuncioAuto(){let overlay=document.getElementById('overlayAnuncio'),img=document.getElementById('anuncioImg'),txt=document.getElementById('anuncioTexto');if(!overlay||!img)return;img.src=anuncioImagemAuto;txt.textContent=anuncioTextoAuto;overlay.style.display='flex';overlay.style.opacity='1';if(anuncioAutoTimeout)clearTimeout(anuncioAutoTimeout);anuncioAutoTimeout=setTimeout(esconderAnuncioAuto,5000);}
function esconderAnuncioAuto(){let overlay=document.getElementById('overlayAnuncio');if(!overlay)return;overlay.style.opacity='0';setTimeout(()=>{overlay.style.display='none';},400);}
function fecharAnuncioManual(){esconderAnuncioAuto();}
function pararAnuncioAutomatico(){anuncioAutoAtivo=!1;if(anuncioAutoInterval)clearInterval(anuncioAutoInterval);if(anuncioAutoTimeout)clearTimeout(anuncioAutoTimeout);esconderAnuncioAuto();document.getElementById('btnIniciarAnuncioAuto').style.display='inline-block';document.getElementById('btnPararAnuncioAuto').style.display='none';}

// ==========================================================
// EVENT LISTENERS
// ==========================================================
function setupEventListeners(){
    document.getElementById('btnMostrarLoginCliente')?.addEventListener('click',()=>mostrarFormularioLogin('cliente'));
    document.getElementById('btnMostrarLoginBarbeiro')?.addEventListener('click',()=>mostrarFormularioLogin('barbeiro'));
    document.getElementById('btnEntrarCliente')?.addEventListener('click',loginCliente);
    document.getElementById('btnEntrarBarbeiro')?.addEventListener('click',loginBarbeiro);
    document.getElementById('btnCriarContaCliente')?.addEventListener('click',()=>mostrarTela('cadastroCliente'));
    document.getElementById('btnCriarContaBarbeiro')?.addEventListener('click',()=>mostrarTela('cadastroBarbeiro'));
    document.getElementById('btnVoltarLoginCliente')?.addEventListener('click',fecharFormulariosLogin);
    document.getElementById('btnVoltarLoginBarbeiro')?.addEventListener('click',fecharFormulariosLogin);
    document.getElementById('btnFinalizarCadastroCliente')?.addEventListener('click',cadastrarCliente);
    document.getElementById('btnFinalizarCadastroBarbeiro')?.addEventListener('click',cadastrarBarbeiro);
    document.getElementById('btnVoltarCadastroCliente')?.addEventListener('click',()=>mostrarTela('login'));
    document.getElementById('btnVoltarCadastroBarbeiro')?.addEventListener('click',()=>mostrarTela('login'));
    document.getElementById('btnAgendarCorte')?.addEventListener('click',()=>mostrarTela('agendamento'));
    document.getElementById('btnGaleriaCliente')?.addEventListener('click',()=>mostrarTela('galeriaCortes'));
    document.getElementById('btnReelsCliente')?.addEventListener('click',()=>mostrarTela('reels'));
    document.getElementById('btnAnunciosCliente')?.addEventListener('click',()=>mostrarTela('anuncios'));
    document.getElementById('btnLiveCliente')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('btnCriarPlano')?.addEventListener('click',()=>mostrarTela('criarPlano'));
    document.getElementById('btnNovoPost')?.addEventListener('click',()=>mostrarTela('criarPost'));
    document.getElementById('btnExtratoBarbeiro')?.addEventListener('click',()=>mostrarTela('extrato'));
    document.getElementById('btnHorariosBarbeiro')?.addEventListener('click',()=>mostrarTela('horariosTrabalho'));
    document.getElementById('btnAnunciosBarbeiro')?.addEventListener('click',()=>mostrarTela('anuncios'));
    document.getElementById('btnLiveBarbeiro')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('btnConfirmarAgendamento')?.addEventListener('click',agendarCorte);
    document.getElementById('btnVoltarAgendamento')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    document.getElementById('btnSalvarPerfilCliente')?.addEventListener('click',salvarPerfilCliente);
    document.getElementById('btnSairCliente')?.addEventListener('click',sairCliente);
    document.getElementById('btnSalvarPerfilBarbeiro')?.addEventListener('click',salvarPerfilBarbeiro);
    document.getElementById('btnSairBarbeiro')?.addEventListener('click',sairBarbeiro);
    document.getElementById('perfilClienteAvatar')?.addEventListener('click',()=>document.getElementById('fotoClienteInput').click());
    document.getElementById('perfilBarbeiroAvatar')?.addEventListener('click',()=>document.getElementById('fotoBarbeiroInput').click());
    document.getElementById('fotoClienteInput')?.addEventListener('change',function(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=async function(ev){let foto=ev.target.result;document.querySelector('#perfilClienteAvatar img').src=foto;if(clienteLogado){clienteLogado.fotoPerfil=foto;await db.collection('clientes').doc(clienteLogado.id).update({fotoPerfil:foto});salvarSessao('cliente',clienteLogado);}};r.readAsDataURL(f);});
    document.getElementById('fotoBarbeiroInput')?.addEventListener('change',function(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=async function(ev){let foto=ev.target.result;document.querySelector('#perfilBarbeiroAvatar img').src=foto;if(barbeiroLogado){barbeiroLogado.fotoPerfil=foto;await db.collection('barbeiros').doc(barbeiroLogado.id).update({fotoPerfil:foto});salvarSessao('barbeiro',barbeiroLogado);}};r.readAsDataURL(f);});
    document.getElementById('btnEnviarComentario')?.addEventListener('click',adicionarComentario);
    document.getElementById('btnFecharComentario')?.addEventListener('click',fecharModalComentario);
    document.getElementById('postImagemInput')?.addEventListener('change',previewImagemPost);
    document.getElementById('btnRemoverImagem')?.addEventListener('click',removerImagemPost);
    document.getElementById('postVideoInput')?.addEventListener('change',previewVideoPost);
    document.getElementById('btnRemoverVideo')?.addEventListener('click',removerVideoPost);
    document.getElementById('btnPublicarPost')?.addEventListener('click',criarPost);
    document.getElementById('btnVoltarCriarPost')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('btnSalvarPlano')?.addEventListener('click',criarPlano);
    document.getElementById('btnVoltarCriarPlano')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('navHomeCliente')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    document.getElementById('navAgendarCliente')?.addEventListener('click',()=>mostrarTela('agendamento'));
    document.getElementById('navSocialCliente')?.addEventListener('click',()=>mostrarTela('socialCliente'));
    document.getElementById('navLiveCliente')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('navPerfilCliente')?.addEventListener('click',()=>mostrarTela('perfilCliente'));
    document.getElementById('navHomeBarbeiro')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('navPostarBarbeiro')?.addEventListener('click',()=>mostrarTela('criarPost'));
    document.getElementById('navSocialBarbeiro')?.addEventListener('click',()=>mostrarTela('socialBarbeiro'));
    document.getElementById('navLiveBarbeiro')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('navPerfilBarbeiro')?.addEventListener('click',()=>mostrarTela('perfilBarbeiro'));
    document.getElementById('btnVoltarSocialCliente')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    document.getElementById('btnVoltarSocialBarbeiro')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('btnFecharPerfilCliente')?.addEventListener('click',fecharPerfilCliente);
    document.getElementById('btnFecharChatCliente')?.addEventListener('click',fecharChatCliente);
    document.getElementById('btnEnviarChatCliente')?.addEventListener('click',enviarMensagemChat);
    document.getElementById('btnMicPrivado')?.addEventListener('click',()=>{if(gravandoAudio)pararGravacaoAudioPrivado();else iniciarGravacaoAudioPrivado();});
    document.getElementById('btnIniciarLiveNaTela')?.addEventListener('click',iniciarLive);
    document.getElementById('btnRecordClip')?.addEventListener('click',iniciarGravacaoTrecho);
    document.getElementById('btnStopClip')?.addEventListener('click',pararGravacaoTrecho);
    document.getElementById('btnSaveClipsLive')?.addEventListener('click',salvarTrechosLive);
    document.getElementById('btnSwitchCamera')?.addEventListener('click',trocarCameraLive);
    document.getElementById('btnTelaCamera')?.addEventListener('click',()=>mostrarTelaLive('camera'));
    document.getElementById('btnTelaComercial')?.addEventListener('click',()=>mostrarTelaLive('comercial'));
    document.getElementById('btnTelaAnuncio')?.addEventListener('click',()=>mostrarTelaLive('anuncio'));
    document.getElementById('btnFinalizarLive')?.addEventListener('click',finalizarLive);
    document.getElementById('btnVoltarLive')?.addEventListener('click',()=>{if(liveAtiva&&barbeiroLogado)pararLive();if(barbeiroLogado)mostrarTela('homeBarbeiro');else if(clienteLogado)mostrarTela('homeCliente');else mostrarTela('login');});
    document.getElementById('btnSendLiveChat')?.addEventListener('click',enviarChatLive);
    document.getElementById('liveChatInput')?.addEventListener('keypress',e=>{if(e.key==='Enter')enviarChatLive();});
    document.getElementById('btnIniciarSorteio')?.addEventListener('click',function(){let p=document.getElementById('premioSorteioInput').value.trim()||'Corte Grátis';iniciarSorteio(p);});
    document.getElementById('btnRealizarSorteio')?.addEventListener('click',realizarSorteio);
    document.getElementById('btnConvidarWhatsApp')?.addEventListener('click',enviarConvitesWhatsApp);
    document.getElementById('btnGerarLinksWhatsApp')?.addEventListener('click',async()=>{await notificarClientesWhatsApp();});
    document.getElementById('btnIniciarAnuncioAuto')?.addEventListener('click',iniciarAnuncioAutomatico);
    document.getElementById('btnPararAnuncioAuto')?.addEventListener('click',pararAnuncioAutomatico);
    document.getElementById('btnVoltarExtrato')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('btnVoltarNotificacoes')?.addEventListener('click',()=>mostrarTela('homeCliente'));
}

document.addEventListener('DOMContentLoaded',async function(){
    setupEventListeners();
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('bottomNavCliente').style.display='none';
    document.getElementById('bottomNavBarbeiro').style.display='none';
    fecharFormulariosLogin();
    let restaurado=await restaurarSessao();
    if(restaurado){if(clienteLogado){document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;mostrarTela('homeCliente');}else if(barbeiroLogado){document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;mostrarTela('homeBarbeiro');}}
    else{document.getElementById('loginScreen').classList.add('active');}
    verificarLiveBadge();
    // Verificar se veio do link da live
    if(window.location.search.includes('live=1')&&clienteLogado){setTimeout(()=>{mostrarTela('live');},1000);}
    console.log('✅ Pronto!');
});
window.addEventListener('beforeunload',()=>{if(clienteLogado)removerClienteOnline(clienteLogado.id);});
