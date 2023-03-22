const Builder = require("./src/builder")
const fs = require("fs")

const run = async () => {
	const script = fs.readFileSync("./query.yml").toString()
	builder = new Builder()
	
	const res = await builder.execute(script, {})
	console.log(JSON.stringify(res, null, " "))
}

run()