const User = require("../models/user");
const mongoose = require("mongoose");
const Camera = require("../models/camera");
const Note = require("../models/note");
const Transaction = require("../models/transaction");
const ErrorHandler = require("../utils/errorHandler");
const bcrypt = require("bcrypt");
const token = require("../utils/token");
const { cloudinary } = require("../utils/cloudinary");
const uuid = require("uuid");
const { sendEmail } = require("../utils/sendEmail");
const { STATUSCODE, RESOURCE, ROLE } = require("../constants/index");
const blacklistedTokens = [];

exports.updatePassword = async (
  id,
  oldPassword,
  newPassword,
  confirmPassword
) => {
  const user = await User.findById(id).select("+password");

  if (!user) throw new ErrorHandler("User not found");

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) throw new ErrorHandler("Invalid old password");

  if (newPassword !== confirmPassword)
    throw new ErrorHandler("Passwords do not match");

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(process.env.SALT_NUMBER)
  );

  user.password = hashedPassword;

  await user.save();

  return user;
};

exports.sendResetPassword = async (
  resetToken,
  newPassword,
  confirmPassword,
  req
) => {
  const loginUrl = `http://localhost:6969/login`;

  const email = req.query && req.query.email;
  if (!email) throw new ErrorHandler("Please provide an email");

  const user = await User.findOne({ email, resetToken });

  if (!user) throw new ErrorHandler("Invalid or expired reset token");

  if (newPassword !== confirmPassword)
    throw new ErrorHandler("Passwords don't match");

  if (user.resetTokenUsed)
    throw new ErrorHandler("Reset token has already been used");

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(process.env.SALT_NUMBER)
  );
  user.password = hashedPassword;
  user.resetTokenUsed = true;
  await user.save();

  const emailOptions = {
    to: user.email,
    subject: "Password Reset Successful",
    html: `<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        color: #444;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      h1 {
        font-size: 24px;
        margin-bottom: 20px;
        text-align: center;
      }
      p {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .center {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      a {
        color: #fff;
        background-color: #4caf50;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        display: inline-block;
      }

      .bottom{
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Password Reset Successful</h1>
      <p>Your password has been successfully reset. If you did not perform this action, please contact support immediately.</p>
      <p class="center">
        <a href="${loginUrl}">Go Back To The Login Page</a>
      </p>
    </div>
  </body>
</html>

`,
  };

  await sendEmail(emailOptions);

  return `Password updated successfully for user with email ${user.email}`;
};

exports.sendPasswordResetEmail = async (req, email) => {
  if (!email) throw new ErrorHandler("Please provide an email");

  const resetToken = uuid.v4();
  const resetUrl = `http://localhost:6969/password/reset/${resetToken}?email=${encodeURIComponent(
    email
  )}`;

  const user = await User.findOne({ email });

  if (!user) throw new ErrorHandler("User not found");

  await User.updateOne({ _id: user._id }, { resetTokenUsed: false });

  const emailOptions = {
    to: email,
    subject: "Password Reset Request",
    html: `<html>
  <head>
    <style>
      /* Add styles to make the email look more visually appealing */
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        color: #444;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      h1 {
        font-size: 24px;
        margin-bottom: 20px;
        text-align: center;
      }
      p {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .center {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      a {
        color: #fff;
        background-color: #4caf50;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        display: inline-block;
      }

      .bottom{
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password. Please click the following link to reset your password:</p>
      <p class="center">
        <a href="${resetUrl}">Reset Password</a>
      </p>
      <p class="bottom">If you did not request to reset your password, please ignore this email.</p>
    </div>
  </body>
</html>

`,
  };

  await sendEmail(emailOptions);

  return `Reset password email sent successfully to ${email}`;
};

exports.loginToken = async (email, password) => {
  const foundUser = await User.findOne({ email }).select("+password").exec();

  if (!foundUser) throw new ErrorHandler("Wrong Email Or Password");

  if (!foundUser.active)
    throw new ErrorHandler("User can't login because they are not active");

  const match = await bcrypt.compare(password, foundUser.password);

  if (!match) throw new ErrorHandler("Wrong Password");

  const accessToken = token.generateAccessToken(
    foundUser.email,
    foundUser.roles
  );

  const accessTokenMaxAge = 7 * 24 * 60 * 60 * 1000;

  return { user: foundUser, accessToken, accessTokenMaxAge };
};

