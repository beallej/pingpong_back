
const {IP_TYPES} = require("./constants.js");
const {addTraceroutesToDb, getAllPingData, getDstsForSrc, getTracerouteForSrcDst, getSources} = require("./neo4jhelpers.js");
const {getTracerouteLocationInfo, insertUserIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG} = require("./postgresHelpers");
const {parseTxt, parseTxtBatch, consdenseIPData, condenseTracerouteData, parseDstsForSrc, formatTracerouteForOneSrcDstData, parseSources} = require("./parsers");
const express = require('express')
var bodyParser  = require("body-parser");


const app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


/*** Add information from execution of script to gather traceroutes.
 *  Body is sent as txt file ***/
app.post('/traceroute',async function(request, response){
    try {
        let body = Object.keys(request.body)[0];
        const traceroutesParsed = parseTxt(body);

        await handleTraceRouteData(traceroutesParsed);

        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        response.statusCode = 200;
        response.statusMessage = "Traceroutes successsfully added";
        return response.end()
    }  catch (err) {
        return response.status(500).end();
    }
});

/*** Add information from execution of script to gather traceroutes.
 *  Body is sent as txt file ***/
app.post('/traceroute/windows',async function(request, response){
    try {
        let body = Object.keys(request.body)[0];
        console.log("BODY", body);
        let data = parseTxtBatch(body);
        await handleTraceRouteData(data)
        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        response.statusCode = 200;
        response.statusMessage = "Traceroutes successsfully added";
        return response.end()
    } catch(e){
        console.log("ERROR ADDING TRACEROUTES", e)
        return response.status(500).end()
    }


})

async function handleTraceRouteData(traceroutesParsed){

    console.log("TRACEROUTES", JSON.stringify(traceroutesParsed))
    await insertUserIpWithLocation(traceroutesParsed.src);
    let routes = await getTracerouteLocationInfo(traceroutesParsed.src, traceroutesParsed.traceroutes);
    let ipListRes = await addTraceroutesToIpListPG(routes);

    console.log("ROUTES WITH LOCATION INFO", routes)
    let createResult = await addTraceroutesToDb(routes);
}


/*** ADD A USER IP ADDRESS
 *
 * body: {ip: <ip address>}
 *
 * ***/
app.post('/ip/add',async function(request, response){
    let ip = request.body.ip;
    ip =  ip.trim()  //remove extra newline char

    let responseInfo = await insertUserIpWithLocation(ip)
    response.header("Access-Control-Allow-Origin", "https://pingpong-athena.herokuapp.com/");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.statusCode = responseInfo.statusCode;
    response.statusMessage = responseInfo.statusMessage;
    return response.end();

});

/*** RETURN A LIST OF ALL THE TRACEROUTES. Data is condensed to lat/lon points (multiple ip addresses can share the same location),
 * and the frequency of the given path taken (how often is is taken compared to other paths) is also returned.
 *
 *response body :
 * {
 *     [
 *         {src:
 *              {latitude: 48.6,
                 longitude: 2.3
                },
            target: {
                latitude: 45.6,
                longitude: 3.3
            },
            frequency: 0.4
           },
 *     ]
 * }
 * ***/
app.get('/traceroutes/all/condensed', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = (res) => {
            let traceroutes = res;
            console.log("traceroutes fetched")
            let traceroutesCondensed = condenseTracerouteData(traceroutes);
            console.log("traceroutes condensed")
            return response.status(200).send(traceroutesCondensed)
        };
        let callbackErr = (err) => {
            console.log(err)
            return response.status(500).end();
        };
        console.log("start")
        await getAllPingData(callbackSuccess, callbackErr)

    } catch (err) {
        console.log(err)
        return response.status(500).end();
    }
});

app.get('/sources/', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = (res) => {
            let sources = parseSources(res) //filter out duplicates
            return response.status(200).send(sources)
        };
        let callbackErr = (err) => {
            console.log(err)
            return response.status(500).end();
        };

        await getSources(callbackSuccess, callbackErr);

    } catch (err) {
        console.log(err)
        return response.status(500).end();
    }
});

