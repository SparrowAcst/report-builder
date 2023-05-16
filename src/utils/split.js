const {
    groupBy,
    keys,
    values,
    remove,
    extend,
    sortBy,
    find,
    flattenDeep
} = require("lodash")

const {
    MersenneTwister19937,
    integer,
    Random,
    shuffle
} = require('random-js')

const engine = MersenneTwister19937.autoSeed()

const deepExtend = require('deep-extend')


// const mem = (msg) => {
//     const used = process.memoryUsage();
//     console.log(`${msg} :Memory usage: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
//     return used.rss
// }


const calkEntropy = p => {

    var n = p.length;
    var e = 0.0;
    for (var i = 0; i < n; ++i) {
        if (p[i] > 0) e -= p[i] * Math.log(p[i], 2);
    }
    return e;

};

const probabilities = hist => {
    let total = hist.map(v => v.count).reduce((a, c) => a + c, 0)
    hist.forEach(h => {
        h.p = h.count / total
    })
    return hist.map(v => v.p)
}

const criteria = hist => (hist.length <= 1) ? 0 : calkEntropy(probabilities(hist)) / Math.log(hist.length, 2)

const fetch = (samples, count) => {
    shuffle(engine, samples)
    let res = samples.splice(0, count)
    return res
}


const calcHist = (samples, props) => {
    let res = {}
    props.forEach(prop => {
        res[prop] = []
    })

    samples.forEach(sample => {
        props.forEach(prop => {
            let value = sample[prop]
            let f = find(res[prop], r => r.value == value)
            if (f) {
                f.count++
            } else {
                res[prop].push({
                    value: value,
                    count: 1
                })
            }
        })
    })

    return res
}

const score = (serie, props) => {
    let stat = serie.stat

    let res = {}
    let w = props.map((p, index) => Math.pow(2, -1.8 * index))
    let t = w.reduce((a, c) => a + c, 0)
    w = w.map(d => d / t)
    props.forEach(prop => {
        res[prop] = criteria(stat[prop])
        res.$count = stat[prop].map(d => d.count).reduce((a, c) => a + c, 0)
    })
    res.$value = props.map((key, index) => w[index] * res[key]).reduce((a, c) => a + c, 0)
    return res

}

const gap = (serie, candidate) => {
    stat = extend({}, serie.stat)

    keys(stat).forEach(key => {
        stat[key] = stat[key].map(d => d)
    })
    let before = score({ stat, options: serie.options }, serie.options.balancedBy || [])

    keys(stat).forEach(v => {
        let value = candidate[v]
        let f = find(stat[v], d => d.value == value)
        if (f) {
            f.count -= 1
        } else {
            stat[v].push({
                value: v.value,
                count: -1
            })
        }
    })
    let after = score({ stat, options: serie.options }, serie.options.balancedBy || [])

    return after.$value - before.$value
}

const getMinGroup = groups => {
    let res = groups[0]
    groups.forEach(g => {
        if (g.length <= res.length) res = g
    })
    return res
}

const getMaxGroup = groups => {
    let res = groups[0]
    groups.forEach(g => {
        if (g.length >= res.length) res = g
    })
    return res
}

const reduce = serie => {

	// mem(" => reduce")

    let groups = values(groupBy(serie.samples, d => d[serie.options.predictedBy]))
    let minGroup = getMinGroup(groups)
    let maxGroup = getMaxGroup(groups)

    for (; minGroup.length < maxGroup.length;) {
        let s = {
            options: serie.options,
            samples: maxGroup,
            stat: calcHist(maxGroup, (serie.options.balancedBy || []))
        }
        s.score = score(s, serie.options.balancedBy || [])

        let temp = maxGroup.map((d, index) => ({ index, gap: gap(s, d) }))
        temp = sortBy(temp, d => -d.gap).map(d => d.index)
        const partition = 20
        const size = ((maxGroup.length - minGroup.length) > partition) ? partition : maxGroup.length - minGroup.length


        temp = temp.splice(0, size)

        remove(maxGroup, (d, index) => temp.includes(index))

        minGroup = getMinGroup(groups)
        maxGroup = getMaxGroup(groups)

    }

    serie.samples = flattenDeep(groups)
    serie.stat = calcHist(serie.samples, [serie.options.predictedBy].concat(serie.options.balancedBy || []))
    serie.score = score(serie, [serie.options.predictedBy].concat(serie.options.balancedBy || []))

    // mem(" reduce =>")

    return serie

}

const split = options => {

    let data = options.from || []
    
    if(data.length == 0) return data


    data = values(groupBy(data, d => d[options.splitedBy]))

    const size = data.length

    let series = deepExtend(options.series).map(s => {
        s.options = options
        return s
    })

    series.forEach(serie => {
        serie.samples = flattenDeep(fetch(data, Math.floor(size * serie.fraction))).map( d => {
        	d[(options.field || "serie")] = serie.name
        	return d
        })
        serie = reduce(serie)
        // mem("split")
        // serie.stat = calcHist(serie.samples, [serie.options.predictedBy].concat(serie.options.balancedBy || []))
        // serie.score = score(serie, [serie.options.predictedBy].concat(serie.options.balancedBy || []))
    })

    return flattenDeep(series.map( s => s.samples))

}


module.exports = split


// let data = require("../../data/samples/samples5.json").filter(d => d.examination) //.filter(d => d.vars.informativeness)


// let options = {
	
// 	from: data,
// 	field: "serie",
//     predictedBy: "informativeness",
//     balancedBy: [
//         "confidence",
//         "examination"
//     ],
//     splitedBy: "examination",

//     series: [{
//             name: "train",
//             fraction: 0.7,
//         },
//         {
//             name: "test",
//             fraction: 0.2,
//         },
//         {
//             name: "validate",
//             fraction: 0.1,
//         }

//     ]
// }

// let res = split(options)

// console.log(JSON.stringify(res, null, " "))