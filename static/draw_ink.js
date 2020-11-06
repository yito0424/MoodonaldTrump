const inkButton=document.getElementById('ink-button');

const inkHW=200;
var inkFlag=0;
var inkCanvasImgList={}


function setInkFlag(){
    console.log("インク");
    if(inkFlag==0){inkFlag=1;}
    else if(inkFlag==1){inkFlag=0;}
};

function chooseInkArea(event){
    if(inkFlag==0){return;}
    inkFlag=2; //以降はインクを使えない
    if(startflag==0){return;}
    console.log(event.currentTarget.id);
    var canvasrect = event.currentTarget.getBoundingClientRect();
    console.log(canvasrect);
    const x=(event.clientX-canvasrect.left)/canvas_scale_list[InkCanvasNametoId[event.currentTarget.id]];
    const y=(event.clientY-canvasrect.top)/canvas_scale_list[InkCanvasNametoId[event.currentTarget.id]];
    socket.emit('shot',InkCanvasNametoId[event.currentTarget.id],x,y);
}

socket.on('shotted',(id,x,y)=>{
    console.log(id);
    console.log('x:'+x+'y:'+y);
    var inkCanvas=document.getElementById('ink-canvas'+id);
    var shotted_card_list=[];
    var shotted_card_idx_list=[];
    var inkoffset_list=[];
    inkCanvas.style.zIndex=2;
    var context=inkCanvas.getContext('2d');
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = "#990000";
    context.fillRect(0,0,inkCanvas.width,inkCanvas.height);
    player_list[id].cardlist.forEach((card,idx)=>{
        if(!(card.position.x<=(x-inkHW/2-TrumpWidth) || (card.position.x<=(x-inkHW/2) && card.position.x<(x+inkHW/2) && (card.position.y>=y+inkHW/2 || card.position.y<=y-inkHW/2-TrumpHeight)) || card.position.x>=(x+inkHW/2))){
            if(card.mark=='joker'){
                const CardImage=document.getElementById('joker');
                context.drawImage(CardImage,card.position.x*canvas_scale_list[id],card.position.y*canvas_scale_list[id],TrumpWidth*canvas_scale_list[id],TrumpHeight*canvas_scale_list[id]);
            }else{
                const CardImage=document.getElementById(card.mark+'-'+String(card.number));
                context.drawImage(CardImage,card.position.x*canvas_scale_list[id],card.position.y*canvas_scale_list[id],TrumpWidth*canvas_scale_list[id],TrumpHeight*canvas_scale_list[id]);
            }
            card.inkoffset={x:card.position.x-x,y:card.position.y-y}
            console.log(card);
            shotted_card_list.push(card);
            shotted_card_idx_list.push(idx);
            // console.log('cardposition');
            // console.log(card.position);
            // console.log('inkx'+x);
            // console.log('inky'+y);
        }
    });
    socket.emit('card_shotted',id,shotted_card_list,shotted_card_idx_list);
    const inkImage=document.getElementById('ink');
    inkImage.style.width=inkHW*canvas_scale_list[id];
    inkImage.style.height=inkHW*canvas_scale_list[id];
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(inkImage,(x-inkHW/2)*canvas_scale_list[id],(y-inkHW/2)*canvas_scale_list[id],inkHW*canvas_scale_list[id],inkHW*canvas_scale_list[id]);
    var URI=inkCanvas.toDataURL();
    var inkCanvasImg=new Image();
    inkCanvasImg.src=URI;
    inkCanvasImgList[id]=inkCanvasImg;
    console.log("終了");
})