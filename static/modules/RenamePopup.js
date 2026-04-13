import EventDispatchable from './EventDispatchable.js';
import ExclusiveClassName from './ExclusiveClassName.js';
import HtmlGenerator from './HtmlGenerator.js';
import API from './API.js';

/**
 * 名前変更ポップアップを表すクラス
 */
export default class RenamePopup extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		const HTML = HtmlGenerator;
		/**
		 * ポップアップ本体の要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('rename');
		/**
		 * 新しいファイル名の入力欄の要素
		 * @type {HTMLElement}
		 */
		this.elFileInput = HTML.inputText.attr('id', 'rename_file_input').end();
		/**
		 * 新しいファイル名の拡張子の要素
		 * @type {HTMLElement}
		 */
		this.elFileExt = HTML.span.attr('id', 'rename_file_ext').end();
		/**
		 * ファイル名変更全体の要素
		 * @type {HTMLElement}
		 */
		this.elFileBlock = HTML.div.end(HTML.p.end('ファイル名を変更：'), HTML.p.end(this.elFileInput, this.elFileExt));
		/**
		 * 表示中のパネル
		 * @type {ExclusiveClassName}
		 */
		this.displayedBlockClass = new ExclusiveClassName('rename_displayed');
		/**
		 * 現在のサブディレクトリ
		 * @type {SubdirectoryInfo}
		 */
		this.subdir = null;
		/**
		 * 現在のファイルID
		 * @type {string}
		 */
		this.fileId = null;
		/**
		 * 現在のファイル名
		 * @type {string}
		 */
		this.fileName = null;

		this.container.appendChild(this.elFileBlock);
		this._defineEvents('filerename');
		this._setEventHandlers();

	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.elFileInput.addEventListener('keydown', (e) => {
			if (e.code == 'Enter') {
				this._submitFileRename();
				e.stopPropagation();
			} else if (e.code == 'Backspace') {
				e.stopPropagation();
			} else if (/^Arrow(?:Left|Right|Up|Down)$/.test(e.code)) {
				e.stopPropagation();
			}
		});
	}

	/**
	 * ファイル名変更ポップアップを開く
	 * @param {HTMLElement} source - Popoverのsourceとする要素
	 */
	openFileRename(source) {
		this.displayedBlockClass.setTo(this.elFileBlock);
		const name = this.fileName.match(/^(.+)(\..+)$/) || [null, this.fileName, ''];
		this.elFileInput.value = name[1];
		this.elFileExt.innerText = name[2];
		this.container.togglePopover({ force: true, source });
		this.elFileInput.focus();
		//this.elFileInput.select();
	}

	/**
	 * ポップアップを閉じる
	 */
	close() {
		this.container.togglePopover(false);
	}

	/**
	 * ファイル名変更を実行する
	 */
	async _submitFileRename() {
		this.elFileInput.disabled = true;
		const newName = this.elFileInput.value !== '' ? `${this.elFileInput.value}${this.elFileExt.innerText}` : '';
		const result = await API.rename(this.subdir, this.fileId, newName);
		this.elFileInput.disabled = false;
		// ファイル名変更成功時
		if (result) {
			this.close();
			this.fileName = newName;
			this.trigger('filerename', this.fileId, this.fileName);
		}
	}

}
