/* ==========================================================
   BARBEARIA RM - NOVO FLUXO COMPLETO
   ========================================================== */
const firebaseConfig={apiKey:"AIzaSyAqN0DZ3fyV-Ns2kXNdwBMAXQgWLy1_jE0",authDomain:"barbearia-rm.firebaseapp.com",projectId:"barbearia-rm",storageBucket:"barbearia-rm.firebasestorage.app",messagingSenderId:"512819922057",appId:"1:512819922057:web:6a913791cb6435e4f63258",measurementId:"G-TKVLVLPBJH"};
if(!firebase.apps.length){firebase.initializeApp(firebaseConfig);}
const db=firebase.firestore();db.settings({ignoreUndefinedProperties:true,merge:true});
console.log('🔥 Firebase OK');

let clienteLogado=null,barbeiroLogado=null,barbeiroSelecionado=null,postSelecionadoId=null;
let liveStream=null,liveStreamLocal=null,liveAtiva=!1,liveAtivaGeral=!1,liveTimerInterval=null,liveDuracao=0,liveFacingMode='user',liveChatListener=null,liveFrameInterval=null;

// ==========================================================
// NAVEGAÇÃO
// ==========================================================
function mostrarTela(t){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));let id=t==='loginRegister'?'loginRegisterScreen':t+'Screen';let el=document.getElementById(id);if(el)el.classList.add('active');atualizarBottomNav(t);carregarDadosTela(t);window.scrollTo(0,0);}
function atualizarBottomNav(t){let nc=document.getElementById('bottomNavCliente'),nb=document.getElementById('bottomNavBarbeiro');if(nc)nc.style.display='none';if(nb)nb.style.display='none';let tc=['homeCliente','agendamento','live','perfilCliente','criarPostCliente','planosCliente'];let tb=['homeBarbeiro','criarPost','extrato','criarPlano','live','perfilBarbeiro'];if(tc.includes(t)&&clienteLogado){if(nc)nc.style.display='flex';}else if(tb.includes(t)&&barbeiroLogado){if(nb)nb.style.display='flex';}}
function carregarDadosTela(t){switch(t){case 'inicio':carregarBarbeirosInicio();break;case 'homeCliente':carregarFeedBarbeiro();carregarAgendaCliente();break;case 'homeBarbeiro':carregarAgendamentosBarbeiro();calcularFaturamento();carregarMeusPosts();break;case 'agendamento':carregarOpcoesAgendamento();break;case 'perfilCliente':carregarPerfilCliente();carregarStatsCliente();carregarPostsCliente();break;case 'planosCliente':carregarPlanosCliente();break;case 'live':carregarLiveTela();break;case 'extrato':calcularExtrato('hoje');break;}}
function mostrarToast(m,tp){let t=document.getElementById('toast');if(!t)return;t.textContent=m;t.className='toast '+(tp||'info');t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3000);}

// ==========================================================
// TELA INICIAL - CARREGAR BARBEIROS
// ==========================================================
async function carregarBarbeirosInicio(){let c=document.getElementById('listaBarbeirosInicio');if(!c)return;try{let sn=await db.collection('barbeiros').orderBy('nome').get();let barbeiros=sn.docs.map(d=>({id:d.id,...d.data()}));if(barbeiros.length===0){c.innerHTML='<p style="color:#6B7280;text-align:center;padding:40px;">Nenhum barbeiro cadastrado</p>';return;}c.innerHTML=barbeiros.map(b=>'<div class="card barbeiro-card" onclick="selecionarBarbeiro(\''+b.id+'\',\''+b.nome+'\')"><div style="display:flex;align-items:center;gap:12px;"><img src="'+(b.fotoPerfil||'logobarbearia-rm.png')+'" class="barbeiro-card-avatar"><div style="flex:1;"><h3 style="color:#D4A84B;margin:0;">'+b.nome+'</h3><p style="color:#aaa;font-size:12px;">✂️ '+(b.especialidades||['Cortes']).join(', ')+'</p><p style="color:#6B7280;font-size:11px;">⭐ '+(b.avaliacao||0)+' • '+(b.totalCortes||0)+' cortes</p></div><span style="font-size:24px;">➡️</span></div></div>').join('');}catch(e){}}

// ==========================================================
// SELECIONAR BARBEIRO
// ==========================================================
async function selecionarBarbeiro(bid,bnome){barbeiroSelecionado={id:bid,nome:bnome};if(clienteLogado){sessionStorage.setItem('barbeiroId',bid);sessionStorage.setItem('barbeiroNome',bnome);document.getElementById('homeBarbeiroNome').textContent=bnome;document.getElementById('homeBarbeiroAvatar').src='logobarbearia-rm.png';db.collection('barbeiros').doc(bid).get().then(doc=>{if(doc.exists&&doc.data().fotoPerfil)document.getElementById('homeBarbeiroAvatar').src=doc.data().fotoPerfil;});mostrarTela('homeCliente');}else{mostrarTela('loginRegister');document.getElementById('loginBarbeiroNome').textContent='Conectando com '+bnome;}}

