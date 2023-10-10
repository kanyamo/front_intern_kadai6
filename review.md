# コードレビュー

## 総評
この課題では、以下のような点が課題として提示されていました。

- 京都市の2021年の不動産取引を表示
- 取引地点の住所情報から位置情報を取得
- 位置情報を使って天気を取得

これらの要件がJavaScriptで確実に実装されていました。特に、APIキーが正しくなかったときやデータが存在しなかったときのエラーハンドリングも適切に行われているのが素晴らしいと思います。基本的なコーディングは出来ているので、以下に細かい改善点を挙げていきます。

## 詳細

### 京都市の2021年の不動産取引を表示
`showEstateData` 関数で、ボタンが押されたときのコールバックが実装されていました。
改善点がいくつかあるので順に見ていきます。

#### 1. 関数の処理内容について
現状で、 `showEstateData` 関数では、 `addEventListener` でボタンが押されたときのコールバックを登録しています。
しかし、関数の名前から、関数の実行時に不動産取引のデータを表示するという処理を想像してしまいます。
そこで、次のように関数の内容を変更することを提案します。

```js
function showEstateData() {
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
}
```
この関数の呼び出し側は、次のようになります。

```js
document.addEventListener('DOMContentLoaded', () => {
  const set_bttn = document.getElementById('set');
  const reset_bttn = document.getElementById('reset');

  //APIキーのセット
  setApiKey(set_bttn, storage);
  //APIキーのリセット
  resetApiKey(set_bttn, reset_bttn, storage);
  //不動産取引の結果を表示
  document.getElementById('output').addEventListener(
    'click',
    showEstateData,
    false
  );
}, false);
```
これは、 `setApiKey` 関数や `resetApiKey` 関数にも同様の変更を加えたほうがいいとは思います。

#### 2. XMLHttpRequestの代わりにfetchを使う
現状では、 `XMLHttpRequest` を使っていますが、 `fetch` を使うことで、コードが簡潔になります。
また、 `fetch` を使うことで、 `Promise` を使って非同期処理を扱うことができます。
`Promise` を使うことで、 `addEventListener` のコールバック地獄を避けることができます。

```js
async function showEstateData(url) {
  const result = document.getElementById('result');

  try {
    // 通信開始のフィードバックを表示
    result.textContent = '通信中...';

    // APIからデータをフェッチ
    const response = await fetch(url);

    // レスポンスがOKでなければエラーをスロー
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // レスポンスボディをJSONとしてパース
    const jsonData = await response.json();
    const data = jsonData.data;

    // データがnullまたはundefinedであればメッセージを表示
    if (data == null) {
        result.textContent = 'データが存在しませんでした.';
        return;
    }

    //指定された条件に応じてデータを並び替える
    sort(data);

    //データをリスト化し、resultに表示する
    const ul = createDataList(data);
    result.replaceChild(ul, result.firstChild);

  } catch (error) {
    // エラーハンドリング（エラーメッセージの表示など）
    result.textContent = 'サーバーエラーが発生しました.';
    console.error('Fetch error: ', error.message);
  }
}
```

### 取引地点の住所情報から位置情報を取得
`showWeather` 関数で、住所情報から位置情報を取得、天気を表示しています。

#### URLを組み立てる処理について
現状では、次のようにURLを組み立てています。

```js
const yahoo_url = `${YAHOO_API_URL}?appid=${YAHOO_APPID}&query=${encodeURIComponent(address)}&output=json&callback=getCoordinates`;
```

この処理は、 `URL()` および `URLSearchParams()` を使って次のように書き換えることができます。

```js
// Base URLをセット
const yahooApiUrl = new URL(YAHOO_API_URL);

// クエリパラメータをセット
const params = new URLSearchParams({
  appid: YAHOO_APPID,
  query: address,  // URLSearchParams が自動でエンコードを行います
  output: 'json',
  callback: 'getCoordinates'
});

// クエリパラメータをURLに追加
yahooApiUrl.search = params;

// URLオブジェクトを文字列に変換
const yahoo_url = yahooApiUrl.toString();
```

このように実装することで、安全にクエリパラメータをエンコードし、最終的な文字列を構築することができます。さらに、 `URL()` は、URLの構文が正しいかどうかをチェックしてくれるので、URLの構文が正しくない場合には例外をスローしてくれます。
`weather_url` も同様に書き換えることができます。

---

以下、細かい改善点についてです。

### 変数の命名について
JavaScriptでは、変数名にキャメルケースを使うのが一般的です。そのため、 `yahoo_url` や `weather_url` は `yahooUrl` や `weatherUrl` と書き換えたほうがいいと思います。

### APIキーの管理について
今回の課題ではフロントエンドに限定した簡単なアプリ作成なので仕方ないですが、本来、クライアントサイドのストレージ( `sessionStorage` など)にAPIキーを保存するのはセキュリティ上推奨されません。本番アプリの場合、バックエンドを通じてAPIリクエストを行う設計にすることをおすすめします。

### その他
- 各ファイルの最後の行は空行にするのが一般的です。
- `showEstateData` 関数の中で宣言されている `data` は、 `addEventListener` の中で宣言し、 `const` とするべきです。
- htmlファイルの `title` タグの中身を何かページの内容を表すものに変更したほうがいいと思います。
- typoを修正しました。（'adress' -> 'address'）