app.get('/:srcAddress/destinations/', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = async (res) => {
            let destinationIps = parseDstsForSrc(res) //filter out duplicates
            let userIps = await getAllUserIpData();
            let intermediateIps = await getAllIntermediateIpData();
            let allIps = {};
            userIps.forEach((ipObj) => {
                allIps[ipObj.address] = ipObj;
            });
            intermediateIps.forEach((ipObj) => {
                allIps[ipObj.address] = ipObj;
            });
            let destinations = [];
            destinationIps.forEach((ipAddr) => {
                if (allIps[ipAddr]) destinations.push(allIps[ipAddr]);
            });
            return response.status(200).send(destinations)
        };
        let callbackErr = (err) => {
            console.log(err)
            return response.status(500).end();
        };

        let src = request.params.srcAddress;
        getDstsForSrc(src, callbackSuccess, callbackErr);

    } catch (err) {
        console.log(err)
        return response.status(500).end();
    }
});


app.get('/:srcAddress/:dstAddress/traceroute', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = (res) => {
            let traceroutesFormatted = formatTracerouteForOneSrcDstData(res);
            return response.status(200).send(traceroutesFormatted)
        };
        let callbackErr = (err) => {
            console.log(err)
            return response.status(500).end();
        };

        let src = request.params.srcAddress;
        let dst = request.params.dstAddress;
        getTracerouteForSrcDst(src, dst, callbackSuccess, callbackErr);

    } catch (err) {
        console.log(err)
        return response.status(500).end();
    }
});



/***
 * Gets all the latitude/longitude points with ip addresses that have been pinged, for the map.
 *
 * response body:
 *  [
 *      { latitude: 48.8582,
 *        longitude: 2.3387,
 *        label: "ISPs: Renater, SFR SA, Orange",   //  a label for the point on the map, a concatenated list of ISPs
 *        type: "INTERMEDIATE"  // whether this is a user IP or an ip pinged during a traceroute
 *      },
 *  ]
 *
 * ***/
app.get('/ip/all/condensed', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allUserIpInfo = await getAllUserIpData();
        let allIntermediateIpInfo = await getAllIntermediateIpData();
        let ipInfoCondensed = consdenseIPData(allUserIpInfo, allIntermediateIpInfo);
        console.log("all ip info: ", ipInfoCondensed)
        return response.status(200).send(ipInfoCondensed);
    } catch (err) {
        return response.status(500).end();
    }
})

/***
 * Gets all the ip addresses that were discovered during a traceroute (not user ips).
 *
 * response body:
 *  [
 *      { address: "123.45.678",
 *        latitude: 48.8582,
 *        longitude: 2.3387,
 *        asn: "AS123",
 *        isp: "ISPs: Renater",
 *        country_code: "FR"
 *      },
 *  ]
 *
 * ***/
app.get('/ip/intermediate/all', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllIntermediateIpData();
        console.log("all ip info: ", allIpInfo)
        return response.status(200).send(allIpInfo);
    } catch (err) {
        return response.status(500).end();
    }
})


/***
 * Gets all the user ip addresses.
 *
 * response body:
 *  [
 *      { address: "123.45.678",
 *        latitude: 48.8582,
 *        longitude: 2.3387,
 *        asn: "AS123",
 *        isp: "ISPs: Renater",
 *        country_code: "FR"
 *      },
 *  ]
 *
 * ***/
app.get('/ip/all', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllUserIpData();
        console.log("all ip info: ", allIpInfo)
        return response.status(200).send(allIpInfo);
    } catch (err) {
        return response.status(500).end();
    }
})

/***
 * Gets all the ip addresses without extra info, concatenated with a comma. Used by the sh file to fetch the ips to traceroute.
 *
 * response body:
 *  "123.45.678,910.11.121,314.15.161"
 *
 * ***/
app.get('/ip/all/address_only', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllUserIpData();
        let allIntermediateIpInfo = await getAllIntermediateIpData();
        allIpInfo = allIpInfo.concat(allIntermediateIpInfo);
        let justAddresses = allIpInfo.map((ip) => {return ip.address}).join(",");
        console.log("just addresses: ", justAddresses)
        return response.status(200).send(justAddresses);
    } catch (err) {
        return response.status(500).end();
    }
})

/***
 * Gets all the user ip addresses without extra info. Used by the windows bat file to fetch the ips to traceroute.
 *
 * response body:
 *  [123.45.678, 910.11.121, 314.15.161]
 *
 * ***/
app.get('/ip/all/address_only/windows', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllUserIpData();
        let justAddresses = allIpInfo.map((ip) => {return ip.address})
        return response.status(200).send(justAddresses);
    } catch (err) {
        return response.status(500).end();
    }
});

app.listen(process.env.PORT || 5000, () =>{})






