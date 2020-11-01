'use strict';

const socket = io();
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const canvas3 = document.getElementById('canvas3');
const canvas4 = document.getElementById('canvas4');

canvas1.style.height = canvas1.getBoundingClientRect().width*2/3
canvas2.style.height = canvas2.getBoundingClientRect().width*2/3
canvas3.style.height = canvas3.getBoundingClientRect().width*2/3
canvas4.style.height = canvas4.getBoundingClientRect().width*2/3
canvas1.width = canvas1.getBoundingClientRect().width
canvas2.width = canvas1.getBoundingClientRect().width
canvas3.width = canvas1.getBoundingClientRect().width
canvas4.width = canvas1.getBoundingClientRect().width
canvas1.height = canvas1.getBoundingClientRect().width*2/3
canvas2.height = canvas2.getBoundingClientRect().width*2/3
canvas3.height = canvas3.getBoundingClientRect().width*2/3
canvas4.height = canvas4.getBoundingClientRect().width*2/3
var canvas_scale=canvas1.getBoundingClientRect().width/450

window.addEventListener("resize",()=>{
    canvas1.style.height = canvas1.getBoundingClientRect().width*2/3
    canvas2.style.height = canvas2.getBoundingClientRect().width*2/3
    canvas3.style.height = canvas3.getBoundingClientRect().width*2/3
    canvas4.style.height = canvas4.getBoundingClientRect().width*2/3
    canvas1.width = canvas1.getBoundingClientRect().width
    canvas2.width = canvas1.getBoundingClientRect().width
    canvas3.width = canvas1.getBoundingClientRect().width
    canvas4.width = canvas1.getBoundingClientRect().width
    canvas1.height = canvas1.getBoundingClientRect().width*2/3
    canvas2.height = canvas2.getBoundingClientRect().width*2/3
    canvas3.height = canvas3.getBoundingClientRect().width*2/3
    canvas4.height = canvas4.getBoundingClientRect().width*2/3
    canvas_scale = canvas1.getBoundingClientRect().width/450
});
const playerImage = document.getElementById('player-image');
const ImageLoader=document.getElementById('image-wrapper');
var player_list={};
var startflag=0;
var yourid;
var roomid;
var eventlistener_exist=[false,false,false,false];
const TrumpHeight=100;
const TrumpWidth=68;
const StartMsg=document.getElementById('start-msg');
const CanvasIdtoName={
    1:'canvas1',
    2:'canvas2',
    3:'canvas3',
    4:'canvas4'
};
const CanvasNametoId={
    'canvas1':1,
    'canvas2':2,
    'canvas3':3,
    'canvas4':4
};
const mark={
    1:'heart',
    2:'spade',
    3:'diamond',
    4:'club',
    5:'joker'
  };

function get_query(){
    var result = {};
    if( 1 < window.location.search.length ){
        var query = window.location.search.substring( 1 );
        var parameters = query.split( '&' );
        if( parameters.length>1){console.log('toomany parameter of GET');}
        else{
            var parameter=parameters[0].split('=');
            var paramName=decodeURIComponent(parameter[0]);
            var paramValue=decodeURIComponent(parameter[1]);
            if(paramName=='roomid'){roomid=paramValue;}
            console.log('roomid'+roomid+'を設定')
        }
    }
}


function player_join(rejoin_id=0){  //if rejoin_id==0, it's first time to join
    socket.emit('join',roomid,rejoin_id);
}
function player_leave(){  
    socket.emit('leave');
}

function load_img(){
    for(var mk=1;mk<=4;mk++){
        for(var num=1;num<=13;num++){
            const elem=document.createElement('img');
            elem.setAttribute('src','/static/card/'+mark[mk]+'/'+String(num)+'.png');
            elem.setAttribute('id',mark[mk]+'-'+String(num));
            elem.setAttribute('style','display:none;');
            ImageLoader.appendChild(elem);
        }
    }
    const elem=document.createElement('img');
    elem.setAttribute('src','/static/card/joker.png');
    elem.setAttribute('id','joker');
    elem.setAttribute('style','display:none;');
    ImageLoader.appendChild(elem);
    const elem2=document.createElement('img');
    elem2.setAttribute('src','/static/card/back.png');
    elem2.setAttribute('id','back');
    elem2.setAttribute('style','display:none;');
    ImageLoader.appendChild(elem2);
    ImageLoader.appendChild(elem);
    const elem3=document.createElement('img');
    elem3.setAttribute('src','/static/cursor_inv.png');
    elem3.setAttribute('id','cursor');
    elem3.setAttribute('style','display:none;');
    ImageLoader.appendChild(elem3);

    console.log('all image loaded');
}

