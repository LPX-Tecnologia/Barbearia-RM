/* ==========================================================
   BARBEARIA RM - COMPLETO FINAL
   ========================================================== */
const firebaseConfig={apiKey:"AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",authDomain:"barbearia-rm.firebaseapp.com",projectId:"barbearia-rm",storageBucket:"barbearia-rm.firebasestorage.app",messagingSenderId:"512819922057",appId:"1:512819922057:web:6a913791cb6435e4f63258",measurementId:"G-TKVLVLPBJH"};
if(!firebase.apps.length){firebase.initializeApp(firebaseConfig);}
const db=firebase.firestore();
db.settings({ignoreUndefinedProperties:true,merge:true});
console.log('🔥 Firebase OK');

let clienteLogado=null,barbeiroLogado=null,postSelecionadoId=null;
let liveStream=null,liveStreamLocal=null,liveAtiva=!1,gravandoTrecho=!1,mediaRecorder=null,recordedChunks=[],trechosGravados=[],efeitoLiveAtual='none',telaLiveAtual='camera',liveTimerInterval=null,liveDuracao=0,liveFacingMode='user';
let anuncioAutoAtivo=!1,anuncioAutoInterval=null,anuncioAutoTimeout=null,anuncioImagemAuto=null,anuncioTextoAuto='';
let liveAtivaGeral=!1,liveChatListener=null,liveFrameInterval=null;
let mediaRecorderAudio=null,audioChunks=[],gravandoAudio=!1;
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
        if(s.tipo==='cliente'){
            let sn=await db.collection('clientes').where('email','==',s.email).where('senha','==',s.senha).get();
            if(!sn.empty){let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};await marcarClienteOnline(clienteLogado);return!0;}
        }else{
            let sn=await db.collection('barbeiros').where('email','==',s.email).where('senha','==',s.senha).get();
            if(!sn.empty){let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};return!0;}
        }
    }catch(e){}
    limparSessao();return!1;
}

// ==========================================================
// LOGIN / CADASTRO
// ==========================================================
async function loginCliente(){
    let e=document.getElementById('loginEmailCliente').value.trim(),s=document.getElementById('loginSenhaCliente').value;
    if(!e||!s){mostrarToast('❌ Preencha!','error');return;}
    try{
        let sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();
        if(sn.empty){mostrarToast('❌ Inválido!','error');return;}
        let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};
        salvarSessao('cliente',clienteLogado);
        await marcarClienteOnline(clienteLogado);
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
        let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};
        salvarSessao('barbeiro',barbeiroLogado);
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
        let id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',online:!0,notificacoes:!0,dataCriacao:new Date().toISOString()};
        await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;
        salvarSessao('cliente',cl);
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
        await db.collection('barbeiros').doc(id).set(bb);barbeiroLogado=bb;
        salvarSessao('barbeiro',bb);
        document.getElementById('cadNomeBarbeiro').value='';document.getElementById('cadEmailBarbeiro').value='';document.getElementById('cadCelularBarbeiro').value='';document.getElementById('cadSenhaBarbeiro').value='';
        mostrarToast('✅ OK!','success');mostrarTela('homeBarbeiro');
    }catch(er){mostrarToast('❌ Erro!','error');}
}
function sairCliente(){
    if(!confirm('Tem certeza?'))return;
    if(clienteLogado&&clienteLogado.id)removerClienteOnline(clienteLogado.id);
    clienteLogado=null;limparSessao();fecharFormulariosLogin();
    mostrarTela('login');mostrarToast('👋 Até logo!','info');
}
function sairBarbeiro(){
    if(!confirm('Tem certeza?'))return;
    barbeiroLogado=null;limparSessao();fecharFormulariosLogin();
    mostrarTela('login');mostrarToast('👋 Até logo!','info');
}

// ==========================================================
// CLIENTES ONLINE (CORRIGIDO)
// ==========================================================
async function marcarClienteOnline(cliente){
    if(!cliente||!cliente.id)return;
    try{await db.collection('clientes').doc(cliente.id).update({online:!0,ultimoAcesso:new Date().toISOString()});console.log('🟢 Online:',cliente.nome);}catch(e){}
}
async function removerClienteOnline(id){
    if(!id)return;
    try{await db.collection('clientes').doc(id).update({online:!1});console.log('⚫ Offline:',id);}catch(e){}
}
async function carregarClientesOnline(){
    try{let sn=await db.collection('clientes').where('online','==',!0).get();let online=sn.docs.map(d=>({id:d.id,...d.data()}));console.log('🟢 Online encontrados:',online.length);return online;}catch(e){return[];}
}
async function carregarTodosClientes(){
    try{let sn=await db.collection('clientes').orderBy('nome').get();return sn.docs.map(d=>({id:d.id,...d.data()}));}catch(e){return[];}
}
async function carregarClientesCadastrados(){
    if(!barbeiroLogado)return;let el=document.getElementById('totalClientesBarbeiro');if(!el)return;
    try{let sn=await db.collection('clientes').get();el.textContent=sn.size+' clientes';}catch(e){}
}

