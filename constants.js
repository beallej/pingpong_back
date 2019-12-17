
const constants = () => {
    const IP_TYPES = Object.freeze({'USER': 'USER', 'INTERMEDIATE': "INTERMEDIATE"})
    const QUERY_STRINGS = Object.freeze({
        'USER': {
            'CREATE': 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE, ASN, ISP) VALUES($1, $2, $3, $4, $5) RETURNING *',
            'EXISTS': 'INSERT INTO INTERMEDIATE_IP_INFO(ADDRESS, LATITUDE, LONGITUDE, ASN, ISP) VALUES($1, $2, $3, $4, $5) RETURNING *',
            'GET_ALL': 'SELECT * FROM IP_INFO',
        },
        'INTERMEDIATE': {
            'CREATE': 'SELECT * FROM IP_INFO WHERE ADDRESS = $1',
            'EXISTS': 'SELECT * FROM INTERMEDIATE_IP_INFO WHERE ADDRESS = $1',
            'GET_ALL': 'SELECT * FROM INTERMEDIATE_IP_INFO',
        }
    });
};
