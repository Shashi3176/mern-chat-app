const express = require("express");
const {
  requestRandomChat,
  cancelRandomChat,
  getRandomChatStatus,
} = require("../controllers/matchmakingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/random-chat").post(protect, requestRandomChat);
router.route("/random-chat/cancel").post(protect, cancelRandomChat);
router.route("/random-chat/status").get(protect, getRandomChatStatus);

module.exports = router;