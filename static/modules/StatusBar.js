import EventDispatchable from './EventDispatchable.js';
import HtmlGenerator from './HtmlGenerator.js';
import RenamePopup from './RenamePopup.js';

/**
 * ステータスバーを表すクラス
 */
export default class StatusBar extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('status');
		/**
		 * 現在のサブディレクトリを表示する要素
		 * @type {HTMLElement}
		 */
		this.elCurrentDir = document.getElementById('status_current_dir');
		/**
		 * ファイル名を表示する要素
		 * @type {HTMLElement}
		 */
		this.elFileName = document.getElementById('status_file_name');
		/**
		 * ファイル情報を表示する要素
		 * @type {HTMLElement}
		 */
		this.elFileProps = document.getElementById('status_file_props');
		/**
		 * 名前変更のポップアップ
		 * @type {RenamePopup}
		 */
		this.rename = new RenamePopup();

		this._defineEvents('directorymenuopen', 'filerename', 'subdirrename');
		this._setEventHandlers();
		// ファイル名変更に成功したら表示を変更してfilerenameイベントを発火する
		this.rename.on('filerename', (fileId, newName) => {
			this.elFileName.innerText = newName;
			this.trigger('filerename', fileId, newName);
		});
		// ディレクトリ名変更に成功したらsubdirrenameイベントを発火する
		this.rename.on('subdirrename', (subdir) => {
			this.trigger('subdirrename', subdir);
		});
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.elCurrentDir.addEventListener('click', (e) => {
			this.trigger('directorymenuopen');
		});
		this.elFileName.addEventListener('click', (e) => {
			this.rename.openFileRename(this.elFileName);
		});
	}

	/**
	 * ステータスバーを表示する
	 */
	show() {
		this.container.classList.remove('status_hidden');
	}

	/**
	 * ステータスバーを隠す
	 */
	hide() {
		this.container.classList.add('status_hidden');
	}

	/**
	 * 現在のサブディレクトリ名を設定する
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 */
	updateCurrentDirectory(subdir) {
		const { subdirName, subdirNum } = subdir;
		const HTML = HtmlGenerator;
		this.elCurrentDir.innerHTML = '';
		this.elCurrentDir.appendChild(HTML.span.cls('status_subdir_name').end(subdirName));
		if (subdirNum !== '') this.elCurrentDir.appendChild(HTML.span.cls('status_subdir_num').end(`(${subdirNum})`));
		this.rename.subdir = subdir;
	}

	/**
	 * ファイル情報を表示する
	 * @param {FileInfo|number} file - APIから返されたファイル情報オブジェクト、または、選択されたファイル数
	 */
	updateFileStatus(file) {
		if (typeof file == 'number') {
			this.elFileName.style.display = 'none';
			this.elFileProps.innerText = file ? `${file}個のファイルが選択されています。` : 'ファイルが選択されていません。';
		} else {
			this.elFileName.style.display = 'block';
			this.elFileName.innerText = file.n;
			this.elFileProps.innerText = `${file.rating} / ${file.mediaSize} / ${file.fileSize} / ${file.date}`;
		}
		this.rename.close();
		this.rename.fileId = file.id;
		this.rename.fileName = file.n;
	}

	/**
	 * ディレクトリ名変更ポップアップを表示する
	 */
	renameSubdirectory() {
		this.rename.openSubdirRename(this.elCurrentDir);
	}

}
