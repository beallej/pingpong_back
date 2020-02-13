
/*** Parse the body sent from pingpong.sh curl or wget command containing traceroute info.
 * params: txtRaw: the traceroute info as a string
 * ***/
function parseTxt(txtRaw){
    //remove new line chars (if they exist, different for different OS)
    let txt = txtRaw.replace(/\n|\r/g,'');

    //parse src ip
    let srcRegEx = /__SRC__(.*)__END_SRC__/;
    let srcMatches = srcRegEx.exec(txt);
    let src = srcMatches[1].trim();
    console.log("SRC: ", srcMatches);

    //set up response obj
    let resJSON = {}
    resJSON["src"] = src;
    resJSON["traceroutes"] = [];


    //parse traceroutes
    let result;
    let trRegEx = /__BEGIN_([0-9]+)_TR__(.*)__END_(\1)_TR__/g;

    //for each traceroute
    while (result = trRegEx.exec(txt)) {

        //tr is one traceroute as a raw string
        let tr = result[2];

        //parse dst from traceroute
        let dstRegEx =  /__DST__(.*)__END_DST__/;
        let dstRes = dstRegEx.exec(tr);
        let dst = dstRes[1].trim();

        //parse traceroute body
        let trObj = {dst: dst, route: []};
        let regExAddress = /(?!(traceroute to .*))\(([^)]+)\)(?!.*hops max)/g; //to match text between ()
        let addressResult;

        //parse out addresses found
        while(addressResult = regExAddress.exec(tr)) {
            console.log(addressResult)
            trObj.route.push(addressResult[2])
        }
        resJSON.traceroutes.push(trObj)
    }
    return resJSON;
}

