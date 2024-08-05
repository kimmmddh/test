const express = require("express");
const http = require("http"); // HTTP 서버를 만들기 위해
const socketIo = require("socket.io");

const app = express();
// HTTP 서버 생성, Express 앱을 사용
const server = http.createServer(app);
const io = socketIo(server);

//정적 파일 제공
app.use(express.static("chat"));

// 소켓 연결 처리
io.on("connection", (socket) => {
  console.log("A user connected");

  // 신호 메시지 처리
  socket.on("signal", (data) => {
    // 같은 방 사용자에게 신호 메시지 전송
    io.to(data.room).emit("signal", {
      signal: data.signal, // 전달받은 신호 데이터
      id: socket.id, // 현재 소켓의 ID
    });
  });

  // 방접속 이벤트 처리
  socket.on("join", (roomName) => {
    socket.join(roomName); // 사용자를 지정된 방에 추가
    console.log(`User joined room: ${roomName}`);
  });

  // 사용자 연결이 끊어질 때 처리
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(3000, () => {
  console.log("서버가 http://localhost:3000 에서 실행 중입니다.");
});
