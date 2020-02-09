const {IP_TYPES} = require("./constants.js");
const {addTraceroutesToDb, getAllPingData} = require("./neo4jhelpers.js");
const {getTracerouteLocationInfo, insertUserIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG} = require("./postgresHelpers");
const {parseTxt, consdenseIPData, condenseTracerouteData} = require("./parsers");
const express = require('express')
var bodyParser  = require("body-parser");


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


/*** Add information from execution of script to gather traceroutes.
 *  Body is sent as txt file ***/
app.post('/traceroute',async function(request, response){
    try {
        let body = Object.keys(request.body)[0];
        const traceroutesParsed = parseTxt(body);

        console.log("TRACEROUTES", JSON.stringify(traceroutesParsed))
        await insertUserIpWithLocation(traceroutesParsed.src);
        let routes = await getTracerouteLocationInfo(traceroutesParsed.src, traceroutesParsed.traceroutes);
        let ipListRes = await addTraceroutesToIpListPG(routes);

        console.log("ROUTES WITH LOCATION INFP", routes)
        let createResult = await addTraceroutesToDb(routes);
        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        response.statusCode = 200;
        response.statusMessage = "Traceroutes successsfully added";
        return response.end()
    }  catch (err) {
        return response.status(500).end();
    }
});

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
        getAllPingData(callbackSuccess, callbackErr)

    } catch (err) {
        console.log(err)
        return response.status(500).end();
    }
})


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
 * Gets all the user ip addresses without extra info, concatenated with a comma. Used by the sh file to fetch the ips to traceroute.
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
})

app.get('/ip/count', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllUserIpData();
        return response.status(200).send(allIpInfo.length);
    } catch (err) {
        return response.status(500).end();
    }
})

app.listen(process.env.PORT || 5000, () =>{})




