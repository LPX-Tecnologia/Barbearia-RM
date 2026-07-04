async function iniciarLive(){
    if(!barbeiroLogado){mostrarToast('❌ Apenas barbeiros!','error');return;}
    var titulo=document.getElementById('liveTitulo').value.trim()||'🔴 Live da Barbearia RM';
    try{
        // Câmera com resolução menor para performance
        var stream=await navigator.mediaDevices.getUserMedia({
            video:{width:{ideal:640},height:{ideal:480},facingMode:'user',frameRate:{ideal:25}},
            audio:{echoCancellation:true,noiseSuppression:true,sampleRate:44100}
        });
        liveLocalStream=stream;
        
        // Atribuir stream ao elemento de vídeo
        var videoEl=document.getElementById('liveVideo');
        videoEl.srcObject=stream;
        videoEl.muted=true; // Muted para evitar eco
        videoEl.style.display='block';
        videoEl.style.width='100%';
        videoEl.style.height='100%';
        videoEl.style.objectFit='cover';
        
        // Esconder frame image
        document.getElementById('liveFrameImg').style.display='none';
        
        // Mini câmera
        var videoLocal=document.getElementById('liveVideoLocal');
        videoLocal.srcObject=stream;
        videoLocal.style.display='block';
        videoLocal.muted=true;
        
        // Monitoramento de áudio
        try{
            if(liveAudioMonitor)liveAudioMonitor.close();
            liveAudioMonitor=new(window.AudioContext||window.webkitAudioContext)({sampleRate:44100});
            var source=liveAudioMonitor.createMediaStreamSource(stream);
            var gainNode=liveAudioMonitor.createGain();
            gainNode.gain.value=0.3;
            source.connect(gainNode);
            gainNode.connect(liveAudioMonitor.destination);
        }catch(e){}
        
        // Salvar no Firestore
        await db.collection('lives').doc('live_atual').set({
            id:'live_atual',barbeiroId:barbeiroLogado.id,barbeiroNome:barbeiroLogado.nome,
            titulo,ativa:true,chat:[],viewers:0,totalViews:0,likes:0,
            telaAtiva:1,dataInicio:new Date().toISOString()
        });
        
        liveAtiva=true;liveChatMessages=[];liveLikes=0;liveLiked=false;
        liveViewersAtivos={};liveUltimoFrameEnviado=0;liveTelaAtiva=1;
        
        // Atualizar interface
        document.getElementById('livePlaceholder').style.display='none';
        document.getElementById('livePlayer').style.display='block';
        document.getElementById('liveStatus').style.display='block';
        document.getElementById('liveStatusTitulo').textContent=titulo;
        document.getElementById('liveStatusBarbeiro').textContent='👤 '+barbeiroLogado.nome;
        document.getElementById('liveLoginWarning').style.display='none';
        document.getElementById('liveViewerCount').textContent='👥 0';
        document.getElementById('liveStatusViewers').textContent='👥 0';
        document.getElementById('liveAnuncioOverlay').style.display='none';
        document.getElementById('liveTela1').style.display='block';
        document.getElementById('liveTela2').style.display='none';
        document.getElementById('liveTelaIndicador').textContent='🎥 CÂMERA';
        document.getElementById('liveTelaIndicador').style.display=barbeiroLogado?'block':'none';
        
        // Canvas para frames
        liveFrameCanvas=document.createElement('canvas');
        liveFrameCanvas.width=480;liveFrameCanvas.height=270;
        liveFrameCtx=liveFrameCanvas.getContext('2d');
        
        iniciarCapturaFrames();
        atualizarChat();iniciarChatListener();verificarLiveAtiva();
        adicionarViewerLive();
        
        mostrarToast('🔴 Live iniciada!','success');
    }catch(error){
        console.error('❌ Erro câmera:',error);
        if(error.name==='NotAllowedError')mostrarToast('❌ Permissão da câmera negada! Verifique as configurações do navegador.','error');
        else if(error.name==='NotFoundError')mostrarToast('❌ Nenhuma câmera encontrada!','error');
        else mostrarToast('❌ '+error.message,'error');
    }
}
