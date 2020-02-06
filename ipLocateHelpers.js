const iplocate = require('node-iplocate');
const fetch = require("node-fetch")

/*** Gets the location data (lat, lon, isp, asn) for a given ip address, using multiple apis incase one fails. ***/
async function getLocationMultipleAPIs(ip) {
    let apis =[getLocationIpLocate, getLocationIpStack, getLocationIPGeolocation, getLocationIP2Location, getLocationIpApi, getLocationIpDashApi, getLocationIPInfo];
    let i = 0;
    let location = {};  //final object
    let _location;      //temporary obect to hold response from api

    //If the api returns back a location that is not in France, the latitude and longitude are most likely erroneous, and we should try another api.
    while ((location.country_code !== "FR") && i < apis.length) {
        _location = await apis[i](ip);

        //Location data from france is most likely correct, use it.
        if (_location && _location.country_code === "FR"){
            location = {
                latitude: _location.latitude,
                longitude: _location.longitude,
                country_code: _location.country_code,
                asn: _location.asn || location.asn,   //not all apis return asn, so use last one saved as default
                isp: _location.isp || location.isp    //not all apis return isp, so use last one saved as default
            }
        } else if (_location && (!location.latitude || !location.longitude || !location.isp)) {  //we still save the location info incase we are unable to find a location in france
            location = {
                latitude: _location.latitude || location.latitude,
                longitude: _location.longitude || location.longitude,
                country_code: _location.country_code || location.country_code,
                asn: _location.asn || location.asn,
                isp: _location.isp || location.isp

            };
        }
        i++;
    }
    return location;
}

async function getLocationIpLocate(ip) {

    iplocate(ip).then((results) => {
        console.log(results);
    });
    try {
        const data = await iplocate(ip);
        const resp =  {
            latitude: data.latitude,
            longitude: data.longitude,
            country_code: data.country_code,
            asn: data.asn,
            isp: data.org
        }
        console.log("API IPLOCATE: ", resp)
        return resp;
    } catch (err) {
        console.log("error fetching location", err)
    }
    return null
}

async function getLocationIpStack(ip) {
    let search = "http://api.ipstack.com/" + ip
        + "?access_key=" + "938aa5bb84712b5de3034380f0b490d6";
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        const resp = {
            latitude: data.latitude, longitude: data.longitude, country_code: data.country_code
        };
        console.log("API IPSTACK: ", resp);
        return resp
    } catch (e) {
        console.log(e)
    }
}


async function getLocationIPGeolocation(ip){
    let search = "https://api.ipgeolocation.io/ipgeo?apiKey="+ "5a863615f5e44b509d71bc81c311606c" + "&ip=" + ip
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        const resp = {
            latitude: data.latitude, longitude: data.longitude, isp: data.isp, country_code: data.country_code2
        };
        console.log("API IPGEOLOCATION: ", resp);
        return resp;
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIP2Location(ip){
    let search = "https://api.ip2location.com/v2/?ip="+
        ip + "&key=demo&package=WS24";
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        const resp = {
            latitude: data.latitude, longitude: data.longitude, isp: data.isp, country_code: data.country_code
        }
        console.log("API IP2LOCATION: ", resp);
        return resp;
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIPInfo(ip){
    let search = "https://ipinfo.io/" + ip + "?token=4b9d8bc4147866";
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        let locArray = data.loc ? data.loc.split(",") : [null, null];
        const resp = {
            latitude: locArray[0], longitude: locArray[1], country_code: data.country, isp: data.org
        };
        console.log("API IPINFO", resp)
        return resp;
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIpApi(ip){
    let search = "https://ipapi.co/" + ip + "/json/";
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        const resp = {
            latitude: data.latitude, longitude: data.longitude, isp: data.org, asn: data.asn, country_code: data.country_code
        };
        console.log("API IPAPI: ", resp)
        return resp;
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIpDashApi(ip){
    let search = "http://ip-api.com/json/" + ip;
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        let asn = data.as ? data.as.split(" ")[0] : null;
        const resp = {
            latitude: data.lat, longitude: data.lon, isp: data.org, asn: asn, country_code: data.countryCode
        };
        console.log("API IP-API:", search);
        return resp
    } catch (e) {
        console.log(e)
    }
}

module.exports = {getLocationMultipleAPIs};
