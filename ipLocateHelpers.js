const iplocate = require('node-iplocate');
const fetch = require("node-fetch")

async function getLocation(ip) {

    iplocate(ip).then((results) => {
        console.log(results);
    });
    try {
        const data = await iplocate(ip);
        console.log("iplocate", data)
        return {
            latitude: data.latitude,
            longitude: data.longitude,
            country_code: data.country_code,
            asn: data.asn,
            isp: data.org
        }
    } catch (err) {
        console.log("error fetching location", err)
    }
    return null
}


async function getLocationMultipleAPIs(ip) {
    let apis =[getLocation, getLocationIpStack, getLocationIPGeolocation, getLocationIP2Location, getLocationIpApi, getLocationIpDashApi, getLocationIPInfo];
    let i= 0;
    let location = {};
    let _location;
    while ((location.country_code !== "FR") && i < apis.length) {
        console.log(!location.country_code, i < apis.length)
        _location = await apis[i](ip);
        console.log(_location)
        if (_location && _location.country_code === "FR"){
            location = {
                latitude: _location.latitude,
                longitude: _location.longitude,
                country_code: _location.country_code,
                asn: _location.asn || location.asn,
                isp: _location.isp || location.isp
            }
        } else if (_location && (!location.latitude || !location.longitude || !location.isp)) {
            location = {
                latitude: _location.latitude || location.latitude,
                longitude: _location.longitude || location.longitude,
                country_code: _location.country_code || location.country_code,
                asn: _location.asn || location.asn,
                isp: _location.isp || location.isp

            };
        }
        i++;
        console.log("location!", location)

    }
    return location;
}

async function getLocationIpStack(ip) {
    let search = "http://api.ipstack.com/" + ip
        + "?access_key=" + "938aa5bb84712b5de3034380f0b490d6";
    console.log("IPSTACK", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log(data)
        return {
            latitude: data.latitude, longitude: data.longitude, country_code: data.country_code
        }
    } catch (e) {
        console.log(e)
    }
}


async function getLocationIPGeolocation(ip){
    let search = "https://api.ipgeolocation.io/ipgeo?apiKey="+ "5a863615f5e44b509d71bc81c311606c" + "&ip=" + ip
    console.log("IPGEOLOCATION", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log(data)
        return {
            latitude: data.latitude, longitude: data.longitude, isp: data.isp, country_code: data.country_code2
        }
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIP2Location(ip){
    let search = "https://api.ip2location.com/v2/?ip="+
        ip + "&key=demo&package=WS24";
    console.log("IP2LOCATION", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log(data)
        return {
            latitude: data.latitude, longitude: data.longitude, isp: data.isp, country_code: data.country_code
        }
        return data
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIPInfo(ip){
    let search = "https://ipinfo.io/" + ip + "?token=4b9d8bc4147866";
    console.log("IPINFO", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log(data)

        let locArray = data.loc ? data.loc.split(",") : [null, null];
        return {
            latitude: locArray[0], longitude: locArray[1], country_code: data.country, isp: data.org
        }
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIpApi(ip){
    let search = "https://ipapi.co/" + ip + "/json/";
    console.log("IPAPI", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        console.log(data)
        return {
            latitude: data.latitude, longitude: data.longitude, isp: data.org, asn: data.asn, country_code: data.country_code
        }
    } catch (e) {
        console.log(e)
    }
}

async function getLocationIpDashApi(ip){
    let search = "http://ip-api.com/json/" + ip;
    console.log("IPDASHAPI", search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        let asn = data.as ? data.as.split(" ")[0] : null;
        console.log(data);
        return {
            latitude: data.lat, longitude: data.lon, isp: data.org, asn: asn, country_code: data.countryCode
        }
        return data
    } catch (e) {
        console.log(e)
    }
}
// not possible: 193.104.34.161, 154.25.9.141, 154.25.9.137, 154.25.8.145, 130.117.0.166, 130.117.15.94, 130.117.15.106, 130.117.15.234
//ok 77.67.123.210, 149.11.175.26, 154.54.38.66, 130.117.50.41, 130.117.49.41, 130.117.50.134
// getLocationMultipleAPIs("130.117.15.234").then((dat) => console.log("FINAL", dat)).catch((e) => console.log(e));
module.exports = {getLocationMultipleAPIs};
