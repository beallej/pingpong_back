let fs = require('fs');


//output should look like this:
/*
*
* {"traceroutes":
*   [
*     {
*       "dst": "77.136.40.239",
*       "route": ["193.104.34.161", "185.50.131.182", "185.50.131.190", "185.50.131.30", "149.6.72.105", "154.25.8.145", "154.25.9.141", "154.25.9.137", "130.117.50.41", "130.117.49.41", "130.117.49.78", "154.54.38.66", "149.11.175.26", "77.129.216.102", "77.128.11.17", "77.136.10.153", "77.154.230.106"]
*     },
*     {
*       "dst": "86.246.79.246",
*       "route": ["193.104.34.161", "185.50.131.182", "185.50.131.190", "185.50.131.30", "149.6.72.105", "154.25.8.145", "154.25.9.141", "154.25.9.137", "130.117.49.78", "130.117.49.41", "130.117.50.41", "154.54.38.66", "130.117.0.166", "130.117.15.94", "130.117.15.234", "81.253.184.181", "193.251.131.129", "81.52.200.195", "193.252.137.73"]
*     },
*     {
*       "dst": "185.50.131.178",
*       "route": []
*     },
*     {
*       "dst": "83.202.246.177",
*       "route": ["193.104.34.161", "185.50.131.182", "185.50.131.190", "185.50.131.30", "149.6.72.105", "154.25.8.145", "154.25.9.141", "154.25.9.137", "130.117.49.78", "130.117.49.41", "130.117.49.78", "154.54.38.66", "130.117.0.166", "154.54.38.66", "130.117.15.94", "81.253.184.181", "193.252.137.73"]
*     },
*     {
*       "dst": "93.23.197.11",
*       "route": ["193.104.34.161", "185.50.131.182", "185.50.131.190", "185.50.131.30", "149.6.72.105", "154.25.8.145", "154.25.9.137", "154.25.9.141", "154.25.9.137", "130.117.49.41", "130.117.49.78", "130.117.49.41", "154.54.38.66", "149.11.175.26", "77.129.216.102", "77.129.216.177", "77.136.10.33", "77.136.134.2"]
*     },
*     {
*       "dst": "77.205.116.215",
*       "route": ["193.104.34.161", "185.50.131.182", "185.50.131.190", "185.50.131.30", "149.6.72.105", "154.25.8.145", "154.25.9.137", "130.117.49.78", "154.54.38.66", "149.11.175.26", "80.118.4.181", "80.118.4.181", "77.130.8.94"]
*     }
*    ],
*   "src": "185.50.131.178"
*   }
*
* */
function parseTxt(txt){
    let resJSON = {}
    resJSON["traceroutes"] = []
    res = "{\"traceroute\" :" +"\n" +"\n" +"[ "
    var regExp = /\(([^)]+)\)/;//to match text between ()
    var i = 0 ; 
    let compteur = 0 ; 
    while (i < txt.length-1) {
    if ( txt[i].includes("traceroute to")) { 
         compteur++;
         resJSON["traceroutes"]["traceroute"+compteur] = {}
         var y = i ; 
        

        res+= "\n" + " { " +"\n" + "\"dst\": "
        var matches = regExp.exec(txt[i])
        resJSON["traceroutes"]["traceroute"+compteur]["dst"] = matches[1]
        resJSON["traceroutes"]["traceroute"+compteur]["route"] = []
        res+="\"" + matches[1] + "\"," +"\n" +" \"route\" : ["
        y++ ; 
        while (!txt[y].includes("traceroute to") && !txt[y].includes("Src is")) { 
            if ( !txt[y+1].includes("traceroute to")) {
            var matches2 = regExp.exec(txt[y])
            if (matches2 !==null ) { 
                resJSON["traceroutes"]["traceroute"+compteur]["route"].push(matches2[1])
                res+= "\"" + matches2[1] + "\", " 
            }
            y++
            }
            if ( txt[y+1].includes("traceroute to") || txt[y+1].includes("Src is")) {
                var matches2 = regExp.exec(txt[y])
                if (matches2 !==null ) { 
                    resJSON["traceroutes"]["traceroute"+compteur]["route"].push(matches2[1])
                    res+= "\"" + matches2[1] }
                y++
                }
        }
       
        i = y ; 
        res+= " ]" +"\n" + "},"


    }

    if (txt[i].includes("Src is")) { 

       
        i++ ; 
        resJSON["src"] = li2[i];
        res+= "\n" + "]," + "\n" + "\"src\":" + li2[i] ; 
        res+= "\n" +"}"
    }
}
    
         
  
   
    
    fs.writeFile("output.txt",resJSON.toString())
    return resJSON;

}

var data = fs.readFileSync('test.txt', 'utf8');

li = data.split("\n")
li2 = li.filter(el => !el.includes("* * *"))
result = parseTxt(li2)
console.log(result)




module.exports = {parseTxt};