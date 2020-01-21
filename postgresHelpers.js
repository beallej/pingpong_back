const {IP_TYPES, QUERY_STRINGS} = require("./constants");
const {getLocation} = require("./ipLocateHelpers");
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();
async function saveToDb(ip, latitude, longitude, asn, isp, type) {
    const values = [ip, latitude, longitude, asn, isp]
    try {
        let existingEntry = await getInfoForIpFromDb(ip, type)
        if (existingEntry) {
            console.log("ip already in db" + ip)
            return null;
        }
        let res = await client.query(QUERY_STRINGS[type].CREATE, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving to db", err.stack)
        return null;
    }
}


async function getInfoForIpFromDb(ip, type){
    console.log(QUERY_STRINGS[type].GET_ONE, ip)
    let res = await client.query(QUERY_STRINGS[type].GET_ONE, [ip])
    console.log("rows",res.rows.length)
    if (res.rows.length > 0) {
        let ipInfo = res.rows[0]
        return ipInfo
    }
    return null;
}

async function getAllUserIpData() {
    try {
        const res = await client.query(QUERY_STRINGS.USER.GET_ALL);
        console.log(res.rows)
        return res.rows;
    } catch (err) {
        console.log("error querying to db", err.stack)
        return null;
    }
}
async function getAllIntermediateIpData() {
    try {
        const res = await client.query(QUERY_STRINGS.INTERMEDIATE.GET_ALL);
        console.log(res.rows)
        return res.rows;
    } catch (err) {
        console.log("error querying to db", err.stack)
        return null;
    }
}

async function insertIpWithLocation(ip, type) {
    let location = await getLocation(ip);
    console.log("ip: " , ip);
    console.log("location: ", location);
    let dbRes;
    let response = {};
    if (location.latitude && location.longitude){
        if (location.country_code !== "FR") {
            console.log("ip " + ip + " not in france, located in " + location.country_code)
            response.statusCode = 400;
            response.statusMessage = "Ip not located in France, located in " + location.country_code;
        } else {
            dbRes = await saveToDb(ip, location.latitude, location.longitude, location.asn, location.isp, type);
            response.statusCode = 201;
            response.statusMessage = "Ip address successfully added!"
        }

    } else {
        response.statusCode = 404;
        response.statusMessage = "Ip address not valid";
        console.log("location info null for ip: ", ip);
    }
    return response;
}
async function getInfoForIp(ip, type){
    let ipInfo;
    const dbRes = await getInfoForIpFromDb(ip, type);
    if (!dbRes) {
        ipInfo = await getLocation(ip);
        ipInfo.address = ip;
    } else {
        ipInfo = dbRes;
    }
    return ipInfo;
}
async function addTraceroutesToIpList(routes){
    return Promise.all(routes.map((tr) => {
        return addOneTracerouteToIpList(tr)
    }));
}
async function addOneTracerouteToIpList(route){
    let intermediateIPsFiltered = {};
    route.intermediate.forEach((ip) => intermediateIPsFiltered[ip.address] = ip);
    intermediateIPsFiltered = Object.values(intermediateIPsFiltered)

    return Promise.all(intermediateIPsFiltered.map((ip) => {
        return saveToDb(ip.address, ip.latitude, ip.longitude, ip.asn, ip.isp, IP_TYPES.INTERMEDIATE)
    }))
}
async function getTraceroutesLocationInfo(src, traceroutes){

    let routes = Promise.all(traceroutes.map((tr) => {
        return getOneTracerouteLocationInfo(src, tr);
    }));
    return routes;
}

async function getOneTracerouteLocationInfo(src, tr){

    let srcNode = await getInfoForIp(src, IP_TYPES.USER);
    let dstNode = await getInfoForIp(tr.dst, IP_TYPES.USER);
    let route = {src: srcNode, dst: dstNode};
    async function getIntermediateTracerouteLocationInfo(tr){
        return Promise.all(tr.route.map((hop) => {
            return getInfoForIp(hop, IP_TYPES.INTERMEDIATE)
        }));
    }

    let intermediateIpInfo = await getIntermediateTracerouteLocationInfo(tr);

    let validIntermediateIpInfo = intermediateIpInfo.filter((ipInfo) => {
        return (ipInfo.latitude !== null && ipInfo.longitude !== null)
    })
    console.log(intermediateIpInfo.length, validIntermediateIpInfo.length)
    route.intermediate = validIntermediateIpInfo;
    return route;
}


module.exports = {getInfoForIp: getInfoForIpFromDb,
    getTracerouteLocationInfo: getTraceroutesLocationInfo, insertIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG: addTraceroutesToIpList};
