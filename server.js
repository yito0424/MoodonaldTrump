const express = require('express');
const http=require('http');
const path = require('path');
const socketIO = require('socket.io');
const redis = require("redis");
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const port=process.env.PORT || 3000
const util = require('util');
const { exit } = require('process');

const mark={
  1:'heart',
  2:'spade',
  3:'diamond',
  4:'club',
  5:'joker'
};
// トランプのカードの枚数
const ALL_CARD_NUM=53;
// プレイヤークラス（1人1人のプレイヤーに対応）
class Player{
  constructor(id){
    // プレイヤーが所持するカードのリスト
    this.cardlist=[];
    // プレイヤーID
    this.id=id;
    // プレイヤーのステータス
    this.status=null;
    // プレイヤーの順位
    this.rank=0;
  }
}

// プレイヤーの追加を排他的に行う（redisの更新不整合を防ぐ）
function executive_access(socket,redisClient,roomid,playerid=0){
  redisClient.watch(roomid,(watchError)=>{
    if(watchError)throw watchError;
    redisClient.get(roomid,(error, value) =>{
      if(error)throw error;
      var roomObject=JSON.parse(value);
      console.log(roomObject);
      roomObject.playerid++;
      roomObject.player_num++;
      var player;
      if(playerid){
        player=new Player(playerid);
      }
      else{
        player=new Player(roomObject.playerid);
        playerid = roomObject.playerid
      }
      console.log(roomObject);
      redisClient
      .multi()
      .set(roomid, JSON.stringify(roomObject))
      .set(get_room_key_hash(roomid, playerid), JSON.stringify(player))
      .exec((error,results)=>{
        if(error)throw error;
        console.log('results='+results);
        if(results==null){
          executive_access(socket,redisClient,roomid,playerid);
        }
        else{
          socket.emit('joined',playerid);
        }
      })
    });
  })
}
// 指定されたプレイヤーのカードリストから，指定されたインデックスのカードを引く
function pullcard(playerObject, pulled_card, pulled_card_idx){
  if(playerObject.cardlist[pulled_card_idx].mark == pulled_card.mark && 
    playerObject.cardlist[pulled_card_idx].number == pulled_card.number){
      playerObject.cardlist.splice(pulled_card_idx,1);
      return 1;
  }else{
    return 0;
  }
}
// 指定されたプレイヤーのカードリストに，指定されたカードを追加する
function addcard(playerObject,card){
  playerObject.cardlist.push(card);
}
// 指定されたプレイヤーに指定されたステータスを設定
function setstatus(playerObject,status){
  playerObject.status=status;
}

// カードクラス（1枚1枚のカードに対応）
class Card{
  constructor(mark,number){
    // カードのマーク
    this.mark=mark;
    // カードの数字
    this.number=number;
    // canvas上でのカードの位置（canvasの横幅を350としたとき）
    this.position={
      x:0,
      y:0
    };
    // カードにインクがかかっていた場合，インクがかけられた位置から
    // カードがどのくらい離れているか
    this.inkoffset={
      x:null,
      y:null,
      // インクをかけたプレイヤーのID
      id:null
    }
  }
}

// カードをシャッフルして各プレイヤーに配る
function shuffle_and_distribute(roomObject, player_list){
  let all_card=[]
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
  console.log(player_list);
  //distribute
  var dist_id=1;
  all_card.forEach((card)=>{
    card.position.x=50+Math.floor(((350-68)*player_list[dist_id].cardlist.length)/Math.floor(ALL_CARD_NUM/roomObject.player_num));
    card.position.y=100;
    distribute(player_list, dist_id, card);
    dist_id=dist_id%roomObject.player_num+1;
  });
  return all_card;
}

// カードリスト中の2枚のカードの位置をいれかえる
function shuffle(array, idx1, idx2) {
  const result = [...array];
  [result[idx1], result[idx2]] = [array[idx2], array[idx1]];
  return result;
}
// 指定したプレイヤーのカードリストに指定したカードを追加
function distribute(player_list, id, card){
  addcard(player_list[id],card);
}
// 指定したカードリストから数字が同じカードのペアを捨てる
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

