# 雪みる

日本のゲレンデを登録し、朝9時の雪質予想を比較するスマートフォン向けPWAです。[アプリを開く](https://ryuya-matsubara.github.io/ski-resort-condition2/)

## 使い方

「ゲレンデ追加」でスキー場名や都道府県を検索します。「今日・明日」では雪質、夜間新雪、朝の天気、一日の最低・最高気温、朝の推定積雪が分かります。カードをタップすると判定理由と予報地点の標高を確認できます。「雪質マップ」には今日から7日後までの日付が並びます。

候補にない斜面も「地図から登録」で追加できます。登録と取得済み予報は端末内に保存されます。ホーム画面への追加はiOSではSafariの共有メニュー、Androidではブラウザーのメニューから操作します。初回オンライン起動後は、オフラインでも保存済みの予報と日本の輪郭地図を開けます。

## 開発

Node.js 24 と npm を使用します。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

本番ビルドでは `dist/` に静的ファイルと、ファイル内容に応じて更新されるService Workerを生成します。GitHub Pagesの公開元は `main` ブランチのルートです。再公開するときはテストとビルドを実行し、生成された `assets/` と `sw.js` をソース変更と一緒にコミットして `main` に反映します。公開に使うGitHubアカウントには対象リポジトリの書き込み権限が必要です。

## データと判定

- 初期データは2026年11月21日版のOpenSkiDataを加工した国内499件です。検索候補には国コードJP・滑降対応・営業中の記録・最低最高標高ありの地点を収録しています。これはデータ作成時の区分です。各日の営業状況は現地の発表をご確認ください。
- 453件はコース上、46件はリフト沿いの地形データから、標高帯の中間に近い座標を選んでいます。データを更新する場合は出典の参照IDを照合し、同じ施設のアプリ内IDを維持します。
- Open-Meteoに各地点の緯度・経度・標高を指定し、日本時間で過去2日間と予報8日間の時間別データを取得します。登録済み地点だけをまとめて取得し、直近の予報を端末で再利用します。
- 朝までの48時間を時系列でたどり、雨・暖気による湿潤と再凍結を推定します。前日16時から当日9時までの乾いた新雪10 cm以上をパウダー、30 cm以上かつ低温・強風条件を満たす場合を極上パウダーとします。数値は初期の経験則です。現地の圧雪作業、斜面方位、体感によって違いが生じます。必要データに欠測がある場合は判定を保留します。

ゲレンデデータは [OpenSkiData / OpenSkiMap.org](https://www.openskidata.org/)、© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)、Skimap.org、Who's On First、© Mapterhorn に基づきます。加工した [resorts.jp.json](data/resorts.jp.json) を [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) で提供します。予報は [Open-Meteo](https://open-meteo.com/)（[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）、オンラインの背景地図は[地理院タイル](https://maps.gsi.go.jp/development/ichiran.html)、海岸線は [Natural Earth](https://www.naturalearthdata.com/) を使用しています。
