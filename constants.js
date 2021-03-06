/*** types of ip addresses, user or intermediate (discoverered during tracerotue) ***/
const IP_TYPES = Object.freeze({'USER': 'USER', 'INTERMEDIATE': "INTERMEDIATE"});

/*** Query templates to use with postgres ***/
const QUERY_STRINGS = Object.freeze({
    'USER': {
        'CREATE': 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE, ASN, ISP, COUNTRY_CODE) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
        'GET_ONE': 'SELECT * FROM IP_INFO WHERE ADDRESS = $1',
        'GET_ALL': 'SELECT * FROM IP_INFO',
    },
    'INTERMEDIATE': {
        'CREATE': 'INSERT INTO INTERMEDIATE_IP_INFO(ADDRESS, LATITUDE, LONGITUDE, ASN, ISP, COUNTRY_CODE) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
        'GET_ONE': 'SELECT * FROM INTERMEDIATE_IP_INFO WHERE ADDRESS = $1',
        'GET_ALL': 'SELECT * FROM INTERMEDIATE_IP_INFO',
    }
});

module.exports = {IP_TYPES, QUERY_STRINGS};
