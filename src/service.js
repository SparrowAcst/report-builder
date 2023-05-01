const Builder = require("./builder")
const mongodb = require("./utils/mongodb")
const moment = require("moment")


const path = require("path")
const YAML = require("js-yaml")
const fs = require("fs")
const loadYaml = filename => YAML.load(fs.readFileSync(path.resolve(filename)).toString().replace(/\t/gm, " "))
const config = loadYaml(path.join(__dirname,"../.config/db/mongodb.conf.yml"))



const test = async (req, res) => {
	res.send("Ready for use")
}

const buildReport = async (req, res) => {
	
	const reportId = req.params.id 
	const mode = req.params.mode

	let reportData = await mongodb.aggregate({
		db: config.db,
		collection: `${config.db.name}.${config.db.reportCollection}`,
		pipeline: [   
            {
                $match: { id: reportId }
            },
            {
                $project:{ _id: 0 }
            }
                    
        ]
	})

	reportData = (reportData) ? reportData[0] : null
	
	if(reportData){
		
		let expiration = reportData.expiration || {
			size: 1,
			unit: "days"
		}


		// console.log(" >> expiration", expiration, expiration.size == 0)
		// console.log(" >> mode", mode, mode == "force")
		// console.log(" >> deadline", moment(new Date()).diff(reportData.cachedAt, expiration.unit) >= expiration.size)
		// console.log(" >> cache", reportData.cache, !reportData.cache)
		// console.log(" >> cache._error", reportData.cache._error, !!reportData.cache._error)
				

		if( 
			   expiration.size <= 0	
			|| mode == "force" 
			|| moment(new Date()).diff(reportData.cachedAt, expiration.unit) >= expiration.size
			|| !reportData.cache
			|| reportData.cache._error
		){
			
			builder = new Builder()
			const result = await builder.execute(reportData.data, { reportId })
			reportData.cache = JSON.stringify(
				{
					_log: result._log,
					_error: result._error,
					_publish: result._publish
				}
			)	
			
			reportData.cachedAt = new Date()
			
			await mongodb.replaceOne({
				db: config.db,
				collection: `${config.db.name}.${config.db.reportCollection}`,
				filter:{ id: reportData.id},
				data: reportData
			})

			console.log(`${moment(reportData.cachedAt).format("MMM DD YYYY HH:mm:ss")} Report ${reportData.name} cached`)

		}
		
		res.send(JSON.parse(reportData.cache))

	} else {
		res.send({error: "Not found"})
	}

}

const buildReportFromContent = async (req, res) => {
	
	const reportData = req.body.reportData
	const reportId = req.body.reportId
	if(reportData){
	
		builder = new Builder()
		const result = await builder.execute(reportData, {reportId})
		res.send(result)
	
	} else {
		res.send({error: "Not found"})
	}

}


module.exports = {
	buildReport,
	buildReportFromContent,
	test
}





// const mongodb = require("./mongodb")
// const {extend, sortBy, uniq, flattenDeep, find} = require("lodash")
// const moment = require("moment")
// const uuid = require("uuid").v4 

// const getDatasetList = async (req, res) => {
// 	try {
		
// 		let options = req.body.options
		
// 		options = extend( {}, options, {
// 			collection: `${options.db.name}.dataset`,
// 			pipeline: [   
// 	            {
// 	                $project:{ _id: 0 }
// 	            }
// 	        ] 
// 		})

	
// 		const result = await mongodb.aggregate(options)
// 		res.send(result)
	
// 	} catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}	

// }


// const getGrants = async (req, res) => {
// 	try {
		
// 		let options = req.body.options

// 		options = extend( {}, options, {
// 			collection: `${options.db.name}.${options.db.grantCollection}`,
// 			pipeline: [   
// 	            {
// 	                $project:{ _id: 0 }
// 	            }
// 	        ] 
// 		})

	
// 		const result = await mongodb.aggregate(options)
// 		res.send(result)

// 	}

// 	 catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}
// }

// const getForms = async (req, res) => {
// 	try {
		
// 		let options = req.body.options

