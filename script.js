/* ==========================================================
   BARBEARIA RM - SCRIPT PRINCIPAL COMPLETO
   ========================================================== */
const firebaseConfig={apiKey:"AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",authDomain:"barbearia-rm.firebaseapp.com",projectId:"barbearia-rm",storageBucket:"barbearia-rm.firebasestorage.app",messagingSenderId:"512819922057",appId:"1:512819922057:web:6a913791cb6435e4f63258",measurementId:"G-TKVLVLPBJH"};
firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();
db.settings({ignoreUndefinedProperties:true,merge:true});
console.log('🔥 Firebase');

let clienteLogado=null,barbeiroLogado=null,postSelecionadoId=null;
let liveStream=null,liveAtiva=!1,gravandoTrecho=!1,mediaRecorder=null,recordedChunks=[],trechosGravados=[],efeitoLiveAtual='none',telaLiveAtual='camera',liveTimerInterval=null,liveDuracao=0,liveFacingMode='user';
let anuncioAutoAtivo=!1,anuncioAutoInterval=null,anuncioAutoTimeout=null,anuncioImagemAuto=null,anuncioTextoAuto='';

function mostrarTela(t){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    let id=t==='login'?'loginScreen':t+'Screen';
    let el=document.getElementById(id);
    if(el)el.classList.add('active');
    atualizarBottomNav(t);
    carregarDadosTela(t);
    window.scrollTo(0,0);
}
function atualizarBottomNav(t){
    let nc=document.getElementById('bottomNavCliente'),nb=document.getElementById('bottomNavBarbeiro');
    if(nc)nc.style.display='none';if(nb)nb.style.display='none';
    let tc=['homeCliente','agendamento','galeriaCortes','reels','anuncios','live','perfilCliente'],tb=['homeBarbeiro','criarPost','extrato','criarPlano','horariosTrabalho','perfilBarbeiro'];
    if(tc.includes(t)&&clienteLogado&&nc)nc.style.display='flex';
    else if(tb.includes(t)&&barbeiroLogado&&nb)nb.style.display='flex';
}
function carregarDadosTela(t){
    switch(t){
        case 'homeCliente':carregarFeedCliente();carregarAgendaCliente();break;
        case 'homeBarbeiro':carregarAgendamentosBarbeiro();carregarPlanos();calcularFaturamento();carregarMeusPosts();break;
        case 'agendamento':carregarOpcoesAgendamento();break;
        case 'anuncios':carregarAnuncios();break;
        case 'perfilCliente':carregarPerfilCliente();break;
        case 'perfilBarbeiro':carregarPerfilBarbeiro();break;
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
    if(t==='cliente'&&fc)fc.classList.add('show');
    if(t==='barbeiro'&&fb)fb.classList.add('show');
}
function fecharFormulariosLogin(){
    let fc=document.getElementById('loginFormCliente'),fb=document.getElementById('loginFormBarbeiro');
    if(fc)fc.classList.remove('show');if(fb)fb.classList.remove('show');
}
function salvarSessao(t,d){
    let s={tipo:t,id:d.id,nome:d.nome,email:d.email,celular:d.celular||'',senha:d.senha||'',fotoPerfil:d.fotoPerfil||'',timestamp:Date.now()};
    localStorage.setItem('barbeariaRM_sessao',JSON.stringify(s));
}
function carregarSessao(){
    let d=localStorage.getItem('barbeariaRM_sessao');if(!d)return null;
    try{let s=JSON.parse(d);if((Date.now()-s.timestamp)/86400000>30){limparSessao();return null;}return s;}
    catch(e){limparSessao();return null;}
}
function limparSessao(){localStorage.removeItem('barbeariaRM_sessao');}
async function restaurarSessao(){
    let s=carregarSessao();if(!s)return!1;
    try{
        if(s.tipo==='cliente'){
            let sn=await db.collection('clientes').where('email','==',s.email).where('senha','==',s.senha).get();
            if(!sn.empty){let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};return!0;}
        }else{
            let sn=await db.collection('barbeiros').where('email','==',s.email).where('senha','==',s.senha).get();
            if(!sn.empty){let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};return!0;}
        }
    }catch(e){}
    limparSessao();return!1;
}
async function loginCliente(){
    let e=document.getElementById('loginEmailCliente').value.trim(),s=document.getElementById('loginSenhaCliente').value;
    if(!e||!s){mostrarToast('❌ Preencha!','error');return;}
    try{
        let sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();
        if(sn.empty){mostrarToast('❌ Inválido!','error');return;}
        let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};salvarSessao('cliente',clienteLogado);
        document.getElementById('loginEmailCliente').value='';document.getElementById('loginSenhaCliente').value='';
        fecharFormulariosLogin();document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;
        mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeCliente');
    }catch(er){mostrarToast('❌ Erro!','error');}
}
async function loginBarbeiro(){
    let e=document.getElementById('loginEmailBarbeiro').value.trim(),s=document.getElementById('loginSenhaBarbeiro').value;
    if(!e||!s){mostrarToast('❌ Preencha!','error');return;}
    try{
        let sn=await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();
        if(sn.empty){mostrarToast('❌ Inválido!','error');return;}
        let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};salvarSessao('barbeiro',barbeiroLogado);
        document.getElementById('loginEmailBarbeiro').value='';document.getElementById('loginSenhaBarbeiro').value='';
        fecharFormulariosLogin();document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;
        mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeBarbeiro');
    }catch(er){mostrarToast('❌ Erro!','error');}
}
async function cadastrarCliente(){
    let n=document.getElementById('cadNomeCliente').value.trim(),e=document.getElementById('cadEmailCliente').value.trim(),c=document.getElementById('cadCelularCliente').value.trim(),s=document.getElementById('cadSenhaCliente').value;
    if(!n||!e||!c||!s){mostrarToast('❌ Preencha!','error');return;}
    if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}
    try{
        let sn=await db.collection('clientes').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email existe!','error');return;}
        let id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};
        await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;salvarSessao('cliente',cl);
        document.getElementById('cadNomeCliente').value='';document.getElementById('cadEmailCliente').value='';document.getElementById('cadCelularCliente').value='';document.getElementById('cadSenhaCliente').value='';
        mostrarToast('✅ OK!','success');mostrarTela('homeCliente');
    }catch(er){mostrarToast('❌ Erro!','error');}
}
async function cadastrarBarbeiro(){
    let n=document.getElementById('cadNomeBarbeiro').value.trim(),e=document.getElementById('cadEmailBarbeiro').value.trim(),c=document.getElementById('cadCelularBarbeiro').value.trim(),s=document.getElementById('cadSenhaBarbeiro').value;
    if(!n||!e||!c||!s){mostrarToast('❌ Preencha!','error');return;}
    if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}
    try{
        let sn=await db.collection('barbeiros').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email existe!','error');return;}
        let id=Date.now().toString(),bb={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};
        await db.collection('barbeiros').doc(id).set(bb);barbeiroLogado=bb;salvarSessao('barbeiro',bb);
        document.getElementById('cadNomeBarbeiro').value='';document.getElementById('cadEmailBarbeiro').value='';document.getElementById('cadCelularBarbeiro').value='';document.getElementById('cadSenhaBarbeiro').value='';
        mostrarToast('✅ OK!','success');mostrarTela('homeBarbeiro');
    }catch(er){mostrarToast('❌ Erro!','error');}
}
function sairCliente(){if(!confirm('Tem certeza que deseja sair?'))return;clienteLogado=null;limparSessao();fecharFormulariosLogin();mostrarTela('login');mostrarToast('👋 Até logo!','info');}
function sairBarbeiro(){if(!confirm('Tem certeza que deseja sair?'))return;barbeiroLogado=null;limparSessao();fecharFormulariosLogin();mostrarTela('login');mostrarToast('👋 Até logo!','info');}

