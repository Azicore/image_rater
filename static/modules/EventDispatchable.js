/**
 * イベントを送信するオブジェクトを表す共通クラス
 */
export default class EventDispatchable {

	constructor() {
		/**
		 * イベントハンドラ
		 * @type {object}
		 */
		this.handlers = {};
	}

	/**
	 * 送信するイベント名を定義する
	 * @param {string} eventNames - 送信するイベント名
	 */
	_defineEvents(...eventNames) {
		for (const eventName of eventNames) {
			this.handlers[eventName] = () => {};
		}
	}

	/**
	 * イベントハンドラを登録する
	 * @param {string} eventName - イベント名
	 * @param {function} handler - イベントハンドラ
	 */
	on(eventName, handler) {
		if (this.handlers[eventName] && typeof handler == 'function') {
			this.handlers[eventName] = handler;
		}
	}

	/**
	 * イベントを発生させる
	 * @param {string} eventName - イベント名
	 * @param {any} args - イベントハンドラに渡す引数
	 */
	trigger(eventName, ...args) {
		if (typeof this.handlers[eventName] == 'function') {
			this.handlers[eventName](...args);
		}
	}

}
