const mongoose = require("mongoose");
const likeSchema = new mongoose.Schema(
  {
    likedByUsername: {
      type: String,
      required: true,
    },
    likedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    likedOnPostId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Like", likeSchema);
