import EventDispatchable from './EventDispatchable.js';
import HtmlGenerator from './HtmlGenerator.js';

/**
 * ステータスバーを表すクラス
 */
export default class StatusBar extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		this.container = document.getElementById('status');
		this.elCurrentDir = document.getElementById('status_current_dir');
		this.elFileName = document.getElementById('status_file_name');
		this.elFileProps = document.getElementById('status_file_props');

		this._defineEvents('directorymenuopen');
		this._setEventHandlers();
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.elCurrentDir.addEventListener('click', (e) => {
			this.trigger('directorymenuopen');
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
	 * @param {string} name - サブディレクトリ名
	 * @param {string} num - ファイル数
	 */
	updateCurrentDirectory(name, num) {
		const HTML = HtmlGenerator;
		this.elCurrentDir.innerHTML = '';
		this.elCurrentDir.appendChild(HTML.span.cls('status_subdir_name').end(name));
		if (num !== '') this.elCurrentDir.appendChild(HTML.span.cls('status_subdir_num').end(`(${num})`));
	}

	/**
	 * ファイルサイズをフォーマットする
	 * @param {number} size - ファイルサイズ（バイト）
	 * @return {string} フォーマットしたサイズ
	 */
	_formatFileSize(size) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let k = 0;
		while (size >= 1000) {
			size /= 1024;
			k++;
		}
		return `${size.toFixed(1)}${units[k]}`;
	}

	/**
	 * 日時をフォーマットする
	 * @param {number} time - Unix時刻（秒単位）
	 * @return {string} フォーマットするした日時
	 */
	_formatDate(time) {
		const d = new Date();
		d.setTime((time - d.getTimezoneOffset() * 60) * 1e3);
		return d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
	}

	/**
	 * ファイル情報を表示する
	 * @param {object|number} file - APIから返されたファイル情報オブジェクト、または、選択されたファイル数
	 * @param {string} file.n - ファイル名
	 * @param {number} file.w - メディアの幅
	 * @param {number} file.h - メディアの高さ
	 * @param {number} file.s - ファイルサイズ（バイト）
	 * @param {number} file.m - 最終更新日時（Unix時刻・秒単位）
	 */
	updateFileStatus(file) {
		if (typeof file == 'number') {
			this.elFileName.style.display = 'none';
			this.elFileProps.innerText = file ? `${file}個のファイルが選択されています。` : 'ファイルが選択されていません。';
		} else {
			this.elFileName.style.display = 'block';
			this.elFileName.innerText = file.n;
			this.elFileProps.innerText = `${file.w}×${file.h} / ${this._formatFileSize(file.s)} / ${this._formatDate(file.m)}`;
		}
	}

}
