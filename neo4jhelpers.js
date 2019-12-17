const neo4j = require('neo4j-driver');

const graphenedbURL = process.env.GRAPHENEDB_BOLT_URL;
const graphenedbUser = process.env.GRAPHENEDB_BOLT_USER;
const graphenedbPass = process.env.GRAPHENEDB_BOLT_PASSWORD;
const driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

async function addTraceroutesToDb(routes){
    let session = driver.session();
    let createQueryString = routes.map((route) => {
        let createString = "MERGE path ="
        createString += route.slice(0,-1).map((hop, index) => {
            return "(n" + index + ":IP " + JSON.stringify(hop) + ")-[:PINGS]->"
        }).join("");
        let dst = route[route.length - 1];
        createString += "(n" + route.length -1 + ":IP " + JSON.stringify(dst) + ")"
        createString += " RETURN path";
        console.log(createString);
        return createString;
    }).join(", ");
    console.log(createQueryString)
    // let createQueryString = "MERGE path =(n0:IP {\"type\":\"USER\",\"address\":\"93.23.197.11\",\"latitude\":\"43.6046\",\"longitude\":\"1.4451\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"})-[:PINGS]->(n1:IP [{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":null,\"longitude\":null,\"country_code\":null,\"asn\":null,\"isp\":null},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8582,\"longitude\":2.3387,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"},{\"latitude\":48.8543,\"longitude\":2.3527,\"country_code\":\"FR\",\"asn\":\"AS15557\",\"isp\":\"SFR SA\"}])-[:PINGS]->NaN:IP undefined) RETURN path"
    let createResult = await session.run(createQueryString);
    session.close();
    return createResult
}

module.exports = {addTraceroutesToDb};
