import EventDispatchable from './EventDispatchable.js';
import HtmlGenerator from './HtmlGenerator.js';

/**
 * メニューを表す共通クラス
 */
export default class Menu extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メニュー本体の要素
		 * @type {HTMLElement}
		 */
		this.container = null;
		/**
		 * このメニューを表示するボタンの要素
		 * @type {HTMLElement}
		 */
		this.elMenuButton = null;
		/**
		 * メニュー項目
		 * @type {object[]}
		 */
		this.menuItems = [];
	}

	/**
	 * メニューを初期化する
	 */
	_initializeMenu() {
		this.elMenuButton.addEventListener('click', (e) => {
			this.container.togglePopover({ source: this.elMenuButton }); // ●toggleなのになぜか消えない
		});
		this.container.addEventListener('toggle', (e) => {
			this.elMenuButton.classList.toggle('menu_label_open', e.newState == 'open');
		});
	}

	/**
	 * メニュー項目を追加する
	 * @param {string} name - 項目名
	 * @param {function} handler - 項目選択時のイベントハンドラ
	 * @param {boolean} [defaultChecked=false] - 初期状態でチェックされているかどうか
	 * @param {boolean} [defaultDisabled=false] - 初期状態で無効化されているかどうか
	 * @param {boolean} [mobileHidden=false] - モバイル表示で隠すかどうか
	 * @return {object} このメニュー項目を表すオブジェクト
	 * @property {string} name 項目名
	 * @property {function} handler 項目選択時のイベントハンドラ
	 * @property {HTMLElement} elem 項目の要素
	 * @property {boolean} checked 項目がチェックされているかどうか
	 * @property {boolean} disabled 項目が無効化されているかどうか
	 */
	addMenuItem(name, handler, defaultChecked = false, defaultDisabled = false, mobileHidden = false) {
		const HTML = HtmlGenerator;
		const id = this.menuItems.length;
		const elem = HTML.div.end(name);
		if (mobileHidden) elem.classList.add('menu_item_nomobile');
		const item = {
			name: name,
			handler: handler,
			elem: elem,
			set checked(checked) {
				elem.classList.toggle('menu_item_checked', checked);
				item._checked = checked;
			},
			get checked() {
				return item._checked;
			},
			set disabled(disabled) {
				elem.classList.toggle('menu_item_disabled', disabled);
				item._disabled = disabled;
			},
			get disabled() {
				return item._disabled;
			}
		};
		item.checked = defaultChecked;
		item.disabled = defaultDisabled;
		elem.addEventListener('click', (e) => {
			if (item.disabled) return;
			this.container.hidePopover();
			item.handler(item);
		});
		this.container.appendChild(elem);
		this.menuItems[id] = item;
		return item;
	}

	/**
	 * メニューの仕切り線を追加する
	 * @param {boolean} [mobileHidden=false] - モバイル表示で隠すかどうか
	 */
	addPartitionLine(mobileHidden = false) {
		const HTML = HtmlGenerator;
		const elem = HTML.div.cls('menu_partition menu_item_disabled').end();
		if (mobileHidden) elem.classList.add('menu_item_nomobile');
		this.container.appendChild(elem);
	}

}
