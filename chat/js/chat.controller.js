/** 환경설정:모듈 불러오기 */
const { log } = require("console");
const path = require("path");

/** 환경설정:상수 경로 설정 */
//const __dirname = path.resolve();
const __chatdirname = path.join(__dirname, "/chat");

/** 메인 모듈 */
function viewIndex(req, res) {
  res.sendFile(path.join(__dirname, "..", "/index.html"));
}

/** 모듈 내보내기 */
module.exports = { viewIndex };
