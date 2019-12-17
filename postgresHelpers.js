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
        return {type, ...ipInfo}
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
        ip.address = ip;
    } else {
        ipInfo = dbRes;
    }
    return ipInfo;
}
async function getTracerouteLocationInfo(src, traceroutes){
    let routes = traceroutes.map(async (tr) => {
        let route = [src];
        let dstNode = await getInfoForIpFromDb(tr.dst, IP_TYPES.USER);  //REPLACE WITH GETINFOFRORIP
        let tracerouteProm = tr.route.map((hop) => {
            return getInfoForIp(hop, IP_TYPES.INTERMEDIATE)});

        Promise.all(tracerouteProm).then((chemin) => {
            route.concat(chemin);
            route.push(dstNode);
            console.log("route: ", route)
            return routes;
        });
    });
}

module.exports = {getInfoForIp: getInfoForIpFromDb, getTracerouteLocationInfo, insertIpWithLocation, getAllUserIpData};
