function parseTxt(txtRaw){

    let lines = txtRaw.split("\n")
    let txt = lines.filter(el => !el.includes("* * *"))


    let resJSON = {}
    resJSON["traceroutes"] = []
    var regExp = /\(([^)]+)\)/;//to match text between ()
    var i = 0 ; 
    while (i < txt.length-1) {
        if ( txt[i].includes("traceroute to")) {
             var y = i ;
             let traceroute = {}
            var matches = regExp.exec(txt[i])

            traceroute["dst"] = matches[1]
            traceroute["route"] = []
            y++ ;
            while (!txt[y].includes("traceroute to") && !txt[y].includes("Src is")) {
                if ( !txt[y+1].includes("traceroute to")) {
                var matches2 = regExp.exec(txt[y])
                if (matches2 !==null ) {
                    traceroute["route"].push(matches2[1])
                }
                y++
                }
                if ( txt[y+1].includes("traceroute to") || txt[y+1].includes("Src is")) {
                    var matches2 = regExp.exec(txt[y])
                    if (matches2 !==null ) {
                        traceroute["route"].push(matches2[1])
                        }
                    y++
                    }
            }
            resJSON.traceroutes.push(traceroute)
            i = y ;
        }

        if (txt[i].includes("Src is")) {
            i++ ;
            resJSON["src"] = txt[i];
        }
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

module.exports = {parseTxt, consdenseIPData, condenseTracerouteData};
