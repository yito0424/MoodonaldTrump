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
    },500);
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
            // const bbbr=prediction.boundingBox.bottomRight;
            // const bbtl=prediction.boundingBox.topLeft;
            const landmarks=prediction.landmarks;
            const palmbase=prediction.annotations.palmBase[0];
            const thumb=prediction.annotations.thumb;
            const index=prediction.annotations.indexFinger;
            const middle=prediction.annotations.middleFinger;
            const ring=prediction.annotations.ringFinger;
            const pinky=prediction.annotations.pinky;
            const fingers=[thumb,index,middle,ring,pinky];
            var sum_angle_list=[];
            // var aspect=(bbbr[1]-bbtl[1])/(bbbr[0]-bbtl[0]);
            // console.log("aspect:"+(bbbr[1]-bbtl[1]));
            fingers.forEach((finger)=>{
                var sum_angle=0;
                for(var i=0;i<3;i++){
                    var angle;
                    if(i==0){
                        var edge1=(finger[0][0]-palmbase[0])**2+(finger[0][1]-palmbase[1])**2+(finger[0][2]-palmbase[2])**2
                        var edge2=(finger[1][0]-finger[0][0])**2+(finger[1][1]-finger[0][1])**2+(finger[1][2]-finger[0][2])**2
                        var edge3=(finger[1][0]-palmbase[0])**2+(finger[1][1]-palmbase[1])**2+(finger[1][2]-palmbase[2])**2
                        angle=Math.acos((edge1+edge2-edge3)/(2*Math.sqrt(edge1)*Math.sqrt(edge2)))*180/Math.PI
                    }else{
                        var edge1=Math.sqrt((finger[i][0]-finger[i-1][0])**2+(finger[i][1]-finger[i-1][1])**2+(finger[i][2]-finger[i-1][2])**2)
                        var edge2=Math.sqrt((finger[i+1][0]-finger[i][0])**2+(finger[i+1][1]-finger[i][1])**2+(finger[i+1][2]-finger[i][2])**2)
                        var edge3=Math.sqrt((finger[i+1][0]-finger[i-1][0])**2+(finger[i+1][1]-finger[i-1][1])**2+(finger[i+1][2]-finger[i-1][2])**2)
                        angle=Math.acos((edge1+edge2-edge3)/(2*Math.sqrt(edge1)*Math.sqrt(edge2)))*180/Math.PI
                    }
                    sum_angle+=angle
                }
                sum_angle_list.push(sum_angle);
            })
            var open_finger_num=0;
            sum_angle_list.forEach((sum_angle)=>{
                // console.log(i+":"+sum_angle);
                if(sum_angle>=320){open_finger_num++;}
            })
            if(open_finger_num>=3){console.log("open");}
            else{console.log("close")};
            
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