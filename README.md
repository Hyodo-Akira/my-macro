# MyMacro

iPhone から使える、個人用の食事 / マクロ管理 Web アプリ（モバイル向けダーク UI、PWA 風）。
体重と食事の記録から **適応型 TDEE** を継続的に算出し、目標カロリー / マクロを自動更新します。

[MacroFactor](https://macrofactorapp.com/) にインスパイアされた、自分のためだけの軽量実装です。

---

## 主な機能

- 適応型 TDEE 計算（`implied_TDEE = avg_intake + Δweight × 7700 / N_days`、複数窓を直近重みで加重平均）
- Mifflin-St Jeor 式によるフォールバック推定
- 食品 DB（画像つき）／マイレシピ／バーコード検索（Open Food Facts）
- 今日の食事ログ（朝/昼/夕/間食）、検索つき入力 UI
- 体重・カロリー・マクロのグラフ（Chart.js）
- データの JSON エクスポート／インポート、全リセット
- 全データは `localStorage` に保存（外部送信なし）

---

## ファイル構成

```
my-macro/
├── index.html              # 画面構造のみ。すべてのモーダルもここに同梱
├── styles.css              # 全 CSS
├── js/
│   ├── helpers.js          # todayStr / fmtDate / clamp / round1 / uid / escapeHtml
│   ├── state.js            # localStorage 永続化、defaultState、findFood/findRecipe
│   ├── image-utils.js      # canvas で食品/レシピ画像を圧縮（max 400px, jpeg q0.7）
│   ├── tdee.js             # BMR / 体重平均 / 栄養計算 / 適応型TDEE / 目標カロリー
│   ├── views/
│   │   ├── today.js        # 今日タブ、食事追加モーダル
│   │   ├── weight.js       # 体重タブ、TDEE 表示
│   │   ├── foods.js        # 食品 DB、食品追加/編集モーダル、バーコード検索
│   │   ├── recipes.js      # マイレシピ、レシピ作成モーダル、食材ピッカー
│   │   ├── stats.js        # グラフ各種、サマリーカード
│   │   └── settings.js     # 基本情報、目標、マクロ、JSON入出力、リセット
│   └── app.js              # ビュー切り替え、closeModal、ブート
└── README.md
```

**読み込み順は `index.html` の `<script>` タグで固定**しています（プレーンな script なので順序が依存解決を兼ねます）。下のレイヤーから順に：
helpers → state → image-utils → tdee → views/* → app.js

---

## 開発の流れ

ローカル確認だけなら `index.html` をブラウザで開けば動きます（Chart.js は CDN）。

### iPhone で使う

GitHub Pages にこのフォルダごと push し、Safari でアクセスしてホーム画面に追加。
`localStorage` キーは `mymacro_v1` 固定なので、ホーム画面アプリと Safari でデータは共有されます。

### バックアップ

設定タブから「全データをエクスポート (JSON)」で保存できます。将来 iOS ネイティブ版に移行するときも同じスキーマでインポートできるよう、`state` をそのまま吐き出しています。

---

## データ構造（参考）

```js
state = {
  foods:   [{ id, name, serving, kcal, p, f, c, barcode?, image? }],
  recipes: [{ id, name, servings, image?, ingredients: [{ foodId, amount }] }],
  entries: { "YYYY-MM-DD": [
    { type: "food",   foodId,   amount,   meal },
    { type: "recipe", recipeId, servings, meal },
  ] },
  weights: { "YYYY-MM-DD": kg },
  settings: { sex, age, height, activity, goal, targetWeight?, targetDate?,
              macroMode, manualP, manualF, manualC },
};
```

`meal` は `'breakfast' | 'lunch' | 'dinner' | 'snack'`。

---

## 注意

- HealthKit 連携（Apple Watch の体重・消費 kcal）は Web からは不可。iOS ネイティブ版に移行する際に対応予定。
- `localStorage` は Safari でサイトデータ削除をすると消えるので、定期的に JSON エクスポートしておくと安心です。
