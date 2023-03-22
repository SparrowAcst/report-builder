const UUID = require("uuid").v4

const { last, template, templateSettings, extend, isArray, find, set, uniqBy, flattenDeep, sortBy} = require("lodash")

const uuid = () => UUID()
const buildPipeline = require("./query-builder")

const moment = require("moment")
const _ = require("lodash")

const path = require("path")
const YAML = require("js-yaml")
const fs = require("fs")
const loadYaml = filename => YAML.load(fs.readFileSync(path.resolve(filename)).toString().replace(/\t/gm, " "))
const config = loadYaml(path.join(__dirname,"../../../.config/db/mongodb.conf.yml"))

const mongodb = require("../../utils/mongodb")


let pluginContext = {}

const resolveSource = collection => {
	return 	find(pluginContext.temp, c => c == `${pluginContext.id}-${collection}`) || collection
}

const transform = ( script, value ) => {
	try {
		script = script || "value => value"
		return eval(script)(value)

	} catch(e) {

		throw e
	
	}
}



module.exports = {

    register: builder => {
        builderInstance = builder
		pluginContext = {
		    id: uuid(),
			temp: []
		}	
    },


    commands: [

        {
            name: ["query"],
            _execute: async (command, context) => {

            	console.log(command)

            	const query = buildPipeline(pluginContext, command.query)
                console.log(JSON.stringify(query.pipeline, null, " "))

            	await mongodb.aggregate_raw({	
	            	db: config.db,
	            	collection: `${config.db.name}.${query.collection}`,
	            	pipeline: query.pipeline
	            })

            	return context
            }
        },
        {
        	name: ["purge"],
            _execute: async (command, context) => {
            	// console.log(command)
            	for(let index = 0; index< pluginContext.temp.length; index++){
		         
		            console.log("DROP TEMP", pluginContext.temp[index])
		            await mongodb.drop(extend({}, config, {
		            	collection: `${config.db.name}.${pluginContext.temp[index]}`
		            }))
		             

		        }

		        pluginContext.temp = []
                
                return context
            }
        },
        {
        	name: ["aggregate"],
            _execute: async (command, context) => {
            	// console.log(command)
                for (let i = 0; i < command.aggregate.length; i++) {
                    context = await builderInstance.executeOnce(command.aggregate[i], context)
                }
				return context
            }	
        },
        {
        	name: ["histogram", "hist"],
            _execute: async (command, context) => {
        
            	// console.log(command)
        		
        		command.histogram.label = (isArray(command.histogram.label)) ? command.histogram.label : [command.histogram.label]

                let pipeline = {
					$facet: {
					} 
				}
		
				command.histogram.label.forEach( f => {
					pipeline.$facet[f] = [
						{
							$unwind:{
					            path: `$${f}`,
					            preserveNullAndEmptyArrays: true
					        }
					    }, 
						{
					      "$group": {
					       "_id": `$${f}`,
					       "count": {
					        "$count": {}
					       }
					      }
					     },
					    {
					      "$project": {
					       "_id": 0,
					       "value": "$_id",
					       "count": "$count"
					      }
					    }
					]    
		    		
				})

				let value = await mongodb.aggregate_raw({	
	            	db: config.db,
	            	collection: `${config.db.name}.${resolveSource(command.histogram.from)}`,
	            	pipeline: [pipeline]
	            })

				value = transform( command.histogram.transform, value[0] )

				set(context, command.histogram.into, value)
                
                return context
            }
        },

        {
        	name: ["timeline", "timeseries"],
            _execute: async (command, context) => {
        
            	console.log(command)
        		
        		command.timeline.groupBy = (isArray(command.timeline.groupBy)) ? command.timeline.groupBy : [command.timeline.groupBy]

        		let pipeline = []

				let current = {
					$sort:{}
				}

				current.$sort[command.timeline.date] = 1
				pipeline.push(current)

				current = {
					$group:{
						_id: {},
						count:{
							$count:{}
						}
					}
				}
				current.$group._id[command.timeline.date] = `$${command.timeline.date}`
				command.timeline.groupBy.forEach(key => {
					current.$group._id[key] = `$${key}`
				})
				pipeline.push(current)

				current = {
					$project:{
						_id: 0,
						value: "$count"
					}
				}
				current.$project[command.timeline.date] = `$_id.${command.timeline.date}`
				command.timeline.groupBy.forEach(key => {
					current.$project[key] = `$_id.${key}`
				})
				pipeline.push(current)

				current = {
					$sort:{}
				}
				current.$sort[command.timeline.date] = 1
				pipeline.push(current)

				current = {
					$group:{
						_id: {},
						data:{
							$push:{
								value: '$value'		
							}
						}
					}
				}
				command.timeline.groupBy.forEach(key => {
					current.$group._id[key] = `$${key}`
				})
				current.$group.data.$push["date"] = `$${command.timeline.date}`
				pipeline.push(current)

				current = {
					$project:{
						_id: 0,
						name:{
							$concat:[]
						},
						data: "$data"
					}
				}

				command.timeline.groupBy.forEach(key => {
					current.$project.name.$concat.push(`$_id.${key}`)
					current.$project.name.$concat.push(" ")
				})

				pipeline.push(current)

				// console.log(JSON.stringify(pipeline, null, " "))

				let value = await mongodb.aggregate_raw({	
	            	db: config.db,
	            	collection: `${config.db.name}.${resolveSource(command.timeline.from)}`,
	            	pipeline
	            })

				let dates = sortBy( uniqBy( flattenDeep( value.map( v => v.data.map( d => d.date )))))
				
				value.forEach( serie => {
					serie.data = dates.map( date =>{
						const f = find(serie.data, d => d.date == date)
						return {
								date,
								value: (f) ? f.value : 0 
						}
					})

					return serie
				})

				value = transform( command.timeline.transform, value )

				set(context, command.timeline.into, value)
                
                return context
			
            }
        },

        {
        	name: ["count", "length"],
            _execute: async (command, context) => {
        
            	console.log(command)
        		
        		let pipeline = [{$count: "count"}]

				let value = await mongodb.aggregate_raw({	
	            	db: config.db,
	            	collection: `${config.db.name}.${resolveSource(command.count.from)}`,
	            	pipeline: pipeline
	            })

				value = transform( command.count.transform, value[0] )

				set(context, command.count.into, value)
                
                return context

            }	
        },
        {
        	name: ["set", "fetch", "copy"],
            _execute: async (command, context) => {
        
            	console.log(command)
        		
        		let pipeline = [
				  {
				    '$match': {}
				  }, {
				    '$limit': 50
				  },
				  {
				  	$project:{
				  		_id: 0
				  	}
				  }
				]
				
				let value = await mongodb.aggregate_raw({	
	            	db: config.db,
	            	collection: `${config.db.name}.${resolveSource(command.set.from)}`,
	            	pipeline: pipeline.concat([{$limit: 50}])
	            })

				value = transform( command.set.transform, value )
				
				set(context, command.set.into, value)
                
                return context

            }	
        },
        {
        	name: ["value", "const"],
            _execute: async (command, context) => {
        
            	console.log(command)
        		
				value = transform( command.value.transform )

				set(context, command.value.into, value)
                
                return context

            }	
        }    
    ]
}