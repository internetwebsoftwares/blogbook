const Follow = require("../Models/followModel");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Blog = require("../Models/blogModel");

async function isFollowing(req, res, next) {
  try {
    const totalPosts = await Blog.find({
      author: req.params.username,
    }).countDocuments();

    const totalFollows = await Follow.find({
      $or: [
        { followingToUsername: req.params.username },
        { followerUsername: req.params.username },
      ],
    });

    const token = req.header("Authorization");
    const decoded = jwt.verify(token, process.env.JWT_AUTH_TOKEN);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw Error();
    }

    const isFollowing = totalFollows.filter((doc) => {
      return (
        doc.followerUsername === user.username &&
        doc.followingToUsername === req.params.username
      );
    });

    const totalFollowers = totalFollows.filter((doc) => {
      return doc.followingToUsername === req.params.username;
    });

    const totalFollowings = totalFollows.filter((doc) => {
      return doc.followerUsername === req.params.username;
    });

    if (!req.headers.authorization) {
      req.isFollowing = false;
      req.totalPosts = totalPosts;
      req.totalFollowers = totalFollowers.length;
      req.totalFollowings = totalFollowings.length;
      next();
      return;
    }

    // const isFollowing = await Follow.findOne({
    //   followingToUsername: req.params.username,
    //   followerUsername: user.username,
    // });

    if (isFollowing.length > 0) {
      req.isFollowing = true;
      req.totalPosts = totalPosts;
      req.totalFollowers = totalFollowers.length;
      req.totalFollowings = totalFollowings.length;
      next();
    } else {
      req.isFollowing = false;
      req.totalPosts = totalPosts;
      req.totalFollowers = totalFollowers.length;
      req.totalFollowings = totalFollowings.length;
      next();
    }
  } catch (error) {
    res.status(400).send(error);
  }
}

module.exports = isFollowing;
