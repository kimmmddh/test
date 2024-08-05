const express = require("express"); //require를 사용해 express라이브러리를 불러옴(웹 서버 만들기 위해)
const helmet = require("helmet");
const path = require("path"); //path는 파일 경로 쉽게 다루게 해줌
const socket = require("socket.io"); //실시간 통신

const 방정보 = {}; //방정보를 저장하는 객체
const app = express(); //express앱 생성하고, app이라는 변수에 저장
const server = require("http").createServer(app); // HTTP 서버 생성(웹 서버 만들기 위해)
const io = socket(server); // socket.io와 HTTP 서버 연결

app.use(helmet()); // helmet는 보안을 위해..

app.use(express.static(path.join(__dirname, "chat"))); // chat폴더 안에 있는 정적 파일 제공
app.use(express.static("chat"));
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
  next();
});

// WebSocket 연결
io.on("connection", (socket) => {
  let PC; //사용자 간의 연결 관리할 변수
  let dataChannel; //데이터 채널 저장할 변수
  let 방번호; //방번호 저장할 변수

  //사용자 접속하면 실행
  socket.on("방접속", (방번호Param) => {
    방번호 = 방번호Param; //접속한 방 번호 저장

    //이미 방이 존재하는 경우
    if (방정보[방번호]) {
      const len = 방정보[방번호].length; //방에 있는 사용자 수 확인
      if (len >= 2) {
        socket.emit("방인원초과");
        return;
      } else {
        방정보[방번호].push({ id: socket.id }); //방에 사용자 추가
      }
    } else {
      //방이 처음 만들어진 경우
      방정보[방번호] = [{ id: socket.id }]; //새 방 만들고 사용자 추가
    }

    //나를 제외한 사용자 목록 가져옴
    const 나를제외한사용자 = 방정보[방번호].filter(
      (사용자) => 사용자.id !== socket.id
    );
    socket.emit("유저체크", 나를제외한사용자); //목록을 나(?)에게 보냄

    // RTCPeerConnection 및 데이터 채널 초기화
    PC = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // STUN 서버를 사용해, NAT 통신
    });

    createDataChannel(); //함수 호출
    createOffer();
  });

  function createDataChannel() {
    //메시지 주고 받을 수 있게 해주는 함수
    dataChannel = PC.createDataChannel("chat"); //chat이라는 데이터 채널 생성

    dataChannel.onmessage = (event) => {
      console.log("받은 메시지:", event.data);
      // 받은 메시지를 방의 다른 사용자에게 전송
      socket.broadcast.to(방번호).emit("message", event.data);
    };

    dataChannel.onopen = () => {
      console.log("데이터 채널이 열렸습니다.");
    };
  }

  function createOffer() {
    //연결 시작하는데 필요한 함수
    PC.createOffer() //오퍼 생성(연결 설정 위한 초기 메시지?)
      .then((offer) => PC.setLocalDescription(offer))
      .then(() => {
        socket.emit("offer", PC.localDescription); //사용자에게 오퍼 보냄
      })
      .catch((error) => console.error("오퍼 생성 오류:", error));
  }

  //사용자가 보낸 오퍼 처리
  socket.on("offer", (offer) => {
    PC.setRemoteDescription(offer) //보낸 오퍼를 원격설명으로 설정(?)
      .then(() => PC.createAnswer()) //응답 생성
      .then((answer) => PC.setLocalDescription(answer)) //응답을 로컬 설명으로 설정
      .then(() => {
        socket.emit("answer", PC.localDescription); //사용자에게 응답 보냄
      })
      .catch((error) => console.error("엔서 생성 오류:", error));
  });

  //사용자가 보낸 ice후보 처리
  socket.on("candidate", (candidate) => {
    PC.addIceCandidate(candidate).catch(
      (
        error //ice후보 추가
      ) => console.error("ICE 후보 추가 오류:", error)
    );
  });

  //ice후보가 있을 경우
  PC.onicecandidate = (event) => {
    if (event.candidate) {
      // ICE 후보를 방의 모든 사용자에게 전송
      socket.broadcast.to(방번호).emit("candidate", event.candidate);
    }
  };

  //메시지 보냄
  socket.on("sendMessage", (message) => {
    sendMessage(message);
  });

  //메시지 보내는 함수
  function sendMessage(message) {
    if (dataChannel && dataChannel.readyState === "open") {
      //데이터 채널 열려 있는 경우
      dataChannel.send(message); //데이터 채널로 메시지 보냄
      console.log("보낸 메시지:", message);
      // 보낸 메시지를 방의 다른 사용자에게 전송
      socket.broadcast.to(방번호).emit("message", message);
    }
  }

  //사용자가 연결 끊을 때
  socket.on("disconnect", () => {
    if (방정보[방번호]) {
      //방 정보 존재시
      방정보[방번호] = 방정보[방번호].filter(
        (사용자) => 사용자.id !== socket.id //연결이 끊어진 사용자를 방에서 제거함
      );
      if (방정보[방번호].length === 0) {
        //사용자 없는 경우
        delete 방정보[방번호]; //방 삭제
      }
    }
  });
});

const PORT = 3000;
// 서버 실행
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
