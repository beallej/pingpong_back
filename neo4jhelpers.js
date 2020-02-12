var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);

/*** Gets all traceroute data from db.
 * params:
 *      callbackSuccess: a function that takes a string (the results of the query, stringified) as a parameter
 *      callbackErr: to handle error cases
 * ***/
async function getAllPingData(callbackSuccess, callbackErr){
    await db.cypher({
        query: "MATCH (src)-[r:PINGS]-(target) RETURN src,target"
    }, (err, res) => {
        if (res){
            callbackSuccess(res);
        }
        if (err){
            callbackErr(err)
        }
    });
}

/*** Adds traceroutes to neo4j db
 * params:
 *      routes:
 *      [
 *          {
 *              src: '123.45.67',           //src/dest do not include location info because they are already in the db
 *              dst: '891.01.112',
 *              intermediate: [
 *                  {
 *                      address: '111.22.333',    //intermediate ips may not be in the db so we include their location info
 *                      latitude: 4.33,
 *                      longitude: 2.22,
 *                      asn: 'AS222',
 *                      isp: 'My isp'
 *                  },
 *              ]
 *          },
 *      ]
 * ***/
async function addTraceroutesToDb(routes){
    let nodeQueries = []
    routes.map((route) => {
        if (route.intermediate.length > 0) {

            //routelist: [src, ...intermediate..., dst]
            let routeList = [route.src];
            routeList = routeList.concat(route.intermediate);
            routeList.push(route.dst);
            routeList.map((hop) => {
                let query = "MERGE (:IP {address: {ipAddress}";                   //merge in case the ip is already in db
                query += hop.latitude ? ", latitude: {ipLatitude}" : "";
                query += hop.longitude ? ", longitude: {ipLongitude}" : "";
                query += hop.asn ? ", asn: {ipAsn}" : "";
                query += hop.isp ? ", isp: {ipIsp}" : "";
                query += hop.country_code ? ", country_code: {ipCountryCode}" : "";
                query += "})";
                if (hop.address && hop.longitude && hop.latitude){
                    let params = {ipAddress: hop.address, ipLatitude: hop.latitude, longitude: hop.longitude}
                    if (hop.asn) params.ipAsn = hop.asn;
                    if (hop.isp) params.isp = hop.isp;
                    if (hop.country_code) params.country_code = hop.country_code;
                    nodeQueries.push({
                        query: query,
                        params: {
                            ipAddress: hop.address,
                            ipLatitude: parseFloat(hop.latitude),
                            ipLongitude: parseFloat(hop.longitude),
                            ipAsn: hop.asn,
                            ipIsp: hop.isp,
                            ipCountryCode: hop.country_code
                        },
                        lean: true
                    })
                }
            });
        }
    });
    if (nodeQueries.length > 0){
        db.cypher({
            queries: nodeQueries,
        }, (err, batchResults) => {
            if (batchResults){
                console.log("RESULTS - add traceroutes to db: ", JSON.stringify(batchResults));

                //If adding the ip addresses is successful, we add the pings (relationships) between them
                addPingRelationships()
            }
            if (err){
                console.log("ERROR ADDING IPS TO NEO4J: ", err)
            }
        });
    }

    /*** Adds pings (relationships) between ip addresses to neo4j ***/
    function addPingRelationships() {
        let relQueries = [];
        routes.map((route) => {

            //routelist: [src, ...intermediate..., dst]
            let routeList = [route.src];
            routeList = routeList.concat(route.intermediate);
            routeList.push(route.dst);
            routeList.map((hop, ind) => {
                if (ind < routeList.length - 1) {
                    // use merge to make sure we didnt already add this relationship
                    relQueries.push({
                        query: "MATCH (node1: IP), (node2: IP) " +
                            "WHERE node1.address = {node1Address} AND node2.address = {node2Address} " +
                            "MERGE (node1)-[:PINGS {src: {srcIp}, dst: {dstIp}}]->(node2)",
                        params: {
                            node1Address: hop.address,
                            node2Address: routeList[ind + 1].address
                        },
                        lean: true
                    })
                }
            })
        })
        db.cypher({
            queries: relQueries,
        }, (err, batchResults) => {
            if (batchResults){
                //success
            }
            if (err){
                console.log("ERROR ADDING PINGS TO NEO4J: ", err)
            }
        });
    }


}



/*** Used to manually correct an entry
 *
 fixData("222.222.22.222", "48.8602294921875", "2.3410699367523193", "My isp", "AS999")

 * ***/
function fixData(address, lat, lon, isp, asn, country_code){
    let query = "MATCH (n { address: '" + address + "'})\n" +
        "SET n.latitude = " + lat + "\n" +
        "SET n.longitude = " + lon + "\n" +
        "SET n.isp = '" + isp + "'\n"+
        "SET n.asn = '" + asn + "'\n"+
        "SET n.country_code = '" + country_code + "'\n"+
        "RETURN n.address, n.latitude, n.longitude, n.asn, n.isp, n.country_code";

    db.cypher({
        query: query,
    }, (err, batchResults) => {
        if (batchResults){
            console.log("RESULTS - fix data: ", JSON.stringify(batchResults[0]))
        }
        if (err){
            console.log("ERR fix dat: ", err)
        }
    });
}

module.exports = {addTraceroutesToDb, getAllPingData};
