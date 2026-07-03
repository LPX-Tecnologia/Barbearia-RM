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
// ===== VARIÁVEIS LIVE =====
// ==========================================================
var liveLocalStream = null, liveChatInterval = null, liveAtiva = false, liveChatMessages = [];
var liveViewerId = null, liveViewerInterval = null, liveLikes = 0, liveLiked = false;
var liveFrameInterval = null, liveFrameCanvas = null, liveFrameCtx = null;
var liveViewersAtivos = {};
var liveUltimoFrameEnviado = 0;
var liveCarregandoLive = false;
var liveAudioMonitor = null;
var liveTelaAtiva = 1;
var liveAnuncioAtivo = false;

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
async function cadastrarCliente(){var n=document.getElementById('cadNomeCliente').value.trim(),e=document.getElementById('cadEmailCliente').value.trim(),c=document.getElementById('cadCelularCliente').value.trim(),s=document.getElementById('cadSenhaCliente').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha todos!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{var sn=await db.collection('clientes').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email já existe!','error');return;}var id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;salvarSessao('cliente',cl);document.getElementById('welcomeClienteNome').textContent=n;mostrarToast('✅ OK!','success');mostrarTela('homeClienteScreen');document.getElementById('cadNomeCliente').value='';document.getElementById('cadEmailCliente').value='';document.getElementById('cadCelularCliente').value='';document.getElementById('cadSenhaCliente').value='';}catch(er){mostrarToast('❌ '+er.message,'error');}}
async function cadastrarBarbeiro(){var n=document.getElementById('cadNomeBarbeiro').value.trim(),e=document.getElementById('cadEmailBarbeiro').value.trim(),c=document.getElementById('cadCelularBarbeiro').value.trim(),s=document.getElementById('cadSenhaBarbeiro').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha todos!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{var sn=await db.collection('barbeiros').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email já existe!','error');return;}var id=Date.now().toString(),bb={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',dataCriacao:new Date().toISOString()};await db.collection('barbeiros').doc(id).set(bb);barbeiroLogado=bb;salvarSessao('barbeiro',bb);document.getElementById('welcomeBarbeiroNome').textContent=n;mostrarToast('✅ OK!','success');mostrarTela('homeBarbeiroScreen');document.getElementById('cadNomeBarbeiro').value='';document.getElementById('cadEmailBarbeiro').value='';document.getElementById('cadCelularBarbeiro').value='';document.getElementById('cadSenhaBarbeiro').value='';}catch(er){mostrarToast('❌ '+er.message,'error');}}
async function loginCliente(){var e=document.getElementById('loginEmailCliente').value.trim(),s=document.getElementById('loginSenhaCliente').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{var sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}var d=sn.docs[0];clienteLogado={id:d.id,...d.data()};salvarSessao('cliente',clienteLogado);document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;document.getElementById('loginEmailCliente').value='';document.getElementById('loginSenhaCliente').value='';document.getElementById('loginFormCliente').style.display='none';mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeClienteScreen');}catch(er){mostrarToast('❌ Erro!','error');}}
async function loginBarbeiro(){var e=document.getElementById('loginEmailBarbeiro').value.trim(),s=document.getElementById('loginSenhaBarbeiro').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{var sn=await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}var d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};salvarSessao('barbeiro',barbeiroLogado);document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;document.getElementById('loginEmailBarbeiro').value='';document.getElementById('loginSenhaBarbeiro').value='';document.getElementById('loginFormBarbeiro').style.display='none';mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeBarbeiroScreen');}catch(er){mostrarToast('❌ Erro!','error');}}
function sairCliente(){removerViewerLive();clienteLogado=null;limparSessao();document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='none';mostrarTela('loginScreen');mostrarToast('👋 Até logo!','info');}
function sairBarbeiro(){encerrarLive();barbeiroLogado=null;limparSessao();document.getElementById('loginFormCliente').style.display='none';document.getElementById('loginFormBarbeiro').style.display='none';mostrarTela('loginScreen');mostrarToast('👋 Até logo!','info');}

// ==========================================================
// ===== AGENDAMENTOS =====
// ==========================================================
async function carregarAgendamentosBarbeiro(){var c=document.getElementById('agendamentosBarbeiroContainer');if(!c)return;try{var sn=await db.collection('agendamentos').orderBy('data','desc').get();var ag=sn.docs.map(d=>({id:d.id,...d.data()}));if(ag.length===0){c.innerHTML='<p style="color:#6B7280;text-align:center;">Nenhum</p>';return;}c.innerHTML=ag.map(function(a){var sc=a.status==='confirmado'?'confirmado':a.status==='cancelado'?'cancelado':'pendente';var st=a.status==='confirmado'?'✅ Confirmado':a.status==='cancelado'?'❌ Cancelado':'⏳ Pendente';return'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 '+(a.clienteNome||'Cliente')+'</div><div class="agenda-data">📅 '+(a.data||'N/A')+' • ⏰ '+(a.horario||'N/A')+'</div></div><span class="agenda-status '+sc+'">'+st+'</span>'+(a.status==='pendente'?'<button class="btn btn-small btn-success" onclick="confirmarAgendamento(\''+a.id+'\')">✅</button><button class="btn btn-small btn-danger" onclick="cancelarAgendamento(\''+a.id+'\')">❌</button>':'')+'</div>';}).join('');}catch(e){}}
async function confirmarAgendamento(id){await db.collection('agendamentos').doc(id).update({status:'confirmado'});carregarAgendamentosBarbeiro();if(clienteLogado)carregarAgendaCliente();}
async function cancelarAgendamento(id){if(!confirm('Cancelar?'))return;await db.collection('agendamentos').doc(id).update({status:'cancelado'});carregarAgendamentosBarbeiro();if(clienteLogado)carregarAgendaCliente();}
async function agendarCorte(){if(!clienteLogado){mostrarToast('❌ Faça login!','error');return;}var d=document.getElementById('agendamentoData').value,h=document.getElementById('agendamentoHorario').value,t=document.getElementById('agendamentoTipo').value;if(!d){mostrarToast('❌ Selecione data!','error');return;}var id=Date.now().toString();await db.collection('agendamentos').doc(id).set({id,clienteId:clienteLogado.id,clienteNome:clienteLogado.nome,clienteEmail:clienteLogado.email,data:d,horario:h,tipo:t,status:'pendente',dataCriacao:new Date().toISOString()});mostrarToast('✅ Agendado!','success');document.getElementById('agendamentoData').value='';carregarAgendaCliente();mostrarTela('homeClienteScreen');}
async function carregarAgendaCliente(){if(!clienteLogado)return;var c=document.getElementById('agendaClienteContainer');if(!c)return;var sn=await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).get();var ag=sn.docs.map(d=>({id:d.id,...d.data()}));if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}ag.sort((a,b)=>new Date(b.data+' '+b.horario)-new Date(a.data+' '+a.horario));c.innerHTML=ag.map(function(a){var sc=a.status==='confirmado'?'confirmado':a.status==='cancelado'?'cancelado':'pendente';return'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">'+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+sc+'">'+(a.status==='confirmado'?'✅':a.status==='cancelado'?'❌':'⏳')+'</span></div>';}).join('');}

