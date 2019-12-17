const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');
const { Client } = require('pg');
const iplocate = require('node-iplocate');
// var neo4j = require('neo4j');
// var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);
var neo4j = require('neo4j-driver');

// var db = new neo4j.GraphDatabase("http://v303:GtGq5rldxu@hobby-geefdaeefcom.dbs.graphenedb.com:24789");


const graphenedbURL = process.env.GRAPHENEDB_BOLT_URL;
const graphenedbUser = process.env.GRAPHENEDB_BOLT_USER;
const graphenedbPass = process.env.GRAPHENEDB_BOLT_PASSWORD;
console.log(graphenedbURL, graphenedbUser, graphenedbPass, neo4j)
const driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();
/*
*
*traceroutes.append({"dst": address, "route": chemin})


print({"traceroutes": traceroutes, "src": ip})
* */
app.post('/traceroute',async function(request, response){

    let src = await getInfoForIp(request.body.src, 'user');
    console.log("src:", src);
    let routes = request.body.traceroutes.map(async (tr) => {
          let route = [src];
          let dstNode = await getInfoForIp(tr.dst, 'user');
          console.log("dst: ", dstNode)
          let tracerouteProm = tr.route.map((hop) => {return getInfoForIp(hop, 'intermediate')});
          let chemin = Promise.all(tracerouteProm);
          route.concat(chemin);
          route.push(dstNode);
          console.log("route: ", route)
    });
    console.log("routes: ", routes);
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
    console.log(createResult);

    return response.status(200).end()

});

app.post('/ip/add',async function(request, response){
    let ip = request.body.ip;
    ip =  ip.trim()  //remove extra newline char

    let location = await getLocation(ip);
    console.log("ip: " , ip);
    console.log("location: ", location);
    let dbRes;
    let status = 200;
    if (location.latitude && location.longitude){
        if (location.country_code !== "FR") {
            console.log("ip " + ip + " not in france, located in " + location.country_code)
            status = 406;
        } else {
            dbRes = await saveToDb(ip, location.latitude, location.longitude, location.asn, location.isp);
            status = 201;
        }

    } else {
        status = 404;
        console.log("location info null for ip: ", ip);
    }
    response.header("Access-Control-Allow-Origin", "https://pure-fortress-53953.herokuapp.com");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    return response.status(status).send(dbRes);

});

app.get('/ip/all', async function (request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        let allIpInfo = await getAllData();
        console.log("all ip info: ", allIpInfo)
        return response.status(200).send(allIpInfo);
    } catch (err) {
        return response.status(500).end();
    }
})

app.listen(process.env.PORT || 5000, () =>{})

async function getLocation(ip) {

    iplocate(ip).then((results) => {
        console.log(results);
    });
    try {
        const data = await iplocate(ip);
        return {latitude: data.latitude, longitude: data.longitude, country_code: data.country_code, asn: data.asn, isp: data.org}
    } catch(err) {
        console.log("error fetching location", err)
    }
    return null
}
const insertText = 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE, ASN, ISP) VALUES($1, $2, $3, $4, $5) RETURNING *';

async function saveToDb(ip, latitude, longitude, asn, isp) {
    const values = [ip, latitude, longitude, asn, isp]
    try {
        let existingEntry = await getInfoForIp(ip)
        if (existingEntry) {
            console.log("ip already in db" + ip)
            return null;
        }
        let res = await client.query(insertText, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving to db", err.stack)
        return null;
    }
}

const existsText = 'SELECT * FROM IP_INFO WHERE ADDRESS = $1';

async function getInfoForIp(ip, type=null){
    let res = await client.query(existsText, [ip])
    if (res.rows.length > 0) {
        let ipInfo = res.rows[0]
        if (type){
            return {type, ...ipInfo}
        } else {
            return ipInfo
        }
    }
    return null;
}

async function getAllData() {
    try {
        const qry = 'SELECT * FROM IP_INFO';
        const res = await client.query(qry)
        console.log(res.rows)
        return res.rows;
    } catch (err) {
        console.log("error querying to db", err.stack)
        return null;
    }
}


//
// const personName = 'Alice';
// const resultPromise = session.run(
//     'CREATE (a:Person {name: $name}) RETURN a',
//     {name: personName}
// );
//
// resultPromise.then(result => {
//     session.close();
//
//     const singleRecord = result.records[0];
//     const node = singleRecord.get(0);
//
//     console.log(node.properties.name);
//
//     // on application exit:
//     driver.close();
// });
