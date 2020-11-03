const PlayerIdtoVideo={
    1:'person1',
    2:'person2',
    3:'person3',
    4:'person4'
}
var clientVideoHeight;
var clientVideoWidth;

async function HandDetection(){
    video=document.getElementById(PlayerIdtoVideo[yourid]);
    myCanvas=document.getElementById(CanvasIdtoName[yourid]);
    const net=await handpose.load();
    console.log("loaded");
    setInterval(()=>{
        detect(net);
    },1/10);
}

async function detect(net){
    const hand =await net.estimateHands(video);
    // console.log(hand);
    const ctx=myCanvas.getContext("2d");
    drawHand(hand,ctx);
}

const drawHand=(predictions,ctx)=>{
    if(predictions.length>0){
        setClientVideoSize(video);
        predictions.forEach((prediction)=>{
            const landmarks=prediction.landmarks;
            for(let i=0;i<landmarks.length;i++){
                const x=landmarks[i][0]*clientVideoWidth/video.videoWidth;
                const y=landmarks[i][1]*clientVideoHeight/video.videoHeight;
                ctx.beginPath();
                ctx.arc(x,y,5,0,3*Math.PI);
                ctx.fillStyle="indigo";
                ctx.fill();
            }
        })
    }
}

function setClientVideoSize(v) {
    // 元の動画のサイズ
    var orgW = v.videoWidth;
    var orgH = v.videoHeight;
    var orgR = orgH / orgW;

    var videoW = v.clientWidth;
    var videoH = v.clientHeight;
    var videoR = videoH / videoW;

    if(orgR > videoR){
        clientVideoHeight = v.clientHeight;
        clientVideoWidth = clientVideoHeight / orgR;
    }else{
        clientVideoHeight = v.clientWidth;
        clientVideoWidth = clientVideoHeight * orgR;
    }
}