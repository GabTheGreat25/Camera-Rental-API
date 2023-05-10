const Transaction = require("../models/transaction");
const Comment = require("../models/comment");
const ErrorHandler = require("../utils/errorHandler");
const mongoose = require("mongoose");
const { STATUSCODE, RESOURCE } = require("../constants/index");

exports.getAllTransactionsData = (page, limit, search, sort, filter) => {
  const skip = (page - STATUSCODE.ONE) * limit;

  let transactionsQuery = Transaction.find()
    .populate({ path: "user", select: "name" })
    .skip(skip)
    .limit(limit);

  if (search)
    transactionsQuery = transactionsQuery
      .where("status")
      .equals(new RegExp(search, "i"));

  if (sort) {
    const [field, order] = sort.split(":");
    transactionsQuery = transactionsQuery.sort({
      [field]:
        order === RESOURCE.ASCENDING ? STATUSCODE.ONE : STATUSCODE.NEGATIVE_ONE,
    });
  } else
    transactionsQuery = transactionsQuery.sort({
      createdAt: STATUSCODE.NEGATIVE_ONE,
    });

  if (filter) {
    const [field, value] = filter.split(":");
    transactionsQuery = transactionsQuery.where(field).equals(value);
  }

  transactionsQuery = transactionsQuery
    .populate({
      path: "user",
      select: "name",
    })
    .populate({
      path: "cameras",
      select: "name price",
      options: { sort: { name: STATUSCODE.ONE } },
    });

  return transactionsQuery;
};

exports.getSingleTransactionData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid transaction ID: ${id}`);

  const transaction = await Transaction.findById(id)
    .populate([
      {
        path: "user",
        select: "name",
      },
      {
        path: "cameras",
        select: "name",
      },
    ])
    .lean()
    .exec();

  if (!transaction)
    throw new ErrorHandler(`Transaction not found with ID: ${id}`);

  return transaction;
};
exports.CreateTransactionData = async (data) => {
  const { user, cameras, date } = data;
  if (!user) {
    throw new Error("User is required");
  }

  const transaction = await Transaction.create({
    user,
    cameras,
    date,
  });

  return {
    success: true,
    message: `New transaction on ${date} was created with ID ${transaction._id}`,
    transaction: transaction,
  };
};

exports.updateTransactionData = async (req, res, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid transaction ID: ${id}`);

  const updatedTransaction = await Transaction.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .lean()
    .exec();

  if (!updatedTransaction)
    throw new ErrorHandler(`Transaction not found with ID: ${id}`);

  return updatedTransaction;
};

exports.deleteTransactionData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid transaction ID: ${id}`);

  const transaction = await Transaction.findOne({ _id: id });
  if (!transaction)
    throw new ErrorHandler(`Transaction not found with ID: ${id}`);

  await Promise.all([
    Transaction.deleteOne({ _id: id }).lean().exec(),
    Comment.deleteMany({ transaction: id }).lean().exec(),
  ]);

  return transaction;
};
