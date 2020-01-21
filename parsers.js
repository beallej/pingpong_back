function parseTxt(txtRaw){
    let srcRegEx = /__SRC__(.*)__END_SRC__/;
    let srcMatches = srcRegEx.exec(txtRaw);
    let src = srcMatches[1];
    console.log("SRC!", srcMatches)
    let trRegEx = /__BEGIN_([0-9]+)_TR__(.*)__END_(\1)_TR__/g;
    let resJSON = {}
    resJSON["src"] = src;
    resJSON["traceroutes"] = [];
    let result;

    while (result = trRegEx.exec(txtRaw)) {
        console.log(result[2], "\n\n");
        let tr = result[2];
        let dstRegEx =  /__DST__(.*)__END_DST__/;
        let dstRes = dstRegEx.exec(tr);
        let dst = dstRes[1];
        let trObj = {dst: dst, route: []};
        let regExAddress = /(?!(traceroute to .*))\(([^)]+)\)(?!.*hops max)/g; //to match text between ()
        // var regExAddress = /\(([^)]+)\)/g;//to match text between ()
        let addressResult;
        while(addressResult = regExAddress.exec(tr)) {
            let hop = addressResult[1];
            trObj.route.push(addressResult[1])
        }
        resJSON.traceroutes.push(trObj)
    }
    return resJSON;
}

function consdenseIPData(userIps, intermediateIps){
    let userIpsReformatted = {};
    userIps.map((ip) => {
        if (!userIpsReformatted[ip.latitude]) userIpsReformatted[ip.latitude] = {};
        if (!userIpsReformatted[ip.latitude][ip.longitude]) userIpsReformatted[ip.latitude][ip.longitude] = {}
        if (ip.isp) userIpsReformatted[ip.latitude][ip.longitude][ip.isp] = true;
    })

    let intermediateIpsReformatted = {};
    intermediateIps.map((ip) => {
        if (!intermediateIpsReformatted[ip.latitude]) intermediateIpsReformatted[ip.latitude] = {};
        if (!intermediateIpsReformatted[ip.latitude][ip.longitude]) intermediateIpsReformatted[ip.latitude][ip.longitude] = {}
        if (ip.isp) intermediateIpsReformatted[ip.latitude][ip.longitude][ip.isp] = true;
    })

    let allIps = [];
    Object.keys(userIpsReformatted).map((lat) => {
        Object.keys(userIpsReformatted[lat]).map((lon) => {
            let isps = Object.keys(userIpsReformatted[lat][lon]);
            let label = "ISPs: " + isps.join(", ");
            let dataPoint = {
                latitude: lat,
                longitude: lon,
                label: label,
                type: "USER"
            }
            allIps.push(dataPoint)
        })
    })
    Object.keys(intermediateIpsReformatted).map((lat) => {
        Object.keys(intermediateIpsReformatted[lat]).map((lon) => {
            let isps = Object.keys(intermediateIpsReformatted[lat][lon]);
            let label = "ISPs: " + isps.join(", ");
            let dataPoint = {
                latitude: lat,
                longitude: lon,
                label: label,
                type: "INTERMEDIATE"
            }
            allIps.push(dataPoint)
        })
    })

    return allIps;

}

function condenseTracerouteData(traceroutes){
    let traceroutesObj = {}
    traceroutes.map((tr) => {
        let src = tr.src.properties;
        let target = tr.target.properties;
        if (!traceroutesObj[src.latitude]) traceroutesObj[src.latitude] = {};
        if (!traceroutesObj[src.latitude][src.longitude]) traceroutesObj[src.latitude][src.longitude] = {};
        if (!traceroutesObj[src.latitude][src.longitude][target.latitude]) traceroutesObj[src.latitude][src.longitude][target.latitude] = {};
        if (!traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude]) traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude] = 0;
        traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude] += 1;
    })
    let traceroutesCondensed=[]

    Object.keys(traceroutesObj).map((srcLat) => {
        Object.keys(traceroutesObj[srcLat]).map((srcLon) => {
            Object.keys(traceroutesObj[srcLat][srcLon]).map((tarLat) => {
                Object.keys(traceroutesObj[srcLat][srcLon][tarLat]).map((tarLon) => {
                    let freqRaw = traceroutesObj[srcLat][srcLon][tarLat][tarLon];
                    let freqRelative = freqRaw/traceroutes.length;
                    let dataPoint = {
                        src: {
                            latitude: srcLat,
                            longitude: srcLon
                        },
                        target: {
                            latitude: tarLat,
                            longitude: tarLon
                        },
                        frequency: freqRelative
                    }
                    if (!((srcLat === tarLat) && (srcLon === tarLon))) {
                        traceroutesCondensed.push(dataPoint)
                    }
                })
            })
        })
    })
    return traceroutesCondensed;

}
// var fs = require('fs');
// var txt = fs.readFileSync('test.txt').toString()
// console.log(JSON.stringify(parseTxt(txt)))
module.exports = {parseTxt, consdenseIPData, condenseTracerouteData};
