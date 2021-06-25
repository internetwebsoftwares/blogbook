const mongoose = require("mongoose");
const followSchema = new mongoose.Schema(
  {
    followingToUsername: {
      type: String,
      required: true,
    },
    followingToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    followerUsername: {
      type: String,
      required: true,
    },
    followerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Follow", followSchema);
