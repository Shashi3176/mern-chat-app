const express = require("express");
const {
  registerUser,
  authUser,
  deleteUser,
  getMyAnonymousName,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(registerUser);
router.post("/login", authUser);
router.delete("/", protect, deleteUser);
router.get("/anonymous-name", protect, getMyAnonymousName);

module.exports = router;
