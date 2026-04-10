/**
 * HTML要素を生成するクラス
 */
export default class HtmlGenerator {

	/**
	 * 共通関数
	 * @param {string} tagName - タグ名
	 * @return {object} 以下の4つのメソッドを持つオブジェクト
	 * @property {function} cls クラス名を付与する
	 * @property {function} attr 属性を追加する
	 * @property {function} data データ属性を追加する
	 * @property {function} end 内容を追加して生成した要素を返す
	 */
	static generate(tagName) {
		const elem = document.createElement(tagName);
		const obj = {
			cls: (className) => {
				if (!Array.isArray(className)) className = className.split(/ +/);
				elem.classList.add(...className);
				return obj;
			},
			attr: (name, value) => {
				const attrs = typeof name == 'object' ? name : { [name]: value };
				for (const key in attrs) {
					elem.setAttribute(key, attrs[key]);
				}
				return obj;
			},
			data: (name, value) => {
				const datas = typeof name == 'object' ? name : { [name]: value };
				for (const key in datas) {
					elem.dataset[key] = datas[key];
				}
				return obj;
			},
			end: (...contents) => {
				for (const content of contents) {
					if (content instanceof HTMLElement) {
						elem.insertAdjacentElement('beforeend', content);
					} else {
						elem.insertAdjacentText('beforeend', content);
					}
				}
				return elem;
			}
		};
		return obj;
	}

	/**
	 * divタグを生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get div() {
		return this.generate('div');
	}

	/**
	 * spanタグを生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get span() {
		return this.generate('span');
	}

	/**
	 * pタグを生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get p() {
		return this.generate('p');
	}

	/**
	 * liタグを生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get li() {
		return this.generate('li');
	}

	/**
	 * imgタグを生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get img() {
		return this.generate('img');
	}

	/**
	 * inputタグ（type="text"）を生成するオブジェクトを返す
	 * @return {object} generate()を参照
	 */
	static get inputText() {
		return this.generate('input').attr('type', 'text');
	}

}