// ==========================================================
// UPLOAD IMAGEM/VIDEO POST
// ==========================================================
function previewImagemPost(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){imagemBase64=ev.target.result;document.getElementById('postImagem').value=imagemBase64;document.getElementById('imagemPreviewImg').src=imagemBase64;document.getElementById('imagemPreview').style.display='block';document.getElementById('imagemUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerImagemPost(){imagemBase64='';document.getElementById('postImagem').value='';document.getElementById('imagemPreview').style.display='none';document.getElementById('imagemUploadArea').style.display='block';document.getElementById('postImagemInput').value='';}
function previewVideoPost(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){videoBase64=ev.target.result;document.getElementById('postVideo').value=videoBase64;document.getElementById('videoPreviewVideo').src=videoBase64;document.getElementById('videoPreview').style.display='block';document.getElementById('videoUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerVideoPost(){videoBase64='';document.getElementById('postVideo').value='';document.getElementById('videoPreview').style.display='none';document.getElementById('videoUploadArea').style.display='block';document.getElementById('postVideoInput').value='';}

// ==========================================================
// FEED / POSTS
// ==========================================================
async function criarPost(){if(!barbeiroLogado)return;let titulo=document.getElementById('postTitulo').value.trim(),preco=parseFloat(document.getElementById('postPreco').value),descricao=document.getElementById('postDescricao').value.trim(),imagem=document.getElementById('postImagem').value||'',video=document.getElementById('postVideo').value||'';if(!titulo||!preco||preco<=0){mostrarToast('❌ Título e preço!','error');return;}try{let id=Date.now().toString();await db.collection('posts').doc(id).set({id,barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,titulo,preco,descricao,imagem,video,likes:0,comentarios:[],dataCriacao:new Date().toISOString()});mostrarToast('✅ Publicado!','success');document.getElementById('postTitulo').value='';document.getElementById('postPreco').value='';document.getElementById('postDescricao').value='';removerImagemPost();removerVideoPost();mostrarTela('homeBarbeiro');}catch(e){mostrarToast('❌ Erro!','error');}}
async function carregarFeedCliente(){let c=document.getElementById('feedClienteContainer');if(!c)return;try{let sn=await db.collection('posts').orderBy('dataCriacao','desc').get();let posts=sn.docs.map(d=>({id:d.id,...d.data()}));if(posts.length===0){c.innerHTML='<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post</h3></div>';return;}c.innerHTML=posts.map(p=>'<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+(p.barbeiroNome||'Barbearia RM')+'</div><div class="feed-post-user-time">'+new Date(p.dataCriacao).toLocaleDateString('pt-BR')+'</div></div></div>'+(p.video?'<video class="feed-post-video" controls><source src="'+p.video+'" type="video/mp4"></video>':'')+(p.imagem&&!p.video?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><div class="feed-post-title">'+p.titulo+'</div><div class="feed-post-price">R$ '+(p.preco||0).toFixed(2)+'</div></div><div class="feed-post-actions"><button>❤️ '+(p.likes||0)+'</button><button class="btn-comentar" data-id="'+p.id+'">💬 '+(p.comentarios||[]).length+'</button></div></div>').join('');document.querySelectorAll('.btn-comentar').forEach(b=>b.addEventListener('click',function(){abrirComentarios(this.dataset.id);}));}catch(e){}}
async function carregarMeusPosts(){let c=document.getElementById('meusPostsContainer');if(!c||!barbeiroLogado)return;try{let sn=await db.collection('posts').where('barbeiroId','==',barbeiroLogado.id).get();let posts=[];sn.forEach(d=>posts.push({id:d.id,...d.data()}));posts.sort((a,b)=>new Date(b.dataCriacao)-new Date(a.dataCriacao));if(posts.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum post</p>';return;}c.innerHTML=posts.map(p=>'<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+p.titulo+'</div><div class="feed-post-user-time">R$ '+(p.preco||0).toFixed(2)+'</div></div></div>'+(p.imagem?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<button class="btn btn-small btn-danger btn-excluir" data-id="'+p.id+'">🗑</button></div>').join('');document.querySelectorAll('.btn-excluir').forEach(b=>b.addEventListener('click',function(){excluirMeuPost(this.dataset.id);}));}catch(e){}}
async function excluirMeuPost(id){if(!confirm('Excluir?'))return;await db.collection('posts').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarMeusPosts();carregarFeedCliente();}
function abrirComentarios(id){postSelecionadoId=id;carregarComentarios(id);document.getElementById('modalComentario').classList.add('active');}
async function carregarComentarios(id){let c=document.getElementById('comentariosContainer');if(!c)return;let doc=await db.collection('posts').doc(id).get();if(!doc.exists)return;let com=doc.data().comentarios||[];c.innerHTML=com.length===0?'<p style="color:#6B7280;">Nenhum</p>':com.map(x=>'<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">'+x.autor+'</strong><p style="color:#B0B0B0;">'+x.texto+'</p></div>').join('');}
async function adicionarComentario(){let t=document.getElementById('novoComentario').value.trim();if(!t)return;let autor=clienteLogado?clienteLogado.nome:(barbeiroLogado?barbeiroLogado.nome:'Anônimo');let doc=await db.collection('posts').doc(postSelecionadoId).get();let com=doc.data().comentarios||[];com.push({autor,texto:t,data:new Date().toISOString()});await db.collection('posts').doc(postSelecionadoId).update({comentarios:com});document.getElementById('novoComentario').value='';carregarComentarios(postSelecionadoId);}
function fecharModalComentario(){document.getElementById('modalComentario').classList.remove('active');}

// ==========================================================
// AGENDAMENTOS
// ==========================================================
function carregarOpcoesAgendamento(){let sh=document.getElementById('agendamentoHorario'),st=document.getElementById('agendamentoTipo');if(sh){let h=[];for(let i=9;i<=18;i++)for(let j=0;j<60;j+=30){if(i===18&&j>0)break;h.push(String(i).padStart(2,'0')+':'+String(j).padStart(2,'0'));}sh.innerHTML=h.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}if(st){let t=['Corte Social','Corte Degradê','Corte Navalhado','Corte Máquina','Barba','Barba + Corte'];st.innerHTML=t.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}let d=document.getElementById('agendamentoData');if(d)d.min=new Date().toISOString().split('T')[0];}
async function agendarCorte(){if(!clienteLogado){mostrarToast('❌ Faça login!','error');return;}let d=document.getElementById('agendamentoData').value,h=document.getElementById('agendamentoHorario').value,t=document.getElementById('agendamentoTipo').value;if(!d){mostrarToast('❌ Selecione data!','error');return;}try{let id=Date.now().toString();await db.collection('agendamentos').doc(id).set({id,clienteId:clienteLogado.id,clienteNome:clienteLogado.nome,data:d,horario:h,tipo:t,status:'pendente',dataCriacao:new Date().toISOString()});mostrarToast('✅ Agendado!','success');document.getElementById('agendamentoData').value='';carregarAgendaCliente();mostrarTela('homeCliente');}catch(e){}}
async function carregarAgendaCliente(){if(!clienteLogado)return;let c=document.getElementById('agendaClienteContainer');if(!c)return;try{let sn=await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).get();let ag=sn.docs.map(d=>({id:d.id,...d.data()}));ag.sort((a,b)=>new Date(b.data)-new Date(a.data));if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}c.innerHTML=ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">'+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+(a.status==='confirmado'?'✅':a.status==='cancelado'?'❌':a.status==='concluido'?'✔️':'⏳')+' '+a.status+'</span></div>').join('');}catch(e){}}
async function carregarAgendamentosBarbeiro(){let c=document.getElementById('agendamentosBarbeiroContainer');if(!c)return;try{let sn=await db.collection('agendamentos').orderBy('data','desc').get();let ag=sn.docs.map(d=>({id:d.id,...d.data()}));if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}c.innerHTML=ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 '+(a.clienteNome||'Cliente')+' - '+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+a.status+'</span>'+ (a.status==='pendente'?'<button class="btn btn-small btn-success" onclick="confirmarAgendamento(\''+a.id+'\')">✅</button><button class="btn btn-small btn-danger" onclick="cancelarAgendamento(\''+a.id+'\')">❌</button>':'')+ (a.status==='confirmado'?'<button class="btn btn-small btn-outline" onclick="concluirAgendamento(\''+a.id+'\')">✔️</button>':'')+'</div>').join('');}catch(e){}}
async function confirmarAgendamento(id){await db.collection('agendamentos').doc(id).update({status:'confirmado'});carregarAgendamentosBarbeiro();if(clienteLogado)carregarAgendaCliente();mostrarToast('✅ Confirmado!','success');}
async function cancelarAgendamento(id){if(!confirm('Cancelar?'))return;await db.collection('agendamentos').doc(id).update({status:'cancelado'});carregarAgendamentosBarbeiro();if(clienteLogado)carregarAgendaCliente();mostrarToast('❌ Cancelado!','info');}
async function concluirAgendamento(id){await db.collection('agendamentos').doc(id).update({status:'concluido'});carregarAgendamentosBarbeiro();if(clienteLogado)carregarAgendaCliente();mostrarToast('✔️ Concluído!','success');}

// ==========================================================
// PLANOS
// ==========================================================
async function carregarPlanos(){let c=document.getElementById('planosContainer');if(!c)return;try{let sn=await db.collection('planos').orderBy('dataCriacao','desc').get();let p=sn.docs.map(d=>({id:d.id,...d.data()}));if(p.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum plano</p>';return;}c.innerHTML=p.map(x=>'<div class="plano-card"><div class="plano-info"><div class="plano-nome">'+x.nome+'</div><div class="plano-periodo">📅 '+x.periodo+'</div></div><div class="plano-preco">R$ '+(x.preco||0).toFixed(2)+'</div><div style="display:flex;gap:4px;"><button class="btn btn-small btn-primary" onclick="editarPlano(\''+x.id+'\')">✏️</button><button class="btn btn-small btn-danger" onclick="excluirPlano(\''+x.id+'\')">🗑</button></div></div>').join('');}catch(e){}}
async function criarPlano(){if(!barbeiroLogado)return;let n=document.getElementById('planoNome').value.trim(),p=document.getElementById('planoPeriodo').value,pr=parseFloat(document.getElementById('planoPreco').value);if(!n||!pr){mostrarToast('❌ Preencha!','error');return;}try{let id=Date.now().toString();await db.collection('planos').doc(id).set({id,barbeiroId:barbeiroLogado.id,nome:n,periodo:p,preco:pr,dataCriacao:new Date().toISOString()});mostrarToast('✅ Plano criado!','success');document.getElementById('planoNome').value='';document.getElementById('planoPreco').value='';mostrarTela('homeBarbeiro');}catch(e){}}
async function editarPlano(id){let novoNome=prompt('Novo nome:');if(!novoNome)return;let novoPreco=parseFloat(prompt('Novo preço:'));if(!novoPreco)return;await db.collection('planos').doc(id).update({nome:novoNome,preco:novoPreco});carregarPlanos();mostrarToast('✅ Atualizado!','success');}
async function excluirPlano(id){if(!confirm('Excluir plano?'))return;await db.collection('planos').doc(id).delete();carregarPlanos();mostrarToast('🗑 Excluído!','success');}

// ==========================================================
// EXTRATO
// ==========================================================
async function filtrarExtrato(periodo){calcularExtrato(periodo);}
async function calcularExtrato(periodo){let container=document.getElementById('extratoContainer');if(!container)return;try{let sn=await db.collection('agendamentos').where('status','in',['confirmado','concluido']).get();let ag=sn.docs.map(d=>d.data());let hoje=new Date();let total=0;let itens=[];ag.forEach(a=>{let dataAg=new Date(a.data);let valor=35;let incluir=!1;if(periodo==='hoje'){incluir=a.data===hoje.toISOString().split('T')[0];}else if(periodo==='semana'){let ini=new Date(hoje);ini.setDate(hoje.getDate()-hoje.getDay());incluir=dataAg>=ini;}else if(periodo==='mes'){incluir=dataAg.getMonth()===hoje.getMonth()&&dataAg.getFullYear()===hoje.getFullYear();}else if(periodo==='ano'){incluir=dataAg.getFullYear()===hoje.getFullYear();}else{incluir=!0;}if(incluir){total+=valor;itens.push(a);}});document.getElementById('extratoHoje').textContent='R$ '+total.toFixed(2);document.getElementById('extratoSemana').textContent='R$ '+(total*0.3).toFixed(2);document.getElementById('extratoMes').textContent='R$ '+(total*0.7).toFixed(2);document.getElementById('extratoAno').textContent='R$ '+total.toFixed(2);if(itens.length===0){container.innerHTML='<p style="color:#6B7280;text-align:center;">Nenhum agendamento</p>';return;}container.innerHTML='<p style="color:#D4A84B;margin-bottom:8px;">Total: <strong>R$ '+total.toFixed(2)+'</strong> ('+itens.length+' cortes)</p>'+itens.map(a=>'<div style="padding:8px;margin:2px 0;background:rgba(255,255,255,.03);border-radius:6px;font-size:12px;">👤 '+a.clienteNome+' • ✂️ '+a.tipo+' • 📅 '+a.data+' • R$ 35,00</div>').join('');}catch(e){}}

// ==========================================================
// ANÚNCIOS / PERFIL / FATURAMENTO
// ==========================================================
async function carregarAnuncios(){let c=document.getElementById('anunciosContainer');if(!c)return;try{let hoje=new Date().toISOString();let sn=await db.collection('anuncios').where('dataExpiracao','>',hoje).get();let a=sn.docs.map(d=>({id:d.id,...d.data()}));if(a.length===0){c.innerHTML='<p style="color:#6B7280;">📢 Nenhum</p>';return;}c.innerHTML=a.map(x=>'<div class="card" style="border:2px solid #FF6B6B;"><span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢</span>'+(x.imagem?'<img src="'+x.imagem+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;">':'')+'<h3 style="color:#FF6B6B;">'+x.titulo+'</h3><p>'+x.descricao+'</p></div>').join('');}catch(e){}}
function carregarPerfilCliente(){if(!clienteLogado)return;document.getElementById('perfilClienteNome').textContent=clienteLogado.nome;document.getElementById('perfilClienteEmail').textContent=clienteLogado.email;document.getElementById('editClienteNome').value=clienteLogado.nome||'';document.getElementById('editClienteCelular').value=clienteLogado.celular||'';}
async function salvarPerfilCliente(){if(!clienteLogado)return;let n=document.getElementById('editClienteNome').value.trim(),c=document.getElementById('editClienteCelular').value.trim();await db.collection('clientes').doc(clienteLogado.id).update({nome:n,celular:c});clienteLogado.nome=n;clienteLogado.celular=c;salvarSessao('cliente',clienteLogado);mostrarToast('✅ Salvo!','success');}
function carregarPerfilBarbeiro(){if(!barbeiroLogado)return;document.getElementById('perfilBarbeiroNome').textContent=barbeiroLogado.nome;document.getElementById('perfilBarbeiroEmail').textContent=barbeiroLogado.email;document.getElementById('editBarbeiroNome').value=barbeiroLogado.nome||'';document.getElementById('editBarbeiroCelular').value=barbeiroLogado.celular||'';document.getElementById('editBarbeiroEmail').value=barbeiroLogado.email||'';}
async function salvarPerfilBarbeiro(){if(!barbeiroLogado)return;let n=document.getElementById('editBarbeiroNome').value.trim(),c=document.getElementById('editBarbeiroCelular').value.trim(),e=document.getElementById('editBarbeiroEmail').value.trim();await db.collection('barbeiros').doc(barbeiroLogado.id).update({nome:n,celular:c,email:e});barbeiroLogado.nome=n;barbeiroLogado.celular=c;barbeiroLogado.email=e;salvarSessao('barbeiro',barbeiroLogado);mostrarToast('✅ Salvo!','success');}
async function calcularFaturamento(){try{let sn=await db.collection('agendamentos').where('status','in',['confirmado','concluido']).get();let ag=sn.docs.map(d=>d.data()),hoje=new Date().toISOString().split('T')[0],th=0,tg=0;ag.forEach(a=>{let v=35;if(a.data===hoje)th+=v;tg+=v;});document.getElementById('faturamentoHoje').textContent='R$ '+th.toFixed(2);document.getElementById('faturamentoSemana').textContent='R$ '+(tg*0.3).toFixed(2);document.getElementById('faturamentoMes').textContent='R$ '+(tg*0.7).toFixed(2);document.getElementById('faturamentoAno').textContent='R$ '+tg.toFixed(2);}catch(e){}}
async function verificarLiveBadge(){try{let doc=await db.collection('lives').doc('live_atual').get();liveAtivaGeral=doc.exists&&doc.data().ativa;let bc=document.getElementById('liveBadgeCliente'),bb=document.getElementById('liveBadgeBarbeiro');if(bc)bc.style.display=liveAtivaGeral?'inline-block':'none';if(bb)bb.style.display=liveAtivaGeral?'inline-block':'none';}catch(e){}}

// ==========================================================
// SOCIAL / CHAT PRIVADO
// ==========================================================
async function carregarSocialCliente(){let c=document.getElementById('socialClientesOnline');if(!c)return;let online=await carregarClientesOnline();online=online.filter(x=>x.id!==(clienteLogado?clienteLogado.id:''));if(online.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum online</p>';return;}c.innerHTML=online.map(x=>'<div class="cliente-online-card" onclick="abrirChatCliente(\''+x.id+'\',\''+x.nome+'\')"><img src="'+(x.fotoPerfil||'logobarbearia-rm.png')+'"><div style="flex:1;"><strong>'+x.nome+'</strong><br><span style="color:#0c6;font-size:10px;">● Online</span></div></div>').join('');}
async function carregarSocialBarbeiro(){
    let co=document.getElementById('socialBarbeiroOnline'),ct=document.getElementById('socialBarbeiroTodos');
    if(!co)return;
    let online=await carregarClientesOnline();
    document.getElementById('onlineAgora').textContent=online.length;
    co.innerHTML=online.length===0?'<p style="color:#6B7280;text-align:center;padding:20px;">Nenhum cliente online</p>':online.map(x=>'<div class="cliente-online-card" onclick="verPerfilCliente(\''+x.id+'\')"><img src="'+(x.fotoPerfil||'logobarbearia-rm.png')+'"><div style="flex:1;"><strong>'+x.nome+'</strong><br><span style="color:#0c6;font-size:10px;">● Online agora</span></div><button class="btn btn-small btn-outline" onclick="event.stopPropagation();abrirChatCliente(\''+x.id+'\',\''+x.nome+'\')">💬</button></div>').join('');
    if(ct){let todos=await carregarTodosClientes();document.getElementById('totalClientesSocial').textContent=todos.length;ct.innerHTML=todos.map(x=>'<div class="cliente-online-card" style="border-color:rgba(255,255,255,0.1);" onclick="verPerfilCliente(\''+x.id+'\')"><img src="'+(x.fotoPerfil||'logobarbearia-rm.png')+'" style="border-color:'+(x.online?'#0c6':'#666')+'"><div style="flex:1;"><strong>'+x.nome+'</strong><br><span style="color:'+(x.online?'#0c6':'#aaa')+';font-size:10px;">'+(x.online?'● Online agora':'○ Offline')+'</span></div><button class="btn btn-small btn-outline" onclick="event.stopPropagation();abrirChatCliente(\''+x.id+'\',\''+x.nome+'\')">💬</button></div>').join('');}
}
async function carregarConversasSocial(){let c=document.getElementById('socialConversas');if(!c||!clienteLogado)return;try{let sn=await db.collection('chats').get();let conv=[];sn.forEach(d=>{let data=d.data();if(d.id.includes(clienteLogado.id)&&data.mensagens&&data.mensagens.length>0){conv.push({id:d.id,ultima:data.mensagens[data.mensagens.length-1],total:data.mensagens.length});}});if(conv.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhuma conversa</p>';return;}c.innerHTML=conv.map(x=>'<div style="padding:12px;background:rgba(255,255,255,.03);border-radius:10px;margin-bottom:6px;cursor:pointer;" onclick="abrirChatPorId(\''+x.id+'\')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:45px;height:45px;border-radius:50%;background:linear-gradient(135deg,#D4A84B,#B8923A);display:flex;align-items:center;justify-content:center;font-size:20px;color:#1a1a1a;">👤</div><div style="flex:1;"><strong style="color:#D4A84B;">'+x.ultima.autor+'</strong><p style="color:#aaa;font-size:12px;">'+(x.ultima.texto||'')+(x.ultima.imagem?' 🖼️':'')+(x.ultima.audio?' 🎤':'')+'</p></div><span style="font-size:10px;color:#666;">'+x.total+'</span></div></div>').join('');}catch(e){}}
async function carregarConversasSocialBarbeiro(){let c=document.getElementById('socialConversasBarbeiro');if(!c||!barbeiroLogado)return;try{let sn=await db.collection('chats').get();let conv=[];sn.forEach(d=>{let data=d.data();if(data.mensagens&&data.mensagens.length>0){conv.push({id:d.id,ultima:data.mensagens[data.mensagens.length-1],total:data.mensagens.length});}});if(conv.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhuma conversa</p>';return;}c.innerHTML=conv.map(x=>'<div style="padding:12px;background:rgba(255,255,255,.03);border-radius:10px;margin-bottom:6px;cursor:pointer;" onclick="abrirChatPorId(\''+x.id+'\')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:45px;height:45px;border-radius:50%;background:linear-gradient(135deg,#D4A84B,#B8923A);display:flex;align-items:center;justify-content:center;font-size:20px;color:#1a1a1a;">👤</div><div style="flex:1;"><strong style="color:#D4A84B;">'+x.ultima.autor+'</strong><p style="color:#aaa;font-size:12px;">'+(x.ultima.texto||'')+(x.ultima.imagem?' 🖼️':'')+(x.ultima.audio?' 🎤':'')+'</p></div></div></div>').join('');}catch(e){}}
function abrirChatPorId(chatId){let partes=chatId.split('_');let meuId=clienteLogado?clienteLogado.id:(barbeiroLogado?barbeiroLogado.id:'');let outroId=partes.find(p=>p!==meuId);if(outroId){db.collection('clientes').doc(outroId).get().then(doc=>{if(doc.exists){let c=doc.data();abrirChatCliente(c.id,c.nome);}});}}
async function verPerfilCliente(id){try{let doc=await db.collection('clientes').doc(id).get();if(!doc.exists)return;let c=doc.data();document.getElementById('perfilClienteVistoNome').textContent=c.nome;document.getElementById('perfilClienteVistoEmail').textContent=c.email;document.getElementById('perfilClienteVistoCelular').textContent=c.celular||'Não informado';document.getElementById('perfilClienteVistoOnline').textContent=c.online?'🟢 Online':'⚫ Offline';document.getElementById('perfilClienteVistoAvatar').src=c.fotoPerfil||'logobarbearia-rm.png';document.getElementById('btnChatPerfilCliente').setAttribute('onclick','fecharPerfilCliente();abrirChatCliente(\''+c.id+'\',\''+c.nome+'\')');document.getElementById('modalPerfilCliente').classList.add('active');}catch(e){}}
function fecharPerfilCliente(){document.getElementById('modalPerfilCliente').classList.remove('active');}
function abrirChatCliente(id,nome){document.getElementById('chatClienteNome').textContent=nome;document.getElementById('chatClienteId').value=id;document.getElementById('modalChatCliente').classList.add('active');carregarMensagensChat(id);}
function fecharChatCliente(){document.getElementById('modalChatCliente').classList.remove('active');}
async function carregarMensagensChat(cid){
    let c=document.getElementById('chatMensagens');if(!c)return;
    let meuId=clienteLogado?clienteLogado.id:(barbeiroLogado?barbeiroLogado.id:'');
    let chatId=[meuId,cid].sort().join('_');
    try{
        let doc=await db.collection('chats').doc(chatId).get();
        let msgs=doc.exists?(doc.data().mensagens||[]):[];
        if(msgs.length===0){c.innerHTML='<div style="text-align:center;color:#aaa;padding:20px;">💬 Nenhuma mensagem ainda</div>';return;}
        let html='',lastDate='';
        msgs.forEach(m=>{
            let msgDate=new Date(m.data).toLocaleDateString('pt-BR');
            if(msgDate!==lastDate){html+='<div style="text-align:center;margin:10px 0;"><span style="background:#1a1a1a;color:#aaa;padding:4px 12px;border-radius:10px;font-size:11px;">'+msgDate+'</span></div>';lastDate=msgDate;}
            let isSent=m.autorId===meuId;
            let time=new Date(m.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
            if(isSent){
                html+='<div style="display:flex;justify-content:flex-end;margin:3px 0;"><div style="max-width:75%;background:linear-gradient(135deg,#D4A84B,#B8923A);color:#1a1a1a;padding:8px 12px;border-radius:12px 12px 0 12px;font-size:13px;line-height:1.4;">';
                if(m.imagem)html+='<img src="'+m.imagem+'" style="max-width:200px;border-radius:8px;margin-bottom:4px;cursor:pointer;" onclick="window.open(this.src)">';
                if(m.audio)html+='<audio controls src="'+m.audio+'" style="height:30px;width:180px;"></audio>';
                if(m.texto)html+=m.texto;
                html+='<div style="text-align:right;font-size:9px;opacity:0.7;margin-top:2px;">'+time+'</div></div></div>';
            }else{
                html+='<div style="display:flex;justify-content:flex-start;margin:3px 0;"><div style="max-width:75%;background:#2a2a2a;color:#fff;padding:8px 12px;border-radius:12px 12px 12px 0;font-size:13px;line-height:1.4;">';
                html+='<div style="font-size:10px;color:#D4A84B;font-weight:600;margin-bottom:2px;">'+m.autor+'</div>';
                if(m.imagem)html+='<img src="'+m.imagem+'" style="max-width:200px;border-radius:8px;margin-bottom:4px;cursor:pointer;" onclick="window.open(this.src)">';
                if(m.audio)html+='<audio controls src="'+m.audio+'" style="height:30px;width:180px;"></audio>';
                if(m.texto)html+=m.texto;
                html+='<div style="text-align:right;font-size:9px;opacity:0.5;margin-top:2px;">'+time+'</div></div></div>';
            }
        });
        c.innerHTML=html;c.scrollTop=c.scrollHeight;
    }catch(e){}
}
async function enviarMensagemChat(){let input=document.getElementById('chatMensagemInput');if(!input)return;let texto=input.value.trim();if(!texto)return;let cid=document.getElementById('chatClienteId').value;let meuId=clienteLogado?clienteLogado.id:(barbeiroLogado?barbeiroLogado.id:'');let meuNome=clienteLogado?clienteLogado.nome:(barbeiroLogado?barbeiroLogado.nome:'Anônimo');let chatId=[meuId,cid].sort().join('_');let doc=await db.collection('chats').doc(chatId).get();let msgs=doc.exists?(doc.data().mensagens||[]):[];msgs.push({autor:meuNome,autorId:meuId,texto,data:new Date().toISOString()});await db.collection('chats').doc(chatId).set({mensagens:msgs});input.value='';carregarMensagensChat(cid);}
async function enviarImagemChatPrivado(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=async function(ev){let cid=document.getElementById('chatClienteId').value;let meuId=clienteLogado?clienteLogado.id:(barbeiroLogado?barbeiroLogado.id:'');let meuNome=clienteLogado?clienteLogado.nome:(barbeiroLogado?barbeiroLogado.nome:'Anônimo');let chatId=[meuId,cid].sort().join('_');let doc=await db.collection('chats').doc(chatId).get();let msgs=doc.exists?(doc.data().mensagens||[]):[];msgs.push({autor:meuNome,autorId:meuId,imagem:ev.target.result,data:new Date().toISOString()});await db.collection('chats').doc(chatId).set({mensagens:msgs});carregarMensagensChat(cid);mostrarToast('🖼️ Imagem enviada!','success');};r.readAsDataURL(f);}

// ==========================================================
// ÁUDIO
// ==========================================================
async function iniciarGravacaoAudio(){if(gravandoAudio)return;try{let stream=await navigator.mediaDevices.getUserMedia({audio:!0});mediaRecorderAudio=new MediaRecorder(stream);audioChunks=[];mediaRecorderAudio.ondataavailable=(e)=>{if(e.data.size>0)audioChunks.push(e.data);};mediaRecorderAudio.onstop=async()=>{let blob=new Blob(audioChunks,{type:'audio/webm'});let reader=new FileReader();reader.onload=async(e)=>{let nome='Visitante';if(clienteLogado)nome=clienteLogado.nome;else if(barbeiroLogado)nome='✂️ '+barbeiroLogado.nome;await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:nome,audio:e.target.result,data:new Date().toISOString()})});};reader.readAsDataURL(blob);stream.getTracks().forEach(t=>t.stop());};mediaRecorderAudio.start();gravandoAudio=!0;let btn=document.getElementById('btnMic');if(btn){btn.classList.add('recording');btn.textContent='⏹️';}mostrarToast('🎤 Gravando...','info');setTimeout(()=>{if(gravandoAudio)pararGravacaoAudio();},30000);}catch(e){mostrarToast('❌ Permita o microfone!','error');}}
function pararGravacaoAudio(){if(!gravandoAudio||!mediaRecorderAudio)return;mediaRecorderAudio.stop();gravandoAudio=!1;let btn=document.getElementById('btnMic');if(btn){btn.classList.remove('recording');btn.textContent='🎤';}mostrarToast('✅ Áudio enviado!','success');}
async function iniciarGravacaoAudioPrivado(){if(gravandoAudio)return;try{let stream=await navigator.mediaDevices.getUserMedia({audio:!0});mediaRecorderAudio=new MediaRecorder(stream);audioChunks=[];mediaRecorderAudio.ondataavailable=(e)=>{if(e.data.size>0)audioChunks.push(e.data);};mediaRecorderAudio.onstop=async()=>{let blob=new Blob(audioChunks,{type:'audio/webm'});let reader=new FileReader();reader.onload=async(e)=>{let cid=document.getElementById('chatClienteId').value;let meuId=clienteLogado?clienteLogado.id:(barbeiroLogado?barbeiroLogado.id:'');let meuNome=clienteLogado?clienteLogado.nome:(barbeiroLogado?barbeiroLogado.nome:'Anônimo');let chatId=[meuId,cid].sort().join('_');let doc=await db.collection('chats').doc(chatId).get();let msgs=doc.exists?(doc.data().mensagens||[]):[];msgs.push({autor:meuNome,autorId:meuId,audio:e.target.result,data:new Date().toISOString()});await db.collection('chats').doc(chatId).set({mensagens:msgs});carregarMensagensChat(cid);mostrarToast('🎤 Áudio enviado!','success');};reader.readAsDataURL(blob);stream.getTracks().forEach(t=>t.stop());};mediaRecorderAudio.start();gravandoAudio=!0;let btn=document.getElementById('btnMicPrivado');if(btn){btn.classList.add('recording');btn.textContent='⏹️';}mostrarToast('🎤 Gravando...','info');setTimeout(()=>{if(gravandoAudio)pararGravacaoAudioPrivado();},30000);}catch(e){mostrarToast('❌ Permita o microfone!','error');}}
function pararGravacaoAudioPrivado(){if(!gravandoAudio||!mediaRecorderAudio)return;mediaRecorderAudio.stop();gravandoAudio=!1;let btn=document.getElementById('btnMicPrivado');if(btn){btn.classList.remove('recording');btn.textContent='🎤';}}

// ==========================================================
// LIVE
// ==========================================================
function carregarLiveTela(){let ctrl=document.getElementById('liveControlsCard');let btn=document.getElementById('btnIniciarLiveNaTela');let ph=document.getElementById('livePlaceholder');let pht=document.getElementById('livePlaceholderText');if(btn)btn.style.display='none';if(barbeiroLogado){if(ctrl)ctrl.style.display='none';if(btn)btn.style.display='inline-block';if(pht)pht.textContent='Estúdio offline';if(!liveAtiva&&ph)ph.style.display='flex';}else if(clienteLogado){if(ctrl)ctrl.style.display='none';if(liveAtivaGeral){if(ph)ph.style.display='none';document.getElementById('liveStatus').style.display='block';iniciarVisualizacaoCliente();}else{if(ph)ph.style.display='flex';if(pht)pht.textContent='Nenhuma live no momento';}}verificarLiveBadge();}
async function iniciarLive(){if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}try{let stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:liveFacingMode},audio:{echoCancellation:!0,noiseSuppression:!0}});liveStreamLocal=stream;liveStream=stream;liveAtiva=!0;liveAtivaGeral=!0;let v=document.getElementById('liveVideo');v.srcObject=stream;v.muted=!0;v.style.display='block';document.getElementById('livePlaceholder').style.display='none';document.getElementById('liveControlsCard').style.display='block';document.getElementById('liveStatus').style.display='block';liveDuracao=0;if(liveTimerInterval)clearInterval(liveTimerInterval);liveTimerInterval=setInterval(()=>{liveDuracao++;let h=Math.floor(liveDuracao/3600),m=Math.floor((liveDuracao%3600)/60),s=liveDuracao%60;document.getElementById('liveDuration').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');},1000);await db.collection('lives').doc('live_atual').set({id:'live_atual',titulo:'Live Barbearia RM',barbeiroNome:barbeiroLogado.nome,ativa:!0,chat:[],viewers:0,likes:0,sorteioAtivo:!1,premioSorteio:'',participantesSorteio:[],dataInicio:new Date().toISOString()});iniciarCapturaFrames();iniciarChatListenerLive();notificarClientesLive();setTimeout(()=>{notificarClientesWhatsApp();},3000);mostrarToast('🔴 Live iniciada!','success');}catch(er){mostrarToast('❌ '+er.message,'error');}}
function iniciarCapturaFrames(){if(liveFrameInterval)clearInterval(liveFrameInterval);let canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;let ctx=canvas.getContext('2d');liveFrameInterval=setInterval(async()=>{if(!liveAtiva||!liveStreamLocal)return;try{let v=document.getElementById('liveVideo');if(!v||v.videoWidth===0)return;ctx.drawImage(v,0,0,320,180);let frame=canvas.toDataURL('image/jpeg',0.5);await db.collection('lives').doc('live_atual').update({ultimoFrame:frame,frameTimestamp:Date.now()});}catch(e){}},1500);}
function iniciarVisualizacaoCliente(){let old=document.getElementById('liveFrameImg');if(old)old.remove();let img=document.createElement('img');img.id='liveFrameImg';img.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;';document.getElementById('livePlayerContainer').querySelector('div').appendChild(img);let interval=setInterval(async()=>{try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa){clearInterval(interval);if(img)img.remove();document.getElementById('livePlaceholder').style.display='flex';document.getElementById('liveStatus').style.display='none';liveAtivaGeral=!1;return;}let frame=doc.data().ultimoFrame;if(frame&&img)img.src=frame;}catch(e){}},1500);db.collection('lives').doc('live_atual').update({viewers:firebase.firestore.FieldValue.increment(1)});iniciarChatListenerLive();}
function iniciarChatListenerLive(){if(liveChatListener)liveChatListener();liveChatListener=db.collection('lives').doc('live_atual').onSnapshot((doc)=>{if(!doc.exists||!doc.data().ativa)return;let data=doc.data();let chat=data.chat||[];let c=document.getElementById('liveChatMessages');if(!c)return;let meuNome=clienteLogado?.nome||barbeiroLogado?.nome||'';let html='';if(data.sorteioAtivo){let p=data.participantesSorteio||[];html+='<div style="background:rgba(255,215,0,0.2);padding:14px;border-radius:12px;margin:8px 0;border:2px solid #FFD700;text-align:center;align-self:stretch;"><div style="font-size:24px;">🎉</div><strong style="color:#FFD700;font-size:16px;">SORTEIO ATIVO!</strong><br><span style="color:white;">Prêmio: '+data.premioSorteio+'</span><br><span style="font-size:11px;color:#FFD700;">Digite <b>!PARTICIPAR</b></span><br><span style="font-size:12px;color:#fff;">👥 '+p.length+' participantes</span></div>';}if(chat.length===0&&!data.sorteioAtivo){html+='<p style="color:#aaa;text-align:center;font-size:12px;align-self:center;">💬 Seja o primeiro!</p>';}chat.forEach(m=>{let isSent=m.autor===meuNome||m.autor==='✂️ '+meuNome;let cls=isSent?'sent':'received';let time=m.data?new Date(m.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';if(m.audio){html+='<div class="chat-bubble '+cls+' audio-bubble">'+(!isSent?'<div class="msg-sender">'+m.autor+'</div>':'')+'<audio controls src="'+m.audio+'" style="height:30px;width:160px;"></audio><span class="msg-time">🎤 '+time+'</span></div>';}else{html+='<div class="chat-bubble '+cls+'">'+(!isSent?'<div class="msg-sender">'+m.autor+'</div>':'')+m.texto+'<div class="msg-time">'+time+'</div></div>';}});c.innerHTML=html;c.scrollTop=c.scrollHeight;document.getElementById('liveLikeCount').textContent=data.likes||0;document.getElementById('liveViewerCount').textContent='👥 '+(data.viewers||0);});}
async function enviarChatLive(){let input=document.getElementById('liveChatInput');if(!input)return;let msg=input.value.trim();if(!msg)return;let nome='Visitante',foto='logobarbearia-rm.png';if(clienteLogado){nome=clienteLogado.nome;foto=clienteLogado.fotoPerfil||'logobarbearia-rm.png';}else if(barbeiroLogado){nome='✂️ '+barbeiroLogado.nome;foto=barbeiroLogado.fotoPerfil||'logobarbearia-rm.png';}try{await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:nome,foto,texto:msg,data:new Date().toISOString()})});input.value='';if(msg.toUpperCase().trim()==='!PARTICIPAR'){await participarSorteioFirebase(nome);}}catch(e){}}
async function participarSorteioFirebase(nome){try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists)return;let data=doc.data();if(!data.sorteioAtivo){mostrarToast('⚠️ Nenhum sorteio ativo!','info');return;}let p=data.participantesSorteio||[];if(p.includes(nome)){mostrarToast('⚠️ Você já participa!','info');return;}p.push(nome);await db.collection('lives').doc('live_atual').update({participantesSorteio:p});mostrarToast('✅ '+nome+' entrou! ('+p.length+'👥)','success');}catch(e){}}
async function iniciarSorteio(premio){if(!barbeiroLogado)return;if(!premio)premio=document.getElementById('premioSorteioInput').value.trim()||'Corte Grátis';try{await db.collection('lives').doc('live_atual').update({sorteioAtivo:!0,premioSorteio:premio,participantesSorteio:[],chat:firebase.firestore.FieldValue.arrayUnion({autor:'🎉 SORTEIO',foto:'',texto:'SORTEIO INICIADO! Prêmio: '+premio+' | Digite !PARTICIPAR',data:new Date().toISOString()})});mostrarToast('🎉 Sorteio iniciado!','success');}catch(e){}}
async function realizarSorteio(){if(!barbeiroLogado)return;try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists)return;let data=doc.data();let p=data.participantesSorteio||[];let premio=data.premioSorteio||'Corte Grátis';if(p.length===0){mostrarToast('❌ Ninguém participou!','error');return;}let v=p[Math.floor(Math.random()*p.length)];await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:'🏆 RESULTADO',foto:'',texto:'🎉 VENCEDOR: '+v+'! Prêmio: '+premio+' | Parabéns! 🎉',data:new Date().toISOString()}),sorteioAtivo:!1,participantesSorteio:[]});mostrarToast('🏆 '+v+' venceu!','success');}catch(e){}}
async function curtirLive(){try{await db.collection('lives').doc('live_atual').update({likes:firebase.firestore.FieldValue.increment(1)});let h=document.createElement('div');h.textContent='❤️';h.style.cssText='position:absolute;font-size:30px;pointer-events:none;z-index:20;animation:floatHeart 2s ease-out forwards;left:'+(Math.random()*80+10)+'%;bottom:20%;';document.getElementById('livePlayerContainer').appendChild(h);setTimeout(()=>h.remove(),2000);}catch(e){}}
async function reagirLive(emoji){try{let r=document.createElement('div');r.textContent=emoji;r.style.cssText='position:absolute;font-size:35px;pointer-events:none;z-index:20;animation:floatReaction 3s ease-out forwards;left:'+(Math.random()*80+10)+'%;bottom:30%;';document.getElementById('livePlayerContainer').appendChild(r);setTimeout(()=>r.remove(),3000);}catch(e){}}
async function pararLive(){if(anuncioAutoAtivo)pararAnuncioAutomatico();if(gravandoTrecho)pararGravacaoTrecho();if(liveTimerInterval)clearInterval(liveTimerInterval);if(liveFrameInterval)clearInterval(liveFrameInterval);if(liveChatListener)liveChatListener();if(liveStreamLocal)liveStreamLocal.getTracks().forEach(t=>t.stop());liveStream=null;liveStreamLocal=null;liveAtiva=!1;liveAtivaGeral=!1;let v=document.getElementById('liveVideo');if(v){v.srcObject=null;v.style.display='none';}let f=document.getElementById('liveFrameImg');if(f)f.remove();document.getElementById('livePlaceholder').style.display='flex';document.getElementById('liveControlsCard').style.display='none';document.getElementById('liveStatus').style.display='none';document.getElementById('liveDuration').textContent='00:00:00';await db.collection('lives').doc('live_atual').update({ativa:!1});carregarLiveTela();}
function iniciarGravacaoTrecho(){if(!liveStream||gravandoTrecho)return;try{mediaRecorder=new MediaRecorder(liveStream,MediaRecorder.isTypeSupported('video/webm')?{mimeType:'video/webm'}:{});}catch(e){mediaRecorder=new MediaRecorder(liveStream);}recordedChunks=[];mediaRecorder.ondataavailable=e=>{if(e.data.size>0)recordedChunks.push(e.data);};mediaRecorder.onstop=()=>{let blob=new Blob(recordedChunks,{type:'video/webm'}),url=URL.createObjectURL(blob);trechosGravados.push({id:Date.now(),url,blob});mostrarToast('✅ Trecho salvo!','success');};mediaRecorder.start(1000);gravandoTrecho=!0;document.getElementById('btnRecordClip').style.display='none';document.getElementById('btnStopClip').style.display='inline-block';}
function pararGravacaoTrecho(){if(!gravandoTrecho||!mediaRecorder)return;mediaRecorder.stop();gravandoTrecho=!1;document.getElementById('btnRecordClip').style.display='inline-block';document.getElementById('btnStopClip').style.display='none';}
function salvarTrechosLive(){trechosGravados.forEach((c,i)=>{let a=document.createElement('a');a.href=c.url;a.download='clip-'+(i+1)+'.webm';a.click();});}
async function trocarCameraLive(){liveFacingMode=liveFacingMode==='user'?'environment':'user';if(liveStreamLocal)liveStreamLocal.getTracks().forEach(t=>t.stop());try{let s=await navigator.mediaDevices.getUserMedia({video:{facingMode:liveFacingMode,width:{ideal:640}},audio:!0});liveStreamLocal=s;liveStream=s;document.getElementById('liveVideo').srcObject=s;}catch(e){}}
function aplicarEfeitoLive(efeito){let v=document.getElementById('liveVideo');if(!v)return;v.style.filter='';if(efeito==='bw')v.style.filter='grayscale(100%)';else if(efeito==='sepia')v.style.filter='sepia(80%)';else if(efeito==='neon')v.style.filter='brightness(1.2) contrast(1.3) saturate(1.5)';}
function mostrarTelaLive(tipo){document.getElementById('overlayComercial').style.display='none';document.getElementById('overlayAnuncio').style.display='none';if(tipo==='comercial')document.getElementById('overlayComercial').style.display='block';else if(tipo==='anuncio')document.getElementById('overlayAnuncio').style.display='flex';}
function carregarComercialLive(event){let f=event.target.files[0];if(!f)return;let v=document.getElementById('comercialVideo');v.src=URL.createObjectURL(f);v.loop=!0;v.muted=!0;}
function compartilharLive(rede){let url=window.location.href,t='🔴 Barbearia RM - Ao Vivo!';if(rede==='link'){navigator.clipboard.writeText(url);mostrarToast('📋 Link copiado!','success');}else if(rede==='whatsapp')window.open('https://wa.me/?text='+encodeURIComponent(t+' '+url),'_blank');}
async function finalizarLive(){if(!confirm('Finalizar live?'))return;await pararLive();mostrarToast('✅ Finalizada!','info');}
async function notificarClientesWhatsApp(){if(!barbeiroLogado)return;try{let sn=await db.collection('clientes').get();let url=window.location.href.split('?')[0]+'?live=1';let c=0;sn.forEach(async(doc)=>{let cl=doc.data();if(cl.celular&&cl.celular.length>=10){let n=cl.celular.replace(/\D/g,'');if(n.length===11)n='55'+n;await db.collection('notificacoes').add({clienteId:cl.id,tipo:'whatsapp',titulo:'📱 Convite',link:'https://wa.me/'+n+'?text='+encodeURIComponent('🔴 LIVE! Assista: '+url),lida:!1,data:new Date().toISOString()});c++;}});setTimeout(()=>{document.getElementById('whatsappStatus').textContent='✅ '+c+' links';document.getElementById('whatsappStatus').style.color='#00cc66';},2000);}catch(e){}}
async function enviarConvitesWhatsApp(){if(!barbeiroLogado)return;if(!confirm('Abrir WhatsApp?'))return;try{let sn=await db.collection('clientes').get();let url=window.location.href.split('?')[0]+'?live=1';let c=0;for(let doc of sn.docs){let cl=doc.data();if(cl.celular&&cl.celular.length>=10){let n=cl.celular.replace(/\D/g,'');if(n.length===11)n='55'+n;if(c<5)window.open('https://wa.me/'+n+'?text='+encodeURIComponent('🔴 LIVE! '+url),'_blank');c++;await new Promise(r=>setTimeout(r,300));}}mostrarToast('📱 '+c+' convites!','success');}catch(e){}}
function notificarClientesLive(){db.collection('clientes').get().then(sn=>{sn.forEach(doc=>{db.collection('notificacoes').add({clienteId:doc.id,titulo:'🔴 LIVE!',mensagem:'Barbearia RM está ao vivo!',tipo:'live',lida:!1,data:new Date().toISOString()});});});}
function carregarAnuncioAuto(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=e=>{anuncioImagemAuto=e.target.result;};r.readAsDataURL(f);}
function iniciarAnuncioAutomatico(){if(!anuncioImagemAuto)return;let t=document.getElementById('anuncioTextoInput').value.trim();let i=parseInt(document.getElementById('anuncioIntervalo').value)*1000;anuncioTextoAuto=t||'🔥 Oferta!';anuncioAutoAtivo=!0;document.getElementById('btnIniciarAnuncioAuto').style.display='none';document.getElementById('btnPararAnuncioAuto').style.display='inline-block';mostrarAnuncioAuto();anuncioAutoInterval=setInterval(mostrarAnuncioAuto,i);}
function mostrarAnuncioAuto(){let o=document.getElementById('overlayAnuncio'),img=document.getElementById('anuncioImg'),txt=document.getElementById('anuncioTexto');if(!o||!img)return;img.src=anuncioImagemAuto;txt.textContent=anuncioTextoAuto;o.style.display='flex';o.style.opacity='1';if(anuncioAutoTimeout)clearTimeout(anuncioAutoTimeout);anuncioAutoTimeout=setTimeout(esconderAnuncioAuto,5000);}
function esconderAnuncioAuto(){let o=document.getElementById('overlayAnuncio');if(!o)return;o.style.opacity='0';setTimeout(()=>{o.style.display='none';},400);}
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
    document.getElementById('btnMic')?.addEventListener('click',()=>{if(gravandoAudio)pararGravacaoAudio();else iniciarGravacaoAudio();});
    document.getElementById('btnIniciarSorteio')?.addEventListener('click',function(){let p=document.getElementById('premioSorteioInput').value.trim()||'Corte Grátis';iniciarSorteio(p);});
    document.getElementById('btnRealizarSorteio')?.addEventListener('click',realizarSorteio);
    document.getElementById('btnConvidarWhatsApp')?.addEventListener('click',enviarConvitesWhatsApp);
    document.getElementById('btnGerarLinksWhatsApp')?.addEventListener('click',async()=>{await notificarClientesWhatsApp();});
    document.getElementById('btnIniciarAnuncioAuto')?.addEventListener('click',iniciarAnuncioAutomatico);
    document.getElementById('btnPararAnuncioAuto')?.addEventListener('click',pararAnuncioAutomatico);
    document.getElementById('btnVoltarExtrato')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
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
    if(window.location.search.includes('live=1')&&clienteLogado){setTimeout(()=>{mostrarTela('live');},1000);}
    console.log('✅ Pronto!');
});
window.addEventListener('beforeunload',()=>{if(clienteLogado&&clienteLogado.id)removerClienteOnline(clienteLogado.id);});
