'use strict';

//京都市の2021年の不動産取引
const ESTATE_API_URL = 'https://www.land.mlit.go.jp/webland/api/TradeListSearch?from=20211&to=20214&city=26100';
//Yahoo!ジオコーダAPI
const YAHOO_API_URL = 'https://map.yahooapis.jp/geocode/V1/geoCoder';
//Open Weather Map API
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
//入力された情報を格納するストレージ
const storage = sessionStorage;

//APIキーをストレージに格納する関数
function setApiKey(set_bttn, storage) {
  set_bttn.addEventListener('click', () => {
    const yahoo = encodeURIComponent(document.getElementById('yahoo').value);
    const weather = encodeURIComponent(document.getElementById('weather').value);
    storage.setItem('YAHOO_APPID', yahoo);
    storage.setItem('WEATHER_APPID', weather);
    //セットボタンの無効化
    set_bttn.disabled = true;
  })
}

//APIキーをリセットする関数
function resetApiKey(set_bttn, reset_bttn, storage) {
  reset_bttn.addEventListener('click', () => {
    //ストレージとAPI入力欄のリセット
    storage.clear();
    document.getElementById('yahoo').value = '';
    document.getElementById('weather').value = '';
    set_bttn.disabled = false;
  })
}

//不動産取引データを表示する関数
function showEstateData() {
  document.getElementById('output').addEventListener('click', () => {
    const result = document.getElementById('result');
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('loadstart', () => {
      result.textContent = '通信中...';
    }, false); 
    let data;
    xhr.addEventListener('load', () => {
      data = JSON.parse(xhr.responseText).data;
      if (data === null) {
        result.textContent = 'データが存在しませんでした.';
      } else {
        //指定された条件に応じてデータを並び替える
        sort(data);
        //データをリスト化し、resultに表示する
        const ul = createDataList(data);
        result.replaceChild(ul, result.firstChild);
      }
    }, false);
    xhr.addEventListener('error', () => {
      result.textContent = 'サーバーエラーが発生しました.';
    }, false);
    xhr.open('GET', ESTATE_API_URL);
    xhr.send(null);
  }, false);
}

//データの並べ替えを行う関数
function sort(data) {
  const PERIOD_ORDER = ['2021年第１四半期', '2021年第２四半期', '2021年第３四半期', '2021年第４四半期'];
  const sort = document.getElementById('sort').value;
  switch(sort) {
    case 'desc':
      //取引価格が高い順
      data.sort((x, y) => {
      return parseInt(x.TradePrice) > parseInt(y.TradePrice) ? -1 :1;
      });
      break;
    case 'asc':
      //取引価格が安い順
      data.sort((x, y) => {
        return parseInt(x.TradePrice) < parseInt(y.TradePrice) ? -1 : 1;
        }); 
        break; 
    case 'newer':
      //取引時期が新しい順
      data.sort((x, y) => {
        return PERIOD_ORDER.indexOf(x.Period) > PERIOD_ORDER.indexOf(y.Period) ? -1 : 1;
        }); 
        break;
    case 'older':
      //取引時期が古い順
      data.sort((x, y) => {
        return PERIOD_ORDER.indexOf(x.Period) < PERIOD_ORDER.indexOf(y.Period) ? -1 : 1;
        }); 
        break;
  }
}

