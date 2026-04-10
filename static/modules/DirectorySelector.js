import EventDispatchable from './EventDispatchable.js';
import ExclusiveClassName from './ExclusiveClassName.js';
import HtmlGenerator from './HtmlGenerator.js';
import API from './API.js';

/**
 * ディレクトリ選択メニューを表すクラス
 */
export default class DirectorySelector extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('dirlist');
		/**
		 * 親ディレクトリ一覧を表示するブロック要素
		 * @type {HTMLElement}
		 */
		this.elDirBlock = document.getElementById('dirlist_dir_block');
		/**
		 * 親ディレクトリ一覧を表示するリスト要素
		 * @type {HTMLElement}
		 */
		this.elDirList = document.getElementById('dirlist_dir_list');
		/**
		 * サブディレクトリ一覧を表示するブロック要素
		 * @type {HTMLElement}
		 */
		this.elSubdirBlock = document.getElementById('dirlist_subdir_block');
		/**
		 * サブディレクトリ一覧を表示するリスト要素
		 * @type {HTMLElement}
		 */
		this.elSubdirList = document.getElementById('dirlist_subdir_list');
		/**
		 * 選択中の親ディレクトリを表示する要素
		 * @type {HTMLElement}
		 */
		this.elCurrDir = document.getElementById('dirlist_curr');
		/**
		 * 選択中の親ディレクトリとサブディレクトリ
		 * @type {object}
		 */
		this.current = {};
		/**
		 * 親ディレクトリ一覧の情報
		 * @type {object}
		 */
		this.dirs = {};
		/**
		 * 表示中のパネルを表すクラス名
		 * @type {ExclusiveClassName}
		 */
		this.displayedPanelClass = new ExclusiveClassName('dirlist_block_displayed');

		this._defineEvents('select', 'close');
		this._setEventHandlers();
		this._createDirectoryList();
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		// 親ディレクトリが選択されたとき
		this.elDirList.addEventListener('click', (e) => {
			const li = e.target.closest('li[data-dir-id]');
			if (!li) return;
			// 選択した親ディレクトリのサブディレクトリ一覧を生成する
			this._createSubdirectoryList(li.dataset.dirId);
			this.updateRequired = li.dataset.dirId != this.current.dirId;
		});
		// サブディレクトリが選択されたとき
		this.elSubdirList.addEventListener('click', (e) => {
			const li = e.target.closest('li[data-subdir-id]');
			if (!li) return;
			const subdirId = li.dataset.subdirId;
			if (subdirId != this.current.subdirId) {
				const dirId = this.elSubdirList.dataset.dirId;
				const subdirName = li.dataset.subdirName;
				const subdirNum = li.dataset.subdirNum;
				this.trigger('select', { dirId, subdirId, subdirName, subdirNum });
				this.current = { dirId, subdirId };
				this.updateRequired = true;
			}
			this.container.hidePopover();
		});
		// 親ディレクトリ選択へ戻るとき
		this.elCurrDir.addEventListener('click', (e) => {
			this._switchTo('dir');
		});
		// 閉じるとき
		this.container.addEventListener('toggle', (e) => {
			if (e.newState != 'closed') return;
			this.trigger('close');
		})
	}

	/**
	 * ディレクトリ選択メニューを表示する
	 */
	show() {
		if (this.current.dirId) {
			if (this.updateRequired) {
				this._createSubdirectoryList(this.current.dirId);
			}
			this._switchTo('subdir');
		} else {
			// サブディレクトリ未選択時（初期状態）は、親ディレクトリ一覧を表示
			this._switchTo('dir');
		}
		this.updateRequired = false;
		this.container.showPopover();
	}

	/**
	 * 親ディレクトリ一覧とサブディレクトリ一覧の表示を切り替える
	 * @param {string} panel - 「dir」（親ディレクトリ一覧）または「subdir」（サブディレクトリ一覧）
	 */
	_switchTo(panel) {
		if (panel == 'dir') this.displayedPanelClass.setTo(this.elDirBlock);
		if (panel == 'subdir') this.displayedPanelClass.setTo(this.elSubdirBlock);
	}

	/**
	 * 親ディレクトリ一覧を生成する
	 */
	async _createDirectoryList() {
		const HTML = HtmlGenerator;
		this.elDirList.innerHTML = '';
		this.dirs = await API.getDirectoryList();
		for (const dirId in this.dirs) {
			const { path: dirPath, title: dirTitle } = this.dirs[dirId];
			this.elDirList.appendChild(
				HTML.li.data('dirId', dirId).end(
					HTML.div.cls('dirlist_dir_title').end(dirTitle),
					HTML.div.cls('dirlist_dir_path').end(dirPath)
				)
			);
		}
	}

	/**
	 * サブディレクトリ一覧を生成する
	 * @param {string} dirId - ディレクトリID
	 */
	async _createSubdirectoryList(dirId) {
		const HTML = HtmlGenerator;
		this.container.classList.add('loading');
		this.elCurrDir.innerText = this.dirs[dirId].title;
		this._switchTo('subdir');
		const subdirs = await API.getSubdirectoryList(dirId);
		subdirs.sort((a, b) => a.name > b.name ? 1 : -1);
		this.elSubdirList.innerHTML = '';
		this.elSubdirList.dataset.dirId = dirId;
		for (const subdir of subdirs) {
			const subdirId = subdir.subdirId;
			this.elSubdirList.appendChild(
				HTML.li.data({ subdirId: subdirId, subdirName: subdir.name, subdirNum: subdir.numFiles ?? '' }).cls(subdirId == this.current.subdirId ? 'dirlist_subdir_selected' : []).end(
					HTML.span.cls('dirlist_subdir_name').end(subdir.name),
					HTML.span.cls('dirlist_subdir_num').end(subdir.numFiles != null ? `(${subdir.numFiles})` : '')
				)
			);
		}
		this.container.classList.remove('loading');
	}

}