function get_room_key_hash(roomid, key){
  return roomid+':'+key;
}
// クライアントがWebページに接続した
io.on('connection',function(socket){
  let roomObject;
  var playerid;
  var player_num;
  var winner_num;
  var player_id_list = [];
  let player_list;
  let player
  let timer;

  const redisClient=redis.createClient(process.env.REDIS_URL);
  // const promise_watch = util.promisify(redisClient.watch).bind(redisClient);
  // const promise_get = util.promisify(redisClient.get).bind(redisClient);

  // redisClient.del("sampleid");
  // const player1=new Player(1);
  // const player2=new Player(2);
  // redisClient.del([]);

  // redisClient.watch("sampleid",[1,3],()=>{
  //   redisClient.unwatch(()=>{
  //     const anotherClient=redis.createClient(process.env.REDIS_URL);
  //     anotherClient.set("sampleid","aaa",()=>{
  //       redisClient.multi()
  //       .set("sampleid","bbb")
  //       .exec((_,rs)=>{
  //         console.log(rs);
  //       })
  //     })
  //   })

  // })

  // redisClient.set("sampleid",JSON.stringify(player1),()=>{
  //   redisClient.get("sampleid",(err,value)=>{
  //     console.log("sampleidの全ての要素："+value);
  //     redisClient.watch("sampleid",(watchError)=>{
  //       const anotherClient=redis.createClient(process.env.REDIS_URL);
  //       anotherClient.get("sampleid", JSON.stringify(player1),()=>{
  //         redisClient.multi()
  //         .set("sampleid",JSON.stringify(player1))
  //         .exec((error,result)=>{
  //           console.log("exec_result"+result);
  //           console.log("error"+error);
  //           redisClient.get("sampleid",(_,value)=>{
  //             console.log(value);
  //           })
  //         })
  //       });
  //     })
  //   })
  // });
  // クライアントから入室の要求が送られてきた
  socket.on('join',(roomid,rejoin_id)=>{
    socket.join(roomid);
    //socket.removeAllListeners('start','pull','move','cursor','disconnect','remove-interval');
    console.log('1');
    if(rejoin_id){
      redisClient.get(roomid,(error,value)=>{
        executive_access(socket,redisClient,roomid,rejoin_id);
      })
    }
    else{
      io.to(roomid).clients(function(_, clients){
        if(clients.length==1){
          redisClient.exists(roomid,(error,value)=>{
            console.log(JSON.parse(value));
          })
          console.log('1人目');
          roomObject={};
          //初期化
          roomObject.playerid=1;
          roomObject.player_num=1;
          roomObject.winner_num=0;
          console.log('2');
          player=new Player(roomObject.playerid);
          roomObject.cursor={
            x:null,
            y:null
          }
          console.log('3');
          redisClient.mset(roomid, JSON.stringify(roomObject), get_room_key_hash(roomid, roomObject.playerid), JSON.stringify(player));
          socket.emit('joined',roomObject.playerid);
        }
        else if(clients.length<=4){
          console.log('2人目以降');
          console.log('------------');
          (function wait_until_room_creation(){
            redisClient.exists(roomid, (_, exist)=>{
              if(exist){
                console.log('ルームの存在確認');
                // redisClient.exists(get_room_key_hash(roomid,1),get_room_key_hash(roomid,2),get_room_key_hash(roomid,3),get_room_key_hash(roomid,4),(_,exists)=>{
                //   console.log('exists'+exists);
                //   var idlist = [];
                //   for(var i=1;i<=exists;i++){
                //     idlist.push(get_room_key_hash(roomid,i));
                //   }
                //   redisClient.mget(idlist,(_,results)=>{
                //     console.log(results);
                //   })
                // })
                executive_access(socket,redisClient,roomid);
              }
              else{
                setTimeout(wait_until_room_creation(), 200)
              }
            })
          }());
        }
        else{
          socket.leave(roomid);
          socket.emit('over-notice');
          return;
        }
      });
    }

    //スタート時にリスナーをセット（pull, move, cursor, shot）
    console.log('リスナーをセット');
    // ゲームスタートの要求が送られてきた
    socket.on('start',(config)=>{
      redisClient.watch(roomid, (_, watchError)=>{
        redisClient.get(roomid,(_, value) =>{
          roomObject=JSON.parse(value);
          playerid=roomObject.playerid;
          player_num=roomObject.player_num;
          winner_num=roomObject.winner_num;
          player_id_list = [];
          player_list = {}
          player_id_data_list = [];
          for(var i=1;i<=player_num;i++){
            player_id_list.push(get_room_key_hash(roomid,i));
          }
          redisClient.mget(player_id_list, (_, values)=>{
            values.forEach((value, idx)=>{
              player_list[idx+1] = JSON.parse(value);
            })
            // 現時点でのプレイヤーの人数が2人に満たなければゲームをスタートしない
            if(player_num<2){
              io.to(roomid).emit('reject');
              return;
            }
            shuffle_and_distribute(roomObject, player_list);
            // 分配されたカードで既に数が揃っているものがあれば捨てておく
            Object.values(player_list).forEach((player)=>{
              console.log('player Changed');
              player.cardlist=throw_cards(player.cardlist);
            });
            // カード分配が終了したことおよび各プレイヤーの初期カード情報を
            // クライアントに伝える
            io.to(roomid).emit('distributed',player_list);
            // 各プレイヤーの初期ステータスを設定
            for(var i=1;i<=player_num;i++){
              if(i==1){ player_list[i].status='pulled';}
              else if(i==2){ player_list[i].status='pull';}
              else if(i==3){ player_list[i].status='normal1';}//変更
              else{ player_list[i].status='normal2';}
            }
            // ゲームがスタートしたことをクライアントに伝える
            io.to(roomid).emit('started',player_num);
            // 使わない
            socket.on('push',()=>{
              io.sockets.emit('pushed');
            });
            if(player_id_data_list.length == 0){
              player_id_list.forEach((pid, idx)=>{
                player_id_data_list.push(pid);
                player_id_data_list.push(JSON.stringify(player_list[idx+1]));
              })
            }else{
              player_id_list.forEach((pid, idx)=>{
                player_id_data_list[2*idx+1] == JSON.stringify(player_list[idx+1]);
              })
            }
            redisClient.multi()
            .set(roomid, JSON.stringify(roomObject))
            .mset(player_id_data_list)
            .exec((error,results)=>{
              if(results){
                // 定期的に各プレイヤーのカードリストとカーソルの位置情報を
                // クライアントに伝えるためのインターバルを設定
                timer=setInterval(()=>{
                  redisClient.multi()
                  .get(roomid)
                  .mget(player_id_list)
                  .exec((error, results)=>{
                    if(results){
                        roomObject=JSON.parse(results[0]);
                        results[1].forEach((value, idx)=>{
                          player_list[idx+1] = JSON.parse(value);
                        })
                        if(roomObject){
                          io.to(roomid).emit('location',player_list,roomObject.cursor);
                        }                      
                    }
                  })
                  // redisClient.get(roomid,(error,value)=>{
                  // });
                },1000/60);
              }
            })
          });
        });
      })
    });     
    //カードが引かれたとき
    socket.on('pull',(pull_player_id,pulled_player_id,pulled_card,pulled_card_idx)=>{
      console.log('pullされました');
      redisClient.watch(roomid, player_id_list, (watchError)=>{
        redisClient.get(roomid,(_, value) =>{
          var roomObject=JSON.parse(value);
          var playerid=roomObject.playerid;
          var player_num=roomObject.player_num;
          var winner_num=roomObject.winner_num;
          cursor=roomObject.cursor;
          cursor.x=null;
          cursor.y=null;
          var player_list = {}
          var player_id_data_list = []
          if(player_id_list.length == 0){
            for(var i=1;i<=player_num;i++){
              player_id_list.push(get_room_key_hash(roomid,i));
            }
          }
          redisClient.watch(player_id_list, ()=>{
            redisClient.mget(player_id_list, (_,values)=>{
              for(var i=0;i<player_num;++i){
                player_list[i+1] = JSON.parse(values[i]);
              }
              var pull_player = player_list[pull_player_id];
              var pulled_player = player_list[pulled_player_id];
              // カードを引く
              console.log("引かれたカード")
              console.log(pulled_card)
              const pull_result = pullcard(pulled_player, pulled_card, pulled_card_idx);
              if(!pull_result){
                redisClient.unwatch();
                return;
              }
              // 引いたカードを手札に追加
              addcard(pull_player,pulled_card);
              // 数字が揃ったらカードを捨てる
              pull_player.cardlist=throw_cards(pull_player.cardlist);
              io.to(roomid).emit('location',player_list,cursor);
              //check and set status winner
              // カードリストが空になったらプレイヤーのステータスをwinnerに変更
              if(pulled_player.cardlist.length==0){
                roomObject.winner_num++;
                pulled_player.status='winner';
                pulled_player.rank=roomObject.winner_num;
              }
              if(pull_player.cardlist.length==0){
                roomObject.winner_num++;
                pull_player.status='winner';
                pull_player.rank=roomObject.winner_num;
              }
              // 勝者が出たことによる各プレイヤーのステータス調整
              if(roomObject.winner_num<player_num-1){
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
                    }else if(count==2){//変更
                      player_list[(pulled_player_id+i)%player_num+1].status='normal1';
                      count++;
                    }else{
                      player_list[(pulled_player_id+i)%player_num+1].status='normal2';
                    }
                  }
                }
                player_id_list.forEach((pid, idx)=>{
                  player_id_data_list.push(pid);
                  player_id_data_list.push(JSON.stringify(player_list[idx+1]));
                })
                console.log(player_id_data_list)
                redisClient
                .multi()
                .set(roomid, JSON.stringify(roomObject))
                .mset(player_id_data_list)
                .exec((error,results)=>{
                  if(results==null){
                    console.log('pullの処理中にデータが更新されました');
                  }
                })
              }else{
                // 完全に勝敗がついた
                for(var i=1;i<=player_num;i++){
                  if(player_list[(pulled_player_id+i)%player_num+1].status!='winner'){
                    player_list[(pulled_player_id+i)%player_num+1].status='loser';
                  }
                }
                io.to(roomid).emit('location',player_list,cursor);
                if(timer){
                  clearInterval(timer);
                  console.log('インターバルをクリア');
                }
                // ルームの情報を初期化
                player_list={};
                player_id_data_list = []
                roomObject.playerid=0;
                roomObject.player_num=0;
                roomObject.winner_num=0;
                redisClient
                .multi()
                .set(roomid, JSON.stringify(roomObject))
                .del(player_id_list)
                .exec((error,results)=>{
                  if(results==null){
                    console.log('pullの処理中にデータが更新されました');
                  }else{
                    player_id_list = [];
                    var leaved_socket_list=[];
                    // 各プレイヤーを一度ルームから退出させる
                    // リスナーも一旦全部クリア
                    Object.values(io.to(roomid).sockets).forEach((socket)=>{
                      if(socket.rooms[roomid]){
                        socket.removeAllListeners('start');
                        socket.removeAllListeners('pull');
                        socket.removeAllListeners('move');
                        socket.removeAllListeners('cursor');
                        socket.removeAllListeners('disconnect');
                        socket.removeAllListeners('shot');
                        socket.removeAllListeners('card_shotted');
                        socket.emit('finish');
                        socket.leave(roomid);
                        leaved_socket_list.push(socket);
                      }
                    });
                    // 正常にゲームが終了し，退出処理がおこなわれたことを通知
                    leaved_socket_list.forEach((socket)=>{
                      socket.emit('leaved-after-finish');
                    })
                  }
                })           
              }
            })
          })
        // redisClient.mget(roomid,player_id_list,(_,values)=>{
        //   roomObject=JSON.parse(values[0]);
        //   playerid=roomObject.playerid;
        //   player_num=roomObject.player_num;
        //   winner_num=roomObject.winner_num;
        //   cursor=roomObject.cursor;
        //   cursor.x=null;
        //   cursor.y=null;
        //   player_list={}
          console.log('winner num===='+roomObject.winner_num);
        });
      });
    });
    //カードが動かされたとき
    socket.on('move',(moved_player_id,moved_card,moved_card_idx)=>{
      var moved_player;
      redisClient.watch(get_room_key_hash(roomid, moved_player_id), ()=>{
        redisClient.get(get_room_key_hash(roomid, moved_player_id), (_, value)=>{
          moved_player = JSON.parse(value);
          if(moved_card_idx >= moved_player.cardlist.length){
            // カードをホールドしている最中にそのカードが引かれた
            socket.emit('held-card-pulled');
            return;
          }
          if(moved_player.cardlist[moved_card_idx].mark == moved_card.mark &&
            moved_player.cardlist[moved_card_idx].number == moved_card.number){
            pullcard(moved_player, moved_card, moved_card_idx);
            addcard(moved_player, moved_card);
            redisClient.multi()
            .set(get_room_key_hash(roomid, moved_player_id), JSON.stringify(moved_player))
            .exec((_, results)=>{
              if(results == null){
                console.log("moveの処理中にデータが更新されました")
              }
            })
          }
        })
      })
    });
    //キャンバス上にカーソルがきたとき
    socket.on('cursor',(id,x,y)=>{
      redisClient.watch(roomid, ()=>{
        redisClient.get(roomid,(_,value)=>{
          var roomObject=JSON.parse(value);
          roomObject.cursor.x=x;
          roomObject.cursor.y=y;
          redisClient.multi()
          .set(roomid,JSON.stringify(roomObject))
          .exec((_, results)=>{
            if(results == null){
              console.log("cursorの処理中にデータが更新されました");
            }
          })
        });
      })
    });

    //インクがとばされたとき
    socket.on('shot',(shot_id,shotted_id,x,y)=>{
      io.to(roomid).emit('shotted',shot_id,shotted_id,x,y);
      setTimeout(function remove_ink(){ 
        redisClient.get(roomid,(_,value)=>{
          roomObject = JSON.parse(value)
          player_num = roomObject.player_num
          var player_list ={};
          var player_id_data_list = [];
          if(player_id_list.length == 0){
            for(var i=1;i<=player_num;i++){
              player_id_list.push(get_room_key_hash(roomid,i));
            }
          }
          redisClient.watch(player_id_list, ()=>{
            redisClient.mget(player_id_list,(_,values)=>{
              for(var i=0;i<player_num;++i){
                player_list[i+1] = JSON.parse(values[i]);
              }
              for (var i=1;i<=player_num;i++){
                for(var j=0;j<player_list[i].cardlist.length;j++){
                  if(player_list[i].cardlist[j].inkoffset.id==shot_id){
                    player_list[i].cardlist[j].inkoffset.x=null;
                    player_list[i].cardlist[j].inkoffset.y=null;
                    player_list[i].cardlist[j].inkoffset.id=null;
                  }
                }
              }
              player_id_list.forEach((pid, idx)=>{
                player_id_data_list.push(pid);
                player_id_data_list.push(JSON.stringify(player_list[idx+1]));
              })
              redisClient.multi()
              .mset(roomid,JSON.stringify(roomObject))
              .exec((_, results)=>{
                if(results == null){
                  // リトライの処理
                  remove_ink();
                }
              });
            });
          })
        })
      },20000);
    })

    //インクがカードにかかったとき
    socket.on('card_shotted',(shotted_id,shotted_card_list,shotted_card_idx_list)=>{
      console.log("card_shotted");
      redisClient.get(get_room_key_hash(roomid, shotted_id),(_,value)=>{
        var shotted_player=JSON.parse(value);
        shotted_card_list.forEach((shotted_card,idx)=>{
          var card_idx=shotted_card_idx_list[idx];
          shotted_player.cardlist[card_idx]=shotted_card;
        })
        redisClient.set(get_room_key_hash(roomid, shotted_id),JSON.stringify(shotted_player));
      });
    })

    // 誰かがサーバとの接続を切断したとき
    socket.on('disconnect',()=>{
      if(timer){
        clearInterval(timer);
        console.log('インターバルをクリア');
      }
      redisClient.multi()
      .del(roomid)
      .del(player_id_list)
      .exec(()=>{
        var leaved_socket_list=[]
        // 各プレイヤーを一度ルームから退出させる
        // リスナーも一旦全部クリア
        Object.values(io.to(roomid).sockets).forEach((socket)=>{
          console.log("removeする？");
          if(socket.rooms[roomid]){
            console.log("yes");
            socket.removeAllListeners('start');
            socket.removeAllListeners('pull');
            socket.removeAllListeners('move');
            socket.removeAllListeners('cursor');
            socket.removeAllListeners('shot');
            socket.removeAllListeners('card_shotted');
            socket.removeAllListeners('disconnect');
            socket.emit('disconnected');
            socket.leave(roomid);
            leaved_socket_list.push(socket);
          }
        });
        // 誰かが途中で抜けてゲームが終了し，ルームを退出したことを通知
        leaved_socket_list.forEach((socket)=>{
          socket.emit('leaved-after-disconnect');
        })
        socket.removeAllListeners('remove-interval');
        console.log('disconnected');
      })

    });
    socket.on('remove-interval',()=>{
      if(timer){
        clearInterval(timer);
        console.log('インターバルをクリア');
      }
      socket.removeAllListeners('remove-interval');
    })
  });
});

app.use('/static', express.static(__dirname + '/static'));
app.use('/skyway', express.static(__dirname + '/skyway'));
app.use('/mmd', express.static(__dirname + '/mmd'));

app.get('/', (req, res) => {
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  res.sendFile(path.join(__dirname, '/static/index.html'));
});

app.post('/', (req,res)=>{
  console.log(req.headers);
})

var getInformations = function(request){
	return {
		'リクエスト情報':{
			'データ送信':request.method,
			'ホスト（ヘッダー情報）':request.headers['host'],
			'コネクション（ヘッダー情報）':request.headers['connection'],
			'キャッシュコントロール（ヘッダー情報）':request.headers['cache-control'],
			'アクセプト（ヘッダー情報）':request.headers['accept'],
			'アップグレードリクエスト（ヘッダー情報）':request.headers['upgrade-insecure-requests'],
			'ユーザーエージェント（ヘッダー情報）':request.headers['user-agent'],
			'エンコード（ヘッダー情報）':request.headers['accept-encoding'],
			'言語（ヘッダー情報）':request.headers['accept-language'],
		}
	};
};

server.listen(process.env.PORT || 3000, () => {
    console.log("Starting server on port"+port);
});