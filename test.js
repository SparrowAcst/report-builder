const Builder = require("./index")
const fs = require("fs")

const run = async () => {
	const script = fs.readFileSync("./publish.yml").toString()
	builder = new Builder()
	let context = {
		a:{
			columns:[
				"First",
				"Second",
				"Next"
			]
		}
	}

	const res = await builder.execute(script, context)
	console.log(JSON.stringify(res.$publish, null, " "))
}

run()