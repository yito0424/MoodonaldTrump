'use strict';

const socket = io();
// 各プレーヤーのトランプのフィールド
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const canvas3 = document.getElementById('canvas3');
const canvas4 = document.getElementById('canvas4');
// 各プレーヤーのキャンバスのスケール（ウィンドウやビデオのサイズに合わせて調整）
var canvas_scale_list={};

const playerImage = document.getElementById('player-image');
const ImageLoader=document.getElementById('image-wrapper');
// 各プレーヤーのカードやステータスの情報を格納
var player_list={};
// ゲームがスタートしているかどうか（1ならスタート済）
var startflag=0;
// skyway再接続
var skyway_reconnect = true;
// skyway_mainのpromiseを格納
var promise_skyway;
// クライアントのプレイヤーID
var yourid=null;
var roomid;
// 各プレイヤーのキャンバスにイベントリスナーが設定されているか
var eventlistener_exist=[false,false,false,false];
// カードの縦横のサイズ（キャンバスの横幅を350としたときのサイズ）
const TrumpHeight=100;
const TrumpWidth=68;
const StartMsg=document.getElementById('start-msg');

const CanvasIdtoName={
    1:'canvas1',
    2:'canvas2',
    3:'canvas3',
    4:'canvas4'
};
const PlayerIdtoName={
    1:'player1',
    2:'player2',
    3:'player3',
    4:'player4'
}
const CanvasNametoId={
    'canvas1':1,
    'canvas2':2,
    'canvas3':3,
    'canvas4':4
};

const InkCanvasNametoId={
    'ink-canvas1':1,
    'ink-canvas2':2,
    'ink-canvas3':3,
    'ink-canvas4':4
}

const InkCanvasIdtoName={
    1:'ink-canvas1',
    2:'ink-canvas2',
    3:'ink-canvas3',
    4:'ink-canvas4'
}

const InkOnlyCanvasNametoId={
    'ink-only-canvas1':1,
    'ink-only-canvas2':2,
    'ink-only-canvas3':3,
    'ink-only-canvas4':4
}

const InkOnlyCanvasIdtoName={
    1:'ink-only-canvas1',
    2:'ink-only-canvas2',
    3:'ink-only-canvas3',
    4:'ink-only-canvas4'
}

const mark={
    1:'heart',
    2:'spade',
    3:'diamond',
    4:'club',
    5:'joker'
  };

  const PlayerIdtoVideo={
    1:'person1',
    2:'person2',
    3:'person3',
    4:'person4'
}

const roomIdMsg = document.getElementById('room-id-msg');

// クライアントのビデオサイズを取得
function getClientVideoSize(v){
    var orgW = v.videoWidth;
    var orgH = v.videoHeight;
    var orgR = orgH / orgW;

    var videoW = v.clientWidth;
    var videoH = v.clientHeight;
    var videoR = videoH / videoW;
    var clientH;
    var clientW

    if(orgR > videoR){
        clientH = v.clientHeight;
        clientW = clientH / orgR;
    }else{
        clientW = v.clientWidth;
        clientH = clientW * orgR;
    }
    return {height:clientH,width:clientW}
}

// 多分いらない
// for(var i=1;i<=4;i++){
//     const canvas=document.getElementById(CanvasIdtoName[i]);
//     const video=document.getElementById(PlayerIdtoVideo[i]);
//     // console.log("canvas"+canvas.clientWidth);
//     // console.log("person"+player.clientHeight);
//     // if(canvas.clientWidth*2/3<player.clientHeight*0.85){
//     //     canvas.style.height=player.clientWidth*2/3
//     // }else{
//     //     canvas.style.width=player.clientHeight*0.85*3/2;
//     // }
//     // canvas.width = canvas.getBoundingClientRect().width
//     // canvas.height = canvas.getBoundingClientRect().width*2/3
// }
// var canvas_scale=document.getElementById(CanvasIdtoName[1]).getBoundingClientRect().width/450;

