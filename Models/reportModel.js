const mongoose = require("mongoose");
const reportSchema = new mongoose.Schema(
  {
    reportedByUsername: {
      type: String,
      required: true,
    },
    reportedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reportedOnId: {
      type: String,
      required: true,
    },
    reportedOnType: {
      type: String,
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
