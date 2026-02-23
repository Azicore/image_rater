import crypto from 'crypto';

/**
 * ユニークなIDを生成するためのクラス
 */
export default class UniqueId {

	/**
	 * ユニークなIDを生成する
	 * @return {string} ユニークなID
	 */
	static get() {
		const len = 14;
		const m = { '+': '-', '/': '_', '=': '' };
		// randomUUIDをbase64にする
		return btoa(crypto.randomUUID().match(/([0-9a-f][0-9a-f])/g).map(
			v => String.fromCharCode(parseInt(v, 16))
		).join('')).replace(/[+\/=]/g, s => m[s]).slice(0, len);
	}

}
