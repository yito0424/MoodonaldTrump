const Peer = window.Peer;
var room_id;

function wait_sleep() {
  return new Promise(resolve => {
    
    var timer =setInterval(()=>{
        if (peer.open){
          resolve();
          clearInterval(timer);
        }
      },100);
  })
}

function get_roomId(){
  if( 1 < window.location.search.length ){
      var query = window.location.search.substring( 1 );
      var parameters = query.split( '&' );
      if( parameters.length>1){console.log('toomany parameter of GET');}
      else{
          var parameter=parameters[0].split('=');
          var paramName=decodeURIComponent(parameter[0]);
          var paramValue=decodeURIComponent(parameter[1]);
          if(paramName=='roomid'){
            room_id=paramValue;
            return room_id;
          }
      }
  }
};

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const messages = document.getElementById('js-messages');

  var count_stream=-1
  const num_person = 3
  const person_array=[];
  for (  var i = 0;  i < num_person;  i++  ) {
    person_array.push(document.getElementById('person'+i))
   }
  console.log(person_array);

  room_id=get_roomId();
  console.log('roomID is '+room_id);

  const getRoomModeByHash = 'sfu';

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 1,
  }));

  // join
  // Note that you need to ensure the peer has connected to signaling server
  // before using methods of peer instance.
  wait_sleep().then(result => {
    console.log("show streams",peer.open);
    if (!peer.open) {
      console.log("peer is not open")
      return;
    }

    const room = peer.joinRoom(room_id, {
      mode: getRoomModeByHash,
      stream: localStream,
    });
    
    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });
    
    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      count_stream++
      console.log(count_stream)
      person_array[count_stream].srcObject = stream;
      person_array[count_stream].playsInline = true;
      person_array[count_stream].setAttribute('data-peer-id', stream.peerId);
      await person_array[count_stream].play().catch(console.error);

    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });


    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = person_array.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      // remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });


    // for closing myself
    room.once('close', () => {
      messages.textContent += '== You left ===\n';
      console.log(person_array);
      person_array.forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    leaveTrigger.addEventListener('click', () => room.close(), { once: true });
  });

  peer.on('error', console.error);
})();