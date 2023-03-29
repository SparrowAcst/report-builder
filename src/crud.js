const Builder = require("./builder")
const mongodb = require("./utils/mongodb")

const path = require("path")
const YAML = require("js-yaml")
const fs = require("fs")
const loadYaml = filename => YAML.load(fs.readFileSync(path.resolve(filename)).toString().replace(/\t/gm, " "))
const config = loadYaml(path.join(__dirname,"../.config/db/mongodb.conf.yml"))



const getReportList = async (req, res) => {
	try {
		
		let options = req.body.options || {}
		let orderBy = options.orderBy || "updatedAt"

		let $sort = {}
		$sort[orderBy] = (orderBy == "updatedAt") ? -1 : 1

		let result = await mongodb.aggregate({
			db: config.db,
			collection: `${config.db.name}.${config.db.reportCollection}`,
			pipeline: [   
	            {
	                $project:{ 
	                	_id: 0,
	                	data: 0 
	                }
	            },
	            {
	            	$sort
	            }
	        ]
		})

		res.send(result)
	} catch (e) {
		res.send({
			error: e.toString()
		})
	}	
}

const getReport = async (req, res) => {
	try {
		
		let report = req.body.options.report

		let result = await mongodb.aggregate({
			db: config.db,
			collection: `${config.db.name}.${config.db.reportCollection}`,
			pipeline: [   
	            {
	            	$match:{
	            		id: report.id
	            	}
	            },
	            {
	                $project:{ 
	                	_id: 0 
	                }
	            }
	        ]
		})

		res.send(result[0])	

	} catch (e) {
		res.send({
			error: e.toString()
		})
	}
	
}



const deleteReport = async (req, res) => {
	try {
		
		let report = req.body.options.report

		let result = await mongodb.deleteOne({
			db: config.db,
			collection: `${config.db.name}.${config.db.reportCollection}`,
			filter:{ id: report.id}
		})

		res.send(result)	
	
	} catch (e) {
		res.send({
			error: e.toString()
		})
	}
}

const updateReport = async (req, res) => {
	
	try {
		
		let report = req.body.options.report

		builder = new Builder()
		const cachedContent = await builder.execute(report.data, {})
		report.cache = JSON.stringify(
			{
				_log: cachedContent._log,
				_error: cachedContent._error,
				_publish: cachedContent._publish
			}
		)	
		report.cachedAt = new Date()
			
		// console.log("save report", report)

		let result = await mongodb.replaceOne({
			db: config.db,
			collection: `${config.db.name}.${config.db.reportCollection}`,
			filter:{ id: report.id},
			data: report
		})

		res.send(result)	
	
	} catch (e) {
		res.send({
			error: e.toString()
		})
	}
}

const addReport = updateReport

module.exports = {
	getReportList,
	getReport,
	addReport,
	deleteReport,
	updateReport
}