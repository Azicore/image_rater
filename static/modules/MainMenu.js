import Menu from './Menu.js';

/**
 * メインメニューを表すクラス
 */
export default class MainMenu extends Menu {

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
		this.container = document.getElementById('main_menu');
		/**
		 * このメニューを表示するボタンの要素
		 * @type {HTMLElement}
		 */
		this.elMenuButton = document.getElementById('menu');
		/**
		 * レーティングシンボルの表示・非表示
		 * @type {boolean}
		 */
		this.ratingSymbol = config.ratingSymbol;

		this._defineEvents('filemove', 'renamesubdir', 'ratingope', 'cleanup', 'symbol');
		this._initializeMenu();
		this.addMenuItem('ファイルを移動…', (item) => {
			this.trigger('filemove');
		}, false, true).itemId = 'move';
		this.addMenuItem('ディレクトリ名を変更…', (item) => {
			this.trigger('renamesubdir');
		}, false, true, true).itemId = 'subdirrename';
		this.addPartitionLine();
		this.addMenuItem('レーティングと選択重みを交換', (item) => {
			this.trigger('ratingope', 'exchange');
		}, false, true).itemId = 'exchange';
		this.addMenuItem('レーティングと選択重みをリセット', (item) => {
			this.trigger('ratingope', 'resetall');
		}, false, true).itemId = 'resetall';
		this.addMenuItem('選択重みをリセット', (item) => {
			this.trigger('ratingope', 'reset');
		}, false, true).itemId = 'reset';
		this.addMenuItem('レーティング平均値を調整', (item) => {
			this.trigger('ratingope', 'adjust');
		}, false, true).itemId = 'adjust';
		this.addPartitionLine();
		this.addMenuItem('行方不明のディレクトリを削除', (item) => {
			this.trigger('cleanup', 'dir');
		}, false, true).itemId = 'cleanupdir';
		this.addMenuItem('サムネイルキャッシュを再構築', (item) => {
			this.trigger('cleanup', 'thumb');
		}, false, true).itemId = 'cleanupthumb';
		this.addPartitionLine();
		this.addMenuItem('レーティングシンボルを表示', (item) => {
			item.checked = !item.checked;
			this.ratingSymbol = item.checked;
			this.config.update({ ratingSymbol: this.ratingSymbol }); // 設定の保存
			this.trigger('symbol', this.ratingSymbol);
		}, this.ratingSymbol);
	}

	toggleDisabled(itemId, toggle) {
		const item = this.menuItems.find(item => item.itemId == itemId);
		item.disabled = toggle;
	}

}
