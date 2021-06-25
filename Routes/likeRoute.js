const router = require("express").Router();
const auth = require("../Middlewares/auth");
const Blog = require("../Models/blogModel");
const Like = require("../Models/likeModel");

// Like / Unlike a blog
router.post("/like/:postId", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.postId);
    const like = await Like.findOne({
      likedByUsername: req.user.username,
      likedOnPostId: blog._id,
    });
    if (like) {
      //Unlike a blog
      blog.likes = blog.likes - 1;
      blog.save();
      res.send("Blog unliked");
      await like.remove();
    } else {
      //Like a blog
      const like = new Like({
        likedByUsername: req.user.username,
        likedByUserId: req.user._id,
        likedOnPostId: blog._id,
      });
      blog.likes = blog.likes + 1;
      await blog.save();
      await like.save();
      res.send("Blog liked");
    }
  } catch (error) {
    console.log(error);
  }
});

//Read liked blogs
router.get("/user/liked/blogs/:pageNo", auth, async (req, res) => {
  try {
    const likes = await Like.find({
      likedByUsername: req.user.username,
    })
      .sort({ createdAt: "-1" })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10);

    const ids = likes.map((like) => {
      return {
        _id: like.likedOnPostId,
      };
    });

    const likedBlogs = await Blog.find({
      $or: ids,
    });
    res.send(likedBlogs);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
