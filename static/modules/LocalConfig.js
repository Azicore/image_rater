/**
 * ブラウザ側で保存する設定を表すクラス
 */
export default class LocalConfig {

	/**
	 * コンストラクタ
	 */
	constructor() {
		/**
		 * localStorageのキー
		 * @type {string}
		 */
		this.LS_KEY = 'imagerater_config';
		/**
		 * ソートキーの設定
		 * @type {string}
		 */
		this.sortKey = 'r';
		/**
		 * 逆順ソートの設定
		 * @type {boolean}
		 */
		this.sortReversed = false;
		/**
		 * レーティングシンボル表示の設定
		 * @type {boolean}
		 */
		this.ratingSymbol = false;

		this._load();
	}

	/**
	 * localStorageから設定を読み込む
	 */
	_load() {
		let data = {};
		try {
			data = JSON.parse(localStorage.getItem(this.LS_KEY) || '{}');
		} catch (e) { }
		if (data.sortKey != null) this.sortKey = data.sortKey;
		if (data.sortReversed != null) this.sortReversed = data.sortReversed;
		if (data.ratingSymbol != null) this.ratingSymbol = data.ratingSymbol;
	}

	/**
	 * 設定を更新してlocalStorageを更新する
	 * @param {object} values - 更新する値
	 * @param {string} [values.sortKey] - ソートキーの設定
	 * @param {boolean} [values.sortReversed] - 逆順ソートの設定
	 * @param {boolean} [values.ratingSymbol] - レーティングシンボル表示の設定
	 */
	update(values) {
		for (const name in values) {
			if (this[name] == null) continue;
			this[name] = values[name];
		}
		const data = {
			sortKey: this.sortKey,
			sortReversed: this.sortReversed,
			ratingSymbol: this.ratingSymbol
		};
		localStorage.setItem(this.LS_KEY, JSON.stringify(data));
	}

}
