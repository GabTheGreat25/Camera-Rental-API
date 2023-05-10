const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const { verifyJWT, authorizeRoles } = require("../middleware/verifyJWT");
const { METHOD, PATH, ROLE } = require("../constants/index");

router.use(verifyJWT);

const noteRoutes = [
  {
    method: METHOD.GET,
    path: PATH.NOTES,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: noteController.getAllNotes,
  },
  {
    method: METHOD.POST,
    path: PATH.NOTES,
    roles: [ROLE.ADMIN],
    handler: noteController.createNewNote,
  },
  {
    method: METHOD.GET,
    path: PATH.NOTE_ID,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: noteController.getSingleNote,
  },
  {
    method: METHOD.PATCH,
    path: PATH.EDIT_NOTE_ID,
    roles: [ROLE.ADMIN, ROLE.EMPLOYEE],
    handler: noteController.updateNote,
  },
  {
    method: METHOD.DELETE,
    path: PATH.NOTE_ID,
    roles: [ROLE.ADMIN],
    handler: noteController.deleteNote,
  },
];

noteRoutes.forEach((route) => {
  const { method, path, roles, handler } = route;
  router[method](path, authorizeRoles(...roles), handler);
});

module.exports = router;
