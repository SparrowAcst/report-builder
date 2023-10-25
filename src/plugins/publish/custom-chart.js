const { extend, last, find, isArray } = require("lodash")
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
            "embedded": command.options,
            "script": ""
        },
        "activated": false
    }

    
    return widget
}