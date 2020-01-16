const {IP_TYPES} = require("./constants.js");
const {addTraceroutesToDb, getAllPingData} = require("./neo4jhelpers.js");
const {getInfoForIp, getTracerouteLocationInfo, insertIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG, consdenseIPData, condenseTracerouteData} = require("./postgresHelpers");
const express = require('express')
var bodyParser  = require("body-parser");


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



app.post('/traceroute',async function(request, response){
    // let src = await getInfoForIp(request.body.src, IP_TYPES.USER);
    // console.log("src", src, request.body.src);
    // let routes = await getTracerouteLocationInfo(src, request.body.traceroutes);
    // let ipListRes = await addTraceroutesToIpListPG(routes); //TODO: FIX MODEL FOR LIST
    // console.log("IPLISTRES", ipListRes)
    // console.log("ROUTES", routes)
    // let createResult = await addTraceroutesToDb(routes);
    //
    //
    console.log("REQUEST BODY", request.body);
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.statusCode = 200;
    response.statusMessage = "Traceroutes successsfully added";
    return response.end()

});

app.post('/ip/add',async function(request, response){
    let ip = request.body.ip;
    ip =  ip.trim()  //remove extra newline char

    let responseInfo = await insertIpWithLocation(ip, IP_TYPES.USER)
    response.header("Access-Control-Allow-Origin", "https://pure-fortress-53953.herokuapp.com");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.statusCode = responseInfo.statusCode;
    response.statusMessage = responseInfo.statusMessage;
    return response.end();

});

app.get('/traceroutes/all/condensed', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = (res) => {
            console.log(typeof res)
            let traceroutes = JSON.parse(res)
            let traceroutesCondensed = condenseTracerouteData(traceroutes);
            return response.status(200).send(traceroutesCondensed)
        };
        let callbackErr = (err) => {
            return response.status(500).end();
        };
        getAllPingData(callbackSuccess, callbackErr)

    } catch (err) {
        return response.status(500).end();
    }
})
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

app.listen(process.env.PORT || 5000, () =>{})




