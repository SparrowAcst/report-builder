const { extend, last, find } = require("lodash")
const deepExtend = require("deep-extend")

const UUID = require("uuid").v4
const uuid = () => last(UUID().split("-"))


module.exports = command => {
    

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


    let visualData

    if(command.legend) {
        visualData = command.legend.map( d => {
        let f = find(command.from, s => s[command.asCategory] == d.name)
            return {
                name: d.name,
                value: (f) ? f[command.asValue] : 0,
                itemStyle:{
                    color: d.color
                }    
            }
        }).filter( d => d.value > 0)
    
        // command.legend = command.legend.filter( l => find(visualData, v => v.name == l.name))

    } else {
        visualData = command.from.map(d => ({
            name: d[command.asCategory],
            value: d[command.asValue]
        }))
        
        // command.legend = visualData.map( d => ({name: d.name}))
    }




    const data = {
      
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },

      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
  
      xAxis: {
        type: (command.vertical) ? "category" : "value",
        data: (command.vertical) ? visualData.map( d => d.name) : undefined
      },
      
      yAxis: {
        type: (command.vertical) ? "value" : "category",
        data: (command.vertical) ? undefined : visualData.map( d => d.name)  
      
      },

      color: command.color,
      
      series: [
        {
          data: visualData, 
          type: 'bar',
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(180, 180, 180, 0.2)'
          },

          label: {
              show: true,
              precision: 1,
              position: (command.vertical) ? 'top' : 'right',
              fontWeight: "bold"
          }
        }
      ]
    }

    widget.data.embedded = data
    
    return widget
}