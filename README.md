# ブラウザ用パズル

**[ブラウザで遊ぶ（GitHub Pages）](https://president-code-ai.github.io/Puzzle-Boy/)**

スマートフォンでは、QRコードをカメラで読み取って開けます。

![ゲームの公開URLを開くQRコード](assets/Puzzle-Boy-QR.png)

[QRのPNG](assets/Puzzle-Boy-QR.png) / [印刷用SVG](assets/Puzzle-Boy-QR.svg)

**`index.html` をダブルクリックして開くと、そのまま1面から遊べます。**
インストール・サーバー・インターネット接続は不要です。本体7ファイルを同じフォルダーに置いてください。再配布する場合は `THIRD_PARTY_NOTICES.txt` のライセンス全文も必ず一緒に保持してください。

初代ゲームボーイ版『パズルボーイ』の「ひとりでパズル」にある、3段階×10面を再現した非公式の独自実装です。ゲーム内のタイトル画面はありません。トライアル・通信対戦は対象外です。

## 遊び方

回転扉や石を押して、出口の階段へ向かいます。石は引けません。石の全体が穴の上に重なると沈み、そこを歩けるようになります。仲間がいる面は、全員が階段へ着くとクリアです。

- スマホ：大きな十字キー（長押し対応）、または盤面をスワイプして移動。
- 床をタップ：仕掛けを動かさずに歩く。隣の石・扉をタップすると押す。
- 仲間切り替え：専用ボタン、または盤面の仲間をタップ。
- 「1手戻す」「やり直す」で試行錯誤。「LEVEL / FLOOR」から全30面を選択。
- 虫眼鏡：盤面を拡大。拡大中は操作中の人物を追いかけて表示。
- PC：方向キー / WASDで移動、Zで戻す、C / Spaceで仲間切り替え、Rでやり直し確認。

説明や面選択を開いている間、別タブを見ている間は時計が止まります。時間制限はありません。画面上の「？」でも遊び方を読めます。

絵はCanvasで新しく描画しています。9種類の効果音はWeb Audioで合成し、最初の操作から鳴ります。右上でオン・オフを切り替えられます。外部の画像・音源・フォント・ライブラリは不要です。

## 記録

途中の配置・クリアの印・設定は、このタブのメモリだけに保持します。**再読み込みやタブを閉じると消えます。** 好きな面を最初から選べるので、続きは面選択から再開してください。戻せる操作の保持上限は10,000件です。

外部通信、広告、アクセス解析、Cookie、ブラウザへの永続保存はありません。ライセンスを開く操作だけ同じフォルダー内のテキストを表示します。

## GitHub Pages

公開リポジトリは [president-code-ai/Puzzle-Boy](https://github.com/president-code-ai/Puzzle-Boy)。ルートの `index.html` がゲーム本体で、Pagesの公開元は `main` ブランチの `/ (root)` です。トップURLで直接盤面が開きます。すべて相対パスで、`.nojekyll` を同梱しています。ビルド工程・依存追加・独自Actionsワークフローは不要です。

QRは公開URL `https://president-code-ai.github.io/Puzzle-Boy/` を直接収録しています。短縮URL・外部QRサービス・追跡用リンクは使いません。既存の自作エンコーダーを再利用し、追加依存なしでPNGとSVGを作成しました。PNGからのURL復号、CRC、誤り訂正符号を検証しています。生成コードは `tools/generate-qr.cjs`。既存のQRは無断で上書きしない仕様です。

`.research/` と `.verification/` は全体をGit追跡から除外しています。調査資料・ブラウザプロファイル・認証用処理・ログを含めず、本体・QR・説明・検証用コードだけを公開します。

## 検証

既存Node.jsで実行できます。追加パッケージはありません。

```powershell
node --test tests/core.cjs
node --check app.js
node --check engine.js
node --check render.js
node --check audio.js
```

全30面・計5,098歩の解答再生、原作解析データ由来の盤面署名との一致、衝突・穴埋め・回転・全員脱出・状態の巻き戻しを確認しています。Edge 157ではローカルファイル、スマホ縦横サイズ、タッチ模擬、音の合成、全30面の描画を確認しました。実スマートフォン・Safari、スピーカーからの音の聴取は未確認です。

`tests/browser.cjs` は検証専用で、遊ぶためには不要です。既存Edgeを専用プロファイルで起動します。OSの起動履歴・ブラウザ管理領域への影響を含む明示承認を得た場合だけ、`PUZZLE_BOY_BROWSER_APPROVED=1` を指定して実行してください。プロファイル・キャッシュ・TEMP・ログ・画面画像は `.verification/` に指定しています。ブラウザ保護を無効化するフラグは使用していません。

公開版の検証では、さらに `PUZZLE_BOY_TEST_URL=https://president-code-ai.github.io/Puzzle-Boy/` を指定します。接続先はこの固定URLに限定し、実行記録は `.verification/pages/` に保存します。

盤面の調査元と補正は [RESEARCH.md](RESEARCH.md)、検証範囲は [VALIDATION.md](VALIDATION.md)、参照データのライセンスは [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) を参照してください。