// ==========================================================
// LOGIN / REGISTRO
// ==========================================================
async function registrarCliente(){let n=document.getElementById('regNome').value.trim(),e=document.getElementById('regEmail').value.trim(),c=document.getElementById('regCelular').value.trim(),s=document.getElementById('regSenha').value;if(!n||!e||!c||!s){mostrarToast('❌ Preencha todos!','error');return;}if(s.length<6){mostrarToast('❌ Senha 6+','error');return;}try{let sn=await db.collection('clientes').where('email','==',e).get();if(!sn.empty){mostrarToast('❌ Email já cadastrado!','error');return;}let id=Date.now().toString(),cl={id,nome:n,email:e,celular:c,senha:s,fotoPerfil:'',online:!0,dataCriacao:new Date().toISOString()};await db.collection('clientes').doc(id).set(cl);clienteLogado=cl;salvarSessaoCliente(cl);marcarClienteOnline(cl);if(barbeiroSelecionado){sessionStorage.setItem('barbeiroId',barbeiroSelecionado.id);sessionStorage.setItem('barbeiroNome',barbeiroSelecionado.nome);document.getElementById('homeBarbeiroNome').textContent=barbeiroSelecionado.nome;}document.getElementById('regNome').value='';document.getElementById('regEmail').value='';document.getElementById('regCelular').value='';document.getElementById('regSenha').value='';mostrarToast('✅ Conta criada!','success');mostrarTela('homeCliente');document.getElementById('welcomeClienteNome').textContent=n;}catch(er){mostrarToast('❌ Erro!','error');}}
async function loginCliente(){let e=document.getElementById('loginEmail').value.trim(),s=document.getElementById('loginSenha').value;if(!e||!s){mostrarToast('❌ Preencha!','error');return;}try{let sn=await db.collection('clientes').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};salvarSessaoCliente(clienteLogado);marcarClienteOnline(clienteLogado);if(barbeiroSelecionado){sessionStorage.setItem('barbeiroId',barbeiroSelecionado.id);sessionStorage.setItem('barbeiroNome',barbeiroSelecionado.nome);document.getElementById('homeBarbeiroNome').textContent=barbeiroSelecionado.nome;}document.getElementById('loginEmail').value='';document.getElementById('loginSenha').value='';mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeCliente');document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;}catch(er){mostrarToast('❌ Erro!','error');}}
async function loginBarbeiro(){let e=document.getElementById('loginEmailBarbeiro')?.value.trim(),s=document.getElementById('loginSenhaBarbeiro')?.value;if(!e||!s){mostrarToast('❌ Use o login de barbeiro','error');return;}try{let sn=await db.collection('barbeiros').where('email','==',e).where('senha','==',s).get();if(sn.empty){mostrarToast('❌ Inválido!','error');return;}let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};salvarSessaoBarbeiro(barbeiroLogado);mostrarToast('✅ Bem-vindo!','success');mostrarTela('homeBarbeiro');document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;}catch(er){mostrarToast('❌ Erro!','error');}}

// ==========================================================
// SESSÃO
// ==========================================================
function salvarSessaoCliente(d){let s={tipo:'cliente',id:d.id,nome:d.nome,email:d.email,senha:d.senha,fotoPerfil:d.fotoPerfil||'',timestamp:Date.now()};localStorage.setItem('barbeariaRM_sessao',JSON.stringify(s));}
function salvarSessaoBarbeiro(d){let s={tipo:'barbeiro',id:d.id,nome:d.nome,email:d.email,senha:d.senha,fotoPerfil:d.fotoPerfil||'',timestamp:Date.now()};localStorage.setItem('barbeariaRM_sessao',JSON.stringify(s));}
function carregarSessao(){let d=localStorage.getItem('barbeariaRM_sessao');if(!d)return null;try{let s=JSON.parse(d);if((Date.now()-s.timestamp)/86400000>30){localStorage.removeItem('barbeariaRM_sessao');return null;}return s;}catch(e){localStorage.removeItem('barbeariaRM_sessao');return null;}}
async function restaurarSessao(){let s=carregarSessao();if(!s)return!1;try{if(s.tipo==='cliente'){let sn=await db.collection('clientes').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){let d=sn.docs[0];clienteLogado={id:d.id,...d.data()};marcarClienteOnline(clienteLogado);return!0;}}else{let sn=await db.collection('barbeiros').where('email','==',s.email).where('senha','==',s.senha).get();if(!sn.empty){let d=sn.docs[0];barbeiroLogado={id:d.id,...d.data()};return!0;}}}catch(e){}localStorage.removeItem('barbeariaRM_sessao');return!1;}
function sairCliente(){if(!confirm('Sair?'))return;if(clienteLogado)removerClienteOnline(clienteLogado.id);clienteLogado=null;barbeiroSelecionado=null;sessionStorage.clear();localStorage.removeItem('barbeariaRM_sessao');mostrarTela('inicio');mostrarToast('👋 Até logo!','info');}
function sairBarbeiro(){if(!confirm('Sair?'))return;barbeiroLogado=null;localStorage.removeItem('barbeariaRM_sessao');mostrarTela('inicio');mostrarToast('👋 Até logo!','info');}

