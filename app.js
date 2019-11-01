const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');
const pg = require('pg');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const { Client } = require('pg');
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
    let dbRes = await saveToDb(ip, location);
    response.status = 200;
    return response

});

app.listen(process.env.PORT || 5000, () =>{})

async function getLocation(ip) {
    let search = "http://api.ipstack.com/" + ip.trim()
        + "?access_key=" + "938aa5bb84712b5de3034380f0b490d6"
        + "&fields=latitude,longitude";
    console.log(search);
    fetch(search, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}})
        .then(response => {
        response.json()
            .then((data) => {
                console.log(data)
            return {latitude: data.latitude, longitude: data.longitude}
        })
            .catch((err) => {
                console.log(error)
                return null
            }
        );
    })
        .catch(err => {
            console.log(err);
            return null;
        });
}

const text = 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE) VALUES($1, $2, $3) RETURNING *';
async function saveToDb(ip, location) {
    const values = [ip, location.latitude, location.longitude]
    try {
        const res = await pool.query(text, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log(err.stack)
    }
}

