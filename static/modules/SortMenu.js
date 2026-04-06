import Menu from './Menu.js';

/**
 * ソートメニューを表すクラス
 */
export default class SortMenu extends Menu {

	/**
	 * コンストラクタ
	 * @param {LocalConfig} config - LocalConfigオブジェクト
	 */
	constructor(config) {
		super();
		/**
		 * LocalConfigオブジェクト
		 * @type {LocalConfig}
		 */
		this.config = config;
		/**
		 * メニュー本体の要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('sort_menu');
		/**
		 * このメニューを表示するボタンの要素
		 * @type {HTMLElement}
		 */
		this.elMenuButton = document.getElementById('sort');
		/**
		 * 現在のソートキー
		 * @type {string}
		 */
		this.sortKey = config.sortKey;
		/**
		 * 現在の逆順ソート設定
		 * @type {boolean}
		 */
		this.sortReversed = config.sortReversed;

		this._defineEvents('sort');
		this._initializeMenu();
		// ソートキーとメニュー項目
		const sortDefs = [
			{ sortKey: 'r', label: 'レーティング' },
			{ sortKey: 'm', label: '更新日時' },
			{ sortKey: 's', label: 'ファイルサイズ' },
			{ sortKey: 'd', label: '画素数' },
			{ sortKey: 'n', label: '名前' }
		];
		for (const { sortKey, label } of sortDefs) {
			const item = this.addMenuItem(label, (item) => {
				this._changeSortKey(item.sortKey);
			}, this.sortKey == sortKey);
			item.sortKey = sortKey;
		}
		this.addPartitionLine();
		this.addMenuItem('逆順', (item) => {
			this._changeSortKey();
		}, this.sortReversed);
	}

	/**
	 * ソートキーを変更する
	 * @param {string} [sortKey] - 変更するキー（未指定の場合は逆順設定を変更）
	 */
	_changeSortKey(sortKey) {
		// ソートキーの変更
		if (sortKey) {
			for (const item of this.menuItems) {
				if (!item.sortKey) continue;
				// 選択したものだけチェックをつける
				item.checked = sortKey == item.sortKey;
			}
			// 現在のソートキーを更新
			this.sortKey = sortKey;
		// 逆順設定の変更
		} else {
			for (const item of this.menuItems) {
				if (item.sortKey) continue;
				// チェックを反転させる
				item.checked = !item.checked;
				// 現在の逆順設定を更新
				this.sortReversed = item.checked;
			}
		}
		// 設定の保存
		this.config.update({ sortKey: this.sortKey, sortReversed: this.sortReversed });
		// イベントの発動
		this.trigger('sort', this.sortKey, this.sortReversed);
	}

}
