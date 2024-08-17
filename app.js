const express = require("express");
const helmet = require("helmet");
const path = require("path");
const socket = require("socket.io");

const 방정보 = {}; // 방 정보를 저장할 객체
const app = express();
const server = require("http").createServer(app); // Express 서버 생성
const io = socket(server); // Socket.IO 서버 초기화
const chatRouter = require("./chat/js/chat"); // 채팅 라우터 불러오기
app.use("/", chatRouter); // 기본 경로에 채팅 라우터 사용

// 클라이언트와의 연결 처리
io.on("connection", (socket) => {
  let PC; // RTCPeerConnection 객체
  let dataChannel; // 데이터 채널 객체
  let 방번호; // 현재 방 번호

  // 방에 접속할 때 호출되는 이벤트
  socket.on("방접속", (방번호Param) => {
    방번호 = 방번호Param; // 방 번호 설정

    // 방 정보가 이미 존재하는 경우
    if (방정보[방번호]) {
      const len = 방정보[방번호].length; // 현재 방 인원 수 확인
      if (len >= 2) {
        socket.emit("방인원초과"); // 인원이 초과하면 경고 메시지 전송
        return;
      } else {
        방정보[방번호].push({ id: socket.id }); // 방에 사용자 추가
      }
    } else {
      방정보[방번호] = [{ id: socket.id }]; // 새로운 방 생성
    }

    // 나를 제외한 사용자 목록 전송
    const 나를제외한사용자 = 방정보[방번호].filter(
      (사용자) => 사용자.id !== socket.id
    );
    socket.emit("유저체크", 나를제외한사용자); // 클라이언트에 사용자 목록 전송

    // RTCPeerConnection 객체 생성
    PC = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // ICE 서버 설정
    });

    // ICE 후보가 발견될 때 호출되는 이벤트
    PC.onicecandidate = (event) => {
      if (event.candidate) {
        socket.broadcast.to(방번호).emit("candidate", event.candidate); // 후보를 다른 사용자에게 전송
      }
    };

    createDataChannel(); // 데이터 채널 생성
    createOffer(); // 오퍼 생성
  });

  // 데이터 채널 생성 함수
  function createDataChannel() {
    dataChannel = PC.createDataChannel("chat"); // 데이터 채널 생성

    // 메시지를 수신할 때 호출되는 이벤트
    dataChannel.onmessage = (event) => {
      console.log("받은 메시지:", event.data); // 수신된 메시지 출력
      socket.broadcast.to(방번호).emit("message", event.data); // 다른 사용자에게 메시지 전송
    };

    // 데이터 채널이 열렸을 때 호출되는 이벤트
    dataChannel.onopen = () => {
      console.log("데이터 채널이 열렸습니다."); // 데이터 채널 열림 알림
      socket.emit("dataChannelOpen"); // 클라이언트에 데이터 채널 열림 알림
    };

    // 데이터 채널이 닫혔을 때 호출되는 이벤트
    dataChannel.onclose = () => {
      console.log("데이터 채널이 닫혔습니다."); // 데이터 채널 닫힘 알림
    };
  }

  // 오퍼 생성 함수
  function createOffer() {
    PC.createOffer()
      .then((offer) => PC.setLocalDescription(offer)) // 로컬 설명 설정
      .then(() => {
        socket.emit("offer", PC.localDescription); // 오퍼를 클라이언트에 전송
      })
      .catch((error) => console.error("오퍼 생성 오류:", error)); // 오류 처리
  }

  // 클라이언트로부터 오퍼 수신
  socket.on("offer", (offer) => {
    PC.setRemoteDescription(offer) // 원격 설명 설정
      .then(() => PC.createAnswer()) // 응답 생성
      .then((answer) => PC.setLocalDescription(answer)) // 로컬 설명 설정
      .then(() => {
        socket.emit("answer", PC.localDescription); // 응답을 클라이언트에 전송
      })
      .catch((error) => console.error("엔서 생성 오류:", error)); // 오류 처리
  });

  // ICE 후보 수신
  socket.on("candidate", (candidate) => {
    PC.addIceCandidate(candidate).catch(
      (error) => console.error("ICE 후보 추가 오류:", error) // 후보 추가 오류 처리
    );
  });

  // 메시지 전송 이벤트
  socket.on("sendMessage", (message) => {
    sendMessage(message); // 메시지 전송 함수 호출
  });

  // 메시지 전송 함수
  function sendMessage(message) {
    if (dataChannel) {
      if (dataChannel.readyState === "open") {
        dataChannel.send(message); // 데이터 채널을 통해 메시지 전송
        console.log("보낸 메시지:", message); // 전송된 메시지 출력
        socket.broadcast.to(방번호).emit("message", message); // 다른 사용자에게 메시지 전송
      } else {
        console.log("데이터 채널이 열리지 않았습니다."); // 데이터 채널이 닫혀있을 때 알림
      }
    } else {
      console.log("데이터 채널이 존재하지 않습니다."); // 데이터 채널이 없을 때 알림
    }
  }

  // 클라이언트가 연결을 끊었을 때
  socket.on("disconnect", () => {
    if (방정보[방번호]) {
      방정보[방번호] = 방정보[방번호].filter(
        (사용자) => 사용자.id !== socket.id // 현재 클라이언트를 방에서 제거
      );
      if (방정보[방번호].length === 0) {
        delete 방정보[방번호]; // 방이 비어있으면 방 삭제
      }
    }
  });
});

// 서버 포트 설정 및 실행
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
