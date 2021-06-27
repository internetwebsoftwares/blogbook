const router = require("express").Router();
const auth = require("../Middlewares/auth");
const User = require("../Models/userModel");
const Report = require("../Models/reportModel");
const Blog = require("../Models/blogModel");
const Notification = require("../Models/notificationsModel");
const Follow = require("../Models/followModel");
const View = require("../Models/viewModel");
const jwt = require("jsonwebtoken");
const isBlogLiked = require("../Middlewares/isBlogLiked");

//Create a blog
router.post("/blog/create", auth, async (req, res) => {
  let { title, body, description, category, isPrivate, areCommentsOff } =
    req.body;
  try {
    if (!title) {
      return res.send("Title is required.");
    }
    if (!description) {
      description = `This blog created by ${req.user.username}, in this blog the author focuses on "${category}"`;
    }
    if (!body) {
      return res.send("Please add body.");
    }
    if (!category) {
      return res.send("Please add category.");
    }

    const blog = new Blog({
      title,
      body,
      category,
      description,
      isPrivate,
      areCommentsOff,
      author: req.user.username,
      authorId: req.user._id,
    });
    req.user.posts = req.user.posts + 1;
    await blog.save();
    await req.user.save();
    res.send("Blog created.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Fetch user's interests
router.get("/blogs/user/interests/", auth, async (req, res) => {
  try {
    const usersInterest = req.user.interestedIn; //[]
    if (usersInterest.length < 1) {
      usersInterest.push("Sports", "Education", "Entertainment");
    }
    const userInterestObj = usersInterest.map((interest) => {
      return {
        category: interest,
      };
    });
    const usersInterestedBlogs = await Blog.find({
      $or: userInterestObj,
    })
      .sort({
        views: "-1",
      })
      .limit(10);
    res.send(usersInterestedBlogs);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Fetch your feeds
router.get("/blogs/your-feed/:pageNo", auth, async (req, res) => {
  try {
    const yourFollowings = await Follow.find({
      followerUserId: req.user._id,
    });
    const youAreFollowingTo = yourFollowings.map((following) => {
      return {
        authorId: following.followingToUserId,
      };
    });

    const feeds = await Blog.find({
      $or: youAreFollowingTo.concat({
        authorId: req.user._id,
      }),
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({ createdAt: "-1" });

    res.send(feeds);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read all blogs
router.get("/blogs/all/:pageNo", async (req, res) => {
  try {
    const sortQuery = req.query.sort;

    //Sorting code
    let sortingObj = {};
    if (sortQuery && sortQuery === "popular") {
      sortingObj = {
        views: "-1",
      };
    }
    if (sortQuery && sortQuery === "oldest") {
      sortingObj = {
        createdAt: "1",
      };
    }
    if ((sortQuery && sortQuery === "latest") || !sortQuery) {
      sortingObj = {
        createdAt: "-1",
      };
    }

    let blogs = await Blog.find({})
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort(sortingObj);

    if (req.query.filter) {
      blogs = blogs.filter((blog) => {
        return blog.category.toLowerCase() === req.query.filter.toLowerCase();
      });
    }

    res.send(blogs);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read history
router.get("/user/read/history", auth, async (req, res) => {
  try {
    const yourHistory = req.user.readHistory;
    const yourHistArrOfObj = yourHistory.map((hist) => {
      return {
        _id: hist,
      };
    });
    const blogs = await Blog.find({
      $or: yourHistArrOfObj,
    });
    res.send(blogs);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read one blog
router.get("/blog/:id/", isBlogLiked, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (req.headers.authorization) {
      const token = req.header("Authorization");
      const decoded = jwt.verify(token, process.env.JWT_AUTH_TOKEN);
      const user = await User.findOne({
        _id: decoded._id,
        "tokens.token": token,
      });

      if (user.interestedIn.length < 10) {
        if (!user.interestedIn.includes(blog.category)) {
          user.interestedIn.push(blog.category);
        }
      } else {
        user.interestedIn.shift();
        user.interestedIn.push(blog.category);
      }

      if (user.readHistory.length < 20) {
        if (!user.readHistory.includes(blog._id)) {
          user.readHistory.push(blog._id);
        } else {
          let indexOf = user.readHistory.indexOf(blog._id);
          user.readHistory.splice(indexOf, 1);
          user.readHistory.push(blog._id);
        }
      } else {
        user.readHistory.shift();
        user.readHistory.push(blog._id);
      }

      const view = await View.findOne({
        viewedByUsername: user.username,
        viewedOnPostId: blog._id.toString(),
      });

      if (!view) {
        const newView = new View({
          viewedByUsername: user.username,
          viewedOnPostId: blog._id.toString(),
        });

        await newView.save();
        blog.views = blog.views + 1;
      }

      await user.save();
    }
    await blog.save();
    res.send({
      blog,
      blogLikedByYou: req.isBlogLiked,
      totalComments: req.totalComments,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read all your blogs
router.get("/blogs/:username/all/:pageNo", async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.params.username })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({
        createdAt: "-1",
      });
    res.send(blogs);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Update blog
router.patch("/blog/:id/edit", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog.authorId.toString() !== req.user._id.toString()) {
      return res.send("You don't have permission to edit someone else's blog");
    }
    let availableUpdates = [
      "title",
      "description",
      "areCommentsOff",
      "isPrivate",
      "body",
      "category",
    ];
    const userUpdating = Object.keys(req.body);
    const isValidOperation = userUpdating.every((update) =>
      availableUpdates.includes(update)
    );
    if (!isValidOperation) {
      return res.send("Invalid updates");
    }
    userUpdating.forEach((update) => {
      blog[update] = req.body[update];
    });
    await blog.save();
    res.send("Blog edited.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete a blog
router.delete("/blog/:id/delete", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog.authorId.toString() !== req.user._id.toString()) {
      return res.send(
        "You don't have permission to delete someone else's blog"
      );
    }
    req.user.posts = req.user.posts - 1;
    await blog.remove();
    await req.user.save();
    res.send("Blog deleted.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete a blog by admin
router.delete("/blog/:id/delete/admin", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    const blogAuthor = await User.findOne({
      _id: blog.authorId.toString(),
    });
    if (!req.user.isAdmin) {
      return res.send(
        "You don't have permission to delete someone else's blog"
      );
    }
    const notification = new Notification({
      message: `Your blog is deleted by Us. your blog did not follow our guidelines and receive alot's of reports regarding your blog. We hope you will not post anything that spread hatred against any community or harms peoples`,
      notificationReceiver: blogAuthor._id,
    });

    const reports = await Report.find({
      reportedOnId: req.params.id,
    });

    if (reports) {
      reports.forEach(async (report) => {
        let notification = new Notification({
          message: `We have seen your report on a blog ${report.subjectName}. And after manually verifying we have removed his account permanently. we thankyou on behalf of our CEO Ata Shaikh and hope you will try your best to keep our blogging community clean. once again thankyou`,
          notificationReceiver: report.reportedByUserId,
        });
        await notification.save();
        await report.remove();
      });
    }

    blogAuthor.posts = blogAuthor.posts - 1;
    await blog.remove();
    await notification.save();
    await blogAuthor.save();
    res.send("Blog deleted by admin.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Search blog
router.get("/blog/search/blog/:searchQuery/:pageNo", async (req, res) => {
  let searchQuery = req.params.searchQuery;
  try {
    let blogs = await Blog.find({
      $or: [
        { title: { $regex: `${searchQuery}`, $options: "i" } },
        { body: { $regex: `${searchQuery}`, $options: "i" } },
      ],
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({
        createdAt: "-1",
      });

    res.send(blogs);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Report blog
router.post("/report/blog/:id", auth, async (req, res) => {
  let { reason } = req.body;

  if (!reason) {
    return res.send("Please give a reason");
  }
  try {
    const reportedOn = await Blog.findById(req.params.id);
    if (reportedOn.reportedBy.includes(req.user._id.toString())) {
      return res.send("You have already reported this blog");
    }
    const report = new Report({
      reportedByUsername: req.user.username,
      reportedByUserId: req.user._id,
      reportedOnId: reportedOn._id,
      reportedOnType: "blog",
      subjectName: reportedOn.title,
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
