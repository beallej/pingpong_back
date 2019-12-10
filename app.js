const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');
const { Client } = require('pg');
const iplocate = require('node-iplocate');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env['GRAPHENEDB_URL']);

db.cypher({
    query: 'CREATE (n:Person {name: {personName}}) RETURN n',
    params: {
        personName: 'Bob'
    }
}, function(err, results){
    var result = results[0];
    if (err) {
        console.error('Error saving new node to database:', err);
    } else {
        console.log('Node saved to database with id:', result['n']['_id']);
    }
});
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();

app.post('/traceroute',async function(request, response){
    // let ipList = request.body.ipList;
    // let src = request.body.src.trim();
    // let dst = request.body.dst.trim();
    // ipList.map((ip) => {
    //     let location = getLocation(ip.trim());
    // })

    console.log("BODY: " + request.body)

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
const existsText = 'SELECT * FROM IP_INFO WHERE ADDRESS = $1';
async function saveToDb(ip, latitude, longitude, asn, isp) {
    const values = [ip, latitude, longitude, asn, isp]
    try {
        let res = await client.query(existsText, [ip])
        if (res.rows.length > 0) {
            console.log("ip already in db" + ip)
            return null;
        }
        res = await client.query(insertText, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving to db", err.stack)
        return null;
    }
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
