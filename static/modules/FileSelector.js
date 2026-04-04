import EventDispatchable from './EventDispatchable.js';
import HtmlGenerator from './HtmlGenerator.js';
import SelectedFiles from './SelectedFiles.js';
import API from './API.js';

/**
 * ファイル一覧を表すクラス
 */
export default class FileSelector extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('filelist');
		/**
		 * 表示中のファイル情報一覧
		 * @type {object[]}
		 */
		this.files = [];
		/**
		 * 表示中のファイルに対応する要素一覧
		 * @type {HTMLElement[]}
		 */
		this.elems = [];
		/**
		 * 選択中のファイルを表すSelectedFilesオブジェクト
		 * @type {SelectedFiles}
		 */
		this.selectedFiles = new SelectedFiles();
		/**
		 * ソートキー
		 * @type {string}
		 */
		this.sortKey = 'n';
		/**
		 * 逆順ソートかどうか
		 * @type {boolean}
		 */
		this.sortDesc = false;
		/**
		 * 最後にクリックされた時刻
		 * @type {number}
		 */
		this.lastClickedTime = 0;

		this._defineEvents('select');
		this._setEventHandlers();
		// 選択中ファイルが変更されたらselectイベントを発火する（ステータスバー変更用）
		this.selectedFiles.on('change', (selectedElems) => {
			this.trigger('select', selectedElems.length == 1 ? this.files[selectedElems[0].dataset.itemN] : selectedElems.length);
		});
		// スクロールのために上下のpadding値をselectedFilesに設定しておく
		this.selectedFiles.containerPadding = (({ paddingTop, paddingBottom }) => ({
			top: parseInt(paddingTop, 10) || 0,
			bottom: parseInt(paddingBottom, 10) || 0
		}))(getComputedStyle(this.container));
		
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		// ファイルがクリックされたとき
		this.container.addEventListener('click', (e) => {
			const li = e.target.closest('li');
			if (!li) return;
			const clickedTime = Date.now();
			// ダブルクリック
			if (this.selectedFiles.length == 1 && 250 > clickedTime - this.lastClickedTime) {
				// ●TODO
				console.log('Double clicked!');
				this.lastClickedTime = 0;
				return;
			}
			this.lastClickedTime = clickedTime;
			// 範囲選択（Shiftキー）
			if (e.shiftKey) {
				this.selectedFiles.rangeAdd(li, this.elems, e.ctrlKey);
			// 追加選択（Ctrlキー）
			} else if (e.ctrlKey) {
				this.selectedFiles.toggle(li);
			// 単独選択
			} else {
				this.selectedFiles.set(li);
			}
		});
		// キーボード操作
		window.addEventListener('keydown', (e) => {
			if (e.code == 'ArrowLeft') {
				this.selectedFiles.prev(this.elems);
			} else if (e.code == 'ArrowRight') {
				this.selectedFiles.next(this.elems);
			} else if (e.code == 'ArrowUp') {
				this.selectedFiles.prevRow(this.elems) && e.preventDefault();
			} else if (e.code == 'ArrowDown') {
				this.selectedFiles.nextRow(this.elems) && e.preventDefault();
			}
		});
	
	}

	/**
	 * 表示中のファイル数を返す
	 * @return {number} ファイルの数
	 */
	get length() {
		return this.files.length;
	}

	/**
	 * ファイル一覧を更新する
	 * @param {string} [dirId] - ディレクトリID
	 * @param {string} [subdirId] - サブディレクトリID
	 */
	async update(dirId, subdirId) {
		// ディレクトリが指定された場合は再取得
		if (dirId && subdirId) {
			this.selectedFiles.clear(); // 選択を全解除
			this.container.innerHTML = '';
			this.container.classList.add('loading');
			this.files = await API.getFileList(dirId, subdirId);
			this.container.classList.remove('loading');
		}
		if (this.files.length == 0) {
			// ●ファイルがありません
		} else {
			// ソート
			const desc = this.sortDesc ? -1 : 1;
			this.files.sort((a, b) => (a[this.sortKey] > b[this.sortKey] ? 1 : -1) * desc);
			for (let i = 0; this.files.length > i; i++) {
				const file = this.files[i];
				if (!file.elem) file.elem = this._createItemElement(file); // 初回は要素を作成
				file.elem.dataset.itemN = i;
				this.container.appendChild(file.elem);
			}
			this.elems = this.files.map(file => file.elem);
			this.selectedFiles.set(this.elems[0]); // 最初のファイルを選択
		}
	}

	/**
	 * ファイルを表す要素を作成する
	 * @param {object} file - APIから返されたファイル情報オブジェクト
	 * @param {string} file.id - ファイルID
	 * @param {string} file.n - ファイル名
	 * @param {number} file.tw - サムネイルの幅
	 * @param {number} file.th - サムネイルの高さ
	 * @return {HTMLElement} 作成した要素
	 */
	_createItemElement(file) {
		const HTML = HtmlGenerator;
		return HTML.li.end(
			HTML.img.attr({
				loading: 'lazy', width: file.tw, height: file.th,
				alt: file.n, title: file.n
			}).attr('src', `/thumb/${file.id}`).end() // ※Lazy loadingを確実にするため、srcは最後に分けて追加
		);
	}

/*	// 選択したファイルを取り除く
	removeSelected() {
		for (let i = 0; this.selectedFiles.length > i; i++) {
			const n = this.selectedFiles[i].dataset.itemN;
			const elem = this.files[n].elem;
			this.container.removeChild(elem);
			delete this.files[n].elem;
		}
		this.files = this.files.filter(item => item.elem);
		this.elems = this.files.map(item => item.elem);
		if (this.files.length == 0) {
			//●ファイルがありません
		} else {
			this.selectedFiles.set(this.elems[0]);
		}
	}*/

}
