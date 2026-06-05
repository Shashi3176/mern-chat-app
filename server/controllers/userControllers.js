const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const AnonymousName = require("../models/anonymousNameModel");
const generateToken = require("../config/generateToken");

const assignAnonymousName = async (user) => {
  const availableName = await AnonymousName.findOneAndUpdate(
    { isAvailable: true },
    { isAvailable: false, assignedTo: user._id },
    { sort: { createdAt: 1 }, new: true }
  );
  if (!availableName) {
    throw new Error("Anonymous name pool is empty");
  }
  await User.findByIdAndUpdate(user._id, {
    anonymousName: availableName._id,
  });
  return availableName;
};

const releaseAnonymousName = async (userId) => {
  const user = await User.findById(userId).populate("anonymousName");
  if (!user || !user.anonymousName) {
    return;
  }
  const anonNameId = user.anonymousName._id;
  await User.findByIdAndUpdate(user._id, {
    anonymousName: null,
  });
  await AnonymousName.findByIdAndUpdate(anonNameId, {
    isAvailable: true,
    assignedTo: null,
  });
};

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Fields");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    email,
    password,
  });

  if (user) {
    const assignedName = await assignAnonymousName(user);

    res.status(201).json({
      _id: user._id,
      token: generateToken(user._id),
      anonymousName: assignedName.name,
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate("anonymousName");

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      token: generateToken(user._id),
      anonymousName: user.anonymousName ? user.anonymousName.name : null,
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

//@description     Delete user account
//@route           DELETE /api/user/
//@access          Private
const deleteUser = asyncHandler(async (req, res) => {
  await releaseAnonymousName(req.user._id);
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "User deleted successfully" });
});

//@description     Get current user's anonymous name
//@route           GET /api/user/anonymous-name
//@access          Private
const getMyAnonymousName = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("anonymousName");
  if (!user || !user.anonymousName) {
    res.status(404);
    throw new Error("No anonymous name assigned");
  }
  res.json({ anonymousName: user.anonymousName.name });
});

module.exports = {
  registerUser,
  authUser,
  deleteUser,
  getMyAnonymousName,
  assignAnonymousName,
  releaseAnonymousName,
};
