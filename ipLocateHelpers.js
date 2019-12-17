const iplocate = require('node-iplocate');


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

export {getLocation};