// ==========================================================
// ONLINE
// ==========================================================
async function marcarClienteOnline(cliente){if(!cliente||!cliente.id)return;try{await db.collection('clientes').doc(cliente.id).update({online:!0,ultimoAcesso:new Date().toISOString()});}catch(e){}let ol=JSON.parse(localStorage.getItem('barbearia_online')||'{}');ol[cliente.id]={...cliente,online:!0};localStorage.setItem('barbearia_online',JSON.stringify(ol));}
async function removerClienteOnline(id){if(!id)return;try{await db.collection('clientes').doc(id).update({online:!1});}catch(e){}let ol=JSON.parse(localStorage.getItem('barbearia_online')||'{}');delete ol[id];localStorage.setItem('barbearia_online',JSON.stringify(ol));}

// ==========================================================
// FEED DO BARBEIRO
// ==========================================================
async function carregarFeedBarbeiro(){let c=document.getElementById('feedClienteContainer');if(!c)return;let bid=sessionStorage.getItem('barbeiroId')||(barbeiroSelecionado?barbeiroSelecionado.id:'');if(!bid){c.innerHTML='<p style="color:#6B7280;">Selecione um barbeiro</p>';return;}try{let sn=await db.collection('posts').where('barbeiroId','==',bid).orderBy('dataCriacao','desc').get();let posts=sn.docs.map(d=>({id:d.id,...d.data()}));if(posts.length===0){c.innerHTML='<div class="card" style="text-align:center;padding:40px;"><h3 style="color:#D4A84B;">📸 Nenhum corte ainda</h3></div>';return;}c.innerHTML=posts.map(p=>'<div class="feed-post"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+p.barbeiroNome+'</div><div class="feed-post-user-time">'+new Date(p.dataCriacao).toLocaleDateString('pt-BR')+'</div></div></div>'+(p.video?'<video class="feed-post-video" controls><source src="'+p.video+'" type="video/mp4"></video>':'')+(p.imagem&&!p.video?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<div class="feed-post-body"><div class="feed-post-title">'+p.titulo+'</div><div class="feed-post-price">R$ '+(p.preco||0).toFixed(2)+'</div></div><div class="feed-post-actions"><button onclick="curtirPost(\''+p.id+'\')">❤️ '+(p.likes||0)+'</button><button class="btn-comentar" data-id="'+p.id+'">💬 '+(p.comentarios||[]).length+'</button></div></div>').join('');document.querySelectorAll('.btn-comentar').forEach(b=>b.addEventListener('click',function(){abrirComentarios(this.dataset.id);}));}catch(e){}}
async function curtirPost(pid){try{await db.collection('posts').doc(pid).update({likes:firebase.firestore.FieldValue.increment(1)});carregarFeedBarbeiro();mostrarToast('❤️ Curtido!','success');}catch(e){}}

// COMENTÁRIOS
function abrirComentarios(id){postSelecionadoId=id;carregarComentarios(id);document.getElementById('modalComentario').classList.add('active');}
async function carregarComentarios(id){let c=document.getElementById('comentariosContainer');if(!c)return;let doc=await db.collection('posts').doc(id).get();if(!doc.exists)return;let com=doc.data().comentarios||[];c.innerHTML=com.length===0?'<p style="color:#6B7280;">Nenhum comentário</p>':com.map(x=>'<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.03);border-radius:8px;"><strong style="color:#D4A84B;">'+x.autor+'</strong><p style="color:#B0B0B0;">'+x.texto+'</p></div>').join('');}
async function adicionarComentario(){let t=document.getElementById('novoComentario').value.trim();if(!t||!clienteLogado)return;let doc=await db.collection('posts').doc(postSelecionadoId).get();let com=doc.data().comentarios||[];com.push({autor:clienteLogado.nome,texto:t,data:new Date().toISOString()});await db.collection('posts').doc(postSelecionadoId).update({comentarios:com});document.getElementById('novoComentario').value='';carregarComentarios(postSelecionadoId);carregarFeedBarbeiro();}
function fecharModalComentario(){document.getElementById('modalComentario').classList.remove('active');}

