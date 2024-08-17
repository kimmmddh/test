/** 환경설정:모듈 불러오기 */
const express = require("express");
const controller = require("./chat.controller.js");
const path = require("path");
const socket = require("socket.io");

/** 환경설정:상수 경로 설정 */
//const __dirname = path.resolve();
const __chatdirname = path.join(__dirname, "/chat");

/** 환경설정:라우터 설정 */
const router = express.Router();

/** 메인 라우터 */
/** 메인 페이지 */
router.get("/", controller.viewIndex);
//router.use("/js", express.static(path.join(__dirname, "/chat/js")));

/** 모듈 내보내기 */
module.exports = router;