// ==========================================================
// ===== PLANOS =====
// ==========================================================
async function carregarPlanos(){var c=document.getElementById('planosContainer');if(!c)return;var sn=await db.collection('planos').orderBy('dataCriacao','desc').get();var p=sn.docs.map(d=>({id:d.id,...d.data()}));if(p.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}c.innerHTML=p.map(function(x){return'<div class="plano-card" style="flex-direction:column;align-items:flex-start;">'+(x.imagem?'<img src="'+x.imagem+'" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;">':'')+'<div style="display:flex;justify-content:space-between;width:100%;"><div><div class="plano-nome">'+x.nome+'</div><div class="plano-periodo">📅 '+x.periodo+'</div></div><div class="plano-preco">R$ '+(x.preco?x.preco.toFixed(2):'0,00')+'</div></div><div style="margin-top:8px;"><button class="btn btn-small btn-primary" onclick="editarPlano(\''+x.id+'\')">✏️</button><button class="btn btn-small btn-danger" onclick="excluirPlanoDireto(\''+x.id+'\')">🗑</button></div></div>';}).join('');}
async function criarPlano(){if(!barbeiroLogado)return;var n=document.getElementById('planoNome').value.trim(),p=document.getElementById('planoPeriodo').value,pr=parseFloat(document.getElementById('planoPreco').value),d=document.getElementById('planoDescricao').value.trim(),img=document.getElementById('planoImagem').value||'';if(!n||!pr||pr<=0){mostrarToast('❌ Preencha!','error');return;}var id=Date.now().toString();await db.collection('planos').doc(id).set({id,barbeiroId:barbeiroLogado.id,nome:n,periodo:p,preco:pr,descricao:d,imagem:img,dataCriacao:new Date().toISOString()});mostrarToast('✅ Plano criado!','success');document.getElementById('planoNome').value='';document.getElementById('planoPreco').value='';document.getElementById('planoDescricao').value='';removerImagemPlano();mostrarTela('homeBarbeiroScreen');}
function editarPlano(id){db.collection('planos').doc(id).get().then(function(doc){if(doc.exists){var p=doc.data();document.getElementById('editPlanoId').value=id;document.getElementById('editPlanoNome').value=p.nome;document.getElementById('editPlanoPeriodo').value=p.periodo;document.getElementById('editPlanoPreco').value=p.preco;document.getElementById('editPlanoDescricao').value=p.descricao||'';document.getElementById('editPlanoImagem').value=p.imagem||'';if(p.imagem){document.getElementById('editPlanoImagemPreview').src=p.imagem;document.getElementById('editPlanoImagemPreview').style.display='block';}mostrarTela('editarPlanoScreen');}});}
async function salvarEdicaoPlano(){var id=document.getElementById('editPlanoId').value,img=document.getElementById('editPlanoImagem').value||'';await db.collection('planos').doc(id).update({nome:document.getElementById('editPlanoNome').value.trim(),periodo:document.getElementById('editPlanoPeriodo').value,preco:parseFloat(document.getElementById('editPlanoPreco').value),descricao:document.getElementById('editPlanoDescricao').value.trim(),imagem:img});mostrarToast('✅ Atualizado!','success');mostrarTela('homeBarbeiroScreen');}
async function excluirPlano(){if(!confirm('Excluir?'))return;await db.collection('planos').doc(document.getElementById('editPlanoId').value).delete();mostrarToast('🗑 Excluído!','success');mostrarTela('homeBarbeiroScreen');}
async function excluirPlanoDireto(id){if(!confirm('Excluir?'))return;await db.collection('planos').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarPlanos();}
function previewImagemPlano(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){imagemPlanoBase64=ev.target.result;document.getElementById('planoImagem').value=imagemPlanoBase64;document.getElementById('planoImagemPreview').src=imagemPlanoBase64;document.getElementById('planoImagemPreview').style.display='block';document.getElementById('btnRemoverImagemPlano').style.display='inline-block';};r.readAsDataURL(f);}
function removerImagemPlano(){imagemPlanoBase64='';document.getElementById('planoImagem').value='';document.getElementById('planoImagemPreview').style.display='none';document.getElementById('btnRemoverImagemPlano').style.display='none';document.getElementById('planoImagemInput').value='';}
function previewEditPlanoImagem(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){document.getElementById('editPlanoImagem').value=ev.target.result;document.getElementById('editPlanoImagemPreview').src=ev.target.result;document.getElementById('editPlanoImagemPreview').style.display='block';};r.readAsDataURL(f);}

