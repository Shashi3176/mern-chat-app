const express = require("express");
const {
  createPublicRoom,
  listPublicRooms,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  getRoomMessages,
} = require("../controllers/roomControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/public").post(protect, createPublicRoom);
router.route("/public").get(protect, listPublicRooms);
router.route("/join").post(protect, joinRoom);
router.route("/leave").post(protect, leaveRoom);
router.route("/:roomId/participants").get(protect, getRoomParticipants);
router.route("/:roomId/messages").get(protect, getRoomMessages);

module.exports = router;