const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.post('/sendIp',async function(request, response){
    const ip = request.body.ip;
    let location = await getLocation(ip);
    console.log("ip: " , ip);
    console.log("location: ", location);
    response.status = 200;
    return response

});

app.listen(process.env.PORT || 5000, () =>{})

//CHANGE ONCE WORKING
async function getLocation(ip) {
    // let fakeIp = "2a01:cb04:a33:c00:1eb:4711:4a98:1ce2"
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
