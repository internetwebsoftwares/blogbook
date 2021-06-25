const User = require("../Models/userModel");
const Comment = require("../Models/commentModel");
const Like = require("../Models/likeModel");
const jwt = require("jsonwebtoken");

async function isBlogLiked(req, res, next) {
  try {
    const totalComments = await Comment.find({
      commentedOnPostId: req.params.id,
    }).countDocuments();

    if (!req.headers.authorization) {
      req.isBlogLiked = false;
      req.totalComments = totalComments;
      next();
      return;
    }
    const token = req.header("Authorization");
    const decoded = jwt.verify(token, process.env.JWT_AUTH_TOKEN);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });
    const like = await Like.findOne({
      likedByUsername: user.username,
      likedOnPostId: req.params.id.toString(),
    });

    if (like) {
      req.isBlogLiked = true;
      req.totalComments = totalComments;
      next();
    } else {
      req.isBlogLiked = false;
      req.totalComments = totalComments;
      next();
    }
  } catch (error) {
    res.status(400).send(error);
  }
}

module.exports = isBlogLiked;
