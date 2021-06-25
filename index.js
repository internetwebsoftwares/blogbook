require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const userRoute = require("./Routes/userRoute");
const blogRoute = require("./Routes/blogRoute");
const commentRoute = require("./Routes/commentRoute");
const notificationRoute = require("./Routes/notificationRoute");
const likeRoute = require("./Routes/likeRoute");

mongoose.connect(process.env.DATABASE_CONNECTION_STRING, {
  useCreateIndex: true,
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(userRoute);
app.use(blogRoute);
app.use(commentRoute);
app.use(notificationRoute);
app.use(likeRoute);

app.listen(PORT, console.log("App started"));
