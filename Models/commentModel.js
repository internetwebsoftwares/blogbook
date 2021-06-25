const mongoose = require("mongoose");
const commentSchema = new mongoose.Schema(
  {
    commentedByUsername: {
      type: String,
      required: true,
    },
    commentedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    commentedOnPostId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    postAuthor: {
      type: String,
      required: true,
    },
    reportedBy: [],
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
