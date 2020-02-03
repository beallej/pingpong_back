var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);
// var db = new neo4j.GraphDatabase("https://app151487501-VwY7YW:b.P6RJJloKWzKr.0ht1di6M04JrJY00@hobby-pmmgfgnijmdigbkeahdnfedl.dbs.graphenedb.com:24780")

async function getAllPingData(callbackSuccess, callbackErr){
    await db.cypher({
        query: "MATCH (src)-[r:PINGS]-(target) RETURN src,target"
    }, (err, res) => {
        if (res){
            callbackSuccess(JSON.stringify(res));
        }
        if (err){
            callbackErr(err)
        }
    });
}


async function addTraceroutesToDb(routes){
    let nodeQueries = []
    routes.map((route) => {
        if (route.intermediate.length > 0) {
            let routeList = [route.src];
            routeList = routeList.concat(route.intermediate);
            routeList.push(route.dst);
            // console.log("ROUTE", route)
            console.log("ROUTELIST!!", routeList);
            routeList.map((hop) => {
                console.log("hop", hop)
                let query = "MERGE (:IP {address: {ipAddress}";
                query += hop.latitude ? ", latitude: {ipLatitude}" : "";
                query += hop.longitude ? ", longitude: {ipLongitude}" : "";
                query += hop.asn ? ", asn: {ipAsn}" : "";
                query += hop.isp ? ", isp: {ipIsp}" : "";
                query += "})";
                if (hop.address && hop.longitude && hop.latitude){
                    let params = {ipAddress: hop.address, ipLatitude: hop.latitude, longitude: hop.longitude}
                    if (hop.asn) params.ipAsn = hop.asn;
                    if (hop.isp) params.isp = hop.isp;
                    nodeQueries.push({
                        query: query,
                        params: {
                            ipAddress: hop.address,
                            ipLatitude: parseFloat(hop.latitude),
                            ipLongitude: parseFloat(hop.longitude),
                            ipAsn: hop.asn,
                            ipIsp: hop.isp
                        },
                        lean: true
                    })
                }
            });
        }
    });
    console.log("QUERIES", nodeQueries)
    if (nodeQueries.length > 0){
        db.cypher({
            queries: nodeQueries,
        }, (err, batchResults) => {
            if (batchResults){
                console.log("RESULTS - IP", JSON.stringify(batchResults))
                addPingRelationships()
            }
            if (err){
                console.log("ERR", err)
            }
        });
    }

    function addPingRelationships() {
        let relQueries = [];
        routes.map((route) => {
            let routeList = [route.src];
            routeList = routeList.concat(route.intermediate);
            routeList.push(route.dst);
            console.log("ROUTELIST", routeList)
            routeList.map((hop, ind) => {
                if (ind < routeList.length - 1) {
                    relQueries.push({
                        query: "MATCH (node1: IP), (node2: IP) " +
                            "WHERE node1.address = {node1Address} AND node2.address = {node2Address} " +
                            "MERGE (node1)-[:PINGS]->(node2)",
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
                console.log("RESULTS - PING", JSON.stringify(batchResults))
            }
            if (err){
                console.log("ERR", err)
            }
        });
    }


}

function fixData(address, lat, lon, isp, asn){
    let query = "MATCH (n { address: '" + address + "'})\n" +
        "SET n.latitude = " + lat + "\n" +
        "SET n.longitude = " + lon + "\n" +
        "SET n.isp = '" + isp + "'\n"+
        "SET n.asn = '" + asn + "'\n"+
        "RETURN n.address, n.latitude, n.longitude, n.asn, n.isp";

    db.cypher({
        query: query,
    }, (err, batchResults) => {
        if (batchResults){
            console.log("RESULTS - IP", JSON.stringify(batchResults[0]))
        }
        if (err){
            console.log("ERR", err)
        }
    });
}
// fixData("130.117.50.134", "48.8602294921875", "2.3410699367523193", "Cogent Communications", "AS174")
module.exports = {addTraceroutesToDb, getAllPingData};