// ==========================================================
// PERFIL DO CLIENTE
// ==========================================================
function carregarPerfilCliente(){if(!clienteLogado)return;document.getElementById('perfilClienteNome').textContent=clienteLogado.nome;document.getElementById('perfilClienteEmail').textContent=clienteLogado.email;document.getElementById('editClienteNome').value=clienteLogado.nome||'';document.getElementById('editClienteCelular').value=clienteLogado.celular||'';}
async function salvarPerfilCliente(){if(!clienteLogado)return;let n=document.getElementById('editClienteNome').value.trim(),c=document.getElementById('editClienteCelular').value.trim();await db.collection('clientes').doc(clienteLogado.id).update({nome:n,celular:c});clienteLogado.nome=n;clienteLogado.celular=c;mostrarToast('✅ Salvo!','success');}
async function carregarStatsCliente(){if(!clienteLogado)return;try{let sn=await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).where('status','in',['confirmado','concluido']).get();let ag=sn.docs.map(d=>d.data());let hoje=new Date();let semana=0,mes=0,ano=0,total=ag.length;ag.forEach(a=>{let da=new Date(a.data);let iniSemana=new Date(hoje);iniSemana.setDate(hoje.getDate()-hoje.getDay());if(da>=iniSemana)semana++;if(da.getMonth()===hoje.getMonth()&&da.getFullYear()===hoje.getFullYear())mes++;if(da.getFullYear()===hoje.getFullYear())ano++;});document.getElementById('statsSemana').textContent=semana;document.getElementById('statsMes').textContent=mes;document.getElementById('statsAno').textContent=ano;document.getElementById('statsTotal').textContent=total;}catch(e){}}
async function carregarPostsCliente(){let c=document.getElementById('meusPostsCliente');if(!c||!clienteLogado)return;try{let sn=await db.collection('postsClientes').where('clienteId','==',clienteLogado.id).orderBy('dataCriacao','desc').get();let posts=sn.docs.map(d=>({id:d.id,...d.data()}));c.innerHTML=posts.length===0?'<p style="color:#6B7280;">Nenhum post</p>':posts.map(p=>'<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px;margin-bottom:6px;">'+(p.imagem?'<img src="'+p.imagem+'" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">':'')+'<p style="color:#B0B0B0;font-size:12px;margin-top:4px;">'+p.descricao+'</p><span style="font-size:10px;color:#666;">'+new Date(p.dataCriacao).toLocaleDateString('pt-BR')+'</span></div>').join('');}catch(e){}}
async function criarPostCliente(){if(!clienteLogado)return;let desc=document.getElementById('postClienteDescricao').value.trim();let img=document.getElementById('postClienteImagem').value||'';if(!desc&&!img){mostrarToast('❌ Adicione descrição ou imagem!','error');return;}try{let id=Date.now().toString();await db.collection('postsClientes').doc(id).set({id,clienteId:clienteLogado.id,clienteNome:clienteLogado.nome,clienteFoto:clienteLogado.fotoPerfil||'',descricao:desc,imagem:img,likes:0,dataCriacao:new Date().toISOString()});mostrarToast('✅ Publicado no feed!','success');document.getElementById('postClienteDescricao').value='';document.getElementById('postClienteImagem').value='';document.getElementById('postClientePreview').style.display='none';mostrarTela('perfilCliente');}catch(e){mostrarToast('❌ Erro!','error');}}

