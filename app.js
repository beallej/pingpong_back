const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');
const { Client } = require('pg');


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();



app.post('/sendIp',async function(request, response){
    const ip = request.body.ip;
    let location = await getLocation(ip);
    console.log("ip: " , ip);
    console.log("location: ", location);
    if (location.latitude && location.longitude){
        let dbRes = await saveToDb(ip, location.latitude, location.longitude);
    } else {
        console.log("location info null for ip: ", ip)
    }
    response.status = 200;
    return response

});

app.listen(process.env.PORT || 5000, () =>{})

async function getLocation(ip) {
    let search = "http://api.ipstack.com/" + ip.trim()
        + "?access_key=" + "938aa5bb84712b5de3034380f0b490d6"
        + "&fields=latitude,longitude";
    console.log(search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        return {latitude: data.latitude, longitude: data.longitude}
    } catch(err) {
        console.log("error fetching location", err)
        return null
    }

}

const text = 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE) VALUES($1, $2, $3) RETURNING *';
async function saveToDb(ip, latitude, longitude) {
    const values = [ip, latitude, longitude]
    try {
        const res = await pool.query(text, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving to db", err.stack)
        return null;
    }
}