// ウィンドウサイズが変わったとき，各プレイヤーのキャンバススケールを調整
window.addEventListener("resize",()=>{
    // var p1=document.getElementById("person1");
    // var divtag=document.getElementById("player1");
    // console.log("width"+100*p1.clientWidth/divtag.clientWidth);
    // console.log("height"+100*p1.clientHeight/divtag.clientHeight);
    for(var i=1;i<=4;i++){
        const canvas=document.getElementById(CanvasIdtoName[i]);
        const inkCanvas=document.getElementById(InkCanvasIdtoName[i]);
        const inkOnlyCanvas=document.getElementById(InkOnlyCanvasIdtoName[i]);
        const video=document.getElementById(PlayerIdtoVideo[i]);
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
            canvas_scale_list[i]=vw/450;

        }
        // if(canvas.clientWidth*2/3<player.clientHeight*0.85){
        //     canvas.style.height=player.clientWidth*2/3
        // }else{
        //     canvas.style.width=player.clientHeight*0.85*3/2;
        // }
        // canvas.width = canvas.getBoundingClientRect().width
        // canvas.height = canvas.getBoundingClientRect().width*2/3
    }
    // canvas_scale=document.getElementById(CanvasIdtoName[1]).getBoundingClientRect().width/450;
});

// ページ開くのとほぼ同時に実行
// 変数roomidにルームIDを設定
function get_query(){
    roomid=prompt('部屋名を入力してください。（任意の英数字の文字列）',  '例：room1');
    roomIdMsg.textContent='Room ID : '+roomid;
    console.log('roomidに'+roomid+'を設定')
}

// get_queryの次に実行
// 自分が入室したことをサーバに知らせる
function player_join(rejoin_id=0){  //if rejoin_id==0, it's first time to join
    socket.emit('join',roomid,rejoin_id);
}
// 多分使わない
function player_leave(){  
    socket.emit('leave');
}
// ページ開くとほぼ同時に実行
// トランプの画像データを読み込んでおく
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
    const elem4=document.createElement('img');
    elem4.setAttribute('src','/static/ink.png');
    elem4.setAttribute('id','ink');
    elem4.setAttribute('style','display:none;');
    ImageLoader.appendChild(elem4);
    const elem5=document.createElement('img');
    elem5.setAttribute('src','/static/ink_trans.png');
    elem5.setAttribute('id','ink-trans');
    elem5.setAttribute('style','display:none;');
    ImageLoader.appendChild(elem5);

    console.log('all image loaded');
}
// スキルを使用済みかどうか（1なら使用済み）
var skill_flag=0;

/*function player_select(){
    document.body.addEventListener( "click", function( event ) {
	    var x = event.pageX ;
        var y = event.pageY ;
        console.log(x,y);
        if(x>=0 && x<=563 && y>=0 && y<=398) document.getElementById("player1");
        else if(x>563 && yy>=0 && y<=398) document.getElementById("player2");
        else if(x>=0 && x<=563 && y>398) document.getElementById("player3");
        else if(x>563 && y>398) document.getElementById("player4");
    } ) ;
    const SkillTriger = document.getElementById('skill_trigger');
    SkillTriger.addEventListener('click', specialskill);
}*/

// const SkillTriger = document.getElementById('skill_trigger');
// SkillTriger.addEventListener('click', specialskill);

/*function specialskill_select(){
    if()
    SkillTriger.addEventListener('click', specialskill);
}*/

// 点滅「on」状態
// function show()
// {
// 	if (document.getElementById)
// 	document.getElementById("alart").style.visibility = "visible";
// }
// // 点滅「off」状態
// function hide()
// {
// 	if (document.getElementById)
// 	document.getElementById("alart").style.visibility = "hidden";
// }
// hide();
// 点滅効果を出すために「on」と「off」の状態を450ミリ秒ごとに切り替え
// 4500ミリ秒後に終了 (5秒未満)
// 多分使わない
function specialskill(){
    //if(startflag==0){return;}

    skill_flag=1;
}

