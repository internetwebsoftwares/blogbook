const auth = require("../middlewares/auth");
const Blog = require("../Models/blogModel");
const Comment = require("../Models/commentModel");
const Report = require("../Models/reportModel");
const Notification = require("../Models/notificationsModel");
const Mongoose = require("mongoose");
const router = require("express").Router();

//Create comment
router.post("/comment/:postId/create", auth, async (req, res) => {
  let { myComment } = req.body;
  try {
    const blog = await Blog.findById(req.params.postId);
    const comment = new Comment({
      comment: myComment,
      commentedByUserId: req.user._id,
      commentedByUsername: req.user.username,
      commentedOnPostId: blog._id,
      postAuthor: blog.author,
    });
    await comment.save();
    await blog.save();
    res.send("Comment created");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read all comments on post
router.get("/comments/:postId/all/:pageNo", async (req, res) => {
  try {
    const comments = await Comment.find({
      commentedOnPostId: req.params.postId,
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({
        createdAt: "-1",
      });
    res.send(comments);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Update comment
router.patch("/comment/:id/update-comment", auth, async (req, res) => {
  let availableUpdates = ["comment"];
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      commentedByUserId: req.user._id,
    });
    if (!comment) {
      return res.send("You cannot update this comment");
    }
    const userUpdating = Object.keys(req.body);
    const isValidOperation = userUpdating.every((update) =>
      availableUpdates.includes(update)
    );
    if (!isValidOperation) {
      return res.send("Invalid updates");
    }
    userUpdating.forEach((update) => {
      comment[update] = req.body[update];
    });
    await comment.save();
    res.send("Comment updated");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete comment
router.delete("/comment/:id/delete", auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      commentedByUserId: req.user._id,
    });

    const blog = await Blog.findById(comment.commentedOnPostId);

    if (comment.commentedByUserId.toString() !== req.user._id.toString()) {
      return res.send("You cannot delete this comment");
    }

    await blog.save();
    await comment.remove();
    res.send("Comment deleted");
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete comment by post owner
router.delete("/comment/:id/delete/post-owner", auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
    });

    const postOwner = await Blog.findOne({
      author: req.user.username,
      _id: comment.commentedOnPostId,
    });

    console.log(comment._id);
    console.log(comment.commentedOnPostId);

    if (!postOwner) {
      return res.send("You dont have this permission");
    }

    await comment.remove();
    res.send("Comment deleted by post author");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete comment admin
router.delete("/comment/:id/delete/admin", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.send("You dont have this permission");
    }
    const comment = await Comment.findOne({
      _id: req.params.id,
    });

    const notification = new Notification({
      message: `Your comment is deleted by Us. your comment did not follow our guidelines and receive alot's of reports regarding your blog. We hope you will not post anything that spread hatred against any community or harms peoples`,
      notificationReceiver: comment.commentedByUserId,
    });

    const reports = await Report.find({
      reportedOnId: req.params.id,
    });

    if (reports) {
      reports.forEach(async (report) => {
        let notification = new Notification({
          message: `We have seen your report on a comment ${report.subjectName}. And after manually verifying we have removed his account permanently. we thankyou on behalf of our CEO Ata Shaikh and hope you will try your best to keep our blogging community clean. once again thankyou`,
          notificationReceiver: report.reportedByUserId,
        });
        await notification.save();
        await report.remove();
      });
    }

    await notification.save();
    await comment.remove();
    res.send("Comment deleted by admin");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Report comment
router.post("/report/comment/:id", auth, async (req, res) => {
  let { reason } = req.body;

  if (!reason) {
    return res.send("Please give a reason");
  }
  try {
    const reportedOn = await Comment.findById(req.params.id);
    if (reportedOn.reportedBy.includes(req.user._id.toString())) {
      return res.send("You have already reported this comment");
    }
    const report = new Report({
      reportedByUsername: req.user.username,
      reportedByUserId: req.user._id,
      reportedOnId: reportedOn._id,
      reportedOnType: "comment",
      subjectName: reportedOn.comment,
      reason,
    });
    reportedOn.reportedBy.push(req.user._id.toString());
    await reportedOn.save();
    await report.save();
    res.send("Reported successfully");
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