exports.logoutUser = (cookies, res) => {
  return new Promise((resolve, reject) => {
    !cookies?.jwt
      ? reject(new Error("You are not logged in"))
      : (blacklistedTokens.push(cookies.jwt),
        res.clearCookie(RESOURCE.JWT, {
          httpOnly: true,
          secure: process.env.NODE_ENV === RESOURCE.PRODUCTION,
          sameSite: RESOURCE.NONE,
        }),
        resolve());
  });
};

exports.getBlacklistedTokens = () => {
  return blacklistedTokens;
};

exports.getAllUsersData = (page, limit, search, sort, filter) => {
  const skip = (page - STATUSCODE.ONE) * limit;

  let usersQuery = User.find();

  if (search)
    usersQuery = usersQuery.where("name").regex(new RegExp(search, "i"));

  if (sort) {
    const [field, order] = sort.split(":");
    usersQuery = usersQuery.sort({
      [field]:
        order === RESOURCE.ASCENDING ? STATUSCODE.ONE : STATUSCODE.NEGATIVE_ONE,
    });
  } else usersQuery = usersQuery.sort({ createdAt: STATUSCODE.NEGATIVE_ONE });

  if (filter) {
    const [field, value] = filter.split(":");
    usersQuery = usersQuery.where(field).equals(value);
  }

  usersQuery = usersQuery.skip(skip).limit(limit);

  return usersQuery;
};

exports.getSingleUserData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid user ID: ${id}`);

  const user = await User.findById(id).lean().exec();

  if (!user) throw new ErrorHandler(`User not found with ID: ${id}`);

  return user;
};

exports.CreateUserData = async (req, res) => {
  const duplicateUser = await User.findOne({ name: req.body.name })
    .collation({ locale: "en" })
    .lean()
    .exec();

  if (duplicateUser) throw new ErrorHandler("Duplicate name");

  let images = [];
  if (req.files && Array.isArray(req.files)) {
    images = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          public_id: file.filename,
        });
        return {
          public_id: result.public_id,
          url: result.url,
          originalname: file.originalname,
        };
      })
    );
  }

  if (images.length === STATUSCODE.ZERO)
    throw new ErrorHandler("At least one image is required");

  const roles = req.body.roles
    ? Array.isArray(req.body.roles)
      ? req.body.roles
      : req.body.roles.split(", ")
    : [ROLE.CUSTOMER];

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: await bcrypt.hash(
      req.body.password,
      Number(process.env.SALT_NUMBER)
    ),
    roles: roles,
    image: images,
  });

  return user;
};

exports.updateUserData = async (req, res, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid user ID: ${id}`);

  const existingUser = await User.findById(id).lean().exec();

  if (!existingUser) throw new ErrorHandler(`User not found with ID: ${id}`);

  const duplicateUser = await User.findOne({
    name: req.body.name,
    _id: { $ne: id },
  })
    .collation({ locale: "en" })
    .lean()
    .exec();

  if (duplicateUser) throw new ErrorHandler("Duplicate name");

  let images = existingUser.image || [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    images = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          public_id: file.filename,
        });
        return {
          public_id: result.public_id,
          url: result.url,
          originalname: file.originalname,
        };
      })
    );

    await cloudinary.api.delete_resources(
      existingUser.image.map((image) => image.public_id)
    );
  }

  let roles = existingUser.roles;
  if (req.body.roles) {
    roles = Array.isArray(req.body.roles)
      ? req.body.roles
      : req.body.roles.split(", ");
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      ...req.body,
      roles: roles,
      image: images,
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .lean()
    .exec();

  if (!updatedUser) throw new ErrorHandler(`User not found with ID: ${id}`);

  return updatedUser;
};

exports.deleteUserData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid user ID: ${id}`);

  const user = await User.findOne({ _id: id });
  if (!user) throw new ErrorHandler(`User not found with ID: ${id}`);

  const publicIds = user.image.map((image) => image.public_id);

  await Promise.all([
    User.deleteOne({ _id: id }).lean().exec(),
    cloudinary.api.delete_resources(publicIds),
    Note.deleteMany({ user: id }).lean().exec(),
    Camera.deleteMany({ user: id }).lean().exec(),
    Transaction.deleteMany({ user: id }).lean().exec(),
  ]);

  return user;
};
