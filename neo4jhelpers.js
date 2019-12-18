var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);
async function addTraceroutesToDb(routes){
    let queries = []
    routes.map((route) => {
        let src = route[0].address;
        let dst = route[route.length -1].address;
        route.map((hop) => {
            queries.push({
                query: "MERGE (ip:IP {address: {ipAddress}, latitude: {ipLatitude}, longitude: {ipLongitude}, asn: {ipAsn}, isp: {ipIsp}}) RETURN ip",
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
        route.map((hop, ind) => {
            if (ind < route.length - 1) {
                queries.push({
                    query: "MATCH (node1: IP), (node2: IP) " +
                        "WHERE node1.address = {node1Address} AND node2.address = {node2Address} " +
                        "MERGE (node1)-[r:PINGS {src: {srcIp}, dst: {dstIp}}]->(node2) RETURN r",
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
        console.log("QUERY", queries)
    });

    db.cypher({
        queries: queries,
    }, (err, batchResults) => {
        if (batchResults){
            console.log("RESULTS", JSON.stringify(batchResults))
        }
        if (err){
            console.log("ERR", err)
        }
    });

}

module.exports = {addTraceroutesToDb};
