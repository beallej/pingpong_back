function parseTxt(txtRaw){

    let lines = txtRaw.split("\n")
    let txt = lines.filter(el => !el.includes("* * *"))


    let resJSON = {}
    resJSON["traceroutes"] = []
    var regExp = /\(([^)]+)\)/;//to match text between ()
    var i = 0 ; 
    while (i < txt.length-1) {
        if ( txt[i].includes("traceroute to")) {
             var y = i ;
             let traceroute = {}
            var matches = regExp.exec(txt[i])

            traceroute["dst"] = matches[1]
            traceroute["route"] = []
            y++ ;
            while (!txt[y].includes("traceroute to") && !txt[y].includes("Src is")) {
                if ( !txt[y+1].includes("traceroute to")) {
                var matches2 = regExp.exec(txt[y])
                if (matches2 !==null ) {
                    traceroute["route"].push(matches2[1])
                }
                y++
                }
                if ( txt[y+1].includes("traceroute to") || txt[y+1].includes("Src is")) {
                    var matches2 = regExp.exec(txt[y])
                    if (matches2 !==null ) {
                        traceroute["route"].push(matches2[1])
                        }
                    y++
                    }
            }
            resJSON.traceroutes.push(traceroute)
            i = y ;
        }

        if (txt[i].includes("Src is")) {
            i++ ;
            resJSON["src"] = txt[i];
        }
    }
    return resJSON;
}

module.exports = {parseTxt};
