import EventDispatchable from './EventDispatchable.js';
import KeyEventManager from './KeyEventManager.js';
import HtmlGenerator from './HtmlGenerator.js';
import SelectedFiles from './SelectedFiles.js';
import FileInfo from './FileInfo.js';
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
		 * @type {FileInfo[]}
		 */
		this.files = [];
		/**
		 * 表示中のファイルに対応する要素一覧
		 * @type {HTMLElement[]}
		 */
		this.elems = [];
		/**
		 * 表示中のサブディレクトリ
		 * @type {SubdirectoryInfo}
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
		 * レーティングシンボル計算オブジェクト
		 * @type {object}
		 */
		this.ratingSymbol = null;
		/**
		 * モバイル表示かどうか
		 * @type {boolean}
		 */
		this.isMobile = false;
		/**
		 * モバイル用にサムネイルを何倍にするか
		 * @type {number}
		 */
		this.MOBILE_SIZE_RATE = 0.487;
		// ※16:9の画像で高さを200にすると幅が356になるが、これを幅360のデバイスでちょうど横2枚並べるには
		// マージン13を除いて1枚173（=(360-13)/2）以下である必要がある。173/356=0.487。

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
		API.toggleLoading = (toggle, target) => /^(?:rename|move|ratingope|cleanup)$/.test(target) && this.container.classList.toggle('loading', toggle);
		API.notifyError = (msg) => alert(msg);
		// レーティングシンボルの表示
		this.toggleRatingSymbol(config.ratingSymbol);
		// 初期メッセージの表示
		this.toggleNoFile(true, true);
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		let touchTimer = null;
		// ファイルがクリックされたとき
		this.container.addEventListener('click', (e) => {
			const li = e.target.closest('li');
			if (!li) return;
			const clickedTime = Date.now();
			// ダブルクリック
			if (this.selectedFiles.length == 1 && 250 > clickedTime - this.lastClickedTime) {
				this.lastClickedTime = 0;
				// ファイルを開く
				this.openFile();
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
		// モバイル用イベント
		this.container.addEventListener('touchstart', (e) => {
			const li = e.target.closest('li');
			if (!li) return;
			touchTimer = setTimeout(() => {
				this.selectedFiles.toggle(li);
			}, 1000);
		});
		this.container.addEventListener('touchend', (e) => {
			clearTimeout(touchTimer);
		});
		this.container.addEventListener('contextmenu', (e) => {
			// 長押しで出てくるメニュー対策
			if (this.isMobile) e.preventDefault();
		});
		// キーボード操作
		KeyEventManager.addHandler('default', (e) => {
			// 前のファイル（←）
			if (e.code == 'ArrowLeft') {
				this.selectedFiles.prev(this.elems);
			// 次のファイル（→）
			} else if (e.code == 'ArrowRight') {
				this.selectedFiles.next(this.elems);
			// 真上のファイル（↑）
			} else if (e.code == 'ArrowUp') {
				this.selectedFiles.prevRow(this.elems) && e.preventDefault();
			// 真下のファイル（↓）
			} else if (e.code == 'ArrowDown') {
				this.selectedFiles.nextRow(this.elems) && e.preventDefault();
			// ファイルを開く
			} else if (e.code == 'Enter') {
				if (this.selectedFiles.length == 1) this.openFile();
			}
		});
		// キーボード操作（ビューア表示時）
		KeyEventManager.addHandler('viewer', (e) => {
			// 前のファイル（←）
			if (e.code == 'ArrowLeft') {
				this.openFile(false);
			// 次のファイル（→）
			} else if (e.code == 'ArrowRight') {
				this.openFile(true);
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
	 * ファイル無しメッセージの表示を切り替える
	 * @param {boolean} toggle - 表示するかどうか
	 * @param {boolean} [isInit] - 初期メッセージにするかどうか（toggle=trueの場合のみ）
	 */
	toggleNoFile(toggle, isInit = false) {
		this.container.classList.remove('filelist_initial', 'filelist_nofile');
		if (toggle) {
			const cls = isInit ? 'filelist_initial' : 'filelist_nofile';
			this.container.classList.add(cls);
		}
	}

	/**
	 * ソート関数を設定する
	 * @param {string} sortKey - ソートキー
	 * @param {boolean} sortReversed - 逆順かどうか
	 */
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
	 * @param {boolean} [move] - 前後のファイルへ移動するかどうか
	 */
	openFile(move = null) {
		if (move != null) {
			this.selectedFiles[move ? 'next' : 'prev'](this.elems);
		}
		const elem = this.selectedFiles[0];
		// fileopenイベントを発動する
		this.trigger('fileopen', this.subdir, this.files[elem.dataset.itemN]);
	}

	/**
	 * ファイル一覧を更新する
	 * @param {SubdirectoryInfo} [subdir] - サブディレクトリ情報オブジェクト
	 * @param {boolean} [forceUpdate] - 強制的に情報更新するかどうか
	 */
	async update(subdir, forceUpdate = false) {
		this.toggleNoFile(false);
		// ディレクトリが指定された場合は再取得
		if (subdir) {
			const { dirId, subdirId } = subdir;
			this.subdir = subdir;
			this.selectedFiles.clear(); // 選択を全解除
			this.container.classList.add('loading');
			this.files = (await API.getFileList(dirId, subdirId, forceUpdate)).map(file => new FileInfo(file));
			this.container.innerHTML = '';
			this.container.classList.remove('loading');
			this.ratingSymbol = this.getRatingSymbolDefiner();
		}
		if (this.files.length == 0) {
			// ファイルなし
			this.toggleNoFile(true);
		} else {
			// ソート
			this.files.sort(this.sortFunc);
			for (let i = 0; this.files.length > i; i++) {
				const file = this.files[i];
				if (!file.elem) {
					// 初回は要素を作成
					file.elem = this._createItemElement(file);
				}
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
	 * @param {FileInfo} file - APIから返されたファイル情報オブジェクト
	 * @return {HTMLElement} 作成した要素
	 */
	_createItemElement(file) {
		const HTML = HtmlGenerator;
		const [tw, th] = this.isMobile ? [Math.round(file.tw * this.MOBILE_SIZE_RATE), Math.round(file.th * this.MOBILE_SIZE_RATE)] : [file.tw, file.th];
		const ratingClass = this.ratingSymbol.get(file.r); // レーティングシンボル
		return HTML.li.data('fileName', file.n).cls(file.isVideo ? 'filelist_video' : []).cls(`filelist_rating_${ratingClass}`).end(
			HTML.img.attr({
				loading: 'lazy', width: tw, height: th,
				alt: file.n, title: file.n
			}).attr('src', API.getThumbnailURL(file.id)).end() // ※Lazy loadingを確実にするため、srcは最後に分けて追加
		);
	}

	/**
	 * 選択中のファイルを移動する
	 * @param {SubdirectoryInfo} newSubdir - 移動先のサブディレクトリ
	 * @return {SubdirectoryInfo} 現在のサブディレクトリ
	 */
	async moveFile(newSubdir) {
		this.toggleNoFile(false);
		const fileIds = Array.from(this.selectedFiles, (elem) => this.files[elem.dataset.itemN].id);
		const movedFileIds = await API.move(this.subdir, fileIds, newSubdir.subdirId);
		this.selectedFiles.clear();
		let i = 0;
		let nextSelected = 0;
		for (const file of this.files) {
			if (movedFileIds.includes(file.id)) {
				const elem = file.elem;
				this.container.removeChild(elem);
				delete file.elem;
				nextSelected = i;
			} else {
				file.elem.dataset.itemN = i++;
			}
		}
		this.files = this.files.filter(file => file.elem);
		this.elems = this.files.map(file => file.elem);
		this.subdir.subdirNum -= movedFileIds.length; // ファイル数を更新する
		if (this.files.length == 0) {
			// ファイルなし
			this.toggleNoFile(true);
		} else {
			this.selectedFiles.set(this.elems[Math.min(this.elems.length - 1, nextSelected)]);
		}
		return this.subdir;
	}

	/**
	 * レーティングに関する操作を実行する
	 * @param {string} mode - 操作の種類（reset、resetall、exchange、adjustのいずれか）
	 * @return {SubdirectoryInfo} 現在のサブディレクトリ
	 */
	async ratingOperation(mode) {
		const params = {};
		if (mode == 'reset' || mode == 'resetall') {
			params.weightOnly = mode == 'reset';
			mode = 'reset';
		}
		if (mode == 'reset' || mode == 'exchange') {
			params.fileIds = Array.from(this.selectedFiles, (elem) => this.files[elem.dataset.itemN].id);
		}
		await API.ratingOperation(this.subdir, mode, params);
		return this.subdir;
	}

	/**
	 * レーティングシンボル計算オブジェクトを作成する
	 * @return {object} レーティングを計算するget()関数を持ったオブジェクト
	 */
	getRatingSymbolDefiner() {
		const ratingMax = this.files.length ? this.files.reduce((file1, file2) => file1.r > file2.r ? file1 : file2).r : 0;
		const ratingMin = this.files.length ? this.files.reduce((file1, file2) => file1.r > file2.r ? file2 : file1).r : 0;
		const ratingRange = ratingMax - ratingMin;
		return {
			get: (rating) => {
				if (ratingRange == 0) return 2; // レーティングが全て同じ場合は2にする
				if (rating == ratingMax) return 4; // 最大値が4を超えないようにする
				return Math.floor((rating - ratingMin) / ratingRange * 5);
			}
		};
	}

	/**
	 * レーティングシンボルの表示を切り替える
	 * @param {boolean} toggle - 表示するかどうか
	 */
	toggleRatingSymbol(toggle) {
		this.container.classList.toggle('filelist_rating', toggle);
	}

}
