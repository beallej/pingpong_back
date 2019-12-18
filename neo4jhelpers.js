// const neo4j = require('neo4j-driver');
//
// const graphenedbURL = process.env.GRAPHENEDB_BOLT_URL;
// const graphenedbUser = process.env.GRAPHENEDB_BOLT_USER;
// const graphenedbPass = process.env.GRAPHENEDB_BOLT_PASSWORD;
// const driver = neo4j.driver(process.env['GRAPHENEDB_URL']);


var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);

async function addTraceroutesToDb(routes){
    const driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

    let session = driver.session();
    // let createQueryString = routes.map((route) => {
    //     let createString = "MERGE path =";
    //     let allHopsExceptDst = route.slice(0,-1);
    //     console.log("all hops except dst", allHopsExceptDst)
    //     createString += allHopsExceptDst.map((hop, index) => {
    //         return "(n" + index + ":IP " + JSON.stringify(hop) + ")-[:PINGS]->"
    //     }).join("");
    //     let dst = route[route.length - 1];
    //     createString += "(n" + (route.length -1) + ":IP " + JSON.stringify(dst) + ")"
    //     createString += " RETURN path";
    //     console.log(createString);
    //     return createString;
    // }).join(", ");
    let createQueryString = "MERGE path =(n0:IP {\"address\":\"93.23.197.11\",\"latitude\":\"43.6046\",\"longitude\":\"1.4451\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"})-[:PINGS]->-[:PINGS]->(n6:IP {\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\",\"address\":\"77.136.134.1\"})-[:PINGS]->(n7:IP {\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\",\"address\":\"77.136.10.34\"})-[:PINGS]->(n8:IP {\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\",\"address\":\"109.24.74.182\"})-[:PINGS]->(n9:IP {\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\",\"address\":\"77.136.10.153\"})-[:PINGS]->(n10:IP {\"latitude\":48.8543,\"longitude\":2.3527,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\",\"address\":\"77.154.230.106\"})-[:PINGS]->(n11:IP {\"address\":\"77.136.40.239\",\"latitude\":\"48.8543\",\"longitude\":\"2.3527\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"}) RETURN path\n"
    console.log(createQueryString)
    // let createQueryString = " MERGE path =(n0:IP {\"address\":\"93.23.197.11\",\"latitude\":\"43.6046\",\"longitude\":\"1.4451\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"})-[:PINGS]->(n1:IP [{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8543,\"longitude\":2.3527,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"}])-[:PINGS]->NaN:IP {\"type\":\"USER\",\"address\":\"77.136.40.239\",\"latitude\":\"48.8543\",\"longitude\":\"2.3527\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"}) RETURN path"


    db.cypher({
        query: createQueryString,
        params: {},
    }, (res) => {
        console.log("GOT RES", res)
    });

    //
    //
    // try {
    //
    //     driver.verifyConnectivity().then((value)=> {
    //         console.log("verify connectivity")
    //         console.log(value.address, value.version)
    //         console.log(value)
    //     }).catch((problem) => {
    //         console.log("verify connectivity NO")
    //         console.log(problem)
    //     })
    //     let createResult = await session.run(createQueryString);
    //     session.close();
    //     driver.close();
    //     return createResult
    // }
    // catch (e) {
    //     console.log("probem", e)
    // }

    //
    // db.cypher({
    //     query: 'CREATE (n:Person {name: {personName}}) RETURN n',
    //     params: {
    //         personName: 'Bob'
    //     }
    // }, function(err, results){
    //     var result = results[0];
    //     if (err) {
    //         console.error('Error saving new node to database:', err);
    //     } else {
    //         console.log('Node saved to database with id:', result['n']['_id']);
    //     }
    // });

}

module.exports = {addTraceroutesToDb};
