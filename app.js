// 京都市の2021年の不動産取引を問い合わせる API URL
const REAL_ESTATE_URL = "https://www.land.mlit.go.jp/webland/api/TradeListSearch?from=20211&to=20214&city=26100";
// Yahoo ジオコーダ API(住所から座標を取得する)
const yahoo_geo_url = "https://map.yahooapis.jp/geocode/V1/geoCoder?output=json&appid=";
// 天気取得 API
const weather_url = "https://api.openweathermap.org/data/2.5/weather?appid=";

// api url 格納用セッションストレージ
let storage = sessionStorage;

const realEstateAPI = () => {
    const result = document.getElementById("result");
    result.textContent = "通信中..."
    let xhr = new XMLHttpRequest();
    xhr.open("GET", REAL_ESTATE_URL, true);
    xhr.send();

    const promise = new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if(xhr.readyState != XMLHttpRequest.DONE) {
                return;
            };
            if(xhr.status >= 400) {
                return reject({ message: `Error: Failed with ${xhr.status}:${xhr.statusText}` })
            };
            resolve(JSON.parse(xhr.responseText))
        };
    });
    return promise;
};

// 天気情報をAPIから取得、欲しい情報だけ返す
const getWeatherAPI = (lat, lon) => {
    const api_url = `${weather_url}${storage["WEATHER_APPID"]}&lat=${lat}&lon=${lon}&lang=ja`;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", api_url);
    xhr.send();

    const promise = new Promise((resolve, reject) => {
        xhr.onreadystatechange = () => {
            if(xhr.readyState != XMLHttpRequest.DONE) {
                return;
            };
            if(xhr.status >= 400) {
                return reject({ message: `Error: Failed with ${xhr.status}:${xhr.statusText}` });
            };
            const data = JSON.parse(xhr.responseText)
            const dataDict = { 
                "weather": data.weather[0].description, 
                "iconUrl": `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
                "temperature": `${Math.round((data.main.temp-273.15)*10)/10}°C`
            };
            resolve(dataDict);
        };
    });
    return promise
}

// ソート関数
const sort = (real_estate_data) => {
    let order_label = document.sort.order.value;
    let data = real_estate_data.data;
    const TERM_SORT = ["2021年第１四半期", "2021年第２四半期", "2021年第３四半期", "2021年第４四半期"];

    // セレクトボタンの値に応じてソートを変更
    const promise = new Promise((resolve) => {
        switch(order_label) {
            case "deal-higher":
                resolve(data.sort((x, y) => {
                    return y.TradePrice - x.TradePrice
                }));
                break;
            case "deal-lower":
                resolve(data.sort((x, y) => {
                    return x.PriceTrade - y.PriceTrade
                }));
                break;    
            case "new":
                resolve(data.sort((x, y) => {
                    return TERM_SORT.indexOf(y.Period) - TERM_SORT.indexOf(x.Period)
                }));
                break;
            case "old":
                resolve(data.sort((x, y) => {
                    return TERM_SORT.indexOf(x.Period) - TERM_SORT.indexOf(y.Period)
                }));
                break;
            default :
                resolve(data);
                break;    
        };
    });
    return promise;
};

const loadYOLPJSONP = (addressQuery) => {
    // 特定の文字列が入ると検索が失敗するためより広い区で検索
    if(addressQuery.includes('学区')) {
        addressQuery = addressQuery.slice(0, addressQuery.indexOf("区")+1)
    };
    const encodeQuery = encodeURIComponent(addressQuery);
    var callbackName = 'jsonpCallback' + Math.random().toString(16).slice(2);
    const api_url = `${yahoo_geo_url}${storage["YAHOO_APPID"]}&query=${encodeQuery}&callback=${callbackName}`;
    var script = document.createElement('script');
    script.src = api_url;
    document.body.appendChild(script);

    // jsonp を then できるように promise化
    return new Promise((resolve, reject) => {
        window[callbackName] = resolve;
        script.addEventListener('error', reject);
    }).then(response => {
        delete window[callbackName];
        document.body.removeChild(script);
        return Promise.resolve(response);
    }, err => {
        var msg = e ? 'Execution Failed' : 'Request Timeout';
        delete window[callbackName];
        document.body.removeChild(script);
        return Promise.reject('JSONP ' + msg + ': ' + url);
    });
};

// yahoo api のデータから 緯度と経度を取得
const getCoordinates = (data) => {
    const coordinates = data.Feature[0].Geometry.Coordinates.split(",");
    const promise = new Promise((resolve) => {
        const dataDict = {
            "lat": coordinates[1],
            "lon": coordinates[0]
        }
        resolve(dataDict)
    });
    return promise;
};



document.addEventListener("DOMContentLoaded", () => {
    // フォームに api key を入力させる処理
    const yahooApi = document.getElementById("yahoo-api");
    const weatherApi = document.getElementById("weather-api");
    const setButton = document.getElementById('key-set');
    const resetButton = document.getElementById('key-reset');
    // セットボタンをクリックするとフォームを入力不可にしてsessionstorageに値を保存
    setButton.addEventListener("click", () => {
        storage.setItem('YAHOO_APPID', yahooApi.value);
        storage.setItem('WEATHER_APPID', weatherApi.value);
        yahooApi.disabled = true;
        weatherApi.disabled = true;
        setButton.disabled = true;
    });
    // リセットボタンをクリックするとフォームとストレージをリセット、フォームを入力できるように
    resetButton.addEventListener("click", () => {
        storage.clear();
        yahooApi.value= '';
        weatherApi.value = '';
        yahooApi.disabled = false;
        weatherApi.disabled = false;
        setButton.disabled = false;
    });
    // ここまでフォーム関連の処理

    // 出力ボタンが押された時の処理
    document.getElementById("button").addEventListener("click", () => {
        const result = document.getElementById("result");
        let frag = document.createDocumentFragment();
        Promise.resolve(realEstateAPI())
            .then(sort)
            .then(res => {
                result.innerHTML = '';
                res.forEach((val, index) => {
                    // 全体のコンテナ要素を作成
                    let divContainer = document.createElement('div')
                    divContainer.className = "container"
                    // 見出し作成
                    let dealNumText = document.createTextNode(`
                        Num ${index+1} ------------------------------
                    `)
                    // 取引項目のコンテナ作成
                    let divDeal = document.createElement('div')
                    let textDeal = document.createTextNode(`
                        取引種別：${val.Type || "不明"} 
                        取引価格：${val.TradePrice}円
                        坪単価：${val.PricePerUnit || "不明"}
                        取引時期：${val.Period || "不明"}
                        `)
                    divDeal.appendChild(textDeal)
                    // 住所のコンテナ作成
                    let divAddress = document.createElement('div')
                    let textAddress = document.createTextNode(`
                        住所：${val.Prefecture}${val.Municipality}${val.DistrictName}
                        構造：${val.Structure || "不明"}
                        用途：${val.Purpose || "不明"} 
                        `)
                    // 天気問合わせ用のボタンを作成
                    let button = document.createElement('button')
                    button.className = "show-weather"
                    button.value = `${val.Prefecture}${val.Municipality}${val.DistrictName}`
                    button.textContent = "この地点の天気を表示"
                    addAPIEvent(button)
                    divAddress.appendChild(textAddress)
                    divAddress.appendChild(button)
                    // 組み立て
                    divContainer.appendChild(dealNumText)
                    divContainer.appendChild(divDeal)
                    divContainer.appendChild(divAddress)
                    frag.appendChild(divContainer)
                })
                result.appendChild(frag)
            });
    });

    // 取引情報の各ボタンに天気を表示させるイベントを付与
    const addAPIEvent = (elem) => {
        elem.addEventListener("click", () => {
            // 緯度経度取得からの天気取得処理開始
            Promise.resolve(loadYOLPJSONP(elem.value))
                .then(getCoordinates)
                .then(res => getWeatherAPI(res.lat, res.lon))
                .then(res => {
                        if (elem.parentNode.lastChild.className === "container weather") {
                            elem.parentNode.removeChild(elem.parentNode.lastChild)
                        };
                        // 天気情報をボタンが押されたコンテナに追加
                        let divWeather = document.createElement('div') 
                        divWeather.className = "container weather"

                        let img = document.createElement("img")
                        img.src = res.iconUrl
                        let p = document.createElement("p")
                        p.textContent = `天気：${res.weather} 気温：${res.temperature}`

                        divWeather.appendChild(p)
                        divWeather.appendChild(img)

                        elem.parentNode.appendChild(divWeather)
                    },
                    err => {
                        if (elem.parentNode.lastChild.className === "container weather") {
                            elem.parentNode.removeChild(elem.parentNode.lastChild)
                        };
                        let divWeather = document.createElement('div') 
                        divWeather.className = "container weather"
                        divWeather.textContent = "APIキーを正しく入力してください."

                        elem.parentNode.appendChild(divWeather)
                        console.log(err)
                    })})
            
    }   


}, false)
