const express = require("express");
const router = express.Router();
const cameraController = require("../controllers/cameraController");
const { verifyJWT, authorizeRoles } = require("../middleware/verifyJWT");
const { METHOD, PATH, ROLE } = require("../constants/index");

router.use(verifyJWT);

const cameraRoutes = [
  {
    method: METHOD.GET,
    path: PATH.CAMERAS,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE, ROLE.CUSTOMER],
    handler: cameraController.getAllCameras,
  },
  {
    method: METHOD.POST,
    path: PATH.CAMERAS,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: cameraController.createNewCamera,
  },
  {
    method: METHOD.GET,
    path: PATH.CAMERA_ID,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE, ROLE.CUSTOMER],
    handler: cameraController.getSingleCamera,
  },
  {
    method: METHOD.PATCH,
    path: PATH.EDIT_CAMERA_ID,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: cameraController.updateCamera,
  },
  {
    method: METHOD.DELETE,
    path: PATH.CAMERA_ID,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: cameraController.deleteCamera,
  },
];

cameraRoutes.forEach((route) => {
  const { method, path, roles, handler } = route;
  router[method](path, authorizeRoles(...roles), handler);
});

module.exports = router;