// ==========================================================
// ===== ANÚNCIOS =====
// ==========================================================
async function carregarAnuncios(){var c=document.getElementById('anunciosContainer');if(!c)return;var hoje=new Date().toISOString();var sn=await db.collection('anuncios').where('dataExpiracao','>',hoje).get();var a=sn.docs.map(d=>({id:d.id,...d.data()}));if(a.length===0){c.innerHTML='<div style="text-align:center;padding:40px;"><p style="color:#6B7280;">📢 Nenhum anúncio</p></div>';return;}c.innerHTML=a.map(function(x){return'<div class="card" style="border:2px solid #FF6B6B;margin-bottom:12px;"><span style="background:#FF4757;color:white;padding:4px 10px;border-radius:20px;font-size:11px;">📢 ANÚNCIO</span>'+(x.imagem?'<img src="'+x.imagem+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:8px 0;">':'')+'<h3 style="color:#FF6B6B;">'+x.titulo+'</h3><p style="color:#B0B0B0;">'+x.descricao+'</p>'+(x.link?'<a href="'+x.link+'" target="_blank" style="display:inline-block;margin-top:8px;padding:8px 16px;background:linear-gradient(135deg,#FF6B6B,#FF4757);color:white;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Saiba Mais</a>':'')+(barbeiroLogado?'<button class="btn btn-small btn-danger" onclick="excluirAnuncio(\''+x.id+'\')" style="margin-top:8px;">🗑</button>':'')+'</div>';}).join('');}
async function criarAnuncio(){if(!barbeiroLogado)return;var t=document.getElementById('anuncioTitulo').value.trim(),d=document.getElementById('anuncioDescricao').value.trim(),l=document.getElementById('anuncioLink').value.trim(),img=document.getElementById('anuncioImagem').value||'',dur=parseInt(document.getElementById('anuncioDuracao').value);if(!t){mostrarToast('❌ Título!','error');return;}var exp=new Date();exp.setDate(exp.getDate()+dur);var id='anuncio_'+Date.now();await db.collection('anuncios').doc(id).set({id,barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,titulo:t,descricao:d,link:l,imagem:img,duracao:dur,dataCriacao:new Date().toISOString(),dataExpiracao:exp.toISOString()});mostrarToast('✅ Publicado!','success');document.getElementById('anuncioTitulo').value='';document.getElementById('anuncioDescricao').value='';document.getElementById('anuncioLink').value='';removerAnuncioImagem();carregarAnuncios();}
async function excluirAnuncio(id){if(!confirm('Excluir?'))return;await db.collection('anuncios').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarAnuncios();}
function previewAnuncioImagem(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){anuncioImagemBase64=ev.target.result;document.getElementById('anuncioImagem').value=anuncioImagemBase64;document.getElementById('anuncioImagemPreview').src=anuncioImagemBase64;document.getElementById('anuncioImagemPreview').style.display='block';document.getElementById('btnRemoverAnuncioImagem').style.display='inline-block';};r.readAsDataURL(f);}
function removerAnuncioImagem(){anuncioImagemBase64='';document.getElementById('anuncioImagem').value='';document.getElementById('anuncioImagemPreview').style.display='none';document.getElementById('btnRemoverAnuncioImagem').style.display='none';document.getElementById('anuncioImagemInput').value='';}

// ==========================================================
// ===== FEED / POSTS =====
// ==========================================================
async function carregarFeedCliente(){var c=document.getElementById('feedClienteContainer');if(!c)return;var sn=await db.collection('posts').orderBy('dataCriacao','desc').get();var posts=sn.docs.map(d=>({id:d.id,...d.data()}));todosPosts=posts;if(posts.length===0){c.innerHTML='<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum post</h3></div>';return;}c.innerHTML=posts.map(function(post){var com=post.comentarios||[];return'<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+(post.barbeiroNome||'Barbearia RM')+'</div><div class="feed-post-user-time">'+new Date(post.dataCriacao).toLocaleDateString('pt-BR')+'</div></div></div>'+(post.video?'<video class="feed-post-video" controls><source src="'+post.video+'" type="video/mp4"></video>':post.imagem?'<img src="'+post.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><div class="feed-post-title">'+post.titulo+'</div><div class="feed-post-price">R$ '+(post.preco?post.preco.toFixed(2):'0,00')+'</div></div><div class="feed-post-actions"><button onclick="likePost(\''+post.id+'\',this)">❤️ '+(post.likes||0)+'</button><button onclick="abrirComentarios(\''+post.id+'\')">💬 '+com.length+'</button></div></div>';}).join('');}
async function carregarMeusPosts(){var c=document.getElementById('meusPostsContainer');if(!c||!barbeiroLogado)return;var sn=await db.collection('posts').where('barbeiroId','==',barbeiroLogado.id).get();var posts=[];sn.forEach(function(d){posts.push({id:d.id,...d.data()});});posts.sort(function(a,b){return new Date(b.dataCriacao)-new Date(a.dataCriacao);});if(posts.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum post</p>';return;}c.innerHTML=posts.map(function(post){var com=post.comentarios||[];var h='<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+post.titulo+'</div><div class="feed-post-user-time">R$ '+(post.preco?post.preco.toFixed(2):'0,00')+'</div></div></div>';if(post.imagem)h+='<img src="'+post.imagem+'" class="feed-post-image">';if(post.video)h+='<video class="feed-post-video" controls><source src="'+post.video+'" type="video/mp4"></video>';h+='<div class="feed-post-body"><p>'+post.descricao+'</p><p style="font-size:11px;color:#6B7280;">❤️ '+(post.likes||0)+' • 💬 '+com.length+'</p></div>';if(com.length>0){h+='<div style="padding:0 14px 10px;">';com.forEach(function(c){h+='<div style="font-size:12px;color:#B0B0B0;margin:4px 0;"><strong style="color:#D4A84B;">'+c.autor+':</strong> '+c.texto+'</div>';});h+='</div>';}h+='<button class="btn btn-small btn-danger" onclick="excluirMeuPost(\''+post.id+'\')">🗑</button></div>';return h;}).join('');}
async function criarPost(){if(!barbeiroLogado)return;var t=document.getElementById('postTitulo').value.trim(),p=parseFloat(document.getElementById('postPreco').value),d=document.getElementById('postDescricao').value.trim(),img=document.getElementById('postImagem').value||'',vid=document.getElementById('postVideo').value||'';if(!t||!p||p<=0){mostrarToast('❌ Título e preço!','error');return;}var id=Date.now().toString();await db.collection('posts').doc(id).set({id,barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,titulo:t,preco:p,imagem:img,video:vid,descricao:d,likes:0,comentarios:[],dataCriacao:new Date().toISOString()});mostrarToast('✅ Publicado!','success');document.getElementById('postTitulo').value='';document.getElementById('postPreco').value='';document.getElementById('postDescricao').value='';removerImagem();removerVideo();mostrarTela('homeBarbeiroScreen');}
async function excluirMeuPost(id){if(!confirm('Excluir?'))return;await db.collection('posts').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarMeusPosts();carregarFeedCliente();}
function abrirComentarios(id){postSelecionadoId=id;carregarComentarios(id);document.getElementById('modalComentario').classList.add('active');}
async function carregarComentarios(id){var c=document.getElementById('comentariosContainer');if(!c)return;var doc=await db.collection('posts').doc(id).get();if(!doc.exists)return;var com=doc.data().comentarios||[];c.innerHTML=com.length===0?'<p style="color:#6B7280;">Nenhum</p>':com.map(function(c){return'<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">'+c.autor+'</strong><p style="color:#B0B0B0;">'+c.texto+'</p></div>';}).join('');}
async function adicionarComentario(){var t=document.getElementById('novoComentario').value.trim();if(!t||!clienteLogado&&!barbeiroLogado)return;var autor=clienteLogado?clienteLogado.nome:barbeiroLogado.nome;var doc=await db.collection('posts').doc(postSelecionadoId).get();var com=doc.data().comentarios||[];com.push({autor,texto:t,data:new Date().toISOString()});await db.collection('posts').doc(postSelecionadoId).update({comentarios:com});document.getElementById('novoComentario').value='';carregarComentarios(postSelecionadoId);carregarFeedCliente();}
function fecharModalComentario(){document.getElementById('modalComentario').classList.remove('active');}
function previewImagem(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){imagemBase64=ev.target.result;document.getElementById('postImagem').value=imagemBase64;document.getElementById('imagemPreviewImg').src=imagemBase64;document.getElementById('imagemPreview').style.display='block';document.getElementById('imagemUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerImagem(){imagemBase64='';document.getElementById('postImagem').value='';document.getElementById('imagemPreview').style.display='none';document.getElementById('imagemUploadArea').style.display='block';document.getElementById('postImagemInput').value='';}
function previewVideo(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){videoBase64=ev.target.result;document.getElementById('postVideo').value=videoBase64;document.getElementById('videoPreviewVideo').src=videoBase64;document.getElementById('videoPreview').style.display='block';document.getElementById('videoUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerVideo(){videoBase64='';document.getElementById('postVideo').value='';document.getElementById('videoPreview').style.display='none';document.getElementById('videoUploadArea').style.display='block';document.getElementById('postVideoInput').value='';}

// GALERIA/REELS/PERFIL/HORÁRIOS/FATURAMENTO
async function carregarGaleria(){var c=document.getElementById('galeriaContainer');if(!c)return;var sn=await db.collection('posts').orderBy('dataCriacao','desc').get();todosPosts=sn.docs.map(d=>({id:d.id,...d.data()}));filtrarGaleria();}
function filtrarGaleria(){var cat=document.getElementById('filtroCategoria').value,c=document.getElementById('galeriaContainer');var f=cat==='todos'?todosPosts:todosPosts.filter(function(p){return p.titulo===cat;});if(f.length===0){c.innerHTML='<p style="color:#6B7280;text-align:center;grid-column:1/-1;">Nenhum</p>';return;}c.innerHTML=f.map(function(post){return'<div class="galeria-item" onclick="verDetalheCorte(\''+post.id+'\')">'+(post.imagem?'<img src="'+post.imagem+'" class="galeria-item-image">':'<div class="galeria-item-image" style="display:flex;align-items:center;justify-content:center;font-size:40px;">✂️</div>')+'<div class="galeria-item-info"><div class="galeria-item-title">'+post.titulo+'</div><div class="galeria-item-price">R$ '+(post.preco?post.preco.toFixed(2):'0,00')+'</div></div></div>';}).join('');}
function verDetalheCorte(id){var post=todosPosts.find(function(p){return p.id===id;});if(!post)return;document.getElementById('detalhePostConteudo').innerHTML='<div class="card"><h3>'+post.titulo+'</h3>'+(post.video?'<video controls><source src="'+post.video+'" type="video/mp4"></video>':post.imagem?'<img src="'+post.imagem+'" style="width:100%;max-height:300px;object-fit:cover;">':'')+'<p style="font-size:24px;color:var(--primary);">R$ '+(post.preco?post.preco.toFixed(2):'0,00')+'</p><button class="btn btn-outline" onclick="mostrarTela(\'galeriaCortesScreen\')">← Voltar</button></div>';mostrarTela('detalhePostScreen');}
async function carregarReels(){var c=document.getElementById('reelsContainer');if(!c)return;var sn=await db.collection('posts').orderBy('dataCriacao','desc').get();todosReels=sn.docs.map(d=>({id:d.id,...d.data()}));if(todosReels.length===0){c.innerHTML='<p style="color:#6B7280;padding:40px;">Nenhum</p>';return;}reelsAtual=0;exibirReel(0);}
function exibirReel(i){if(i<0)i=0;if(i>=todosReels.length)i=todosReels.length-1;reelsAtual=i;var post=todosReels[i];document.getElementById('reelsContainer').innerHTML='<div class="reel-item">'+(post.video?'<video src="'+post.video+'" autoplay loop muted playsinline></video>':post.imagem?'<img src="'+post.imagem+'" class="reel-item-image">':'<div class="reel-item-image" style="display:flex;align-items:center;justify-content:center;font-size:80px;">✂️</div>')+'<div class="reel-item-overlay"><div class="reel-item-title">'+post.titulo+'</div><div class="reel-item-price">R$ '+(post.preco?post.preco.toFixed(2):'0,00')+'</div></div></div>';}
function reelAnterior(){if(reelsAtual>0){reelsAtual--;exibirReel(reelsAtual);}}
function reelProximo(){if(reelsAtual<todosReels.length-1){reelsAtual++;exibirReel(reelsAtual);}}
function likeReel(btn){btn.classList.toggle('liked');mostrarToast('❤️ Curtido!','success');}
function likePost(id,btn){btn.classList.toggle('liked');}
function carregarPerfilCliente(){if(!clienteLogado)return;document.getElementById('perfilClienteNome').textContent=clienteLogado.nome;document.getElementById('perfilClienteEmail').textContent=clienteLogado.email;document.getElementById('editClienteNome').value=clienteLogado.nome||'';document.getElementById('editClienteCelular').value=clienteLogado.celular||'';}
async function salvarPerfilCliente(){if(!clienteLogado)return;var n=document.getElementById('editClienteNome').value.trim(),c=document.getElementById('editClienteCelular').value.trim();await db.collection('clientes').doc(clienteLogado.id).update({nome:n,celular:c});clienteLogado.nome=n;clienteLogado.celular=c;salvarSessao('cliente',clienteLogado);mostrarToast('✅ Salvo!','success');}
function carregarPerfilBarbeiro(){if(!barbeiroLogado)return;document.getElementById('perfilBarbeiroNome').textContent=barbeiroLogado.nome;document.getElementById('perfilBarbeiroEmail').textContent=barbeiroLogado.email;document.getElementById('editBarbeiroNome').value=barbeiroLogado.nome||'';document.getElementById('editBarbeiroCelular').value=barbeiroLogado.celular||'';document.getElementById('editBarbeiroEmail').value=barbeiroLogado.email||'';}
async function salvarPerfilBarbeiro(){if(!barbeiroLogado)return;var n=document.getElementById('editBarbeiroNome').value.trim(),c=document.getElementById('editBarbeiroCelular').value.trim(),e=document.getElementById('editBarbeiroEmail').value.trim();await db.collection('barbeiros').doc(barbeiroLogado.id).update({nome:n,celular:c,email:e});barbeiroLogado.nome=n;barbeiroLogado.celular=c;barbeiroLogado.email=e;salvarSessao('barbeiro',barbeiroLogado);mostrarToast('✅ Salvo!','success');}
function uploadFotoCliente(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=async function(ev){var foto=ev.target.result;var av=document.getElementById('perfilClienteAvatar');if(av){var img=av.querySelector('img');if(img)img.src=foto;}clienteLogado.fotoPerfil=foto;await db.collection('clientes').doc(clienteLogado.id).update({fotoPerfil:foto});salvarSessao('cliente',clienteLogado);};r.readAsDataURL(f);}
function uploadFotoBarbeiro(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=async function(ev){var foto=ev.target.result;var av=document.getElementById('perfilBarbeiroAvatar');if(av){var img=av.querySelector('img');if(img)img.src=foto;}barbeiroLogado.fotoPerfil=foto;await db.collection('barbeiros').doc(barbeiroLogado.id).update({fotoPerfil:foto});salvarSessao('barbeiro',barbeiroLogado);};r.readAsDataURL(f);}
function filtrarExtrato(t){mostrarToast('📊 '+t,'info');}
function copiarPix(){navigator.clipboard.writeText(document.getElementById('pixChave').textContent);mostrarToast('✅ Copiado!','success');}
function fecharPagamento(){mostrarTela('homeClienteScreen');}
async function carregarHorarios(){if(!barbeiroLogado)return;var doc=await db.collection('configuracoes').doc('horarios_'+barbeiroLogado.id).get();if(doc.exists)horariosTrabalho=doc.data();['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(function(d){var cb=document.getElementById('dia'+d);if(cb)cb.checked=horariosTrabalho.diasTrabalho.includes(d.toLowerCase());});document.getElementById('horarioInicio').value=horariosTrabalho.horarioInicio;document.getElementById('horarioFim').value=horariosTrabalho.horarioFim;document.getElementById('intervaloCortes').value=horariosTrabalho.intervaloCortes;carregarFolgas();}
function carregarFolgas(){var c=document.getElementById('folgasContainer');if(!c)return;if(!horariosTrabalho.folgas||horariosTrabalho.folgas.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhuma</p>';return;}c.innerHTML=horariosTrabalho.folgas.map(function(f,i){return'<div class="folga-item"><span>🏖️ '+new Date(f).toLocaleDateString('pt-BR')+'</span><button onclick="removerFolga('+i+')">❌</button></div>';}).join('');}
function adicionarFolga(){var d=document.getElementById('folgaData').value;if(!d)return;if(horariosTrabalho.folgas.includes(d)){mostrarToast('❌ Já existe!','error');return;}horariosTrabalho.folgas.push(d);horariosTrabalho.folgas.sort();carregarFolgas();document.getElementById('folgaData').value='';mostrarToast('✅ Adicionada!','success');}
function removerFolga(i){horariosTrabalho.folgas.splice(i,1);carregarFolgas();}
async function salvarHorarios(){if(!barbeiroLogado)return;var dias=[];['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(function(d){var cb=document.getElementById('dia'+d);if(cb&&cb.checked)dias.push(d.toLowerCase());});horariosTrabalho.diasTrabalho=dias;horariosTrabalho.horarioInicio=document.getElementById('horarioInicio').value;horariosTrabalho.horarioFim=document.getElementById('horarioFim').value;horariosTrabalho.intervaloCortes=parseInt(document.getElementById('intervaloCortes').value);await db.collection('configuracoes').doc('horarios_'+barbeiroLogado.id).set(horariosTrabalho);mostrarToast('✅ Salvos!','success');}
async function calcularFaturamento(){var sn=await db.collection('agendamentos').where('status','==','confirmado').get();var ag=sn.docs.map(function(d){return d.data();});var hoje=new Date().toISOString().split('T')[0],vh=0,vt=0;ag.forEach(function(a){var v=35;if(a.data===hoje)vh+=v;vt+=v;});var eh=document.getElementById('faturamentoHoje');if(eh)eh.textContent='R$ '+vh.toFixed(2);var es=document.getElementById('faturamentoSemana');if(es)es.textContent='R$ '+(vt*0.3).toFixed(2);var em=document.getElementById('faturamentoMes');if(em)em.textContent='R$ '+(vt*0.7).toFixed(2);var ea=document.getElementById('faturamentoAno');if(ea)ea.textContent='R$ '+vt.toFixed(2);}

// ==========================================================
// ===== LIVE PROFISSIONAL COM 2 TELAS =====
// ==========================================================

// --- INICIAR LIVE ---
async function iniciarLive(){
    if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}
    var titulo=document.getElementById('liveTitulo').value.trim()||'🔴 Live da Barbearia RM';
    try{
        var stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user',frameRate:{ideal:30}},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,sampleRate:48000}});
        liveLocalStream=stream;
        try{if(liveAudioMonitor)liveAudioMonitor.close();liveAudioMonitor=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000});var source=liveAudioMonitor.createMediaStreamSource(stream);var gainNode=liveAudioMonitor.createGain();gainNode.gain.value=0.5;source.connect(gainNode);gainNode.connect(liveAudioMonitor.destination);}catch(e){}
        document.getElementById('liveVideo').srcObject=stream;document.getElementById('liveVideo').style.display='block';document.getElementById('liveVideo').muted=false;
        document.getElementById('liveFrameImg').style.display='none';
        document.getElementById('liveVideoLocal').srcObject=stream;document.getElementById('liveVideoLocal').style.display='block';document.getElementById('liveVideoLocal').muted=true;
        await db.collection('lives').doc('live_atual').set({id:'live_atual',barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,titulo,ativa:true,chat:[],viewers:0,totalViews:0,likes:0,telaAtiva:1,comercialVideo:'',comercialTipo:'nenhum',anuncioAtivo:false,anuncioImagem:'',dataInicio:new Date().toISOString()});
        liveAtiva=true;liveChatMessages=[];liveLikes=0;liveLiked=false;liveViewersAtivos={};liveUltimoFrameEnviado=0;liveTelaAtiva=1;
        document.getElementById('livePlaceholder').style.display='none';document.getElementById('livePlayer').style.display='block';
        document.getElementById('liveStatus').style.display='block';document.getElementById('liveStatusTitulo').textContent=titulo;document.getElementById('liveStatusBarbeiro').textContent='👤 '+barbeiroLogado.nome;
        document.getElementById('liveLoginWarning').style.display='none';document.getElementById('liveViewerCount').textContent='👥 0';document.getElementById('liveStatusViewers').textContent='👥 0';
        document.getElementById('liveAnuncioOverlay').style.display='none';document.getElementById('liveTela1').style.display='block';document.getElementById('liveTela2').style.display='none';
        document.getElementById('liveTelaIndicador').textContent='🎥 TELA 1 ATIVA';
        liveFrameCanvas=document.createElement('canvas');liveFrameCanvas.width=640;liveFrameCanvas.height=360;liveFrameCtx=liveFrameCanvas.getContext('2d');
        iniciarCapturaFrames();atualizarChat();iniciarChatListener();verificarLiveAtiva();adicionarViewerLive();
        mostrarToast('🔴 Live profissional iniciada!','success');
    }catch(error){mostrarToast('❌ '+error.message,'error');}
}

// --- CAPTURA DE FRAMES ---
function iniciarCapturaFrames(){if(liveFrameInterval)clearInterval(liveFrameInterval);liveFrameInterval=setInterval(async function(){if(!liveAtiva||!liveLocalStream||!liveFrameCtx)return;try{var video=document.getElementById('liveVideo');if(!video||!video.videoWidth||video.videoWidth===0)return;var agora=Date.now();if(agora-liveUltimoFrameEnviado<250)return;liveUltimoFrameEnviado=agora;liveFrameCtx.drawImage(video,0,0,640,360);var frameData=liveFrameCanvas.toDataURL('image/jpeg',0.85);db.collection('lives').doc('live_atual').update({ultimoFrame:frameData,frameTimestamp:agora}).catch(function(){});}catch(e){}},250);}

// --- ALTERNAR PARA TELA 1 (CÂMERA) ---
function alternarParaTela1(){
    console.log('📱 alternarParaTela1 chamado');
    if(!liveAtiva&&!barbeiroLogado){mostrarToast('❌ Inicie a live primeiro!','error');return;}
    document.getElementById('liveTela1').style.display='block';
    document.getElementById('liveTela2').style.display='none';
    liveTelaAtiva=1;
    var indicador=document.getElementById('liveTelaIndicador');
    if(indicador)indicador.textContent='🎥 TELA 1 ATIVA (Câmera)';
    mostrarToast('🎥 Tela 1 - Câmera ativada','info');
    db.collection('lives').doc('live_atual').update({telaAtiva:1}).catch(function(e){console.log('Erro:',e);});
}

// --- ALTERNAR PARA TELA 2 (COMERCIAL) ---
function alternarParaTela2(){
    console.log('📱 alternarParaTela2 chamado');
    if(!liveAtiva&&!barbeiroLogado){mostrarToast('❌ Inicie a live primeiro!','error');return;}
    document.getElementById('liveTela1').style.display='none';
    document.getElementById('liveTela2').style.display='block';
    liveTelaAtiva=2;
    var indicador=document.getElementById('liveTelaIndicador');
    if(indicador)indicador.textContent='📺 TELA 2 ATIVA (Comercial)';
    var vc=document.getElementById('liveVideoComercial');
    if(vc.src&&vc.src!==window.location.href){vc.currentTime=0;vc.play().catch(function(){console.log('▶️ Autoplay bloqueado');});}
    mostrarToast('📺 Tela 2 - Comercial ativada','info');
    db.collection('lives').doc('live_atual').update({telaAtiva:2}).catch(function(e){console.log('Erro:',e);});
}

// --- CARREGAR VÍDEO COMERCIAL ---
function carregarVideoComercial(event){
    console.log('🎬 carregarVideoComercial chamado');
    var file=event.target.files[0];
    if(!file)return;
    var url=URL.createObjectURL(file);
    var video=document.getElementById('liveVideoComercial');
    video.src=url;
    video.loop=true;
    video.muted=true;
    video.style.display='block';
    document.getElementById('liveImagemComercial').style.display='none';
    document.getElementById('liveTela2Placeholder').style.display='none';
    document.getElementById('comercialStatus').textContent='✅ '+file.name;
    var reader=new FileReader();
    reader.onload=function(e){
        db.collection('lives').doc('live_atual').update({comercialVideo:e.target.result,comercialTipo:'video'}).catch(function(err){console.log('Erro:',err);});
    };
    reader.readAsDataURL(file);
    mostrarToast('🎬 Vídeo comercial carregado!','success');
}

// --- CARREGAR IMAGEM COMERCIAL ---
function carregarImagemComercial(event){
    console.log('🖼️ carregarImagemComercial chamado');
    var file=event.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
        document.getElementById('liveImagemComercial').src=e.target.result;
        document.getElementById('liveImagemComercial').style.display='block';
        document.getElementById('liveVideoComercial').style.display='none';
        document.getElementById('liveTela2Placeholder').style.display='none';
        document.getElementById('comercialStatus').textContent='✅ '+file.name;
        db.collection('lives').doc('live_atual').update({comercialVideo:e.target.result,comercialTipo:'imagem'}).catch(function(err){console.log('Erro:',err);});
    };
    reader.readAsDataURL(file);
    mostrarToast('🖼️ Imagem comercial carregada!','success');
}

// --- REMOVER VÍDEO/IMAGEM COMERCIAL ---
function removerVideoComercial(){
    console.log('🗑 removerVideoComercial chamado');
    document.getElementById('liveVideoComercial').src='';
    document.getElementById('liveVideoComercial').style.display='none';
    document.getElementById('liveImagemComercial').style.display='none';
    document.getElementById('liveTela2Placeholder').style.display='flex';
    document.getElementById('comercialStatus').textContent='Nenhum comercial';
    document.getElementById('comercialVideoInput').value='';
    document.getElementById('comercialImagemInput').value='';
    db.collection('lives').doc('live_atual').update({comercialVideo:'',comercialTipo:'nenhum'}).catch(function(e){console.log('Erro:',e);});
    mostrarToast('🗑 Comercial removido','info');
}

// --- ANÚNCIO SOBREPOSTO ---
function carregarAnuncioLive(event){
    console.log('📢 carregarAnuncioLive chamado');
    var file=event.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
        document.getElementById('liveAnuncioImg').src=e.target.result;
        document.getElementById('liveAnuncioOverlay').style.display='flex';
        liveAnuncioAtivo=true;
        db.collection('lives').doc('live_atual').update({anuncioAtivo:true,anuncioImagem:e.target.result}).catch(function(err){console.log('Erro:',err);});
        mostrarToast('📢 Anúncio exibido!','success');
        setTimeout(function(){removerAnuncioLive();},10000);
    };
    reader.readAsDataURL(file);
}
function removerAnuncioLive(){document.getElementById('liveAnuncioOverlay').style.display='none';liveAnuncioAtivo=false;db.collection('lives').doc('live_atual').update({anuncioAtivo:false,anuncioImagem:''}).catch(function(e){});}
function fecharAnuncioLive(){removerAnuncioLive();mostrarToast('📢 Anúncio removido','info');}

// --- VIEWERS ---
function gerarViewerId(){return'v_'+Date.now()+'_'+Math.random().toString(36).substr(2,5);}
async function adicionarViewerLive(){if(!liveAtiva||liveViewerId)return;liveViewerId=gerarViewerId();var nome=clienteLogado?'💇 '+clienteLogado.nome:(barbeiroLogado?'✂️ '+barbeiroLogado.nome:'👤 Visitante');try{var doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa)return;var va=doc.data().viewersAtivos||{};va[liveViewerId]={nome:nome,entrou:new Date().toISOString(),ultimoPing:Date.now()};var agora=Date.now(),vl={},count=0;Object.keys(va).forEach(function(k){if(agora-va[k].ultimoPing<8000){vl[k]=va[k];count++;}});await db.collection('lives').doc('live_atual').update({viewersAtivos:vl,viewers:count,totalViews:firebase.firestore.FieldValue.increment(1)});iniciarViewerPing();}catch(e){}}
function iniciarViewerPing(){if(liveViewerInterval)clearInterval(liveViewerInterval);liveViewerInterval=setInterval(async function(){if(!liveAtiva||!liveViewerId){clearInterval(liveViewerInterval);return;}try{var doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa){removerViewerLive();return;}var va=doc.data().viewersAtivos||{};if(va[liveViewerId]){va[liveViewerId].ultimoPing=Date.now();await db.collection('lives').doc('live_atual').update({viewersAtivos:va});}}catch(e){}},4000);}
async function removerViewerLive(){if(liveViewerInterval){clearInterval(liveViewerInterval);liveViewerInterval=null;}if(!liveViewerId)return;try{var doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists)return;var va=doc.data().viewersAtivos||{};delete va[liveViewerId];var count=Object.keys(va).length;await db.collection('lives').doc('live_atual').update({viewersAtivos:va,viewers:count});liveViewerId=null;}catch(e){}}

// --- CARREGAR LIVE ---
async function carregarLive(){
    if(liveCarregandoLive)return;liveCarregandoLive=true;
    var placeholder=document.getElementById('livePlaceholder'),player=document.getElementById('livePlayer'),status=document.getElementById('liveStatus'),warning=document.getElementById('liveLoginWarning'),controls=document.getElementById('liveControls');
    try{
        var doc=await db.collection('lives').doc('live_atual').get();
        if(doc.exists&&doc.data().ativa){
            var live=doc.data();liveAtiva=true;
            if(placeholder)placeholder.style.display='none';
            if(status){status.style.display='block';document.getElementById('liveStatusTitulo').textContent=live.titulo;document.getElementById('liveStatusBarbeiro').textContent='👤 '+live.barbeiroNome;var va=live.viewersAtivos||{};var count=Object.keys(va).length;document.getElementById('liveStatusViewers').textContent='👥 '+count+' • 👁 '+(live.totalViews||0)+' • ❤️ '+(live.likes||0);}
            liveChatMessages=live.chat||[];atualizarChat();liveLikes=live.likes||0;
            // Sincronizar telas
            if(live.telaAtiva===2){document.getElementById('liveTela1').style.display='none';document.getElementById('liveTela2').style.display='block';document.getElementById('liveTelaIndicador').textContent='📺 TELA 2 ATIVA';}else{document.getElementById('liveTela1').style.display='block';document.getElementById('liveTela2').style.display='none';document.getElementById('liveTelaIndicador').textContent='🎥 TELA 1 ATIVA';}
            // Carregar comercial
            if(live.comercialVideo&&live.comercialTipo==='video'){document.getElementById('liveVideoComercial').src=live.comercialVideo;document.getElementById('liveVideoComercial').style.display='block';document.getElementById('liveImagemComercial').style.display='none';document.getElementById('liveTela2Placeholder').style.display='none';}else if(live.comercialVideo&&live.comercialTipo==='imagem'){document.getElementById('liveImagemComercial').src=live.comercialVideo;document.getElementById('liveImagemComercial').style.display='block';document.getElementById('liveVideoComercial').style.display='none';document.getElementById('liveTela2Placeholder').style.display='none';}
            // Verificar anúncio
            if(live.anuncioAtivo&&live.anuncioImagem&&clienteLogado){document.getElementById('liveAnuncioImg').src=live.anuncioImagem;document.getElementById('liveAnuncioOverlay').style.display='flex';}
            if(barbeiroLogado&&barbeiroLogado.id===live.barbeiroId){
                if(controls)controls.style.display='block';if(player)player.style.display='block';if(warning)warning.style.display='none';
                document.getElementById('liveTitulo').value=live.titulo;document.getElementById('liveViewerCount').textContent='👥 '+count;
                if(liveLocalStream){document.getElementById('liveVideo').srcObject=liveLocalStream;document.getElementById('liveVideo').style.display='block';document.getElementById('liveVideo').muted=false;document.getElementById('liveFrameImg').style.display='none';document.getElementById('liveVideoLocal').style.display='block';}
            }else if(clienteLogado){
                if(controls)controls.style.display='none';if(player)player.style.display='block';if(warning)warning.style.display='none';
                document.getElementById('liveViewerCount').textContent='👥 '+count;document.getElementById('liveVideo').style.display='none';document.getElementById('liveVideoLocal').style.display='none';
                if(live.ultimoFrame){var imgEl=document.getElementById('liveFrameImg');if(imgEl.src!==live.ultimoFrame){imgEl.src=live.ultimoFrame;}imgEl.style.display='block';}
                setTimeout(function(){liveCarregandoLive=false;if(liveAtiva&&clienteLogado)carregarLive();},350);
                adicionarViewerLive();liveCarregandoLive=false;return;
            }else{if(player)player.style.display='none';if(warning)warning.style.display='block';if(controls)controls.style.display='none';}
            iniciarChatListener();
        }else{
            liveAtiva=false;removerViewerLive();
            if(placeholder)placeholder.style.display='block';if(player)player.style.display='none';if(status)status.style.display='none';if(warning)warning.style.display='none';
            if(barbeiroLogado){if(controls)controls.style.display='block';}else{if(controls)controls.style.display='none';}
            pararChatListener();if(liveFrameInterval)clearInterval(liveFrameInterval);
        }
    }catch(e){liveAtiva=false;}
    liveCarregandoLive=false;
}

// --- ENCERRAR / LIKE / CHAT ---
async function encerrarLive(){if(!barbeiroLogado)return;if(!confirm('Encerrar?'))return;if(liveFrameInterval)clearInterval(liveFrameInterval);if(liveAudioMonitor)liveAudioMonitor.close();removerViewerLive();if(liveLocalStream){liveLocalStream.getTracks().forEach(function(t){t.stop();});liveLocalStream=null;}await db.collection('lives').doc('live_atual').update({ativa:false,dataFim:new Date().toISOString()});liveAtiva=false;liveChatMessages=[];document.getElementById('livePlaceholder').style.display='block';document.getElementById('livePlayer').style.display='none';document.getElementById('liveStatus').style.display='none';document.getElementById('liveVideo').srcObject=null;document.getElementById('liveFrameImg').style.display='none';document.getElementById('liveLoginWarning').style.display='none';document.getElementById('liveAnuncioOverlay').style.display='none';document.getElementById('liveTela1').style.display='block';document.getElementById('liveTela2').style.display='none';pararChatListener();atualizarChat();verificarLiveAtiva();mostrarToast('⏹ Live encerrada!','info');}
function pararTransmissao(){if(liveFrameInterval)clearInterval(liveFrameInterval);if(liveAudioMonitor)liveAudioMonitor.close();if(liveLocalStream){liveLocalStream.getTracks().forEach(function(t){t.stop();});liveLocalStream=null;}document.getElementById('liveVideo').srcObject=null;document.getElementById('liveFrameImg').style.display='none';document.getElementById('liveAnuncioOverlay').style.display='none';}
async function likeLive(){if(!liveAtiva||liveLiked)return;await db.collection('lives').doc('live_atual').update({likes:firebase.firestore.FieldValue.increment(1)});liveLiked=true;liveLikes++;mostrarToast('❤️ Curtido!','success');}
function compartilharLive(){if(!liveAtiva)return;var url=window.location.href.split('?')[0]+'?live=1';if(navigator.share){navigator.share({title:'Barbearia RM',text:'🔴 Live ao vivo!',url:url});}else{navigator.clipboard.writeText(url);mostrarToast('📋 Link copiado!','success');}}
function iniciarChatListener(){pararChatListener();liveChatInterval=setInterval(async function(){var doc=await db.collection('lives').doc('live_atual').get();if(doc.exists&&doc.data().ativa){var novas=doc.data().chat||[];if(novas.length!==liveChatMessages.length){liveChatMessages=novas;atualizarChat();}var va=doc.data().viewersAtivos||{};var count=Object.keys(va).length;var el=document.getElementById('liveStatusViewers');var el2=document.getElementById('liveViewerCount');if(el)el.textContent='👥 '+count+' • 👁 '+(doc.data().totalViews||0)+' • ❤️ '+(doc.data().likes||0);if(el2)el2.textContent='👥 '+count+' • 👁 '+(doc.data().totalViews||0);}},1500);}
function pararChatListener(){if(liveChatInterval){clearInterval(liveChatInterval);liveChatInterval=null;}}
async function enviarMensagemLive(){var input=document.getElementById('liveChatInput');if(!input)return;var texto=input.value.trim();if(!texto||!liveAtiva)return;var autor='👤 Visitante';var fotoPerfil='';if(clienteLogado){autor=clienteLogado.nome;fotoPerfil=clienteLogado.fotoPerfil||'';}if(barbeiroLogado){autor=barbeiroLogado.nome;fotoPerfil=barbeiroLogado.fotoPerfil||'';}var doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa)return;var chat=doc.data().chat||[];chat.push({autor,texto,fotoPerfil,data:new Date().toISOString()});if(chat.length>100)chat=chat.slice(-100);await db.collection('lives').doc('live_atual').update({chat});liveChatMessages=chat;atualizarChat();input.value='';}
function atualizarChat(){var c=document.getElementById('liveChatContainer');if(!c)return;if(!liveChatMessages||liveChatMessages.length===0){c.innerHTML='<p style="color:#6B7280;text-align:center;">💬 Chat vazio</p>';return;}c.innerHTML=liveChatMessages.map(function(msg){var h=new Date(msg.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});var avatar=msg.fotoPerfil?'<img src="'+msg.fotoPerfil+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;">':'<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#D4A84B;text-align:center;line-height:24px;font-size:12px;margin-right:6px;color:#1A1A1A;">👤</span>';return'<div class="live-chat-message" style="display:flex;align-items:flex-start;">'+avatar+'<div><span class="autor" style="color:#D4A84B;font-weight:700;font-size:12px;">'+msg.autor+'</span> <span style="font-size:10px;color:#6B7280;">'+h+'</span><div class="texto" style="color:#B0B0B0;">'+msg.texto+'</div></div></div>';}).join('');c.scrollTop=c.scrollHeight;}
async function verificarLiveAtiva(){var doc=await db.collection('lives').doc('live_atual').get();var ativa=doc.exists&&doc.data().ativa;var b1=document.getElementById('liveBadgeCliente'),b2=document.getElementById('liveBadgeBarbeiro');if(b1)b1.style.display=ativa?'inline-block':'none';if(b2)b2.style.display=ativa?'inline-block':'none';}

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
window.addEventListener('beforeunload',function(){removerViewerLive();});