// 		let data = await mongodb.aggregate({
// 			db: options.db,
// 			collection: `${options.db.name}.${options.db.examinationCollection}`,
// 			pipeline:  [
// 	          {
// 	            '$match': {
// 	              'patientId': options.id
// 	            }
// 	          }, {
// 	            '$lookup': {
// 	              'from': options.db.formCollection, 
// 	              'localField': 'id', 
// 	              'foreignField': 'examinationId', 
// 	              'as': 'forms'
// 	            }
// 	          }, {
// 	            '$lookup': {
// 	              'from': options.db.userCollection, 
// 	              'localField': 'actorId', 
// 	              'foreignField': 'id', 
// 	              'as': 'physician'
// 	            }
// 	          }, {
// 	            '$lookup': {
// 	              'from': options.db.labelingCollection, 
// 	              'localField': 'id', 
// 	              'foreignField': 'Examination ID', 
// 	              'as': 'records'
// 	            }
// 	          }, {
// 	            '$project': {
// 	              '_id': 0, 
// 	              'type': 1, 
// 	              'comment': 1, 
// 	              'state': 1, 
// 	              'dateTime': 1, 
// 	              'patientId': 1, 
// 	              'forms': 1, 
// 	              'physician': 1, 
// 	              'recordCount': {
// 	                '$size': '$records'
// 	              }
// 	            }
// 	          }, {
// 	            '$project': {
// 	              'records': 0
// 	            }
// 	          }
// 	        ] 
// 		})

// 		data = data[0]

// 	    if(data) {
// 	        let formType = ["patient","echo","ekg"]
// 	        let forms = formType.map( type => {
// 	            let f = find(data.forms, d => d.type == type)
// 	            if(f && f.data){
// 	                let form  = f.data.en || f.data.uk
// 	                if(form) return extend(form, { formType: type} )
// 	            }
// 	        }).filter( f => f)
	        
// 	        let physician
// 	        if( data.physician ){
// 	            physician = data.physician[0]
// 	            physician = (physician) 
// 	                ? {
// 	                    name: `${physician.firstName} ${physician.lastName}`,
// 	                    email: physician.email
// 	                }
// 	                : { name:"", email:"" }
// 	        } else {
// 	            physician = { name:"", email:"" }
// 	        }
	        
	            
// 	        result = {
// 	            examination:{
// 	                patientId: data.patientId,
// 	                recordCount:data.recordCount,
// 	                state: data.state,
// 	                comment: data.comment,
// 	                date: moment(new Date(data.dateTime)).format("YYYY-MM-DD HH:mm:ss"),
// 	                physician
// 	            },
// 	            patient: find(forms, f => f.formType == "patient"),
// 	            ekg: find(forms, f => f.formType == "ekg"),
// 	            echo: find(forms, f => f.formType == "echo"),
// 	        }
// 	    } else {
// 	        result = {}
// 	    }    

// 	    res.send(result)

// 	} catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}
// }

// const getRecord = async (req, res) => {
// 	try {

// 		let options = req.body.options

// 		const result = await mongodb.aggregate({
// 			db: options.db,
// 			collection: `${options.db.name}.${options.db.labelingCollection}`,
// 			pipeline: [   
// 	            {
// 	                $match: { id: options.recordId }
// 	            },
// 	            {
// 	                $project:{ _id: 0 }
// 	            }
	                    
// 	        ]
// 		})

// 		res.send(result[0])

// 	} catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}
// }

// const getMetadata = async (req, res) => {
// 	try {

// 		let options = req.body.options

// 		const result = await mongodb.aggregate({
// 			db: options.db,
// 			collection: `${options.db.name}.${options.db.metadataCollection}`,
// 			pipeline: [   
// 	            {
// 	                $project:{ _id: 0 }
// 	            }
	                    
// 	        ]
// 		})

// 		res.send(result)

// 	} catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}
// }	

// const updateRecord = async (req, res) => {
// 	try {

// 		let options = req.body.options

// 		const result = await mongodb.replaceOne({
// 			db: options.db,
// 			collection: `${options.db.name}.${options.db.labelingCollection}`,
// 			filter:{
//                 id: options.record.id
//             },
//             data: options.record
// 		})

// 		const event = {
// 			id: uuid(), 
// 			labelingId: options.record.id,
// 			todo: options.record.TODO,
// 			assignedBy: options.record["updated by"],
// 			assignedTo: options.record["assigned to"],
// 			date: options.record["updated at"] 
// 		}

// 		await mongodb.replaceOne({
// 			db: options.db,
// 			collection: `${options.db.name}.workflow-events`,
// 			filter:{
//                 id: event.id
//             },
//             data: event
// 		})



// 		res.send(result)

// 	} catch (e) {
// 		res.send({ 
// 			error: e.toString(),
// 			requestBody: req.body
// 		})
// 	}
// }	
	
	
	
// module.exports = {
// 	getDatasetList,
// 	getGrants,
// 	getForms,
// 	getRecord,
// 	getMetadata,
// 	updateRecord
// }