async function carregarFeedCliente(){
    let c=document.getElementById('feedClienteContainer');if(!c)return;
    try{
        let sn=await db.collection('posts').orderBy('dataCriacao','desc').get();
        let posts=sn.docs.map(d=>({id:d.id,...d.data()}));
        if(posts.length===0){c.innerHTML='<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post</h3></div>';return;}
        c.innerHTML=posts.map(p=>'<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+(p.barbeiroNome||'Barbearia RM')+'</div><div class="feed-post-user-time">'+new Date(p.dataCriacao).toLocaleDateString('pt-BR')+'</div></div></div>'+(p.imagem?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><div class="feed-post-title">'+p.titulo+'</div><div class="feed-post-price">R$ '+(p.preco||0).toFixed(2)+'</div></div><div class="feed-post-actions"><button>❤️ '+(p.likes||0)+'</button><button class="btn-comentar" data-id="'+p.id+'">💬 '+(p.comentarios||[]).length+'</button></div></div>').join('');
        document.querySelectorAll('.btn-comentar').forEach(b=>b.addEventListener('click',function(){abrirComentarios(this.dataset.id);}));
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
async function carregarMeusPosts(){
    let c=document.getElementById('meusPostsContainer');if(!c||!barbeiroLogado)return;
    try{
        let sn=await db.collection('posts').where('barbeiroId','==',barbeiroLogado.id).get();
        let posts=[];sn.forEach(d=>posts.push({id:d.id,...d.data()}));
        posts.sort((a,b)=>new Date(b.dataCriacao)-new Date(a.dataCriacao));
        if(posts.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum post</p>';return;}
        c.innerHTML=posts.map(p=>'<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+p.titulo+'</div><div class="feed-post-user-time">R$ '+(p.preco||0).toFixed(2)+'</div></div></div>'+(p.imagem?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<button class="btn btn-small btn-danger btn-excluir" data-id="'+p.id+'">🗑</button></div>').join('');
        document.querySelectorAll('.btn-excluir').forEach(b=>b.addEventListener('click',function(){excluirMeuPost(this.dataset.id);}));
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
async function excluirMeuPost(id){if(!confirm('Excluir?'))return;await db.collection('posts').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarMeusPosts();carregarFeedCliente();}
function abrirComentarios(id){postSelecionadoId=id;carregarComentarios(id);document.getElementById('modalComentario').classList.add('active');}
async function carregarComentarios(id){
    let c=document.getElementById('comentariosContainer');if(!c)return;
    let doc=await db.collection('posts').doc(id).get();if(!doc.exists)return;
    let com=doc.data().comentarios||[];
    c.innerHTML=com.length===0?'<p style="color:#6B7280;">Nenhum</p>':com.map(x=>'<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">'+x.autor+'</strong><p style="color:#B0B0B0;">'+x.texto+'</p></div>').join('');
}
async function adicionarComentario(){
    let t=document.getElementById('novoComentario').value.trim();if(!t)return;
    let autor=clienteLogado?clienteLogado.nome:(barbeiroLogado?barbeiroLogado.nome:'Anônimo');
    let doc=await db.collection('posts').doc(postSelecionadoId).get();
    let com=doc.data().comentarios||[];com.push({autor,texto:t,data:new Date().toISOString()});
    await db.collection('posts').doc(postSelecionadoId).update({comentarios:com});
    document.getElementById('novoComentario').value='';carregarComentarios(postSelecionadoId);
}
function fecharModalComentario(){document.getElementById('modalComentario').classList.remove('active');}

function carregarOpcoesAgendamento(){
    let sh=document.getElementById('agendamentoHorario'),st=document.getElementById('agendamentoTipo');
    if(sh){let h=[];for(let i=9;i<=18;i++)for(let j=0;j<60;j+=30){if(i===18&&j>0)break;h.push(String(i).padStart(2,'0')+':'+String(j).padStart(2,'0'));}sh.innerHTML=h.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}
    if(st){let t=['Corte Social','Corte Degradê','Corte Navalhado','Corte Máquina','Barba','Barba + Corte'];st.innerHTML=t.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}
    let d=document.getElementById('agendamentoData');if(d)d.min=new Date().toISOString().split('T')[0];
}
async function agendarCorte(){
    if(!clienteLogado){mostrarToast('❌ Faça login!','error');return;}
    let d=document.getElementById('agendamentoData').value,h=document.getElementById('agendamentoHorario').value,t=document.getElementById('agendamentoTipo').value;
    if(!d){mostrarToast('❌ Selecione data!','error');return;}
    try{
        let id=Date.now().toString();
        await db.collection('agendamentos').doc(id).set({id,clienteId:clienteLogado.id,clienteNome:clienteLogado.nome,data:d,horario:h,tipo:t,status:'pendente',dataCriacao:new Date().toISOString()});
        mostrarToast('✅ Agendado!','success');document.getElementById('agendamentoData').value='';
        carregarAgendaCliente();mostrarTela('homeCliente');
    }catch(e){mostrarToast('❌ Erro!','error');}
}
async function carregarAgendaCliente(){
    if(!clienteLogado)return;let c=document.getElementById('agendaClienteContainer');if(!c)return;
    try{
        let sn=await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).get();
        let ag=sn.docs.map(d=>({id:d.id,...d.data()}));ag.sort((a,b)=>new Date(b.data)-new Date(a.data));
        if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}
        c.innerHTML=ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">'+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+(a.status==='confirmado'?'✅':'⏳')+' '+a.status+'</span></div>').join('');
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
async function carregarAgendamentosBarbeiro(){
    let c=document.getElementById('agendamentosBarbeiroContainer');if(!c)return;
    try{
        let sn=await db.collection('agendamentos').orderBy('data','desc').get();
        let ag=sn.docs.map(d=>({id:d.id,...d.data()}));
        if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}
        c.innerHTML=ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 '+(a.clienteNome||'Cliente')+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+a.status+'</span></div>').join('');
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
async function carregarPlanos(){
    let c=document.getElementById('planosContainer');if(!c)return;
    try{
        let sn=await db.collection('planos').orderBy('dataCriacao','desc').get();
        let p=sn.docs.map(d=>({id:d.id,...d.data()}));
        if(p.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}
        c.innerHTML=p.map(x=>'<div class="plano-card"><div class="plano-info"><div class="plano-nome">'+x.nome+'</div><div class="plano-periodo">📅 '+x.periodo+'</div></div><div class="plano-preco">R$ '+(x.preco||0).toFixed(2)+'</div></div>').join('');
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
async function carregarAnuncios(){
    let c=document.getElementById('anunciosContainer');if(!c)return;
    try{
        let hoje=new Date().toISOString();
        let sn=await db.collection('anuncios').where('dataExpiracao','>',hoje).get();
        let a=sn.docs.map(d=>({id:d.id,...d.data()}));
        if(a.length===0){c.innerHTML='<div style="text-align:center;padding:40px;"><p style="color:#6B7280;">📢 Nenhum</p></div>';return;}
        c.innerHTML=a.map(x=>'<div class="card" style="border:2px solid #FF6B6B;margin-bottom:12px;"><span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢 ANÚNCIO</span>'+(x.imagem?'<img src="'+x.imagem+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;">':'')+'<h3 style="color:#FF6B6B;">'+x.titulo+'</h3><p style="color:#B0B0B0;">'+x.descricao+'</p>'+(x.link?'<a href="'+x.link+'" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#FF4757;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>':'')+'</div>').join('');
    }catch(e){c.innerHTML='<p style="color:#6B7280;">Erro</p>';}
}
function carregarPerfilCliente(){
    if(!clienteLogado)return;
    document.getElementById('perfilClienteNome').textContent=clienteLogado.nome;
    document.getElementById('perfilClienteEmail').textContent=clienteLogado.email;
    document.getElementById('editClienteNome').value=clienteLogado.nome||'';
    document.getElementById('editClienteCelular').value=clienteLogado.celular||'';
}
async function salvarPerfilCliente(){
    if(!clienteLogado)return;
    let n=document.getElementById('editClienteNome').value.trim(),c=document.getElementById('editClienteCelular').value.trim();
    await db.collection('clientes').doc(clienteLogado.id).update({nome:n,celular:c});
    clienteLogado.nome=n;clienteLogado.celular=c;salvarSessao('cliente',clienteLogado);mostrarToast('✅ Salvo!','success');
}
function carregarPerfilBarbeiro(){
    if(!barbeiroLogado)return;
    document.getElementById('perfilBarbeiroNome').textContent=barbeiroLogado.nome;
    document.getElementById('perfilBarbeiroEmail').textContent=barbeiroLogado.email;
    document.getElementById('editBarbeiroNome').value=barbeiroLogado.nome||'';
    document.getElementById('editBarbeiroCelular').value=barbeiroLogado.celular||'';
    document.getElementById('editBarbeiroEmail').value=barbeiroLogado.email||'';
}
async function salvarPerfilBarbeiro(){
    if(!barbeiroLogado)return;
    let n=document.getElementById('editBarbeiroNome').value.trim(),c=document.getElementById('editBarbeiroCelular').value.trim(),e=document.getElementById('editBarbeiroEmail').value.trim();
    await db.collection('barbeiros').doc(barbeiroLogado.id).update({nome:n,celular:c,email:e});
    barbeiroLogado.nome=n;barbeiroLogado.celular=c;barbeiroLogado.email=e;salvarSessao('barbeiro',barbeiroLogado);mostrarToast('✅ Salvo!','success');
}
async function calcularFaturamento(){
    try{
        let sn=await db.collection('agendamentos').where('status','==','confirmado').get();
        let ag=sn.docs.map(d=>d.data()),hoje=new Date().toISOString().split('T')[0],th=0,tg=0;
        ag.forEach(a=>{let v=35;if(a.data===hoje)th+=v;tg+=v;});
        document.getElementById('faturamentoHoje').textContent='R$ '+th.toFixed(2);
        document.getElementById('faturamentoSemana').textContent='R$ '+(tg*0.3).toFixed(2);
        document.getElementById('faturamentoMes').textContent='R$ '+(tg*0.7).toFixed(2);
        document.getElementById('faturamentoAno').textContent='R$ '+tg.toFixed(2);
    }catch(e){}
}
async function verificarLiveBadge(){
    try{
        let doc=await db.collection('lives').doc('live_atual').get();
        let ativa=doc.exists&&doc.data().ativa;
        let bc=document.getElementById('liveBadgeCliente'),bb=document.getElementById('liveBadgeBarbeiro');
        if(bc)bc.style.display=ativa?'inline-block':'none';
        if(bb)bb.style.display=ativa?'inline-block':'none';
    }catch(e){}
}

// ==================== LIVE STUDIO ====================
async function iniciarLive(){
    console.log('🎥 Iniciando live...');
    try{
        if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){mostrarToast('❌ Navegador não suporta','error');return;}
        let stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:liveFacingMode},audio:{echoCancellation:!0,noiseSuppression:!0}});
        liveStream=stream;liveAtiva=!0;
        let videoEl=document.getElementById('liveVideo');if(!videoEl){mostrarToast('❌ Erro no player','error');return;}
        videoEl.srcObject=stream;videoEl.muted=!0;
        document.getElementById('livePlaceholder').style.display='none';
        document.getElementById('liveControlsCard').style.display='block';
        document.getElementById('clipsCard').style.display='block';
        document.getElementById('liveStatus').style.display='block';
        liveDuracao=0;if(liveTimerInterval)clearInterval(liveTimerInterval);
        liveTimerInterval=setInterval(()=>{liveDuracao++;let h=Math.floor(liveDuracao/3600),m=Math.floor((liveDuracao%3600)/60),s=liveDuracao%60;let el=document.getElementById('liveDuration');if(el)el.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');},1000);
        try{await db.collection('lives').doc('live_atual').set({id:'live_atual',titulo:'Live Barbearia RM',barbeiroNome:barbeiroLogado?barbeiroLogado.nome:'Barbearia RM',ativa:!0,chat:[],viewers:0,likes:0,dataInicio:new Date().toISOString()});}catch(fbErr){}
        mostrarToast('🔴 Live iniciada!','success');
    }catch(er){
        console.error('❌',er);
        if(er.name==='NotAllowedError')mostrarToast('❌ Permissão negada!','error');
        else if(er.name==='NotFoundError')mostrarToast('❌ Nenhuma câmera!','error');
        else mostrarToast('❌ '+er.message,'error');
    }
}
function pararLive(){
    if(anuncioAutoAtivo)pararAnuncioAutomatico();
    if(gravandoTrecho)pararGravacaoTrecho();
    if(liveTimerInterval){clearInterval(liveTimerInterval);liveTimerInterval=null;}
    if(liveStream){liveStream.getTracks().forEach(t=>t.stop());liveStream=null;}
    liveAtiva=!1;
    let v=document.getElementById('liveVideo');if(v)v.srcObject=null;
    let p=document.getElementById('livePlaceholder');if(p)p.style.display='flex';
    let ct=document.getElementById('liveControlsCard');if(ct)ct.style.display='none';
    let cl=document.getElementById('clipsCard');if(cl)cl.style.display='none';
    let st=document.getElementById('liveStatus');if(st)st.style.display='none';
    let d=document.getElementById('liveDuration');if(d)d.textContent='00:00:00';
    let oc=document.getElementById('overlayComercial'),oa=document.getElementById('overlayAnuncio');
    if(oc)oc.style.display='none';if(oa)oa.style.display='none';
}
function iniciarGravacaoTrecho(){
    if(!liveStream||gravandoTrecho){mostrarToast('❌ Live não ativa!','error');return;}
    try{mediaRecorder=new MediaRecorder(liveStream,MediaRecorder.isTypeSupported('video/webm')?{mimeType:'video/webm'}:{});}catch(e){mediaRecorder=new MediaRecorder(liveStream);}
    recordedChunks=[];
    mediaRecorder.ondataavailable=e=>{if(e.data.size>0)recordedChunks.push(e.data);};
    mediaRecorder.onstop=()=>{let blob=new Blob(recordedChunks,{type:'video/webm'}),url=URL.createObjectURL(blob);trechosGravados.push({id:Date.now(),url,blob,efeito:efeitoLiveAtual});atualizarTimelineLive();let ce=document.getElementById('clipCountLive');if(ce)ce.textContent=trechosGravados.length;mostrarToast('✅ Trecho salvo!','success');};
    mediaRecorder.start(1000);gravandoTrecho=!0;
    document.getElementById('btnRecordClip').style.display='none';
    document.getElementById('btnStopClip').style.display='inline-block';
    mostrarToast('⏺️ Gravando...','info');
}
function pararGravacaoTrecho(){
    if(!gravandoTrecho||!mediaRecorder)return;
    mediaRecorder.stop();gravandoTrecho=!1;
    document.getElementById('btnRecordClip').style.display='inline-block';
    document.getElementById('btnStopClip').style.display='none';
}
function atualizarTimelineLive(){
    let tl=document.getElementById('clipsTimelineLive');if(!tl)return;
    if(trechosGravados.length===0){tl.innerHTML='<span style="color:#aaa;font-size:11px;">Nenhum trecho</span>';return;}
    tl.innerHTML=trechosGravados.map((c,i)=>'<span style="background:rgba(255,255,255,.05);padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;margin-right:4px;" onclick="window.open(\''+c.url+'\',\'_blank\')">🎬 '+(i+1)+'</span>').join('');
}
function salvarTrechosLive(){
    if(trechosGravados.length===0){mostrarToast('❌ Nenhum trecho','error');return;}
    trechosGravados.forEach((c,i)=>{let a=document.createElement('a');a.href=c.url;a.download='clip-'+(i+1)+'.webm';document.body.appendChild(a);a.click();document.body.removeChild(a);});
    mostrarToast('💾 '+trechosGravados.length+' trechos!','success');
}
async function trocarCameraLive(){
    liveFacingMode=liveFacingMode==='user'?'environment':'user';
    if(liveStream)liveStream.getTracks().forEach(t=>t.stop());
    try{let stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:liveFacingMode,width:{ideal:640}},audio:!0});liveStream=stream;let v=document.getElementById('liveVideo');if(v)v.srcObject=stream;mostrarToast('🔄 '+(liveFacingMode==='user'?'Frontal':'Traseira'),'info');}
    catch(e){mostrarToast('❌ Erro','error');}
}
function aplicarEfeitoLive(efeito){
    let v=document.getElementById('liveVideo');if(!v)return;
    v.style.filter='';efeitoLiveAtual=efeito;
    if(efeito==='bw')v.style.filter='grayscale(100%)';
    else if(efeito==='sepia')v.style.filter='sepia(80%)';
    else if(efeito==='neon')v.style.filter='brightness(1.2) contrast(1.3) saturate(1.5)';
    else if(efeito==='warm')v.style.filter='sepia(20%) saturate(1.3)';
    mostrarToast('✨ '+efeito,'info');
}
function mostrarTelaLive(tipo){
    let oc=document.getElementById('overlayComercial'),oa=document.getElementById('overlayAnuncio');
    if(oc)oc.style.display='none';if(oa)oa.style.display='none';
    telaLiveAtual=tipo;
    if(tipo==='comercial'&&oc)oc.style.display='block';
    else if(tipo==='anuncio'&&oa)oa.style.display='flex';
}
function carregarComercialLive(event){
    let f=event.target.files[0];if(!f)return;
    let v=document.getElementById('comercialVideo');if(!v)return;
    v.src=URL.createObjectURL(f);v.loop=!0;v.muted=!0;mostrarToast('🎬 Comercial OK!','success');
}
function carregarAnuncioLive(event){
    let f=event.target.files[0];if(!f)return;
    let r=new FileReader();r.onload=e=>{let img=document.getElementById('anuncioImg');if(img){img.src=e.target.result;mostrarTelaLive('anuncio');}};r.readAsDataURL(f);
}
function compartilharLive(rede){
    let url=window.location.href.split('?')[0],texto='🔴 Barbearia RM - Ao Vivo!';
    if(rede==='link'){navigator.clipboard.writeText(url);mostrarToast('📋 Link copiado!','success');}
    else if(rede==='whatsapp')window.open('https://wa.me/?text='+encodeURIComponent(texto+' '+url),'_blank');
    else if(rede==='facebook')window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url),'_blank');
    else mostrarToast('📤 Compartilhado!','info');
}
async function finalizarLive(){
    if(!confirm('Finalizar live?'))return;
    pararLive();
    try{await db.collection('lives').doc('live_atual').update({ativa:!1,dataFim:new Date().toISOString()});}catch(e){}
    mostrarToast('✅ Finalizada!','info');
}
function enviarChatLive(){
    let input=document.getElementById('liveChatInput');if(!input)return;
    let msg=input.value.trim();if(!msg)return;
    let c=document.getElementById('liveChatMessages');if(!c)return;
    if(c.querySelector('p'))c.innerHTML='';
    c.innerHTML+='<div style="padding:4px;font-size:11px;"><strong style="color:#D4A84B;">Você:</strong> '+msg+'</div>';
    c.scrollTop=c.scrollHeight;input.value='';
}

// ADICIONE NO SEU SCRIPT - SORTEIO NA LIVE

let sorteioAtivo = false;
let participantesSorteio = [];
let premioSorteio = '';

function iniciarSorteio(premio) {
    participantesSorteio = [];
    premioSorteio = premio;
    sorteioAtivo = true;
    
    // Mostrar no chat
    const chatContainer = document.getElementById('liveChatMessages');
    chatContainer.innerHTML += `
        <div style="background:rgba(255,215,0,0.15);padding:12px;border-radius:8px;margin:8px 0;border:2px solid #FFD700;text-align:center;">
            <div style="font-size:20px;">🎉</div>
            <strong style="color:#FFD700;">SORTEIO INICIADO!</strong><br>
            <span style="color:white;">Prêmio: ${premio}</span><br>
            <span style="font-size:11px;color:#aaa;">Digite !PARTICIPAR no chat</span>
        </div>
    `;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    mostrarToast('🎉 Sorteio iniciado! Digite !PARTICIPAR', 'success');
}

function participarSorteio(nome) {
    if (!sorteioAtivo) return;
    if (participantesSorteio.includes(nome)) {
        mostrarToast('⚠️ Você já está participando!', 'info');
        return;
    }
    participantesSorteio.push(nome);
    mostrarToast('✅ ' + nome + ' entrou no sorteio!', 'success');
    
    // Atualizar contador no chat
    const chatContainer = document.getElementById('liveChatMessages');
    chatContainer.innerHTML += `
        <div style="font-size:10px;color:#FFD700;text-align:center;">
            🎯 ${participantesSorteio.length} participante(s)
        </div>
    `;
}

function realizarSorteio() {
    if (participantesSorteio.length === 0) {
        mostrarToast('❌ Ninguém participou!', 'error');
        return;
    }
    
    const vencedor = participantesSorteio[Math.floor(Math.random() * participantesSorteio.length)];
    sorteioAtivo = false;
    
    // Anunciar vencedor com destaque
    const chatContainer = document.getElementById('liveChatMessages');
    chatContainer.innerHTML += `
        <div style="background:rgba(0,200,100,0.2);padding:16px;border-radius:12px;margin:8px 0;border:3px solid #00cc66;text-align:center;animation:anuncioEntrada 0.6s ease-out;">
            <div style="font-size:30px;">🏆</div>
            <strong style="color:#00cc66;font-size:18px;">VENCEDOR!</strong><br>
            <span style="color:white;font-size:16px;">🎉 ${vencedor} 🎉</span><br>
            <span style="color:#FFD700;">Ganhou: ${premioSorteio}</span><br>
            <span style="font-size:11px;color:#aaa;">Entre em contato para resgatar!</span>
        </div>
    `;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    mostrarToast('🏆 ' + vencedor + ' venceu!', 'success');
    participantesSorteio = [];
}

// ==================== ANÚNCIO AUTOMÁTICO ====================
function carregarAnuncioAuto(event){
    let f=event.target.files[0];if(!f)return;
    let r=new FileReader();r.onload=e=>{anuncioImagemAuto=e.target.result;document.getElementById('anuncioAutoStatus').textContent='✅ Imagem carregada!';document.getElementById('anuncioAutoStatus').style.color='#00cc66';mostrarToast('🖼️ OK!','success');};r.readAsDataURL(f);
}
function iniciarAnuncioAutomatico(){
    if(!anuncioImagemAuto){mostrarToast('❌ Escolha uma imagem!','error');return;}
    let texto=document.getElementById('anuncioTextoInput').value.trim();
    let intervalo=parseInt(document.getElementById('anuncioIntervalo').value)*1000;
    anuncioTextoAuto=texto||'🔥 Oferta Especial! 🔥';anuncioAutoAtivo=!0;
    document.getElementById('btnIniciarAnuncioAuto').style.display='none';
    document.getElementById('btnPararAnuncioAuto').style.display='inline-block';
    document.getElementById('anuncioAutoStatus').textContent='▶️ Ativo - a cada '+(intervalo/1000)+'s';
    document.getElementById('anuncioAutoStatus').style.color='#FFD700';
    mostrarAnuncioAuto();
    anuncioAutoInterval=setInterval(()=>{mostrarAnuncioAuto();},intervalo);
    mostrarToast('📢 Auto iniciado!','success');
}
function mostrarAnuncioAuto(){
    let overlay=document.getElementById('overlayAnuncio'),img=document.getElementById('anuncioImg'),txt=document.getElementById('anuncioTexto');
    if(!overlay||!img)return;
    img.src=anuncioImagemAuto;img.classList.add('anuncio-ativo');txt.textContent=anuncioTextoAuto;
    overlay.style.display='flex';overlay.style.opacity='1';overlay.style.animation='anuncioEntrada 0.6s ease-out';
    if(anuncioAutoTimeout)clearTimeout(anuncioAutoTimeout);
    anuncioAutoTimeout=setTimeout(()=>{esconderAnuncioAuto();},5000);
}
function esconderAnuncioAuto(){
    let overlay=document.getElementById('overlayAnuncio');if(!overlay)return;
    overlay.style.animation='anuncioSaida 0.4s ease-in';overlay.style.opacity='0';
    setTimeout(()=>{overlay.style.display='none';overlay.style.animation='';},400);
}
function fecharAnuncioManual(){esconderAnuncioAuto();}
function pararAnuncioAutomatico(){
    anuncioAutoAtivo=!1;
    if(anuncioAutoInterval){clearInterval(anuncioAutoInterval);anuncioAutoInterval=null;}
    if(anuncioAutoTimeout){clearTimeout(anuncioAutoTimeout);anuncioAutoTimeout=null;}
    esconderAnuncioAuto();
    document.getElementById('btnIniciarAnuncioAuto').style.display='inline-block';
    document.getElementById('btnPararAnuncioAuto').style.display='none';
    document.getElementById('anuncioAutoStatus').textContent='⏹️ Parado';document.getElementById('anuncioAutoStatus').style.color='#aaa';
    mostrarToast('⏹️ Parado','info');
}

// ==================== EVENT LISTENERS ====================
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
    document.getElementById('navHomeCliente')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    document.getElementById('navAgendarCliente')?.addEventListener('click',()=>mostrarTela('agendamento'));
    document.getElementById('navGaleriaCliente')?.addEventListener('click',()=>mostrarTela('galeriaCortes'));
    document.getElementById('navLiveCliente')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('navPerfilCliente')?.addEventListener('click',()=>mostrarTela('perfilCliente'));
    document.getElementById('navHomeBarbeiro')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('navPostarBarbeiro')?.addEventListener('click',()=>mostrarTela('criarPost'));
    document.getElementById('navExtratoBarbeiro')?.addEventListener('click',()=>mostrarTela('extrato'));
    document.getElementById('navLiveBarbeiro')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('navPerfilBarbeiro')?.addEventListener('click',()=>mostrarTela('perfilBarbeiro'));
    // Live
    document.getElementById('btnIniciarLiveNaTela')?.addEventListener('click',iniciarLive);
    document.getElementById('btnRecordClip')?.addEventListener('click',iniciarGravacaoTrecho);
    document.getElementById('btnStopClip')?.addEventListener('click',pararGravacaoTrecho);
    document.getElementById('btnSaveClipsLive')?.addEventListener('click',salvarTrechosLive);
    document.getElementById('btnSwitchCamera')?.addEventListener('click',trocarCameraLive);
    document.getElementById('btnTelaCamera')?.addEventListener('click',()=>mostrarTelaLive('camera'));
    document.getElementById('btnTelaComercial')?.addEventListener('click',()=>mostrarTelaLive('comercial'));
    document.getElementById('btnTelaAnuncio')?.addEventListener('click',()=>mostrarTelaLive('anuncio'));
    document.getElementById('btnFinalizarLive')?.addEventListener('click',finalizarLive);
    document.getElementById('btnSendLiveChat')?.addEventListener('click',enviarChatLive);
    document.getElementById('btnVoltarLive')?.addEventListener('click',()=>{if(liveAtiva)pararLive();mostrarTela('homeCliente');});
    document.getElementById('liveChatInput')?.addEventListener('keypress',e=>{if(e.key==='Enter')enviarChatLive();});
    // Anúncio automático
    document.getElementById('btnIniciarAnuncioAuto')?.addEventListener('click',iniciarAnuncioAutomatico);
    document.getElementById('btnPararAnuncioAuto')?.addEventListener('click',pararAnuncioAutomatico);
}

document.addEventListener('DOMContentLoaded',async function(){
    setupEventListeners();
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    let nc=document.getElementById('bottomNavCliente'),nb=document.getElementById('bottomNavBarbeiro');
    if(nc)nc.style.display='none';if(nb)nb.style.display='none';
    fecharFormulariosLogin();
    let restaurado=await restaurarSessao();
    if(restaurado){
        if(clienteLogado){document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;mostrarTela('homeCliente');}
        else if(barbeiroLogado){document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;mostrarTela('homeBarbeiro');}
    }else{document.getElementById('loginScreen').classList.add('active');}
    if(clienteLogado||barbeiroLogado)verificarLiveBadge();
    console.log('✅ Pronto!');
});
