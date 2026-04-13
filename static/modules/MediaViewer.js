import EventDispatchable from './EventDispatchable.js';
import KeyEventManager from './KeyEventManager.js';
import HtmlGenerator from './HtmlGenerator.js';
import API from './API.js';

/**
 * ビューアを表すクラス
 */
export default class MediaViewer extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('viewer');

		this._defineEvents('close');
		this._setEventHandlers();
		this.container.style.display = 'none';
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.container.addEventListener('click', (e) => {
			// クリックしたら閉じる
			this.close();
		});
		this.container.addEventListener('fullscreenchange', (e) => {
			// フルスクリーンを終了したら閉じる
			if (!document.fullscreenElement) {
				this.close();
			}
		});
		// キーボード操作
		KeyEventManager.addHandler('viewer', (e) => {
			// ビューアを閉じる
			if (e.code == 'Backspace' || e.code == 'Escape') {
				this.close();
			}
		});
	}

	/**
	 * ビューアでメディアを開く
	 * @param {Subdirectory} subdir - サブディレクトリ情報オブジェクト
	 * @param {string} fileName - ファイルの名前
	 */
	async open(subdir, fileName) {
		const HTML = HtmlGenerator;
		const { dirId, subdirName } = subdir;
		this.container.innerHTML = '';
		this.container.appendChild(
			HTML.img.attr('src', API.getFileURL(dirId, subdirName, fileName)).attr('alt', fileName).attr('title', fileName).end()
		);
		this.container.style.display = 'flex';
		try {
			await this.container.requestFullscreen();
		} catch (e) { }
	}

	/**
	 * ビューアを閉じる
	 */
	async close() {
		this.container.style.display = 'none';
		this.trigger('close');
		try {
			await document.exitFullscreen();
		} catch (e) { }
	}

}
