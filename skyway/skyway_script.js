const Peer = window.Peer;
let video_state=true;
let audio_state=true;

function wait_sleep() {
  return new Promise(resolve => {
    
    var timer =setInterval(()=>{
        if (peer.open){
          resolve();
          clearInterval(timer);
        }
      },200);
  })
}
function wait_sleep_second() {
  return new Promise(resolve => {
    var timer =setInterval(()=>{
          resolve();
          clearInterval(timer);
      },1000);
  })
}


async function skyway_main() {
  const audioMuteTriger = document.getElementById('audio_mute_trigger');
  const videoMuteTriger = document.getElementById('video_mute_trigger');

  const num_person = 4;
  const person_array=[];
  for (  var i = 1;  i <= num_person;  i++  ) {
    person_array.push(document.getElementById('person'+i));
   }

  const getRoomModeByHash = 'sfu';

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

    localStream.getAudioTracks().forEach((track) => {
      if(!audio_state){
        track.enabled = false;
        audioMuteTriger.textContent="ミュート解除"
      }
    });

    localStream.getVideoTracks().forEach((track) => {
      if(!video_state){
        track.enabled = false;
        videoMuteTriger.textContent="ビデオの開始"
      }
    });

  console.log('your id is',yourid);
  
  // 自分のビデオを映す
  person_array[yourid-1].muted = true;
  person_array[yourid-1].srcObject = localStream;
  person_array[yourid-1].playsInline = true;
  await person_array[yourid-1].play().catch(console.error);

  //ビデオサイズに合わせてキャンバスサイズを調整
  const canvas=document.getElementById(CanvasIdtoName[yourid]);
  const inkCanvas=document.getElementById(InkCanvasIdtoName[yourid]);
  const inkOnlyCanvas=document.getElementById(InkOnlyCanvasIdtoName[yourid]);
  const video=person_array[yourid-1];
  if(!video.paused){
      const vh=getClientVideoSize(video).height;
      const vw=getClientVideoSize(video).width;
      if(vh*1.5<vw){
          canvas.style.height=vh;
          canvas.style.width=vh*1.5;
          canvas.height = vh;
          canvas.width = vh*1.5;
          inkCanvas.style.height=vh;
          inkCanvas.style.width=vh*1.5;
          inkCanvas.height = vh;
          inkCanvas.width = vh*1.5;
          inkOnlyCanvas.style.height=vh;
          inkOnlyCanvas.style.width=vh*1.5;
          inkOnlyCanvas.height = vh;
          inkOnlyCanvas.width = vh*1.5;

      }else{
          canvas.style.width=vw;
          canvas.style.height=vw/1.5;
          canvas.width=vw;
          canvas.height=vw/1.5;
          inkCanvas.style.width=vw;
          inkCanvas.style.height=vw/1.5;
          inkCanvas.width=vw;
          inkCanvas.height=vw/1.5;
          inkOnlyCanvas.style.width=vw;
          inkOnlyCanvas.style.height=vw/1.5;
          inkOnlyCanvas.width=vw;
          inkOnlyCanvas.height=vw/1.5;
      }
      canvas_scale_list[yourid]=vw/450;
  }

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer(yourid,{
    key: window.__SKYWAY_KEY__,
    debug: 1,
  }));

  // join
  // Note that you need to ensure the peer has connected to signaling server
  // before using methods of peer instance.
  wait_sleep().then(result => {

    console.log("show streams",peer.open);
    if (!peer.open) {
      console.log("peer is not open");
      return;
    }
    
    const room = peer.joinRoom(roomid, {
      mode: getRoomModeByHash,
      stream: localStream,
    });
    
    room.once('open', () => {
      console.log('=== You joined ===\n');
    });
    room.on('peerJoin', peerId => {
      console.log(`=== ${peerId} joined ===\n`);
    });
    

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      var stream_index;
      console.log('get peer id is '+stream.peerId);
      stream_index=stream.peerId-1
      person_array[stream_index].srcObject = stream;
      person_array[stream_index].playsInline = true;
      person_array[stream_index].setAttribute('data-peer-id', stream.peerId);
      await person_array[stream_index].play().catch(console.error);
      //ビデオサイズに合わせてキャンバスサイズを調整
      const canvas=document.getElementById(CanvasIdtoName[stream_index+1]);
      const inkCanvas=document.getElementById(InkCanvasIdtoName[stream_index+1]);
      const inkOnlyCanvas=document.getElementById(InkOnlyCanvasIdtoName[stream_index+1]);
      const video=person_array[stream_index];
      // console.log("canvas"+canvas.clientWidth);
      // console.log("person"+player.clientHeight);
      if(!video.paused){
          // console.log(getClientVideoSize(video).height);
          // console.log(getClientVideoSize(video).width);
          const vh=getClientVideoSize(video).height;
          const vw=getClientVideoSize(video).width;
          if(vh*1.5<vw){
              canvas.style.height=vh;
              canvas.style.width=vh*1.5;
              canvas.height = vh;
              canvas.width = vh*1.5;
              inkCanvas.style.height=vh;
              inkCanvas.style.width=vh*1.5;
              inkCanvas.height = vh;
              inkCanvas.width = vh*1.5;
              inkOnlyCanvas.style.height=vh;
              inkOnlyCanvas.style.width=vh*1.5;
              inkOnlyCanvas.height = vh;
              inkOnlyCanvas.width = vh*1.5;
          }else{
              canvas.style.width=vw;
              canvas.style.height=vw/1.5;
              canvas.width=vw;
              canvas.height=vw/1.5;
              inkCanvas.style.width=vw;
              inkCanvas.style.height=vw/1.5;
              inkCanvas.width=vw;
              inkCanvas.height=vw/1.5;
              inkOnlyCanvas.style.width=vw;
              inkOnlyCanvas.style.height=vw/1.5;
              inkOnlyCanvas.width=vw;
              inkOnlyCanvas.height=vw/1.5;
          }
          canvas_scale_list[stream_index+1]=vw/450;
    }
    });

    // for closing room members
    room.on('peerLeave', close_room_members);

    function close_room_members(peerId){
      const remoteVideo = person_array.filter(function(value, index, array ) {
        if (value.getAttribute('data-peer-id')==peerId && index!=yourid-1){
          return value;
        }
      })[0];
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      console.log(`=== ${peerId} left ===\n`);
    }


    // for closing myself
    room.once('close', close_myself);

    function close_myself(){
      console.log('== You left ===\n');
      var person_array_remote=person_array.filter(function(value, index, array ) {
        if (value.srcObject!=null){
          return value;
        }
      });
      person_array_remote.forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.cc = null;
      });
      // console.log(person_array_remote);
      // Array.from(person_array_remote).forEach(remoteVideo => {
      //   remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      //   remoteVideo.srcObject = null;
      //   remoteVideo.remove();
      // });
    }

    function audio_toggle(){
      localStream.getAudioTracks().forEach((track) => {
        if (track.enabled){
          track.enabled = false;
          console.log('audio off');
          audioMuteTriger.textContent="ミュート解除"
        }
        else{
          track.enabled = true;
          console.log('audio on');
          audioMuteTriger.textContent="ミュート"
        }
        audio_state=track.enabled;
      });
    }

    function video_toggle(){
      localStream.getVideoTracks().forEach((track) => {
        if (track.enabled){
          track.enabled = false;
          console.log('video off');
          videoMuteTriger.textContent="ビデオの開始"
        }
        else{
          track.enabled = true;
          console.log('video on');
          videoMuteTriger.textContent="ビデオの停止"
        }
        video_state=track.enabled;
      });
    }

    socket.on('disconnected',()=>{
      console.log('socket disconnection is detected in skyway.js');
      socket.removeAllListeners('disconnected');
      room.close();
      close_myself();
      peer.destroy();      
  });

    audioMuteTriger.addEventListener('click', audio_toggle); // 音声のミュート切り替え
    videoMuteTriger.addEventListener('click', video_toggle); // ビデオのオンオフ切り替え
  });

  peer.on('error', console.error);
};