import ExclusiveClassName from './ExclusiveClassName.js';
import HtmlGenerator from './HtmlGenerator.js';

/**
 * ディレクトリ選択メニューを表すクラス
 */
export default class DirectorySelector {

	/**
	 * コンストラクタ
	 */
	constructor() {
		this.container = document.getElementById('dirlist');
		this.elDirBlock = document.getElementById('dirlist_dir_block');
		this.elDirList = document.getElementById('dirlist_dir_list');
		this.elSubdirBlock = document.getElementById('dirlist_subdir_block');
		this.elSubdirList = document.getElementById('dirlist_subdir_list');
		this.elDirBtn = document.getElementById('directory_button');
		this.elCurrDir = document.getElementById('dirlist_curr');
		this.current = {};
		this.dirs = {};
		this.displayedPanelClass = new ExclusiveClassName('dirlist_block_displayed');
		this._setEventHandlers();
		this._createDirectoryList();
	}

	/**
	 * イベントハンドラを設定する
	 */
	_setEventHandlers() {
		// 表示されたとき
		this.elDirBtn.addEventListener('click', (e) => {
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
			this.container.togglePopover();
		});
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
				this.createFileList(dirId, subdirId);
				this.current = { dirId, subdirId };
				this.updateRequired = true;
			}
			this.container.hidePopover();
		});
		// 親ディレクトリ選択へ戻るとき
		this.elCurrDir.addEventListener('click', (e) => {
			this._switchTo('dir');
		});
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
		this.dirs = await (await fetch('/dirs')).json();
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
		this.elSubdirBlock.classList.add('loading');
		this.elSubdirList.innerHTML = '';
		this.elCurrDir.innerText = this.dirs[dirId].title;
		this._switchTo('subdir');
		const subdirs = await (await fetch(`/dir/${dirId}`)).json();
		this.elSubdirList.innerHTML = '';
		this.elSubdirList.dataset.dirId = dirId;
		for (const subdirId in subdirs) {
			const subdir = subdirs[subdirId];
			this.elSubdirList.appendChild(
				HTML.li.data('subdirId', subdirId).cls(subdirId == this.current.subdirId ? 'dirlist_subdir_selected' : []).end(
					HTML.span.cls('dirlist_subdir_name').end(subdir.name),
					HTML.span.cls('dirlist_subdir_num').end(subdir.numFiles ? `(${subdir.numFiles})` : '')
				)
			);
		}
		this.elSubdirBlock.classList.remove('loading');
	}

	/**
	 * ファイル一覧を生成する
	 * @param {string} dirId - ディレクトリID
	 * @param {string} subdirId - サブディレクトリID
	 */
	async createFileList(dirId, subdirId) {
		const elFileList = document.getElementById('file_list');
		const HTML = HtmlGenerator;
		elFileList.innerHTML = '';
		elFileList.classList.add('loading');
		const files = await (await fetch(`/dir/${dirId}/${subdirId}`)).json();
		for (const fileId in files) {
			const file = files[fileId];
			elFileList.appendChild(
				HTML.li.end(
					HTML.img.attr('loading', 'lazy').attr('src', `/thumb/${fileId}`).attr('width', file.tw).attr('height', file.th).attr('alt', file.n).attr('title', file.n).end()
				)
			);
		}
		elFileList.classList.remove('loading');
	}

}
