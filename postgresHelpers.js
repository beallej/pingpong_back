const {IP_TYPES, QUERY_STRINGS} = require("./constants");
const {getLocationMultipleAPIs} = require("./ipLocateHelpers");
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();

/***
 * Save an IP address to the postgres db
 * params:
 *  ip: ip address,
 *  latitude: latitude,
 *  longitude: longitude,
 *  asn: asn,
 *  isp: isp,
 *  country_code: "FR"
 *  type: <"USER" / "INTERMEDIATE">
 *
 *  Returns the created entry, or null if already in db, or null if error
 * ***/
async function saveToDb(ip, latitude, longitude, asn, isp, country_code, type) {
    const values = [ip, latitude, longitude, asn, isp, country_code]
    try {
        let existingEntry = await getInfoForIpFromDb(ip, type)
        if (existingEntry) {
            console.log("ip already in db" + ip)
            return null;
        }

        // we use the type here to determine which table (user or intermediate) to save it to
        let res = await client.query(QUERY_STRINGS[type].CREATE, values)
        console.log("IP ADDED TO DB: ", res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving IP to db", err.stack)
        return null;
    }
}

/***
 * Gets information for an ip address from the db
 * params:
 *  ip: ip address
 *  type: <"USER" / "INTERMEDIATE">
 * ***/
async function getInfoForIpFromDb(ip, type){
    let res = await client.query(QUERY_STRINGS[type].GET_ONE, [ip])
    console.log("Found ",res.rows.length, "matching IPs")
    if (res.rows.length > 0) {
        let ipInfo = res.rows[0]
        return ipInfo
    }
    return null;
}

/***
 * Gets all information for all user ip addresses
 * ***/
async function getAllUserIpData() {
    try {
        const res = await client.query(QUERY_STRINGS.USER.GET_ALL);
        return res.rows;
    } catch (err) {
        console.log("error querying to db", err.stack)
        return null;
    }
}

/***
 * Gets all information for all intermediate ip addresses
 * ***/
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

/***
 * For a given user IP address, retrieves the corresponding location information and inserts it into the db
 * params:
 *  ip: ip address
 *  type: type: <"USER" / "INTERMEDIATE">
 * ***/
async function insertUserIpWithLocation(ip) {
    let location = await getLocationMultipleAPIs(ip);
    let dbRes;
    let response = {};

    //only save ips for which we have the latitude/longitude
    if (location.latitude && location.longitude){

        //only save user ips in france
        if (location.country_code !== "FR") {
            console.log("ip " + ip + " not in france, located in " + location.country_code)
            response.statusCode = 400;
            response.statusMessage = "Ip not located in France, located in " + location.country_code;
        } else {
            dbRes = await saveToDb(ip, location.latitude, location.longitude, location.asn, location.isp, location.country_code, IP_TYPES.USER);
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


/***
 * Get information for an ip address.
 * First check if it is already in the db, if so, return that.
 * Else, get info from apis.
 *
 * ***/
async function getInfoForIp(ip, type){
    let ipInfo;
    const dbRes = await getInfoForIpFromDb(ip, type);
    if (!dbRes) {
        ipInfo = await getLocationMultipleAPIs(ip);
        ipInfo.address = ip;
    } else {
        ipInfo = dbRes;
    }
    return ipInfo;
}

/***
 * For a list of traceroutes, add all the intermediate ip addresses to the db
 * ***/
async function addTraceroutesToIpList(routes){
    return Promise.all(routes.map((tr) => {
        return addOneTracerouteToIpList(tr)
    }));
}

/***
 * Add intermediate ips for one traceroute to the db
 * @param route: the traceroute
 *
 */
async function addOneTracerouteToIpList(route){
    let intermediateIPsFiltered = {};

    /*
    convert intermediate ips to object with address as key to filter out duplicates
    {
        "123.45.67" : {
            address: "123.45.67",
            latitude: "44,3,
            ...
         },
         ...
    */
    route.intermediate.forEach((ip) => intermediateIPsFiltered[ip.address] = ip);
    intermediateIPsFiltered = Object.values(intermediateIPsFiltered)

    return Promise.all(intermediateIPsFiltered.map((ip) => {
        return saveToDb(ip.address, ip.latitude, ip.longitude, ip.asn, ip.isp, ip.country_code, IP_TYPES.INTERMEDIATE)
    }))
}

/***
 * Gets the location info for a given list of traceroutes
 * @param src, the common source ip address for the traceroutes (the computer that ran the traceroute)
 * @param traceroutes
 * @returns a promise that resolves to the list of traceroutes with location info
 */
async function getTraceroutesLocationInfo(src, traceroutes){

    let routes = Promise.all(traceroutes.map((tr) => {
        return getOneTracerouteLocationInfo(src, tr);
    }));
    return routes;
}

/***
 * Gets the location info for ips in a traceroute
 * @param src the source ip address
 * @param tr the traceroute
 * @returns a promise that resolves to the traceroute with location info:
 * {
 *  src: { address: "123.45.67", latitude: 44.3...},
 *  dst: { address: "123.45.67", latitude: 44.3...},
 *  intermediate: [
 *      { address: "123.45.67", latitude: 44.3...},
 *      { address: "123.45.67", latitude: 44.3...},
 *      ...
 *  ]}
 */
async function getOneTracerouteLocationInfo(src, tr){

    //get information for src and target ip addresses
    let srcNode = await getInfoForIp(src, IP_TYPES.USER);
    let dstNode = await getInfoForIp(tr.dst, IP_TYPES.USER);
    let route = {src: srcNode, dst: dstNode};

    //get information for intermediate ip addresses
    async function getIntermediateTracerouteLocationInfo(tr){
        return Promise.all(tr.route.map((hop) => {
            return getInfoForIp(hop, IP_TYPES.INTERMEDIATE)
        }));
    }

    let intermediateIpInfo = await getIntermediateTracerouteLocationInfo(tr);

    //filter out ip addresses with no corresponding location info
    let validIntermediateIpInfo = intermediateIpInfo.filter((ipInfo) => {
        return (ipInfo.latitude !== null && ipInfo.longitude !== null)
    })
    route.intermediate = validIntermediateIpInfo;
    return route;
}


module.exports = {getInfoForIp: getInfoForIpFromDb,
    getTracerouteLocationInfo: getTraceroutesLocationInfo, insertUserIpWithLocation, getAllUserIpData, getAllIntermediateIpData, addTraceroutesToIpListPG: addTraceroutesToIpList};
