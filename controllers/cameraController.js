const SuccessHandler = require("../utils/successHandler");
const ErrorHandler = require("../utils/errorHandler");
const camerasService = require("../services/cameraService");
const asyncHandler = require("express-async-handler");
const checkRequiredFields = require("../helpers/checkRequiredFields");
const { upload } = require("../utils/cloudinary");
const { STATUSCODE } = require("../constants/index");

exports.getAllCameras = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || STATUSCODE.ONE;
  const limit = parseInt(req.query.limit) || STATUSCODE.HUNDRED;
  const search = req.query.search;
  const sort = req.query.sort;
  const filter = req.query.filter;

  const cameras = await camerasService.getAllCamerasData(
    page,
    limit,
    search,
    sort,
    filter
  );

  return cameras?.length === STATUSCODE.ZERO
    ? next(new ErrorHandler("No cameras found"))
    : SuccessHandler(
        res,
        `Cameras with names ${cameras
          .map((u) => u.name)
          .join(", ")} and IDs ${cameras
          .map((u) => u._id)
          .join(", ")} retrieved`,
        cameras
      );
});

exports.getSingleCamera = asyncHandler(async (req, res, next) => {
  const camera = await camerasService.getSingleCameraData(req.params.id);

  return !camera
    ? next(new ErrorHandler("No camera found"))
    : SuccessHandler(
        res,
        `Camera ${camera.name} with ID ${camera._id} retrieved`,
        camera
      );
});

exports.createNewCamera = [
  upload.array("image"),
  checkRequiredFields(["user", "name", "text", "price", "image"]),
  asyncHandler(async (req, res, next) => {
    const camera = await camerasService.CreateCameraData(req);

    return SuccessHandler(
      res,
      `New camera ${camera.name} created with an ID ${camera._id}`,
      camera
    );
  }),
];

exports.updateCamera = [
  upload.array("image"),
  checkRequiredFields(["user", "name", "text", "price", "image"]),
  asyncHandler(async (req, res, next) => {
    const camera = await camerasService.updateCameraData(
      req,
      res,
      req.params.id
    );

    return SuccessHandler(
      res,
      `Camera ${camera.name} with ID ${camera._id} is updated`,
      camera
    );
  }),
];

exports.deleteCamera = asyncHandler(async (req, res, next) => {
  const camera = await camerasService.deleteCameraData(req.params.id);

  return !camera
    ? next(new ErrorHandler("No camera found"))
    : SuccessHandler(
        res,
        `Camera ${camera.name} with ID ${camera._id} is deleted`,
        camera
      );
});
