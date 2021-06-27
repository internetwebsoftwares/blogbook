const router = require("express").Router();
const User = require("../Models/userModel");
const Blog = require("../Models/blogModel");
const Comment = require("../Models/commentModel");
const Follow = require("../Models/followModel");
const Notification = require("../Models/notificationsModel");
const View = require("../Models/viewModel");
const Like = require("../Models/likeModel");
const Report = require("../Models/reportModel");
const isEmail = require("validator/lib/isEmail");
const { superChecker } = require("simplepasswordchecker");
const bcrypt = require("bcryptjs");
const auth = require("../Middlewares/auth");
const multer = require("multer");
const sharp = require("sharp");
const isFollowing = require("../Middlewares/isFollowing");

//Sign up
router.post("/sign-up", async (req, res) => {
  let { firstName, lastName, username, email, password, dob, country } =
    req.body;

  //Checking for username
  if (!username) {
    return res.send("Username is required.");
  }
  //Checking for firstname
  if (!firstName) {
    return res.send("Firstname is required.");
  }
  //Checking for lastname
  if (!lastName) {
    return res.send("Lastname is required.");
  }

  if (username.length < 3 || username.length > 15) {
    return res.send("Username must be between 3 and 15 characters long.");
  }

  if (username.includes(" ")) {
    return res.send("Username must not contain spaces.");
  }

  const isUsernameExists = await User.findOne({ username });
  if (isUsernameExists) {
    return res.send(
      "There is already an account with this username try another one."
    );
  }

  //Checking for email
  if (!email) {
    return res.send("Email is required.");
  }
  if (!isEmail(email)) {
    return res.send("Invalid email address.");
  }
  const isEmailExists = await User.findOne({ email });
  if (isEmailExists) {
    return res.send("There is already an account with this email address.");
  }
  //Checking for password
  if (!password) {
    return res.send("Password is required.");
  }
  const passwordValidation = superChecker(password, 7, 20);

  if (!passwordValidation.result) {
    return res.send(passwordValidation.message);
  }

  if (!country) {
    return res.send("Please provide country");
  }

  if (!dob) {
    return res.send("Please provide dob");
  }

  try {
    const user = new User({
      firstName,
      lastName,
      username,
      email,
      password,
      country,
      dob,
    });

    user.avatarUrl = `${process.env.DOMAIN}/default/avatar`;
    await user.save();
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(500).send(error);
  }
});

//Login
router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  try {
    if (!email) {
      return res.send("Enter email address or username");
    }
    if (!password) {
      return res.send("Enter password");
    }
    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    });
    if (!user) {
      return res.send("There is no user with this email address");
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.send("Incorrect password");
    }
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(505).send(error);
  }
});