function draw_card(canvas_id,context,card){
    if(CanvasNametoId[canvas_id]==yourid){
        if(card.mark=='joker'){
            const CardImage=document.getElementById('joker');
            context.drawImage(CardImage,card.position.x*canvas_scale,card.position.y*canvas_scale,TrumpWidth*canvas_scale,TrumpHeight*canvas_scale);
        }else{
            const CardImage=document.getElementById(card.mark+'-'+String(card.number));
            context.drawImage(CardImage,card.position.x*canvas_scale,card.position.y*canvas_scale,TrumpWidth*canvas_scale,TrumpHeight*canvas_scale);
        }
    }else{
        const CardImage=document.getElementById('back');
        context.drawImage(CardImage,card.position.x*canvas_scale,card.position.y*canvas_scale,TrumpWidth*canvas_scale,TrumpHeight*canvas_scale);
    }
}

function choose_card(event){
    console.log('スタートフラッグが0?');
    if(startflag==0){return;}
    var canvasrect = this.canvas.getBoundingClientRect();
    const x=(event.clientX-canvasrect.left)/canvas_scale;
    const y=(event.clientY-canvasrect.top)/canvas_scale;
    var pull_player=player_list[yourid];
    var pulled_player=player_list[CanvasNametoId[this.canvas.id]];
    console.log('x'+x);
    console.log('y'+y);
    console.log('canvasnametoid'+CanvasNametoId[this.canvas.id]);
    if(pull_player.status=='pull' && pulled_player.status=='pulled'){
        var pulled_card=null;
        var pulled_card_idx=null;
        const cardlist=getReverseCardList(pulled_player.cardlist);
        cardlist.forEach((card,idx)=>{
            if(card.position.x<=x && x<=card.position.x+TrumpWidth && card.position.y<=y && y<=card.position.y+TrumpHeight){
                pulled_card=card;
                pulled_card_idx=cardlist.length-idx-1;
            }
        });
        if(pulled_card==null){return;}
        socket.emit('pull',yourid,pulled_card,pulled_card_idx);
        console.log('pullしました');
    }
}

function move_card(event){
    if(startflag==0){return;}
    let canvas=this.canvas;
    var canvasrect = canvas.getBoundingClientRect();
    var x=(event.clientX-canvasrect.left)/canvas_scale;
    var y=(event.clientY-canvasrect.top)/canvas_scale;
    var moved_player=player_list[CanvasNametoId[canvas.id]];
    var moved_card=null;
    var moved_card_idx=null;
    if(moved_player.status=='pulled' && player_list[yourid].status=='pulled'){
        moved_player.cardlist.forEach((card,idx)=>{
            if(card.position.x<=x && x<=card.position.x+TrumpWidth && card.position.y<=y && y<=card.position.y+TrumpHeight){
                moved_card=card;
                moved_card_idx=idx;
            }
        });
    }
    if(moved_card!=null){
        canvas.addEventListener("mousemove", mmove, false);
        canvas.addEventListener("mouseup", mup, false);
        canvas.addEventListener("mouseleave", mup, false);
    }
    function mmove(event){
        const mx=(event.clientX-canvasrect.left)/canvas_scale;
        const my=(event.clientY-canvasrect.top)/canvas_scale;
        let xoffset=mx-x;
        let yoffset=my-y;
        moved_card.position.x += xoffset;
        moved_card.position.y += yoffset ;
        if(moved_card.position.x<0){moved_card.position.x=0;}
        else if(moved_card.position.y<0){moved_card.position.y=0;}
        else if(moved_card.position.x>450-TrumpWidth){moved_card.position.x=450-TrumpWidth;}
        else if(moved_card.position.y>300-TrumpHeight){moved_card.position.y=300-TrumpHeight;}
        x=mx;
        y=my;
        socket.emit('move',yourid,moved_card,moved_card_idx);

        moved_card_idx=moved_player.cardlist.length-1;
    }
    function mup(event){
        canvas.removeEventListener("mousemove", mmove, false);
        canvas.removeEventListener("mouseup", mup, false);
        canvas.addEventListener("mouseleave", mup, false);
    }
}

function move_cursor(event){
    let canvas=this.canvas;
    var canvasrect = canvas.getBoundingClientRect();
    var x=event.clientX-canvasrect.left;
    var y=event.clientY-canvasrect.top;
    var pull_player=player_list[yourid];
    var pulled_player=player_list[CanvasNametoId[canvas.id]];

    if(pull_player.status=='pull' && pulled_player.status=='pulled'){
        socket.emit('cursor',canvas.id,x,y);
    }
}

function getReverseCardList(cardlist){
    var reverselist=[];
    for(var i=cardlist.length-1;i>=0;i--){
        reverselist.push(cardlist[i]);
    }
    return reverselist;
}

