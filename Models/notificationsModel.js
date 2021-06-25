const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    notificationReceiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
