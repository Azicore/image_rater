import EventDispatchable from './EventDispatchable.js';
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
		/**
		 * 機能を無効にするかどうか（ビューア表示中はfalseにする）
		 */
		this.disabled = true;

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
		window.addEventListener('keydown', (e) => {
			// 非表示時は無効
			if (this.disabled) return;
			// ビューアを閉じる
			if (e.code == 'Backspace' || e.code == 'Escape') {
				this.close();
			}
		});
	}

	/**
	 * ビューアでメディアを開く
	 * @param {string} dirId - ディレクトリID
	 * @param {string} subdirName - サブディレクトリの名前
	 * @param {string} fileName - ファイルの名前
	 */
	async open(dirId, subdirName, fileName) {
		const HTML = HtmlGenerator;
		this.disabled = false;
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
		if (this.disabled) return;
		this.disabled = true;
		this.container.style.display = 'none';
		this.trigger('close');
		try {
			await document.exitFullscreen();
		} catch (e) { }
	}

}
