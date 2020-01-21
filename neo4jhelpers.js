var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);

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
                nodeQueries.push({
                    query: query,
                    params: {
                        ipAddress: hop.address,
                        ipLatitude: hop.latitude,
                        ipLongitude: hop.longitude,
                        ipAsn: hop.asn,
                        ipIsp: hop.isp
                    },
                    lean: true
                })
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

module.exports = {addTraceroutesToDb, getAllPingData};