// ==========================================================
// AGENDAMENTO
// ==========================================================
function carregarOpcoesAgendamento(){let sh=document.getElementById('agendamentoHorario'),st=document.getElementById('agendamentoTipo');if(sh){let h=[];for(let i=9;i<=18;i++)for(let j=0;j<60;j+=30){if(i===18&&j>0)break;h.push(String(i).padStart(2,'0')+':'+String(j).padStart(2,'0'));}sh.innerHTML=h.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}if(st){let t=['Corte Social','Corte Degradê','Corte Navalhado','Corte Máquina','Barba','Barba + Corte'];st.innerHTML=t.map(x=>'<option value="'+x+'">'+x+'</option>').join('');}let d=document.getElementById('agendamentoData');if(d)d.min=new Date().toISOString().split('T')[0];}
async function agendarCorte(){if(!clienteLogado){mostrarToast('❌ Faça login!','error');return;}let d=document.getElementById('agendamentoData').value,h=document.getElementById('agendamentoHorario').value,t=document.getElementById('agendamentoTipo').value;let bid=sessionStorage.getItem('barbeiroId');let bnome=sessionStorage.getItem('barbeiroNome');if(!d){mostrarToast('❌ Selecione data!','error');return;}try{let id=Date.now().toString();await db.collection('agendamentos').doc(id).set({id,barbeiroId:bid,barbeiroNome:bnome,clienteId:clienteLogado.id,clienteNome:clienteLogado.nome,data:d,horario:h,tipo:t,status:'pendente',dataCriacao:new Date().toISOString()});mostrarToast('✅ Agendado com '+bnome+'!','success');document.getElementById('agendamentoData').value='';mostrarTela('homeCliente');}catch(e){}}
async function carregarAgendaCliente(){if(!clienteLogado)return;let c=document.getElementById('agendaClienteContainer');if(!c)return;try{let sn=await db.collection('agendamentos').where('clienteId','==',clienteLogado.id).get();let ag=sn.docs.map(d=>({id:d.id,...d.data()}));ag.sort((a,b)=>new Date(b.data)-new Date(a.data));if(ag.length===0){c.innerHTML='<p style="color:#6B7280;">Nenhum</p>';return;}c.innerHTML=ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">✂️ '+a.tipo+' com '+a.barbeiroNome+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+(a.status==='confirmado'?'✅':a.status==='cancelado'?'❌':'⏳')+' '+a.status+'</span></div>').join('');}catch(e){}}
async function carregarAgendamentosBarbeiro(){if(!barbeiroLogado)return;let c=document.getElementById('agendamentosBarbeiroContainer');if(!c)return;try{let sn=await db.collection('agendamentos').where('barbeiroId','==',barbeiroLogado.id).orderBy('data','desc').get();let ag=sn.docs.map(d=>({id:d.id,...d.data()}));c.innerHTML=ag.length===0?'<p style="color:#6B7280;">Nenhum</p>':ag.map(a=>'<div class="agenda-item"><div class="agenda-info"><div class="agenda-cliente">👤 '+a.clienteNome+' • ✂️ '+a.tipo+'</div><div class="agenda-data">📅 '+a.data+' • ⏰ '+a.horario+'</div></div><span class="agenda-status '+a.status+'">'+a.status+'</span></div>').join('');}catch(e){}}

// ==========================================================
// PLANOS DO CLIENTE
// ==========================================================
async function carregarPlanosCliente(){let c=document.getElementById('planosClienteContainer');if(!c)return;let bid=sessionStorage.getItem('barbeiroId');if(!bid){c.innerHTML='<p style="color:#6B7280;">Selecione um barbeiro</p>';return;}try{let sn=await db.collection('planos').where('barbeiroId','==',bid).get();let p=sn.docs.map(d=>({id:d.id,...d.data()}));c.innerHTML=p.length===0?'<p style="color:#6B7280;">Nenhum plano</p>':p.map(x=>'<div class="plano-card"><div class="plano-info"><div class="plano-nome">'+x.nome+'</div><div class="plano-periodo">📅 '+x.periodo+'</div></div><div class="plano-preco">R$ '+(x.preco||0).toFixed(2)+'</div></div>').join('');}catch(e){}}

// ==========================================================
// POSTS DO BARBEIRO
// ==========================================================
function previewImagemPost(event){let f=event.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){document.getElementById('postImagem').value=ev.target.result;document.getElementById('imagemPreviewImg').src=ev.target.result;document.getElementById('imagemPreview').style.display='block';document.getElementById('imagemUploadArea').style.display='none';};r.readAsDataURL(f);}
function removerImagemPost(){document.getElementById('postImagem').value='';document.getElementById('imagemPreview').style.display='none';document.getElementById('imagemUploadArea').style.display='block';document.getElementById('postImagemInput').value='';}
async function criarPost(){if(!barbeiroLogado)return;let t=document.getElementById('postTitulo').value.trim(),p=parseFloat(document.getElementById('postPreco').value),i=document.getElementById('postImagem').value||'';if(!t||!p){mostrarToast('❌ Título e preço!','error');return;}try{let id=Date.now().toString();await db.collection('posts').doc(id).set({id,barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,titulo:t,preco:p,imagem:i,likes:0,comentarios:[],dataCriacao:new Date().toISOString()});mostrarToast('✅ Publicado!','success');document.getElementById('postTitulo').value='';document.getElementById('postPreco').value='';removerImagemPost();mostrarTela('homeBarbeiro');}catch(e){}}
async function carregarMeusPosts(){let c=document.getElementById('meusPostsContainer');if(!c||!barbeiroLogado)return;try{let sn=await db.collection('posts').where('barbeiroId','==',barbeiroLogado.id).get();let posts=[];sn.forEach(d=>posts.push({id:d.id,...d.data()}));posts.sort((a,b)=>new Date(b.dataCriacao)-new Date(a.dataCriacao));c.innerHTML=posts.length===0?'<p style="color:#6B7280;">Nenhum post</p>':posts.map(p=>'<div class="feed-post" style="margin-bottom:12px;"><div class="feed-post-header"><div class="feed-post-avatar">✂️</div><div class="feed-post-user"><div class="feed-post-user-name">'+p.titulo+'</div><div class="feed-post-user-time">R$ '+(p.preco||0).toFixed(2)+'</div></div></div>'+(p.imagem?'<img src="'+p.imagem+'" class="feed-post-image">':'')+'<button class="btn btn-small btn-danger" onclick="excluirMeuPost(\''+p.id+'\')">🗑</button></div>').join('');}catch(e){}}
async function excluirMeuPost(id){if(!confirm('Excluir?'))return;await db.collection('posts').doc(id).delete();mostrarToast('🗑 Excluído!','success');carregarMeusPosts();}

// ==========================================================
// FATURAMENTO / EXTRATO
// ==========================================================
async function calcularFaturamento(){if(!barbeiroLogado)return;try{let sn=await db.collection('agendamentos').where('barbeiroId','==',barbeiroLogado.id).where('status','in',['confirmado','concluido']).get();let ag=sn.docs.map(d=>d.data()),hoje=new Date().toISOString().split('T')[0],th=0,tg=0;ag.forEach(a=>{let v=35;if(a.data===hoje)th+=v;tg+=v;});document.getElementById('faturamentoHoje').textContent='R$ '+th.toFixed(2);document.getElementById('faturamentoSemana').textContent='R$ '+(tg*0.3).toFixed(2);document.getElementById('faturamentoMes').textContent='R$ '+(tg*0.7).toFixed(2);document.getElementById('faturamentoAno').textContent='R$ '+tg.toFixed(2);}catch(e){}}
async function filtrarExtrato(periodo){calcularExtrato(periodo);}
async function calcularExtrato(periodo){let c=document.getElementById('extratoContainer');if(!c||!barbeiroLogado)return;try{let sn=await db.collection('agendamentos').where('barbeiroId','==',barbeiroLogado.id).where('status','in',['confirmado','concluido']).get();let ag=sn.docs.map(d=>d.data()),hoje=new Date(),total=0,itens=[];ag.forEach(a=>{let da=new Date(a.data),v=35,inc=!1;if(periodo==='hoje')inc=a.data===hoje.toISOString().split('T')[0];else if(periodo==='semana'){let ini=new Date(hoje);ini.setDate(hoje.getDate()-hoje.getDay());inc=da>=ini;}else if(periodo==='mes')inc=da.getMonth()===hoje.getMonth()&&da.getFullYear()===hoje.getFullYear();else if(periodo==='ano')inc=da.getFullYear()===hoje.getFullYear();else inc=!0;if(inc){total+=v;itens.push(a);}});c.innerHTML=itens.length===0?'<p style="color:#6B7280;">Nenhum</p>':'<p style="color:#D4A84B;">Total: <strong>R$ '+total.toFixed(2)+'</strong> ('+itens.length+' cortes)</p>'+itens.map(a=>'<div style="padding:8px;margin:2px 0;background:rgba(255,255,255,.03);border-radius:6px;font-size:12px;">👤 '+a.clienteNome+' • ✂️ '+a.tipo+' • 📅 '+a.data+' • R$ 35,00</div>').join('');}catch(e){}}

// ==========================================================
// LIVE
// ==========================================================
function carregarLiveTela(){if(liveAtivaGeral){document.getElementById('livePlaceholder').style.display='none';document.getElementById('liveStatus')?document.getElementById('liveStatus').style.display='block':null;iniciarVisualizacaoCliente();}else{document.getElementById('livePlaceholder').style.display='flex';}verificarLiveBadge();}
async function iniciarLive(){if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}try{let s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:liveFacingMode},audio:!0});liveStreamLocal=s;liveStream=s;liveAtiva=!0;liveAtivaGeral=!0;let v=document.getElementById('liveVideo');v.srcObject=s;v.muted=!0;v.style.display='block';document.getElementById('livePlaceholder').style.display='none';liveDuracao=0;if(liveTimerInterval)clearInterval(liveTimerInterval);liveTimerInterval=setInterval(()=>{liveDuracao++;let h=Math.floor(liveDuracao/3600),m=Math.floor((liveDuracao%3600)/60),se=liveDuracao%60;let el=document.getElementById('liveDuration');if(el)el.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(se).padStart(2,'0');},1000);await db.collection('lives').doc('live_atual').set({id:'live_atual',titulo:'Live '+barbeiroLogado.nome,barbeiroNome:barbeiroLogado.nome,ativa:!0,chat:[],viewers:0,likes:0,sorteioAtivo:!1,dataInicio:new Date().toISOString()});iniciarCapturaFrames();iniciarChatListenerLive();mostrarToast('🔴 Live iniciada!','success');}catch(er){mostrarToast('❌ '+er.message,'error');}}
function iniciarCapturaFrames(){if(liveFrameInterval)clearInterval(liveFrameInterval);let canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;let ctx=canvas.getContext('2d');liveFrameInterval=setInterval(async()=>{if(!liveAtiva||!liveStreamLocal)return;try{let v=document.getElementById('liveVideo');if(!v||v.videoWidth===0)return;ctx.drawImage(v,0,0,320,180);let frame=canvas.toDataURL('image/jpeg',0.5);await db.collection('lives').doc('live_atual').update({ultimoFrame:frame});}catch(e){}},1500);}
function iniciarVisualizacaoCliente(){let old=document.getElementById('liveFrameImg');if(old)old.remove();let img=document.createElement('img');img.id='liveFrameImg';img.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;';document.getElementById('livePlayerContainer').querySelector('div').appendChild(img);let interval=setInterval(async()=>{try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().ativa){clearInterval(interval);img.remove();document.getElementById('livePlaceholder').style.display='flex';liveAtivaGeral=!1;return;}let frame=doc.data().ultimoFrame;if(frame&&img)img.src=frame;document.getElementById('liveViewerCount').textContent='👥 '+(doc.data().viewers||0);}catch(e){}},1500);db.collection('lives').doc('live_atual').update({viewers:firebase.firestore.FieldValue.increment(1)});iniciarChatListenerLive();}
function iniciarChatListenerLive(){if(liveChatListener)liveChatListener();liveChatListener=db.collection('lives').doc('live_atual').onSnapshot((doc)=>{if(!doc.exists||!doc.data().ativa)return;let data=doc.data();let chat=data.chat||[];let c=document.getElementById('liveChatMessages');if(!c)return;let html='';if(data.sorteioAtivo)html+='<div style="background:rgba(255,215,0,0.2);padding:14px;border-radius:12px;margin:8px 0;border:2px solid #FFD700;text-align:center;"><div style="font-size:24px;">🎉</div><strong style="color:#FFD700;">SORTEIO ATIVO!</strong><br><span style="color:white;">Prêmio: '+data.premioSorteio+'</span><br><span style="font-size:11px;color:#FFD700;">Digite !PARTICIPAR</span></div>';chat.forEach(m=>{html+='<div style="padding:4px;font-size:11px;"><strong style="color:#D4A84B;">'+m.autor+':</strong> '+m.texto+'</div>';});c.innerHTML=html||'<p style="color:#aaa;">Chat vazio</p>';c.scrollTop=c.scrollHeight;});}
async function enviarChatLive(){let i=document.getElementById('liveChatInput');if(!i)return;let msg=i.value.trim();if(!msg)return;let nome=clienteLogado?clienteLogado.nome:'Visitante';try{await db.collection('lives').doc('live_atual').update({chat:firebase.firestore.FieldValue.arrayUnion({autor:nome,texto:msg,data:new Date().toISOString()})});i.value='';if(msg.toUpperCase().trim()==='!PARTICIPAR')participarSorteioLive(nome);}catch(e){}}
async function participarSorteioLive(nome){try{let doc=await db.collection('lives').doc('live_atual').get();if(!doc.exists||!doc.data().sorteioAtivo)return;let p=doc.data().participantesSorteio||[];if(p.includes(nome)){mostrarToast('⚠️ Já participa!','info');return;}p.push(nome);await db.collection('lives').doc('live_atual').update({participantesSorteio:p});mostrarToast('✅ '+nome+' entrou!','success');}catch(e){}}
async function verificarLiveBadge(){try{let doc=await db.collection('lives').doc('live_atual').get();liveAtivaGeral=doc.exists&&doc.data().ativa;let bc=document.getElementById('liveBadgeCliente');if(bc)bc.style.display=liveAtivaGeral?'inline-block':'none';}catch(e){}}
async function pararLive(){if(liveTimerInterval)clearInterval(liveTimerInterval);if(liveFrameInterval)clearInterval(liveFrameInterval);if(liveChatListener)liveChatListener();if(liveStreamLocal)liveStreamLocal.getTracks().forEach(t=>t.stop());liveStream=null;liveStreamLocal=null;liveAtiva=!1;liveAtivaGeral=!1;let v=document.getElementById('liveVideo');if(v){v.srcObject=null;v.style.display='none';}let f=document.getElementById('liveFrameImg');if(f)f.remove();document.getElementById('livePlaceholder').style.display='flex';await db.collection('lives').doc('live_atual').update({ativa:!1});}

// ==========================================================
// UPLOAD POST CLIENTE
// ==========================================================
document.addEventListener('DOMContentLoaded',function(){let input=document.getElementById('postClienteImagemInput');if(input){input.addEventListener('change',function(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=function(ev){document.getElementById('postClienteImagem').value=ev.target.result;document.getElementById('postClientePreview').src=ev.target.result;document.getElementById('postClientePreview').style.display='block';};r.readAsDataURL(f);});}});

// ==========================================================
// EVENT LISTENERS
// ==========================================================
function setupEventListeners(){
    // Login/Registro
    document.getElementById('tabLoginBtn')?.addEventListener('click',()=>{document.getElementById('formLogin').style.display='block';document.getElementById('formRegistro').style.display='none';document.getElementById('tabLoginBtn').classList.add('active');document.getElementById('tabRegistroBtn').classList.remove('active');});
    document.getElementById('tabRegistroBtn')?.addEventListener('click',()=>{document.getElementById('formLogin').style.display='none';document.getElementById('formRegistro').style.display='block';document.getElementById('tabRegistroBtn').classList.add('active');document.getElementById('tabLoginBtn').classList.remove('active');});
    document.getElementById('btnLogin')?.addEventListener('click',loginCliente);
    document.getElementById('btnRegistrar')?.addEventListener('click',registrarCliente);
    document.getElementById('btnVoltarInicio')?.addEventListener('click',()=>{barbeiroSelecionado=null;mostrarTela('inicio');});
    document.getElementById('btnJaTenhoConta')?.addEventListener('click',()=>mostrarTela('loginRegister'));
    
    // Home Cliente
    document.getElementById('btnAgendarCorte')?.addEventListener('click',()=>mostrarTela('agendamento'));
    document.getElementById('btnLiveCliente')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('btnVerPlanos')?.addEventListener('click',()=>mostrarTela('planosCliente'));
    document.getElementById('btnMeuPerfil')?.addEventListener('click',()=>mostrarTela('perfilCliente'));
    
    // Perfil Cliente
    document.getElementById('btnSalvarPerfilCliente')?.addEventListener('click',salvarPerfilCliente);
    document.getElementById('btnSairCliente')?.addEventListener('click',sairCliente);
    document.getElementById('perfilClienteAvatar')?.addEventListener('click',()=>document.getElementById('fotoClienteInput').click());
    document.getElementById('fotoClienteInput')?.addEventListener('change',function(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=async function(ev){let foto=ev.target.result;document.querySelector('#perfilClienteAvatar img').src=foto;if(clienteLogado){clienteLogado.fotoPerfil=foto;await db.collection('clientes').doc(clienteLogado.id).update({fotoPerfil:foto});}};r.readAsDataURL(f);});
    
    // Agendamento
    document.getElementById('btnConfirmarAgendamento')?.addEventListener('click',agendarCorte);
    document.getElementById('btnVoltarAgendamento')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    
    // Live
    document.getElementById('btnSendLiveChat')?.addEventListener('click',enviarChatLive);
    document.getElementById('liveChatInput')?.addEventListener('keypress',e=>{if(e.key==='Enter')enviarChatLive();});
    document.getElementById('btnVoltarLive')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    
    // Comentários
    document.getElementById('btnEnviarComentario')?.addEventListener('click',adicionarComentario);
    document.getElementById('btnFecharComentario')?.addEventListener('click',fecharModalComentario);
    
    // Post Cliente
    document.getElementById('btnPublicarPostCliente')?.addEventListener('click',criarPostCliente);
    document.getElementById('btnVoltarPostCliente')?.addEventListener('click',()=>mostrarTela('perfilCliente'));
    
    // Home Barbeiro
    document.getElementById('btnNovoPost')?.addEventListener('click',()=>mostrarTela('criarPost'));
    document.getElementById('btnLiveBarbeiro')?.addEventListener('click',()=>{mostrarTela('live');iniciarLive();});
    document.getElementById('btnExtratoBarbeiro')?.addEventListener('click',()=>mostrarTela('extrato'));
    document.getElementById('btnSairBarbeiro')?.addEventListener('click',sairBarbeiro);
    
    // Post Barbeiro
    document.getElementById('postImagemInput')?.addEventListener('change',previewImagemPost);
    document.getElementById('btnRemoverImagem')?.addEventListener('click',removerImagemPost);
    document.getElementById('btnPublicarPost')?.addEventListener('click',criarPost);
    document.getElementById('btnVoltarCriarPost')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('btnVoltarExtrato')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    
    // Planos
    document.getElementById('btnVoltarPlanos')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    
    // Navegação Cliente
    document.getElementById('navHomeCliente')?.addEventListener('click',()=>mostrarTela('homeCliente'));
    document.getElementById('navAgendarCliente')?.addEventListener('click',()=>mostrarTela('agendamento'));
    document.getElementById('navLiveCliente')?.addEventListener('click',()=>mostrarTela('live'));
    document.getElementById('navPostarCliente')?.addEventListener('click',()=>mostrarTela('criarPostCliente'));
    document.getElementById('navPerfilCliente')?.addEventListener('click',()=>mostrarTela('perfilCliente'));
    
    // Navegação Barbeiro
    document.getElementById('navHomeBarbeiro')?.addEventListener('click',()=>mostrarTela('homeBarbeiro'));
    document.getElementById('navPostarBarbeiro')?.addEventListener('click',()=>mostrarTela('criarPost'));
    document.getElementById('navExtratoBarbeiro')?.addEventListener('click',()=>mostrarTela('extrato'));
    document.getElementById('navLiveBarbeiro')?.addEventListener('click',()=>{mostrarTela('live');iniciarLive();});
}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener('DOMContentLoaded',async function(){
    setupEventListeners();
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('bottomNavCliente').style.display='none';
    document.getElementById('bottomNavBarbeiro').style.display='none';
    let restaurado=await restaurarSessao();
    if(restaurado){if(clienteLogado){mostrarTela('homeCliente');document.getElementById('welcomeClienteNome').textContent=clienteLogado.nome;}else if(barbeiroLogado){mostrarTela('homeBarbeiro');document.getElementById('welcomeBarbeiroNome').textContent=barbeiroLogado.nome;}}
    else{mostrarTela('inicio');carregarBarbeirosInicio();}
    verificarLiveBadge();
    console.log('✅ Pronto!');
});
window.addEventListener('beforeunload',()=>{if(clienteLogado&&clienteLogado.id)removerClienteOnline(clienteLogado.id);});
