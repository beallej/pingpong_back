const {IP_TYPES} = require("./constants.js");
const {addTraceroutesToDb, getAllPingData} = require("./neo4jhelpers.js");
const {getInfoForIp, getTracerouteLocationInfo, insertIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG} = require("./postgresHelpers");
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
    // console.log(createResult);
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
app.get('/traceroute/all', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Content-Type", "application/json")
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let callbackSuccess = (res) => {
            return response.status(200).send(res)
        };
        let callbackErr = (err) => {
            return response.status(500).end();
        };
        getAllPingData(callbackSuccess, callbackErr)

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

app.listen(process.env.PORT || 5000, () =>{})




