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
            return "(n" + index + ":IP " + hop + ")-[:PINGS]->"
        }).join("");
        let dst = route[-1];
        createString += "(n" + route.length -1 + ":IP " + dst + ")"
        createString += " RETURN path";
        console.log(createString);
    }).join(", ");

    let createResult = await session.run(createQueryString);
    session.close();
    return createResult
}

export {addTraceroutesToDb};