// function draw_card(canvas_name,context,card){
// function draw_card(canvas_name,context,card){
//     var canvas_id=CanvasNametoId[canvas_name];
//     if(canvas_id==yourid){
//         if(card.mark=='joker'){
//             const CardImage=document.getElementById('joker');
//             context.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
//         }else{
//             const CardImage=document.getElementById(card.mark+'-'+String(card.number));
//             context.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
//         }
//     }else{
//         const CardImage=document.getElementById('back');
//         context.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
//     }
// }

// 指定されたキャンバスの指定された位置に指定されたカードを描画
function draw_card(canvas_name,context,ink_ctx,card){
    var canvas_id=CanvasNametoId[canvas_name];
    context.globalCompositeOperation='source-over';
    if(canvas_id==yourid){
        if(card.mark=='joker'){
            const CardImage=document.getElementById('joker');
            ink_ctx.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
        }else{
            const CardImage=document.getElementById(card.mark+'-'+String(card.number));
            ink_ctx.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
        }
    }else{
        if(card.inkoffset.x){
            // console.log('inkoffset');
            // console.log(card.inkoffset);
            // console.log('canvasscale'+canvas_scale_list[canvas_id]);
            var CardImage;
            if(card.mark=='joker'){
                CardImage=document.getElementById('joker');
            }else{
                CardImage=document.getElementById(card.mark+'-'+String(card.number));
            }
            context.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
            const inkImage=document.getElementById('ink');
            context.globalCompositeOperation='destination-in';
            context.drawImage(inkImage,0,0,inkImage.width,inkImage.height,(card.position.x-card.inkoffset.x-inkHW/2)*canvas_scale_list[canvas_id],(card.position.y-card.inkoffset.y-inkHW/2)*canvas_scale_list[canvas_id],inkHW*canvas_scale_list[canvas_id],inkHW*canvas_scale_list[canvas_id]);
            context.globalCompositeOperation='destination-over';
            CardImage=document.getElementById('back');
            context.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
            const cpcanvas=document.getElementById(CanvasIdtoName[canvas_id]);
            var image = context.getImageData(0, 0, cpcanvas.width, cpcanvas.height);
            // console.log(image);
            ink_ctx.putImageData(image,0,0,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);

        }else{
            const CardImage=document.getElementById('back');
            ink_ctx.drawImage(CardImage,card.position.x*canvas_scale_list[canvas_id],card.position.y*canvas_scale_list[canvas_id],TrumpWidth*canvas_scale_list[canvas_id],TrumpHeight*canvas_scale_list[canvas_id]);
        }
    }
}

// カードを引くorインクをかける
// スキルボタンが押された状態ならインクかける処理を優先 
function choose_or_paint_card(event){
    console.log('スタートフラッグが0?');
    if(startflag==0){return;}
    if(inkFlag==1){chooseInkArea(event); return;}
    var canvasrect = this.canvas.getBoundingClientRect();
    const x=(event.clientX-canvasrect.left)/canvas_scale_list[InkOnlyCanvasNametoId[this.canvas.id]];
    const y=(event.clientY-canvasrect.top)/canvas_scale_list[InkOnlyCanvasNametoId[this.canvas.id]];
    var pull_player=player_list[yourid];
    var pulled_player=player_list[InkOnlyCanvasNametoId[this.canvas.id]];
    console.log('x'+x);
    console.log('y'+y);
    console.log('canvasnametoid'+InkOnlyCanvasNametoId[this.canvas.id]);
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
        socket.emit('pull',yourid,pulled_player.id,pulled_card,pulled_card_idx);
        console.log('pullしました');
    }
}

