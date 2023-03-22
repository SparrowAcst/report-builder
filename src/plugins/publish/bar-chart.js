const { extend, last } = require("lodash")
const deepExtend = require("deep-extend")

const UUID = require("uuid").v4
const uuid = () => last(UUID().split("-"))





// command.height
// command.from
// command.asCategory
// command.asValue


module.exports = command => {
    
    console.log("!!!!", command)


    const id = uuid()
    
    let  widget = {
        "type": "chart-low-level-widget",
        id,
        "name": id, //TODO
        "icon": "mdi-chart-box-outline",
        "options": {
            "widget": {
                "visible": true,
                "height": command.height || 250
            },
            style: `widget-style {${command.style}}`
        },
        "data": {
            "source": "embedded",
            "embedded": {},
            "script": ""
        },
        "activated": false
    }

    const data = {
      xAxis: {
        type: (command.vertical) ? "category" : "value",
        data: (command.vertical) ? command.from.map( d => d[command.asCategory]) : undefined
      },
      yAxis: {
        type: (command.vertical) ? "value" : "category",
        data: (command.vertical) ? undefined : command.from.map( d => d[command.asCategory])  
      
      },

      series: [
        {
          data: command.from.map( d => d[command.asValue]), 
          type: 'bar',
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(180, 180, 180, 0.2)'
          }
        }
      ]
    }

    widget.data.embedded = data
    
    return widget
}