function parseTxtBatch(txtRaw){
    //remove new line chars (if they exist, different for different OS)
    let txt = txtRaw.replace(/\n|\r/g,'');

    //parse src ip
    let srcRegEx = /_SRC_(.*)_END_SRC_/;
    let srcMatches = srcRegEx.exec(txt);
    let src = srcMatches[1].trim();
    console.log("SRC: ", srcMatches);

    //set up response obj
    let resJSON = {}
    resJSON["src"] = src;
    resJSON["traceroutes"] = [];


    //parse traceroutes
    let result;
    let trRegEx = /_BEGIN_([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})_TRACEROUTE_(.*)_END_(\1)_TRACEROUTE_/g;


    //for each traceroute
    while (result = trRegEx.exec(txt)) {

        //tr is one traceroute as a raw string
        let tr = result[2];

        // //parse dst from traceroute
        // let dstRegEx =  /__DST__(.*)__END_DST__/;
        // let dstRes = dstRegEx.exec(tr);
        // let dst = dstRes[1].trim();
        let dst = result[1];

        //parse traceroute body
        let trObj = {dst: dst, route: []};
        let regExAddress = /  ([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/g;
        let addressResult;

        //parse out addresses found
        while(addressResult = regExAddress.exec(tr)) {
            console.log(addressResult)
            trObj.route.push(addressResult[1])
        }
        resJSON.traceroutes.push(trObj)
    }
    return resJSON;



}

function parseTxtBatch2(txtRaw){
    //remove new line chars (if they exist, different for different OS)
    let txt = txtRaw.replace(/\n|\r/g,'');

    //parse src ip
    let srcRegEx = /_SRC_(.*)_END_SRC_/;
    let srcMatches = srcRegEx.exec(txt);
    let src = srcMatches[1].trim();
    console.log("SRC: ", srcMatches);

    //set up response obj
    let resJSON = {}
    resJSON["src"] = src;
    resJSON["traceroutes"] = [];


    //parse traceroutes
    let result;
    let trRegEx = /termination(.*?)raire d/g;


    //for each traceroute
    while (result = trRegEx.exec(txt)) {

        //tr is one traceroute as a raw string
        let tr = result[1];

        //parse dst from traceroute
        let dstRegEx =  /ers (.*)avec/;
        let dstRes = dstRegEx.exec(tr);
        let dst = dstRes[1].trim();

        //parse traceroute body
        let trObj = {dst: dst, route: []};
        let regExAddress = /  ([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/g;
        let addressResult;

        //parse out addresses found
        while(addressResult = regExAddress.exec(tr)) {
            console.log(addressResult)
            trObj.route.push(addressResult[1])
        }
        resJSON.traceroutes.push(trObj)
    }
    return resJSON;



}

/*** Condenses all user and intermediate ip addresses based on the location to easily display on the map.
 * params:
 *      userIps:
 *          [
 *              {   address: '111.22.333',
 *                  latitude: 4.33,
 *                  longitude: 2.22,
 *                  asn: 'AS222',
 *                  isp: 'My isp'
 *              },
 *          ]
 *      intermediateIps:
 *          [
 *              {   address: '111.22.333',
 *                  latitude: 4.33,
 *                  longitude: 2.22,
 *                  asn: 'AS222',
 *                  isp: 'My isp'
 *              },
 *          ]
 *
 *
 *  returns:
 *
 * [
 *   {
 *       latitude: 44.2,
 *       longitude: 2.3,
 *       label: "ISPs: My ISP1, My ISP2",
 *       type: "USER"
 *    },
 *    {
 *       latitude: 45.2,
 *       longitude: 2.33,
 *       label: "ISPs: My ISP1, My ISP2",
 *       type: "INTERMEDIATE"
 *    },
 *  ]
 *
 * ***/
function consdenseIPData(userIps, intermediateIps){

    /* transform to obj with lat/lon keys:
    {
        44.22: {
            2.3 {
                "My Isp": true   // collect all ISPs we have found for ips with this lat/lon
            }
        },
        43.22: {
            2.3334 // we were unable to recuperate any ISPs for ips with this lat/lon
        }
    */
    let userIpsReformatted = {};
    userIps.map((ip) => {
        if (!userIpsReformatted[ip.latitude]) userIpsReformatted[ip.latitude] = {};
        if (!userIpsReformatted[ip.latitude][ip.longitude]) userIpsReformatted[ip.latitude][ip.longitude] = {}
        if (ip.isp) userIpsReformatted[ip.latitude][ip.longitude][ip.isp] = true;
    })

    let intermediateIpsReformatted = {};
    let intermediateIpsFR = intermediateIps.filter((ip) => {
        return ((ip.country_code === "FR") || (ip.country_code === "CH"))})
    intermediateIpsFR.map((ip) => {
        if (!intermediateIpsReformatted[ip.latitude]) intermediateIpsReformatted[ip.latitude] = {};
        if (!intermediateIpsReformatted[ip.latitude][ip.longitude]) intermediateIpsReformatted[ip.latitude][ip.longitude] = {}
        if (ip.isp) intermediateIpsReformatted[ip.latitude][ip.longitude][ip.isp] = true;
    });


    /*
    * Create the response object by, for all user and then for all intermediate IPs, creating a data point for each
    * lat/lon combination corresponding to one or more IPs, noting whether they are user or intermediate ips, and
    * concatening the ISPs for these IPs into a label for the map marker
    *
    * [
    *   {
    *       latitude: 44.2,
    *       longitude: 2.3,
    *       label: "ISPs: My ISP1, My ISP2",
    *       type: "USER"
    *    },
    *    {
    *       latitude: 45.2,
    *       longitude: 2.33,
    *       label: "ISPs: My ISP1, My ISP2",
    *       type: "INTERMEDIATE"
    *    },
    *  ]
    *
    * */
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

/***
 *  Condense traceroute info for the map
 *  param: traceroutes: results from neo4j query getAllPingData (this is callbackSuccess)
 *      [
 *          {
 *              src : {
 *                  properties : {
 *                      latitude: 44.3,
 *                      longitude: 2.4,
 *                      ...
 *                  }
 *              },
 *              target: {
 *                  properties : {
 *                      latitude: 44.3,
 *                      longitude: 2.4,
 *                      ...
 *                  }
 *              }
 *          }
 *      ]
 *
 *
 *  Returns:
 *  [
 {
            src: {
                latitude: 44.4,
                longitude: 2.3
            }
            target: {
                latitude: 45.3,
                longitude: 2.4
            },
            frequency: 0.03
         },
 ...
 ]
 *
 * ***/
function condenseTracerouteData(traceroutes){
    let traceroutes_filtered = traceroutes.filter((tr) => {
        let valid = true;
        let src = tr.src.properties;

        //do not include weird locations
        valid = valid && ((src.country_code === "FR") || (src.country_code === "CH"));
        let target = tr.target.properties;
        valid = valid && ((target.country_code === "FR") || (target.country_code === "CH"));
        // Do not include instances where src and target are the same location
        valid = valid && !((src.latitude === target.latitude)
            && (src.longitude === target.longitude));

        return valid;
    });

    let traceroutesFormatted = {};
    traceroutes_filtered.forEach((tr) => {
        console.log(tr)
        let pointA = tr.src.properties;
        let pointB = tr.target.properties;
        let tr_src = {address: tr.tr.properties.src, dsts: {}};
        let tr_dst = {address: tr.tr.properties.dst, traceroute: []};
        if (!traceroutesFormatted[tr_src.address]) traceroutesFormatted[tr_src.address] = tr_src;
        if (!(traceroutesFormatted[tr_src.address].dsts[tr_dst.address])) traceroutesFormatted[tr_src.address].dsts[tr_dst.address] = tr_dst;
        if (!(traceroutesFormatted[tr_src.address].dsts[tr_dst.address].traceroute)) traceroutesFormatted[tr_src.address].dsts[tr_dst.address].traceroute = [];
        traceroutesFormatted[tr_src.address].dsts[tr_dst.address].traceroute.push({src: pointA, target: pointB});
    })


    /* Convert to obj with lat/lon key/value pair structure:
    * {
    *   src1_latitude: {
    *       src1_longitude: {
    *           target1_latitude: {
    *               target1_longitude : <number of times we saw a hop from (src1_latitude, src1_longitude) to (target1_latitude, target1_longitude)>
    *           },
    *           ....
    *       },
    *       ...
    *   },
    *   ...
    * }
    * */
    // let traceroutesObj = {}
    // traceroutes_filtered.map((tr) => {
    //     let traceroute_instance = tr.tr.properties;
    //     let src = tr.src.properties;
    //     let target = tr.target.properties;
    //     if (!traceroutesObj[src.latitude]) traceroutesObj[src.latitude] = {};
    //     if (!traceroutesObj[src.latitude][src.longitude]) traceroutesObj[src.latitude][src.longitude] = {};
    //     if (!traceroutesObj[src.latitude][src.longitude][target.latitude]) traceroutesObj[src.latitude][src.longitude][target.latitude] = {};
    //     if (!traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude]) traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude] = 0;
    //     traceroutesObj[src.latitude][src.longitude][target.latitude][target.longitude] += 1;
    // })
    // let traceroutesCondensed=[]

    /* Create a data point for each (src_lat, src_lon), (target_lat, target_lon) combination,
    and add the relative frequecy that this path was taken compared to others.

    [
        {
            src: {
                latitude: 44.4,
                longitude: 2.3
            }
            target: {
                latitude: 45.3,
                longitude: 2.4
            },
            frequency: 0.03
         },
         ...
     ]

    */
    // Object.keys(traceroutesObj).map((srcLat) => {
    //     Object.keys(traceroutesObj[srcLat]).map((srcLon) => {
    //         Object.keys(traceroutesObj[srcLat][srcLon]).map((tarLat) => {
    //             Object.keys(traceroutesObj[srcLat][srcLon][tarLat]).map((tarLon) => {
    //                 let freqRaw = traceroutesObj[srcLat][srcLon][tarLat][tarLon];
    //                 let freqRelative = freqRaw/traceroutes.length;
    //                 let dataPoint = {
    //                     src: {
    //                         latitude: srcLat,
    //                         longitude: srcLon
    //                     },
    //                     target: {
    //                         latitude: tarLat,
    //                         longitude: tarLon
    //                     },
    //                     frequency: freqRelative
    //                 }
    //
    //                 // Do not include instances where src and target are the same location
    //                 if (!((srcLat === tarLat) && (srcLon === tarLon))) {
    //                     traceroutesCondensed.push(dataPoint)
    //                 }
    //             })
    //         })
    //     })
    // })
    // return traceroutesCondensed;
    return traceroutes_filtered;

}
module.exports = {parseTxt, consdenseIPData, condenseTracerouteData, parseTxtBatch: parseTxtBatch};
// var fs = require("fs");
// var text = fs.readFileSync("./pingpong.txt", "utf-8");
// console.log(JSON.stringify(parseTxtBatch(text)))
