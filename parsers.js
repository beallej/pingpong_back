
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
 *              src : {    // node representing src IP in given hop
 *                  properties : {
 *                      latitude: 44.3,
 *                      longitude: 2.4,
 *                      ...
 *                  }
 *              },
 *              target: {   // node representing target IP in given hop
 *                  properties : {
 *                      latitude: 44.3,
 *                      longitude: 2.4,
 *                      ...
 *                  }
 *              },
 *              tr: {
 *                  properties : {
 *                      {
 *                          src: <ip address of src of tracerotue>,
 *                          target: <ip address of target of traceroute>
 *                      }
 *                  }
 *              }
 *
 *          }
 *      ]
 *
 *
 *  Returns:
 *  {<Source address>:
 *      {"dsts":
 *          {<Destination address>:
 *              {"traceroute":
 *                  [
 *                  {
 *                      "src":
 *                          {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *                      "target":
 *                          {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>}
 *                   },
 *                   ....
 *                  ]
 *              }
 *          }
 *      }
 *  }
 *
 * ***/
function condenseTracerouteData(traceroutes){

    //tr {src: {}, target: {}, tr: {properties :{src: 122.33..., target: 22.222}}}
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

        //Given this traceroute, format the data
        //TR_SRC -> point0 -> point1 -> .... -> pointA -> pointB ->.... -> pointN -> TR_DEST
        let pointA = tr.src.properties;
        let pointB = tr.target.properties;
        let tr_src = {dsts: {}};
        let tr_src_add = tr.tr.properties.src;
        let tr_dst = {traceroute: []};
        let tr_dst_add = tr.tr.properties.dst;

        console.log("point A: ", pointA, "point B: ", pointB, "tr source: ", tr_src, "tr dest: ", tr_dst);
        if (!traceroutesFormatted[tr_src_add]) traceroutesFormatted[tr_src_add] = tr_src;
        if (!(traceroutesFormatted[tr_src_add].dsts[tr_dst_add])) traceroutesFormatted[tr_src_add].dsts[tr_dst_add] = tr_dst;
        if (!(traceroutesFormatted[tr_src_add].dsts[tr_dst_add].traceroute)) traceroutesFormatted[tr_src_add].dsts[tr_dst_add].traceroute = [];
        traceroutesFormatted[tr_src_add].dsts[tr_dst_add].traceroute.push({src: pointA, target: pointB});
    });

    console.log("Traceroutes formattted: ", traceroutesFormatted);
    return traceroutesFormatted;

}

/***
 * Formates traceroute data for one source and destination
 * @param traceroutes
 *
 * * [
 *     {
 *         "src":
 *            {
 *              "properties": {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *              ...
 *            }
 *         "target":
 *            {
 *              "properties": {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *              ...
 *            }
 *         },
 *         ....
 *  ]
 *
 * @returns
 * [
 *     {
 *         "src":
 *            {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *         "target":
 *             {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>}
 *         },
 *         ....
 *  ]
 */
function formatTracerouteForOneSrcDstData(traceroutes) {
    //tr {src: {}, target: {}, tr: {properties :{src: 122.33..., target: 22.222}}}
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
    return traceroutes_filtered.map((tr) => {
        return {
            src: tr.src.properties,
            target: tr.target.properties
        }

    })
}

/***
 * Formats List of source ips
 * @param sources
 * [
 *      {"src":
 *          {
 *              "properties" :  {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *              ...
 *          }
 *      },
 *      ...
 *    ]
 * @returns
 *    [
 *      {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *      ...
 *    ]
 */
function parseSources(sources) {
    let srcObj = {}
    let srcsFormatted = sources.map((src) => {
        return src.src.properties});
    srcsFormatted = srcsFormatted.filter((src) => {
       let exits = srcObj[src.address] || false;
       srcObj[src.address] = true;
       return !exits;
    });
    return srcsFormatted;
}


/***
 * Formats a list of destinations Pinged for a given source
 * @param dsts
 * [
 *      {"dst":
 *          {
 *              "properties" :  {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *              ...
 *          }
 *      },
 *      ...
 *    ]
 * @returns
 *    [
 *      {"country_code":<ex. "FR">,"address":<ip address>,"isp":<ex. "SFR SA">,"latitude":<latitude>,"asn":<ex. "AS15557">,"longitude":<longitude>},
 *      ...
 *    ]
 */
function parseDstsForSrc(dsts){
    let dstObj = {}
    let dstsFormatted = dsts.map((dst) => {
        return dst.dst.properties});
    dstsFormatted = dstsFormatted.filter((dst) => {
        let exits = dstObj[dst.address] || false;
        dstObj[dst.address] = true;
        return !exits;
    });
    return dstsFormatted;
}



module.exports = {parseTxt, consdenseIPData, condenseTracerouteData, parseTxtBatch: parseTxtBatch, parseDstsForSrc, formatTracerouteForOneSrcDstData, parseSources};
