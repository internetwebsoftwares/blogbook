const mongoose = require("mongoose");
const viewSchema = new mongoose.Schema(
  {
    viewedByUsername: {
      type: String,
      required: true,
    },
    viewedOnPostId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("View", viewSchema);