// カードを移動させる
function move_card(event){
    if(startflag==0){return;}
    let canvas=this.canvas;
    var canvasrect = canvas.getBoundingClientRect();
    var x=(event.clientX-canvasrect.left)/canvas_scale_list[InkOnlyCanvasNametoId[this.canvas.id]];
    var y=(event.clientY-canvasrect.top)/canvas_scale_list[InkOnlyCanvasNametoId[this.canvas.id]];
    var moved_player=player_list[InkOnlyCanvasNametoId[canvas.id]];
    var moved_card=null;
    var moved_card_idx=null;
    if(moved_player.status=='pulled' && player_list[yourid].status=='pulled' || moved_player.status=='normal1' && player_list[yourid].status=='normal1'|| moved_player.status=='normal2' && player_list[yourid].status=='normal2'|| moved_player.status=='pull' && player_list[yourid].status=='pull'){//変更
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
        const mx=(event.clientX-canvasrect.left)/canvas_scale_list[InkOnlyCanvasNametoId[canvas.id]];
        const my=(event.clientY-canvasrect.top)/canvas_scale_list[InkOnlyCanvasNametoId[canvas.id]];
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

// カーソルに合わせて指を動かす
function move_cursor(event){
    let canvas=this.canvas;
    var canvasrect = canvas.getBoundingClientRect();
    var x=event.clientX-canvasrect.left;
    var y=event.clientY-canvasrect.top;
    var pull_player=player_list[yourid];
    var pulled_player=player_list[InkOnlyCanvasNametoId[canvas.id]];

    if(pull_player.status=='pull' && pulled_player.status=='pulled'){
        socket.emit('cursor',canvas.id,x,y);
    }
}

// カードリストを反転したものを取得
// 例）[heart5, club3, diamond10,spade7] -> [spade7, diamond10, club3, heart5]
function getReverseCardList(cardlist){
    var reverselist=[];
    for(var i=cardlist.length-1;i>=0;i--){
        reverselist.push(cardlist[i]);
    }
    return reverselist;
}
// 自分が入室したことがサーバに伝わった
socket.on('joined',(pid)=>{
    console.log('player '+pid+' Joined');
    yourid=pid;
    if(skyway_reconnect){
        promise_skyway = skyway_main();
    }
});
// プレイヤーの人数が少なくてゲームが始められなかった
socket.on('reject',()=>{
    StartMsg.innerHTML='There are few people!';
    wait_and_reset(5,1);
})
// ゲームがスタートした
socket.on('started',(player_num)=>{
    startflag=1;
    console.log('1にしました');
    if(skyway_reconnect){
        promise_skyway.then(HandDetection);
    }else{
        HandDetection();
    }
    StartMsg.innerHTML='';
    var win_msg_list=document.getElementsByClassName('win-msg');
    Object.values(win_msg_list).forEach((msg)=>{
        msg.innerHTML='';
        msg.zIndex=-1;
    });
    for(var i=1;i<=player_num;i++){
        const canvas=document.getElementById(InkOnlyCanvasIdtoName[i]);
        if(!eventlistener_exist[i]){
            // 諸々のイベントリスナーがまだ設定されていなければ設定する
            canvas.addEventListener('click',{
                handleEvent:choose_or_paint_card,
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
// 指定された秒数だけ待った後，startflagを0にする
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

// スペースキーでゲームを開始するためのリスナー
document.addEventListener('keydown', (event) => {
    if(event.keyCode==32 && startflag==0 && yourid!=null){
        socket.emit('start');
        startflag=1;
        StartMsg.innerHTML='';
    };
    // 使わない
    socket.emit('push');
});
// 使わない
socket.on('pushed',()=>{
    console.log('get return');
});

// カードが全てのプレイヤーに分配された
socket.on('distributed',(players)=>{
    console.log('Shuffled and Distributed cards');
    // 各プレイヤーのキャンバスにカードを描画
    Object.values(players).forEach((player,idx)=>{
            const canvas=document.getElementById(CanvasIdtoName[player.id]);
            const inkCanvas=document.getElementById(InkCanvasIdtoName[player.id]);
            const context=canvas.getContext('2d');
            const ink_ctx=inkCanvas.getContext('2d');
            var cardlist;
            context.clearRect(0, 0, canvas.width, canvas.height);
            if(player.id==yourid){
                context.fillStyle = "#990000";
                cardlist=player.cardlist;
            }else{
                context.fillStyle = "#004840";
                cardlist=getReverseCardList(player.cardlist);
            }
            //context.fillRect(0,0,canvas.width,canvas.height);
            cardlist.forEach((card)=>{
                const mark=card.mark;
                const number=card.number;
                draw_card(canvas.id,context,ink_ctx,card);
            });
    });
});

// ゲームが正常に終了した（勝敗がついた）
socket.on('finish',(players)=>{
    StartMsg.innerHTML='Finish!!';
    player_list={};
    inkFlag=0;
    inkButton.textContent='スキル';
    socket.emit('remove-interval', players);
    wait_and_reset(5,1);
});

// 各プレイヤーの情報およびカーソル位置に関する情報を取得（定期的に送られてくる）
// (プレイヤーのステータスやカードリストなど)
socket.on('location', (players,cursor) => {
    player_list=players;
    // console.log(players);
    // 各プレイヤーのキャンバスにカードを描画
    Object.values(players).forEach((player,idx)=>{
        if(player.status=='pulled' || player.status=='pull'||player.status=='normal1'|| player.status=='normal2'){//変更
            const canvas=document.getElementById(CanvasIdtoName[player.id]);
            const inkCanvas=document.getElementById(InkCanvasIdtoName[player.id]);
            const context=canvas.getContext('2d');
            const ink_ctx=inkCanvas.getContext('2d');
            var cardlist;
            context.clearRect(0, 0, canvas.width, canvas.height);
            ink_ctx.clearRect(0, 0, canvas.width, canvas.height);
            if(player.id==yourid){
                context.strokeStyle = "#990000";
                cardlist=player.cardlist;
            }else{
                context.strokeStyle = "#004840";
                cardlist=getReverseCardList(player.cardlist);
            }
            context.lineWidth=10;
            // context.strokeRect(0,0,canvas.width,canvas.height);
            cardlist.forEach((card)=>{
                const mark=card.mark;
                const number=card.number;
                draw_card(canvas.id,context,ink_ctx,card);
            });
            // プレイヤーのステータスがpulledならカーソルも描画
            if(player.status=='pulled' && cursor.x!=null && cursor.y!=null){
                const CursorImage=document.getElementById('cursor');
                ink_ctx.drawImage(CursorImage,cursor.x-10*canvas_scale_list[player.id],cursor.y,77*canvas_scale_list[player.id],105*canvas_scale_list[player.id]);
            }
            if(player.status=='pull'){
                StartMsg.innerHTML='Player'+player.id+'’s Turn';
            }
        }
        // プレイヤーのステータスがwinnerやloserなら勝敗メッセージを表示
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

// 4人以上のプレイヤーが入室した
socket.on('over-notice',()=>{
    StartMsg.innerHTML='Over capacity';
})

// プレイヤーの誰かが接続を切断した
socket.on('disconnected',()=>{
    console.log("disconnected");
    StartMsg.innerHTML='Someone disconnected';
    player_list={};
    inkFlag=0;
    inkButton.textContent='必殺技';
    socket.emit('remove-interval');
    wait_and_reset(5,1);
});
// ゲームが正常終了した後にルームを退室した
socket.on('leaved-after-finish',()=>{
    // 入室後にskywayに再接続するかどうか
    skyway_reconnect = false;
    // 手検出のインターバルをクリア
    if(detect_interval){
        console.log('手検出を停止');
        clearInterval(detect_interval);
    }
    //これまでと同じプレイヤーIDで再入室
    player_join(yourid);
    
})
// 誰かが途中で抜けてゲームが終了し，ルームを退出した
socket.on('leaved-after-disconnect',()=>{
    // 入室後にskywayに再接続するかどうか
    skyway_reconnect = true;
    // 手検出のインターバルをクリア
    if(detect_interval){
        console.log('手検出を停止');
        clearInterval(detect_interval);
    }
    // 再入室（プレイヤーIDはサーバ側で動的に割り当て）
    player_join();
})
//roomidがURLに設定されていない場合
socket.on('roomid-is-empty',()=>{
    alert('URLの末尾にルームIDを設定してください');
})