//Read all users
router.get("/users/all/:pageNo", async (req, res) => {
  try {
    const users = await User.find()
      .sort({
        username: 1,
      })
      .limit(10)
      .skip(req.params.pageNo * 10 - 10);
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read one user
router.get("/user/:username", isFollowing, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.send("There is no user with that username");
    }
    res.send({
      user,
      userFollowedByYou: req.isFollowing,
      totalPosts: req.totalPosts,
      totalFollowers: req.totalFollowers,
      totalFollowings: req.totalFollowings,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

//Update user
router.patch("/user/update-profile", auth, async (req, res) => {
  let availableUpdates = [
    "firstName",
    "lastName",
    "gender",
    "country",
    "dob",
    "bio",
  ];
  try {
    const userUpdating = Object.keys(req.body);
    const isValidOperation = userUpdating.every((update) =>
      availableUpdates.includes(update)
    );
    if (!isValidOperation) {
      return res.send("Invalid updates");
    }
    userUpdating.forEach((update) => {
      req.user[update] = req.body[update];
    });
    await req.user.save();
    res.send("Profile updated.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Change password
router.patch("/user/password/change", auth, async (req, res) => {
  let { currPass, newPass } = req.body;
  try {
    const isPasswordCorrect = await bcrypt.compare(currPass, req.user.password);

    if (!isPasswordCorrect) {
      return res.send("Incorrect current password");
    }

    const passwordValidation = superChecker(newPass, 7, 20);

    if (!passwordValidation.result) {
      return res.send(passwordValidation.message);
    }

    req.user.password = newPass;
    await req.user.save();
    res.send("Password changed.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete user account
router.delete("/user/delete-account", auth, async (req, res) => {
  let { password } = req.body;
  try {
    if (!password) {
      return res.send("Please enter password");
    }
    const isPasswordCorrect = await bcrypt.compare(password, req.user.password);
    if (!isPasswordCorrect) {
      return res.send("Incorrect password");
    }
    const usersBlogs = await Blog.find({ author: req.user.username });

    const usersComments = await Comment.find({
      commentedByUsername: req.user.username,
    });
    const usersFollow = await Follow.find({
      $or: [
        {
          followingToUsername: req.user.username,
        },
        {
          followerUsername: req.user.username,
        },
      ],
    });
    const usersLikes = await Like.find({
      likedByUsername: req.user.username,
    });
    const usersNotifications = await Notification.find({
      notificationReceiver: req.user._id,
    });
    const usersReports = await Report.find({
      $or: [
        { reportedByUsername: req.user.username },
        { reportedOnId: req.user._id.toString() },
      ],
    });
    const usersViews = await View.find({
      viewedByUsername: req.user.username,
    });

    usersViews.forEach(async (view) => await view.remove());
    usersBlogs.forEach(async (blog) => await blog.remove());
    usersComments.forEach(async (comment) => await comment.remove());
    usersFollow.forEach(async (follow) => await follow.remove());
    usersNotifications.forEach(
      async (notification) => await notification.remove()
    );
    usersLikes.forEach(async (like) => await like.remove());
    usersReports.forEach(async (report) => await report.remove());

    await req.user.remove();
    res.send("Your account deleted successfully.");
  } catch (error) {
    res.status(500).send(error);
  }
});

//Delete user account ADMIN
router.delete("/admin/user/delete-account/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.send("No user with that id");

    if (!req.user.isAdmin) return res.send("You dont have this permission");

    const reports = await Report.find({
      reportedOnId: req.params.id,
    });

    if (reports) {
      reports.forEach(async (report) => {
        let notification = new Notification({
          message: `We have seen your report on ${report.subjectName}'s account. And after manually verifying we have removed his account permanently. we thankyou on behalf of our CEO Ata Shaikh and hope you will try your best to keep our blogging community clean. once again thankyou`,
          notificationReceiver: report.reportedByUserId,
        });
        await notification.save();
        await report.remove();
      });
    }

    const usersBlogs = await Blog.find({ author: user.username });

    const usersComments = await Comment.find({
      commentedByUsername: user.username,
    });
    const usersFollow = await Follow.find({
      $or: [
        {
          followingToUsername: user.username,
        },
        {
          followerUsername: user.username,
        },
      ],
    });

    const usersLikes = await Like.find({
      likedByUsername: user.username,
    });

    const usersNotifications = await Notification({
      notificationReceiver: user._id,
    });

    const usersReports = await Report.find({
      $or: [
        { reportedByUsername: user.username },
        { reportedOnId: user._id.toString() },
      ],
    });
    const usersViews = await View.find({
      viewedByUsername: user.username,
    });

    usersViews.forEach(async (view) => await view.remove());
    usersBlogs.forEach(async (blog) => await blog.remove());
    usersComments.forEach(async (comment) => await comment.remove());
    usersFollow.forEach(async (follow) => await follow.remove());
    usersNotifications.forEach(
      async (notification) => await notification.remove()
    );
    usersLikes.forEach(async (like) => await like.remove());
    usersReports.forEach(async (report) => await report.remove());

    await user.remove();
    res.send(`Your account has been deleted by Admin`);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Logout
router.post("/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.user.save();
    res.send("Logout successfully");
  } catch (error) {
    res.status(500).send(error);
  }
});

//multer config
const upload = multer({
  limits: {
    fileSize: 50000000, // Under 50MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|jfif)$/)) {
      return cb(new Error("Please upload an image"));
    }
    cb(undefined, true);
  },
});

//Change avatar
router.post(
  "/avatar/change",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize(250, 250)
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    req.user.avatarUrl = `${process.env.DOMAIN}/${req.user.username}/avatar`;
    await req.user.save();
    res.send("Avatar changed.");
  },
  (error, req, res, next) => {
    res.send({ error: error.message });
  }
);

//Read avatar
router.get("/:username/avatar", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.send("User not found");
    if (!user.avatar) {
      const defaultUser = await User.findOne({
        username: "default",
      });
      return res.send(defaultUser.avatar);
    }
    res.set("Content-Type", "image/png");
    res.send(user.avatar);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Search user
router.get("/user/search/user/:searchQuery/:pageNo", async (req, res) => {
  let searchQuery = req.params.searchQuery;
  try {
    let users = await User.find({
      $or: [
        { username: { $regex: `${searchQuery}`, $options: "i" } },
        { firstName: { $regex: `${searchQuery}`, $options: "i" } },
        { lastName: { $regex: `${searchQuery}`, $options: "i" } },
      ],
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10)
      .sort({
        followers: "-1",
      });

    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Follow or Unfollow users
router.post("/user/:id/follow", auth, async (req, res) => {
  try {
    const followingTo = await User.findById(req.params.id);
    if (!followingTo) {
      return res.send("User not found");
    }
    if (followingTo._id.toString() === req.user._id.toString()) {
      {
        return res.send("You cannot follow yourself");
      }
    }
    const alreadyFollowed = await Follow.findOne({
      followingToUserId: followingTo._id.toString(),
      followerUserId: req.user._id.toString(),
    });

    if (alreadyFollowed) {
      //Unfollow user
      followingTo.followers = followingTo.followers - 1;
      req.user.followings = req.user.followings - 1;
      await alreadyFollowed.remove();
      await followingTo.save();
      await req.user.save();
      res.send(`You unfollowed ${followingTo.username}`);
    } else {
      //Follow user
      const follow = new Follow({
        followingToUserId: followingTo._id,
        followingToUsername: followingTo.username,
        followerUserId: req.user._id,
        followerUsername: req.user.username,
      });

      const notification = new Notification({
        message: `"${req.user.username}" started following you`,
        notificationReceiver: followingTo._id,
      });
      await follow.save();
      await followingTo.save();
      await notification.save();
      await req.user.save();
      res.send(`You followed ${followingTo.username}`);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

//Report user
router.post("/report/user/:id", auth, async (req, res) => {
  let { reason } = req.body;

  if (!reason) {
    return res.send("Please give a reason");
  }
  try {
    const reportedOn = await User.findById(req.params.id);
    if (reportedOn.reportedBy.includes(req.user._id.toString())) {
      return res.send("You have already reported this account");
    }
    const report = new Report({
      reportedByUsername: req.user.username,
      reportedByUserId: req.user._id,
      reportedOnId: reportedOn._id,
      reportedOnType: "user",
      subjectName: reportedOn.username,
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

//Read all your followers
router.get("/user/:username/followers/all/:pageNo", async (req, res) => {
  try {
    const followers = await Follow.find({
      followingToUsername: req.params.username,
    })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10);
    res.send(followers);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read all your followings
router.get("/user/:username/followings/all/:pageNo", async (req, res) => {
  try {
    const followings = await Follow.find({
      followerUsername: req.params.username,
    })
      .limit(10)
      .skip(parseInt(req.params.id) * 10 - 10);
    res.send(followings);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Admin dashboard
router.get("/admin/dashboard", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.send("You dont have this permission");
    }
    const totalUsers = await User.find().countDocuments();
    const totalBlogs = await Blog.find().countDocuments();
    const totalReports = await Report.find().countDocuments();
    res.send({ totalUsers, totalBlogs, totalReports });
  } catch (error) {
    res.status(500).send(error);
  }
});

//Read all reports
router.get("/reports/all/:pageNo", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.send("You dont have this permission");
    }
    const reports = await Report.find()
      .sort({ createdAt: "-1" })
      .limit(10)
      .skip(parseInt(req.params.pageNo) * 10 - 10);
    res.send(reports);
  } catch (error) {
    res.status(500).send(error);
  }
});

//Apply for verification
router.post("/user/verification/apply", auth, isFollowing, async (req, res) => {
  try {
    const user = req.user;
    if (user.isVerified) {
      return res.send("Your account is already verified.");
    }
    const totalFollowers = req.totalFollowers;
    const totalPosts = req.totalPosts;
    if (totalFollowers < 100) {
      return res.send("Your followers are less than 100");
    }
    if (totalPosts < 20) {
      return res.send("Your blogs are less than 20");
    }

    user.isVerified = true;
    await user.save();
    res.send("Your account has been verified");
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
