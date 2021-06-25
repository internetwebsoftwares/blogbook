const router = require("express").Router();
const auth = require("../middlewares/auth");
const Notification = require("../Models/notificationsModel");

//Read all your notifications
router.get("/notifications/all/:pageNo", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      notificationReceiver: req.user._id,
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({ createdAt: "-1" });
    res.send(notifications);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read one notification
router.get("/notification/:id/", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    res.send(notification);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete one notification
router.delete("/notification/:id/delete", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification.notificationReceiver !== req.user._id.toString()) {
      return res.send("You cannot delete this.");
    }
    await notification.remove();
    res.send("Notification deleted");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete selected notification
router.delete("/notification/delete/selected", auth, async (req, res) => {
  let { selectedNotifications } = req.body;
  try {
    const notifications = await Notification.find({
      notificationReceiver: req.user._id.toString(),
    });
    notifications.forEach(async (notification) => {
      if (selectedNotifications.includes(notification._id.toString())) {
        await notification.remove();
      }
    });
    res.send("All selected notifications have been deleted");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete all notification
router.delete("/notification/delete/all", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      notificationReceiver: req.user._id.toString(),
    });

    notifications.forEach(async (notification) => {
      await notification.remove();
    });
    res.send("All notifications has been deleted");
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
