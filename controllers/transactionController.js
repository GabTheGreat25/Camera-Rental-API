const SuccessHandler = require("../utils/successHandler");
const ErrorHandler = require("../utils/errorHandler");
const transactionsService = require("../services/transactionService");
const asyncHandler = require("express-async-handler");
const checkRequiredFields = require("../helpers/checkRequiredFields");
const { STATUSCODE } = require("../constants/index");

exports.getAllTransactions = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || STATUSCODE.ONE;
  const limit = parseInt(req.query.limit) || STATUSCODE.HUNDRED;
  const search = req.query.search;
  const sort = req.query.sort;
  const filter = req.query.filter;

  const transactions = await transactionsService.getAllTransactionsData(
    page,
    limit,
    search,
    sort,
    filter
  );

  return transactions?.length === STATUSCODE.ZERO
    ? next(new ErrorHandler("No transactions found"))
    : SuccessHandler(
        res,
        `Transactions with status ${transactions
          .map((u) => u.status)
          .join(", ")} and IDs ${transactions
          .map((u) => u._id)
          .join(", ")} retrieved`,
        transactions
      );
});

exports.getSingleTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await transactionsService.getSingleTransactionData(
    req.params.id
  );

  return !transaction
    ? next(new ErrorHandler("No transaction found"))
    : SuccessHandler(
        res,
        `Transaction with ID ${transaction.id} is ${transaction.status}`,
        transaction
      );
});

exports.createNewTransaction = [
  checkRequiredFields(["user", "cameras", "date"]),
  asyncHandler(async (req, res, next) => {
    const { user, date } = req.body;
    const cameras = req.body.cameras || [];

    const transactionData = {
      user,
      cameras,
      date,
    };

    const transaction = await transactionsService.CreateTransactionData(
      transactionData
    );

    return SuccessHandler(res, transaction.message, transaction);
  }),
];

exports.updateTransaction = [
  checkRequiredFields(["status", "date"]),
  asyncHandler(async (req, res, next) => {
    const transaction = await transactionsService.updateTransactionData(
      req,
      res,
      req.params.id
    );

    return SuccessHandler(
      res,
      `Transaction on ${transaction.date} with ID ${transaction._id} is updated`,
      transaction
    );
  }),
];

exports.deleteTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await transactionsService.deleteTransactionData(
    req.params.id
  );

  return !transaction
    ? next(new ErrorHandler("No transaction found"))
    : SuccessHandler(
        res,
        `Transaction on ${transaction.date} with ID ${transaction._id} is deleted`,
        transaction
      );
});
