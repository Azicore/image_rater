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
	 * @param {LocalConfig} config - LocalConfigオブジェクト
	 */
	constructor(config) {
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
		 * 表示中のサブディレクトリの親ディレクトリID
		 * @type {string}
		 */
		this.dirId = null;
		/**
		 * 表示中のサブディレクトリの名前
		 * @type {string}
		 */
		this.subdirName = null;
		/**
		 * 選択中のファイルを表すSelectedFilesオブジェクト
		 * @type {SelectedFiles}
		 */
		this.selectedFiles = new SelectedFiles();
		/**
		 * 各ソートキーで降順がデフォルトかどうか
		 * @type {object}
		 */
		this.sortDefs = {
			r: true, // レーティング：降順がデフォルト
			m: true, // 最終更新日時：降順がデフォルト
			s: true, // ファイルサイズ：降順がデフォルト
			d: true, // 画素数：降順がデフォルト
			n: false // ファイル名：昇順がデフォルト
		};
		/**
		 * 最後にクリックされた時刻
		 * @type {number}
		 */
		this.lastClickedTime = 0;
		/**
		 * 機能を無効にするかどうか（ビューア表示中にtureにする）
		 * @type {boolean}
		 */
		this.disabled = false;

		this._defineEvents('select', 'fileopen', 'next');
		this._setEventHandlers();
		this.setSortFunc(config.sortKey in this.sortDefs ? config.sortKey : 'r', config.sortReversed);
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
				this.lastClickedTime = 0;
				// ファイルを開く
				this.openFile(li);
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
			// 前のファイル（←）
			if (e.code == 'ArrowLeft') {
				this.selectedFiles.prev(this.elems);
				// ビューア表示中はファイルを開く
				if (this.disabled) this.openFile(this.selectedFiles[0]);
			// 次のファイル（→）
			} else if (e.code == 'ArrowRight') {
				this.selectedFiles.next(this.elems);
				// ビューア表示中はファイルを開く
				if (this.disabled) this.openFile(this.selectedFiles[0]);
			// 真上のファイル（↑）
			} else if (e.code == 'ArrowUp') {
				// ビューア表示中は無効
				if (this.disabled) return;
				this.selectedFiles.prevRow(this.elems) && e.preventDefault();
			// 真下のファイル（↓）
			} else if (e.code == 'ArrowDown') {
				// ビューア表示中は無効
				if (this.disabled) return;
				this.selectedFiles.nextRow(this.elems) && e.preventDefault();
			// ファイルを開く
			} else if (e.code == 'Enter') {
				// ビューア表示中は無効
				if (this.disabled) return;
				if (this.selectedFiles.length == 1) this.openFile(this.selectedFiles[0]);
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

	setSortFunc(sortKey, sortReversed) {
		if (this.sortDefs[sortKey] == null) return;
		const rev = sortReversed ? -1 : 1;
		const desc = this.sortDefs[sortKey] ? -1 : 1;
		const sign = rev * desc;
		this.sortFunc = (a, b) => {
			return a[sortKey] > b[sortKey] ? sign : b[sortKey] > a[sortKey] ? -sign : a.n > b.n ? rev : -rev;
		};
	}

	/**
	 * ファイルを開く
	 * @param {HTMLElement} elem - 開くファイルの要素
	 */
	openFile(elem) {
		// fileopenイベントを発動する
		this.trigger('fileopen', this.dirId, this.subdirName, elem.dataset.fileName);
	}

	/**
	 * ファイル一覧を更新する
	 * @param {string} [dirId] - ディレクトリID
	 * @param {string} [subdirId] - サブディレクトリID
	 * @param {string} [subdirName] - サブディレクトリ名
	 */
	async update(dirId, subdirId, subdirName) {
		// ディレクトリが指定された場合は再取得
		if (dirId && subdirId && subdirName) {
			this.dirId = dirId;
			this.subdirName = subdirName;
			this.selectedFiles.clear(); // 選択を全解除
			this.container.innerHTML = '';
			this.container.classList.add('loading');
			this.files = await API.getFileList(dirId, subdirId);
			this.files.forEach(file => { file.d = file.w * file.h }); // 画素数を計算しておく
			this.container.classList.remove('loading');
		}
		if (this.files.length == 0) {
			// ●ファイルがありません
		} else {
			// ソート
			this.files.sort(this.sortFunc);
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
		return HTML.li.data('fileName', file.n).end(
			HTML.img.attr({
				loading: 'lazy', width: file.tw, height: file.th,
				alt: file.n, title: file.n
			}).attr('src', API.getThumbnailURL(file.id)).end() // ※Lazy loadingを確実にするため、srcは最後に分けて追加
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
