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
		 * 表示中のサブディレクトリ
		 * @type {Subdirectory}
		 */
		this.subdir = null;
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
		// 更新系API通信時のローディング表示とエラー表示
		API.toggleLoading = (toggle) => this.container.classList.toggle('loading', toggle);
		API.notifyError = (msg) => alert(msg);
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
		this.trigger('fileopen', this.subdir, elem.dataset.fileName);
	}

	/**
	 * ファイル一覧を更新する
	 * @param {Subdirectory} [subdir] - サブディレクトリ情報オブジェクト
	 */
	async update(subdir) {
		// ディレクトリが指定された場合は再取得
		if (subdir) {
			const { dirId, subdirId } = subdir;
			this.subdir = subdir;
			this.selectedFiles.clear(); // 選択を全解除
			this.container.classList.add('loading');
			this.files = await API.getFileList(dirId, subdirId);
			this.files.forEach(file => { file.d = file.w * file.h }); // 画素数を計算しておく
			this.container.innerHTML = '';
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
	 * ファイル名を変更する
	 * @param {string} fileId - 変更するファイルのファイルID
	 * @param {string} newName - 新しい名前
	 */
	async updateFileName(fileId, newName) {
		const file = this.files.find(file => file.id == fileId);
		if (!file) return;
		file.n = newName;
		this.container.removeChild(file.elem);
		file.elem = this._createItemElement(file);
		this.container.appendChild(file.elem);
		await this.update();
		this.selectedFiles.set(file.elem);
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

	/**
	 * 選択中のファイルを移動する
	 * @param {Subdirectory} newSubdir - 移動先のサブディレクトリ
	 * @return {Subdirectory} 現在のサブディレクトリ
	 */
	async moveFile(newSubdir) {
		const fileIds = Array.from(this.selectedFiles, (elem) => this.files[elem.dataset.itemN].id);
		const movedFileIds = await API.move(this.subdir, fileIds, newSubdir.subdirId);
		this.selectedFiles.clear();
		let i = 0;
		for (const file of this.files) {
			if (movedFileIds.includes(file.id)) {
				const elem = file.elem;
				this.container.removeChild(elem);
				delete file.elem;
			} else {
				file.elem.dataset.itemN = i++;
			}
		}
		this.files = this.files.filter(file => file.elem);
		this.elems = this.files.map(file => file.elem);
		this.subdir.subdirNum -= movedFileIds.length; // ファイル数を更新する
		if (this.files.length == 0) {
			//●ファイルがありません
		} else {
			this.selectedFiles.set(this.elems[0]);
		}
		return this.subdir;
	}

}
