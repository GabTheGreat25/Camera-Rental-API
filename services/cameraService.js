const Camera = require("../models/camera");
const Transaction = require("../models/transaction");
const ErrorHandler = require("../utils/errorHandler");
const mongoose = require("mongoose");
const { cloudinary } = require("../utils/cloudinary");
const { STATUSCODE, RESOURCE } = require("../constants/index");

exports.getAllCamerasData = (page, limit, search, sort, filter) => {
  const skip = (page - STATUSCODE.ONE) * limit;

  let camerasQuery = Camera.find();

  if (search)
    camerasQuery = camerasQuery.where("name").regex(new RegExp(search, "i"));

  if (sort) {
    const [field, order] = sort.split(":");
    camerasQuery = camerasQuery.sort({
      [field]:
        order === RESOURCE.ASCENDING ? STATUSCODE.ONE : STATUSCODE.NEGATIVE_ONE,
    });
  } else
    camerasQuery = camerasQuery.sort({ createdAt: STATUSCODE.NEGATIVE_ONE });

  if (filter) {
    const [field, value] = filter.split(":");
    camerasQuery = camerasQuery.where(field).equals(value);
  }

  camerasQuery = camerasQuery
    .populate({ path: "user", select: "name" })
    .skip(skip)
    .limit(limit);

  return camerasQuery;
};

exports.getSingleCameraData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid camera ID: ${id}`);

  const camera = await Camera.findById(id)
    .populate({ path: "user", select: "name" })
    .lean()
    .exec();

  if (!camera) throw new ErrorHandler(`Camera not found with ID: ${id}`);

  return camera;
};

exports.CreateCameraData = async (req, res) => {
  const duplicateCamera = await Camera.findOne({ name: req.body.name })
    .collation({ locale: "en" })
    .lean()
    .exec();

  if (duplicateCamera) throw new ErrorHandler("Duplicate name");

  const images = await Promise.all(
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

  if (images.length === STATUSCODE.ZERO)
    throw new ErrorHandler("At least one image is required");

  const camera = await Camera.create({ ...req.body, image: images });

  return camera;
};

exports.updateCameraData = async (req, res, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid camera ID: ${id}`);

  const existingCamera = await Camera.findById(id).lean().exec();

  if (!existingCamera)
    throw new ErrorHandler(`Camera not found with ID: ${id}`);

  const duplicateCamera = await Camera.findOne({
    name: req.body.name,
    _id: { $ne: id },
  })
    .collation({ locale: "en" })
    .lean()
    .exec();

  if (duplicateCamera) throw new ErrorHandler("Duplicate name");

  let images = existingCamera.image || [];
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
      existingCamera.image.map((image) => image.public_id)
    );
  }

  const updatedCamera = await Camera.findByIdAndUpdate(
    id,
    {
      ...req.body,
      image: images,
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .lean()
    .exec();

  if (!updatedCamera) throw new ErrorHandler(`Camera not found with ID: ${id}`);

  return updatedCamera;
};

exports.deleteCameraData = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new ErrorHandler(`Invalid camera ID: ${id}`);

  const camera = await Camera.findOne({ _id: id });
  if (!camera) throw new ErrorHandler(`Camera not found with ID: ${id}`);

  const publicIds = camera.image.map((image) => image.public_id);

  await Promise.all([
    Camera.deleteOne({ _id: id }).lean().exec(),
    cloudinary.api.delete_resources(publicIds),
    Transaction.deleteMany({ camera: id }).lean().exec(),
  ]);

  return camera;
};
