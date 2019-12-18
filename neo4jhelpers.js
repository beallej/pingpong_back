var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);
async function addTraceroutesToDb(routes){


    let nodeQueries = []
    routes.map((route) => {
        route.map((hop) => {
            // let label = "ip_" + hop.address
            nodeQueries.push({
                query: "MERGE (:IP {address: {ipAddress}, latitude: {ipLatitude}, longitude: {ipLongitude}, asn: {ipAsn}, isp: {ipIsp}})",
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
        console.log("PING - QUERY", nodeQueries)
    });
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

    function addPingRelationships() {
        let relQueries = [];
        routes.map((route) => {
            let src = route[0].address;
            let dst = route[route.length -1].address;
            route.map((hop, ind) => {
                if (ind < route.length - 1) {
                    // let label = "ping_from_" + hop.address + "_to_" + route[i+1].address + "_src_" + src + "_dst_" + dst;
                    relQueries.push({
                        query: "MATCH (node1: IP), (node2: IP) " +
                            "WHERE node1.address = {node1Address} AND node2.address = {node2Address} " +
                            "MERGE (node1)-[:PINGS {src: {srcIp}, dst: {dstIp}}]->(node2)",
                        params: {
                            node1Address: hop.address,
                            node2Address: route[ind + 1].address,
                            srcIp: src,
                            dstIp: dst
                        },
                        lean: true
                    })
                }
            })
        })
        console.log("REL - QUERIES", relQueries);
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

module.exports = {addTraceroutesToDb};
