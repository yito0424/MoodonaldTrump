const express = require('express');
const http=require('http');
const path = require('path');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);

var playerid=0;
var player_num=0;
var winner_num=0;
var player_list={}
var cursor={
  x:null,
  y:null
}
const ALL_CARD_NUM=53;
class Player{
  constructor(id){
    this.cardlist=[];
    this.id=id;
    this.status=null;
    this.rank=0;
  }
  pullcard(pulled_card_idx){
      this.cardlist.splice(pulled_card_idx,1);
  }
  addcard(card){
    this.cardlist.push(card);
  }
  setstatus(status){
    this.status=status;
  }
}

class Card{
  constructor(mark,number){
    this.mark=mark;
    this.number=number;
    this.position={
      x:0,
      y:0
    };
  }
}

function shuffle_and_distribute(){
  let all_card=[]
  const mark={
    1:'heart',
    2:'spade',
    3:'diamond',
    4:'club',
    5:'joker'
  };
  for(var num=1;num<=13;num++){
    for(mk=1;mk<=4;mk++){
      const card=new Card(mark[mk],num);
      all_card.push(card);
    }
  }
  const card=new Card(mark[5],14);
  all_card.push(card);
  //shuffle
  for(var time=0;time<200;time++){
    const idx1=Math.floor( Math.random() * ALL_CARD_NUM );
    const idx2=Math.floor( Math.random() * ALL_CARD_NUM );
    all_card=shuffle(all_card,idx1,idx2);
  }
  //distribute
  var dist_id=1;
  all_card.forEach((card)=>{
    card.position.x=50+Math.floor(((350-68)*player_list[dist_id].cardlist.length)/Math.floor(ALL_CARD_NUM/player_num));
    card.position.y=100;
    distribute(dist_id,card);
    dist_id=dist_id%player_num+1;
  });
  return all_card;
}

function shuffle(array, idx1, idx2) {
  const result = [...array];
  [result[idx1], result[idx2]] = [array[idx2], array[idx1]];
  return result;
}

function distribute(id,card){
  player_list[id].addcard(card);
}

function throw_cards(cardlist){
  var after_cardlist=Array.from(cardlist);
  var redunduncy_checker={};
  cardlist.forEach((card,idx)=>{
    if(typeof redunduncy_checker[card.number]=='undefined'){
      redunduncy_checker[card.number]=idx;
    }else{
      delete after_cardlist[idx];
      delete after_cardlist[redunduncy_checker[card.number]];
      delete redunduncy_checker[card.number];
    }
  });
  after_cardlist=after_cardlist.filter((value)=>{
    return typeof value!=undefined;
  });
  return after_cardlist;
}

io.on('connection',function(socket){
  let player=null;
  socket.on('join',(config)=>{
    playerid++;
    player_num++;
    player=new Player(playerid);
    player_list[playerid]=player;
    socket.emit('joined',playerid);
  });
  socket.on('start',(config)=>{
    if(player_num<2){
      socket.emit('reject');
      return;
    }
    shuffle_and_distribute();
    Object.values(player_list).forEach((player)=>{
      console.log('player Changed');
      player.cardlist=throw_cards(player.cardlist);
    });
    io.sockets.emit('distributed',player_list);

    for(var i=1;i<=player_num;i++){
      if(i==1){player_list[i].status='pulled';}
      else if(i==2){ player_list[i].status='pull';}
      else{player_list[i].status='normal';}
    }
    io.sockets.emit('started',player_num);
  });
  socket.on('pull',(pull_player_id,pulled_card,pulled_card_idx)=>{
    var pulled_player_id;

    cursor.x=null;
    cursor.y=null;
    
    Object.values(player_list).forEach((player)=>{
      if(player.status=='pulled'){
        pulled_player_id=player.id;
      }
    });
    player_list[pulled_player_id].pullcard(pulled_card_idx);
    player_list[pull_player_id].addcard(pulled_card);
    player_list[pull_player_id].cardlist=throw_cards(player_list[pull_player_id].cardlist);
    io.sockets.emit('location',player_list,cursor);

    //check and set status winner
    if(player_list[pulled_player_id].cardlist.length==0){
      winner_num++;
      console.log('winnernum '+winner_num);
      player_list[pulled_player_id].status='winner';
      player_list[pulled_player_id].rank=winner_num;
    }
    if(player_list[pull_player_id].cardlist.length==0){
      winner_num++;
      console.log('winnernum '+winner_num);
      player_list[pull_player_id].status='winner';
      player_list[pull_player_id].rank=winner_num;
    }
    if(winner_num<player_num-1){
      var count=0;
      for(var i=0;i<player_num;i++){
        if(player_list[(pulled_player_id+i)%player_num+1].status!='winner'){
          console.log(count);
          if(count==0){
            player_list[(pulled_player_id+i)%player_num+1].status='pulled';
            count++;
          }else if(count==1){
            player_list[(pulled_player_id+i)%player_num+1].status='pull';
            count++;
          }else{
            player_list[(pulled_player_id+i)%player_num+1].status='normal';
          }
        }
      }
    }else{
      for(var i=1;i<=player_num;i++){
        if(player_list[(pulled_player_id+i)%player_num+1].status!='winner'){
          player_list[(pulled_player_id+i)%player_num+1].status='loser';
        }
      }
      io.sockets.emit('location',player_list,cursor);
      io.sockets.emit('finish');
      player_list={};
      player_num=0;
      playerid=0;
      winner_num=0;
    }
  });
  socket.on('move',(pulled_player_id,moved_card,moved_card_idx)=>{
    player_list[pulled_player_id].pullcard(moved_card_idx);
    player_list[pulled_player_id].addcard(moved_card);
  });
  socket.on('cursor',(id,x,y)=>{
    cursor.x=x;
    cursor.y=y;
  })
  socket.on('disconnect',()=>{
    player_list={};
    player_num=0;
    playerid=0;
    winner_num=0;
    console.log('disconnected');
    io.sockets.emit('disconnected');
  });
});

setInterval(()=>{
  io.sockets.emit('location',player_list,cursor);
},1000/30);

app.use('/static', express.static(__dirname + '/static'));
app.use('/skyway', express.static(__dirname + '/skyway'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/static/index.html'));
});

server.listen(3000, () => {
    console.log("Starting server on port 3000!");
});