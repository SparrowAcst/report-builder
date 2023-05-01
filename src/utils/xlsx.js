const xlsx = require("xlsx")
const path = require("path")
const { keys, uniq, isArray } = require("lodash")

let newWb = () => xlsx.utils.book_new()

let loadXlsxWb = async (filename) => {
	let d = await xlsx.readFile(path.resolve(filename))
	return d
}

let wb2json = wb => {
	for(i in wb.Sheets){
		wb.Sheets[i] = xlsx.utils.sheet_to_json(wb.Sheets[i]);	
	}
	return wb.Sheets	
}

const loadXlsx = async filename => {
	let wb = await loadXlsxWb(path.resolve(filename))
	return wb2json(wb)
}

let aoa2ws = aoa => xlsx.utils.aoa_to_sheet(aoa)

let addWs = (wb, ws, ws_name) => {
	xlsx.utils.book_append_sheet(wb, ws, ws_name)
}

let writeXlsxWb = (wb, filename) => {
	xlsx.writeFile(wb, path.resolve(filename))
}	


const resolveFile = (filePath, defaultFilename) => {
	const d = path.parse(path.resolve(filePath))
	return (d.ext)
				?  filePath
				: `${filePath}/${defaultFilename}`
}


let prepareInputData = async config => {
	console.log("load", path.resolve(resolveFile(config.path, config.parameters.defaultfilename)))
	let inputData
	try {
		let wb = await loadXlsxWb(resolveFile(config.path, config.parameters.defaultfilename))
		let res = wb2json(wb)
		inputData = res[config.sheet]
	} catch (e) {
		console.log(e.toString())
		throw e
	}
		 
	console.log(inputData.length," items")
	
	if(config.preprocess){
	
		if(config.preprocess.select){
			inputData = inputData.filter( d => {
				let value = eval(config.preprocess.select.by)(d)
				return (config.preprocess.select.includes)
							? (config.preprocess.select.excludes)
								? config.preprocess.select.includes.includes(value) && !config.preprocess.select.excludes.includes(value)
								: config.preprocess.select.includes.includes(value)
							: (config.preprocess.select.excludes)
								? !config.preprocess.select.excludes.includes(value)
								: true
			})
		}

		if (config.preprocess.properties){
			
			if (config.preprocess.properties.includes){
				config.preprocess.properties.includes = isArray(config.preprocess.properties.includes) ? config.preprocess.properties.includes : [config.preprocess.properties.includes]
				inputData.forEach( (d, index) => {
					config.preprocess.properties.includes.forEach(i => {
						// console.log(i.name, eval(i.value)(d,index))
						d[i.name] = eval(i.value)(d,index)
						console.log(`${i.name} = ${JSON.stringify(d[i.name])}`)
					})
				})
			}

			if (config.preprocess.properties.excludes){
				config.preprocess.properties.excludes = isArray(config.preprocess.properties.excludes) ? config.preprocess.properties.excludes : [config.preprocess.properties.includes]
				inputData.forEach( d => {
					config.preprocess.properties.excludes.forEach(i => {
						delete d[i]
					})	
				})
			}	
		}


		inputData = inputData.map( d => {
			d.spectrum = []
			for (let i=config.parameters.frequency.range[0]; i<=config.parameters.frequency.range[1]; i++) d.spectrum.push(d[i+''])
			return d
		})


		if( config.preprocess.split ){
			const splitter = eval(config.preprocess.split.by)
			
			let groups = uniq(inputData.map(splitter))
			.map( g => inputData.filter( d => splitter(d) == g))

			inputData = groups.map( g => {
				// console.log("Spectra set: ", g) 
				let res = {}
				config.preprocess.split.includes.forEach( (v) => {
					res[v.name] = eval(v.value)(g)
				})
				res.spectrum = g.map( d => d.spectrum) 							
				return res
			})
		} else {
			inputData = [inputData]
		}
	}
	

	// let header = keys(res.Sheet1[0]).filter( d => d != "Model" && d != "File name").splice(range[0],range[1]-range[0]+1)
	// let left_cols = []
	
	// res = res.Sheet1.map( d => {
	// 	let tmp = []
	// 	for (let i=range[0]; i<=range[1]; i++) tmp.push(d[i+''])
	// 	left_cols.push([d.Model, d['File name']])
	// 	return tmp
	// })
	
	// data = []
	
	// if( split ){
	// 	let names = uniq(left_cols.map(d => d[0]))
	// 	names.forEach( name => {
	// 		data.push({
	// 			name: (serieName) ? (serieName.startsWith("-") ? name+serieName : serieName+serieName) : "",
	// 			spectrum: res.filter( (d, index) => left_cols[index][0] == name),
	// 			modelMetadata: left_cols.filter(d => d[0] == name),
	// 			header: [header]
	// 		})
	// 	})
	// } else {
	// 	data.push({
	// 		name: serieName || "",
	// 		range,
	// 		spectrum: res,
	// 		modelMetadata: left_cols,
	// 		header: [header]
	// 	})
	// }

	// console.log(header)
	return inputData
}



module.exports = {
	loadXlsx,
	loadXlsxWb,
	wb2json,
	aoa2ws,
	writeXlsxWb,
	addWs,
	newWb,
	prepareInputData
}