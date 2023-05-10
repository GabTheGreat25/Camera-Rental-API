const SuccessHandler = require("../utils/successHandler");
const ErrorHandler = require("../utils/errorHandler");
const commentsService = require("../services/commentService");
const asyncHandler = require("express-async-handler");
const checkRequiredFields = require("../helpers/checkRequiredFields");
const { STATUSCODE } = require("../constants/index");

exports.getAllComments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || STATUSCODE.ONE;
  const limit = parseInt(req.query.limit) || STATUSCODE.HUNDRED;
  const search = req.query.search;
  const sort = req.query.sort;
  const filter = req.query.filter;

  const comments = await commentsService.getAllCommentsData(
    page,
    limit,
    search,
    sort,
    filter
  );

  return comments?.length === STATUSCODE.ZERO
    ? next(new ErrorHandler("No comments found"))
    : SuccessHandler(
        res,
        `Comment with texts ${comments
          .map((u) => u.text)
          .join(", ")} and IDs ${comments
          .map((u) => u._id)
          .join(", ")} retrieved`,
        comments
      );
});

exports.getSingleComment = asyncHandler(async (req, res, next) => {
  const comment = await commentsService.getSingleCommentData(req.params.id);

  return !comment
    ? next(new ErrorHandler("No comment found"))
    : SuccessHandler(
        res,
        `Comment ${comment.text} with ID ${comment._id} retrieved`,
        comment
      );
});

exports.createNewComment = [
  checkRequiredFields(["transService", "ratings", "text"]),
  asyncHandler(async (req, res, next) => {
    const comment = await commentsService.CreateCommentData(req);

    return SuccessHandler(
      res,
      `New comment ${comment.text} created with an ID ${comment._id}`,
      comment
    );
  }),
];

exports.updateComment = [
  checkRequiredFields(["transService", "ratings", "text"]),
  asyncHandler(async (req, res, next) => {
    const comment = await commentsService.updateCommentData(
      req,
      res,
      req.params.id
    );

    return SuccessHandler(
      res,
      `Comment ${comment.text} with ID ${comment._id} is updated`,
      comment
    );
  }),
];

exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await commentsService.deleteCommentData(req.params.id);

  return !comment
    ? next(new ErrorHandler("No comment found"))
    : SuccessHandler(
        res,
        `Comment ${comment.text} with ID ${comment._id} is deleted`,
        comment
      );
});
