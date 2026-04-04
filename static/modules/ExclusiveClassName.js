/**
 * 排他的なクラス名付与を行なうクラス
 */
export default class ExclusiveClassName {

	/**
	 * コンストラクタ
	 * @param {string} className - 使用するクラス名
	 */
	constructor(className) {
		/**
		 * クラス名
		 * @type {string}
		 */
		this.className = className;
		/**
		 * クラス名を付与済みの要素
		 * @type {HTMLElement[]}
		 */
		this.elems = [];
	}

	/**
	 * 全ての要素からこのクラス名を削除する
	 */
	clear() {
		for (const elem of this.elems) {
			elem.classList.remove(this.className);
		}
		this.elems = [];
	}

	/**
	 * 全ての要素からこのクラス名を削除し、この要素だけにクラス名を付与する
	 * @param {HTMLElement} elem - クラス名を設定する要素
	 */
	setTo(elem) {
		this.clear();
		this.addTo(elem);
	}

	/**
	 * 要素にクラス名を追加する
	 * @param {HTMLElement} elem - クラス名を付与する要素
	 */
	addTo(elem) {
		this.toggle(elem, true);
	}

	/**
	 * 要素からクラス名を削除する
	 * @param {HTMLElement} elem - クラス名を削除する要素
	 */
	removeFrom(elem) {
		this.toggle(elem, false);
	}

	/**
	 * クラス名を要素に追加または要素から削除する
	 * @param {HTMLElement} elem - クラス名を切り替える要素
	 * @param {boolean} [force=null] - 追加（true）または削除（false）の強制
	 */
	toggle(elem, force = null) {
		const isContained = elem.classList.contains(this.className);
		if (force !== false && !isContained) {
			elem.classList.add(this.className);
			this.elems.push(elem);
		} else if (force !== true && isContained) {
			elem.classList.remove(this.className);
			this.elems = this.elems.filter(e => e != elem);
		}
	}

}
