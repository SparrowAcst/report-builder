const router = require('express').Router()

////////////////////////////////////////////////////////////////////////////
const service = require("./src/service")

router.get("/:id/", service.buildReport)
router.get("/:id/:mode", service.buildReport)
router.post("/build/", service.buildReportFromContent)
router.get("/test/", service.test)

////////////////////////////////////////////////////////////////////////////

const crud = require("./src/crud")

router.post("/crud/list/", crud.getReportList)
router.post("/crud/create/", crud.addReport)
router.post("/crud/read/", crud.getReport)
router.post("/crud/update/", crud.updateReport)
router.post("/crud/delete/", crud.deleteReport)



module.exports = router