//resultに追加するデータリストを作成する関数
function createDataList(data) {
  const ul = document.createElement('ul');  
  //表示するテキストの生成と格納      
  for (let i = 0, len = data.length; i < len; i++) {
    if (data[i].PricePerUnit === undefined) {
      //undefinedの処理
      data[i].PricePerUnit = '不明';
    }
    if (data[i].Structure === undefined) {
      //undefinedの処理
      data[i].Structure = '不明';
    }
    if (data[i].Use === undefined) {
      //undefinedの処理
      data[i].Use = '不明';
    }
    //要素の生成
    const li = document.createElement('li');
    li.className = 'container';
    const br1 = document.createElement('br');
    const br2 = document.createElement('br');          
    const text1 =  document.createTextNode(
      `Num ${i + 1} ------------------------------`
      );
    const text2 =  document.createTextNode(
      `取引種別：${data[i].Type} 取引価格：${Number(data[i].TradePrice).toLocaleString()}円 坪単価：${data[i].PricePerUnit} 取引時期：${data[i].Period}`
    );
    const text3 =  document.createTextNode( 
      `住所：${data[i].Prefecture + data[i].Municipality + data[i].DistrictName} 構造：${data[i].Structure} 用途：${data[i].Use}`
    );
    //各地点の天気表示ボタン
    const bttn = document.createElement('button');
    bttn.textContent = 'この地点の天気を表示';
    bttn.onclick = () => {
      showWeather(i, data[i].Prefecture, data[i].Municipality, data[i].DistrictName);
    };
    //要素を追加
    li.appendChild(text1);
    li.appendChild(br1);
    li.appendChild(text2);
    li.appendChild(br2);
    li.appendChild(text3);
    li.appendChild(bttn);
    ul.appendChild(li);
  }
  return ul;
}

//各地点の天気を表示する関数
function showWeather(index, pref, muni, dist) {
  //ボタンに対応する住所を取得
  let address;
  if(dist.includes('学区')) {
    address = pref + muni;
  } else {
    address = pref + muni + dist;
  }
  //ストレージから値を取得し、問い合わせURLを作成
  const YAHOO_APPID = storage.getItem('YAHOO_APPID');
  const yahoo_url = `${YAHOO_API_URL}?appid=${YAHOO_APPID}&query=${encodeURIComponent(address)}&output=json&callback=getCoordinates`;
  //Yahoo!ジオコーダAPIキーと住所からその地点の緯度・経度を取得
  loadJSONP(yahoo_url, 'getCoordinates')
  .then((response) => {
    //データから緯度・経度を取得
    const coordinates = response.Feature[0].Geometry.Coordinates.split(',');
    const lon = coordinates[0];
    const lat = coordinates[1];
    //ストレージから値を取得し、問い合わせURLを作成  
    const WEATHER_APPID = storage.getItem('WEATHER_APPID');
    const weather_url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_APPID}&units=metric&lang=ja&callback=getWeather`;
    //Open Weather Map APIキーと緯度・経度からその地点の天気を取得      
    return loadJSONP(weather_url, 'getWeather');
  })
  .then((response) => {
    //データから天気・アイコン・気温を取得
    const weather = response.weather[0].description;
    const weather_icon = response.weather[0].icon;
    const temp = response.main.temp;
    //天気・アイコン・気温を表示
    const li = document.getElementsByClassName('container')[index];
    const div = document.createElement('div');
    const p = document.createElement('p');
    const text = document.createTextNode(
      `天気：${weather} 気温：${temp}℃`
    );
    const img = document.createElement('img');
    img.src = `https://openweathermap.org/img/w/${weather_icon}.png`;
    p.appendChild(text);
    div.appendChild(p);
    div.appendChild(img);
    li.appendChild(div);
  }, (error) => {
    //APIキーが正しくないとき、メッセージを表示
    const li = document.getElementsByClassName('container')[index];
    const br = document.createElement('br');
    const text = document.createTextNode(error);
    li.appendChild(br);
    li.appendChild(text);
  })
}

//JSONPをPromise化する関数
function loadJSONP(url, callback) {
  //JSONPを実行
  const script = document.createElement('script');
  script.src = url;
  document.body.appendChild(script);
  //JSONPをPromise化する
  return new Promise((resolve, reject) => {
    window[callback] = resolve;
    script.addEventListener('error', reject);
  }).then((response) => {
    //成功した場合、windowとscriptを消して、データだけ返す
    delete window[callback];
    document.body.removeChild(script);
    return Promise.resolve(response);
  }, () => {
    //失敗した場合、windowとscriptを消して、エラーメッセージを返す
    delete window[callback];
    document.body.removeChild(script);
    return Promise.reject('APIキーを正しく入力してください.');
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const set_bttn = document.getElementById('set');
  const reset_bttn = document.getElementById('reset');

  //APIキーのセット
  setApiKey(set_bttn, storage);
  //APIキーのリセット
  resetApiKey(set_bttn, reset_bttn, storage);
  //不動産取引の結果を表示
  showEstateData();
}, false);