socket.on('joined',(pid)=>{
    console.log('player '+pid+' Joined');
    yourid=pid;
});
socket.on('reject',()=>{
    StartMsg.innerHTML='There are few people!';
    wait_and_reset(5,1);
})
socket.on('started',(player_num)=>{
    startflag=1;
    console.log('1にしました');
    StartMsg.innerHTML='';
    var win_msg_list=document.getElementsByClassName('win-msg');
    Object.values(win_msg_list).forEach((msg)=>{
        msg.innerHTML='';
        msg.zIndex=-1;
    });
    for(var i=1;i<=player_num;i++){
        const canvas=document.getElementById(CanvasIdtoName[i]);
        if(!eventlistener_exist[i]){
            canvas.addEventListener('click',{
                handleEvent:choose_card,
                canvas:canvas
            });
            canvas.addEventListener('mousedown',{
                handleEvent:move_card,
                canvas:canvas
            });
            canvas.addEventListener('mousemove',{
                handleEvent:move_cursor,
                canvas:canvas
            });
        }
        eventlistener_exist[i]=true;
    }
})
async function wait_and_reset(sec,reset_flag){
    function wait(sec){
        return new Promise(resolve => setTimeout(resolve, sec*1000));
    }
    await wait(sec);
    if(reset_flag==1){
        startflag=0;
        console.log('0にしました');
    }
    StartMsg.innerHTML='Press Space to Start';
}

document.addEventListener('keydown', (event) => {
    if(event.keyCode==32 && startflag==0){
        socket.emit('start');
        startflag=1;
        StartMsg.innerHTML='';
    };
    socket.emit('push');
});

socket.on('pushed',()=>{
    console.log('get return');
});

socket.on('distributed',(players)=>{
    console.log('Shuffled and Distributed cards');
    Object.values(players).forEach((player,idx)=>{
            const canvas=document.getElementById('canvas'+String(player.id));
            const context=canvas.getContext('2d');
            var cardlist;
            context.clearRect(0, 0, canvas.width, canvas.height);
            if(player.id==yourid){
                context.fillStyle = "#990000";
                cardlist=player.cardlist;
            }else{
                context.fillStyle = "#004840";
                cardlist=getReverseCardList(player.cardlist);
            }
            context.fillRect(0,0,canvas.width,canvas.height);
            cardlist.forEach((card)=>{
                const mark=card.mark;
                const number=card.number;
                draw_card(canvas.id,context,card);
            });
    });
});

socket.on('finish',()=>{
    StartMsg.innerHTML='Finish!!';
    player_list={};
    socket.emit('remove-interval');
    wait_and_reset(5,1);
});

socket.on('location', (players,cursor) => {
    player_list=players;
    //console.log(players);
    Object.values(players).forEach((player,idx)=>{
        if(player.status=='pulled' || player.status=='pull'){
            const canvas=document.getElementById('canvas'+String(player.id));
            const context=canvas.getContext('2d');
            var cardlist;
            context.clearRect(0, 0, canvas.width, canvas.height);
            if(player.id==yourid){
                context.fillStyle = "#990000";
                cardlist=player.cardlist;
            }else{
                context.fillStyle = "#004840";
                cardlist=getReverseCardList(player.cardlist);
            }
            context.fillRect(0,0,canvas.width,canvas.height);
            cardlist.forEach((card)=>{
                const mark=card.mark;
                const number=card.number;
                draw_card(canvas.id,context,card);
            });
            if(player.status=='pulled' && cursor.x!=null && cursor!=null){
                const CursorImage=document.getElementById('cursor');
                context.drawImage(CursorImage,cursor.x-10*canvas_scale,cursor.y,77*canvas_scale,105*canvas_scale);
            }
            if(player.status=='pull'){
                StartMsg.innerHTML='Player'+player.id+'’s Turn';
            }
        }
        else if(player.status=='winner'){
            const elem=document.getElementById('win-msg'+player.id);
            elem.style.zIndex=1;
            if(player.rank==1){elem.innerHTML='You are the 1st Winner!';}
            else if(player.rank==2){elem.innerHTML='You are the 2nd Winner!';}
            else if(player.rank==3){elem.innerHTML='You are the 3rd Winner!';}
        }
        else if(player.status=='loser'){
            const elem=document.getElementById('win-msg'+player.id);
            elem.style.zIndex=1;
            const msg=elem.innerHTML='You lose...';
        }
    });
});

socket.on('over-notice',()=>{
    StartMsg.innerHTML='Over capacity';
})

socket.on('disconnected',()=>{
    console.log("disconnected");
    StartMsg.innerHTML='Someone disconnected';
    player_list={};
    socket.emit('remove-interval');
    wait_and_reset(5,1);
});

socket.on('leaved-after-finish',()=>{
    player_join(yourid);
})
socket.on('leaved-after-disconnect',()=>{
    player_join();
})