const Comment = require("../models/comment");
const ErrorHandler = require("../utils/errorHandler");
const mongoose = require("mongoose");
const { STATUSCODE, RESOURCE } = require("../constants/index");

exports.getAllCommentsData = async (page, limit, search, sort, filter) => {
  const skip = (page - STATUSCODE.ONE) * limit;

  let commentsQuery = Comment.find();

  if (search)
    commentsQuery = commentsQuery.where("text").regex(new RegExp(search, "i"));

  if (sort) {
    const [field, order] = sort.split(":");
    commentsQuery = commentsQuery.sort({
      [field]:
        order === RESOURCE.ASCENDING ? STATUSCODE.ONE : STATUSCODE.NEGATIVE_ONE,
    });
  } else
    commentsQuery = commentsQuery.sort({ createdAt: STATUSCODE.NEGATIVE_ONE });

  if (filter) {
    const [field, value] = filter.split(":");
    commentsQuery = commentsQuery.where(field).equals(value);
  }

  commentsQuery = commentsQuery
    .populate({ path: "transaction", select: "status" })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return commentsQuery;
};

exports.getSingleCommentData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid comment ID: ${id}`);

  const comment = await Comment.findById(id)
    .populate({ path: "transaction", select: "status" })
    .lean()
    .exec();

  if (!comment) throw new ErrorHandler(`Comment not found with ID: ${id}`);

  return comment;
};

exports.CreateCommentData = async (req, res) => {
  const comment = await Comment.create(req.body);

  return comment;
};

exports.updateCommentData = async (req, res, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid comment ID: ${id}`);

  const updatedComment = await Comment.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .lean()
    .exec();

  if (!updatedComment)
    throw new ErrorHandler(`Comment not found with ID: ${id}`);

  return updatedComment;
};

exports.deleteCommentData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid comment ID: ${id}`);

  if (!id) throw new ErrorHandler(`Comment not found with ID: ${id}`);

  const comment = await Comment.findOneAndDelete({ _id: id }).lean().exec();

  return comment;
};
