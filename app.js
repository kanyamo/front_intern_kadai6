document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('button').addEventListener("click", () => {
    let result = document.getElementById("result");
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if(xhr.readyState === 4) {
            if(xhr.status === 200) {
                console.log(JSON.parse(xhr.responseText));

            } else {
                result.textContent = xhr.statusText
            }; 
        } else {
            result.textContent = "通信中..."
        };
    }
    xhr.open("POST", "https://www.land.mlit.go.jp/webland/api/TradeListSearch?from=20151&to=20151&area=26", true)
    xhr.setRequestHeader("content-type", "application/json;charset=utf-8")
    xhr.withCredentials = true;
    xhr.send(null)

});
}, false)