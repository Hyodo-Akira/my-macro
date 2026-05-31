============================================================
MyMacro 機能追加パッチ v3 (full / 完全版)
  追加機能:
  - オーバー時の赤文字表示 (kcal/P/F/C)
  - 摂取カウントアップ表示モード（設定 > 表示設定）
  - 食事ログから「編集」ボタンで量変更
  - 食品の単位設定（g / 個 / 本 / 枚 / 杯 / ml 等）
  全箇所にnull guardを追加してあるため、HTML側の小さな差異で
  クラッシュしないようになっています。
============================================================

【このフォルダの中身】
  index.html
  styles.css
  README.txt
  js/helpers.js
  js/state.js
  js/image-utils.js
  js/tdee.js
  js/app.js
  js/views/today.js
  js/views/weight.js
  js/views/foods.js
  js/views/recipes.js
  js/views/stats.js
  js/views/settings.js

合計 14 ファイル (うち JS は 11)。これだけで動作します。

【適用方法】
今回は11個全部入っているので、フォルダごと差し替えてOKです。

1. ZIPを解凍 → my-macro-patch/ ができる
2. ローカルの my-macro/ の中身を消して、my-macro-patch/ の中身を
   全部入れる
   または、上書きコピーでOK:
     cd ~/Downloads/my-macro-patch
     cp -R . ~/Desktop/my-macro/
3. ブラウザ (Chrome推奨) で
     file:///Users/hyoudouakira/Desktop/my-macro/index.html
   を開いて動作確認

【push手順】
ローカルで動作OKを確認したら:
  cd ~/Desktop/my-macro
  git add .
  git commit -m "feat: over-target red, count-up calorie, edit entry, food unit"
  git push

【iPhoneで反映されない時】
1. Safariで一度 https://hyodo-akira.github.io/my-macro/?v=6 を開く
2. ホーム画面のwebclipを削除して再追加

【動かなかった時の自己診断】
ブラウザのコンソール (Cmd+Option+I) で:
- 赤いERR_FILE_NOT_FOUNDが出ていたら、そのファイルが見えていない
  → cp が失敗している可能性。手動コピーで再試行
- 別のエラーが出ていたらそのメッセージを伝えてください
