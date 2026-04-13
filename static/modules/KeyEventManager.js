/**
 * キーボードイベントを管理するクラス
 */
export default class KeyEventManager {

	/**
	 * 登録したイベントハンドラ
	 * @type {object}
	 */
	static handlers = {};
	
	/**
	 * 現在有効なハンドラ名
	 * @type {string}
	 */
	static activeHandlerName = 'default';
	
	/**
	 * 初期化
	 */
	static {
		window.addEventListener('keydown', (e) => {
			if (!this.activeHandlerName) return;
			const handlers = this.handlers[this.activeHandlerName];
			if (!handlers) return;
			for (const handler of handlers) {
				handler(e);
			}
		});
	}
	
	/**
	 * イベントハンドラを登録する
	 * @param {string} name - ハンドラ名
	 * @param {function} handler - ハンドラ関数
	 */
	static addHandler(name, handler) {
		if (!this.handlers[name]) this.handlers[name] = [];
		this.handlers[name].push(handler);
	}

	/**
	 * 有効なハンドラを切り替える
	 * @param {string} name - ハンドラ名
	 */
	static setActiveHandler(name) {
		this.activeHandlerName = name;
	}

}
