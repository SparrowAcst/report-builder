const { extend, isArray, keys, isString, get, isFunction, flatten, isObject, first } = require("lodash")
const YAML = require("js-yaml")

const publishPlugin = require("./plugins/publish/publish-plugin")
const queryPlugin = require("./plugins/query/query-plugin")

// const pluginsNames = {
// 	// "cheerio-plugin"		: "./plugins/cheerio-scanany-plugin",
// 	// "js-plugin"				: "./plugins/js-scanany-plugin",
// 	// "pdf-plugin"			: "./plugins/pdf-scanany-plugin",
// 	// "docx-plugin"			: "./plugins/docx-scanany-plugin",
// 	// "xlsx-plugin"			: "./plugins/xlsx-scanany-plugin",
// 	// "file-plugin"			: "./plugins/file-scanany-plugin",
// 	// "mongodb-plugin"		: "./plugins/mongodb-scanany-plugin",
// 	// "mysql-plugin"			: "./plugins/mysql-scanany-plugin",
// 	// "transform-plugin"		: "./plugins/transform-scanany-plugin",
// 	// "rss-plugin"			: "./plugins/rss-scanany-plugin",
// 	// "puppeteer-plugin"		: "./plugins/puppeteer-scanany-plugin",
// 	// "axios-plugin"			: "./plugins/axios-scanany-plugin",
// 	// "core-plugin"			: "./plugins/core-scanany-plugin",
// 	// "cast-plugin"			: "./plugins/cast-scanany-plugin",
// 	// "regex-plugin"			: "./plugins/regex-scanany-plugin",

// }

// const resolvePluginPath = plugin => pluginsNames[plugin] || plugin

const Builder = class {
	#plugins
	#commandImplementations
	#commandPath

	constructor(){
		this.#plugins = []
		this.#commandImplementations = []
		this.use([
			publishPlugin,
			queryPlugin
		])
	}

	use(plugins){
		plugins = (isArray(plugins)) ? plugins : [plugins]
		plugins.forEach( plugin => {
			// plugin = resolvePluginPath(plugin)
			// if(!this.#plugins.includes(plugin)) {
				this.#plugins.push(plugin)
				this.register(plugin)
			// }	
		})
	}

	register(plugins){
		plugins = (isArray(plugins)) ? plugins : [plugins]
		plugins.forEach( plugin => {
			if(plugin.register) plugin.register(this)
			this.#commandImplementations = this.#commandImplementations.concat(plugin.commands || [])	
		})
	}

	// resolveValue(raw, context){
	// 	if(!raw) return
	// 	if(raw.$ref) {
	// 		return get(context, raw.$ref)
	// 	}
	// 	if(raw.$const) {
	// 		return raw.$const
	// 	}
	// 	return raw 
	// }

	async executeOnce(command, context, sender){
		console.log("EXECUTE",command)
		let commandName = first(keys(command))
		
		let executor = this.#commandImplementations.filter(rule => rule.name.includes(commandName))
		if( executor.length < 2){
			executor = executor[0]
		} else {
			throw new Error(`Multiple determination of "${commandName}". Command aliases (${flatten(executor.map( e => e.name)).join(", ")}) required.`)
		}

		if(executor){
			if(!isFunction(executor)){
				if(executor._execute){
					executor = executor._execute
				} else {
					throw new Error(`"${commandPath.join(".")}._execute" command not implemented`)		
				}
			}

			let ctx = await executor(command, context, sender)
			context = (isObject(ctx)) ? (!isArray) ? Object.assign({}, context, ctx) : ctx : ctx
			return context	
		} else {
			throw new Error(`"${commandName}" command not implemented`)
		}
	}

	async execute(script, context){
		try {
		
			if(!script) return context

			if(isString(script)){
				script = YAML.load(script.replace(/\t/gm, " "))
			}

			script = (isArray(script)) ? script : [script]
			context = context || {}
			
			this.#commandPath = []
			for( let i=0; i < script.length; i++ ){
				let ctx = await this.executeOnce(script[i], context)
				context = (ctx) ? ctx : context  
			}

			return context
		
		} catch(e) {
			context.error = e.toString()
			return context
		}	
	}

}


module.exports = Builder