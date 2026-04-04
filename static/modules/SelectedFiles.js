import ExclusiveClassName from './ExclusiveClassName.js';

/**
 * 選択済みのファイルを表すクラス
 */
export default class SelectedFiles {

	/**
	 * 初期化
	 */
	constructor() {
		/**
		 * ExclusiveClassNameオブジェクト
		 * @type {ExclusiveClassName}
		 */
		this.selectedClass = new ExclusiveClassName('filelist_selected');
		/**
		 * 最後に選択されたファイルの要素
		 * @type {HTMLElement}
		 */
		this.lastSelectedElement = null;
		/**
		 * 範囲選択の一端となるファイルの要素
		 * @type {HTMLElement}
		 */
		this.rangeStartElement = null;
		/**
		 * 選択済みファイルの数
		 * @type {number}
		 */
		this.length = 0;
		/**
		 * 選択済みファイルが変更されたときに呼び出されるイベントハンドラ
		 * @type {function}
		 */
		this.onchange = () => {};
	}

	/**
	 * 最後に選択された要素の位置番号を返す
	 * @return {number} 最後に選択された要素の位置番号
	 */
	get lastSelectedN() {
		return +this.lastSelectedElement?.dataset.itemN;
	}

	/**
	 * 範囲選択の一端となる要素の位置番号を返す
	 * @return {number} 範囲選択の一端となる要素の位置番号
	 */
	get rangeStartN() {
		return +this.rangeStartElement?.dataset.itemN;
	}

	/**
	 * 全ての選択を解除する
	 */
	clear() {
		this.selectedClass.clear();
		this.rangeStartElement = null;
		this._triggerChangeEvent(null);
	}

	/**
	 * ファイルの選択を切り替える
	 * @param {HTMLElement} elem - 対象のファイルの要素
	 */
	toggle(elem) {
		this.selectedClass.toggle(elem);
		this.rangeStartElement = elem;
		this._triggerChangeEvent(elem);
	}

	/**
	 * ファイルを選択する
	 * @param {HTMLElement} elem - 対象のファイルの要素
	 */
	set(elem) {
		this.selectedClass.setTo(elem);
		this.rangeStartElement = elem;
		this._triggerChangeEvent(elem);
	}

	/**
	 * ファイルを追加選択する
	 * @param {HTMLElement} elem - 対象のファイルの要素
	 */
	add(elem) {
		this.selectedClass.addTo(elem);
		this.rangeStartElement = elem;
		this._triggerChangeEvent(elem);
	}

	/**
	 * 最後に選択したファイルの次のファイルを選択する
	 * @param {HTMLElement[]} elems - ファイルの要素一覧
	 */
	next(elems) {
		const n = this.lastSelectedN + 1;
		if (elems.length > n) this.set(elems[n]);
	}

	/**
	 * 最後に選択したファイルの前のファイルを選択する
	 * @param {HTMLElement[]} elems - ファイルの要素一覧
	 */
	prev(elems) {
		const n = this.lastSelectedN - 1;
		if (n >= 0) this.set(elems[n]);
	}

	/**
	 * 最後に選択したファイルの真下のファイルを選択する
	 * @param {HTMLElement[]} elems - ファイルの要素一覧
	 * @return {boolean} 選択できたかどうか
	 */
	nextRow(elems) {
		const baseRect = this.lastSelectedElement.getBoundingClientRect();
		const baseCenter = baseRect.left + baseRect.right;
		const nextRowElems = [];
		let nextRowRect;
		for (let i = this.lastSelectedN + 1; elems.length > i; i++) {
			const rect = elems[i].getBoundingClientRect();
			// 同じ行はスキップする
			if (baseRect.bottom > rect.top) continue;
			// 次の行の最初の要素の位置を保持する
			if (!nextRowRect) nextRowRect = rect;
			// 次の行の要素を全て候補にする
			if (nextRowRect.bottom > rect.top) {
				nextRowElems.push({ elem: elems[i], center: rect.left + rect.right });
				continue;
			}
			break;
		}
		if (nextRowElems.length) {
			// 次の行の要素の中で最も元の要素と中心距離が近いものを選択する
			const { elem } = nextRowElems.reduce((e1, e2) => {
				return Math.abs(baseCenter - e1.center) > Math.abs(baseCenter - e2.center) ? e2 : e1;
			});
			this.set(elem);
			return true;
		}
		return false;
	}

	/**
	 * 最後に選択した要素の真上のファイルを選択する
	 * @param {HTMLElement[]} elems - ファイルの要素一覧
	 * @return {boolean} 選択できたかどうか
	 */
	prevRow(elems) {
		const baseRect = this.lastSelectedElement.getBoundingClientRect();
		const baseCenter = baseRect.left + baseRect.right;
		const prevRowElems = [];
		let prevRowRect;
		for (let i = this.lastSelectedN - 1; i >= 0; i--) {
			const rect = elems[i].getBoundingClientRect();
			// 同じ行はスキップする
			if (rect.bottom > baseRect.top) continue;
			// 前の行の最後の要素の位置を保持する
			if (!prevRowRect) prevRowRect = rect;
			// 前の行の要素を全て候補にする
			if (rect.bottom > prevRowRect.top) {
				prevRowElems.push({ elem: elems[i], center: rect.left + rect.right });
				continue;
			}
			break;
		}
		if (prevRowElems.length) {
			// 前の行の要素の中で最も元の要素と中心距離が近いものを選択する
			const { elem } = prevRowElems.reduce((e1, e2) => {
				return Math.abs(baseCenter - e1.center) > Math.abs(baseCenter - e2.center) ? e2 : e1;
			});
			this.set(elem);
			return true;
		}
		return false;
	}

	/**
	 * ファイルを範囲選択する
	 * @param {HTMLElement} elem - 対象のファイルの要素
	 * @param {HTMLElement[]} elems - ファイルの要素一覧
	 * @param {boolean} [add=false] - 追加選択するかどうか
	 */
	rangeAdd(elem, elems, add = false) {
		if (!this.rangeStartElement) return;
		if (!add) this.selectedClass.clear();
		let [elemStart, elemEnd] = [this.rangeStartN, elem.dataset.itemN];
		if (elemStart > elemEnd) [elemStart, elemEnd] = [elemEnd, elemStart];
		for (let i = elemStart; elemEnd >= i; i++) {
			this.selectedClass.addTo(elems[i]);
		}
		this._triggerChangeEvent(elem);
	}

	/**
	 * 選択状態の変化に伴う処理をする
	 */
	_triggerChangeEvent(elem) {
		// 最後に選択した要素の更新
		this.lastSelectedElement = elem;
		// スクロール位置の調整
		if (elem) {
			const body = document.documentElement;
			const { top: elemTop, bottom: elemBottom } = elem.getBoundingClientRect();
			if (elemBottom > body.clientHeight) {
				window.scrollBy(0, elemBottom - body.clientHeight);
			}
			if (0 > elemTop) {
				window.scrollBy(0, elemTop);
			}
		}
		// 配列風オブジェクトの作成
		for (let i = 0; this.length > i; i++) {
			delete this[i];
		}
		this.length = this.selectedClass.elems.length;
		for (let i = 0; this.length > i; i++) {
			this[i] = this.selectedClass.elems[i];
		}
		// イベントの発動
		if (typeof this.onchange == 'function') this.onchange(this);
	}

}
