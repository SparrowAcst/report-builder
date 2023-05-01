const UUID = require("uuid").v4
const { last, template, templateSettings, extend, isArray, get } = require("lodash")

const uuid = () => last(UUID().split("-"))

let compile = (_template, context) => {

    templateSettings.interpolate = /\$\{([\s\S]+?)\}/g;

    let result = template(_template)(context)

    templateSettings.interpolate = /<%=([\s\S]+?)%>/g;

    return result

}



const pieChart = require("./pie-chart")
const barChart = require("./bar-chart")
const timeChart = require("./time-chart")
const tableWidget = require("./table")
const downloadWidget = require("./download")



module.exports = {

    register: builder => {
   
        builderInstance = builder

    },


    commands: [

        {
            name: ["publish"],
            _execute: async (command, context) => {
                for (let i = 0; i < command.publish.length; i++) {
                    context = await builderInstance.executeOnce(command.publish[i], context)
                }
                return context
            }
        },

        {
        	name:["section"],
        	_execute: async (command, context) => {
 
        		let product = {
        			align: command.section.align || "justify-start",
        			holders:[]
        		}

        		for (let i = 0; i < command.section.columns.length; i++){
        			const h = await builderInstance.executeOnce(command.section.columns[i], context)
        			product.holders.push(h) 
        		}

        		context._publish = context._publish || []
        		context._publish.push(product)
        		return context	
        	}
        },

        {
        	name:["column"],
        	_execute: async (command, context) => {
 
                const id = uuid()
        		let product = {
        			id, 
        			name: id,
        			width: command.column.width,
        			activated: false,
        			widgets: []
        		}

        		for (let i = 0; i < command.column.widgets.length; i++){
        			const w = await builderInstance.executeOnce(command.column.widgets[i], context)
        			product.widgets.push(w) 
        		}

        		return product

        	}
        },

        {
        	name:["markdown", "text"],
        	_execute: async (command, context) => {

        		let data = get(context, command.markdown.from) || context
                const id = uuid()

                let product = {
        		    type: "md-widget",
        		    icon: "mdi-language-markdown-outline",
        		    id,
        		    name: id,
        		    activated: false,

        		    "options": {
        		        "widget": {
        		            "visible": true
        		        },
                        style: `widget-style {${command.style}}`
        		    },
        		    "data": {
        		        "source": "embedded",
        		        "embedded": compile(command.markdown.content, data),
        		        "script": ""
        		    }

        		}

        		return product
        	}
        },

        {
        	name:["pie-chart"],
        	_execute: async (command, context) => {
                
                let data = get(context, command["pie-chart"].from)  || context 
                return pieChart(extend({}, command["pie-chart"], { from: data}))
            }
        },

        {
            name:["bar-chart"],
            _execute: async (command, context) => {
                
                let data = get(context, command["bar-chart"].from)  || context
                const res =  barChart(extend({}, command["bar-chart"], { from: data}))
                return res
            
            }
        },

        {
            name:["time-chart"],
            _execute: async (command, context) => {
                
                let data = get(context, command["time-chart"].from)  || context
                const res =  timeChart(extend({}, command["time-chart"], { from: data}))
                return res
            
            }
        },

        {
            name:["table"],
            _execute: async (command, context) => {
                
                let data = get(context, command["table"].from)  || context
                const res =  tableWidget(extend({}, command["table"], { from: data}))
                return res
            
            }
        },

        {
            name:["download"],
            _execute: async (command, context) => {
                
                let data = get(context, command["download"].from)  || context
                const res =  downloadWidget(extend({}, command["download"], { from: data}), context)
                return res
            
            }
        },

    ]
}